/**
 * Lógica pura de fusión para la sincronización en la nube. Sin I/O acá: son
 * funciones deterministas y fáciles de testear. La regla general es fusionar
 * el estado de varios dispositivos sin perder progreso.
 *
 * - Rondas: append-only e idempotentes por `clientRoundId` → unión.
 * - Ítems léxicos (SRS): last-write-wins usando el último repaso como versión.
 * - Ajustes: last-write-wins por `updatedAt` (la API key nunca se sincroniza).
 */
import type { Round, LexicalItem, AppSettings } from '../types';

// ---------- Rondas ----------

/** Unión de rondas locales y remotas, deduplicadas por clientRoundId. */
export function mergeRounds(local: Round[], remote: Round[]): Round[] {
  const byId = new Map<string, Round>();
  for (const r of [...local, ...remote]) {
    if (!byId.has(r.clientRoundId)) byId.set(r.clientRoundId, r);
  }
  return [...byId.values()].sort((a, b) => a.playedAt - b.playedAt);
}

/** Rondas locales que faltan en el servidor (para subir). */
export function roundsToPush(local: Round[], remoteIds: Set<string>): Round[] {
  return local.filter((r) => !remoteIds.has(r.clientRoundId));
}

// ---------- Ítems léxicos (SRS) ----------

/**
 * "Versión" de un ítem = timestamp de su último repaso (0 si nunca se repasó).
 * Sirve como reloj lógico: el ítem repasado más recientemente gana.
 */
export function lexicalVersion(item: LexicalItem): number {
  return item.history.reduce((max, h) => Math.max(max, h.at), 0);
}

/**
 * Fusiona ítems léxicos por palabra (clave única). Gana el de repaso más
 * reciente; ante empate, el de más repeticiones (más avanzado en el SRS).
 */
export function mergeLexicalItems(local: LexicalItem[], remote: LexicalItem[]): LexicalItem[] {
  const byWord = new Map<string, LexicalItem>();
  for (const it of [...local, ...remote]) {
    const prev = byWord.get(it.word);
    if (!prev || isNewerLexical(it, prev)) byWord.set(it.word, it);
  }
  return [...byWord.values()];
}

function isNewerLexical(a: LexicalItem, b: LexicalItem): boolean {
  const va = lexicalVersion(a);
  const vb = lexicalVersion(b);
  if (va !== vb) return va > vb;
  return a.repetitions > b.repetitions;
}

// ---------- Ajustes ----------

/** Ajustes serializables para la nube (nunca incluye la API key local). */
export type SyncableSettings = Omit<AppSettings, 'apiKey'>;

/** Quita la API key antes de subir los ajustes (privacidad + seguridad). */
export function stripLocalOnly(settings: AppSettings): SyncableSettings {
  const { apiKey: _apiKey, ...rest } = settings;
  return rest;
}

/**
 * Fusiona ajustes locales y remotos con last-write-wins por `updatedAt`.
 * Preserva siempre la API key local (no viene del remoto). Si el remoto es
 * más nuevo, adopta su racha/niveles/etc. pero mantiene la key del dispositivo.
 */
export function mergeSettings(
  local: AppSettings,
  remote: SyncableSettings | null,
  remoteUpdatedAt: number,
  localUpdatedAt: number,
): AppSettings {
  if (!remote || localUpdatedAt >= remoteUpdatedAt) return local;
  return { ...remote, apiKey: local.apiKey, key: 'app' };
}
