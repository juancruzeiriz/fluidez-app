import { describe, it, expect } from 'vitest';
import {
  mergeRounds,
  roundsToPush,
  lexicalVersion,
  mergeLexicalItems,
  stripLocalOnly,
  mergeSettings,
} from '../src/sync/merge';
import type { Round, LexicalItem, AppSettings } from '../src/types';

function round(id: string, playedAt: number): Round {
  return {
    clientRoundId: id,
    gameType: 'categorias',
    contentId: 'animales',
    transcript: '',
    metrics: {},
    score: 0,
    subIndex: 0,
    durationMs: 1000,
    playedAt,
    sessionDate: '2026-07-09',
  };
}

function item(word: string, historyAt: number[], repetitions = historyAt.length): LexicalItem {
  return {
    word,
    definition: 'def',
    contextGap: '',
    source: 'seed',
    dueDate: '2026-07-09',
    easiness: 2.5,
    intervalDays: 1,
    repetitions,
    history: historyAt.map((at) => ({ at, result: 'first' as const })),
  };
}

const baseSettings: AppSettings = {
  key: 'app',
  apiKey: 'sk-local-secret',
  model: 'claude-opus-4-8',
  customFillers: [],
  streak: 3,
  streakProtectors: 0,
  lastSessionDate: '2026-07-08',
  onboarded: true,
  levels: { categorias: 2 },
};

describe('mergeRounds', () => {
  it('une sin duplicar por clientRoundId', () => {
    const local = [round('a', 100), round('b', 200)];
    const remote = [round('b', 200), round('c', 300)];
    const merged = mergeRounds(local, remote);
    expect(merged.map((r) => r.clientRoundId)).toEqual(['a', 'b', 'c']);
  });

  it('ordena cronológicamente por playedAt', () => {
    const merged = mergeRounds([round('c', 300)], [round('a', 100), round('b', 200)]);
    expect(merged.map((r) => r.playedAt)).toEqual([100, 200, 300]);
  });

  it('no pierde rondas exclusivas de cada lado', () => {
    const merged = mergeRounds([round('a', 1)], [round('b', 2)]);
    expect(merged).toHaveLength(2);
  });
});

describe('roundsToPush', () => {
  it('devuelve solo las locales ausentes en el servidor', () => {
    const local = [round('a', 1), round('b', 2), round('c', 3)];
    const remoteIds = new Set(['b']);
    expect(roundsToPush(local, remoteIds).map((r) => r.clientRoundId)).toEqual(['a', 'c']);
  });

  it('vacío si el servidor ya tiene todo', () => {
    const local = [round('a', 1)];
    expect(roundsToPush(local, new Set(['a']))).toHaveLength(0);
  });
});

describe('lexicalVersion', () => {
  it('es 0 sin historial', () => {
    expect(lexicalVersion(item('perro', []))).toBe(0);
  });
  it('toma el timestamp de repaso más reciente', () => {
    expect(lexicalVersion(item('perro', [100, 500, 300]))).toBe(500);
  });
});

describe('mergeLexicalItems', () => {
  it('gana el de repaso más reciente', () => {
    const local = [item('perro', [100])];
    const remote = [item('perro', [500])];
    const merged = mergeLexicalItems(local, remote);
    expect(merged).toHaveLength(1);
    expect(lexicalVersion(merged[0]!)).toBe(500);
  });

  it('ante empate de versión gana el de más repeticiones', () => {
    const a = item('gato', [200], 1);
    const b = item('gato', [200], 4);
    const merged = mergeLexicalItems([a], [b]);
    expect(merged[0]!.repetitions).toBe(4);
  });

  it('conserva ítems distintos de ambos lados', () => {
    const merged = mergeLexicalItems([item('perro', [1])], [item('gato', [1])]);
    expect(merged.map((i) => i.word).sort()).toEqual(['gato', 'perro']);
  });
});

describe('stripLocalOnly', () => {
  it('quita la apiKey', () => {
    const s = stripLocalOnly(baseSettings);
    expect('apiKey' in s).toBe(false);
    expect(s.streak).toBe(3);
  });
});

describe('mergeSettings', () => {
  it('conserva los locales si son iguales o más nuevos', () => {
    const merged = mergeSettings(baseSettings, stripLocalOnly({ ...baseSettings, streak: 9 }), 100, 100);
    expect(merged.streak).toBe(3); // local gana ante empate
  });

  it('adopta el remoto más nuevo pero preserva la apiKey local', () => {
    const remote = stripLocalOnly({ ...baseSettings, streak: 9, apiKey: 'sk-otro' });
    const merged = mergeSettings(baseSettings, remote, 500, 100);
    expect(merged.streak).toBe(9);
    expect(merged.apiKey).toBe('sk-local-secret'); // nunca viene del remoto
  });

  it('sin remoto devuelve los locales', () => {
    expect(mergeSettings(baseSettings, null, 0, 0)).toEqual(baseSettings);
  });
});
