# Fluidez — Entrenador diario de expresión oral

**Fluidez** es una app-juego (PWA) para entrenar todos los días, en sesiones de ~10 minutos, la capacidad de **encontrar las palabras que necesitás y decirlas sin trabarte**: recuperación léxica, velocidad de habla, precisión de vocabulario y soltura bajo presión.

Nace de un problema concreto: en conversaciones, a veces la palabra "no sale" (fenómeno de punta de la lengua), o uno se traba. La premisa, respaldada por la evidencia: **lo que más mejora el habla es practicar el habla** — producción activa, con presión de tiempo, repetida y medida.

🔗 **App en vivo**: https://juancruzeiriz.github.io/fluidez-app/ (tras el primer deploy)

## Correr local

```bash
npm install
npm run dev        # http://localhost:5173  (el micrófono funciona en localhost)
```

Otros comandos: `npm test` (49 tests del núcleo), `npm run typecheck`, `npm run build`.

## Qué incluye

Los **6 mini-juegos**, cada uno mapeado a un mecanismo con evidencia:

| Juego | Entrena |
|---|---|
| 🗂 **Sprint de Categorías** | Fluidez semántica — recuperación léxica bajo presión |
| 🔤 **Letra Prohibida** | Fluidez fonémica — acceso léxico por inicial (COWAT) |
| 🚫 **Tabú Solitario** | Circunlocución / SFA — la estrategia de reparación para cuando la palabra no sale |
| ⏱ **Un Minuto Redondo** | Habla improvisada — mide muletillas, pausas y velocidad |
| 📖 **Historias 4/3/2** | Proceduralización — misma historia 3 veces con menos tiempo (efecto Nation) |
| 🎯 **Palabra Precisa** | Vocabulario preciso con repaso espaciado (SM-2) y **corrección de error obligatoria** |

La **sesión diaria** arma 3 bloques (calentamiento léxico · plato principal rotativo · consolidación) eligiendo el juego menos jugado recientemente. Más: onboarding con test de micrófono, dashboard con **Índice de Fluidez** de 4 subíndices (léxico, soltura, expresividad, precisión) contra tu línea base personal, rachas, contador "me trabé en la vida real", carga de palabras propias, y **análisis por IA** (export gratis con prompt listo + integración opcional con la Claude API).

## Stack

React 18 + Vite + TypeScript estricto · IndexedDB (Dexie) · Web Speech API (es-AR) · PWA · deploy gratis en GitHub Pages. Sin servidores, sin costos, la API key (opcional) vive solo en tu navegador.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/01_EVIDENCIA_CIENTIFICA.md`](docs/01_EVIDENCIA_CIENTIFICA.md) | Qué dice la ciencia sobre mejorar la fluidez verbal, con fuentes. |
| [`docs/02_DISENO_JUEGO.md`](docs/02_DISENO_JUEGO.md) | Diseño de producto: los 6 mini-juegos, métricas, gamificación. |
| [`docs/03_ARQUITECTURA.md`](docs/03_ARQUITECTURA.md) | Diseño técnico y roadmap. |
| [`TODO_USUARIO.md`](TODO_USUARIO.md) | Pasos manuales (probar mic, habilitar Pages, API key, uso diario). |
