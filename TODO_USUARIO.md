# TODO — cosas que tenés que hacer vos (Juan Cruz)

Yo (el agente) no puedo usar un micrófono real, ni crear el repo, ni tocar la config de tu cuenta de GitHub, ni crear tu API key. Esto es lo que queda de tu lado, ordenado por prioridad.

## 1. Crear el repo en GitHub (2 min) — bloqueante
No pude crearlo por API (la integración no tiene ese permiso). Hacelo vos:
1. Andá a https://github.com/new
2. Nombre: **`fluidez-app`** · Visibilidad: **Public** · **NO** marques "Add a README" (dejalo vacío).
3. Crealo. Después avisame ("listo") y yo subo todo el código.
   - Para que yo pueda pushear, la GitHub App de Claude tiene que tener acceso al repo nuevo. Si tu instalación es "All repositories", ya está. Si es "Only select repositories", agregá `fluidez-app` en https://github.com/settings/installations

## 2. Habilitar GitHub Pages (una sola vez)
En el repo nuevo: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
- URL final: **https://juancruzeiriz.github.io/fluidez-app/**
- Si el workflow "Deploy to Pages" falla la primera vez, casi siempre es por este paso. Habilitalo y re-corré el workflow.

## 3. Probar la app localmente (5 min)
```bash
git clone https://github.com/juancruzeiriz/fluidez-app.git
cd fluidez-app
npm install
npm run dev            # abrí http://localhost:5173
```
Dale permiso al micrófono y hacé el onboarding. **Confirmá que el reconocimiento de voz entiende bien tu español** — es el único supuesto que no pude verificar por código.
- Si entiende bien → listo.
- Si entiende mal o no capta nada → avisame y activamos el **plan B**: Whisper on-device (`transformers.js`), sin depender de Google. El hook `useSpeech` ya está pensado para cambiarlo sin tocar los juegos.

## 4. Instalar la PWA en el celular
Abrí `https://juancruzeiriz.github.io/fluidez-app/` en **Chrome (Android)** → menú → "Agregar a pantalla de inicio". Dale permiso de micrófono.
> ⚠️ iPhone/Safari tiene soporte limitado de Web Speech API. Si usás iPhone, avisame y priorizamos el plan B de Whisper.

## 5. (Opcional) Análisis automático por IA
El análisis **gratis** ya funciona: en Ajustes → "Reporte + prompt" bajás un `.md` con tus datos y un prompt listo para pegar en cualquier IA.
Si querés el botón **"Analizar mi progreso"** dentro de la app:
1. Creá una API key en https://console.anthropic.com
2. Pegala en **Ajustes → API key** (se guarda solo en tu navegador).
3. Tiene costo por uso (centavos por análisis).

## 6. Usarla todos los días (lo más importante)
- Hacé la **sesión diaria** (~10 min). La constancia es lo que la evidencia más respalda.
- Cuando te trabes en una conversación real, tocá **"Me trabé recién"** en la home — es tu experimento n=1 para ver si el entrenamiento transfiere.
- En **Palabra Precisa**, las palabras que no te salgan en la vida real podés agregarlas al seed `src/seeds/palabras.json` (la carga desde la UI llega en la iteración 2).
- Las primeras ~5 sesiones fijan tu **línea base**; recién ahí el Índice de Fluidez es informativo. Esperá 2–3 semanas para ver tendencia.

## 7. Backup de tus datos
Los datos viven en el navegador (IndexedDB), por dispositivo. **Exportá el backup JSON** (Ajustes → "Backup JSON") una vez por semana y antes de cambiar de navegador/dispositivo. Para migrar: Ajustes → "Importar backup".

---

## Si querés que siga (iteración 2)
Avisame y agrego: Tabú Solitario, Letra Prohibida, Historias 4/3/2, alta de palabras propias desde la UI, y el resumen semanal. Todo el andamiaje (métricas, SRS, índice, scheduler) ya está listo.
