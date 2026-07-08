import { describe, it, expect } from 'vitest';
import { validWordsWithLetter, tabuViolations } from '../src/lib/games';

describe('validWordsWithLetter', () => {
  it('cuenta solo palabras que empiezan con la letra', () => {
    const r = validWordsWithLetter('manzana mesa perro martillo', 'M');
    expect(r.sort()).toEqual(['manzana', 'martillo', 'mesa']);
  });
  it('ignora tildes en la inicial (árbol con A)', () => {
    expect(validWordsWithLetter('árbol arco', 'a')).toHaveLength(2);
  });
  it('no cuenta repetidas ni plurales de la misma raíz', () => {
    const r = validWordsWithLetter('perro perro perros', 'P');
    expect(r).toHaveLength(1);
  });
  it('lista vacía si nada matchea', () => {
    expect(validWordsWithLetter('casa sol', 'Z')).toEqual([]);
  });
});

describe('tabuViolations', () => {
  const objetivo = 'brújula';
  const prohibidas = ['norte', 'aguja', 'perderse'];

  it('no hay violación si describís sin decir las palabras', () => {
    expect(
      tabuViolations('es un instrumento que sirve para orientarse', objetivo, prohibidas),
    ).toEqual([]);
  });
  it('detecta la palabra objetivo', () => {
    expect(tabuViolations('bueno es una brújula', objetivo, prohibidas)).toContain('brújula');
  });
  it('detecta una palabra prohibida', () => {
    expect(tabuViolations('apunta siempre al norte', objetivo, prohibidas)).toContain('norte');
  });
  it('atrapa variantes por raíz (perderse → perdés)', () => {
    const hit = tabuViolations('sirve para no perderte', objetivo, prohibidas);
    expect(hit.length).toBeGreaterThan(0);
  });
});
