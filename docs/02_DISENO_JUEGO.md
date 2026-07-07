# Diseño de producto: la app-juego "Fluidez"

Especificación de producto de los 6 mini-juegos, la sesión diaria, el sistema de métricas y la gamificación. Cada juego cita el mecanismo científico que entrena (ver [`01_EVIDENCIA_CIENTIFICA.md`](01_EVIDENCIA_CIENTIFICA.md), §2).

> **Nota de arquitectura**: la app es 100 % frontend (PWA en GitHub Pages, datos en IndexedDB) — ver [`03_ARQUITECTURA.md`](03_ARQUITECTURA.md). La iteración 1 implementa los juegos 1, 4 y 6 (una sesión diaria completa); los juegos 2, 3 y 5 vienen en la iteración 2.

## Principios de diseño

1. **Hablar en voz alta siempre que se pueda.** El objetivo es producción oral; el tipeo solo existe como fallback cuando no hay micrófono o no se puede hablar (transporte público).
2. **Presión de tiempo en todo.** La conversación real no espera; todos los juegos tienen reloj visible.
3. **Sesión corta, diaria, sin fricción.** Abrir la app → un tap → jugando. ~10 minutos. La constancia (espaciado) vale más que la duración.
4. **Todo se mide.** Cada ronda produce métricas; el progreso es una curva, no una sensación.
5. **El error no castiga, la ausencia sí.** Puntajes bajos son datos; lo único que rompe la racha es no jugar.

---

## 1. Los 6 mini-juegos

### 🗂 Juego 1 — Sprint de Categorías
*Entrena: fluidez semántica (mecanismo §2.1).*

- **Ronda**: la app muestra una categoría (p. ej. "cosas que hay en una ferretería"). Tenés **60 segundos** para decir en voz alta todas las palabras que puedas.
- **Evaluación**: el STT transcribe; se cuentan **palabras únicas válidas** (normalizadas: minúsculas, sin tildes, singular/plural colapsado por stemming ligero). Repetidas no suman. Sin validación semántica estricta en el MVP: se confía en el jugador (juego personal), con opción de descartar palabras del resultado a mano.
- **Puntaje**: palabras únicas. **Bonus de racha semántica**: +1 por cada secuencia de 5 palabras sin pausa > 2 s (premia el flujo, no solo el total).
- **Progresión de dificultad**: niveles de categoría — amplias ("animales") → medias ("animales que vuelan") → estrechas ("herramientas de carpintero"). El nivel sube cuando tu mediana supera el umbral del nivel.
- **UI**: categoría gigante, cronómetro circular, las palabras reconocidas van apareciendo como chips en tiempo real (feedback inmediato: ver que la app te "escucha" es el gancho del juego).

### 🔤 Juego 2 — Letra Prohibida
*Entrena: fluidez fonémica + control ejecutivo (mecanismo §2.1).*

- **Ronda estándar**: 60 s para decir palabras que **empiecen con una letra** dada (letras calibradas para español: F, A, S clásicas; M, P, C fáciles; Ñ, X excluidas).
- **Variante "prohibida"** (la que da nombre al juego, nivel avanzado): decí palabras de una categoría **evitando** las que empiecen con la letra prohibida — obliga a monitorear y suprimir, el componente ejecutivo puro.
- **Reglas COWAT**: no valen nombres propios ni derivados de una ya dicha (perro → perrito). Validación: prefijo por string match; derivados detectados por stemming; nombres propios sin validar en MVP (descarte manual).
- **Puntaje y UI**: igual que Sprint de Categorías.

### 🚫 Juego 3 — Tabú Solitario
*Entrena: circunlocución / SFA — la estrategia de reparación para cuando la palabra no sale (mecanismo §2.2).*

- **Ronda**: aparece una carta con una **palabra objetivo** y **3 palabras prohibidas** (p. ej. objetivo: *brújula*; prohibidas: *norte*, *aguja*, *perderse*). Tenés **45 segundos** para describirla en voz alta sin decir ninguna de las 4.
- **Evaluación**:
  - **Violación**: si el transcript contiene la palabra objetivo o una prohibida (o su raíz), la carta se pierde. Detección automática, feedback sonoro inmediato.
  - **Éxito**: al terminar, la app muestra la descripción transcripta y preguntás: *¿un amigo la adivinaría?* — autoevaluación Sí/No en MVP. (Post-MVP: un LLM juzga si la descripción identifica la palabra.)
  - **Guía SFA opcional** (modo aprendizaje): la UI muestra los 6 slots del protocolo — *¿qué es? / ¿para qué sirve? / ¿cómo es? / ¿dónde está? / ¿con qué se asocia? / ¿a qué categoría pertenece?* — como checklist que se va marcando. Así el juego *enseña* la rutina de reparación, no solo la ejercita.
- **Puntaje**: cartas superadas de 5 por ronda; bonus por velocidad y por cubrir ≥ 4 slots SFA.
- **Contenido**: mazo inicial de ~150 cartas en español (seeds JSON), tres niveles: concretas (*bicicleta*) → abstractas (*nostalgia*) → técnicas/precisas (*ambigüedad*).

### ⏱ Juego 4 — Un Minuto Redondo
*Entrena: habla improvisada sostenida + desensibilización a la presión (mecanismo §2.5). Es el juego que más se parece a tu problema real.*

- **Ronda**: la app tira un **tema imprevisto** (p. ej. "algo que aprendiste tarde", "defendé una opinión impopular sobre comida") y tenés 5 segundos de preparación. Después: **hablar 60 segundos seguidos**.
- **Evaluación** (todo automático sobre transcript + timestamps):
  - **Muletillas/min**: diccionario configurable, default rioplatense: *este, eh, o sea, nada, tipo, digamos, viste, como que, ponele*.
  - **Pausas largas**: gaps > 2 s entre resultados del STT.
  - **WPM** y **secuencia fluida más larga** (palabras entre pausas largas).
- **Puntaje — "redondez" del minuto** (0–100): parte de 100, descuenta por muletilla que exceda tu línea base y por pausa larga, y bonifica WPM dentro de una banda **relativa a tu línea base personal** (±20 % del WPM de calibración; ni ametralladora ni arrastre). Sin objetivos absolutos: la meta de muletillas es −30 % vs. línea base, no cero — los fillers en dosis natural cumplen función comunicativa (Clark & Fox Tree, 2002).
- **Feedback post-ronda**: transcript con las muletillas resaltadas y las pausas marcadas como ▓. *Verse* trabarse es el feedback específico que acelera la práctica deliberada (§2.6).
- **Progresión**: 60 s → 90 s → 2 min; temas cotidianos → argumentativos → técnicos ("explicá qué es una API a tu abuela").

### 📖 Historias 4/3/2
*Entrena: proceduralización de la formulación por repetición con tiempo decreciente (mecanismo §2.3).*

- **Ronda** (la más larga, ~4 min total): elegís o te asignan una historia/tema (algo que te pasó, una película, cómo funciona algo). La contás **tres veces**: 90 s → 60 s → 45 s. Mismo contenido, menos tiempo: obliga a formular más rápido y más denso.
- **Evaluación**: WPM, muletillas y pausas **por intento**. La métrica estrella es el **delta intra-ronda**: la mejora del intento 1 al 3 (típicamente WPM ↑, pausas ↓ — el efecto Nation). Verla en vivo es inmediatamente gratificante y es la demostración empírica de que el método funciona.
- **Puntaje**: redondez del tercer intento + bonus por delta de mejora.
- **Frecuencia**: 2–3 veces por semana en la rotación (es el juego más demandante).

### 🎯 Palabra Precisa
*Entrena: vocabulario productivo con generación + recuperación espaciada (mecanismo §2.4).*

- **Ronda**: 8 tarjetas. Cada una muestra una **definición o un contexto con hueco** (p. ej. "Dícese del argumento que se contradice a sí mismo: ______" → *paradójico* / "No me convenció, su explicación era muy ______ (vaga, sin sustancia)" → *endeble*). Decís la palabra en voz alta; el STT verifica (match fonético tolerante).
- **Dirección de producción**: siempre definición → palabra (la dirección que falla en el TOT), nunca al revés.
- **Corrección de error obligatoria** (D'Angelo & Humphreys, 2015: los TOT no resueltos se re-aprenden como error): si fallás o te rendís, la app revela la palabra y **no avanza hasta que la digas en voz alta** (verificada por STT, con fallback de tipeo). Ver la respuesta sin producirla dejaría el bloqueo consolidado — es la regla científica más importante del juego.
- **SRS**: cada palabra es un ítem SM-2. Las falladas vuelven pronto; las sabidas se espacian (1, 3, 7, 16… días). La sesión mezcla ~5 repasos vencidos + ~3 palabras nuevas.
- **Banco personal**: además del banco semilla (~300 palabras útiles de registro medio-alto en español), podés **cargar tus propias palabras** — justo esas que "sabías pero no te salieron" en una conversación real. Ese ciclo (falla real → carga → práctica espaciada → disponible) es la kill feature de la app.
- **Puntaje**: aciertos al primer intento; los ítems SRS no penalizan el índice global (fallar un repaso es parte del algoritmo).

---

## 2. La sesión diaria

```
┌──────────────── SESIÓN DIARIA (~10 min) ────────────────┐
│  1. Calentamiento (fijo, 1 min)                          │
│     → Sprint de Categorías o Letra Prohibida             │
│  2. Plato principal (rotativo, 4-6 min)                  │
│     → Tabú Solitario | Un Minuto Redondo | Historias 4/3/2│
│  3. Postre (fijo, 2-3 min)                               │
│     → Palabra Precisa (repasos SRS del día)              │
└──────────────────────────────────────────────────────────┘
```

- **Onboarding/calibración** (primera vez): pantalla de prueba de micrófono con transcript en vivo (ves lo que el STT entiende) + una ronda de cada juego para fijar tu **línea base**. Sin línea base no hay índice: las metas de la app son relativas a vos.
- **Rotación del plato principal**: garantiza que cada mecanismo se practique ≥ 2×/semana. Regla concreta del scheduler: se prioriza el juego cuyo subíndice tiene la **peor pendiente en los últimos 7 días**; empate → el jugado hace más tiempo. (Mientras solo existan 3 juegos —iteración 1— la sesión es fija: Sprint → Minuto → Precisa.)
- **Modo libre**: fuera de la sesión diaria, cualquier juego se puede jugar suelto las veces que quieras; suma XP reducido (para que la sesión estructurada siga siendo el eje).
- **Modo sin voz** (fallback): los juegos 1, 2 y 6 tienen variante de tipeo; 3, 4 y 5 requieren micrófono y se saltean con reemplazo.

## 3. Métricas y progreso

### Índice de Fluidez (IF) — el número que sube

Compuesto 0–100, calculado como media móvil (7 días) de subíndices normalizados contra tu propia línea base. **Definición precisa de línea base**: por juego, la mediana de tus primeras 5 rondas de ese juego (la calibración aporta la primera). Mientras un subíndice no tenga línea base todavía, los pesos de los restantes se renormalizan para que el IF siempre sume sobre lo que sí hay datos. Los pesos son una **heurística inicial recalibrable** con datos reales:

| Subíndice | Fuente | Peso |
|---|---|---|
| Acceso léxico | palabras únicas/min en juegos 1–2 | 30 % |
| Soltura | redondez (muletillas + pausas + WPM) en juegos 4–5 | 30 % |
| Expresividad | tasa de éxito y cobertura SFA en juego 3 | 20 % |
| Precisión | aciertos primer intento en juego 6 | 20 % |

Normalizar contra la propia línea base evita el problema de calibración absoluta del STT: lo que importa es la pendiente, no el valor.

### Dashboard

- Curva del IF (diaria + media móvil 7d) con anotación de línea base.
- Curva por subíndice, muletilla más frecuente del mes, récords personales por juego.
- Contador TOT manual: un botón "hoy me trabé en una conversación real" — el outcome real que queremos bajar, correlacionable contra el IF (¿el entrenamiento transfiere? tu propio experimento n=1).

### Export y análisis por IA

Todo el desempeño queda registrado en la base local (IndexedDB) y sale de la app por dos vías:

1. **Exportar datos** (siempre disponible, gratis): descarga (a) un **JSON completo** — todas las rondas con métricas, transcripts, ítems SRS con su historial, stats diarias y settings — que sirve de backup/migración, y (b) un **reporte Markdown** con los agregados (curvas de IF, tendencias por juego, muletilla dominante, récords, reportes TOT) más un **prompt de análisis ya redactado** para pegar en Claude/ChatGPT: pide diagnóstico de cuellos de botella, comparación entre mecanismos, y ajustes concretos de práctica.
2. **"Analizar con IA" integrado** (opcional): botón que envía el reporte agregado (no los transcripts crudos completos) a la Claude API con **tu propia API key**, guardada solo en tu navegador. Devuelve el análisis dentro de la app. Costo: centavos por análisis; frecuencia sugerida: semanal.

## 4. Gamificación

- **Racha diaria**: completar la sesión mantiene la racha; 1 "protector de racha" ganable por semana perfecta. Es el mecanismo de adherencia principal (la dosis diaria es la variable que la evidencia más respalda).
- **XP y niveles**: XP por ronda (base + bonus por récord personal). Los niveles desbloquean contenido (categorías estrechas, cartas abstractas, temas técnicos, 2 minutos redondos) — la progresión de dificultad *es* la recompensa.
- **Récords personales**: celebración explícita al superar tu mejor marca por juego (compite contra vos, no contra un estándar).
- **Resumen semanal**: pantalla de domingo con IF de la semana, mejor momento, muletilla estrella y el delta 4/3/2 promedio.
- **Anti-patrones evitados**: sin ranking social (la presión social es lo que estamos desensibilizando, no un feature), sin castigo por puntaje bajo, sin loot boxes; la racha se protege pero no se compra.

## 5. Contenido inicial (seeds, español)

Archivos JSON versionados en el repo (editables sin tocar código):

| Seed | Volumen inicial | Estructura |
|---|---|---|
| `categorias.json` | ~120 categorías en 3 niveles | `{texto, nivel, umbral_palabras}` |
| `letras.json` | ~15 letras calibradas | `{letra, nivel}` |
| `tabu.json` | ~150 cartas en 3 niveles | `{objetivo, prohibidas[3], nivel}` |
| `temas.json` | ~100 temas en 3 niveles | `{texto, tipo: cotidiano\|argumentativo\|tecnico}` |
| `palabras.json` | ~300 ítems | `{palabra, definicion, contexto_hueco, nivel}` |
| `muletillas.json` | ~12 default rioplatense | `{token, variantes[]}` |

Generación: los seeds se redactan a mano/con asistencia de IA **en fase de implementación** y se revisan por calidad (una carta de Tabú mala arruina la ronda). El formato permite agregar mazos temáticos después (vocabulario de trabajo, entrevistas, etc.).
