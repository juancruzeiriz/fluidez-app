/**
 * Programador de sincronización con debounce. Vive aparte para romper el ciclo
 * de imports (repo → scheduler ← sync): repo marca "hay cambios" sin conocer al
 * motor de sync, y el motor se registra como ejecutor.
 */
type SyncFn = () => Promise<void>;

let runner: SyncFn | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2500;

/** El motor de sync se registra acá al inicializarse. */
export function registerSyncRunner(fn: SyncFn): void {
  runner = fn;
}

/** Marca que hubo cambios locales; agenda un push diferido (coalesce). */
export function markDirty(): void {
  if (!runner) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void runner?.();
  }, DEBOUNCE_MS);
}
