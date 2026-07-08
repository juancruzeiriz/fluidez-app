/**
 * Exporta el desempeño para análisis: un JSON completo (backup / migración) y
 * un reporte Markdown con un prompt de análisis ya redactado para pegar en
 * cualquier IA. Es la vía gratuita del análisis por agente que pidió el usuario.
 */
import { db } from '../db/schema';
import type { Round, DailyStats, LexicalItem } from '../types';

export interface FluidezExport {
  version: 1;
  exportedAt: string;
  rounds: Round[];
  dailyStats: DailyStats[];
  lexicalItems: LexicalItem[];
}

export async function buildExport(): Promise<FluidezExport> {
  const [rounds, dailyStats, lexicalItems] = await Promise.all([
    db.rounds.toArray(),
    db.dailyStats.toArray(),
    db.lexicalItems.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rounds,
    dailyStats,
    lexicalItems,
  };
}

/** Restaura un export completo (migración de dispositivo). Reemplaza los datos. */
export async function importExport(data: FluidezExport): Promise<void> {
  await db.transaction('rw', db.rounds, db.dailyStats, db.lexicalItems, async () => {
    await Promise.all([db.rounds.clear(), db.dailyStats.clear(), db.lexicalItems.clear()]);
    await db.rounds.bulkAdd(data.rounds.map(({ id: _id, ...r }) => r as Round));
    await db.dailyStats.bulkAdd(data.dailyStats);
    await db.lexicalItems.bulkAdd(data.lexicalItems.map(({ id: _id, ...i }) => i as LexicalItem));
  });
}

/**
 * Reporte agregado en Markdown + el prompt de análisis. Se envía a la IA (no
 * los transcripts crudos completos) para acotar tokens y proteger privacidad.
 */
export async function buildReport(): Promise<string> {
  const data = await buildExport();
  const stats = [...data.dailyStats].sort((a, b) => a.date.localeCompare(b.date));
  const last = stats.slice(-30);

  const byGame = (t: string) => data.rounds.filter((r) => r.gameType === t);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  const cat = byGame('categorias');
  const min = byGame('minuto');
  const pre = byGame('precisa');

  const muletillasTop = topFillers(min);
  const totTotal = stats.reduce((a, s) => a + s.totReports, 0);

  const lines: string[] = [];
  lines.push('# Reporte de fluidez verbal');
  lines.push('');
  lines.push(`Generado: ${data.exportedAt}`);
  lines.push(`Rondas totales: ${data.rounds.length} · Días activos: ${stats.length}`);
  lines.push('');
  lines.push('## Índice de Fluidez (últimos 30 días)');
  lines.push('| Fecha | IF | Léxico | Soltura | Expresiv. | Precisión | Me trabé (real) |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const s of last) {
    lines.push(
      `| ${s.date} | ${s.fluencyIndex} | ${fmt(s.subLexico)} | ${fmt(s.subSoltura)} | ${fmt(s.subExpresividad)} | ${fmt(s.subPrecision)} | ${s.totReports} |`,
    );
  }
  lines.push('');
  const letra = byGame('letra');
  const tabu = byGame('tabu');
  const historias = byGame('historias');
  lines.push('## Resumen por juego');
  lines.push(
    `- **Sprint de Categorías**: ${cat.length} rondas · media ${avg(cat.map((r) => r.metrics.perMinute ?? 0))} palabras únicas/min`,
  );
  lines.push(
    `- **Letra Prohibida**: ${letra.length} rondas · media ${avg(letra.map((r) => r.metrics.perMinute ?? 0))} palabras únicas/min`,
  );
  lines.push(
    `- **Tabú Solitario**: ${tabu.length} rondas · cartas ${sum(tabu.map((r) => r.metrics.cardsWon ?? 0))}/${sum(tabu.map((r) => r.metrics.cardsPlayed ?? 0))} superadas`,
  );
  lines.push(
    `- **Un Minuto Redondo**: ${min.length} rondas · redondez media ${avg(min.map((r) => r.score))}/100 · WPM medio ${avg(min.map((r) => r.metrics.wpm ?? 0))} · muletillas/min media ${avg(min.map((r) => r.metrics.fillersPerMin ?? 0))}`,
  );
  lines.push(
    `- **Historias 4/3/2**: ${historias.length} rondas · mejora media (intento 1→3) ${avg(historias.map((r) => r.metrics.deltaRoundness ?? 0))} pts de redondez`,
  );
  lines.push(
    `- **Palabra Precisa**: ${pre.length} rondas · aciertos ${sum(pre.map((r) => r.metrics.correct ?? 0))}/${sum(pre.map((r) => r.metrics.attempted ?? 0))}`,
  );
  lines.push('');
  if (muletillasTop.length) {
    lines.push('## Muletillas más frecuentes');
    for (const [w, n] of muletillasTop) lines.push(`- "${w}": ${n}`);
    lines.push('');
  }
  lines.push(`## Auto-reportes "me trabé en una conversación real": ${totTotal}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(ANALYSIS_PROMPT);

  return lines.join('\n');
}

const ANALYSIS_PROMPT = `## Pedido de análisis (pegá esto y el reporte de arriba en tu IA)

Sos un experto en lingüística, fonoaudiología y ciencia del aprendizaje. Analizá estos datos de mi entrenamiento diario de fluidez verbal en español y dame:

1. **Diagnóstico**: ¿en qué dimensión estoy más flojo (acceso léxico, soltura/muletillas, precisión de vocabulario)? ¿La curva del Índice de Fluidez mejora, se estanca o baja?
2. **Correlación**: ¿los días con más auto-reportes de "me trabé en la vida real" coinciden con peores métricas? ¿El entrenamiento parece transferir a la conversación real?
3. **3 recomendaciones concretas** para las próximas 2 semanas, priorizando el mecanismo con peor tendencia.
4. **Objetivo medible** para la próxima semana (un número puntual sobre una métrica).

Sé directo y específico. Si los datos son pocos para concluir, decilo.`;

function topFillers(rounds: Round[]): [string, number][] {
  // Aproximación: no guardamos el conteo por muletilla, así que solo reportamos
  // el volumen total; el detalle por token queda para una versión futura.
  const total = rounds.reduce((a, r) => a + (r.metrics.fillers ?? 0), 0);
  return total > 0 ? [['total de muletillas registradas', total]] : [];
}

function fmt(n: number | null): string {
  return n === null ? '—' : String(n);
}
function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/** Dispara la descarga de un archivo de texto en el navegador. */
export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
