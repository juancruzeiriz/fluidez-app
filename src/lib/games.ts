/**
 * Lógica pura específica de los juegos de la iteración 2:
 * - Letra Prohibida: validación de palabras por letra inicial (fluidez fonémica).
 * - Tabú Solitario: detección de violaciones (objetivo o palabras prohibidas).
 */
import { normalizeWord, wordKey, tokenize, stripAccents } from './normalize';

/**
 * Palabras únicas válidas dichas que empiezan con `letra` (fluidez fonémica).
 * Regla COWAT básica: cuenta claves canónicas únicas; ignora repetidas y
 * derivados que colapsan a la misma raíz (perro/perrito no se distinguen aquí,
 * pero perro/perros sí colapsan — suficiente para el MVP).
 */
export function validWordsWithLetter(transcript: string, letra: string): string[] {
  const target = stripAccents(letra.toLowerCase());
  const seen = new Map<string, string>();
  for (const tok of tokenize(transcript)) {
    const norm = normalizeWord(tok);
    if (!norm.startsWith(target)) continue;
    const key = wordKey(tok);
    if (!seen.has(key)) seen.set(key, tok);
  }
  return [...seen.values()];
}

/** Raíz aproximada para comparar violaciones de tabú (primeros caracteres). */
function root(word: string): string {
  const w = normalizeWord(word);
  // recorta sufijos flexivos comunes para atrapar variantes (norte→nort, correr→corr)
  return w.length > 5 ? w.slice(0, Math.max(4, w.length - 2)) : w;
}

/**
 * ¿El transcript viola la carta? Viola si dice la palabra objetivo o alguna
 * prohibida (comparando por raíz para atrapar variantes: "correr"/"corriendo").
 * Devuelve la lista de palabras violadas (vacía si no hay violación).
 */
export function tabuViolations(
  transcript: string,
  objetivo: string,
  prohibidas: string[],
): string[] {
  const spokenRoots = new Set(tokenize(transcript).map(root));
  const banned = [objetivo, ...prohibidas];
  const hit: string[] = [];
  for (const b of banned) {
    if (spokenRoots.has(root(b))) hit.push(b);
  }
  return hit;
}
