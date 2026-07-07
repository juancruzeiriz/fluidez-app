import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuenta regresiva en segundos con callback al llegar a cero. */
export function useCountdown(onDone?: () => void) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      doneRef.current?.();
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, seconds]);

  const start = useCallback((secs: number) => {
    setSeconds(secs);
    setRunning(true);
  }, []);
  const stop = useCallback(() => setRunning(false), []);

  return { seconds, running, start, stop };
}
