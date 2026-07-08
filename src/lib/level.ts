/**
 * Progresión de dificultad por niveles (1-3) por juego.
 *
 * Principio (dificultad deseable / zona de desarrollo próximo): el ejercicio
 * tiene que ser exigente pero alcanzable. Subimos de nivel cuando el
 * desempeño reciente es consistentemente alto y bajamos cuando es
 * consistentemente bajo, usando la mediana de las últimas rondas para no
 * reaccionar a una ronda suelta buena o mala.
 */
import type { GameType } from '../types';

export const MAX_LEVEL = 3;
export const MIN_LEVEL = 1;

/** Rondas recientes que se consideran para decidir un cambio de nivel. */
export const LEVEL_WINDOW = 3;

interface LevelThresholds {
  /** mediana ≥ up → sube de nivel */
  up: number;
  /** mediana < down → baja de nivel */
  down: number;
}

/**
 * Umbrales por juego sobre la métrica de dominio de cada uno:
 * - categorias/letra: palabras únicas válidas por ronda (fluidez verbal;
 *   los rangos vienen de las normas de tareas de fluidez semántica/fonémica).
 * - tabu: % de cartas superadas en la ronda (subIndex 0-100).
 */
export const LEVEL_THRESHOLDS: Partial<Record<GameType, LevelThresholds>> = {
  categorias: { up: 15, down: 7 },
  letra: { up: 11, down: 5 },
  tabu: { up: 80, down: 30 },
};

/** Métrica de dominio de una ronda para decidir nivel (ver umbrales). */
export function masteryValue(gameType: GameType, round: {
  score: number;
  subIndex: number;
  metrics: { uniqueValid?: number };
}): number {
  if (gameType === 'categorias' || gameType === 'letra') {
    return round.metrics.uniqueValid ?? round.score;
  }
  return round.subIndex;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Decide el próximo nivel a partir del actual y los valores de dominio de
 * las rondas recientes (cronológicas). Sin ventana completa no hay cambio.
 */
export function nextLevel(
  current: number,
  recentValues: number[],
  thresholds: LevelThresholds,
): number {
  if (recentValues.length < LEVEL_WINDOW) return clampLevel(current);
  const m = median(recentValues.slice(-LEVEL_WINDOW));
  if (m >= thresholds.up) return clampLevel(current + 1);
  if (m < thresholds.down) return clampLevel(current - 1);
  return clampLevel(current);
}

export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
}

/**
 * Elige contenido acorde al nivel: prioriza los ítems del nivel exacto y,
 * si no hay, cae a niveles inferiores (nunca superiores, para que el salto
 * de dificultad sea el decidido por la progresión).
 */
export function poolForLevel<T extends { nivel: number }>(items: T[], level: number): T[] {
  const l = clampLevel(level);
  const exact = items.filter((i) => i.nivel === l);
  if (exact.length > 0) return exact;
  const below = items.filter((i) => i.nivel <= l);
  return below.length > 0 ? below : items;
}
