import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, useLevel, LevelBadge } from './common';
import { finalTranscript } from '../lib/metrics';
import { tabuViolations } from '../lib/games';
import { poolForLevel } from '../lib/level';
import { judgeTabuDescription, type TabuJudgeResult } from '../ai/claude';
import { getSettings } from '../db/repo';
import type { Round, GameType, AppSettings } from '../types';
import tabu from '../seeds/tabu.json';

/** A mayor nivel, menos tiempo por carta (mayor presión de recuperación). */
const DURATION_BY_LEVEL: Record<number, number> = { 1: 45, 2: 40, 3: 35 };
const CARDS = 5;
const GAME: GameType = 'tabu';

type JudgeState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'done'; result: TabuJudgeResult }
  | { status: 'error' };

interface Card {
  objetivo: string;
  prohibidas: string[];
  nivel: number;
}
interface Props {
  onFinish: (round: Round) => void;
}

const SFA_SLOTS = [
  '¿Qué es? (categoría)',
  '¿Para qué sirve?',
  '¿Cómo es?',
  '¿Dónde se encuentra?',
  '¿Con qué se asocia?',
];

export function TabuSolitario({ onFinish }: Props) {
  const speech = useSpeech();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'eval' | 'done'>('intro');
  const [idx, setIdx] = useState(0);
  const [violated, setViolated] = useState<string[]>([]);
  const [judge, setJudge] = useState<JudgeState>({ status: 'off' });
  const results = useRef<boolean[]>([]);
  const transcriptRef = useRef(''); // descripción dicha en la carta actual
  const allTranscripts = useRef<string[]>([]);
  const settingsRef = useRef<AppSettings | null>(null);
  const startedAt = useMemo(() => ({ t: performance.now() }), []);
  const level = useLevel(GAME);
  const duration = DURATION_BY_LEVEL[level ?? 1] ?? 45;

  useEffect(() => {
    getSettings().then((s) => {
      settingsRef.current = s;
    });
  }, []);

  const deck = useMemo<Card[]>(() => {
    if (level === null) return [];
    const shuffled = [...poolForLevel(tabu as Card[], level)].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, CARDS);
  }, [level]);
  const card = deck[idx];

  const timer = useCountdown(() => setPhase('eval'));

  // Mic por carta mientras se juega.
  useEffect(() => {
    if (phase !== 'playing' || !card || !speech.supported) return;
    transcriptRef.current = '';
    speech.reset();
    speech.start();
    timer.start(duration);
    return () => {
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  // Detección de violación en vivo (y captura del transcript de la carta).
  useEffect(() => {
    if (phase !== 'playing' || !card) return;
    const transcript = finalTranscript(speech.events) + ' ' + speech.interim;
    transcriptRef.current = transcript.trim();
    const hits = tabuViolations(transcript, card.objetivo, card.prohibidas);
    if (hits.length > 0) {
      setViolated(hits);
      speech.stop();
      timer.stop();
      recordAndNext(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.events, speech.interim]);

  // Juez con IA (opcional): al entrar a la evaluación, si hay API key,
  // intenta adivinar la palabra a partir de la descripción — como un amigo.
  useEffect(() => {
    if (phase !== 'eval' || !card) return;
    const s = settingsRef.current;
    const descripcion = transcriptRef.current;
    if (!s?.apiKey || descripcion.length < 10) {
      setJudge({ status: 'off' });
      return;
    }
    let alive = true;
    setJudge({ status: 'loading' });
    judgeTabuDescription(s.apiKey, s.model, card.objetivo, descripcion)
      .then((result) => {
        if (alive) setJudge({ status: 'done', result });
      })
      .catch(() => {
        if (alive) setJudge({ status: 'error' });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function recordAndNext(won: boolean) {
    results.current.push(won);
    allTranscripts.current.push(transcriptRef.current);
    setJudge({ status: 'off' });
    if (idx + 1 < deck.length) {
      setTimeout(() => {
        setViolated([]);
        setIdx(idx + 1);
        setPhase('playing');
      }, won ? 0 : 1100);
    } else {
      setTimeout(() => finishGame(), won ? 0 : 1100);
    }
  }

  function finishGame() {
    const won = results.current.filter(Boolean).length;
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: 'mazo',
      transcript: allTranscripts.current.join(' | '),
      metrics: { cardsWon: won, cardsPlayed: results.current.length },
      score: won,
      subIndex: results.current.length ? Math.round((won / results.current.length) * 100) : 0,
      durationMs: Math.round(performance.now() - startedAt.t),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setPhase('done');
    onFinish(round);
  }

  if (!speech.supported) return <MicWarning />;
  if (level === null) return null; // esperando el nivel desde la DB

  if (phase === 'intro') {
    return (
      <div className="card center">
        <p className="dim small">
          🚫 Tabú Solitario · circunlocución (SFA) <LevelBadge level={level} />
        </p>
        <p>
          Describí la palabra objetivo en voz alta <strong>sin decirla</strong> ni usar las 3
          palabras prohibidas. {duration} s por carta, {CARDS} cartas.
        </p>
        <p className="dim small">
          Es la estrategia exacta para cuando una palabra no te sale: hablar alrededor de ella.
        </p>
        <button className="btn big block" onClick={() => setPhase('playing')}>
          Empezar
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const won = results.current.filter(Boolean).length;
    return (
      <div className="card center">
        <p className="dim small">¡Mazo completo!</p>
        <div className="grid-stats" style={{ marginTop: 10 }}>
          <Stat value={`${won}/${results.current.length}`} label="cartas superadas" />
        </div>
      </div>
    );
  }

  if (!card) return null;

  if (phase === 'eval') {
    return (
      <div className="card center">
        <p className="dim small">¿un amigo habría adivinado</p>
        <p className="prompt" style={{ color: 'var(--accent)' }}>
          {card.objetivo}
        </p>
        <p className="dim small">con tu descripción?</p>
        {judge.status === 'loading' && <p className="dim small">🤖 la IA está adivinando…</p>}
        {judge.status === 'done' && (
          <p className="small">
            🤖 la IA adivinó: <strong>«{judge.result.guess || '—'}»</strong>{' '}
            {judge.result.understood ? (
              <span className="pill">✓ te entendió</span>
            ) : (
              <span className="pill bad">✗ no acertó</span>
            )}
          </p>
        )}
        {judge.status === 'error' && (
          <p className="dim small">🤖 no se pudo consultar a la IA (juzgá vos)</p>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn block" onClick={() => recordAndNext(true)}>
            Sí 👍
          </button>
          <button className="btn secondary block" onClick={() => recordAndNext(false)}>
            No 👎
          </button>
        </div>
      </div>
    );
  }

  // playing
  return (
    <div className="card">
      <p className="dim small center">
        🚫 Tabú · carta {idx + 1}/{deck.length}
      </p>
      <p className="prompt" style={{ color: 'var(--accent)' }}>
        {card.objetivo}
      </p>
      <p className="center small">
        prohibidas:{' '}
        {card.prohibidas.map((p) => (
          <span key={p} className="pill bad" style={{ display: 'inline-block', margin: '0 3px' }}>
            {p}
          </span>
        ))}
      </p>
      <Timer seconds={timer.seconds} />
      {violated.length > 0 ? (
        <p className="center pill bad" style={{ display: 'inline-block' }}>
          ¡Dijiste "{violated[0]}"! Carta perdida.
        </p>
      ) : (
        <details style={{ marginTop: 8 }}>
          <summary className="dim small">guía SFA (si te trabás)</summary>
          <ul className="small dim">
            {SFA_SLOTS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      )}
      {speech.interim && <p className="dim small center">…{speech.interim}</p>}
      <button className="btn secondary block" style={{ marginTop: 12 }} onClick={() => setPhase('eval')}>
        La describí
      </button>
    </div>
  );
}
