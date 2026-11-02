import { test, expect } from "@playwright/test";

// La sesión de Firebase (browserLocalPersistence) vive en localStorage, que
// storageState ya restaura: no hace falta inyectar nada a mano. Se mantiene
// este archivo para que los tests existentes no cambien sus imports.
export { test, expect };
