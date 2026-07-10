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
  planDailySession,
  assignMission,
  resolveMission,
  pendingMission,
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
      mkRound({ gameType: 'tabu', metrics: { cardsWon: 3, cardsPlayed: 5 }, contentId: 'tabu' }),
    );
    await saveRound(
      mkRound({ gameType: 'precisa', metrics: { correct: 4, attempted: 5 }, contentId: 'batch' }),
    );
    const stats = await recomputeDailyStats(date);
    expect(stats.subLexico).not.toBeNull();
    expect(stats.subSoltura).toBe(80);
    expect(stats.subExpresividad).toBe(60);
    expect(stats.subPrecision).toBe(80);
    expect(stats.fluencyIndex).toBeGreaterThan(0);
  });

  it('léxico agrega Sprint y Letra Prohibida', async () => {
    const date = todayStr();
    await saveRound(mkRound({ gameType: 'letra', metrics: { perMinute: 8 }, contentId: 'M' }));
    const stats = await recomputeDailyStats(date);
    expect(stats.subLexico).not.toBeNull();
  });
});

describe('planDailySession', () => {
  it('devuelve 3 bloques y consolidación fija en precisa', async () => {
    const plan = await planDailySession();
    expect(plan).toHaveLength(3);
    expect(['categorias', 'letra']).toContain(plan[0]);
    expect(['minuto', 'tabu', 'historias']).toContain(plan[1]);
    expect(plan[2]).toBe('precisa');
  });

  it('sin API key la charla no entra en la rotación', async () => {
    const plan = await planDailySession();
    expect(plan).not.toContain('charla');
  });

  it('con API key la charla entra en la rotación del plato principal', async () => {
    const { saveSettings } = await import('../src/db/repo');
    await saveSettings({ apiKey: 'sk-test' });
    // Con todo sin jugar, leastRecent elige el primero del pool; jugamos los
    // otros tres para que charla sea el menos reciente.
    for (const g of ['minuto', 'tabu', 'historias'] as const) {
      await saveRound(mkRound({ gameType: g, contentId: g }));
    }
    const plan = await planDailySession();
    expect(plan[1]).toBe('charla');
  });
});

describe('charla en las stats diarias', () => {
  it('aporta al subíndice de soltura', async () => {
    await saveRound(mkRound({ gameType: 'charla', score: 90, metrics: {}, contentId: 'q' }));
    const stats = await recomputeDailyStats(todayStr());
    expect(stats.subSoltura).toBe(90);
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

describe('captura de palabra al trabarse', () => {
  it('la palabra capturada queda vencida hoy y entra a la tanda', async () => {
    await addUserWord('inefable', 'que no se puede describir', `me trabé ${todayStr()}`);
    const item = await db.lexicalItems.where('word').equals('inefable').first();
    expect(item!.dueDate).toBe(todayStr());
    const batch = await precisaBatch(5, 3);
    expect(batch.some((i) => i.word === 'inefable')).toBe(true);
  });

  it('capturar dos veces la misma palabra no duplica', async () => {
    await addUserWord('sagaz', 'astuto', 'me trabé');
    await addUserWord('sagaz', 'astuto', 'me trabé otra vez');
    const items = await db.lexicalItems.where('word').equals('sagaz').toArray();
    expect(items).toHaveLength(1);
  });
});

describe('misión de transferencia', () => {
  it('sin palabras repasadas no asigna misión', async () => {
    await addUserWord('nuevo', 'def', 'gap'); // sin history todavía
    expect(await assignMission(todayStr())).toBeNull();
  });

  it('prioriza la palabra acertada hoy con mayor intervalo y es idempotente', async () => {
    await addUserWord('alfa', 'def', 'gap');
    await addUserWord('beta', 'def', 'gap');
    const alfa = await db.lexicalItems.where('word').equals('alfa').first();
    const beta = await db.lexicalItems.where('word').equals('beta').first();
    await reviewItem(alfa!.id!, 'first'); // interval 1
    await reviewItem(beta!.id!, 'first');
    await reviewItem(beta!.id!, 'first'); // interval mayor
    const word = await assignMission(todayStr());
    expect(word).toBe('beta');
    expect(await assignMission(todayStr())).toBe('beta'); // no cambia en el día
  });

  it('recomputeDailyStats preserva la misión', async () => {
    await addUserWord('gamma', 'def', 'gap');
    const g = await db.lexicalItems.where('word').equals('gamma').first();
    await reviewItem(g!.id!, 'first');
    await assignMission(todayStr());
    await saveRound(mkRound({})); // dispara recompute
    const s = await db.dailyStats.get(todayStr());
    expect(s!.missionWord).toBe('gamma');
    expect(s!.missionResult ?? null).toBeNull();
  });

  it('pendingMission encuentra la de ayer y resolveMission la cierra', async () => {
    const ayer = '2026-01-01';
    await db.dailyStats.put({
      date: ayer,
      fluencyIndex: 0,
      subLexico: null,
      subSoltura: null,
      subExpresividad: null,
      subPrecision: null,
      sessionCompleted: true,
      xp: 0,
      totReports: 0,
      missionWord: 'delta',
      missionResult: null,
    });
    const pending = await pendingMission(todayStr());
    expect(pending).toEqual({ date: ayer, word: 'delta' });
    await resolveMission(ayer, true);
    expect(await pendingMission(todayStr())).toBeNull();
    const s = await db.dailyStats.get(ayer);
    expect(s!.missionResult).toBe('used');
  });

  it('completeSession asigna misión si hay palabras repasadas', async () => {
    await addUserWord('épsilon', 'def', 'gap');
    const e = await db.lexicalItems.where('word').equals('épsilon').first();
    await reviewItem(e!.id!, 'first');
    await completeSession(todayStr());
    const s = await db.dailyStats.get(todayStr());
    expect(s!.missionWord).toBe('épsilon');
  });
});
