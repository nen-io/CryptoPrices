import { parentPort, workerData } from 'node:worker_threads';
import { Vault } from '../core/vault';
import { Service } from '../core/service';
const vault = new Vault(workerData.databasePath);
const service = new Service(vault);
parentPort!.on('message', async ({ id, command, backupPath }) => {
  try {
    if (backupPath) {
      if (!vault.session()) throw new Error('Unlock the vault to export a backup.');
      await vault.backup(backupPath);
      parentPort!.postMessage({ id, result: { ok: true } });
    } else parentPort!.postMessage({ id, result: { ok: true, state: await service.command(command) } });
  } catch (error) {
    parentPort!.postMessage({ id, result: { ok: false, error: error instanceof Error ? error.message : 'The operation failed.' } });
  }
});
