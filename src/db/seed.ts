/** Carga inicial de contenido en la base de datos si está vacía. */
import { db } from './schema';
import { INITIAL_SRS } from '../lib/srs';
import type { LexicalItem } from '../types';
import { todayStr } from './repo';
import palabras from '../seeds/palabras.json';

interface PalabraSeed {
  palabra: string;
  definicion: string;
  contextGap: string;
  nivel: number;
}

/** Siembra el banco de Palabra Precisa una sola vez. */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.lexicalItems.count();
  if (count > 0) return;

  const today = todayStr();
  const items: LexicalItem[] = (palabras as PalabraSeed[]).map((p) => ({
    ...INITIAL_SRS,
    word: p.palabra.toLowerCase(),
    definition: p.definicion,
    contextGap: p.contextGap,
    source: 'seed' as const,
    dueDate: today, // todas disponibles desde el día 1; el SRS las espacia luego
    history: [],
  }));
  await db.lexicalItems.bulkAdd(items);
}
