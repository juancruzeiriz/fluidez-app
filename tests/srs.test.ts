import { describe, it, expect } from 'vitest';
import {
  INITIAL_SRS,
  reviewSm2,
  qualityFromResult,
  dueDateFrom,
  isDue,
} from '../src/lib/srs';

describe('reviewSm2', () => {
  it('primer acierto -> intervalo 1 día', () => {
    const s = reviewSm2(INITIAL_SRS, 5);
    expect(s.repetitions).toBe(1);
    expect(s.intervalDays).toBe(1);
    expect(s.easiness).toBeGreaterThan(2.5);
  });

  it('segundo acierto -> 6 días', () => {
    const s1 = reviewSm2(INITIAL_SRS, 5);
    const s2 = reviewSm2(s1, 5);
    expect(s2.repetitions).toBe(2);
    expect(s2.intervalDays).toBe(6);
  });

  it('tercer acierto -> intervalo escala por easiness', () => {
    let s = reviewSm2(INITIAL_SRS, 4);
    s = reviewSm2(s, 4);
    const before = s.intervalDays;
    s = reviewSm2(s, 4);
    expect(s.intervalDays).toBe(Math.round(before * s.easiness));
  });

  it('fallo reinicia repeticiones y programa a 1 día', () => {
    let s = reviewSm2(INITIAL_SRS, 5);
    s = reviewSm2(s, 5);
    s = reviewSm2(s, 1); // fallo
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
  });

  it('easiness nunca baja de 1.3', () => {
    let s = INITIAL_SRS;
    for (let i = 0; i < 10; i++) s = reviewSm2(s, 0);
    expect(s.easiness).toBeGreaterThanOrEqual(1.3);
  });
});

describe('qualityFromResult', () => {
  it('mapea resultados del juego a calidad SM-2', () => {
    expect(qualityFromResult('first')).toBe(5);
    expect(qualityFromResult('retry')).toBe(3);
    expect(qualityFromResult('fail')).toBe(1);
  });
});

describe('dueDateFrom / isDue', () => {
  it('calcula la fecha de vencimiento sumando el intervalo', () => {
    const today = new Date('2026-01-01T12:00:00Z');
    const due = dueDateFrom({ easiness: 2.5, intervalDays: 6, repetitions: 2 }, today);
    expect(due).toBe('2026-01-07');
  });
  it('detecta vencimiento', () => {
    const today = new Date('2026-01-10T00:00:00Z');
    expect(isDue('2026-01-09', today)).toBe(true);
    expect(isDue('2026-01-20', today)).toBe(false);
  });
});
