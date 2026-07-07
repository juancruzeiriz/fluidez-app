import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../speech/useSpeech';
import { Stat } from './common';
import { matchesTarget } from '../lib/normalize';
import { finalTranscript } from '../lib/metrics';
import { precisaBatch, reviewItem } from '../db/repo';
import type { LexicalItem, Round, GameType } from '../types';

const GAME: GameType = 'precisa';
type CardState = 'listening' | 'revealed';
type Outcome = 'first' | 'retry' | 'fail';

interface Props {
  onFinish: (round: Round) => void;
}

export function PalabraPrecisa({ onFinish }: Props) {
  const speech = useSpeech();
  const [cards, setCards] = useState<LexicalItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<CardState>('listening');
  const [attempts, setAttempts] = useState(0);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState('');
  const startedAt = useMemo(() => ({ t: performance.now() }), []);
  const results = useRef<Outcome[]>([]);

  useEffect(() => {
    precisaBatch(5, 3).then((b) => setCards(b));
  }, []);

  const card = cards?.[idx];

  // (Re)inicia el micrófono al entrar en una tarjeta o tras revelar.
  useEffect(() => {
    if (!card || !speech.supported) return;
    speech.reset();
    speech.start();
    return () => {
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, state, card?.word]);

  // Detecta la palabra dicha.
  useEffect(() => {
    if (!card) return;
    const transcript = finalTranscript(speech.events) + ' ' + speech.interim;
    if (!matchesTarget(transcript, card.word)) return;
    if (state === 'listening') {
      resolve(attempts === 0 ? 'first' : 'retry');
    } else {
      // corrección de error completada: la dijo en voz alta
      resolve('fail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.events, speech.interim]);

  function resolve(outcome: Outcome) {
    if (!card) return;
    speech.stop();
    results.current.push(outcome);
    void reviewItem(card.id!, outcome);
    next();
  }

  function next() {
    setAttempts(0);
    setTyped('');
    setFeedback('');
    setState('listening');
    if (cards && idx + 1 < cards.length) {
      setIdx(idx + 1);
    } else {
      finishGame();
    }
  }

  function finishGame() {
    const outcomes = results.current;
    const correct = outcomes.filter((o) => o !== 'fail').length;
    const round: Round = {
      clientRoundId: crypto.randomUUID(),
      gameType: GAME,
      contentId: 'batch',
      transcript: '',
      metrics: { correct, attempted: outcomes.length },
      score: correct,
      subIndex: outcomes.length ? Math.round((correct / outcomes.length) * 100) : 0,
      durationMs: Math.round(performance.now() - startedAt.t),
      playedAt: Date.now(),
      sessionDate: new Date().toISOString().slice(0, 10),
    };
    setCards([]); // marca fin
    onFinish(round);
  }

  function hintOrReveal() {
    if (!card) return;
    if (attempts === 0) {
      setAttempts(1);
      setFeedback(`Pista: empieza con "${card.word.slice(0, 2)}…"`);
    } else {
      reveal();
    }
  }

  function reveal() {
    setState('revealed');
    setFeedback('');
  }

  function submitTyped() {
    if (!card) return;
    if (matchesTarget(typed, card.word)) {
      if (state === 'listening') resolve(attempts === 0 ? 'first' : 'retry');
      else resolve('fail');
    } else {
      setFeedback('No es esa. Probá de nuevo o pedí pista.');
    }
  }

  if (!cards) return <div className="card center dim">Cargando tarjetas…</div>;
  if (cards.length === 0) return <PrecisaDone results={results.current} />;
  if (!card) return null;

  return (
    <div className="card">
      <p className="dim small">
        🎯 Palabra Precisa · {idx + 1}/{cards.length}
      </p>
      <p className="prompt" style={{ fontSize: 20 }}>
        {card.contextGap.replace('______', '______')}
      </p>
      <p className="dim center small">{card.definition}</p>

      {state === 'listening' ? (
        <>
          <p className="center streak" style={{ marginTop: 10 }}>
            {speech.supported ? '🎙️ decí la palabra…' : 'escribí la palabra:'}
          </p>
          {speech.interim && <p className="dim small center">…{speech.interim}</p>}
          {feedback && <p className="center pill bad" style={{ display: 'inline-block' }}>{feedback}</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="o escribila acá"
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            />
            <button className="btn secondary" onClick={submitTyped}>
              Ok
            </button>
          </div>
          <button className="btn ghost block" style={{ marginTop: 10 }} onClick={hintOrReveal}>
            {attempts === 0 ? 'No me sale — dame una pista' : 'Rendirme, mostrá la palabra'}
          </button>
        </>
      ) : (
        <div className="center" style={{ marginTop: 10 }}>
          <p className="dim small">la palabra era</p>
          <p className="prompt" style={{ color: 'var(--accent)' }}>
            {card.word}
          </p>
          <p className="dim small">
            Decila en voz alta para fijarla (dejar el bloqueo sin resolver lo refuerza).
          </p>
          {speech.interim && <p className="dim small">…{speech.interim}</p>}
          <div className="row" style={{ marginTop: 10 }}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="o escribila para continuar"
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            />
            <button className="btn" onClick={submitTyped}>
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrecisaDone({ results }: { results: Outcome[] }) {
  const correct = results.filter((o) => o !== 'fail').length;
  const first = results.filter((o) => o === 'first').length;
  return (
    <div className="card center">
      <p className="dim small">¡Tanda completa!</p>
      <div className="grid-stats" style={{ marginTop: 10 }}>
        <Stat value={`${correct}/${results.length}`} label="recuperadas" />
        <Stat value={first} label="al primer intento" />
      </div>
    </div>
  );
}
