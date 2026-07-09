/**
 * Credenciales de Supabase para la sincronización en la nube.
 *
 * La `publishableKey` es pública por diseño: puede vivir en el bundle del
 * frontend sin riesgo. La seguridad real la dan las políticas Row Level
 * Security (cada usuario solo ve y escribe sus propias filas). Nunca poner
 * acá la `secret`/`service_role` key.
 *
 * Si `url` o `publishableKey` están vacías, el sync queda desactivado y la app
 * funciona 100% local (como antes de agregar esta función).
 */
export const SUPABASE_URL = 'https://yygkrivcxxoedzuwopoo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iSu3AvDaSzvGnyD3T9xcCw_1Tq91JhC';

export const syncConfigured = SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;

/** URL de retorno del link mágico: la base de la app (dev o GitHub Pages). */
export function authRedirectUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}
