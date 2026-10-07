# Mesa ilustrada 2D

La referencia visual son los seis mockups aportados, conservados en references/. El aspecto volumétrico procede de ilustraciones sombreadas y del borde dibujado de la mesa. No hay modelos, cámara giratoria, WebGL ni dependencia de Three.js.

## Cinquillo en primera persona

El jugador local ya no aparece como avatar en ninguna mesa. Su mano y los indicadores de turno permanecen en primer plano; Mus conserva la pareja y la condición de mano junto a sus cartas.

Cinquillo y Mus presentan los rivales en una fila discreta de retratos circulares tomados de la imagen original del usuario, alineada a la izquierda por encima del tapete. Nombre y cantidad real de cartas aparecen al lado del retrato, sin superponer contadores ni un panel de fondo sobre la mesa. Mus identifica además al compañero y a los rivales por pareja A/B. La comparación y las pruebas están en [AVATARES_RIVALES.md](AVATARES_RIVALES.md).

El tapete muestra completos los dos extremos de cada escalera, sin números superpuestos ni cartas que tapen sus ilustraciones. Una escalera recién abierta muestra su cinco una sola vez. Las cartas intermedias permanecen en el estado público y se consultan con «Ver todas las cartas». Cada palo indica su cantidad y los valores que permiten continuar; se respeta el salto del siete a la sota y el orden francés de partidas antiguas. Los palos sin abrir tienen una silueta vacía, diferenciada de las cartas jugadas.

Cinquillo ocupa el alto disponible con cabecera breve, tapete flexible y mano persistente. En móvil vertical usa cuatro columnas con dos extremos completos por palo; en horizontal los extremos quedan lado a lado. En pantallas amplias y altas utiliza cuatro zonas en dos filas. El tamaño depende del espacio real del tapete. La mano se desplaza horizontalmente y se puede filtrar por palo; turno y acción permanecen junto a ella. Marcador, reglas, historial y salida están en el menú. La comparación de alternativas y las simulaciones se documentan en [EXPERIMENTOS_MESA.md](EXPERIMENTOS_MESA.md).

`cinquillo-table.css` contiene la composición y la paleta sobria de verde profundo, madera y dorado suave. Se carga tanto en la entrada web como en la entrada LAN. Ambos atlas se almacenan localmente y se incluyen en Android y en la caché sin conexión.

## Mus y cierre de Cinquillo (0.1.7)

Mus usa `mus-screen.js` y `mus-screen.css`: cabecera breve con compañero y condición de mano, retratos originales fuera del tapete, marcador de tantos y juegos por parejas, fase y envite en la mesa y cuatro cartas propias completas junto a las decisiones. El descarte mantiene selección y confirmación; los envites mantienen sus acciones y añaden una etiqueta accesible al importe. El menú reúne parejas, reglas, historial y salida. El recuento identifica las manos reveladas por nombre y pareja; «Mesa» permite ampliarlas. La presentación solo consume la vista privada existente y no modifica las reglas ni la conexión.

Cinquillo conserva la geometría aprobada del tapete y la mano. Al terminar una mano abre un resumen con ganador, variación de puntos y totales. Las variaciones se obtienen de las cantidades públicas restantes: ganador +5 más cartas ajenas y cada rival menos sus cartas. Solo el ganador puede iniciar la siguiente mano mediante la acción existente. El resumen se puede cerrar, consultar de nuevo desde el menú y conserva su cierre durante las actualizaciones. Al acabar la partida muestra el ganador y la salida al inicio. Las mesas francesas antiguas no muestran puntuaciones de la variante española.

`tests/game-screen-flow.mjs` recorre manos y partidas completas de Cinquillo con 2–6 jugadores, comprueba puntuaciones, continuación exclusiva y resultados finales. En Mus revisa 312 combinaciones de fase, pantalla, márgenes seguros y punto de vista por navegador, con privacidad, pareja correcta y controles visibles. Se mantienen las comprobaciones anteriores de cartas, mesa y LAN. Android 0.1.7, código 8, caché v21.

## Base compartida y futuras mesas

`table-layout.css` conserva los recursos y posiciones de 2–8 asientos para futuras mesas de tablero. Cinquillo y Mus utilizan sus pantallas propias y la fila de retratos originales; los atlas antiguos de cuerpos y brazos no se muestran en estos juegos. Los motores disponibles siguen siendo Cinquillo (2–6) y Mus (4).

Las dos entradas, `index.html` y `lan.html`, cargan las mismas pantallas. Las pruebas LAN abren el servidor Java real con Chromium y WebKit: comprueban reparto, turnos, privacidad, recarga, cierre y acciones de Mus. Las conexiones y sus mensajes se conservan.

## Barajas

100 caras originales sin modificaciones: 48 españolas de Basquetteur y Germarquezm (CC BY-SA 3.0, Wikimedia Commons) y 52 francesas de David Bellot/SVG-cards de Huub de Beer (LGPL 2.1). card-art.js asigna explícitamente palo y valor a una imagen. No se reinterpretan sotas, caballos o reyes. El juego usa solo los valores de su variante; las caras 8 y 9 quedan disponibles para futuros juegos con española de 48.

assets/decks/manifest.json conserva fuentes, licencias e integridad SHA-256. credits.html ofrece los créditos; FRENCH-LICENSE.txt y french-source.svg acompañan al material francés. El script de mantenimiento fetch-card-assets.mjs permite recuperar las caras; la compilación y el juego no descargan imágenes.

Las cartas mantienen las proporciones de cada baraja, sin aplastar las figuras. En Cinquillo, «Ver todas las cartas» muestra todas las jugadas por palo, con caras de 108 píxeles de ancho y saltos de línea según el espacio disponible. Solo requiere desplazamiento vertical y mantiene «Volver» a la vista. La vista sigue actualizándose durante la partida y se cierra con «Volver» o Escape. No muestra manos ocultas. Mus conserva su ampliación de mesa.

## Privacidad, movimiento y comprobación

Los rivales muestran solo la cantidad pública de cartas. En Mus las caras ajenas aparecen únicamente cuando el motor entrega las manos reveladas. Las caras ocultas no llegan a la presentación. El atlas y las dos barajas se incluyen en Android y en la caché sin conexión. Vuelo de cartas y reacciones responden a cambios públicos; se respeta movimiento reducido.

Las pruebas de navegador cubren retratos y contadores sin superposición, integridad y decodificación de las 100 cartas, acciones y recuentos de Cinquillo/Mus, distintos tamaños y lectura sin conexión. La revisión visual acompaña las comprobaciones geométricas. Los retratos son ilustraciones originales con reacciones breves, sin animación continua.

También se comprueban etiquetas sin solapamientos, extremos completos y sin índices añadidos, todos los naipes públicos en el detalle, proporciones de las dos barajas, altura estable y apertura, actualización y cierre de la ampliación. Se revisan capturas de Cinquillo y del recuento de Mus a 320, 390, 844 y 900 píxeles de ancho, además del cambio de distribución entre 699 y 700.
