/**
 * Normalización de texto en español para comparar y contar palabras.
 * Reglas: minúsculas, sin tildes/diacríticos, sin puntuación, colapso de
 * plurales simples. Se usa tanto para contar palabras únicas como para
 * verificar aciertos en Palabra Precisa.
 */

/** Quita tildes y diacríticos (mantiene la ñ como 'n' para tolerancia del STT). */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza una palabra suelta: minúscula, sin acentos, sin signos. */
export function normalizeWord(word: string): string {
  return stripAccents(word.toLowerCase())
    .replace(/[^a-z0-9ñ]/g, '')
    .trim();
}

/**
 * Stemming ligero de plurales del español para colapsar "perro"/"perros".
 * No es morfología completa: cubre los casos frecuentes en juegos de listas.
 */
export function singularize(word: string): string {
  const w = word;
  if (w.length <= 3) return w;
  // "-ces" -> "-z" (luces -> luz, peces -> pez)
  if (w.endsWith('ces')) return w.slice(0, -3) + 'z';
  // "-es" tras consonante (arboles -> arbol, flores -> flor)
  if (w.endsWith('es') && w.length > 4 && !isVowel(w[w.length - 3]!)) {
    return w.slice(0, -2);
  }
  // "-s" tras vocal (perros -> perro, casas -> casa)
  if (w.endsWith('s') && isVowel(w[w.length - 2]!)) {
    return w.slice(0, -1);
  }
  return w;
}

function isVowel(ch: string): boolean {
  return 'aeiou'.includes(ch);
}

/** Clave canónica de una palabra: normalizada + singularizada. */
export function wordKey(word: string): string {
  return singularize(normalizeWord(word));
}

/** Tokeniza un texto en palabras normalizadas no vacías. */
export function tokenize(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 0);
}

/**
 * Distancia de Levenshtein entre dos strings (para match tolerante del STT).
 * Implementación O(n·m) con una sola fila de trabajo.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr: number[] = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1, // inserción
        prev[j]! + 1, // borrado
        prev[j - 1]! + cost, // sustitución
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/**
 * ¿El texto hablado coincide con la palabra objetivo?
 * Normaliza ambos y admite hasta `tolerance` ediciones (default 2) para
 * cubrir errores típicos del reconocimiento de voz (b/v, s/z/c, h muda).
 * Acepta que la palabra aparezca dentro de una frase más larga.
 */
export function matchesTarget(spoken: string, target: string, tolerance = 2): boolean {
  const t = normalizeWord(target);
  if (t.length === 0) return false;
  const tokens = tokenize(spoken).map(normalizeWord);
  return tokens.some((tok) => {
    if (tok === t) return true;
    // Palabras cortas exigen match exacto (evita falsos positivos sal/sol);
    // las largas toleran errores típicos del STT proporcionalmente al largo.
    const allowed = t.length <= 4 ? 0 : Math.min(tolerance, Math.floor(t.length / 4));
    return levenshtein(tok, t) <= allowed;
  });
}
