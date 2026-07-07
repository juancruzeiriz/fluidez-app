import Dexie, { type Table } from 'dexie';
import type { Round, LexicalItem, DailyStats, AppSettings } from '../types';

/**
 * Base de datos local (IndexedDB vía Dexie). Es la "base de datos" del
 * proyecto: acá vive todo el desempeño (rondas, métricas, SRS, stats) que
 * luego se exporta para el análisis por IA.
 */
export class FluidezDB extends Dexie {
  rounds!: Table<Round, number>;
  lexicalItems!: Table<LexicalItem, number>;
  dailyStats!: Table<DailyStats, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('fluidez');
    this.version(1).stores({
      rounds: '++id, &clientRoundId, gameType, playedAt, sessionDate',
      lexicalItems: '++id, &word, dueDate, source',
      dailyStats: 'date',
      settings: 'key',
    });
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'app',
  apiKey: '',
  model: 'claude-opus-4-8',
  customFillers: [],
  streak: 0,
  streakProtectors: 0,
  lastSessionDate: null,
  onboarded: false,
};

export const db = new FluidezDB();
