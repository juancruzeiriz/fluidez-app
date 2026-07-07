import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/schema';
import {
  saveRound,
  recomputeDailyStats,
  completeSession,
  addUserWord,
  precisaBatch,
  reviewItem,
  reportTot,
  todayStr,
} from '../src/db/repo';
import type { Round } from '../src/types';

const mkRound = (over: Partial<Round>): Round => ({
  clientRoundId: crypto.randomUUID(),
  gameType: 'categorias',
  contentId: 'animales',
  transcript: 'perro gato',
  metrics: { uniqueValid: 2, perMinute: 2 },
  score: 2,
  subIndex: 50,
  durationMs: 60000,
  playedAt: Date.now(),
  sessionDate: todayStr(),
  ...over,
});

beforeEach(async () => {
  await db.rounds.clear();
  await db.lexicalItems.clear();
  await db.dailyStats.clear();
  await db.settings.clear();
});

describe('saveRound idempotencia', () => {
  it('no duplica la misma ronda', async () => {
    const r = mkRound({ clientRoundId: 'fixed-id' });
    await saveRound(r);
    await saveRound(r);
    expect(await db.rounds.count()).toBe(1);
  });
});

describe('recomputeDailyStats', () => {
  it('combina subíndices de los tres juegos', async () => {
    const date = todayStr();
    await saveRound(mkRound({ gameType: 'categorias', metrics: { perMinute: 10 } }));
    await saveRound(
      mkRound({ gameType: 'minuto', score: 80, metrics: {}, contentId: 'tema1' }),
    );
    await saveRound(
      mkRound({ gameType: 'precisa', metrics: { correct: 4, attempted: 5 }, contentId: 'batch' }),
    );
    const stats = await recomputeDailyStats(date);
    expect(stats.subLexico).not.toBeNull();
    expect(stats.subSoltura).toBe(80);
    expect(stats.subPrecision).toBe(80);
    expect(stats.fluencyIndex).toBeGreaterThan(0);
  });
});

describe('completeSession rachas', () => {
  it('primera sesión inicia racha en 1', async () => {
    const s = await completeSession('2026-01-01');
    expect(s.streak).toBe(1);
  });
  it('días consecutivos suman', async () => {
    await completeSession('2026-01-01');
    const s = await completeSession('2026-01-02');
    expect(s.streak).toBe(2);
  });
  it('hueco grande reinicia', async () => {
    await completeSession('2026-01-01');
    const s = await completeSession('2026-01-10');
    expect(s.streak).toBe(1);
  });
  it('es idempotente el mismo día', async () => {
    await completeSession('2026-01-01');
    const s = await completeSession('2026-01-01');
    expect(s.streak).toBe(1);
  });
});

describe('SRS y palabras del usuario', () => {
  it('agrega palabra propia y aparece en la tanda', async () => {
    await addUserWord('picaporte', 'manija de una puerta', 'giré el ______');
    const batch = await precisaBatch(5, 3);
    expect(batch.some((i) => i.word === 'picaporte')).toBe(true);
  });
  it('un acierto espacia la palabra al futuro', async () => {
    await addUserWord('brujula', 'instrumento que marca el norte', 'usé la ______');
    const item = await db.lexicalItems.where('word').equals('brujula').first();
    await reviewItem(item!.id!, 'first');
    const updated = await db.lexicalItems.get(item!.id!);
    expect(updated!.repetitions).toBe(1);
    expect(updated!.dueDate > todayStr()).toBe(true);
  });
});

describe('reportTot', () => {
  it('incrementa el contador del día', async () => {
    const date = todayStr();
    await reportTot(date);
    await reportTot(date);
    const s = await db.dailyStats.get(date);
    expect(s!.totReports).toBe(2);
  });
});
