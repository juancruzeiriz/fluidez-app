import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useSpeech } from '../speech/useSpeech';
import { finalTranscript } from '../lib/metrics';

export function Onboarding() {
  const update = useAppStore((s) => s.update);
  const navigate = useNavigate();
  const speech = useSpeech();
  const [step, setStep] = useState<'intro' | 'mic' | 'ready'>('intro');
  const [heard, setHeard] = useState('');

  function testMic() {
    setStep('mic');
    speech.start();
  }
  function stopMic() {
    const events = speech.stop();
    setHeard(finalTranscript(events) || speech.interim);
    setStep('ready');
  }
  async function finish() {
    await update({ onboarded: true });
    navigate('/');
  }

  return (
    <>
      <h1>Bienvenido a Fluidez</h1>

      {step === 'intro' && (
        <div className="card">
          <p>
            Un entrenador diario para <strong>encontrar las palabras que necesitás</strong> y
            decirlas sin trabarte. Está basado en evidencia: la práctica de producción oral,
            con presión de tiempo y medida, es lo que más mejora la fluidez.
          </p>
          <p className="dim">
            Cada día jugás 3 mini-juegos (~10 min). Las primeras sesiones fijan tu{' '}
            <strong>línea base</strong> personal: desde ahí, el Índice de Fluidez mide tu
            progreso contra vos mismo.
          </p>
          {speech.supported ? (
            <button className="btn big block" onClick={testMic}>
              Probar el micrófono
            </button>
          ) : (
            <>
              <p className="pill bad" style={{ display: 'inline-block' }}>
                Este navegador no soporta reconocimiento de voz.
              </p>
              <p className="dim small">
                Para la experiencia completa usá Chrome, Edge o el navegador de Android. Igual
                podés entrar y usar los juegos con teclado donde aplique.
              </p>
              <button className="btn block" onClick={finish}>
                Entrar igual
              </button>
            </>
          )}
        </div>
      )}

      {step === 'mic' && (
        <div className="card center">
          <p className="prompt">🎙️ Decí algo…</p>
          <p className="dim">Contá qué desayunaste, o simplemente contá hasta diez.</p>
          <p style={{ minHeight: 40 }}>{speech.interim || <span className="dim">escuchando…</span>}</p>
          <button className="btn big block" onClick={stopMic}>
            Listo
          </button>
        </div>
      )}

      {step === 'ready' && (
        <div className="card center">
          {heard ? (
            <>
              <p className="dim small">te escuché decir:</p>
              <p className="prompt">"{heard}"</p>
              <p className="dim">
                Si es más o menos lo que dijiste, el micrófono funciona. ¡A entrenar!
              </p>
            </>
          ) : (
            <>
              <p className="prompt">No capté nada 🤔</p>
              <p className="dim">
                Revisá el permiso de micrófono del navegador y volvé a probar. Igual podés entrar.
              </p>
            </>
          )}
          <button className="btn big block" onClick={finish}>
            Empezar a entrenar
          </button>
        </div>
      )}
    </>
  );
}
