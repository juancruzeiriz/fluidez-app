import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { buildExport, importExport, buildReport, downloadText, type FluidezExport } from '../ai/export';
import { analyzeWithClaude } from '../ai/claude';
import { addUserWord } from '../db/repo';
import { db } from '../db/schema';
import {
  subscribeStatus,
  signInWithEmail,
  signOut,
  syncNow,
  type SyncStatus,
} from '../sync/sync';
import muletillas from '../seeds/muletillas.json';

export function Settings() {
  const { settings, update } = useAppStore();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [customFillers, setCustomFillers] = useState(settings.customFillers.join(', '));
  const [analysis, setAnalysis] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [word, setWord] = useState('');
  const [wordDef, setWordDef] = useState('');
  const [wordGap, setWordGap] = useState('');
  const [wordMsg, setWordMsg] = useState('');

  async function addWord() {
    const w = word.trim();
    if (!w || !wordDef.trim()) {
      setWordMsg('Completá al menos la palabra y su definición.');
      return;
    }
    await addUserWord(w, wordDef.trim(), wordGap.trim() || `Definición: ${wordDef.trim()} → ______`);
    setWord('');
    setWordDef('');
    setWordGap('');
    setWordMsg(`"${w}" agregada. Va a aparecer en Palabra Precisa.`);
  }

  async function saveKey() {
    await update({ apiKey: apiKey.trim() });
  }
  async function saveFillers() {
    const list = customFillers
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    await update({ customFillers: list });
  }

  async function exportJson() {
    const data = await buildExport();
    downloadText('fluidez-backup.json', JSON.stringify(data, null, 2), 'application/json');
  }
  async function exportReport() {
    const report = await buildReport();
    downloadText('fluidez-reporte.md', report, 'text/markdown');
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as FluidezExport;
      await importExport(data);
      alert('Datos importados. Recargá la página.');
    } catch {
      alert('Archivo inválido.');
    }
  }

  async function analyze() {
    setErr('');
    setBusy(true);
    setAnalysis('');
    try {
      const { text } = await analyzeWithClaude(settings.apiKey, settings.model);
      setAnalysis(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    if (!confirm('¿Borrar TODOS tus datos? No se puede deshacer.')) return;
    await Promise.all([
      db.rounds.clear(),
      db.dailyStats.clear(),
      db.lexicalItems.clear(),
    ]);
    alert('Datos borrados. Recargá la página.');
  }

  return (
    <>
      <h1>Ajustes</h1>

      <SyncCard />

      <div className="card">
        <p className="dim small">Análisis por IA</p>
        <p className="small">
          Gratis: exportá el reporte y pegalo en cualquier IA (trae el prompt de análisis listo).
        </p>
        <div className="row wrap">
          <button className="btn secondary" onClick={exportReport}>
            📄 Reporte + prompt
          </button>
          <button className="btn secondary" onClick={exportJson}>
            💾 Backup JSON
          </button>
        </div>
      </div>

      <div className="card">
        <p className="dim small">Análisis automático (Claude API, opcional)</p>
        <p className="small dim">
          Tu API key se guarda solo en este dispositivo. Conseguila en console.anthropic.com.
          Tiene costo por uso (centavos por análisis).
        </p>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn secondary" onClick={saveKey}>
            Guardar key
          </button>
          <button className="btn" onClick={analyze} disabled={busy || !settings.apiKey}>
            {busy ? 'Analizando…' : '🤖 Analizar mi progreso'}
          </button>
        </div>
        {err && <p className="pill bad" style={{ display: 'inline-block', marginTop: 8 }}>{err}</p>}
        {analysis && (
          <div className="card" style={{ marginTop: 10, background: 'var(--surface-2)', whiteSpace: 'pre-wrap' }}>
            {analysis}
          </div>
        )}
      </div>

      <div className="card">
        <p className="dim small">Agregar palabra propia a Palabra Precisa</p>
        <p className="small dim">
          ¿No te salió una palabra en una conversación real? Cargala acá: entra al repaso
          espaciado y la vas a practicar hasta tenerla lista.
        </p>
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="palabra (p. ej. efímero)" />
        <input
          style={{ marginTop: 8 }}
          value={wordDef}
          onChange={(e) => setWordDef(e.target.value)}
          placeholder="definición corta"
        />
        <input
          style={{ marginTop: 8 }}
          value={wordGap}
          onChange={(e) => setWordGap(e.target.value)}
          placeholder="frase con hueco ______ (opcional)"
        />
        <button className="btn secondary block" style={{ marginTop: 8 }} onClick={addWord}>
          Agregar palabra
        </button>
        {wordMsg && (
          <p className="pill good" style={{ display: 'inline-block', marginTop: 8 }}>
            {wordMsg}
          </p>
        )}
      </div>

      <div className="card">
        <p className="dim small">Muletillas a detectar</p>
        <p className="small dim">
          Por defecto: {muletillas.default.join(', ')}. Agregá las tuyas separadas por coma.
        </p>
        <input
          value={customFillers}
          onChange={(e) => setCustomFillers(e.target.value)}
          placeholder="mirá, bueno, che"
        />
        <button className="btn secondary" style={{ marginTop: 8 }} onClick={saveFillers}>
          Guardar muletillas
        </button>
      </div>

      <div className="card">
        <p className="dim small">Datos</p>
        <label className="btn secondary block" style={{ cursor: 'pointer' }}>
          📥 Importar backup
          <input type="file" accept="application/json" onChange={onImport} style={{ display: 'none' }} />
        </label>
        <button className="btn ghost block" style={{ marginTop: 8, color: 'var(--bad)' }} onClick={wipe}>
          Borrar todos los datos
        </button>
      </div>
    </>
  );
}

/** Sincronización entre dispositivos (login por email + estado). */
function SyncCard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeStatus(setStatus), []);

  if (!status || !status.configured) return null; // sync no configurado → oculto

  async function sendLink() {
    setErr('');
    if (!email.includes('@')) {
      setErr('Escribí un email válido.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo enviar el link.');
    } finally {
      setBusy(false);
    }
  }

  const loggedIn = !!status.email;

  return (
    <div className="card">
      <p className="dim small">☁️ Sincronizar entre dispositivos</p>

      {loggedIn ? (
        <>
          <p className="small">
            Conectado como <strong>{status.email}</strong>. Tu progreso se sincroniza solo en
            todos tus dispositivos.
          </p>
          <p className="small dim">{syncLabel(status)}</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn secondary" onClick={() => void syncNow()} disabled={status.state === 'syncing'}>
              {status.state === 'syncing' ? 'Sincronizando…' : '🔄 Sincronizar ahora'}
            </button>
            <button className="btn ghost" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </div>
        </>
      ) : sent ? (
        <p className="small">
          Te mandamos un link a <strong>{email}</strong>. Abrilo desde este dispositivo para entrar.
          Repetí lo mismo en tu otro dispositivo con el mismo email y se sincroniza.
        </p>
      ) : (
        <>
          <p className="small dim">
            Entrá con tu email (te llega un link mágico, sin contraseña). Después entrá con el
            mismo email en tu otro dispositivo. Tu API key de Claude nunca se sincroniza.
          </p>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn block" style={{ marginTop: 8 }} onClick={sendLink} disabled={busy}>
            {busy ? 'Enviando…' : 'Enviar link de acceso'}
          </button>
        </>
      )}

      {err && (
        <p className="pill bad" style={{ display: 'inline-block', marginTop: 8 }}>
          {err}
        </p>
      )}
    </div>
  );
}

function syncLabel(s: SyncStatus): string {
  if (s.state === 'error') return `Error de sync: ${s.lastError ?? ''}`;
  if (s.state === 'syncing') return 'Sincronizando…';
  if (s.lastSyncAt) return `Última sync: ${new Date(s.lastSyncAt).toLocaleTimeString()}`;
  return 'Listo para sincronizar.';
}
