/**
 * Operaciones tipadas sobre la base de datos. Concentra la persistencia de
 * rondas, el estado SRS y el cálculo de agregados (índice de fluidez, rachas).
 */
import { db, DEFAULT_SETTINGS } from './schema';
import type { Round, LexicalItem, DailyStats, AppSettings, GameType } from '../types';
import {
  baseline,
  normalizeAgainstBaseline,
  compositeIndex,
  median,
  type SubIndexKey,
} from '../lib/fluency';
import { reviewSm2, qualityFromResult, dueDateFrom, INITIAL_SRS, type SrsState } from '../lib/srs';
import { nextLevel, masteryValue, LEVEL_THRESHOLDS, LEVEL_WINDOW, clampLevel } from '../lib/level';
import { weeklySummary, type WeeklySummary } from '../lib/weekly';

export function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ---------- Settings ----------

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('app');
  return s ?? DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch, key: 'app' as const };
  await db.settings.put(next);
  return next;
}

// ---------- Rounds ----------

/** Guarda una ronda de forma idempotente y recalcula stats del día y nivel. */
export async function saveRound(round: Round): Promise<void> {
  const existing = await db.rounds.where('clientRoundId').equals(round.clientRoundId).first();
  if (existing) return; // idempotencia: misma ronda enviada dos veces
  await db.rounds.add(round);
  await recomputeDailyStats(round.sessionDate);
  await updateLevelAfterRound(round.gameType);
}

// ---------- Niveles de dificultad ----------

/** Nivel actual de un juego (1 si nunca se ajustó). */
export async function getLevel(gameType: GameType): Promise<number> {
  const s = await getSettings();
  return clampLevel(s.levels?.[gameType] ?? 1);
}

/** Recalcula el nivel de un juego a partir de sus rondas recientes. */
async function updateLevelAfterRound(gameType: GameType): Promise<void> {
  const thresholds = LEVEL_THRESHOLDS[gameType];
  if (!thresholds) return; // juego sin progresión por niveles
  const s = await getSettings();
  const current = clampLevel(s.levels?.[gameType] ?? 1);
  const rounds = await roundsOf(gameType);
  const recent = rounds.slice(-LEVEL_WINDOW).map((r) => masteryValue(gameType, r));
  const next = nextLevel(current, recent, thresholds);
  if (next !== current) {
    await saveSettings({ levels: { ...(s.levels ?? {}), [gameType]: next } });
  }
}

/** Resumen semanal (semana actual vs. anterior) sobre la serie diaria. */
export async function getWeeklySummary(today = todayStr()): Promise<WeeklySummary> {
  const all = await db.dailyStats.toArray();
  return weeklySummary(all, today);
}

/** Todas las rondas de un juego, orden cronológico. */
export async function roundsOf(gameType: GameType): Promise<Round[]> {
  const all = await db.rounds.where('gameType').equals(gameType).toArray();
  return all.sort((a, b) => a.playedAt - b.playedAt);
}

/**
 * Recalcula el DailyStats de una fecha a partir de las rondas.
 * - subLéxico: palabras únicas/min de Sprint, normalizado contra la línea base personal.
 * - subSoltura: redondez media de Un Minuto Redondo (ya es 0-100 relativo a base).
 * - subPrecisión: % de aciertos de Palabra Precisa.
 */
export async function recomputeDailyStats(date: string): Promise<DailyStats> {
  const [cat, letra, min, historias, tabu, pre] = await Promise.all([
    roundsOf('categorias'),
    roundsOf('letra'),
    roundsOf('minuto'),
    roundsOf('historias'),
    roundsOf('tabu'),
    roundsOf('precisa'),
  ]);

  const sub: Partial<Record<SubIndexKey, number>> = {};

  // Léxico: acceso léxico de Sprint (semántica) + Letra Prohibida (fonémica),
  // ambos medidos en palabras únicas/min, normalizados contra la línea base.
  const lexRounds = [...cat, ...letra].sort((a, b) => a.playedAt - b.playedAt);
  const lexValues = lexRounds.map((r) => r.metrics.perMinute ?? 0);
  const lexTodayRounds = dayRounds(lexRounds, date);
  if (lexTodayRounds.length > 0) {
    const lexToday = mean(lexTodayRounds.map((r) => r.metrics.perMinute ?? 0));
    sub.lexico = normalizeAgainstBaseline(lexToday, baseline(lexValues), true);
  }

  // Soltura: redondez del discurso (Un Minuto Redondo + Historias 4/3/2),
  // ya viene 0-100 relativa a la base personal.
  const soltToday = dayRounds([...min, ...historias], date);
  if (soltToday.length > 0) {
    sub.soltura = Math.round(mean(soltToday.map((r) => r.score)));
  }

  // Expresividad: % de cartas de Tabú superadas (circunlocución / SFA).
  const tabuToday = dayRounds(tabu, date);
  if (tabuToday.length > 0) {
    const won = sum(tabuToday.map((r) => r.metrics.cardsWon ?? 0));
    const played = sum(tabuToday.map((r) => r.metrics.cardsPlayed ?? 0));
    sub.expresividad = played > 0 ? Math.round((won / played) * 100) : 0;
  }

  // Precisión: aciertos sobre intentos.
  const preToday = dayRounds(pre, date);
  if (preToday.length > 0) {
    const correct = sum(preToday.map((r) => r.metrics.correct ?? 0));
    const attempted = sum(preToday.map((r) => r.metrics.attempted ?? 0));
    sub.precision = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  }

  const prev = await db.dailyStats.get(date);
  const stats: DailyStats = {
    date,
    fluencyIndex: compositeIndex(sub),
    subLexico: sub.lexico ?? null,
    subSoltura: sub.soltura ?? null,
    subExpresividad: sub.expresividad ?? null,
    subPrecision: sub.precision ?? null,
    sessionCompleted: prev?.sessionCompleted ?? false,
    xp: prev?.xp ?? 0,
    totReports: prev?.totReports ?? 0,
  };
  await db.dailyStats.put(stats);
  return stats;
}

export async function addXp(date: string, amount: number): Promise<void> {
  const s = (await db.dailyStats.get(date)) ?? (await recomputeDailyStats(date));
  await db.dailyStats.put({ ...s, xp: s.xp + amount });
}

export async function reportTot(date: string): Promise<void> {
  const s = (await db.dailyStats.get(date)) ?? (await recomputeDailyStats(date));
  await db.dailyStats.put({ ...s, totReports: s.totReports + 1 });
}

export async function progressSeries(days = 90): Promise<DailyStats[]> {
  const all = await db.dailyStats.toArray();
  return all.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}

/** Récord personal (máximo) de una métrica de un juego. */
export async function personalBest(
  gameType: GameType,
  selector: (r: Round) => number,
): Promise<number> {
  const rounds = await roundsOf(gameType);
  return rounds.reduce((best, r) => Math.max(best, selector(r)), 0);
}

/** Último timestamp jugado de un juego (0 si nunca). */
async function lastPlayed(gameType: GameType): Promise<number> {
  const rounds = await roundsOf(gameType);
  return rounds.length ? rounds[rounds.length - 1]!.playedAt : 0;
}

/** Elige, entre varios juegos, el menos jugado recientemente (práctica dirigida). */
async function leastRecent(games: GameType[]): Promise<GameType> {
  const times = await Promise.all(games.map((g) => lastPlayed(g)));
  let best = games[0]!;
  let bestT = times[0]!;
  for (let i = 1; i < games.length; i++) {
    if (times[i]! < bestT) {
      bestT = times[i]!;
      best = games[i]!;
    }
  }
  return best;
}

/**
 * Arma la sesión diaria (3 bloques):
 *  1. Calentamiento — fluidez léxica: Sprint de Categorías o Letra Prohibida
 *  2. Plato principal — rotativo entre Un Minuto Redondo / Tabú / Historias
 *  3. Consolidación — Palabra Precisa (SRS)
 * En cada bloque rotativo se elige el juego menos jugado recientemente.
 */
export async function planDailySession(): Promise<GameType[]> {
  const warmup = await leastRecent(['categorias', 'letra']);
  const main = await leastRecent(['minuto', 'tabu', 'historias']);
  return [warmup, main, 'precisa'];
}

// ---------- SRS (Palabra Precisa) ----------

export async function dueItems(limit: number, date = todayStr()): Promise<LexicalItem[]> {
  const items = await db.lexicalItems.where('dueDate').belowOrEqual(date).toArray();
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, limit);
}

export async function newItems(limit: number): Promise<LexicalItem[]> {
  const items = await db.lexicalItems.where('source').equals('seed').toArray();
  return items.filter((i) => i.repetitions === 0 && i.history.length === 0).slice(0, limit);
}

/**
 * Selección de la tanda de Palabra Precisa: repasos vencidos + palabras nuevas.
 * De-duplica por si una nueva también está vencida.
 */
export async function precisaBatch(dueCount = 5, newCount = 3): Promise<LexicalItem[]> {
  const due = await dueItems(dueCount);
  const dueIds = new Set(due.map((i) => i.id));
  const fresh = (await newItems(newCount)).filter((i) => !dueIds.has(i.id));
  return [...due, ...fresh];
}

export async function reviewItem(
  id: number,
  result: 'first' | 'retry' | 'fail',
  at = Date.now(),
): Promise<void> {
  const item = await db.lexicalItems.get(id);
  if (!item) return;
  const state: SrsState = {
    easiness: item.easiness,
    intervalDays: item.intervalDays,
    repetitions: item.repetitions,
  };
  const next = reviewSm2(state, qualityFromResult(result));
  await db.lexicalItems.update(id, {
    ...next,
    dueDate: dueDateFrom(next),
    history: [...item.history, { at, result }],
  });
}

/** Alta de palabra propia (la que no te salió en una conversación real). */
export async function addUserWord(
  word: string,
  definition: string,
  contextGap: string,
): Promise<void> {
  const existing = await db.lexicalItems.where('word').equals(word.toLowerCase()).first();
  if (existing) return;
  const item: LexicalItem = {
    ...INITIAL_SRS,
    word: word.toLowerCase(),
    definition,
    contextGap,
    source: 'user',
    dueDate: todayStr(),
    history: [],
  };
  await db.lexicalItems.add(item);
}

// ---------- Rachas ----------

/**
 * Actualiza la racha al completar la sesión del día. Días consecutivos suman;
 * un hueco de 1 día se cubre con un protector si hay disponible; hueco mayor
 * reinicia. Idempotente por día.
 */
export async function completeSession(date = todayStr()): Promise<AppSettings> {
  const s = await getSettings();
  if (s.lastSessionDate === date) return s; // ya completada hoy

  let streak = s.streak;
  let protectors = s.streakProtectors;

  if (s.lastSessionDate === null) {
    streak = 1;
  } else {
    const gap = dayGap(s.lastSessionDate, date);
    if (gap === 1) {
      streak += 1;
    } else if (gap === 2 && protectors > 0) {
      protectors -= 1; // el protector cubre el día perdido
      streak += 1;
    } else {
      streak = 1;
    }
  }

  // Premio: 1 protector por cada 7 días de racha (tope 2).
  if (streak > 0 && streak % 7 === 0 && protectors < 2) protectors += 1;

  const stats = (await db.dailyStats.get(date)) ?? (await recomputeDailyStats(date));
  await db.dailyStats.put({ ...stats, sessionCompleted: true });

  return saveSettings({ streak, streakProtectors: protectors, lastSessionDate: date });
}

// ---------- helpers ----------

function dayRounds(rounds: Round[], date: string): Round[] {
  return rounds.filter((r) => r.sessionDate === date);
}
function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0;
}
function dayGap(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

export { median };
