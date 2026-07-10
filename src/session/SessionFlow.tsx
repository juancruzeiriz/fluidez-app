import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SprintCategorias } from '../games/SprintCategorias';
import { LetraProhibida } from '../games/LetraProhibida';
import { TabuSolitario } from '../games/TabuSolitario';
import { MinutoRedondo } from '../games/MinutoRedondo';
import { Historias432 } from '../games/Historias432';
import { PalabraPrecisa } from '../games/PalabraPrecisa';
import { Charla } from '../games/Charla';
import {
  saveRound,
  completeSession,
  addXp,
  todayStr,
  planDailySession,
  assignMission,
} from '../db/repo';
import { useAppStore } from '../store';
import type { Round, GameType } from '../types';

const BLOCK_LABELS = ['Calentamiento', 'Plato principal', 'Consolidación'];

export function SessionFlow() {
  const navigate = useNavigate();
  const refresh = useAppStore((s) => s.refresh);
  const [plan, setPlan] = useState<GameType[] | null>(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [mission, setMission] = useState<string | null>(null);

  useEffect(() => {
    planDailySession().then(setPlan);
  }, []);

  async function handleFinish(round: Round) {
    await saveRound(round);
    const nextScores = [...scores, round.score];
    setScores(nextScores);
    setTimeout(() => advance(nextScores), 2600);
  }

  async function advance(nextScores: number[]) {
    if (plan && step + 1 < plan.length) {
      setStep(step + 1);
    } else {
      await completeSession(todayStr());
      await addXp(todayStr(), 10 + nextScores.length * 5);
      setMission(await assignMission(todayStr()));
      await refresh();
      setFinished(true);
    }
  }

  if (finished) {
    return (
      <div className="card center" style={{ marginTop: 20 }}>
        <p className="prompt">🎉 ¡Sesión completa!</p>
        <p className="dim">Racha mantenida. Tu progreso ya está actualizado.</p>
        {mission && (
          <div className="card" style={{ background: 'var(--surface-2)', marginTop: 10 }}>
            <p className="dim small">misión de hoy</p>
            <p>
              Usá <strong style={{ color: 'var(--accent)' }}>{mission}</strong> en una
              conversación real. Mañana te preguntamos cómo te fue.
            </p>
          </div>
        )}
        <button className="btn big block" onClick={() => navigate('/progreso')}>
          Ver mi progreso
        </button>
        <button className="btn ghost block" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!plan) return <div className="card center dim">Armando tu sesión…</div>;
  const current = plan[step]!;

  return (
    <>
      <div className="row spread" style={{ marginTop: 8 }}>
        <span className="dim small">
          {BLOCK_LABELS[step]} · paso {step + 1}/{plan.length}
        </span>
        <button className="btn ghost small" onClick={() => navigate('/')}>
          Salir
        </button>
      </div>
      <GameByType key={`${current}-${step}`} game={current} onFinish={handleFinish} />
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
    case 'letra':
      return <LetraProhibida onFinish={onFinish} />;
    case 'tabu':
      return <TabuSolitario onFinish={onFinish} />;
    case 'minuto':
      return <MinutoRedondo onFinish={onFinish} />;
    case 'historias':
      return <Historias432 onFinish={onFinish} />;
    case 'precisa':
      return <PalabraPrecisa onFinish={onFinish} />;
    case 'charla':
      return <Charla onFinish={onFinish} />;
  }
}
