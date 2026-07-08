import { useMemo, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, pick } from './common';
import { finalTranscript, longestFluentRun } from '../lib/metrics';
import { validWordsWithLetter } from '../lib/games';
import type { Round, GameType } from '../types';
import letras from '../seeds/letras.json';

const DURATION = 60;
const GAME: GameType = 'letra';

interface Props {
  onFinish: (round: Round) => void;
}
interface Letra {
  letra: string;
  nivel: number;
}

export function LetraProhibida({ onFinish }: Props) {
  const speech = useSpeech();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const item = useMemo<Letra>(() => pick(letras as Letra[]), []);
  const startedAt = useMemo(() => ({ t: 0 }), []);
  const timer = useCountdown(() => finish());

  const words = useMemo(
    () => validWordsWithLetter(finalTranscript(speech.events) + ' ' + speech.interim, item.letra),
    [speech.events, speech.interim, item.letra],
  );

  function begin() {
    startedAt.t = performance.now();
    speech.start();
    timer.start(DURATION);
    setPhase('playing');
  }

  function finish() {
    const events = speech.stop();
    const duration = performance.now() - startedAt.t;
    const valid = validWordsWithLetter(finalTranscript(events), item.letra);
    const minutes = Math.max(duration / 60000, 1 / 60000);
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: item.letra,
      transcript: finalTranscript(events),
      metrics: {
        uniqueValid: valid.length,
        perMinute: Math.round((valid.length / minutes) * 10) / 10,
        longestFluentRun: longestFluentRun(events),
      },
      score: valid.length,
      subIndex: valid.length,
      durationMs: Math.round(duration),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setPhase('done');
    onFinish(round);
  }

  if (!speech.supported) return <MicWarning />;

  if (phase === 'intro') {
    return (
      <div className="card center">
        <p className="dim small">🔤 Letra Prohibida · fluidez fonémica</p>
        <p className="dim">Decí en voz alta todas las palabras que empiecen con:</p>
        <p className="big-num" style={{ fontSize: 72 }}>
          {item.letra}
        </p>
        <p className="small dim">60 segundos. No valen nombres propios.</p>
        <button className="btn big block" onClick={begin}>
          Empezar
        </button>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="card">
        <p className="dim small center">palabras con</p>
        <p className="prompt" style={{ fontSize: 40 }}>
          {item.letra}
        </p>
        <Timer seconds={timer.seconds} />
        <p className="center streak">{words.length} palabras</p>
        <div>
          {words.map((w, i) => (
            <span key={w} className={`chip ${i === words.length - 1 ? 'new' : ''}`}>
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
        <Stat value={words.length} label={`palabras con ${item.letra}`} />
      </div>
      <div className="row wrap" style={{ marginTop: 12 }}>
        {words.map((w) => (
          <span key={w} className="chip">
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
