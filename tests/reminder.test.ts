import { describe, it, expect } from 'vitest';
import { shouldRemind, parseTime } from '../src/lib/reminder';

const at = (h: number, m: number) => new Date(2026, 6, 10, h, m);

describe('parseTime', () => {
  it('parsea HH:MM', () => {
    expect(parseTime('08:30')).toEqual([8, 30]);
    expect(parseTime('19:00')).toEqual([19, 0]);
  });
  it('entrada inválida cae a 19:00', () => {
    expect(parseTime('')).toEqual([19, 0]);
    expect(parseTime('no-hora')).toEqual([19, 0]);
  });
  it('recorta valores fuera de rango', () => {
    expect(parseTime('99:99')).toEqual([23, 59]);
  });
});

describe('shouldRemind', () => {
  const base = {
    enabled: true,
    time: '19:00',
    sessionCompletedToday: false,
  };

  it('avisa cuando pasó la hora y la sesión no está hecha', () => {
    expect(shouldRemind({ ...base, now: at(19, 0) })).toBe(true);
    expect(shouldRemind({ ...base, now: at(22, 30) })).toBe(true);
  });

  it('no avisa antes de la hora elegida', () => {
    expect(shouldRemind({ ...base, now: at(18, 59) })).toBe(false);
  });

  it('no avisa si la sesión ya está completa', () => {
    expect(shouldRemind({ ...base, sessionCompletedToday: true, now: at(20, 0) })).toBe(false);
  });

  it('no avisa si está desactivado', () => {
    expect(shouldRemind({ ...base, enabled: false, now: at(20, 0) })).toBe(false);
  });
});
