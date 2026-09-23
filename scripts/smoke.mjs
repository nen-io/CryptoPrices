// Real Electron + SQLite integration through the shipped UI, always with disposable data.
import { _electron as electron } from 'playwright';
import { expect as baseExpect } from '@playwright/test';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';

const directory = await mkdtemp(join(tmpdir(), 'cryptoprices-electron-'));
const env = { ...process.env, CRYPTOPRICES_DATA_DIR: directory };
delete env.ELECTRON_RUN_AS_NODE;
const output = resolve('test-results');
const username = 'Runtime test';
const password = 'only a disposable test passphrase';
const walletName = 'Runtime address';
const address = '0x0000000000000000000000000000000000000001';
const quantity = '123456789.123456789123456789';
const desktop = { width: 1440, height: 960 };
const narrow = { width: 390, height: 844 };
const catalogue = JSON.parse(await readFile('src/renderer/history/slides.json', 'utf8'));
let application;
let page;
const rendererErrors = [];
const httpRequests = [];
const evidence = {
  status: 'running', runtime: {}, startup: [], checks: [], screenshots: [],
  scope: 'Built application in the real development Electron binary, with Playwright attached; not a signed installer or a performance benchmark.',
  offlineScope: 'Chromium is offline and HTTP renderer requests are blocked. No provider refresh is submitted; worker network cancellation and consent are covered by unit tests.',
  automationHost: 'OS idle time is stubbed to zero only in this disposable runtime because CDP input does not reset macOS idle. Manual lock and the lock-screen event are exercised separately.',
};
const expect = baseExpect.configure({ timeout: 15_000 });

async function state() {
  const result = await page.evaluate(() => window.cryptoPrices.command({ type: 'state' }));
  assert.equal(result.ok, true, result.error);
  return result.state;
}

async function start(label) {
  const started = performance.now();
  application = await electron.launch({ args: [resolve('.')], env, offline: true, chromiumSandbox: true });
  await application.evaluate(({ powerMonitor }) => { powerMonitor.getSystemIdleTime = () => 0; });
  page = await application.firstWindow();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);
  page.on('pageerror', error => rendererErrors.push(error.message));
  page.context().on('request', request => {
    if (/^https?:/i.test(request.url())) httpRequests.push(request.url());
  });
  await page.context().route(/^https?:/i, route => route.abort('internetdisconnected'));
  await page.waitForFunction(() => !!window.cryptoPrices, { timeout: 15_000 });
  const bridgeReadyMs = Math.round(performance.now() - started);
  await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
  await page.waitForFunction(() => {
    const artwork = document.querySelector('.history-image-button img');
    return artwork?.complete && artwork.naturalWidth > 0;
  });
  await page.evaluate(() => new Promise(resolvePaint => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
  evidence.startup.push({ label, bridgeReadyMs, renderedUiAndFirstArtworkMs: Math.round(performance.now() - started) });
  evidence.runtime = await application.evaluate(() => process.versions);
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  assert.match(page.url(), /^cryptoprices:\/\/app\//);
  await page.setViewportSize(desktop);
}

async function navigate(name) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
}

async function screenshot(name, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolvePaint => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `${name}: horizontal page overflow (${JSON.stringify(dimensions)})`);
  await page.screenshot({ path: join(output, `${name}.png`), fullPage: true, animations: 'disabled' });
  evidence.screenshots.push({ file: `${name}.png`, viewport, noHorizontalPageOverflow: true });
}

async function sampleIdle() {
  // The first call establishes the CPU interval. No synthetic clock is installed yet.
  await page.getByRole('heading', { name: 'Portfolio', exact: true }).click();
  await page.mouse.move(0, 0);
  await application.evaluate(({ app }) => app.getAppMetrics());
  const started = performance.now();
  await delay(3_000);
  const processes = await application.evaluate(({ app }) => app.getAppMetrics().map(metric => ({
    type: metric.type, name: metric.name ?? null, sandboxed: metric.sandboxed ?? null,
    cpuPercent: metric.cpu.percentCPUUsage,
    idleWakeupsPerSecond: metric.cpu.idleWakeupsPerSecond,
    workingSetKiB: metric.memory.workingSetSize,
  })));
  evidence.idleSample = {
    intervalMs: Math.round(performance.now() - started),
    state: 'Fresh sample portfolio, offline, first artwork loaded, desktop viewport, no interaction during sample.',
    processes,
    summedCpuPercent: processes.reduce((sum, process) => sum + process.cpuPercent, 0),
    summedWorkingSetMiB: Math.round(processes.reduce((sum, process) => sum + process.workingSetKiB, 0) / 1024 * 10) / 10,
    caveat: 'A single local three-second sample with automation attached. Working-set totals include shared pages and are not unique application memory; CPU totals are Electron per-process readings.',
  };
}

async function galleryControls() {
  const gallery = page.getByRole('region', { name: 'Money through time artwork gallery' });
  const title = gallery.locator('.history-title');
  const first = await title.innerText();
  await gallery.getByRole('button', { name: 'Next artwork', exact: true }).click();
  await expect(title).not.toHaveText(first);
  await expect(gallery.getByRole('button', { name: 'Play artwork rotation', exact: true })).toBeVisible();
  await gallery.getByRole('button', { name: 'Previous artwork', exact: true }).click();
  await expect(title).toHaveText(first);
  await gallery.getByRole('button', { name: 'Browse 60 works', exact: true }).click();
  const browser = page.getByRole('dialog', { name: 'Money through time.', exact: true });
  await expect(browser).toBeVisible();
  await expect(browser.locator('.history-list button')).toHaveCount(60);
  await browser.locator('.history-list button').first().click();
  await expect(browser).not.toBeVisible();
  await expect(title).toHaveText(catalogue[0].title);
  await gallery.getByLabel('Jump to an era', { exact: true }).selectOption('modern');
  await expect(gallery.getByLabel('Position in this period', { exact: true })).toHaveValue('1');
  await gallery.getByLabel('Position in this period', { exact: true }).press('End');
  await expect(title).toHaveText(catalogue.filter(record => record.sortYear >= 1800).at(-1).title);
  await gallery.getByLabel('Jump to an era', { exact: true }).selectOption('all');
  await gallery.getByRole('button', { name: /^Open artwork:/ }).click();
  const details = page.getByRole('dialog', { name: catalogue[0].title, exact: true });
  await expect(details).toBeVisible();
  await expect(details.locator('.history-rights')).toContainText(/Public domain|CC0/);
  await expect(details.getByRole('button', { name: 'Museum object record ↗', exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Close artwork dialog', exact: true }).click();
  // Exercise the renderer scheduler without a 25-second wall-clock sleep.
  await page.clock.install();
  const beforeRotation = await title.innerText();
  await gallery.getByRole('button', { name: 'Play artwork rotation', exact: true }).click();
  await expect(gallery.locator('.history-rotation-note')).toHaveText('Playing · 25 seconds per artwork');
  await page.clock.fastForward(25_100);
  await expect(title).not.toHaveText(beforeRotation);
  await gallery.getByRole('button', { name: 'Pause artwork rotation', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(gallery.getByRole('button', { name: 'Play artwork rotation', exact: true })).toBeDisabled();
  await expect(gallery.locator('.history-rotation-note')).toHaveText('Reduced motion · paused');
  const reducedTitle = await title.innerText();
  await page.clock.fastForward(30_000);
  await expect(title).toHaveText(reducedTitle);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  evidence.checks.push('Gallery: 60-work browser, next/previous, era, range keyboard, provenance dialog, 25-second rotation, system reduced-motion pause');
}

try {
  await mkdir(output, { recursive: true });
  await start('fresh disposable installation');
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await page.evaluate(() => typeof window.process), 'undefined');
  const security = await application.evaluate(({ BrowserWindow }) => {
    const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration };
  });
  assert.deepEqual(security, { sandbox: true, contextIsolation: true, nodeIntegration: false });
  evidence.checks.push('Sandbox, context isolation, no renderer Node globals, custom local scheme');
  const initial = await state();
  assert.equal(initial.profile, null);
  assert.equal(initial.profiles.length, 0);
  await expect(page.locator('.demo-banner')).toContainText('EXAMPLE WORKSPACE');
  await sampleIdle();
  await screenshot('collector-desktop-sample', desktop);
  await screenshot('collector-narrow-sample', narrow);
  await page.setViewportSize(desktop);
  await galleryControls();

  await page.locator('.header-actions').getByRole('button', { name: 'Create local vault', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Create your local vault.', exact: true });
  await dialog.getByLabel('Profile name', { exact: true }).fill(username);
  await dialog.getByLabel('Passphrase', { exact: true }).fill(password);
  await dialog.getByLabel('Confirm passphrase', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Create local vault', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.demo-banner')).toHaveCount(0);
  await expect(page.getByText('Your collection starts empty. Add a holding or public address to begin.', { exact: true })).toBeVisible();
  const empty = await state();
  assert.equal(empty.profile.username, username);
  assert.deepEqual(empty.vault.wallets, []);
  assert.deepEqual(empty.vault.manualHoldings, []);
  assert.deepEqual(empty.vault.walletScans, []);
  assert.equal(empty.markets, null);
  await expect(page.locator('.collector-total')).toHaveText('—');
  await screenshot('collector-desktop-empty-vault', desktop);
  evidence.checks.push('Offline registration via forms creates an empty real encrypted vault, separate from sample data');

  await page.getByRole('button', { name: 'Add holding', exact: true }).first().click();
  dialog = page.getByRole('dialog', { name: 'Add a manual holding.', exact: true });
  await dialog.getByRole('combobox', { name: /^Asset/ }).selectOption('bitcoin');
  await dialog.getByLabel('Quantity', { exact: true }).fill(quantity);
  await dialog.getByRole('button', { name: 'Add holding', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal((await state()).vault.manualHoldings[0].quantity, quantity);
  await expect(page.locator(`td[title="${quantity}"]`)).toBeVisible();
  await expect(page.locator('.collector-total')).toHaveText('—');
  await expect(page.locator('.value-warning')).toContainText('1 unpriced asset');
  evidence.checks.push('Manual holding entered via form retains all decimal digits; missing price stays unknown');

  await page.getByRole('button', { name: 'Track address', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Track a public address.', exact: true });
  await dialog.getByLabel('Wallet label', { exact: true }).fill(walletName);
  await dialog.getByRole('combobox', { name: /^Network/ }).selectOption('ethereum');
  await dialog.getByLabel('Public address', { exact: true }).fill('not-a-public-address');
  await dialog.getByRole('button', { name: 'Save public address locally', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  assert.equal((await state()).vault.wallets.length, 0);
  await dialog.getByLabel('Public address', { exact: true }).fill(address);
  await dialog.getByRole('button', { name: 'Save public address locally', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Addresses', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.wallet-address')).toHaveText(address);
  await expect(page.locator('.wallet-entry')).toContainText('Watch-only');
  await expect(page.locator('.wallet-entry')).toContainText('Not observed yet · balances unknown');
  await expect(page.locator('.wallet-entry')).toContainText('No provider contacted');
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeDisabled();
  assert.equal((await state()).vault.walletScans.length, 0);
  // Mark only the renderer online to inspect consent. Do not submit a refresh.
  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Refresh this address?', exact: true });
  await expect(dialog).toContainText('This provider receives your public address and IP');
  await expect(dialog.getByRole('button', { name: 'Refresh this wallet', exact: true })).toBeDisabled();
  await dialog.getByLabel('Share this address with the named provider for this refresh.', { exact: true }).check();
  await expect(dialog.getByRole('button', { name: 'Refresh this wallet', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.context().setOffline(true);
  evidence.checks.push('Invalid address rejected; valid watch-only address saved offline; no observation invented; explicit provider disclosure and consent gate');
  await screenshot('collector-narrow-address', narrow);

  await navigate('Settings');
  await expect(page.getByText(`Signed in locally as ${username}.`, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What we can see', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Reduce motion', exact: true }).check();
  await navigate('Portfolio');
  await expect(page.locator('.app-shell')).toHaveClass(/reduced-motion/);
  await expect(page.getByRole('button', { name: 'Play artwork rotation', exact: true })).toBeDisabled();
  await screenshot('collector-narrow-private-vault', narrow);
  await screenshot('collector-desktop-private-vault', desktop);
  await navigate('Markets');
  await expect(page.getByRole('button', { name: /Refresh markets/i })).toBeDisabled();
  await navigate('Portfolio');
  evidence.checks.push('Settings and market navigation; session reduce-motion switch; 390px and desktop layouts without page overflow');

  // Decode all bundled artworks from the local scheme, after the idle sample.
  const imageResults = await page.evaluate(async records => {
    const results = [];
    for (let offset = 0; offset < records.length; offset += 6) {
      results.push(...await Promise.all(records.slice(offset, offset + 6).map(record => new Promise(resolveImage => {
        const img = new Image();
        img.onload = () => resolveImage({ id: record.id, url: img.src, width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolveImage({ id: record.id, url: img.src, width: 0, height: 0 });
        img.src = new URL(record.image, location.href).href;
      }))));
    }
    return results;
  }, catalogue);
  assert.equal(new Set(catalogue.map(record => record.id)).size, 60);
  assert.equal(imageResults.length, 60);
  for (const image of imageResults) {
    assert.match(image.url, /^cryptoprices:\/\/app\//);
    assert.ok(image.width > 0 && image.height > 0, `Bundled artwork did not decode: ${image.id}`);
  }
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
  assert.deepEqual(resources.filter(url => /^https?:/i.test(url)), []);
  evidence.artwork = { decodedLocalImages: imageResults.length, totalDistinctRecords: 60 };
  evidence.checks.push('All 60 bundled artwork images decode offline; no HTTP renderer assets or fonts');

  await page.locator('.header-actions').getByRole('button', { name: 'Lock vault', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unlock your vault', exact: true })).toBeVisible();
  const locked = await state();
  assert.equal(locked.vault, null);
  assert.equal(locked.profile, null);
  await expect(page.locator('.wallet-address')).toHaveCount(0);
  await expect(page.locator(`td[title="${quantity}"]`)).toHaveCount(0);
  const rejected = await page.evaluate(() => window.cryptoPrices.command({ type: 'holding:add', coinId: 'bitcoin', quantity: '1' }));
  assert.equal(rejected.ok, false);
  await application.close();
  application = undefined;

  await start('restart with saved encrypted vault');
  const reopened = await state();
  assert.equal(reopened.profile, null);
  assert.equal(reopened.vault, null);
  assert.equal(reopened.profiles.length, 1);
  await page.locator('.header-actions').getByRole('button', { name: 'Unlock vault', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Welcome back.', exact: true });
  await dialog.getByRole('combobox', { name: /^Local profile/ }).selectOption(username);
  await dialog.getByLabel('Passphrase', { exact: true }).fill('this is the wrong passphrase');
  await dialog.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  assert.equal((await state()).vault, null);
  await expect(dialog.getByLabel('Passphrase', { exact: true })).toHaveValue('');
  await dialog.getByLabel('Passphrase', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const restored = await state();
  assert.equal(restored.vault.wallets[0].name, walletName);
  assert.equal(restored.vault.wallets[0].address, address);
  assert.equal(restored.vault.manualHoldings[0].quantity, quantity);
  assert.equal(restored.vault.walletScans.length, 0);
  await expect(page.locator(`td[title="${quantity}"]`)).toBeVisible();
  await expect(page.locator('.collector-total')).toHaveText('—');
  evidence.checks.push('UI lock removes private rows, locked mutation refused, full Electron restart stays locked, wrong passphrase rejected and cleared, correct UI unlock restores exact persisted data');

  const refused = await page.evaluate(() => window.cryptoPrices.command({ type: 'shell:run', command: 'echo bad' }));
  assert.equal(refused.ok, false);
  const unsafeSource = await page.evaluate(() => window.cryptoPrices.openSource('https://example.com/not-an-allowed-museum-record'));
  assert.equal(unsafeSource.ok, false);
  await application.evaluate(({ powerMonitor }) => powerMonitor.emit('lock-screen'));
  await expect(page.getByRole('button', { name: 'Unlock your vault', exact: true })).toBeVisible();
  assert.equal((await state()).vault, null);
  evidence.checks.push('OS lock-screen event clears the displayed portfolio and locks the worker vault');
  assert.deepEqual(httpRequests, []);
  assert.deepEqual(rendererErrors, []);
  evidence.checks.push('Unknown IPC command and unlisted external URL rejected; no renderer exceptions or HTTP requests observed');
  evidence.status = 'passed';
  await rm(join(output, 'failure.png'), { force: true });
} catch (error) {
  evidence.status = 'failed';
  evidence.failure = error instanceof Error ? error.message : String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  evidence.rendererErrors = rendererErrors;
  evidence.httpRequests = httpRequests;
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'runtime.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  try { if (application) await application.close(); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
