import { useState } from 'react';
import { useAppStore } from '../store';
import { buildExport, importExport, buildReport, downloadText, type FluidezExport } from '../ai/export';
import { analyzeWithClaude } from '../ai/claude';
import { db } from '../db/schema';
import muletillas from '../seeds/muletillas.json';

export function Settings() {
  const { settings, update } = useAppStore();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [customFillers, setCustomFillers] = useState(settings.customFillers.join(', '));
  const [analysis, setAnalysis] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
