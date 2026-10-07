# Elteto

Veinte juegos de cartas y tablero para jugar desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas y jugadores de IA, con o sin internet.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages al actualizar `main`.

Con internet, el anfitrión crea una sala y la web muestra un código, un enlace y un QR. Cada invitado escanea el QR con la cámara normal del móvil, abre el enlace o escribe el código; si ya había usado Elteto, se recuerda su nombre.

Las salas viven en Firestore, con invitados anónimos de Firebase Authentication y reglas de seguridad, igual que el juego online de Timeline. El anfitrión conserva la autoridad de las reglas del juego y publica una vista privada por jugador, de modo que cada persona solo recibe sus propias cartas. Si el anfitrión desaparece, otra persona toma el relevo y continúa la partida guardada. No hay un servidor de juego propio.

Arquitectura, modelo de datos, reglas, configuración de Firebase y pruebas: [CONFIGURAR_ONLINE.md](CONFIGURAR_ONLINE.md).

Para probarlo, abre [Elteto en GitHub Pages](https://fercho-93.github.io/Elteto/) en ambos teléfonos, crea la partida en uno, pulsa **Invitar con internet** y entra desde el otro con el QR o el código.

Cinquillo admite de dos a seis participantes. Mus necesita cuatro. Parchís admite de dos a cuatro.

### Completar la mesa con IA

En el vestíbulo de cualquiera de los veinte juegos, el anfitrión puede pulsar **Completar mesa con IA** para ocupar todas las plazas libres. Puedes empezar tú solo o mezclar personas e IA, y quitar una IA antes de empezar para dejar sitio a alguien. Los nombres «IA 1», «IA 2», etc. las identifican durante la partida.

Los jugadores de IA deciden en el dispositivo anfitrión, sin servicios externos ni claves de API, usando únicamente su vista del juego. Sus jugadas pasan por los mismos motores de reglas y avanzan automáticamente. Funciona en la web, sin internet y en Android LAN; el cliente nativo también comparte estos controles. En las salas online, la IA continúa cuando otra persona toma el relevo del anfitrión. Las reglas actualizadas de `firestore.rules` deben estar publicadas para añadir plazas de IA online.

### Jugar sin internet entre iPhone y Android

El modo **Sin internet** no usa Firebase ni un servidor de señalización. La app crea la conexión WebRTC directa e intercambia la oferta y la respuesta mediante dos códigos QR. Este modo está disponible en la web instalable de GitHub Pages para Safari en iPhone y Chrome en Android.

1. Antes de salir de casa, abre [Elteto en Pages](https://fercho-93.github.io/Elteto/) en los dos móviles y espera a que cargue. Instálalo con «Añadir a pantalla de inicio» si quieres; así el navegador guarda la app para abrirla después sin cobertura. Hazlo una vez mientras tengas internet.
2. En el lugar sin cobertura, conecta los dos móviles a la misma Wi‑Fi local. Si no hay router, activa el **punto de acceso Wi‑Fi** de uno de ellos y conecta el otro. La red puede no tener salida a internet.
3. En el móvil anfitrión, abre Elteto, crea la sala, elige el juego y toca **Invitar sin internet**.
4. En el otro móvil, abre Elteto, toca **Unirse**, escribe el nombre y escanea el primer QR con **Abrir cámara dentro de Elteto**. La cámara normal no puede abrir un código SDP sin internet.
5. El invitado verá un segundo QR. El anfitrión lo escanea con **Escanear respuesta**. Al conectar, ambos vuelven a la sala y el anfitrión puede iniciar la partida.

Los dos móviles deben permanecer en la misma red local y dejar Elteto abierto durante la partida. El modo offline de navegador requiere que la app se haya cargado previamente mientras había internet: GitHub Pages no puede entregar por primera vez la app cuando no hay conexión. Cinquillo ya permite jugar con dos personas; Mus necesita cuatro plazas, que se pueden completar con IA.

Si una sala usa **Invitar con internet**, no se pueden mezclar invitados sin internet en ella: elige un modo al abrir la mesa.

La web se puede instalar desde el navegador con «Añadir a pantalla de inicio».

## Desarrollo web

Requisitos: Node.js 20 o posterior.

```bash
npm ci
npm run build:web
npm test              # motores, privacidad, puntuación, catálogo y caché
npm run test:reglas   # reglas de Firestore (emulador, necesita Java)
npm run test:online   # sesiones online completas (emuladores)
```

El sitio compilado aparece en `dist/`. Para probarlo localmente, sírvelo desde HTTPS o desde `localhost`, porque el navegador restringe WebRTC, el acceso a la cámara y la instalación PWA en orígenes inseguros.

## Nueva prueba: Android anfitrión e invitados por navegador

`apps/android-host/` añade una app Android que sirve Elteto por HTTP y WebSocket en una red local. iPhone y Android invitados entran con un solo QR desde su navegador, sin Firebase ni una descarga previa de la web. El catálogo habilita los veinte juegos y requiere mantener abierta la app anfitriona. Instalación, arquitectura y límites: [CONFIGURAR_LAN.md](CONFIGURAR_LAN.md).

## App móvil nativa

`apps/mobile/` conserva el cliente Expo para las compilaciones móviles nativas. Comparte el motor de reglas con la versión web, en `packages/game-core/`.

## Motor de reglas

`packages/game-core/` contiene los motores puros de los veinte juegos. Cada motor valida las acciones, conserva el estado completo en el anfitrión y produce una vista individual para cada jugador.

## Mesa y evolución de los juegos

La web y Android LAN comparten una mesa ilustrada en 2D y diez retratos originales con volumen pintado. Cinquillo y Mus muestran los rivales en una fila discreta fuera del tapete, con nombre y cantidad de cartas separados del retrato; Mus identifica también al compañero y las parejas. La mano propia y las decisiones permanecen visibles. Cinquillo presenta un resumen de puntos al cerrar cada mano y un resultado final de partida. Las caras usan dos barajas tradicionales completas, española (48 ilustraciones, seleccionando 40 cuando corresponde) y francesa (52), guardadas localmente con sus créditos. Cinquillo muestra completos los extremos de cada palo, sin números añadidos sobre las ilustraciones, en cuatro columnas en móvil vertical y cuatro zonas en pantallas amplias y altas. La mano permanece visible, con filtros por palo y controles junto a las cartas; marcador y reglas se consultan desde el menú. «Ver todas las cartas» permite consultar la escalera completa a mayor tamaño. La composición está documentada en [design/MESA_2D.md](design/MESA_2D.md). Las reglas implementadas, pruebas y pasos para añadir juegos se detallan en [MESA_Y_REGLAS.md](MESA_Y_REGLAS.md).

## Reglas y ampliación de juegos

Las [reglas aportadas](reglas_juegos/README.md) conservan los 20 reglamentos originales. La biblioteca está en `reglas_juegos/biblioteca.html` y en la portada del juego. El [catálogo y la arquitectura](MESA_Y_REGLAS.md) describen los veinte motores disponibles y sus variantes. Nuevas mesas de Cinquillo: española 40, cinco de oros y puntuación a 30; Mus: ocho reyes/ases, juegos a 40 y partida a tres juegos.

Parchís: tablero clásico de cuatro colores, dados y movimientos legales, barreras, seguros, capturas y llegada exacta. La edición digital y las decisiones no detalladas por el PDF están en [design/PARCHIS.md](design/PARCHIS.md).
