import { describe, it, expect } from 'vitest';
import { weeklySummary } from '../src/lib/weekly';
import type { DailyStats } from '../src/types';

function day(date: string, patch: Partial<DailyStats> = {}): DailyStats {
  return {
    date,
    fluencyIndex: 0,
    subLexico: null,
    subSoltura: null,
    subExpresividad: null,
    subPrecision: null,
    sessionCompleted: false,
    xp: 0,
    totReports: 0,
    ...patch,
  };
}

const TODAY = '2026-07-08';

describe('weeklySummary', () => {
  it('sin datos: agregados vacíos y sin insight', () => {
    const s = weeklySummary([], TODAY);
    expect(s.current.activeDays).toBe(0);
    expect(s.current.avgIF).toBeNull();
    expect(s.deltaIF).toBeNull();
    expect(s.insight).toBeNull();
  });

  it('separa la semana actual (últimos 7 días) de la anterior', () => {
    const stats = [
      day('2026-07-08', { fluencyIndex: 60, sessionCompleted: true }), // hoy
      day('2026-07-02', { fluencyIndex: 40, sessionCompleted: true }), // hace 6 días → actual
      day('2026-07-01', { fluencyIndex: 80, sessionCompleted: true }), // hace 7 días → anterior
      day('2026-06-25', { fluencyIndex: 70 }), // hace 13 días → anterior
      day('2026-06-24', { fluencyIndex: 99 }), // hace 14 días → fuera
    ];
    const s = weeklySummary(stats, TODAY);
    expect(s.current.activeDays).toBe(2);
    expect(s.current.avgIF).toBe(50);
    expect(s.previous.activeDays).toBe(2);
    expect(s.previous.avgIF).toBe(75);
    expect(s.deltaIF).toBe(-25);
  });

  it('primera semana con datos: insight de constancia', () => {
    const s = weeklySummary([day(TODAY, { fluencyIndex: 55 })], TODAY);
    expect(s.insight).toContain('Primera semana');
  });

  it('destaca el subíndice con mayor mejora', () => {
    const stats = [
      day('2026-07-08', { fluencyIndex: 60, subLexico: 70, subSoltura: 50 }),
      day('2026-07-01', { fluencyIndex: 50, subLexico: 40, subSoltura: 49 }),
    ];
    const s = weeklySummary(stats, TODAY);
    expect(s.insight).toContain('acceso léxico');
    expect(s.insight).toContain('+30');
  });

  it('avisa cuando un subíndice cae', () => {
    const stats = [
      day('2026-07-08', { fluencyIndex: 40, subPrecision: 30 }),
      day('2026-07-01', { fluencyIndex: 50, subPrecision: 80 }),
    ];
    const s = weeklySummary(stats, TODAY);
    expect(s.insight).toContain('precisión');
  });

  it('suma sesiones completas y XP por semana', () => {
    const stats = [
      day('2026-07-08', { sessionCompleted: true, xp: 30 }),
      day('2026-07-07', { sessionCompleted: true, xp: 20 }),
    ];
    const s = weeklySummary(stats, TODAY);
    expect(s.current.sessionsCompleted).toBe(2);
    expect(s.current.xp).toBe(50);
  });
});
