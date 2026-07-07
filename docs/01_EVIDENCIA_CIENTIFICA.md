# Evidencia científica: cómo se mejora la fluidez verbal y la recuperación de palabras

Este documento responde la pregunta: **¿qué está comprobado que funciona para hablar mejor** — en el sentido de poder expresarse como uno quiere, que salgan las palabras que uno necesita, sin trabarse ni quedarse en blanco?

Primero el diagnóstico del problema, después los mecanismos con evidencia (cada uno mapeado al mini-juego que lo entrena), y al final lo que la evidencia dice que **no** conviene priorizar.

---

## 1. El problema: qué pasa cuando "no sale la palabra"

Trabarse o no encontrar la palabra adecuada no es (en general) un problema de conocimiento — la palabra está en tu léxico — sino de **acceso**: la producción del habla requiere pasar en milisegundos del concepto (semántica) a la forma de la palabra (fonología) y de ahí a la articulación. El fenómeno de **punta de la lengua** (*tip-of-the-tongue*, TOT) está bien estudiado: la falla ocurre típicamente en la conexión semántica → fonológica; sabés *qué* querés decir pero la forma sonora no se activa completa ([Burke et al., 1991](https://www.sciencedirect.com/science/article/abs/pii/0749596X9190026G); [Shafto et al., 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC2373253/)).

Tres hechos relevantes para el diseño de la app:

1. **Es un problema de conexiones débiles, no de memoria borrada.** El modelo dominante (*Transmission Deficit Hypothesis*, Burke & MacKay) sostiene que las conexiones léxicas se debilitan con el desuso y se fortalecen con el uso. Corolario directo: **recuperar palabras activamente las hace más accesibles la próxima vez**.
2. **La frecuencia de uso importa.** Las palabras que fallan son desproporcionadamente las de baja frecuencia y uso reciente escaso ([revisión sobre TOT y envejecimiento](https://pmc.ncbi.nlm.nih.gov/articles/PMC7500633/)). Practicar la producción de vocabulario preciso reduce la tasa de fallas.
3. **La ansiedad y la carga cognitiva agravan el bloqueo.** La presión social consume memoria de trabajo, y la memoria de trabajo es justo el recurso que la formulación del habla necesita. Por eso uno se traba *más* en conversaciones importantes que hablando solo. Reducir la reactividad a esa presión es entrenable (ver §2.5).
4. **Los bloqueos se auto-refuerzan si no se resuelven.** [D'Angelo & Humphreys (2015, *Cognition*)](https://www.sciencedirect.com/science/article/abs/pii/S0010027715300020) mostraron en seis experimentos que un estado de punta de la lengua **aumenta la probabilidad de repetirse con la misma palabra** — el cerebro aprende implícitamente el estado de error, y el efecto persiste al menos una semana. Pero cuando el TOT **se resuelve** (la palabra se recupera, sola o con pistas), ese aprendizaje erróneo se corrige. Convergente: [los "interlopers" fonológicos tienden a repetirse cuando el TOT se repite](https://pmc.ncbi.nlm.nih.gov/articles/PMC6393332/). **Consecuencia crítica de diseño**: cuando fallás una palabra, nunca alcanza con *ver* la respuesta — hay que **producirla en voz alta** para sobrescribir el error; y dejar un bloqueo sin resolver ("bah, no importa") lo consolida.

**Implicación de diseño**: la app debe (a) forzar recuperación léxica activa y repetida, (b) hacerlo con presión de tiempo para simular la demanda real de una conversación, (c) obligar a resolver cada fallo produciendo la palabra correcta en voz alta, y (d) medir el progreso con métricas objetivas.

---

## 2. Mecanismos con evidencia (y el mini-juego que entrena cada uno)

### 2.1 Práctica de recuperación con presión temporal — fluidez semántica y fonémica

**Qué es**: generar la mayor cantidad de palabras posible en 60 segundos, ya sea de una categoría ("animales", "cosas de la cocina") — *fluidez semántica* — o que empiecen con una letra — *fluidez fonémica*. Son las tareas estándar de la neuropsicología (COWAT / FAS) para medir acceso léxico y control ejecutivo ([Tremblay et al., 2025, revisión de factores de fluidez verbal](https://nyaspubs.onlinelibrary.wiley.com/doi/abs/10.1111/nyas.70064)).

**Evidencia de que es entrenable**:
- Ensayos controlados de entrenamiento cognitivo multidominio con componente verbal en adultos muestran mejoras en fluidez verbal tras el entrenamiento ([RCT de 16 semanas, entrenamiento cognitivo y fluidez de palabras](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7701175/); [estudio multimodal a gran escala de flexibilidad cognitiva](https://pmc.ncbi.nlm.nih.gov/articles/PMC5701641/)).
- Un programa de entrenamiento computarizado en casa mostró mejoras selectivas en fluidez verbal frente a grupo control activo ([Payne & Stine-Morrow, 2017](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5550674/)).
- La práctica de fluidez por categorías es un ejercicio clásico recomendado en terapia de recuperación de palabras para adultos ([ejercicios de recuperación léxica](https://sciencefix.blog/sharpen-mind-12-word-retrieval-exercises-adults); [guía clínica de Expressable](https://www.expressable.com/learning-center/adults/are-you-having-trouble-finding-words-try-these-tips)).

**Por qué funciona**: cada palabra recuperada bajo presión es un "rep" que fortalece la vía concepto → forma (efecto de práctica de recuperación, uno de los efectos más robustos de la psicología del aprendizaje). Además entrena la **búsqueda estratégica** en el léxico (clustering por subcategorías y switching entre ellas), que es exactamente lo que hacés cuando buscás la palabra justa en una conversación.

**→ Mini-juegos**: *Sprint de Categorías* (semántica) y *Letra Prohibida* (fonémica).

### 2.2 Circunlocución y Semantic Feature Analysis (SFA) — la estrategia de reparación

**Qué es**: cuando una palabra no sale, describir sus rasgos — categoría, uso, apariencia, dónde se encuentra, con qué se asocia — hasta que (a) la palabra emerge por auto-activación, o (b) el interlocutor te entiende igual. SFA es el protocolo clínico que sistematiza esto.

**Evidencia**:
- SFA cuenta con una **revisión sistemática favorable** como tratamiento de las dificultades de denominación: mejora consistente en la recuperación de las palabras tratadas y de palabras semánticamente relacionadas ([Boyle, 2013, revisión sistemática de SFA](https://www.researchgate.net/publication/261292804_The_effectiveness_of_semantic_feature_analysis_An_evidence-based_systematic_review)).
- El entrenamiento en circunlocución mejora la denominación y funciona como estrategia de auto-cueing: describir los rasgos activa la red semántica de la palabra y frecuentemente "destraba" su forma ([circumlocution-induced naming](https://www.researchgate.net/publication/240040415_Circumlocution-induced_naming_CIN_A_treatment_for_effecting_generalisation_in_anomia); [ASHA sobre circunlocución semántica](https://pubs.asha.org/doi/10.1044/2015_AJSLP-14-0154)).
- Incorporar el entrenamiento explícito de la estrategia (metacognición: "cuando no me sale, describo") produce ganancias tanto restitutivas como sustitutivas ([estudio de estrategia metacognitiva + SFA](https://pmc.ncbi.nlm.nih.gov/articles/PMC10561971/)).

**Nota honesta sobre la evidencia**: la investigación de SFA es principalmente en afasia (daño neurológico), no en adultos sanos. Pero el mecanismo — activación de la red semántica facilita el acceso a la forma — es general, y el valor pragmático es universal: aunque la palabra exacta no aparezca, **nunca más te quedás callado**, porque tenés una rutina automática de "hablar alrededor" de la palabra. Es doble seguro: o la palabra sale, o te expresás igual.

**Por qué es *el* ejercicio para tu problema**: el juego Tabú (describir una palabra sin decirla ni usar las palabras prohibidas) es literalmente SFA gamificado con presión de tiempo. Entrena la habilidad exacta que falla cuando te trabás.

**→ Mini-juego**: *Tabú Solitario*.

### 2.3 Repetición de tarea con tiempo decreciente — técnica 4/3/2

**Qué es**: contar el mismo tema/historia tres veces seguidas, con tiempo decreciente (clásicamente 4, 3 y 2 minutos; la app usa 90/60/45 segundos). La repetición libera recursos de planificación de contenido, y el tiempo decreciente fuerza a proceduralizar la formulación.

**Evidencia**:
- Técnica propuesta y validada por Paul Nation (Nation, 1989, "Improving speaking fluency", *System*, 17(3)): aumenta la velocidad de habla y reduce vacilaciones dentro de la sesión, con mejoras que persisten.
- De Jong & Perfetti (2011, *Language Learning*, 61(2), "Fluency training in the ESL classroom") mostraron el resultado clave: la mejora en fluidez con repetición 4/3/2 **transfiere a temas nuevos** — es decir, no es solo memorizar un discurso, sino proceduralización del proceso de formulación (más automatismo en armar frases).
- La literatura de *task repetition* en adquisición de lenguas replica consistentemente el efecto: repetir una tarea de habla mejora fluidez (menos pausas, mayor velocidad) y libera atención para la precisión.

**Nota honesta**: la evidencia es de segundas lenguas (L2). En lengua materna el techo es más alto y el efecto por sesión será menor, pero el mecanismo (proceduralización de la formulación por repetición bajo presión) aplica igual — y tu problema (formulación lenta/trabada bajo presión) es funcionalmente el mismo que el del hablante L2 fluido pero no automático.

**→ Mini-juego**: *Historias 4/3/2*.

### 2.4 Efecto de producción/generación + repetición espaciada — vocabulario preciso

**Qué es**: para tener disponible la palabra *precisa* (no "esa cosa", sino "el picaporte"; no "raro", sino "contraintuitivo"), hay que practicarla **produciéndola**, no leyéndola, y re-practicarla espaciadamente.

**Evidencia** (cuatro de los efectos más replicados de la ciencia cognitiva):
- **Efecto de generación**: lo que producís activamente se retiene mejor que lo que leés (Slamecka & Graf, 1978, y cientos de replicaciones).
- **Efecto de testing / práctica de recuperación**: recuperar de memoria fortalece más que re-estudiar (Roediger & Karpicke, 2006).
- **Efecto de producción**: decir algo en voz alta lo consolida más que leerlo en silencio (MacLeod et al., 2010) — por eso en la app todo se habla, nada se lee pasivamente.
- **Repetición espaciada**: los repasos espaciados en el tiempo producen retención muy superior a los masivos (Cepeda et al., 2006, metaanálisis). El algoritmo SM-2 (Anki) es la implementación estándar.
- **Corrección de errores obligatoria** (§1, punto 4): tras un fallo, la app exige decir la palabra correcta en voz alta antes de continuar — de lo contrario el fallo mismo se consolida (D'Angelo & Humphreys, 2015).

**Aplicación al problema TOT**: dado que las fallas de punta de la lengua se concentran en palabras de baja frecuencia de uso (§1), un banco personal de "palabras que quiero tener disponibles" + recuperación espaciada ataca directamente la causa. El formato correcto es **definición → producir la palabra** (dirección de producción), no palabra → definición (dirección de comprensión, que es la que ya tenés resuelta).

**→ Mini-juego**: *Palabra Precisa* (con scheduler SM-2 para reciclar las que fallaste).

### 2.5 Exposición a habla improvisada — bajar la interferencia de la ansiedad

**Qué es**: hablar sin guion sobre temas imprevistos, repetidamente. El objetivo no es solo léxico: es des-sensibilizar la respuesta de alarma que consume la memoria de trabajo justo cuando la necesitás para formular.

**Evidencia**:
- El entrenamiento en teatro de improvisación reduce significativamente la ansiedad social y la intolerancia a la incertidumbre ([Felsman et al., estudio en 14 escuelas, programa de 10 semanas](https://www.sciencedirect.com/science/article/abs/pii/S0197455618301928)).
- La práctica repetida de hablar en público — incluso frente a audiencias virtuales — reduce la ansiedad de hablar sesión a sesión ([entrenamiento en VR, reducción intra-sesiones](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6544213/)).
- La improvisación entrena específicamente pensar y articular en tiempo real y tolerar el error ([improv y habilidades de comunicación](https://www.expressable.com/learning-center/adults/improve-your-communication-skills-with-improv)).

**Por qué importa para vos**: si te trabás *más* en conversación que hablando solo, una parte del problema es de interferencia (presión → menos memoria de trabajo → peor acceso léxico), no de léxico. La exposición repetida a hablar improvisado con "algo en juego" (el juego mide y puntúa) reduce esa interferencia. Hablar 60 segundos sin parar sobre un tema random, todos los días, es la versión mínima y solitaria de este entrenamiento.

**→ Mini-juego**: *Un Minuto Redondo*.

### 2.6 Medición objetiva y feedback — el multiplicador

No es un "ejercicio" sino una condición de eficacia: la literatura de adquisición de destrezas (práctica deliberada, Ericsson) es unánime en que la práctica mejora mucho más rápido con **feedback específico e inmediato** que a ciegas. Las métricas estándar de fluidez del habla en la investigación son medibles automáticamente con el transcript y los timestamps:

| Métrica | Qué indica | Cómo se mide |
|---|---|---|
| Palabras únicas válidas / min | Capacidad de acceso léxico | Conteo sobre transcript (juegos de listas) |
| Velocidad de habla (WPM) | Automatismo de formulación | Palabras / tiempo hablado |
| Muletillas / min ("este", "eh", "o sea", "nada", "tipo") | Micro-bloqueos de formulación | Matcheo sobre transcript |
| Pausas largas (> 2 s) | Bloqueos de acceso/planificación | Gaps entre resultados intermedios del STT |
| Longitud media de secuencia fluida | Soltura sostenida | Palabras entre pausas largas |

Dos calibraciones importantes para no entrenar mal:

- **Las muletillas no son el enemigo; el exceso sí.** Clark & Fox Tree (2002, *Cognition*, "Using *uh* and *um* in spontaneous speaking") mostraron que los fillers cumplen funciones comunicativas reales (retener el turno, anunciar una pausa de planificación). Un habla natural tiene fillers; el objetivo es reducir el **exceso respecto de tu propia línea base** (meta inicial: −30 %), no llegar a cero robot.
- **Los objetivos son relativos a tu línea base, no absolutos.** La velocidad de habla conversacional en español varía mucho entre hablantes y dialectos, y el STT introduce su propio sesgo de conteo. Por eso todas las metas (WPM, muletillas, pausas) se calibran contra tus primeras sesiones y miden **pendiente**, no valor absoluto.

Estas métricas componen el **índice de fluidez** de la app (ver diseño), que convierte "siento que hablo mejor" en una curva medible — coherente con el principio del repo: telemetría, no resultados binarios.

---

## 3. Qué NO priorizar (evidencia débil o transferencia pobre)

Para no gastar esfuerzo de desarrollo en lo que no rinde:

- **Entrenamiento de memoria de trabajo "puro"** (n-back, repetir dígitos, retener oraciones): los RCTs muestran mejoras en la tarea entrenada pero **transferencia débil o nula** al lenguaje real ([RCT de entrenamiento de WM a nivel de oración: sin transferencia](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2017.00014/full)). La app no incluye juegos de memoria pura: toda la memoria de trabajo se entrena *dentro* de tareas de habla real.
- **Apps genéricas de "brain training"**: la transferencia lejana de los juegos cognitivos genéricos a habilidades de la vida real es el hallazgo negativo más consistente del área. Por eso esta app entrena **la conducta objetivo directamente** (hablar), que es exactamente tu intuición — y la evidencia te da la razón: el principio de especificidad de la práctica dice que mejorás en lo que practicás.
- **Consumo pasivo** (leer/escuchar mucho vocabulario sin producirlo): mejora el léxico receptivo, no el productivo. Útil como complemento, insuficiente como entrenamiento.

**Factores de soporte fuera de la app** (evidencia real, pero no son features): el ejercicio aeróbico regular se asocia con mejor fluidez verbal y menos episodios TOT ([fitness cardiorrespiratorio y TOT](https://www.biorxiv.org/content/10.1101/2023.12.08.570799.full.pdf)), y la privación de sueño degrada la fluidez. Dormir bien y moverse son el "stack de infraestructura" del habla.

---

## 4. Síntesis: tabla mecanismo → ejercicio → mini-juego

| # | Mecanismo (evidencia) | Ejercicio validado | Mini-juego en la app |
|---|---|---|---|
| 1 | Práctica de recuperación bajo presión fortalece el acceso léxico | Fluidez semántica 60 s (tarea COWAT) | 🗂 **Sprint de Categorías** |
| 2 | Ídem, vía fonológica + control ejecutivo | Fluidez fonémica 60 s (FAS) | 🔤 **Letra Prohibida** |
| 3 | SFA / circunlocución: activar rasgos destraba la palabra y es estrategia de reparación | Describir sin nombrar (protocolo SFA) | 🚫 **Tabú Solitario** |
| 4 | Exposición reduce ansiedad; la ansiedad bloquea la formulación | Habla improvisada repetida | ⏱ **Un Minuto Redondo** |
| 5 | Repetición de tarea + presión temporal proceduraliza la formulación | Técnica 4/3/2 (Nation; de Jong & Perfetti) | 📖 **Historias 4/3/2** |
| 6 | Generación + testing + espaciado consolidan vocabulario productivo | Recuperación espaciada en dirección de producción | 🎯 **Palabra Precisa** |
| 7 | Resolver el fallo corrige el aprendizaje del error (TOT) | Producir la palabra correcta en voz alta tras cada fallo | ✅ Corrección obligatoria (transversal) |
| 8 | Feedback específico acelera la práctica deliberada | Métricas objetivas de fluidez, relativas a línea base | 📊 Dashboard + índice de fluidez |

**Dosis recomendada por la literatura de práctica**: sesiones cortas y frecuentes superan a sesiones largas y esporádicas (espaciado). De ahí el formato: **~10 minutos diarios, todos los días**, con racha como incentivo. Expectativa honesta (sin cifras infladas): las mejoras **dentro de la app** (efecto práctica en las métricas) deberían ser medibles en 2–3 semanas; la transferencia **percibida en conversaciones reales** es más lenta y variable — horizonte razonable de 2–3 meses de práctica diaria, monitoreable con el contador "me trabé hoy" del dashboard (tu propio experimento n=1).

---

## Fuentes

- Burke, MacKay, Worthley & Wade (1991). [On the tip of the tongue: What causes word finding failures?](https://www.sciencedirect.com/science/article/abs/pii/0749596X9190026G) *Journal of Memory and Language*.
- D'Angelo & Humphreys (2015). [Tip-of-the-tongue states reoccur because of implicit learning, but resolving them helps](https://www.sciencedirect.com/science/article/abs/pii/S0010027715300020). *Cognition*.
- [Phonological interlopers tend to repeat when TOT states repeat](https://pmc.ncbi.nlm.nih.gov/articles/PMC6393332/).
- Clark & Fox Tree (2002). Using *uh* and *um* in spontaneous speaking. *Cognition*, 84(1).
- MacLeod, Gopie, Hourihan, Neary & Ozubko (2010). The production effect: delineation of a phenomenon. *JEP: Learning, Memory, and Cognition*.
- Shafto et al. (2007). [On the Tip-of-the-Tongue: Neural Correlates of Increased Word-finding Failures in Normal Aging](https://pmc.ncbi.nlm.nih.gov/articles/PMC2373253/).
- [TOT en adultos con quejas subjetivas de memoria](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7500633/) — frecuencia y perfil del fenómeno.
- Tremblay et al. (2025). [Exploring Factors Affecting Verbal Fluency](https://nyaspubs.onlinelibrary.wiley.com/doi/abs/10.1111/nyas.70064). *Annals of the NY Academy of Sciences*.
- [RCT: entrenamiento cognitivo multidominio mejora fluidez de palabras](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7701175/).
- [Estudio multimodal de flexibilidad cognitiva con control activo](https://pmc.ncbi.nlm.nih.gov/articles/PMC5701641/).
- Payne & Stine-Morrow (2017). [Entrenamiento en casa: mejoras selectivas en fluidez verbal](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5550674/).
- Boyle (2013). [The effectiveness of semantic feature analysis: an evidence-based systematic review](https://www.researchgate.net/publication/261292804_The_effectiveness_of_semantic_feature_analysis_An_evidence-based_systematic_review).
- [Circumlocution-induced naming (CIN)](https://www.researchgate.net/publication/240040415_Circumlocution-induced_naming_CIN_A_treatment_for_effecting_generalisation_in_anomia).
- [Verbal Description of Concrete Objects (ASHA)](https://pubs.asha.org/doi/10.1044/2015_AJSLP-14-0154).
- [Estrategia metacognitiva + tratamiento semántico](https://pmc.ncbi.nlm.nih.gov/articles/PMC10561971/).
- Nation (1989). Improving speaking fluency. *System*, 17(3). / De Jong & Perfetti (2011). Fluency training in the ESL classroom. *Language Learning*, 61(2).
- Felsman et al. [Improvisational theater reduce ansiedad social](https://www.sciencedirect.com/science/article/abs/pii/S0197455618301928). *The Arts in Psychotherapy*.
- [Práctica repetida en VR reduce ansiedad de hablar en público](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6544213/).
- [RCT: entrenamiento de memoria de trabajo verbal sin transferencia](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2017.00014/full).
- [Fitness cardiorrespiratorio y experiencias TOT](https://www.biorxiv.org/content/10.1101/2023.12.08.570799.full.pdf).
- Guías de ejercicios: [Sciencefix — 12 word retrieval exercises](https://sciencefix.blog/sharpen-mind-12-word-retrieval-exercises-adults), [Expressable — word finding tips](https://www.expressable.com/learning-center/adults/are-you-having-trouble-finding-words-try-these-tips), [Expressable — improv](https://www.expressable.com/learning-center/adults/improve-your-communication-skills-with-improv).
