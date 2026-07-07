import { describe, it, expect } from 'vitest';
import {
  type SpeechEvent,
  finalTranscript,
  countLongPauses,
  listMetrics,
  longestFluentRun,
  countFillers,
  speechMetrics,
  roundnessScore,
} from '../src/lib/metrics';

const ev = (text: string, t: number, isFinal = true): SpeechEvent => ({ text, t, isFinal });

describe('finalTranscript', () => {
  it('une solo los resultados finales', () => {
    const events = [ev('hola', 0), ev('mun', 100, false), ev('mundo', 200)];
    expect(finalTranscript(events)).toBe('hola mundo');
  });
});

describe('countLongPauses', () => {
  it('cuenta gaps mayores a 2s', () => {
    const events = [ev('a', 0), ev('b', 1000), ev('c', 4000), ev('d', 4500)];
    expect(countLongPauses(events)).toBe(1); // solo 1000->4000
  });
});

describe('listMetrics', () => {
  it('cuenta palabras únicas por clave canónica e ignora repetidas', () => {
    const events = [ev('perro gato', 0), ev('perros pájaro', 1000)];
    const m = listMetrics(events, 60000);
    // perro(=perros), gato, pajaro => 3 únicas
    expect(m.uniqueValid).toBe(3);
    expect(m.total).toBe(4);
    expect(m.perMinute).toBe(3);
  });
});

describe('longestFluentRun', () => {
  it('corta la racha en pausas largas', () => {
    const events = [ev('uno dos tres', 0), ev('cuatro', 500), ev('cinco', 5000)];
    // primeros 4 tokens seguidos (0 y 500 sin pausa), pausa >2s antes de cinco
    expect(longestFluentRun(events)).toBe(4);
  });
});

describe('countFillers', () => {
  const fillers = ['este', 'o sea', 'nada', 'tipo'];
  it('cuenta muletillas de una y varias palabras', () => {
    const t = 'este bueno o sea no sé nada tipo eso';
    expect(countFillers(t, fillers)).toBe(4); // este, o sea, nada, tipo
  });
  it('no cuenta subcadenas dentro de otras palabras', () => {
    expect(countFillers('la nadadora nadaba', fillers)).toBe(0);
  });
});

describe('speechMetrics', () => {
  it('calcula wpm, muletillas y pausas', () => {
    const events = [ev('bueno este es un tema', 0), ev('interesante o sea', 3000)];
    const m = speechMetrics(events, 60000, ['este', 'o sea']);
    expect(m.words).toBe(8);
    expect(m.wpm).toBe(8);
    expect(m.fillers).toBe(2);
    expect(m.longPauses).toBe(1);
  });
});

describe('roundnessScore', () => {
  it('da 100 cuando está en o mejor que la línea base', () => {
    const metrics = speechMetrics([ev('a b c d e f g h i j', 0)], 60000, []);
    const score = roundnessScore({
      metrics,
      baselineFillersPerMin: 5,
      baselineWpm: 10,
    });
    expect(score).toBe(100);
  });
  it('penaliza exceso de muletillas y pausas', () => {
    const events = [ev('este o sea tipo bueno', 0), ev('nada', 5000), ev('final', 9000)];
    const metrics = speechMetrics(events, 60000, ['este', 'o sea', 'tipo', 'nada']);
    const score = roundnessScore({
      metrics,
      baselineFillersPerMin: 0,
      baselineWpm: metrics.wpm,
    });
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
