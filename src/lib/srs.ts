/**
 * Algoritmo de repetición espaciada SM-2 (SuperMemo 2 / Anki), función pura.
 * Estado inmutable: (estado, calidad 0-5) -> nuevo estado.
 * Referencia: https://super-memory.com/english/ol/sm2.htm
 */

export interface SrsState {
  easiness: number; // factor E, mínimo 1.3
  intervalDays: number; // días hasta el próximo repaso
  repetitions: number; // repasos correctos consecutivos
}

export const INITIAL_SRS: SrsState = {
  easiness: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

/** Calidad de respuesta 0-5. Mapeo desde el juego en `qualityFromResult`. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Aplica una revisión SM-2. Calidad < 3 reinicia las repeticiones (fallo);
 * calidad >= 3 avanza el intervalo. El factor de facilidad se ajusta siempre.
 */
export function reviewSm2(state: SrsState, quality: Quality): SrsState {
  const q = quality;
  let { easiness, intervalDays, repetitions } = state;

  if (q < 3) {
    // Fallo: se repite pronto, se reinicia la cadena.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easiness);
  }

  // Ajuste del factor de facilidad (fórmula SM-2).
  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  return { easiness, intervalDays, repetitions };
}

/**
 * Traduce el resultado de una tarjeta de Palabra Precisa a calidad SM-2:
 * - acierto al primer intento -> 5
 * - acierto tras reintento/pista -> 3
 * - fallo (requirió corrección) -> 1
 */
export function qualityFromResult(result: 'first' | 'retry' | 'fail'): Quality {
  switch (result) {
    case 'first':
      return 5;
    case 'retry':
      return 3;
    case 'fail':
      return 1;
  }
}

/** Fecha de vencimiento (YYYY-MM-DD) a partir de hoy + intervalo. */
export function dueDateFrom(state: SrsState, today = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() + Math.max(0, state.intervalDays));
  return d.toISOString().slice(0, 10);
}

/** ¿El ítem está vencido para repasar hoy? */
export function isDue(dueDate: string, today = new Date()): boolean {
  return dueDate <= today.toISOString().slice(0, 10);
}
