# Elteto

Veinte juegos de cartas y tablero para jugar desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas y jugadores de IA, con o sin internet.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages al actualizar `main`.

Con internet, el anfitrión crea una sala y la web muestra un código, un enlace y un QR. Cada invitado escanea el QR con la cámara normal del móvil, sin abrir la app, o escribe el código en la web; si ya había usado Elteto, se recuerda su nombre.

Las salas viven en Firestore, con invitados anónimos de Firebase Authentication y reglas de seguridad. El anfitrión activado conserva la autoridad de las reglas del juego y publica una vista privada por jugador, de modo que cada persona solo recibe sus propias cartas. Los invitados no toman el relevo del anfitrión ni pueden crear salas. No hay un servidor de juego propio.

Arquitectura, modelo de datos, reglas, configuración de Firebase y pruebas: [CONFIGURAR_ONLINE.md](CONFIGURAR_ONLINE.md).

Crear una partida no pide cuenta ni contraseña: basta con tocar la llama de la pantalla principal.
Las salas con internet usan el acceso de desarrollo mientras esté habilitado; después,
el anfitrión se activa con una invitación de un solo uso y una cuenta recuperable.
Los invitados entran por navegador, sin instalación ni código de activación, y su
acceso termina con la sala. Flujo, administración, configuración y límites
offline: [Distribución y acceso](DISTRIBUCION_Y_ACCESO.md).

Para probarlo, abre [Elteto en GitHub Pages](https://fercho-93.github.io/Elteto/) en un teléfono, crea la partida tocando la llama **Que se haga el fuegote**, pulsa **Invitar con internet** y escanea el QR con la cámara del otro.

Cinquillo admite de dos a seis participantes. Mus necesita cuatro. Parchís admite de tres a seis, con un tablero que se adapta a la mesa (triángulo, cuadrado, pentágono o hexágono) y la opción de dos dados con cinco o seis.

### Completar la mesa con IA

En el vestíbulo de cualquiera de los veinte juegos, el anfitrión puede pulsar **Completar mesa con IA** para ocupar todas las plazas libres. Puedes empezar tú solo o mezclar personas e IA, y quitar una IA antes de empezar para dejar sitio a alguien. Los nombres «IA 1», «IA 2», etc. las identifican durante la partida.

Los jugadores de IA deciden en el dispositivo anfitrión, sin servicios externos ni claves de API, usando únicamente su vista del juego. Sus jugadas pasan por los mismos motores de reglas y avanzan automáticamente. Funciona en la web, sin internet y en Android LAN; el cliente nativo también comparte estos controles. En las salas online, la IA retoma la partida guardada cuando el mismo anfitrión vuelve a abrir la sala. Las reglas actualizadas de `firestore.rules` deben estar publicadas para añadir plazas de IA online.

### Unirse a una partida

Nadie necesita abrir Elteto para unirse: el anfitrión enseña el QR de su sala y cada invitado lo escanea con la cámara normal del móvil. El enlace abre la sala en el navegador, donde solo se confirma el nombre de guerra y el avatar. Si alguien abre la web sin el QR, puede escribir el código de 8 letras que aparece en la sala del anfitrión.

Para jugar sin internet, el anfitrión usa la [app Android](CONFIGURAR_LAN.md): sirve la mesa en la Wi‑Fi o el hotspot y su QR local también se abre con la cámara normal.

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

El sitio compilado aparece en `dist/`. Para probarlo localmente, sírvelo desde HTTPS o desde `localhost`, porque el navegador restringe la instalación PWA en orígenes inseguros.

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

Parchís: tablero de 3 a 6 lados según los jugadores, uno o dos dados y movimientos legales, barreras, seguros, capturas y llegada exacta. La edición digital y las decisiones no detalladas por el PDF están en [design/PARCHIS.md](design/PARCHIS.md).
