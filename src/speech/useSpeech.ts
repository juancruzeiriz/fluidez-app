/**
 * Hook de reconocimiento de voz sobre Web Speech API.
 * Expone un stream de eventos con timestamp para calcular métricas (pausas,
 * WPM, muletillas). Resuelve las asperezas de la API: auto-stop por silencio
 * (re-arranque en onend) y ausencia de timestamps por palabra.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechEvent } from '../lib/metrics';

// Tipos mínimos de Web Speech API (no están en lib.dom estándar).
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item(i: number): { transcript: string };
  [i: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(i: number): SpeechRecognitionResultLike;
    [i: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = (): boolean => getCtor() !== null;

/**
 * Brave expone `webkitSpeechRecognition` pero quita las claves de Google, así
 * que el motor de voz nunca conecta y todo intento termina en un error
 * `network`. Lo detectamos para dar un mensaje honesto (no es falta de internet).
 * `navigator.brave.isBrave()` es async; resolvemos una vez al cargar el módulo.
 */
let braveDetected = false;
const brave = (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave;
if (brave?.isBrave) {
  brave
    .isBrave()
    .then((v) => {
      braveDetected = v;
    })
    .catch(() => {
      /* noop */
    });
}
export const isBraveBrowser = (): boolean => braveDetected;

export interface UseSpeech {
  supported: boolean;
  listening: boolean;
  events: SpeechEvent[];
  interim: string; // texto parcial en curso (para feedback en vivo)
  /** error fatal del reconocimiento (permiso denegado, sin mic, etc.) */
  error: string | null;
  start: () => void;
  stop: () => SpeechEvent[];
  reset: () => void;
}

/** Errores de Web Speech que matan la ronda (los demás son transitorios). */
const FATAL_ERRORS: Record<string, string> = {
  'not-allowed': 'El navegador bloqueó el micrófono. Permitilo en el candado de la barra de direcciones.',
  'service-not-allowed': 'El servicio de reconocimiento de voz está deshabilitado en este navegador.',
  'audio-capture': 'No se encontró micrófono. Conectá uno o revisá la configuración de audio.',
  network:
    'El navegador no pudo conectar con el motor de reconocimiento de voz. ' +
    'Si no es un problema de internet, probá en Chrome o Edge de escritorio (o Chrome en Android).',
  'language-not-supported': 'Este navegador no soporta reconocimiento en español.',
};

export function useSpeech(lang = 'es-AR'): UseSpeech {
  const supported = speechSupported();
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState<SpeechEvent[]>([]);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false); // ronda en curso (para re-arranque en onend)
  const eventsRef = useRef<SpeechEvent[]>([]);

  const pushEvent = useCallback((e: SpeechEvent) => {
    eventsRef.current = [...eventsRef.current, e];
    setEvents(eventsRef.current);
  }, []);

  const build = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          pushEvent({ text: text.trim(), isFinal: true, t: performance.now() });
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (ev) => {
      // 'no-speech'/'aborted' son esperables; no rompen la ronda.
      let fatal = FATAL_ERRORS[ev.error];
      // En Brave el error 'network' es siempre el motor de Google desactivado.
      if (ev.error === 'network' && braveDetected) {
        fatal =
          'Brave desactiva el reconocimiento de voz (usa el motor de Google, que Brave bloquea por privacidad). ' +
          'Abrí la app en Chrome o Edge de escritorio, o en Chrome de Android.';
      }
      if (fatal) {
        activeRef.current = false;
        setListening(false);
        setError(fatal);
      }
    };
    rec.onend = () => {
      // La API corta sola tras silencio; re-arrancamos si la ronda sigue activa.
      if (activeRef.current) {
        try {
          rec.start();
        } catch {
          /* start() puede tirar si aún no terminó de cerrar; se reintenta al próximo onend */
        }
      } else {
        setListening(false);
      }
    };
    return rec;
  }, [lang, pushEvent]);

  const start = useCallback(() => {
    if (!supported || activeRef.current) return;
    eventsRef.current = [];
    setEvents([]);
    setInterim('');
    setError(null);
    activeRef.current = true;
    const rec = build();
    if (!rec) return;
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      activeRef.current = false;
    }
  }, [supported, build]);

  const stop = useCallback((): SpeechEvent[] => {
    activeRef.current = false;
    setListening(false);
    setInterim('');
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    return eventsRef.current;
  }, []);

  const reset = useCallback(() => {
    eventsRef.current = [];
    setEvents([]);
    setInterim('');
  }, []);

  // Limpieza al desmontar.
  useEffect(() => {
    return () => {
      activeRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  return { supported, listening, events, interim, error, start, stop, reset };
}
