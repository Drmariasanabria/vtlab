# MODAL WATCH — Inglés naval: verbos modales

Simulador de guardia de ingeniería marina para practicar los **verbos modales
del inglés** (`must`, `have to`, `should`, `may`, `might`, `can't have`,
`needn't have`…) en contexto técnico real: sala de máquinas, puente,
normativa SOLAS/MARPOL/STCW, inspecciones PSC, permisos de trabajo, etc.

Aplicación estática (HTML/CSS/JS, sin dependencias de compilación). Se abre
directamente o se publica en GitHub Pages junto al resto del repositorio.

## Funciones

- **41 preguntas** de opción múltiple sobre verbos modales, phrasal verbs y
  vocabulario del gremio, con explicación gramatical tras cada respuesta.
- **Cronómetro único de 15 minutos**, compartido por toda la sala: 18
  preguntas por partida a ritmo fijo (todos ven la misma pregunta a la vez).
- **Sistema de puntos**: puntos base por dificultad, bonus por rapidez,
  bonus de racha (3+ aciertos seguidos) y multiplicadores de eventos.
- **8 eventos en directo** (alarma de incendio, hombre al agua, inspección
  PSC, mar gruesa, apagón, vertido MARPOL…) que alteran la puntuación o el
  cronómetro de todos los jugadores a la vez, en el mismo instante — con
  sonido propio por evento y anuncio opcional por voz (🎙️).
- **Glosario del gremio**: 30 términos técnicos navales con su traducción
  oficial al español. Se puede abrir como panel completo (tarjetas que se
  giran al pulsarlas) o hacer clic directamente sobre el término resaltado
  dentro de cada pregunta.
- **Multijugador por código de sala** (5 caracteres) o por enlace directo
  copiable, con marcador en directo, **modo por equipos** (Tripulación A/B
  con marcador propio), **reacciones rápidas** con emoji flotantes entre
  jugadores, podio final animado y **reconexión automática** si se recarga
  la página a mitad de partida.
- **Modo solitario** y **reto diario** (mismas 18 preguntas para todo el
  mundo cada día, con tu mejor marca guardada) con el mismo motor.
- **Perfil persistente** (guardado en el navegador): XP acumulada,
  precisión global, categoría más floja, racha de días jugando el reto
  diario y una **galería de 8 insignias** desbloqueables.
- **Tarjeta de resultado descargable/compartible** (imagen generada al
  vuelo) al terminar cada guardia.
- Rango naval final (Grumete → Almirante de la Flota), revisión de
  preguntas falladas con su explicación.
- Sonido ambiente de sala de máquinas + efectos por evento (Web Audio, sin
  archivos externos, silenciable), lectura en voz alta de cada pregunta
  (🔈, práctica de listening), atajos de teclado (1-4 para responder),
  fondo animado de radar/estrellas, confeti y sacudida de pantalla,
  diseño responsive con tipografía grande.
- **Instalable como PWA** (manifest + service worker): se puede añadir a
  la pantalla de inicio y jugar sin conexión una vez cargada la primera
  vez.

## Uso rápido

Abre `index.html` en un navegador o publica la carpeta en GitHub Pages. No
requiere backend ni build. Sin configurar nada, el **modo local** ya
funciona: puedes crear una sala en una pestaña y unirte con el código en
otra pestaña del mismo navegador (usa `BroadcastChannel` + `localStorage`).

## Multijugador entre dispositivos (opcional, recomendado)

Para que varias personas se unan **desde sus propios móviles/portátiles**
con el código de sala, la app necesita un canal en tiempo real. Se usa
**Firebase Realtime Database** (plan gratuito «Spark», sin tarjeta):

1. Ve a <https://console.firebase.google.com>, crea un proyecto nuevo.
2. En el proyecto, añade una **app web** (icono `</>`) y copia el objeto
   `firebaseConfig` que te da.
3. En el menú lateral, entra en **Realtime Database → Crear base de
   datos**. Elige una región y empieza en **modo de prueba** (reglas
   abiertas temporalmente).
4. Sustituye las reglas por algo algo más contenido que el modo de prueba,
   por ejemplo:
   ```json
   {
     "rules": {
       "rooms": {
         "$code": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   Esto mantiene el resto de la base de datos cerrada. Sigue siendo
   público dentro de `rooms/*` (no hay login de usuarios: es un juego de
   trivia efímero, sin datos sensibles — solo nombres y puntuaciones).
   Borra manualmente los datos de `rooms` de vez en cuando desde la
   consola.
5. Pega el objeto de configuración en `rooms/modal-watch/firebase-config.js`:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "tu-proyecto.firebaseapp.com",
     databaseURL: "https://tu-proyecto-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "tu-proyecto",
     storageBucket: "tu-proyecto.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
6. Despliega. La cabecera mostrará «🌐 Multijugador en red» en lugar de
   «💻 Modo local».

Sin este paso, la app sigue siendo totalmente funcional en modo solitario y
en modo local (mismo navegador).

## Cómo funciona la sincronización

El cronómetro de 15 minutos y el orden de preguntas/eventos se generan con
un **generador pseudoaleatorio con semilla igual al código de sala**. Así,
todos los dispositivos calculan exactamente el mismo guion (qué pregunta y
qué evento toca en cada segundo) sin necesidad de que el servidor empuje
cada cambio: solo se sincroniza el instante de inicio (`startAt`) y las
puntuaciones de cada jugador, lo mínimo indispensable para tener una
partida realmente síncrona con un backend sencillo (o sin backend, en modo
local).

## Estructura

- `index.html` — pantallas (inicio, crear, unirse, lobby, partida,
  resultados, perfil) y modal de glosario.
- `style.css` — interfaz futurista (Orbitron/Rajdhani, HUD, neón, cristal).
- `data.js` — banco de 41 preguntas, 30 términos de glosario y 8 eventos.
- `sync.js` — motor determinista de guion + adaptadores de sincronización
  (`LocalAdapter` y `FirebaseAdapter`), equipos, reacciones y semilla diaria.
- `profile.js` — perfil persistente en `localStorage`: XP, estadísticas por
  categoría, insignias y racha del reto diario.
- `audio.js` — motor de sonido (hum ambiente, efectos por evento, voz).
- `share.js` — generador de la tarjeta de resultado (canvas → PNG).
- `firebase-config.js` — configuración opcional de Firebase (ver arriba).
- `app.js` — lógica de interfaz, temporizador, puntuación y eventos.
- `manifest.webmanifest` / `sw.js` / `icon-*.png` — soporte PWA (instalable,
  funciona sin conexión tras la primera carga).

## Límites

El modo local solo sincroniza pestañas del mismo navegador, no dispositivos
distintos. Las reglas de Firebase en el ejemplo son abiertas dentro de
`rooms/*` (sin autenticación): adecuado para una práctica de aula o entre
compañeros, no para datos sensibles. El perfil e insignias se guardan en
`localStorage` de cada navegador/dispositivo: no hay cuenta ni sincronización
de perfil entre dispositivos. El modo sin conexión (PWA) cubre la interfaz y
el contenido ya cacheado; el multijugador en red, las tipografías de Google
Fonts y la voz de puente (si el navegador la resuelve en la nube) siguen
necesitando conexión. No se implementó lectura de código QR por evitar una
dependencia externa no verificable desde este entorno: en su lugar, la sala
se puede compartir con un enlace directo (`?join=CÓDIGO`) que autorrellena
el formulario de unirse.
