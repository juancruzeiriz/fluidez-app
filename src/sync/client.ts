/**
 * Cliente Supabase (singleton). Devuelve null si el sync no está configurado,
 * así el resto de la app puede preguntar y degradar a modo 100% local.
 *
 * Flujo PKCE: el link mágico vuelve con `?code=...` en la query (no en el hash),
 * para no chocar con el HashRouter (que usa `#/ruta`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, syncConfigured } from './config';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
