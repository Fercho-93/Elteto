# Parchís: tablero y edición digital

Parchís se puede jugar en la web y Android LAN con dos, tres o cuatro personas. El cliente Expo conserva únicamente sus pantallas de Mus y Cinquillo. No se han cambiado los transportes, las invitaciones ni la conexión.

## Presentación

Tablero cuadrado vectorial de 68 casillas, cuatro colores, cuatro fichas por jugador y siete casillas privadas de llegada por color. Los seguros se marcan con un círculo. El tablero ocupa la superficie principal, con los retratos originales de los rivales en una fila exterior; el jugador propio solo ve su color y progreso. El dado, la instrucción y las acciones están debajo en vertical y a la derecha en horizontal.

Cada ficha tiene un número del 1 al 4 que coincide con sus botones de movimiento. Estos botones tienen al menos 44 px y evitan exigir precisión sobre las pequeñas casillas. Las fichas legales se resaltan. La ampliación permite recorrer un tablero de 740 px. Las transiciones breves respetan la preferencia de movimiento reducido. Los dos ocupantes de una casilla se separan lateralmente.

## Reglas y decisiones de edición

Prevalece el texto español de `reglas_juegos/parchis.pdf`, conservado sin cambios. Se implementan tirada inicial mayor, salida con cinco, repetición con seis, siete pasos con seis si no quedan fichas en casa, penalización del tercer seis, barreras y apertura obligatoria con seis, captura con veinte pasos, llegada exacta con diez pasos y victoria con las cuatro fichas.

El documento no enumera todas las coordenadas ni todos los desempates. Esta edición fija expresamente:

- Salidas amarilla 5, verde 22, roja 39 y azul 56; seguros 5, 12, 17 y sus rotaciones de 17 casillas.
- Recorrido propio de 64 casillas compartidas, siete de pasillo y entrada exacta a meta. Dos participantes usan amarillo y rojo.
- Máximo dos fichas por casilla. Dos del mismo color forman barrera y bloquean el paso; dos colores pueden compartir un seguro.
- Con cinco se elige entre salir y mover; no se impone salida obligatoria ni una excepción de captura en la salida segura.
- Bonificaciones completas de veinte o diez: se omiten si ninguna ficha puede cumplirlas. Pueden encadenarse.
- Los empatados en la tirada inicial repiten. El tercer seis devuelve la última ficha movida, también si llegó a meta durante ese turno; no se añade una excepción ausente del PDF.

Estas decisiones también aparecen en el catálogo y el menú de reglas. No se incluyen apuestas, errores manuales ni Parchís de ocho colores.

## Comprobaciones

`tests/parchis-rules.mjs` verifica las reglas, la autoridad del anfitrión, vistas sin semilla futura, inmutabilidad y 90 partidas completas deterministas. Forma parte de `npm test`.

`tests/parchis-screen.mjs` verifica 192 combinaciones de pantalla, orientación, zona segura, estado y perspectiva por navegador, además de dados, elección real de fichas, ampliación y menús. Usa Chromium y WebKit. El recorrido gráfico tiene 68 casillas únicas y las 16 fichas quedan dentro del tablero.

`tests/lan-navegador.mjs` añade una partida de Parchís con navegadores independientes, tiradas, movimientos, sincronización y recarga del invitado al conjunto existente de Cinquillo y Mus.
