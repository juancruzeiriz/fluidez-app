# Arquitectura técnica

Diseño técnico de la app "Fluidez": **PWA 100 % frontend** (React + Vite + TypeScript) desplegada gratis en **GitHub Pages**, con **IndexedDB** como base de datos local y reconocimiento de voz vía **Web Speech API** (sin servidores, sin API keys obligatorias, costo cero).

> Versión 2 de este documento. La v1 proponía backend FastAPI + SQLite; se descartó a favor de frontend-only porque: (a) GitHub Pages da HTTPS gratis, que es el único requisito real para que el micrófono funcione en el celular; (b) la app es single-user y todo el cálculo de métricas ya ocurría en el cliente; (c) cero servidor = cero costo y cero mantenimiento. El backend queda como opción futura solo si algún día hace falta sync multi-dispositivo.

## 1. Decisiones de arquitectura

| Decisión | Elección | Por qué |
|---|---|---|
| Plataforma | **PWA estática en GitHub Pages** | HTTPS gratis → micrófono funciona en el celular sin configurar nada; instalable ("Agregar a pantalla de inicio"); deploy automático por Actions |
| Frontend | **React 18 + Vite + TypeScript estricto** | Tipado estricto, build simple, HMR |
| STT | **Web Speech API** (`SpeechRecognition`, `lang: "es-AR"`) | Gratis, streaming de resultados intermedios (chips en vivo + detección de pausas) |
| Base de datos | **IndexedDB vía Dexie** | Persistente en el navegador, esquema tipado, consultas indexadas; export/import JSON completo como backup y migración |
| Routing | **HashRouter** | GitHub Pages no tiene fallback SPA; el hash evita 404 en deep links y refresh |
| Análisis IA | **Export (JSON + reporte md con prompt)** + **Claude API browser-direct opcional** | Gratis por defecto; la integración usa API key del usuario guardada solo en `localStorage` |
| Audio crudo | **No se guarda** | Privacidad y peso: solo transcript + métricas |
| Correr local | `npm run dev` | Un solo comando por terminal; mic funciona en `localhost` (contexto seguro) |

**Regla de reparto**: todo lo de tiempo real (STT, chips, pausas, violaciones) ocurre en memoria durante la ronda; al terminar, la ronda con sus métricas se persiste en IndexedDB; los agregados (índice de fluidez, rachas, SRS) se derivan de ahí.

## 2. Diagrama

```
┌────────────────────────── Navegador (PWA) ──────────────────────────┐
│  React 18 + Vite + TS (HashRouter)                                  │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│  │ Juegos      │ ← │ useSpeech()  │ ← │ Web Speech API (es-AR,   │  │
│  │ (GameShell) │   │ + timestamps │   │ continuous, interim)     │  │
│  └──────┬──────┘   └──────────────┘   └──────────────────────────┘  │
│         │  lib/: normalize · metrics · srs (SM-2) · fluency (IF)    │
│  ┌──────▼──────────────────────────────────────────────┐            │
│  │ Dexie / IndexedDB: rounds · lexicalItems ·           │            │
│  │ dailyStats · settings          (export/import JSON)  │            │
│  └──────┬──────────────────────────────────────────────┘            │
│         │                                    ┌────────────────────┐ │
│  dashboard · sesión diaria · rachas · export │ ai/claude.ts       │─┼→ api.anthropic.com
│                                              │ (key del usuario)  │ │   (opcional)
│                                              └────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
        ▲ deploy estático (GitHub Actions → Pages)
```

## 3. Estructura del código

```
fluidez-app/web/
├── src/
│   ├── lib/                    # núcleo puro y testeado (sin React, sin IO)
│   │   ├── normalize.ts        # lowercase, sin tildes, stemming plural es, tokenización
│   │   ├── metrics.ts          # palabras únicas válidas, muletillas/min, pausas>2s,
│   │   │                       #   WPM, secuencia fluida más larga, score de redondez
│   │   ├── srs.ts              # SM-2 puro: (estado, calidad 0-5) → nuevo estado
│   │   └── fluency.ts          # línea base por juego (mediana de 5), subíndices,
│   │                           #   IF con pesos renormalizables, pendiente 7d
│   ├── speech/
│   │   └── useSpeech.ts        # hook STT: start/stop, eventos con timestamp,
│   │                           #   auto-restart en onend, supported=false → fallback
│   ├── db/
│   │   ├── schema.ts           # Dexie: tablas + índices
│   │   ├── repo.ts             # operaciones tipadas (guardar ronda, agregados, SRS due)
│   │   └── seed.ts             # carga seeds JSON si la DB está vacía
│   ├── games/
│   │   ├── GameShell.tsx       # cronómetro, ciclo prep→jugando→resultado
│   │   ├── SprintCategorias/
│   │   ├── MinutoRedondo/
│   │   └── PalabraPrecisa/     # incluye corrección de error obligatoria y alta de palabras
│   ├── session/                # orquestador sesión diaria, rachas, XP
│   ├── onboarding/             # test de mic + calibración (línea base)
│   ├── dashboard/              # curvas IF, subíndices, récords, botón "me trabé hoy"
│   ├── ai/
│   │   ├── export.ts           # JSON completo + reporte Markdown con prompt de análisis
│   │   └── claude.ts           # POST /v1/messages con header CORS de browser
│   ├── settings/               # API key, muletillas custom, export/import, borrar datos
│   ├── seeds/                  # categorias.json · temas.json · palabras.json · muletillas.json
│   └── App.tsx                 # rutas: #/ (hoy) · #/jugar/:juego · #/progreso · #/ajustes
├── tests/                      # Vitest sobre src/lib (el núcleo científico)
├── vite.config.ts              # base '/noticias-ideas/', vite-plugin-pwa
└── package.json
```

## 4. Contratos clave

### 4.1 `useSpeech`

```ts
interface SpeechEvent { text: string; isFinal: boolean; t: number }   // t = performance.now()

interface UseSpeech {
  supported: boolean;         // false → los juegos ofrecen fallback de tipeo
  listening: boolean;
  events: SpeechEvent[];      // stream acumulado de la ronda
  start(): void;              // continuo, es-AR, interimResults
  stop(): SpeechEvent[];      // corta y devuelve los eventos finales
}
```

Realidades de Web Speech API que el hook resuelve:
- **Sin timestamps por palabra** → las pausas se estiman como gaps > 2 s entre eventos `onresult`. Suficiente: el IF mide pendiente relativa, no valores absolutos.
- **Auto-stop por silencio** → `onend` re-arranca el reconocimiento mientras la ronda siga activa, mergeando transcript.
- **Soporte**: Chrome/Edge/Android sí; Firefox/iOS-Safari limitado → `supported=false` y fallback de tipeo en Sprint y Palabra Precisa; Minuto Redondo requiere mic.
- **Muletillas**: los STT omiten "eh/em" pero transcriben las léxicas ("este", "o sea", "tipo", "nada") — son la señal principal; el sesgo queda documentado en el dashboard.
- **Match de palabra** (Palabra Precisa): normalización + Levenshtein ≤ 2 (cubre b/v, s/z/c, h muda, errores del STT).

### 4.2 Esquema Dexie (la "base de datos" pedida)

```ts
// schema.ts — Dexie v4
rounds:       '++id, gameType, playedAt, sessionDate'
   // { gameType, contentId, transcript, events: SpeechEvent[] resumidos,
   //   metrics: {wpm, unicas, muletillasPorMin, pausasLargas, rachaFluida, ...},
   //   score, durationMs, playedAt, sessionDate }
lexicalItems: '++id, dueDate, source, &word'
   // { word, definition, contextGap, source: 'seed'|'user',
   //   easiness, intervalDays, repetitions, dueDate, history: ReviewLog[] }
dailyStats:   'date'
   // { date, fluencyIndex, subLexico, subSoltura, subPrecision,
   //   sessionCompleted, xp, totReports }
settings:     'key'   // apiKey (localStorage en realidad), muletillas custom, flags
```

Todo lo que el agente de IA necesita (tiempos, aciertos, errores, tendencias) vive acá y sale por `ai/export.ts`.

### 4.3 Integración Claude API (opcional)

- `POST https://api.anthropic.com/v1/messages` directo desde el navegador con el header `anthropic-dangerous-direct-browser-access: true` (soporte CORS oficial para llamadas browser-side con key propia).
- Modelo default `claude-sonnet-5` (configurable en ajustes); se envía el **reporte agregado** (~2-4 K tokens), no los transcripts crudos.
- La key vive solo en el navegador del usuario; nunca se commitea ni viaja a otro lado.

## 5. Deploy y operación

### GitHub Pages (recomendado)
- Workflow `.github/workflows/fluidez-pages.yml`: en cada push a `master` que toque `fluidez-app/web/**` → `npm ci && npm test && npm run build` → `actions/deploy-pages`.
- URL: **`https://juancruzeiriz.github.io/noticias-ideas/`** (por eso `base: '/noticias-ideas/'` en Vite).
- HTTPS incluido → micrófono OK en celular y desktop, cero configuración.

### Local por terminal (alternativa siempre disponible)
```bash
cd fluidez-app/web
npm install
npm run dev        # http://localhost:5173 — mic funciona (localhost = contexto seguro)
```

### Backup
Los datos viven en IndexedDB del navegador. Botón **Exportar** (JSON completo) 1×/semana o antes de cambiar de dispositivo; **Importar** restaura todo. La app recuerda exportar si pasaron >7 días.

## 6. Testing

- **Vitest** sobre `src/lib`: transcripts fixture con tildes/plurales/muletillas mezcladas, gaps de pausa, tabla de casos SM-2, IF con línea base parcial y renormalización de pesos.
- **Playwright** (local, no CI): mock de `SpeechRecognition` inyectado antes de cargar la app para simular una sesión completa (calibración → 3 juegos → dashboard poblado).
- **CI** (`fluidez-ci.yml`): typecheck (`tsc --noEmit`) + Vitest + build en cada PR que toque `fluidez-app/web/**`.
- **Manual**: checklist de mic real en Chrome desktop + Android (lo que el CI no puede cubrir) — está en `TODO_USUARIO.md`.

## 7. Riesgos y planes B

| Riesgo | Mitigación |
|---|---|
| Calidad del STT de Chrome en español insuficiente | La calibración lo expone el día 1 (transcript en vivo). Plan B: Whisper on-device vía `transformers.js`, mismo contrato de `useSpeech` — sigue siendo gratis y sin servidor |
| Usuario borra datos del navegador | Export/import JSON + recordatorio semanal de backup |
| GitHub Pages no habilitado | El workflow usa `configure-pages` con `enablement: true`; si falla, un paso manual de 30 segundos (Settings → Pages → Source: GitHub Actions) |
| iOS Safari sin Web Speech API completa | Documentado; target primario es Chrome/Android. Whisper on-device también lo cubriría |

## 8. Roadmap

| Iteración | Alcance | Estado |
|---|---|---|
| **1** | Sprint de Categorías + Un Minuto Redondo + Palabra Precisa (SRS + corrección de error), calibración, sesión diaria, rachas, dashboard con IF, export + Claude API, deploy a Pages | **En desarrollo** |
| **2** | Tabú Solitario, Letra Prohibida, Historias 4/3/2; scheduler adaptativo completo; resumen semanal | Pendiente |
| **3** | Pulido: juez LLM para Tabú, mazos temáticos, Whisper on-device si hace falta, sync multi-dispositivo si hace falta | Pendiente |
