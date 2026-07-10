import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { useCountdown } from './useCountdown';
import { Timer, MicWarning, Stat, pick } from './common';
import {
  speechMetrics,
  finalTranscript,
  charlaScore,
  type CharlaTurn,
} from '../lib/metrics';
import { baseline } from '../lib/fluency';
import { charlaFollowUp, type CharlaExchange } from '../ai/claude';
import { roundsOf } from '../db/repo';
import { useAppStore } from '../store';
import type { Round, GameType } from '../types';
import charla from '../seeds/charla.json';
import muletillas from '../seeds/muletillas.json';

const GAME: GameType = 'charla';
const TURNS = 3; // respuestas del usuario por charla
const TURN_SECONDS = 60;

interface Props {
  onFinish: (round: Round) => void;
}

/**
 * Charla: conversación con IA por voz. La repregunta imprevisible entrena la
 * recuperación léxica bajo presión interactiva — lo más cercano a una
 * conversación real que se puede practicar a solas. Requiere API key.
 */
export function Charla({ onFinish }: Props) {
  const speech = useSpeech();
  const settings = useAppStore((s) => s.settings);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'thinking' | 'done'>('intro');
  const [turn, setTurn] = useState(0);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Round | null>(null);
  const [base, setBase] = useState({ fillers: 0, wpm: 0 });

  const exchanges = useRef<CharlaExchange[]>([]);
  const turns = useRef<CharlaTurn[]>([]);
  const turnStartedAt = useRef(0);
  const firstWordAt = useRef<number | null>(null);
  const gameStartedAt = useMemo(() => ({ t: performance.now() }), []);

  const fillers = useMemo(
    () => [...muletillas.default, ...settings.customFillers],
    [settings.customFillers],
  );

  const seedQuestion = useMemo(() => pick(charla.iniciales), []);

  useEffect(() => {
    // Línea base personal (misma vara que Un Minuto Redondo).
    roundsOf(GAME).then((rounds) => {
      const f = rounds.map((r) => r.metrics.fillersPerMin ?? 0);
      const w = rounds.map((r) => r.metrics.wpm ?? 0);
      setBase({ fillers: baseline(f), wpm: baseline(w) });
    });
  }, []);

  const timer = useCountdown(() => endTurn());

  // Latencia de arranque: primer indicio de habla (interim o final) del turno.
  useEffect(() => {
    if (phase !== 'playing' || firstWordAt.current !== null) return;
    if (speech.interim.length > 0 || speech.events.length > 0) {
      firstWordAt.current = performance.now();
    }
  }, [phase, speech.interim, speech.events]);

  function startTurn(q: string) {
    setQuestion(q);
    firstWordAt.current = null;
    speech.reset();
    speech.start();
    turnStartedAt.current = performance.now();
    timer.start(TURN_SECONDS);
    setPhase('playing');
  }

  async function endTurn() {
    const events = speech.stop();
    timer.stop();
    const duration = performance.now() - turnStartedAt.current;
    const answer = finalTranscript(events);
    const latency =
      firstWordAt.current !== null ? Math.round(firstWordAt.current - turnStartedAt.current) : Math.round(duration);
    turns.current.push({
      metrics: speechMetrics(events, duration, fillers),
      startLatencyMs: latency,
    });
    exchanges.current.push({ question, answer: answer || '(sin respuesta)' });

    if (turn + 1 >= TURNS) {
      finishGame();
      return;
    }

    // Repregunta: IA con fallback local para que la charla nunca se corte.
    setPhase('thinking');
    let next: string;
    try {
      next = await charlaFollowUp(settings.apiKey, settings.model, exchanges.current);
    } catch {
      next = pick(charla.repreguntasDeEmergencia);
    }
    setTurn(turn + 1);
    startTurn(next);
  }

  function finishGame() {
    const ts = turns.current;
    const bFillers = base.fillers || avg(ts.map((t) => t.metrics.fillersPerMin));
    const bWpm = base.wpm || avg(ts.map((t) => t.metrics.wpm));
    const score = charlaScore(ts, bFillers, bWpm);
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: seedQuestion,
      transcript: exchanges.current.map((e) => `— ${e.question}\n${e.answer}`).join('\n'),
      metrics: {
        wpm: round1(avg(ts.map((t) => t.metrics.wpm))),
        fillers: ts.reduce((a, t) => a + t.metrics.fillers, 0),
        fillersPerMin: round1(avg(ts.map((t) => t.metrics.fillersPerMin))),
        longPauses: ts.reduce((a, t) => a + t.metrics.longPauses, 0),
        startLatencyMs: Math.round(avg(ts.map((t) => t.startLatencyMs))),
      },
      score,
      subIndex: score,
      durationMs: Math.round(performance.now() - gameStartedAt.t),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setResult(round);
    setPhase('done');
    onFinish(round);
  }

  if (!speech.supported) return <MicWarning />;

  if (!settings.apiKey) {
    return (
      <div className="card center">
        <p className="prompt">💬 Charla necesita tu API key</p>
        <p className="dim">
          Este juego conversa con vos usando la Claude API. Cargá tu key en Ajustes y volvé.
        </p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="card center">
        <p className="dim small">💬 Charla · conversación bajo presión real</p>
        <p>
          Te hago una pregunta, respondés hablando, y te repregunto algo{' '}
          <strong>imprevisible</strong> — como en una conversación de verdad. {TURNS} respuestas.
        </p>
        <p className="dim small">
          Se mide lo mismo que en Un Minuto Redondo, más cuánto tardás en arrancar cada respuesta.
        </p>
        <button className="btn big block" onClick={() => startTurn(seedQuestion)}>
          Empezar la charla
        </button>
      </div>
    );
  }

  if (phase === 'thinking') {
    return (
      <div className="card center">
        <p className="dim small">💬 Charla · turno {turn + 2}/{TURNS}</p>
        <p className="prompt dim">escuchándote… pensando la repregunta 🤔</p>
      </div>
    );
  }

  if (phase === 'done' && result) {
    return (
      <div className="card">
        <p className="dim small center">redondez de la charla</p>
        <div className="center">
          <span className="big-num">{result.score}</span>
          <span className="dim">/100</span>
        </div>
        <div className="grid-stats" style={{ marginTop: 12 }}>
          <Stat value={result.metrics.wpm ?? 0} label="palabras/min" />
          <Stat value={result.metrics.fillers ?? 0} label="muletillas" />
          <Stat
            value={`${((result.metrics.startLatencyMs ?? 0) / 1000).toFixed(1)}s`}
            label="arranque medio"
          />
        </div>
        <p className="dim small" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>
          {result.transcript}
        </p>
      </div>
    );
  }

  // playing
  return (
    <div className="card">
      <p className="dim small center">
        💬 Charla · respuesta {turn + 1}/{TURNS}
      </p>
      <p className="prompt">{question}</p>
      <Timer seconds={timer.seconds} />
      <p className="center dim">respondé hablando, con detalle</p>
      {speech.interim && <p className="dim small center">…{speech.interim}</p>}
      <button className="btn secondary block" style={{ marginTop: 14 }} onClick={() => void endTurn()}>
        Terminé mi respuesta
      </button>
    </div>
  );
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
