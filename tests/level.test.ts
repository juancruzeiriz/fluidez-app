import { describe, it, expect } from 'vitest';
import {
  nextLevel,
  clampLevel,
  poolForLevel,
  masteryValue,
  LEVEL_THRESHOLDS,
  LEVEL_WINDOW,
} from '../src/lib/level';

const T = { up: 15, down: 7 };

describe('nextLevel', () => {
  it('no cambia sin ventana completa de rondas', () => {
    expect(nextLevel(1, [], T)).toBe(1);
    expect(nextLevel(2, [20, 20], T)).toBe(2);
  });

  it('sube cuando la mediana reciente alcanza el umbral', () => {
    expect(nextLevel(1, [15, 18, 16], T)).toBe(2);
  });

  it('baja cuando la mediana reciente está bajo el piso', () => {
    expect(nextLevel(2, [5, 6, 4], T)).toBe(1);
  });

  it('se mantiene en la zona intermedia', () => {
    expect(nextLevel(2, [10, 11, 9], T)).toBe(2);
  });

  it('usa solo las últimas LEVEL_WINDOW rondas', () => {
    const values = [1, 1, 1, 20, 20, 20];
    expect(values.length).toBeGreaterThan(LEVEL_WINDOW);
    expect(nextLevel(1, values, T)).toBe(2);
  });

  it('una ronda mala aislada no baja el nivel (mediana, no promedio)', () => {
    expect(nextLevel(2, [12, 0, 13], T)).toBe(2);
  });

  it('respeta el tope y el piso', () => {
    expect(nextLevel(3, [30, 30, 30], T)).toBe(3);
    expect(nextLevel(1, [0, 0, 0], T)).toBe(1);
  });
});

describe('clampLevel', () => {
  it('recorta a 1..3', () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(5)).toBe(3);
    expect(clampLevel(2)).toBe(2);
  });
});

describe('poolForLevel', () => {
  const items = [
    { texto: 'a', nivel: 1 },
    { texto: 'b', nivel: 1 },
    { texto: 'c', nivel: 2 },
    { texto: 'd', nivel: 3 },
  ];

  it('prioriza los ítems del nivel exacto', () => {
    expect(poolForLevel(items, 2).map((i) => i.texto)).toEqual(['c']);
  });

  it('sin ítems del nivel exacto cae a niveles inferiores', () => {
    const soloBajos = items.filter((i) => i.nivel !== 2);
    expect(poolForLevel(soloBajos, 2).map((i) => i.texto)).toEqual(['a', 'b']);
  });

  it('nunca devuelve vacío', () => {
    const soloAltos = [{ texto: 'x', nivel: 3 }];
    expect(poolForLevel(soloAltos, 1)).toHaveLength(1);
  });
});

describe('masteryValue', () => {
  it('usa palabras únicas para los juegos léxicos', () => {
    const round = { score: 99, subIndex: 50, metrics: { uniqueValid: 12 } };
    expect(masteryValue('categorias', round)).toBe(12);
    expect(masteryValue('letra', round)).toBe(12);
  });

  it('usa subIndex para tabú', () => {
    const round = { score: 3, subIndex: 60, metrics: {} };
    expect(masteryValue('tabu', round)).toBe(60);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('define umbrales coherentes para los juegos con niveles', () => {
    for (const t of Object.values(LEVEL_THRESHOLDS)) {
      expect(t.up).toBeGreaterThan(t.down);
    }
  });
});
