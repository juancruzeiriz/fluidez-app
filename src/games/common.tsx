import type { ReactNode } from 'react';

export function Timer({ seconds }: { seconds: number }) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return (
    <div className={`timer ${seconds <= 5 ? 'low' : ''}`}>
      {mm}:{ss.toString().padStart(2, '0')}
    </div>
  );
}

export function MicWarning() {
  return (
    <div className="card center">
      <p className="prompt">🎙️ Micrófono no disponible</p>
      <p className="dim">
        Este navegador no soporta reconocimiento de voz. Usá Chrome, Edge o el navegador de
        Android. En algunos juegos podés escribir como alternativa.
      </p>
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

/** Elige un elemento al azar de una lista, opcionalmente filtrando por nivel. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
