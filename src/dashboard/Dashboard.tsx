import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { progressSeries, personalBest, getWeeklySummary } from '../db/repo';
import { Stat } from '../games/common';
import type { WeeklySummary } from '../lib/weekly';
import type { DailyStats } from '../types';

export function Dashboard() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<DailyStats[]>([]);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [bests, setBests] = useState({ cat: 0, letra: 0, minuto: 0, tabu: 0 });

  useEffect(() => {
    progressSeries(90).then(setSeries);
    getWeeklySummary().then(setWeekly);
    Promise.all([
      personalBest('categorias', (r) => r.metrics.uniqueValid ?? 0),
      personalBest('letra', (r) => r.metrics.uniqueValid ?? 0),
      personalBest('minuto', (r) => r.score),
      personalBest('tabu', (r) => r.metrics.cardsWon ?? 0),
    ]).then(([cat, letra, minuto, tabu]) => setBests({ cat, letra, minuto, tabu }));
  }, []);

  const latest = series[series.length - 1];
  const chartData = series
    .filter((s) => s.sessionCompleted || s.fluencyIndex > 0)
    .map((s) => ({ date: s.date.slice(5), if: s.fluencyIndex }));

  return (
    <>
      <h1>Progreso</h1>

      {latest ? (
        <>
          <div className="card">
            <p className="dim small">Índice de Fluidez (hoy)</p>
            <div className="center">
              <span className="big-num">{latest.fluencyIndex}</span>
              <span className="dim">/100</span>
            </div>
            <div className="grid-stats" style={{ marginTop: 12 }}>
              <Stat value={fmt(latest.subLexico)} label="acceso léxico" />
              <Stat value={fmt(latest.subSoltura)} label="soltura" />
              <Stat value={fmt(latest.subExpresividad)} label="expresividad" />
              <Stat value={fmt(latest.subPrecision)} label="precisión" />
            </div>
          </div>

          {chartData.length >= 2 && (
            <div className="card">
              <p className="dim small">evolución del índice</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                    stroke="var(--border)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                    }}
                    labelStyle={{ color: 'var(--text-dim)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="if"
                    name="Índice de Fluidez"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--accent)' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="small dim center">
                Se mide contra tu línea base personal. La pendiente importa más que el valor.
              </p>
            </div>
          )}

          {weekly && weekly.current.activeDays > 0 && (
            <div className="card">
              <p className="dim small">tu semana (vs. la anterior)</p>
              <div className="grid-stats">
                <Stat
                  value={`${weekly.current.activeDays}/7`}
                  label={`días activos${delta(weekly.current.activeDays, weekly.previous.activeDays)}`}
                />
                <Stat
                  value={weekly.current.avgIF ?? '—'}
                  label={`IF promedio${weekly.deltaIF !== null ? delta(weekly.deltaIF, 0) : ''}`}
                />
                <Stat
                  value={weekly.current.sessionsCompleted}
                  label={`sesiones completas${delta(
                    weekly.current.sessionsCompleted,
                    weekly.previous.sessionsCompleted,
                  )}`}
                />
                <Stat value={weekly.current.xp} label="XP de la semana" />
              </div>
              {weekly.insight && (
                <p className="small dim center" style={{ marginTop: 8 }}>
                  {weekly.insight}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <p className="dim small">récords personales</p>
            <div className="grid-stats">
              <Stat value={bests.cat} label="palabras (Sprint)" />
              <Stat value={bests.letra} label="palabras (Letra)" />
              <Stat value={`${bests.minuto}/100`} label="mejor minuto" />
              <Stat value={`${bests.tabu}/5`} label="mejor Tabú" />
            </div>
          </div>
        </>
      ) : (
        <div className="card center">
          <p className="prompt">Sin datos todavía</p>
          <p className="dim">Completá tu primera sesión para ver tu Índice de Fluidez.</p>
          <button className="btn big block" onClick={() => navigate('/sesion')}>
            Empezar sesión
          </button>
        </div>
      )}

      <div className="card">
        <p className="dim small">jugar suelto (modo libre)</p>
        <div className="row wrap">
          <button className="btn secondary" onClick={() => navigate('/jugar/categorias')}>
            🗂 Categorías
          </button>
          <button className="btn secondary" onClick={() => navigate('/jugar/letra')}>
            🔤 Letra
          </button>
          <button className="btn secondary" onClick={() => navigate('/jugar/tabu')}>
            🚫 Tabú
          </button>
          <button className="btn secondary" onClick={() => navigate('/jugar/minuto')}>
            ⏱ Minuto
          </button>
          <button className="btn secondary" onClick={() => navigate('/jugar/historias')}>
            📖 Historias
          </button>
          <button className="btn secondary" onClick={() => navigate('/jugar/precisa')}>
            🎯 Precisa
          </button>
        </div>
      </div>
    </>
  );
}

function fmt(n: number | null): string {
  return n === null ? '—' : String(n);
}

/** Sufijo " (+n)" / " (−n)" comparando contra la semana anterior. */
function delta(current: number, previous: number): string {
  const d = current - previous;
  if (d === 0) return '';
  return d > 0 ? ` (+${d})` : ` (−${Math.abs(d)})`;
}
