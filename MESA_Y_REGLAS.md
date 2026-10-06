# Mesa, reglas y ampliación de Elteto

La interfaz de la web y la app Android LAN comparte un tablero con tapete verde, borde de madera, avatares de fruta dibujados en SVG, manos rivales boca abajo y una mano propia ordenada por palo y valor. Los avatares parpadean y se destaca el turno. Las cartas nuevas llegan desde el mazo y las cartas del cinquillo vuelan hasta su casilla; son animaciones de presentación, sin modificar el resultado de una jugada.

No se han cambiado Firebase, WebRTC, WebSocket, códigos, QR, puertos, autorización ni configuración de conexión. Se habilita Mus en el selector LAN, porque la sesión y el servidor existentes ya aceptan el motor registrado. Es un cambio de catálogo en la interfaz, sin modificar el transporte. La mesa necesita exactamente cuatro participantes. El cliente Expo conserva su interfaz anterior, con controles compatibles con las nuevas fases; la nueva mesa visual pertenece a la web compartida con Android LAN.

## Reglas de esta versión

### Cinquillo

Se conserva la variante existente: baraja francesa de 52 cartas, de dos a seis jugadores, gana quien primero vacía su mano. La primera jugada ahora exige el 5 de corazones, coherente con la regla de salida del motor. Después se abren los otros palos con el 5 y se continúa hacia el as o el rey sin saltos. No se permite pasar si existe una jugada legal. La interfaz ilumina las cartas legales y desactiva Paso cuando no corresponde.

La mesa muestra las 52 posiciones en cuatro filas. Las manos ajenas representan su número real de cartas y nunca contienen los valores privados de los rivales.

### Mus

Variante explícita: cuatro reyes, cuatro ases, baraja española de 40 cartas, parejas en asientos alternos (0/2 y 1/3), un juego a 40 tantos. Los doses y treses conservan su valor. No se aplica juego real, mus corrido, vacas, señas privadas ni reglas particulares de torneos.

- Se consulta Mus / No hay mus por turno, empezando por la mano. Si todos piden mus, cada jugador cambia entre una y cuatro cartas y se vuelve a preguntar. Si alguien corta, comienzan los lances.
- Se reciclan los descartes anteriores cuando se agota el mazo. Nunca se duplica una carta ni se reduce una mano por falta de cartas.
- Grande y chica comparan las cuatro cartas de forma lexicográfica. Pares distingue pareja, medias y duples. En juego, 31 vence a 32; si nadie tiene juego se disputa punto. Los empates favorecen a la mano relativa.
- Solo intervienen en pares y juego los jugadores que tienen la jugada. Si solo una pareja tiene jugada, se evita un envite sin rival.
- Envites enteros de al menos dos tantos; las subidas indican el **total** que queda apostado y deben superar el anterior. Un órdago pendiente solo admite Quiero / No quiero.
- Los envites rechazados suman inmediatamente la negada: un tanto al rechazar la primera apuesta o el envite anterior al rechazar una subida. Los aceptados quedan pendientes hasta el recuento.
- Los premios de pares son 1 por pareja, 2 por medias y 3 por duples, sumados para los miembros de la pareja ganadora. En juego son 3 por 31 y 2 por otro juego. Punto en paso vale 1; aceptado añade 1 al envite.
- El recuento se realiza en orden grande, chica, pares y juego/punto y se detiene al alcanzar 40. Un órdago aceptado resuelve la partida inmediatamente.
- Al acabar la mano se muestran las cuatro manos. La mano inicia el siguiente reparto con un botón; no se sustituye el reparto antes de poder leer el resultado.

Se admiten estados guardados del motor anterior: se conservan manos, stock y marcador, se reconstruye el descarte y se mantienen los puntos ya anotados. Los participantes deben actualizar la aplicación para disponer de los nuevos controles.

Referencias consultadas: [reglas de Mus de Ludoteka](https://www.ludoteka.com/juegos/mus/reglas) y [reglas de Cinquillo de Ludoteka](https://www.ludoteka.com/juegos/cinquillo/reglas). El segundo documento describe la variante española; Elteto conserva expresamente su variante francesa.

## Organización del código

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Reglas | `packages/game-core/src/games/*.ts` | Estado, acciones legales, resultados y proyección privada por jugador |
| Presentación reutilizable | `apps/web/table-view.js` | Caras y reversos, SVG locales, asientos relativos, orden de mano, tableros y animación de colocación |
| Pantalla y acciones | `apps/web/app.js` | Traduce una vista privada a la mesa y envía acciones mediante la sesión ya existente |
| Estética | `apps/web/styles.css` | Tapete, tamaños adaptables, sombras, animaciones y movimiento reducido |
| Cliente Expo | `apps/mobile/src/components/MusScreen.tsx` | Controles del motor actualizado en la interfaz nativa existente |
| Transporte | Sesiones y servidor existentes | Sin cambios |

Las cartas rivales se dibujan exclusivamente desde `handSizes`. `revealedHands` solo aparece al finalizar la mano o la partida. Ni la semilla, ni el stock, ni las manos privadas, ni los resultados pendientes se incorporan a la vista pública.

La caché pasa a `elteto-shell-v7` e incluye `table-view.js`, para conservar el funcionamiento sin internet una vez actualizada la web. En Android LAN, los recursos se empaquetan en el APK por el flujo existente: hay que instalar el nuevo APK para renovar la mesa del anfitrión y de los invitados que sirve.

## Escalar a otros juegos

1. Añadir un motor puro al registro de `game-core`: límites de participantes, estado inicial, acciones, fin y una vista privada. Primero definir qué es público y cuándo se revelan cartas.
2. Crear la presentación específica del centro de la mesa y sus controles. Reutilizar caras, reversos, avatares y asientos de `table-view.js`. El estado de reglas no debe contener coordenadas, rotaciones ni tiempos de animación.
3. Al incorporar un tercer juego, sustituir las bifurcaciones Mus/Cinquillo de la pantalla por un registro de presentaciones (`renderBoard`, `renderControls`, `renderHand`, `rules`). Así cada juego podrá añadir su tablero sin engordar un único componente.
4. Incorporar un evento público de jugada con identificador creciente, jugador y carta cuando ya sea pública. Facilitaría descartes, bazas y animaciones de recogida sin interpretar el texto del historial. No incluir cartas ocultas en los eventos.
5. Añadir preferencias locales de tapete, baraja, avatar y velocidad de animación. Si se comparte el avatar elegido, transmitir solo un identificador del catálogo local; evitar imágenes externas necesarias para jugar sin internet.
6. Validar cada juego por etapas antes de habilitarlo en LAN. No es necesario reescribir el transporte para juegos por turnos con este contrato.

Posibles próximos juegos: Siete y media (apuestas y turnos), Brisca/Tute (bazas y recogida), Escoba (selección de cartas en el centro). Parchís/Oca pueden conservar asientos y avatares, pero necesitan un tablero y un motor diferentes. Una mesa 3D auténtica requeriría WebGL y activos adicionales; esta versión ofrece profundidad visual y animación 2D, sin un simulador físico 3D.

## Validación

```bash
npm test                        # reglas de juego, privacidad y códigos
node tests/lan-session.mjs       # sesión LAN, pausa, reconexión y partida completa
bash tests/prepare-lan-java.sh
node tests/lan-servidor.mjs       # servidor Java real
node tests/lan-navegador.mjs      # dos navegadores, sin recursos externos
node tests/table-navegador.mjs    # interfaz a 320/390/900 px; Mus y Cinquillo
cd apps/mobile
npx tsc --noEmit
npx expo lint
```

Los tests de navegador requieren Playwright y Chromium. Las pruebas automáticas no sustituyen una partida física con Android anfitrión e iPhone invitado ni certifican todas las versiones de Safari/WebView.
