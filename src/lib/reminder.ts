/**
 * Lógica pura del recordatorio diario. La adherencia es el mejor predictor
 * del progreso, así que la app avisa (donde el navegador lo permite) si la
 * sesión del día no está hecha y ya pasó la hora elegida.
 */

export interface ReminderInput {
  enabled: boolean;
  /** hora preferida "HH:MM" (reloj local) */
  time: string;
  /** ¿la sesión de hoy ya está completa? */
  sessionCompletedToday: boolean;
  /** momento actual */
  now: Date;
}

/** ¿Corresponde mostrar el recordatorio ahora? */
export function shouldRemind(input: ReminderInput): boolean {
  if (!input.enabled || input.sessionCompletedToday) return false;
  const [h, m] = parseTime(input.time);
  const minutesNow = input.now.getHours() * 60 + input.now.getMinutes();
  return minutesNow >= h * 60 + m;
}

/** "HH:MM" → [horas, minutos]; entrada inválida cae a 19:00. */
export function parseTime(time: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return [19, 0];
  const h = Math.min(23, Math.max(0, parseInt(match[1]!, 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2]!, 10)));
  return [h, m];
}
