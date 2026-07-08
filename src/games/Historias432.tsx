import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, pick } from './common';
import { speechMetrics, roundnessScore, type SpeechMetrics } from '../lib/metrics';
import { baseline } from '../lib/fluency';
import { roundsOf } from '../db/repo';
import { useAppStore } from '../store';
import type { Round, GameType } from '../types';
import temas from '../seeds/temas.json';
import muletillas from '../seeds/muletillas.json';

const DURATIONS = [90, 60, 45]; // 4/3/2 comprimido
const GAME: GameType = 'historias';

interface Tema {
  texto: string;
  tipo: string;
}
interface Props {
  onFinish: (round: Round) => void;
}
interface Attempt {
  metrics: SpeechMetrics;
  roundness: number;
}

export function Historias432({ onFinish }: Props) {
  const speech = useSpeech();
  const settings = useAppStore((s) => s.settings);
  const [phase, setPhase] = useState<'intro' | 'ready' | 'playing' | 'between' | 'done'>('intro');
  const [attemptIdx, setAttemptIdx] = useState(0);
  const [base, setBase] = useState({ fillers: 0, wpm: 0 });
  const attempts = useRef<Attempt[]>([]);
  const tema = useMemo<Tema>(() => pick(temas as Tema[]), []);
  const startedAt = useMemo(() => ({ t: 0, session: performance.now() }), []);

  const fillers = useMemo(
    () => [...muletillas.default, ...settings.customFillers],
    [settings.customFillers],
  );

  useEffect(() => {
    roundsOf(GAME).then((rounds) => {
      roundsOf('minuto').then((min) => {
        const all = [...rounds, ...min];
        setBase({
          fillers: baseline(all.map((r) => r.metrics.fillersPerMin ?? 0)),
          wpm: baseline(all.map((r) => r.metrics.wpm ?? 0)),
        });
      });
    });
  }, []);

  const timer = useCountdown(() => endAttempt());

  function startAttempt() {
    startedAt.t = performance.now();
    speech.reset();
    speech.start();
    timer.start(DURATIONS[attemptIdx]!);
    setPhase('playing');
  }

  function endAttempt() {
    const events = speech.stop();
    const duration = performance.now() - startedAt.t;
    const m = speechMetrics(events, duration, fillers);
    const bFillers = base.fillers || m.fillersPerMin;
    const bWpm = base.wpm || m.wpm;
    const roundness = roundnessScore({ metrics: m, baselineFillersPerMin: bFillers, baselineWpm: bWpm });
    attempts.current.push({ metrics: m, roundness });

    if (attemptIdx + 1 < DURATIONS.length) {
      setPhase('between');
    } else {
      finishGame();
    }
  }

  function nextAttempt() {
    setAttemptIdx(attemptIdx + 1);
    setPhase('ready');
  }

  function finishGame() {
    const first = attempts.current[0]!;
    const last = attempts.current[attempts.current.length - 1]!;
    const delta = last.roundness - first.roundness;
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: tema.texto,
      transcript: '',
      metrics: {
        wpm: last.metrics.wpm,
        fillers: last.metrics.fillers,
        fillersPerMin: last.metrics.fillersPerMin,
        longPauses: last.metrics.longPauses,
        deltaRoundness: delta,
      },
      score: last.roundness,
      subIndex: last.roundness,
      durationMs: Math.round(performance.now() - startedAt.session),
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
        <p className="dim small">📖 Historias 4/3/2 · proceduralización</p>
        <p className="dim">Vas a contar la misma historia 3 veces, con menos tiempo cada vez:</p>
        <p className="prompt">{tema.texto}</p>
        <p className="small dim">90 s → 60 s → 45 s. Mismo contenido, más rápido y más denso.</p>
        <button className="btn big block" onClick={() => setPhase('ready')}>
          Entendido
        </button>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="card center">
        <p className="dim small">
          intento {attemptIdx + 1}/3 · {DURATIONS[attemptIdx]} segundos
        </p>
        <p className="prompt">{tema.texto}</p>
        <button className="btn big block" onClick={startAttempt}>
          Empezar intento {attemptIdx + 1}
        </button>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="card">
        <p className="dim small center">
          intento {attemptIdx + 1}/3 · contá la misma historia
        </p>
        <p className="prompt" style={{ fontSize: 20 }}>
          {tema.texto}
        </p>
        <Timer seconds={timer.seconds} />
        {speech.interim && <p className="dim small center">…{speech.interim}</p>}
        <button className="btn secondary block" style={{ marginTop: 12 }} onClick={endAttempt}>
          Terminar intento
        </button>
      </div>
    );
  }

  if (phase === 'between') {
    const a = attempts.current[attemptIdx]!;
    return (
      <div className="card center">
        <p className="dim small">intento {attemptIdx + 1} listo</p>
        <div className="grid-stats">
          <Stat value={a.metrics.wpm} label="palabras/min" />
          <Stat value={a.metrics.fillers} label="muletillas" />
          <Stat value={a.roundness} label="redondez" />
        </div>
        <button className="btn big block" style={{ marginTop: 12 }} onClick={nextAttempt}>
          Siguiente intento (más rápido)
        </button>
      </div>
    );
  }

  // done
  const first = attempts.current[0]!;
  const last = attempts.current[attempts.current.length - 1]!;
  const delta = last.roundness - first.roundness;
  return (
    <div className="card center">
      <p className="dim small">efecto 4/3/2 (intento 1 → 3)</p>
      <div className="grid-stats" style={{ marginTop: 8 }}>
        <Stat value={`${first.roundness}→${last.roundness}`} label="redondez" />
        <Stat value={`${first.metrics.wpm}→${last.metrics.wpm}`} label="WPM" />
        <Stat value={`${delta >= 0 ? '+' : ''}${delta}`} label="mejora" />
      </div>
      <p className="dim small" style={{ marginTop: 10 }}>
        {delta > 0
          ? 'Formulaste más fluido al repetir — eso es proceduralización en acción.'
          : 'Contala de nuevo otro día: el efecto aparece con la repetición.'}
      </p>
    </div>
  );
}
