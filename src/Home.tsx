import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { db } from './db/schema';
import { todayStr, reportTot, addUserWord, pendingMission, resolveMission } from './db/repo';

export function Home() {
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();
  const [doneToday, setDoneToday] = useState(false);
  const [totFlash, setTotFlash] = useState('');
  // Captura de la palabra que no salió: el bloqueo no resuelto tiende a
  // repetirse; capturarla y repasarla (SRS) es lo que corta ese ciclo.
  const [capturing, setCapturing] = useState(false);
  const [totWord, setTotWord] = useState('');
  const [totDef, setTotDef] = useState('');
  const [mission, setMission] = useState<{ date: string; word: string } | null>(null);
  const [missionMsg, setMissionMsg] = useState('');

  useEffect(() => {
    db.dailyStats.get(todayStr()).then((s) => setDoneToday(!!s?.sessionCompleted));
    pendingMission().then(setMission);
  }, []);

  async function responderMision(used: boolean) {
    if (!mission) return;
    await resolveMission(mission.date, used);
    setMission(null);
    setMissionMsg(used ? '¡Eso es transferencia de verdad! +15 XP 🎯' : 'Anotado. Mañana hay otra chance.');
    setTimeout(() => setMissionMsg(''), 3000);
  }

  async function marcarTrabe() {
    await reportTot(todayStr());
    setCapturing(true);
  }

  async function guardarPalabra() {
    const w = totWord.trim();
    if (w) {
      await addUserWord(w, totDef.trim() || 'la palabra que no me salió', `me trabé ${todayStr()}`);
    }
    cerrarCaptura(w ? 'Anotada, entra al repaso 👍' : 'Anotado 👍');
  }

  function cerrarCaptura(msg: string) {
    setCapturing(false);
    setTotWord('');
    setTotDef('');
    setTotFlash(msg);
    setTimeout(() => setTotFlash(''), 2200);
  }

  return (
    <>
      <div className="row spread" style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>Fluidez</h1>
        <span className="streak">🔥 {settings.streak}</span>
      </div>

      {mission && (
        <div className="card center">
          <p className="dim small">misión pendiente</p>
          <p>
            Tu misión era usar{' '}
            <strong style={{ color: 'var(--accent)' }}>{mission.word}</strong> en una conversación
            real. ¿La usaste?
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn block" onClick={() => responderMision(true)}>
              Sí 🎯
            </button>
            <button className="btn secondary block" onClick={() => responderMision(false)}>
              No, esta vez no
            </button>
          </div>
        </div>
      )}
      {missionMsg && (
        <p className="pill good center" style={{ display: 'block' }}>
          {missionMsg}
        </p>
      )}

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
        {capturing ? (
          <>
            <p className="small">¿Qué palabra no te salió? (10 segundos y la rescatamos)</p>
            <input
              autoFocus
              value={totWord}
              onChange={(e) => setTotWord(e.target.value)}
              placeholder="la palabra que buscabas"
            />
            <input
              style={{ marginTop: 8 }}
              value={totDef}
              onChange={(e) => setTotDef(e.target.value)}
              placeholder="qué querías decir (opcional)"
            />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn block" onClick={guardarPalabra}>
                Guardar
              </button>
              <button className="btn ghost" onClick={() => cerrarCaptura('Anotado 👍')}>
                No me acuerdo / saltar
              </button>
            </div>
            <p className="small dim" style={{ marginTop: 6 }}>
              Entra a Palabra Precisa: la repasás hasta que salga sola.
            </p>
          </>
        ) : (
          <>
            <button className="btn ghost" onClick={marcarTrabe}>
              {totFlash || '😖 Me trabé recién'}
            </button>
            <p className="small dim" style={{ marginTop: 6 }}>
              Registrarlo te deja ver si el entrenamiento transfiere a la vida real.
            </p>
          </>
        )}
      </div>
    </>
  );
}
