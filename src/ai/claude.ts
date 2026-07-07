/**
 * Integración opcional con la Claude API (browser-direct). La API key vive solo
 * en el navegador del usuario (localStorage vía settings). Envía el reporte
 * agregado y devuelve el análisis en texto.
 *
 * Requiere el header `anthropic-dangerous-direct-browser-access` para llamar a
 * la API desde el navegador (ver skill claude-api).
 */
import { buildReport } from './export';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface AnalyzeResult {
  text: string;
}

export async function analyzeWithClaude(apiKey: string, model: string): Promise<AnalyzeResult> {
  if (!apiKey) throw new Error('Falta la API key. Cargala en Ajustes.');
  const report = await buildReport();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: report }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data: { content?: { type: string; text?: string }[] } = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
  return { text: text || '(respuesta vacía)' };
}
