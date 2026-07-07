import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { db } from './db/schema';
import { todayStr, reportTot } from './db/repo';

export function Home() {
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();
  const [doneToday, setDoneToday] = useState(false);
  const [totFlash, setTotFlash] = useState(false);

  useEffect(() => {
    db.dailyStats.get(todayStr()).then((s) => setDoneToday(!!s?.sessionCompleted));
  }, []);

  async function marcarTrabe() {
    await reportTot(todayStr());
    setTotFlash(true);
    setTimeout(() => setTotFlash(false), 1800);
  }

  return (
    <>
      <div className="row spread" style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>Fluidez</h1>
        <span className="streak">🔥 {settings.streak}</span>
      </div>

      <div className="card">
        <p className="dim small">sesión de hoy</p>
        {doneToday ? (
          <>
            <p className="prompt">✅ ¡Hecho por hoy!</p>
            <p className="dim center">Volvé mañana para mantener la racha.</p>
            <button className="btn secondary block" onClick={() => navigate('/sesion')}>
              Jugar otra vez
            </button>
          </>
        ) : (
          <>
            <p className="prompt">~10 minutos, 3 juegos</p>
            <p className="dim center">
              Sprint de Categorías · Un Minuto Redondo · Palabra Precisa
            </p>
            <button className="btn big block" onClick={() => navigate('/sesion')}>
              Empezar sesión diaria
            </button>
          </>
        )}
      </div>

      <div className="card center">
        <p className="dim small">¿Te trabaste en una conversación real hoy?</p>
        <button className="btn ghost" onClick={marcarTrabe}>
          {totFlash ? 'Anotado 👍' : '😖 Me trabé recién'}
        </button>
        <p className="small dim" style={{ marginTop: 6 }}>
          Registrarlo te deja ver si el entrenamiento transfiere a la vida real.
        </p>
      </div>
    </>
  );
}
