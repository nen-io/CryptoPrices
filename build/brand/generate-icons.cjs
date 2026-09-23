/* Run from the repository: npm exec electron build/brand/generate-icons.cjs */
const { app, BrowserWindow, nativeImage } = require('electron');
const { readFileSync, writeFileSync, mkdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const size = 1024;
const folder = __dirname;
const timeout = setTimeout(() => {
  process.stderr.write('Icon rendering timed out.\n');
  app.exit(1);
}, 30_000);

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: size, height: size, useContentSize: true, show: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true, backgroundThrottling: false },
  });
  window.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_request, callback) => callback({ cancel: true }));
  const svg = readFileSync(join(folder, 'icon.svg')).toString('base64');
  const html = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}img{display:block;width:100%;height:100%}</style></head><body><img src="data:image/svg+xml;base64,${svg}"></body></html>`;
  await window.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
  await window.webContents.executeJavaScript('document.images[0].decode().then(() => true)');
  const captured = await window.webContents.capturePage();
  const master = captured.resize({ width: size, height: size, quality: 'best' });
  writeFileSync(join(folder, 'icon.png'), master.toPNG());
  const source = nativeImage.createFromPath(join(folder, 'icon.png'));
  const resize = dimension => source.resize({ width: dimension, height: dimension, quality: 'best' }).toPNG();

  const iconset = join(folder, 'icon.iconset');
  rmSync(iconset, { recursive: true, force: true });
  mkdirSync(iconset);
  for (const dimension of [16, 32, 128, 256, 512]) {
    writeFileSync(join(iconset, `icon_${dimension}x${dimension}.png`), resize(dimension));
    writeFileSync(join(iconset, `icon_${dimension}x${dimension}@2x.png`), resize(dimension * 2));
  }

  // PNG-backed ICO directory entries are supported by all current Windows versions.
  const dimensions = [16, 24, 32, 48, 64, 128, 256];
  const frames = dimensions.map(resize);
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    header[entry] = dimensions[index] === 256 ? 0 : dimensions[index];
    header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  writeFileSync(join(folder, 'icon.ico'), Buffer.concat([header, ...frames]));
  if (process.platform === 'darwin') execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', join(folder, 'icon.icns')]);
  process.stdout.write(`Exported ${size}px PNG, seven-resolution ICO and macOS iconset${process.platform === 'darwin' ? ' / ICNS' : ''}.\n`);
  clearTimeout(timeout);
  window.destroy();
  app.quit();
}).catch(error => {
  clearTimeout(timeout);
  process.stderr.write(`${error.message}\n`);
  app.exit(1);
});
