/** Tipos de dominio compartidos por toda la app. */
import type { SrsState } from './lib/srs';

export type GameType = 'categorias' | 'letra' | 'tabu' | 'minuto' | 'historias' | 'precisa';

/** Métricas persistidas de una ronda (unión de listMetrics y speechMetrics). */
export interface RoundMetrics {
  // juegos de listas
  uniqueValid?: number;
  perMinute?: number;
  // juegos de discurso
  wpm?: number;
  fillers?: number;
  fillersPerMin?: number;
  longPauses?: number;
  longestFluentRun?: number;
  // Palabra Precisa
  correct?: number;
  attempted?: number;
  // Tabú Solitario
  cardsWon?: number;
  cardsPlayed?: number;
  // Historias 4/3/2: delta de redondez intento1 → intento3
  deltaRoundness?: number;
}

export interface Round {
  id?: number;
  clientRoundId: string; // idempotencia (UUID del cliente)
  gameType: GameType;
  contentId: string; // categoría/tema/tanda jugada
  transcript: string;
  metrics: RoundMetrics;
  score: number; // puntaje crudo del juego
  subIndex: number; // 0-100 normalizado contra línea base (para el IF)
  durationMs: number;
  playedAt: number; // epoch ms
  sessionDate: string; // YYYY-MM-DD (día de la sesión)
}

export interface ReviewLog {
  at: number;
  result: 'first' | 'retry' | 'fail';
}

export interface LexicalItem extends SrsState {
  id?: number;
  word: string;
  definition: string;
  contextGap: string;
  source: 'seed' | 'user';
  dueDate: string; // YYYY-MM-DD
  history: ReviewLog[];
}

export interface DailyStats {
  date: string; // YYYY-MM-DD (clave)
  fluencyIndex: number;
  subLexico: number | null;
  subSoltura: number | null;
  subExpresividad: number | null;
  subPrecision: number | null;
  sessionCompleted: boolean;
  xp: number;
  totReports: number; // "me trabé hoy en una conversación real"
}

export interface AppSettings {
  key: 'app';
  apiKey: string; // Claude API (solo en este dispositivo)
  model: string;
  customFillers: string[]; // muletillas extra del usuario
  streak: number;
  streakProtectors: number;
  lastSessionDate: string | null;
  onboarded: boolean;
  /** nivel de dificultad actual por juego (1-3; ausente = 1) */
  levels: Partial<Record<GameType, number>>;
}
