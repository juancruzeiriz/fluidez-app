import { describe, it, expect } from 'vitest';
import {
  median,
  baseline,
  normalizeAgainstBaseline,
  compositeIndex,
  slope,
} from '../src/lib/fluency';

describe('median / baseline', () => {
  it('mediana de listas par e impar', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
  it('baseline usa las primeras 5 mediciones', () => {
    expect(baseline([10, 10, 10, 10, 10, 99, 99])).toBe(10);
  });
});

describe('normalizeAgainstBaseline', () => {
  it('igual a la base da 50', () => {
    expect(normalizeAgainstBaseline(10, 10, true)).toBe(50);
  });
  it('mejor que la base sube cuando más es mejor', () => {
    expect(normalizeAgainstBaseline(20, 10, true)).toBe(100);
  });
  it('invierte dirección cuando menos es mejor', () => {
    // menos muletillas que la base => mejor => sube
    expect(normalizeAgainstBaseline(5, 10, false)).toBe(75);
  });
  it('sin base útil devuelve 50', () => {
    expect(normalizeAgainstBaseline(5, 0, true)).toBe(50);
  });
});

describe('compositeIndex', () => {
  it('combina subíndices con sus pesos', () => {
    const idx = compositeIndex({ lexico: 100, soltura: 100, precision: 100 });
    expect(idx).toBe(100);
  });
  it('combina los cuatro subíndices con sus pesos (30/30/20/20)', () => {
    // 100*.3 + 0*.3 + 100*.2 + 0*.2 = 50
    const idx = compositeIndex({ lexico: 100, soltura: 0, expresividad: 100, precision: 0 });
    expect(idx).toBe(50);
  });
  it('renormaliza pesos cuando falta un subíndice', () => {
    // solo lexico y soltura (0.3 y 0.3) presentes -> 50/50
    const idx = compositeIndex({ lexico: 80, soltura: 40 });
    expect(idx).toBe(60);
  });
  it('devuelve 0 si no hay datos', () => {
    expect(compositeIndex({})).toBe(0);
  });
});

describe('slope', () => {
  it('detecta tendencia creciente', () => {
    expect(slope([1, 2, 3, 4])).toBeGreaterThan(0);
  });
  it('detecta tendencia decreciente', () => {
    expect(slope([4, 3, 2, 1])).toBeLessThan(0);
  });
  it('serie corta o plana da 0', () => {
    expect(slope([5])).toBe(0);
    expect(slope([5, 5, 5])).toBe(0);
  });
});
