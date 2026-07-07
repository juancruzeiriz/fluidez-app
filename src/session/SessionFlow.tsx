import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SprintCategorias } from '../games/SprintCategorias';
import { MinutoRedondo } from '../games/MinutoRedondo';
import { PalabraPrecisa } from '../games/PalabraPrecisa';
import { saveRound, completeSession, addXp, todayStr } from '../db/repo';
import { useAppStore } from '../store';
import type { Round, GameType } from '../types';

const SEQUENCE: { game: GameType; label: string }[] = [
  { game: 'categorias', label: 'Calentamiento' },
  { game: 'minuto', label: 'Plato principal' },
  { game: 'precisa', label: 'Consolidación' },
];

export function SessionFlow() {
  const navigate = useNavigate();
  const refresh = useAppStore((s) => s.refresh);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  async function handleFinish(round: Round) {
    await saveRound(round);
    const nextScores = [...scores, round.score];
    setScores(nextScores);
    // Pequeña pausa para que el usuario vea el resultado del juego.
    setTimeout(() => advance(nextScores), 2600);
  }

  async function advance(nextScores: number[]) {
    if (step + 1 < SEQUENCE.length) {
      setStep(step + 1);
    } else {
      await completeSession(todayStr());
      await addXp(todayStr(), 10 + nextScores.length * 5);
      await refresh();
      setFinished(true);
    }
  }

  if (finished) {
    return (
      <div className="card center" style={{ marginTop: 20 }}>
        <p className="prompt">🎉 ¡Sesión completa!</p>
        <p className="dim">Racha mantenida. Tu progreso ya está actualizado.</p>
        <button className="btn big block" onClick={() => navigate('/progreso')}>
          Ver mi progreso
        </button>
        <button className="btn ghost block" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const current = SEQUENCE[step]!;

  return (
    <>
      <div className="row spread" style={{ marginTop: 8 }}>
        <span className="dim small">
          {current.label} · paso {step + 1}/{SEQUENCE.length}
        </span>
        <button className="btn ghost small" onClick={() => navigate('/')}>
          Salir
        </button>
      </div>
      <GameByType key={current.game} game={current.game} onFinish={handleFinish} />
    </>
  );
}

export function GameByType({
  game,
  onFinish,
}: {
  game: GameType;
  onFinish: (r: Round) => void;
}) {
  switch (game) {
    case 'categorias':
      return <SprintCategorias onFinish={onFinish} />;
    case 'minuto':
      return <MinutoRedondo onFinish={onFinish} />;
    case 'precisa':
      return <PalabraPrecisa onFinish={onFinish} />;
  }
}
