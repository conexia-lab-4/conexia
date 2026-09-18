import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionStorageFile = path.resolve(
  __dirname,
  '../../.auth/session-storage.json',
);

interface SessionStorageDump {
  origin: string;
  sessionStorage: Record<string, string>;
}

/**
 * Extiende el `context` default para inyectar, antes de que corra cualquier
 * script de la app, el sessionStorage capturado por auth.setup.ts. Es el
 * complemento a `storageState` (que solo cubre cookies/localStorage) para
 * que la sesión de Firebase (browserSessionPersistence) quede restaurada.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    if (fs.existsSync(sessionStorageFile)) {
      const dump: SessionStorageDump = JSON.parse(
        fs.readFileSync(sessionStorageFile, 'utf-8'),
      );

      await context.addInitScript((data: SessionStorageDump) => {
        if (window.location.origin !== data.origin) {
          return;
        }
        for (const [key, value] of Object.entries(data.sessionStorage)) {
          window.sessionStorage.setItem(key, value);
        }
      }, dump);
    }

    await use(context);
  },
});

export { expect };
