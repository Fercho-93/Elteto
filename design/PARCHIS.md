# Parchís: tablero y edición digital

Parchís se puede jugar en la web y Android LAN con tres a seis personas. El cliente Expo conserva únicamente sus pantallas de Mus y Cinquillo. No se han cambiado los transportes, las invitaciones ni la conexión.

## Presentación

Tablero vectorial con forma de polígono regular según la mesa: triángulo con tres jugadores (51 casillas), cuadrado con cuatro (68), pentágono con cinco (85) y hexágono con seis (102). Cada lado es un brazo de 3 × 8 casillas, de modo que todos los tableros conservan 17 casillas por color, cuatro fichas por jugador y siete casillas privadas de llegada; las casas ocupan las esquinas, redondeadas siguiendo el círculo de cada casa, y la meta es el polígono central, dividido en un triángulo por color. No hay marco: el borde del papel es el del tablero, para aprovechar toda la anchura de la pantalla. Los colores son amarillo, verde, rojo, azul, naranja y morado. La geometría está en `apps/web/parchis-geometry.js`, sin DOM. Los seguros se marcan con un círculo. El tablero se presenta directamente, sin tapete verde ni mesa de fondo, y ocupa casi todo el ancho del móvil. Los recorridos tienen un ancho mayor que las casillas longitudinales; sus números se han ampliado y las fichas de salida son más grandes. Casillas, números, fichas y animaciones salen de la misma geometría. Los números van en el borde exterior de cada casilla, siempre derechos, y las fichas en la parte que da al pasillo; las etiquetas de las casas siguen el borde exterior del círculo. El tablero ocupa la superficie principal, con los retratos originales de los rivales en una fila exterior; el jugador propio solo ve su color y progreso. El dado, la instrucción y las acciones están debajo en vertical y a la derecha en horizontal.

Cada ficha tiene un número del 1 al 4 que coincide con sus botones de movimiento. Estos botones tienen al menos 44 px y evitan exigir precisión sobre las pequeñas casillas. Las fichas legales se resaltan. La ampliación permite recorrer el tablero a unos 37 px por unidad (740 px en el cuadrado). Las transiciones breves respetan la preferencia de movimiento reducido. Los dos ocupantes de una casilla se separan por el eje más ancho de la casilla.

## Reglas y decisiones de edición

Prevalece el texto español de `reglas_juegos/parchis.pdf`, conservado sin cambios. Se implementan tirada inicial mayor, salida con cinco, repetición con seis, siete pasos con seis si no quedan fichas en casa, penalización del tercer seis, barreras y apertura obligatoria con seis, captura con veinte pasos, llegada exacta con diez pasos y victoria con las cuatro fichas.

El documento no enumera todas las coordenadas ni todos los desempates. Esta edición fija expresamente:

- Salidas amarilla 5, verde 22, roja 39 y azul 56 (naranja 73 y morado 90 en los tableros de cinco y seis); seguros 5, 12, 17 y sus rotaciones de 17 casillas.
- Recorrido propio de todas las casillas compartidas menos cuatro (64 en el cuadrado), siete de pasillo y entrada exacta a meta.
- Con cinco o seis participantes, el primer asiento elige antes del sorteo uno o dos dados. Con dos, cada dado se juega por separado; se sale con un 5 o con la suma 5; los dobles hacen el papel del 6 (repiten, abren barreras y al tercero vuelve la última ficha movida); el 6 cuenta 7 sin fichas en casa; un dado sin movimiento se pierde y las bonificaciones se juegan antes del dado restante. El PDF no trata estas mesas: son las convenciones habituales del parchís de seis con dos dados.
- Máximo dos fichas por casilla. Dos del mismo color forman barrera y bloquean el paso; dos colores pueden compartir un seguro.
- Con cinco se elige entre salir y mover; no se impone salida obligatoria ni una excepción de captura en la salida segura.
- Bonificaciones completas de veinte o diez: se omiten si ninguna ficha puede cumplirlas. Pueden encadenarse.
- Los empatados en la tirada inicial repiten. El tercer seis devuelve la última ficha movida, también si llegó a meta durante ese turno; no se añade una excepción ausente del PDF.

Estas decisiones también aparecen en el catálogo y el menú de reglas. No se incluyen apuestas, errores manuales ni Parchís de ocho colores.

## Dados

El dado de seis caras usa puntos, caras opuestas que suman siete, sombra, giro y rebotes amortiguados de 840 ms. Es una animación visual; el anfitrión sigue calculando el resultado y todos reciben el mismo valor y número de tirada. Como referencia de separación entre presentación y azar se consultó [cómo funcionan los dados en MONOPOLY GO](https://www.monopolygo.com/news/79/so-random-how-dice-rolling-works-in-monopoly-go). No se usa su código ni sus recursos gráficos.

El último resultado permanece visible aunque cambie el turno. La ronda inicial muestra las tiradas de cada participante; los empates solo los repiten los empatados. Una pulsación bloquea la acción mientras llega respuesta y termina la animación. El motor rechaza acciones con un número de tirada anterior, evitando que un reintento vuelva a tirar durante un turno extra. La preferencia de movimiento reducido elimina el giro. Entrar o recargar muestra el resultado sin repetir la animación.

`tests/parchis-dice.mjs` verifica las seis caras, rebotes, respuesta retrasada, pulsaciones repetidas, resultado persistente, nueva partida y movimiento reducido en Chromium y WebKit. Las pruebas LAN y online recorren la tirada inicial y movimientos con cuatro identidades independientes.

## Verificación del tablero y reglas

`tests/parchis-rules.mjs` verifica las reglas, la autoridad del anfitrión, vistas sin semilla futura, inmutabilidad, los cuatro tableros, la elección y las reglas de dos dados, y 90 partidas completas deterministas de tres a seis jugadores. `tests/parchis-geometry.mjs` comprueba en cada polígono que ninguna casilla se solapa, que las consecutivas se tocan, que cada ficha (sola o en pareja) cabe en su casilla sin tapar el número y que casas, etiquetas y metas quedan dentro de su zona. Forma parte de `npm test`.

`tests/parchis-screen.mjs` verifica 192 combinaciones de pantalla, orientación, zona segura, estado y perspectiva por navegador, además de dados, elección real de fichas, ampliación y menús. Usa Chromium y WebKit. Incluye mesas de tres, cinco y seis con uno y dos dados; el recorrido gráfico tiene casillas únicas y todas las fichas quedan dentro del tablero.

`tests/lan-navegador.mjs` añade una partida de Parchís con navegadores independientes, tiradas, movimientos, sincronización y recarga del invitado al conjunto existente de Cinquillo y Mus.
