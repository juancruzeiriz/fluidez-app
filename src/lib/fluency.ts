/**
 * Índice de Fluidez (IF): número compuesto 0-100 que resume el desempeño,
 * normalizado contra la línea base personal del usuario.
 *
 * Cada subíndice se calibra contra la mediana de las primeras rondas de su
 * juego (línea base). Los pesos son una heurística inicial recalibrable; si
 * un subíndice todavía no tiene datos, su peso se reparte entre los demás.
 */

export type SubIndexKey = 'lexico' | 'soltura' | 'precision';

/** Pesos heurísticos iniciales (deben sumar 1 sobre los presentes). */
export const SUBINDEX_WEIGHTS: Record<SubIndexKey, number> = {
  lexico: 0.4, // acceso léxico (Sprint de Categorías)
  soltura: 0.4, // redondez del discurso (Un Minuto Redondo)
  precision: 0.2, // vocabulario preciso (Palabra Precisa)
};

/** Cantidad de rondas que definen la línea base de un juego. */
export const BASELINE_ROUNDS = 5;

/** Mediana de una lista de números (0 si vacía). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** Línea base = mediana de las primeras BASELINE_ROUNDS mediciones. */
export function baseline(values: number[]): number {
  return median(values.slice(0, BASELINE_ROUNDS));
}

/**
 * Normaliza una medición contra su línea base a una escala 0-100 centrada en
 * 50 (= igual a la base). Mejor que la base sube, peor baja. `higherIsBetter`
 * invierte la dirección para métricas donde menos es mejor (muletillas, pausas).
 */
export function normalizeAgainstBaseline(
  value: number,
  base: number,
  higherIsBetter: boolean,
): number {
  if (base <= 0) return 50; // sin base útil todavía
  const ratio = value / base;
  const effective = higherIsBetter ? ratio : 2 - ratio;
  // 1.0 -> 50, 2.0 -> 100, 0.0 -> 0 (lineal, recortado)
  return clamp(Math.round(effective * 50), 0, 100);
}

/**
 * Combina los subíndices disponibles con sus pesos, renormalizando los pesos
 * sobre los subíndices presentes (los que tienen valor numérico).
 */
export function compositeIndex(sub: Partial<Record<SubIndexKey, number>>): number {
  const present = (Object.keys(sub) as SubIndexKey[]).filter(
    (k) => typeof sub[k] === 'number',
  );
  if (present.length === 0) return 0;
  const totalWeight = present.reduce((acc, k) => acc + SUBINDEX_WEIGHTS[k], 0);
  const weighted = present.reduce((acc, k) => acc + sub[k]! * SUBINDEX_WEIGHTS[k], 0);
  return Math.round(weighted / totalWeight);
}

/**
 * Pendiente (tendencia) de una serie por regresión lineal simple.
 * Positiva = mejorando. Se usa para elegir el juego a priorizar y para
 * mostrar la dirección del progreso.
 */
export function slope(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (series[i]! - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : round2(num / den);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
