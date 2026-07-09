/**
 * Motor de sincronización con Supabase. Estrategia:
 *  - pull: baja rondas/ítems/perfil del servidor y los fusiona con lo local
 *    (ver merge.ts), luego recalcula las stats afectadas.
 *  - push: sube lo local que falte en el servidor (rondas idempotentes por id,
 *    ítems y perfil por upsert).
 * `syncNow` hace pull y después push, de modo que ambos dispositivos convergen.
 * Todo es best-effort: si no hay sesión o falla la red, la app sigue local.
 */
import { getSupabase } from './client';
import { syncConfigured, authRedirectUrl } from './config';
import { registerSyncRunner } from './scheduler';
import {
  mergeRounds,
  roundsToPush,
  mergeLexicalItems,
  mergeSettings,
  stripLocalOnly,
} from './merge';
import { db } from '../db/schema';
import { getSettings, saveSettings, recomputeDailyStats } from '../db/repo';
import type { Round, LexicalItem, AppSettings } from '../types';
import type { SyncableSettings } from './merge';

export interface SyncStatus {
  configured: boolean;
  email: string | null;
  state: 'idle' | 'syncing' | 'ok' | 'error';
  lastSyncAt: number | null;
  lastError: string | null;
}

let status: SyncStatus = {
  configured: syncConfigured,
  email: null,
  state: 'idle',
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set<(s: SyncStatus) => void>();

export function getStatus(): SyncStatus {
  return status;
}

export function subscribeStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  cb(status);
  return () => listeners.delete(cb);
}

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  for (const cb of listeners) cb(status);
}

// ---------- helpers ----------

function stripId<T extends { id?: number }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row;
  return rest;
}

// ---------- auth ----------

/** Inicia el sync: engancha auth y dispara la primera sincronización si hay sesión. */
export async function startSync(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  registerSyncRunner(() => syncNow());
  supa.auth.onAuthStateChange((_event, session) => {
    setStatus({ email: session?.user?.email ?? null });
    if (session) void syncNow();
  });
  const { data } = await supa.auth.getSession();
  setStatus({ email: data.session?.user?.email ?? null });
  if (data.session) void syncNow();
}

/** Envía el link mágico al email indicado. */
export async function signInWithEmail(email: string): Promise<void> {
  const supa = getSupabase();
  if (!supa) throw new Error('Sync no configurado.');
  const { error } = await supa.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

/** Cierra sesión (los datos locales se conservan). */
export async function signOut(): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  await supa.auth.signOut();
  setStatus({ email: null, state: 'idle' });
}

// ---------- sincronización ----------

let running = false;

/** Sincroniza en ambos sentidos. Idempotente y con guardia de concurrencia. */
export async function syncNow(): Promise<void> {
  const supa = getSupabase();
  if (!supa || running) return;
  const { data } = await supa.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  running = true;
  setStatus({ state: 'syncing', lastError: null });
  try {
    await pull(userId);
    await push(userId);
    setStatus({ state: 'ok', lastSyncAt: Date.now() });
    onDataChanged?.();
  } catch (e) {
    setStatus({ state: 'error', lastError: e instanceof Error ? e.message : 'Error de sync' });
  } finally {
    running = false;
  }
}

async function pull(userId: string): Promise<void> {
  const supa = getSupabase()!;

  // Rondas
  const { data: roundRows, error: rErr } = await supa
    .from('rounds')
    .select('payload')
    .eq('user_id', userId);
  if (rErr) throw rErr;
  const remoteRounds = (roundRows ?? []).map((r) => r.payload as Round);
  const localRounds = (await db.rounds.toArray()).map(stripId);
  const localIds = new Set(localRounds.map((r) => r.clientRoundId));
  const merged = mergeRounds(localRounds, remoteRounds);
  const toAdd = merged.filter((r) => !localIds.has(r.clientRoundId));
  if (toAdd.length) {
    await db.rounds.bulkAdd(toAdd as Round[]);
    const dates = new Set(toAdd.map((r) => r.sessionDate));
    for (const d of dates) await recomputeDailyStats(d);
  }

  // Ítems léxicos (SRS)
  const { data: lexRows, error: lErr } = await supa
    .from('lexical_items')
    .select('payload')
    .eq('user_id', userId);
  if (lErr) throw lErr;
  const remoteLex = (lexRows ?? []).map((r) => r.payload as LexicalItem);
  const localLex = await db.lexicalItems.toArray();
  const mergedLex = mergeLexicalItems(localLex.map(stripId), remoteLex);
  await applyLexical(localLex, mergedLex);

  // Perfil (ajustes)
  const { data: prof, error: pErr } = await supa
    .from('profile')
    .select('settings,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (prof) {
    const local = await getSettings();
    const remote = prof.settings as SyncableSettings;
    const mergedS = mergeSettings(local, remote, prof.updated_at as number, local.updatedAt);
    if (mergedS !== local) await saveSettings(mergedS, false);
  }
}

async function push(userId: string): Promise<void> {
  const supa = getSupabase()!;

  // Rondas faltantes en el servidor
  const { data: idRows, error: idErr } = await supa
    .from('rounds')
    .select('id')
    .eq('user_id', userId);
  if (idErr) throw idErr;
  const remoteIds = new Set((idRows ?? []).map((r) => r.id as string));
  const localRounds = (await db.rounds.toArray()).map(stripId);
  const toPush = roundsToPush(localRounds, remoteIds);
  if (toPush.length) {
    const rows = toPush.map((r) => ({
      id: r.clientRoundId,
      user_id: userId,
      payload: r,
      played_at: r.playedAt,
    }));
    const { error } = await supa.from('rounds').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }

  // Ítems léxicos (upsert de todos: pocos y es idempotente)
  const localLex = (await db.lexicalItems.toArray()).map(stripId);
  if (localLex.length) {
    const rows = localLex.map((i) => ({ user_id: userId, word: i.word, payload: i }));
    const { error } = await supa.from('lexical_items').upsert(rows, { onConflict: 'user_id,word' });
    if (error) throw error;
  }

  // Perfil (sin la API key)
  const settings = await getSettings();
  const { error } = await supa.from('profile').upsert(
    { user_id: userId, settings: stripLocalOnly(settings), updated_at: settings.updatedAt },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

/** Escribe en la DB local los ítems fusionados (update por palabra, add si es nuevo). */
async function applyLexical(local: LexicalItem[], merged: LexicalItem[]): Promise<void> {
  const byWord = new Map(local.map((i) => [i.word, i]));
  for (const m of merged) {
    const existing = byWord.get(m.word);
    if (!existing) {
      await db.lexicalItems.add(stripId(m) as LexicalItem);
    } else if (existing.id !== undefined) {
      await db.lexicalItems.update(existing.id, { ...stripId(m) } as Partial<LexicalItem>);
    }
  }
}

// Hook que la app registra para refrescar la UI tras un sync.
let onDataChanged: (() => void) | null = null;
export function setOnDataChanged(cb: () => void): void {
  onDataChanged = cb;
}

export type { AppSettings };
