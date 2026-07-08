import { useEffect, useState, type ReactNode } from 'react';
import { getLevel } from '../db/repo';
import type { GameType } from '../types';

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

/** Nivel de dificultad actual del juego (null mientras carga de la DB). */
export function useLevel(gameType: GameType): number | null {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getLevel(gameType).then((l) => {
      if (alive) setLevel(l);
    });
    return () => {
      alive = false;
    };
  }, [gameType]);
  return level;
}

/** Chip "nivel X/3" para los intros de los juegos con progresión. */
export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="pill" title="La dificultad sube o baja según tu desempeño reciente">
      nivel {level}/3
    </span>
  );
}
