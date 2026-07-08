/**
 * Resumen semanal de progreso: compara la semana actual (últimos 7 días,
 * incluido hoy) contra la anterior. Mostrar el progreso agregado por semana
 * reduce el ruido día a día y refuerza la adherencia (el hábito importa más
 * que cualquier sesión individual).
 */
import type { DailyStats } from '../types';

export interface WeekAggregate {
  /** días con actividad (sesión completa o rondas jugadas) */
  activeDays: number;
  sessionsCompleted: number;
  avgIF: number | null;
  avgLexico: number | null;
  avgSoltura: number | null;
  avgExpresividad: number | null;
  avgPrecision: number | null;
  xp: number;
}

export interface WeeklySummary {
  current: WeekAggregate;
  previous: WeekAggregate;
  /** IF actual - IF anterior (null si falta alguna de las dos) */
  deltaIF: number | null;
  /** frase destacada para mostrar (null si no hay datos suficientes) */
  insight: string | null;
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function avg(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

function aggregate(stats: DailyStats[]): WeekAggregate {
  const active = stats.filter((s) => s.sessionCompleted || s.fluencyIndex > 0);
  const nums = (sel: (s: DailyStats) => number | null) =>
    active.map(sel).filter((v): v is number => typeof v === 'number');
  return {
    activeDays: active.length,
    sessionsCompleted: stats.filter((s) => s.sessionCompleted).length,
    avgIF: avg(active.map((s) => s.fluencyIndex)),
    avgLexico: avg(nums((s) => s.subLexico)),
    avgSoltura: avg(nums((s) => s.subSoltura)),
    avgExpresividad: avg(nums((s) => s.subExpresividad)),
    avgPrecision: avg(nums((s) => s.subPrecision)),
    xp: stats.reduce((acc, s) => acc + s.xp, 0),
  };
}

const SUB_LABELS: [keyof WeekAggregate, string][] = [
  ['avgLexico', 'acceso léxico'],
  ['avgSoltura', 'soltura'],
  ['avgExpresividad', 'expresividad'],
  ['avgPrecision', 'precisión'],
];

/** Arma el resumen semanal a partir de la serie diaria completa. */
export function weeklySummary(stats: DailyStats[], today: string): WeeklySummary {
  const curFrom = addDays(today, -6);
  const prevFrom = addDays(today, -13);
  const prevTo = addDays(today, -7);

  const current = aggregate(stats.filter((s) => inRange(s.date, curFrom, today)));
  const previous = aggregate(stats.filter((s) => inRange(s.date, prevFrom, prevTo)));

  const deltaIF =
    current.avgIF !== null && previous.avgIF !== null ? current.avgIF - previous.avgIF : null;

  return { current, previous, deltaIF, insight: buildInsight(current, previous, deltaIF) };
}

function buildInsight(
  cur: WeekAggregate,
  prev: WeekAggregate,
  deltaIF: number | null,
): string | null {
  if (cur.activeDays === 0) return null;
  if (prev.activeDays === 0) {
    return `Primera semana con datos: ${cur.activeDays} ${cur.activeDays === 1 ? 'día activo' : 'días activos'}. La constancia vale más que el puntaje.`;
  }

  // Subíndice con mayor mejora (o mayor caída) entre semanas.
  let bestLabel: string | null = null;
  let bestDelta = 0;
  for (const [key, label] of SUB_LABELS) {
    const c = cur[key];
    const p = prev[key];
    if (typeof c === 'number' && typeof p === 'number') {
      const d = c - p;
      if (Math.abs(d) > Math.abs(bestDelta)) {
        bestDelta = d;
        bestLabel = label;
      }
    }
  }

  if (bestLabel && bestDelta > 0) {
    return `Tu mayor avance de la semana fue en ${bestLabel} (+${bestDelta}).`;
  }
  if (bestLabel && bestDelta < 0) {
    return `Esta semana bajó ${bestLabel} (${bestDelta}); la sesión diaria va a priorizar ese juego.`;
  }
  if (deltaIF !== null && deltaIF > 0) {
    return `Índice de Fluidez en alza: +${deltaIF} vs. la semana pasada.`;
  }
  return `Semana estable. ${cur.activeDays}/7 días activos.`;
}
