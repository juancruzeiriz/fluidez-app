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

// ---------- Juez de Tabú Solitario ----------

export interface TabuJudgeResult {
  /** qué palabra adivinó el modelo a partir de la descripción */
  guess: string;
  /** true si la adivinanza coincide con la palabra objetivo */
  understood: boolean;
}

/**
 * Juez opcional para Tabú Solitario: le pasamos SOLO la descripción (sin la
 * palabra objetivo) y el modelo intenta adivinarla, igual que haría un amigo.
 * Comparamos la adivinanza con el objetivo del lado del cliente — así la
 * evaluación mide de verdad si la circunlocución fue comprensible.
 */
export async function judgeTabuDescription(
  apiKey: string,
  model: string,
  objetivo: string,
  descripcion: string,
): Promise<TabuJudgeResult> {
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
      max_tokens: 256,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              adivinanza: {
                type: 'string',
                description: 'la palabra o concepto que creés que se está describiendo (en minúsculas, sin artículo)',
              },
            },
            required: ['adivinanza'],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: 'user',
          content:
            'Estás jugando al Tabú en español. Otra persona describió una palabra sin poder decirla. ' +
            'A partir de su descripción (transcripta de voz, puede tener errores), adiviná qué palabra es.\n\n' +
            `Descripción: "${descripcion}"`,
        },
      ],
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
    .join('')
    .trim();

  let guess = '';
  try {
    guess = String((JSON.parse(text) as { adivinanza?: string }).adivinanza ?? '').trim();
  } catch {
    guess = text; // sin JSON válido, usamos el texto crudo como adivinanza
  }
  return { guess, understood: sameWord(guess, objetivo) };
}

/** Comparación laxa: sin acentos, minúsculas, tolera plural/artículo. */
function sameWord(a: string, b: string): boolean {
  const norm = (w: string) =>
    w
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(el|la|los|las|un|una)\s+/, '')
      .replace(/s$/, '')
      .trim();
  const na = norm(a);
  const nb = norm(b);
  return na.length > 0 && (na === nb || na.includes(nb) || nb.includes(na));
}
