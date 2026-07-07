import { useEffect, useMemo, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, pick } from './common';
import { speechMetrics, roundnessScore, finalTranscript, LONG_PAUSE_MS } from '../lib/metrics';
import { baseline } from '../lib/fluency';
import { tokenize } from '../lib/normalize';
import { roundsOf } from '../db/repo';
import { useAppStore } from '../store';
import type { SpeechEvent } from '../lib/metrics';
import type { Round, GameType } from '../types';
import temas from '../seeds/temas.json';
import muletillas from '../seeds/muletillas.json';

const DURATION = 60;
const PREP = 5;
const GAME: GameType = 'minuto';

interface Props {
  onFinish: (round: Round) => void;
}
interface Tema {
  texto: string;
  tipo: string;
}

export function MinutoRedondo({ onFinish }: Props) {
  const speech = useSpeech();
  const settings = useAppStore((s) => s.settings);
  const [phase, setPhase] = useState<'intro' | 'prep' | 'playing' | 'done'>('intro');
  const [result, setResult] = useState<{ round: Round; events: SpeechEvent[] } | null>(null);
  const [base, setBase] = useState({ fillers: 0, wpm: 0 });
  const tema = useMemo<Tema>(() => pick(temas as Tema[]), []);
  const startedAt = useMemo(() => ({ t: 0 }), []);

  const fillers = useMemo(
    () => [...muletillas.default, ...settings.customFillers],
    [settings.customFillers],
  );

  useEffect(() => {
    // Línea base personal a partir de rondas previas de este juego.
    roundsOf(GAME).then((rounds) => {
      const f = rounds.map((r) => r.metrics.fillersPerMin ?? 0);
      const w = rounds.map((r) => r.metrics.wpm ?? 0);
      setBase({ fillers: baseline(f), wpm: baseline(w) });
    });
  }, []);

  const prepTimer = useCountdown(() => beginSpeaking());
  const timer = useCountdown(() => finish());

  function beginPrep() {
    setPhase('prep');
    prepTimer.start(PREP);
  }
  function beginSpeaking() {
    startedAt.t = performance.now();
    speech.start();
    timer.start(DURATION);
    setPhase('playing');
  }

  function finish() {
    const events = speech.stop();
    const duration = performance.now() - startedAt.t;
    const m = speechMetrics(events, duration, fillers);
    // Primera vez (sin base) => la ronda calibra: score 100 y define la base.
    const bFillers = base.fillers || m.fillersPerMin;
    const bWpm = base.wpm || m.wpm;
    const score = roundnessScore({ metrics: m, baselineFillersPerMin: bFillers, baselineWpm: bWpm });
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: tema.texto,
      transcript: finalTranscript(events),
      metrics: {
        wpm: m.wpm,
        fillers: m.fillers,
        fillersPerMin: m.fillersPerMin,
        longPauses: m.longPauses,
        longestFluentRun: m.longestFluentRun,
      },
      score,
      subIndex: score,
      durationMs: Math.round(duration),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setResult({ round, events });
    setPhase('done');
    onFinish(round);
  }

  if (!speech.supported) return <MicWarning />;

  if (phase === 'intro') {
    return (
      <div className="card center">
        <p className="dim small">⏱ Un Minuto Redondo · habla improvisada</p>
        <p className="prompt">{tema.texto}</p>
        <p className="dim">
          5 segundos para pensar y después hablás 60 segundos sin parar. Se miden muletillas,
          pausas y velocidad.
        </p>
        <button className="btn big block" onClick={beginPrep}>
          Estoy listo
        </button>
      </div>
    );
  }

  if (phase === 'prep') {
    return (
      <div className="card center">
        <p className="dim small">preparate…</p>
        <p className="prompt">{tema.texto}</p>
        <div className="big-num">{prepTimer.seconds}</div>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="card">
        <p className="prompt">{tema.texto}</p>
        <Timer seconds={timer.seconds} />
        <p className="center dim">hablá sin parar</p>
        {speech.interim && <p className="dim small center">…{speech.interim}</p>}
        <button className="btn secondary block" style={{ marginTop: 14 }} onClick={finish}>
          Terminar
        </button>
      </div>
    );
  }

  const r = result!.round;
  return (
    <div className="card">
      <p className="dim small center">redondez del minuto</p>
      <div className="center">
        <span className="big-num">{r.score}</span>
        <span className="dim">/100</span>
      </div>
      <div className="grid-stats" style={{ marginTop: 12 }}>
        <Stat value={r.metrics.wpm} label="palabras/min" />
        <Stat value={r.metrics.fillers ?? 0} label="muletillas" />
        <Stat value={r.metrics.longPauses ?? 0} label="pausas largas" />
      </div>
      <p className="dim small" style={{ marginTop: 14 }}>
        Tu minuto (muletillas resaltadas, pausas como ▓):
      </p>
      <AnnotatedTranscript events={result!.events} fillers={fillers} />
    </div>
  );
}

/** Reconstruye el discurso marcando muletillas y pausas largas. */
function AnnotatedTranscript({
  events,
  fillers,
}: {
  events: SpeechEvent[];
  fillers: string[];
}) {
  const fillerSet = new Set(fillers.map((f) => tokenize(f).join(' ')));
  const finals = events.filter((e) => e.isFinal);
  const nodes: React.ReactNode[] = [];

  finals.forEach((e, i) => {
    if (i > 0 && e.t - finals[i - 1]!.t > LONG_PAUSE_MS) {
      nodes.push(
        <span key={`p${i}`} className="pause">
          {' ▓▓ '}
        </span>,
      );
    }
    const words = e.text.split(/\s+/).filter(Boolean);
    words.forEach((w, j) => {
      const norm = tokenize(w).join(' ');
      const isFiller = fillerSet.has(norm);
      nodes.push(
        <span key={`w${i}-${j}`} className={isFiller ? 'filler' : undefined}>
          {w}{' '}
        </span>,
      );
    });
  });

  return <p style={{ lineHeight: 1.9 }}>{nodes.length ? nodes : <span className="dim">—</span>}</p>;
}
