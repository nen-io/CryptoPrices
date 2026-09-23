import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { AppState, Command, DesktopApi } from '../shared/types';
import { portfolio } from '../shared/portfolio';
import { DEMO_COINS, DEMO_VAULT, EMPTY_VAULT, OFFLINE_COINS } from './demo';

declare global { interface Window { cryptoPrices?: DesktopApi } }

export function useWorkspace() {
  const state = ref<AppState | null>(null);
  const demo = ref(true);
  const notice = ref('');
  const error = ref('');
  const busy = ref<string[]>([]);
  const privacyEpoch = ref(0);
  const available = !!window.cryptoPrices;
  let detach: (() => void) | undefined;
  const vault = computed(() => demo.value ? DEMO_VAULT : state.value?.vault ?? EMPTY_VAULT);
  const coins = computed(() => demo.value ? DEMO_COINS : state.value?.markets?.coins ?? OFFLINE_COINS);
  const summary = computed(() => portfolio(vault.value, coins.value));
  const unlocked = computed(() => !!state.value?.profile && !demo.value);

  function clearPrivate() {
    privacyEpoch.value++;
    if (state.value) state.value = { ...state.value, profile: null, vault: null };
    demo.value = false;
    error.value = '';
  }
  async function run(command: Command): Promise<boolean> {
    error.value = ''; notice.value = '';
    if (!window.cryptoPrices) { error.value = 'Open the desktop app to create a vault. This browser view only shows the design.'; return false; }
    if (demo.value && !['register','unlock','state','lock'].includes(command.type)) { notice.value = 'Create or unlock a local vault to save your own portfolio. Demo values are illustrative.'; return false; }
    if (command.type === 'register' || command.type === 'unlock' || command.type === 'lock') clearPrivate();
    const epoch = privacyEpoch.value;
    const key = command.type === 'wallet:refresh' ? `${command.type}:${command.id}` : command.type;
    if (busy.value.includes(key)) return false;
    busy.value = [...busy.value, key];
    try {
      const result = await window.cryptoPrices.command(command);
      // A lock event also invalidates already-computed main/worker responses.
      if (epoch !== privacyEpoch.value) return false;
      if (!result.ok) { error.value = result.error; return false; }
      state.value = result.state;
      if (result.state.profile) demo.value = false;
      return true;
    } catch { if (epoch === privacyEpoch.value) error.value = 'The desktop service is unavailable. Restart CryptoPrices.'; return false; }
    finally { busy.value = busy.value.filter(item => item !== key); }
  }
  async function lock() {
    await run({ type: 'lock' });
    notice.value = 'Your vault is locked. Unlock it to see your portfolio.';
  }
  async function showDemo() {
    if (state.value?.profile) await lock();
    demo.value = true;
    error.value = ''; notice.value = '';
  }
  async function backup() {
    if (!unlocked.value || !window.cryptoPrices) { notice.value = 'Unlock a local vault to export an encrypted backup.'; return; }
    const epoch = privacyEpoch.value;
    try {
      const result = await window.cryptoPrices.backup();
      if (epoch !== privacyEpoch.value) return;
      if (result.ok) notice.value = 'Encrypted backup exported. Keep it with your passphrase in a safe place.';
      else if (result.error) error.value = result.error;
    } catch { error.value = 'Backup could not be exported.'; }
  }
  onMounted(() => {
    detach = window.cryptoPrices?.onLocked(() => { clearPrivate(); notice.value = 'Your vault was locked.'; });
    if (available) void run({ type: 'state' });
  });
  onUnmounted(() => detach?.());
  return { state, demo, available, vault, coins, summary, unlocked, notice, error, busy, privacyEpoch, run, lock, showDemo, backup };
}
