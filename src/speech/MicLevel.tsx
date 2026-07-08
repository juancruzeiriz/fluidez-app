/**
 * Medidor de nivel de micrófono en vivo (Web Audio API).
 * Es independiente del reconocimiento de voz: si las barras se mueven, el
 * navegador ESTÁ captando tu voz — aunque el reconocimiento tarde o falle.
 * También sirve para forzar el prompt de permiso de micrófono y detectar
 * cuándo fue denegado.
 */
import { useEffect, useRef, useState } from 'react';

const BARS = 12;

interface Props {
  /** se llama con un mensaje legible si no se pudo acceder al micrófono */
  onError?: (message: string) => void;
}

export function MicLevel({ onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [denied, setDenied] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    let alive = true;

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        if (!alive) return;
        setDenied(true);
        const name = (e as { name?: string }).name;
        onErrorRef.current?.(
          name === 'NotAllowedError'
            ? 'El navegador bloqueó el micrófono. Permitilo en el candado de la barra de direcciones y recargá.'
            : name === 'NotFoundError'
              ? 'No se encontró ningún micrófono conectado.'
              : 'No se pudo acceder al micrófono.',
        );
        return;
      }
      if (!alive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const g = canvas.getContext('2d');
        if (!g) return;
        analyser.getByteFrequencyData(data);
        const w = canvas.width;
        const h = canvas.height;
        g.clearRect(0, 0, w, h);
        const step = Math.floor(data.length / BARS);
        const barW = w / BARS;
        const accent =
          getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
          '#4ade80';
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          const level = sum / step / 255; // 0..1
          const barH = Math.max(3, level * h);
          g.fillStyle = accent;
          g.globalAlpha = 0.35 + level * 0.65;
          g.fillRect(i * barW + 2, h - barH, barW - 4, barH);
        }
        g.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    }

    void run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close().catch(() => undefined);
    };
  }, []);

  if (denied) return null;
  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={48}
      style={{ display: 'block', margin: '8px auto' }}
      aria-label="nivel de micrófono"
    />
  );
}
