import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRenderer, defineComponent, h, nextTick } from 'vue';
import { useWorkspace } from '../src/renderer/useWorkspace';
import type { AppState, CommandResult, DesktopApi } from '../src/shared/types';
const empty: AppState = { profiles: [], profile: null, vault: null, markets: null, catalogueCount: 0 };
const privateState: AppState = { ...empty, profile: { id: 'p', username: 'Owner' }, vault: { wallets: [], walletScans: [], manualHoldings: [{ id: 'h', coinId: 'bitcoin', quantity: '1' }], watchlist: [], settings: { currency: 'usd', hasApiKey: false } } };
const renderer = createRenderer<any, any>({ patchProp() {}, insert() {}, remove() {}, createElement: () => ({}), createText: () => ({}), createComment: () => ({}), setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null });
let unmount = () => {};
function mount(api: DesktopApi) {
  vi.stubGlobal('window', { cryptoPrices: api });
  let workspace!: ReturnType<typeof useWorkspace>;
  const app = renderer.createApp(defineComponent({ setup() { workspace = useWorkspace(); return () => h('div'); } }));
  app.mount({}); unmount = () => app.unmount(); return workspace;
}
afterEach(() => { unmount(); vi.unstubAllGlobals(); });
describe('renderer privacy and demo separation', () => {
  it('does not apply illustrative prices to a real vault without a price cache', async () => {
    const workspace = mount({ command: vi.fn(async () => ({ ok: true as const, state: privateState })), onLocked: () => () => {}, backup: vi.fn(), openSource: vi.fn() });
    await nextTick();
    expect(workspace.demo.value).toBe(false);
    expect(workspace.summary.value.rows[0]?.value).toBeNull();
    expect(workspace.summary.value.unpriced).toBe(1);
  });
  it('drops a late private result after a lock event', async () => {
    let locked!: () => void; let finish!: (result: CommandResult) => void;
    const command = vi.fn().mockResolvedValueOnce({ ok: true, state: privateState }).mockImplementationOnce(() => new Promise<CommandResult>(resolve => { finish = resolve; }));
    const workspace = mount({ command, onLocked: callback => { locked = callback; return () => {}; }, backup: vi.fn(), openSource: vi.fn() });
    await nextTick();
    const request = workspace.run({ type: 'markets:refresh' });
    locked(); finish({ ok: true, state: privateState });
    expect(await request).toBe(false);
    expect(workspace.state.value?.vault).toBeNull(); expect(workspace.unlocked.value).toBe(false);
  });
  it('demo cannot send wallet addresses or mutate a real vault', async () => {
    const command = vi.fn(async () => ({ ok: true as const, state: empty }));
    const workspace = mount({ command, onLocked: () => () => {}, backup: vi.fn(), openSource: vi.fn() });
    await nextTick();
    expect(await workspace.run({ type: 'wallet:refresh', id: 'sample', consent: true })).toBe(false);
    expect(command).toHaveBeenCalledTimes(1);
    expect(workspace.notice.value).toContain('Create or unlock');
  });
  it('clears the previous portfolio before authentication settles', async () => {
    const command = vi.fn().mockResolvedValueOnce({ ok: true, state: privateState }).mockResolvedValueOnce({ ok: false, error: 'Wrong passphrase' });
    const workspace = mount({ command, onLocked: () => () => {}, backup: vi.fn(), openSource: vi.fn() }); await nextTick();
    const request = workspace.run({ type: 'unlock', username: 'Other', password: 'bad' });
    expect(workspace.state.value?.vault).toBeNull(); await request;
    expect(workspace.error.value).toBe('Wrong passphrase'); expect(workspace.unlocked.value).toBe(false);
  });
});
