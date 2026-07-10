/**
 * Cálculo de métricas de fluidez del habla a partir del stream de eventos
 * del reconocimiento de voz. Todas las métricas se derivan del transcript +
 * timestamps; no se guarda audio.
 */
import { tokenize, wordKey } from './normalize';

export interface SpeechEvent {
  text: string;
  isFinal: boolean;
  t: number; // performance.now() en ms
}

/** Umbral de pausa larga en ms (bloqueo de acceso/planificación). */
export const LONG_PAUSE_MS = 2000;

export interface ListMetrics {
  uniqueValid: number; // palabras únicas (clave canónica)
  total: number; // palabras dichas
  perMinute: number; // únicas por minuto
  longestFluentRun: number; // mayor secuencia de palabras sin pausa larga
}

export interface SpeechMetrics {
  words: number;
  wpm: number;
  fillers: number;
  fillersPerMin: number;
  longPauses: number;
  longestFluentRun: number;
  durationMs: number;
}

/** Une los resultados finales de una tanda de eventos en un transcript. */
export function finalTranscript(events: SpeechEvent[]): string {
  return events
    .filter((e) => e.isFinal)
    .map((e) => e.text.trim())
    .filter(Boolean)
    .join(' ');
}

/** Gaps entre eventos consecutivos que superan el umbral de pausa. */
export function countLongPauses(events: SpeechEvent[], thresholdMs = LONG_PAUSE_MS): number {
  let count = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i]!.t - events[i - 1]!.t > thresholdMs) count++;
  }
  return count;
}

/**
 * Métricas para juegos de listas (Sprint de Categorías, Letra Prohibida).
 * Cuenta palabras únicas por clave canónica; ignora repeticiones.
 */
export function listMetrics(events: SpeechEvent[], durationMs: number): ListMetrics {
  const transcript = finalTranscript(events);
  const tokens = tokenize(transcript);
  const seen = new Set<string>();
  for (const tok of tokens) seen.add(wordKey(tok));
  const minutes = Math.max(durationMs / 60000, 1 / 60000);
  return {
    uniqueValid: seen.size,
    total: tokens.length,
    perMinute: round1(seen.size / minutes),
    longestFluentRun: longestFluentRun(events),
  };
}

/**
 * Mayor cantidad de palabras consecutivas dichas sin una pausa larga entre
 * eventos. Aproxima la "soltura sostenida".
 */
export function longestFluentRun(events: SpeechEvent[]): number {
  const finals = events.filter((e) => e.isFinal);
  if (finals.length === 0) return 0;
  let best = 0;
  let run = 0;
  for (let i = 0; i < finals.length; i++) {
    const words = tokenize(finals[i]!.text).length;
    if (i > 0 && finals[i]!.t - finals[i - 1]!.t > LONG_PAUSE_MS) {
      run = 0; // la pausa corta la racha
    }
    run += words;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Cuenta muletillas en el transcript. `fillers` es la lista configurable;
 * soporta muletillas de varias palabras ("o sea", "como que").
 */
export function countFillers(transcript: string, fillers: string[]): number {
  const norm = ' ' + tokenize(transcript).join(' ') + ' ';
  let count = 0;
  for (const filler of fillers) {
    const f = tokenize(filler).join(' ');
    if (f.length === 0) continue;
    const needle = ' ' + f + ' ';
    let idx = norm.indexOf(needle);
    while (idx !== -1) {
      count++;
      // avanzar sin consumir el espacio final compartido, para permitir solapamientos
      idx = norm.indexOf(needle, idx + f.length + 1);
    }
  }
  return count;
}

/**
 * Métricas para juegos de discurso libre (Un Minuto Redondo, Historias).
 */
export function speechMetrics(
  events: SpeechEvent[],
  durationMs: number,
  fillers: string[],
): SpeechMetrics {
  const transcript = finalTranscript(events);
  const words = tokenize(transcript).length;
  const minutes = Math.max(durationMs / 60000, 1 / 60000);
  const fillerCount = countFillers(transcript, fillers);
  return {
    words,
    wpm: round1(words / minutes),
    fillers: fillerCount,
    fillersPerMin: round1(fillerCount / minutes),
    longPauses: countLongPauses(events),
    longestFluentRun: longestFluentRun(events),
    durationMs,
  };
}

export interface RoundnessInput {
  metrics: SpeechMetrics;
  baselineFillersPerMin: number; // línea base personal
  baselineWpm: number; // línea base personal
}

/**
 * Score de "redondez" del minuto (0-100). Relativo a la línea base personal:
 * penaliza el EXCESO de muletillas sobre tu base y las pausas largas, y
 * bonifica un WPM dentro de una banda de ±20% de tu base.
 * Sin objetivos absolutos: la meta es mejorar contra vos mismo.
 */
export function roundnessScore(input: RoundnessInput): number {
  const { metrics, baselineFillersPerMin, baselineWpm } = input;
  let score = 100;

  // Penalización por exceso de muletillas respecto de la base (5 pts por muletilla/min extra)
  const excessFillers = Math.max(0, metrics.fillersPerMin - baselineFillersPerMin);
  score -= excessFillers * 5;

  // Penalización por pausas largas (4 pts cada una)
  score -= metrics.longPauses * 4;

  // Bonus/penalización de WPM: dentro de ±20% de la base = sin cambio;
  // demasiado lento resta más que demasiado rápido.
  if (baselineWpm > 0) {
    const ratio = metrics.wpm / baselineWpm;
    if (ratio < 0.8) score -= (0.8 - ratio) * 50;
    else if (ratio > 1.2) score -= (ratio - 1.2) * 20;
  }

  return clamp(Math.round(score), 0, 100);
}

// ---------- Charla (conversación con IA) ----------

export interface CharlaTurn {
  metrics: SpeechMetrics;
  /** ms desde que apareció la pregunta hasta la primera palabra reconocida */
  startLatencyMs: number;
}

/** A partir de este umbral la demora en arrancar la respuesta empieza a restar. */
export const CHARLA_LATENCY_GRACE_MS = 2500;

/**
 * Score 0-100 de una charla: redondez de cada turno (misma vara que Un Minuto
 * Redondo, relativa a la línea base personal) menos una penalización por
 * tardar en arrancar cada respuesta — el análogo conversacional del bloqueo.
 */
export function charlaScore(
  turns: CharlaTurn[],
  baselineFillersPerMin: number,
  baselineWpm: number,
): number {
  if (turns.length === 0) return 0;
  const scores = turns.map((t) => {
    let s = roundnessScore({
      metrics: t.metrics,
      baselineFillersPerMin,
      baselineWpm,
    });
    const extra = Math.max(0, t.startLatencyMs - CHARLA_LATENCY_GRACE_MS);
    s -= Math.min(20, Math.round(extra / 500)); // 1 pt por cada 500ms de demora, tope 20
    return clamp(s, 0, 100);
  });
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
