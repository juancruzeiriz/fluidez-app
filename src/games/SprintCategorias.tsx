import { useMemo, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, pick, useLevel, LevelBadge } from './common';
import { poolForLevel } from '../lib/level';
import { listMetrics } from '../lib/metrics';
import { tokenize, wordKey } from '../lib/normalize';
import type { Round, GameType } from '../types';
import categorias from '../seeds/categorias.json';

const DURATION = 60;
const GAME: GameType = 'categorias';

interface Props {
  onFinish: (round: Round) => void;
}

interface Cat {
  texto: string;
  nivel: number;
}

export function SprintCategorias({ onFinish }: Props) {
  const speech = useSpeech();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const level = useLevel(GAME);
  const cat = useMemo<Cat | null>(
    () => (level === null ? null : pick(poolForLevel(categorias as Cat[], level))),
    [level],
  );
  const startedAt = useMemo(() => ({ t: 0 }), []);

  const timer = useCountdown(() => finish());

  // Palabras únicas reconocidas hasta ahora (para los chips en vivo).
  const uniqueWords = useMemo(() => {
    const transcript = speech.events
      .filter((e) => e.isFinal)
      .map((e) => e.text)
      .join(' ');
    const seen = new Map<string, string>();
    for (const tok of tokenize(transcript)) {
      const k = wordKey(tok);
      if (!seen.has(k)) seen.set(k, tok);
    }
    return [...seen.values()];
  }, [speech.events]);

  function begin() {
    startedAt.t = performance.now();
    speech.start();
    timer.start(DURATION);
    setPhase('playing');
  }

  function finish() {
    if (!cat) return;
    const events = speech.stop();
    const duration = performance.now() - startedAt.t;
    const m = listMetrics(events, duration);
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: cat.texto,
      transcript: events
        .filter((e) => e.isFinal)
        .map((e) => e.text)
        .join(' '),
      metrics: { uniqueValid: m.uniqueValid, perMinute: m.perMinute, longestFluentRun: m.longestFluentRun },
      score: m.uniqueValid,
      subIndex: m.uniqueValid,
      durationMs: Math.round(duration),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setPhase('done');
    onFinish(round);
  }

  if (!speech.supported) return <MicWarning />;
  if (!cat || level === null) return null; // esperando el nivel desde la DB

  if (phase === 'intro') {
    return (
      <div className="card center">
        <p className="dim small">
          🗂 Sprint de Categorías · fluidez semántica <LevelBadge level={level} />
        </p>
        <p className="prompt">{cat.texto}</p>
        <p className="dim">Decí en voz alta todas las palabras que puedas en 60 segundos.</p>
        <button className="btn big block" onClick={begin}>
          Empezar
        </button>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="card">
        <p className="dim small center">di palabras de:</p>
        <p className="prompt">{cat.texto}</p>
        <Timer seconds={timer.seconds} />
        <p className="center streak">{uniqueWords.length} palabras</p>
        <div>
          {uniqueWords.map((w, i) => (
            <span key={w} className={`chip ${i === uniqueWords.length - 1 ? 'new' : ''}`}>
              {w}
            </span>
          ))}
        </div>
        {speech.interim && <p className="dim small">…{speech.interim}</p>}
        <button className="btn secondary block" style={{ marginTop: 14 }} onClick={finish}>
          Terminar antes
        </button>
      </div>
    );
  }

  return (
    <div className="card center">
      <p className="dim small">¡Listo!</p>
      <div className="grid-stats">
        <Stat value={uniqueWords.length} label="palabras únicas" />
      </div>
      <div className="row wrap" style={{ marginTop: 12 }}>
        {uniqueWords.map((w) => (
          <span key={w} className="chip">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
