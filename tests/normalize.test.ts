import { describe, it, expect } from 'vitest';
import {
  normalizeWord,
  singularize,
  wordKey,
  tokenize,
  levenshtein,
  matchesTarget,
} from '../src/lib/normalize';

describe('normalizeWord', () => {
  it('quita mayúsculas, tildes y signos', () => {
    expect(normalizeWord('Árbol,')).toBe('arbol');
    expect(normalizeWord('  ¡Café! ')).toBe('cafe');
  });
});

describe('singularize', () => {
  it('colapsa plurales frecuentes', () => {
    expect(singularize('perros')).toBe('perro');
    expect(singularize('casas')).toBe('casa');
    expect(singularize('arboles')).toBe('arbol');
    expect(singularize('flores')).toBe('flor');
    expect(singularize('luces')).toBe('luz');
  });
  it('no toca palabras cortas ni singulares', () => {
    expect(singularize('sol')).toBe('sol');
    expect(singularize('mesa')).toBe('mesa');
  });
});

describe('wordKey', () => {
  it('colapsa singular/plural con y sin tilde a la misma clave', () => {
    expect(wordKey('Árboles')).toBe(wordKey('arbol'));
    expect(wordKey('Perros')).toBe(wordKey('perro'));
  });
});

describe('tokenize', () => {
  it('separa por no-alfanumérico y descarta vacíos', () => {
    expect(tokenize('hola, mundo  cruel!')).toEqual(['hola', 'mundo', 'cruel']);
    expect(tokenize('  ')).toEqual([]);
  });
});

describe('levenshtein', () => {
  it('calcula distancias conocidas', () => {
    expect(levenshtein('casa', 'casa')).toBe(0);
    expect(levenshtein('casa', 'caza')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('matchesTarget', () => {
  it('acepta coincidencia exacta normalizada', () => {
    expect(matchesTarget('paradójico', 'paradojico')).toBe(true);
  });
  it('tolera pequeños errores del STT en palabras largas', () => {
    expect(matchesTarget('meticuloso', 'meticoloso')).toBe(true); // 1 edición
  });
  it('encuentra la palabra dentro de una frase', () => {
    expect(matchesTarget('creo que es efímero', 'efimero')).toBe(true);
  });
  it('rechaza palabras distintas', () => {
    expect(matchesTarget('mesa', 'silla')).toBe(false);
  });
  it('es estricto con palabras cortas (tolerancia proporcional)', () => {
    expect(matchesTarget('sal', 'sol')).toBe(false);
  });
});
