import { useParams, useNavigate } from 'react-router-dom';
import { GameByType } from './SessionFlow';
import { saveRound } from '../db/repo';
import type { Round, GameType } from '../types';

const VALID: GameType[] = [
  'categorias',
  'letra',
  'tabu',
  'minuto',
  'historias',
  'precisa',
  'charla',
];

/** Modo libre: jugar un solo juego suelto (fuera de la sesión diaria). */
export function PlayGame() {
  const { game } = useParams();
  const navigate = useNavigate();

  if (!game || !VALID.includes(game as GameType)) {
    navigate('/');
    return null;
  }

  async function handleFinish(round: Round) {
    await saveRound(round);
    setTimeout(() => navigate('/progreso'), 2600);
  }

  return (
    <>
      <div className="row spread" style={{ marginTop: 8 }}>
        <span className="dim small">modo libre</span>
        <button className="btn ghost small" onClick={() => navigate('/')}>
          Salir
        </button>
      </div>
      <GameByType game={game as GameType} onFinish={handleFinish} />
    </>
  );
}
