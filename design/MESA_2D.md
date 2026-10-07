# Mesa ilustrada 2D

La referencia visual son los seis mockups aportados, conservados en references/. El aspecto volumétrico procede de ilustraciones sombreadas y del borde dibujado de la mesa. No hay modelos, cámara giratoria, WebGL ni dependencia de Three.js.

## Cinquillo en primera persona

El jugador local ya no aparece como avatar en ninguna mesa. Su mano y los indicadores de turno permanecen en primer plano; Mus conserva la pareja y la condición de mano junto a sus cartas.

Cinquillo presenta los rivales en una franja compacta de retratos circulares tomados de la imagen original del usuario. Nombre, cantidad real de cartas y turno aparecen juntos. No dibuja cuerpos, sillas, manos ni abanicos de rivales. La comparación y las pruebas están en [AVATARES_RIVALES.md](AVATARES_RIVALES.md). Mus conserva la composición de personajes sentados descrita más abajo.

El tapete muestra completos los dos extremos de cada escalera, sin números superpuestos ni cartas que tapen sus ilustraciones. Una escalera recién abierta muestra su cinco una sola vez. Las cartas intermedias permanecen en el estado público y se consultan con «Ver todas las cartas». Cada palo indica su cantidad y los valores que permiten continuar; se respeta el salto del siete a la sota y el orden francés de partidas antiguas. Los palos sin abrir tienen una silueta vacía, diferenciada de las cartas jugadas.

Cinquillo ocupa el alto disponible con cabecera breve, tapete flexible y mano persistente. En móvil vertical usa cuatro columnas con dos extremos completos por palo; en horizontal los extremos quedan lado a lado. En pantallas amplias y altas utiliza cuatro zonas en dos filas. El tamaño depende del espacio real del tapete. La mano se desplaza horizontalmente y se puede filtrar por palo; turno y acción permanecen junto a ella. Marcador, reglas, historial y salida están en el menú. La comparación de alternativas y las simulaciones se documentan en [EXPERIMENTOS_MESA.md](EXPERIMENTOS_MESA.md).

`cinquillo-table.css` contiene la composición y la paleta sobria de verde profundo, madera y dorado suave. Se carga tanto en la entrada web como en la entrada LAN. Ambos atlas se almacenan localmente y se incluyen en Android y en la caché sin conexión.

## Composición de Mus y base compartida

- Cuerpos y sillas del atlas transparente de diez mascotas, detrás del tapete.
- Mesa de madera con borde fino y tapete verde. En Cinquillo el contorno deja más espacio útil para jugar.
- Capa frontal por asiento, colocada exactamente sobre el cuerpo: abanico de dorsos bajo los recortes de manos y antebrazos. Los recortes reutilizan el mismo atlas, escala e identidad; no introducen una segunda identidad accesible.
- Cartas jugadas y elementos de Mus sobre el tapete; huecos pendientes invisibles.
- Mano propia accesible en primer plano; Cinquillo mantiene una franja de cartas completas con filtros, y Mus conserva su composición y abanico.

La disposición se adapta a móvil vertical, horizontal y escritorio. Hay posiciones compartidas de 2–8 asientos para futuras vistas de tablero. Los motores actuales siguen siendo Cinquillo (2–6) y Mus (4). Las manos de tableros sin cantidades de cartas quedan vacías.

La distribución toma las manos de cada personaje como punto de apoyo sobre el borde. Los rivales de Cinquillo utilizan la franja independiente descrita anteriormente. La altura de la escena y el tamaño de los personajes se ajustan juntos para reducir espacio vacío y dejar sitio a la mano propia y sus controles. `table-layout.css` reúne estos ajustes de composición.

Las dos entradas, `index.html` y `lan.html`, cargan esa misma composición. Las pruebas LAN abren el servidor Java real con Chromium y WebKit a 390 × 664: verifican que la cara del rival esté sobre el tapete, su nombre no pise el turno, la mano permanezca visible sin scroll vertical y la ampliación funcione.

## Barajas

100 caras originales sin modificaciones: 48 españolas de Basquetteur y Germarquezm (CC BY-SA 3.0, Wikimedia Commons) y 52 francesas de David Bellot/SVG-cards de Huub de Beer (LGPL 2.1). card-art.js asigna explícitamente palo y valor a una imagen. No se reinterpretan sotas, caballos o reyes. El juego usa solo los valores de su variante; las caras 8 y 9 quedan disponibles para futuros juegos con española de 48.

assets/decks/manifest.json conserva fuentes, licencias e integridad SHA-256. credits.html ofrece los créditos; FRENCH-LICENSE.txt y french-source.svg acompañan al material francés. El script de mantenimiento fetch-card-assets.mjs permite recuperar las caras; la compilación y el juego no descargan imágenes.

Las cartas mantienen las proporciones de cada baraja, sin aplastar las figuras. En Cinquillo, «Ver todas las cartas» muestra todas las jugadas por palo, con caras de 108 píxeles de ancho y saltos de línea según el espacio disponible. Solo requiere desplazamiento vertical y mantiene «Volver» a la vista. La vista sigue actualizándose durante la partida y se cierra con «Volver» o Escape. No muestra manos ocultas. Mus conserva su ampliación de mesa.

## Privacidad, movimiento y comprobación

Los abanicos rivales muestran solo el número público de dorsos. Las caras ocultas no llegan a la presentación. El atlas y las dos barajas se incluyen en Android y en la caché sin conexión. Vuelo de cartas y reacciones responden a cambios públicos; se respeta movimiento reducido.

Las pruebas de navegador cubren capas y alineación de cuerpo/brazos, integridad y decodificación de las 100 cartas, acciones y recuentos de Cinquillo/Mus, distintos tamaños y lectura sin conexión. La revisión visual acompaña las comprobaciones geométricas. Las mascotas son ilustraciones estáticas animadas como capas; no tienen articulación individual de dedos.

También se comprueban etiquetas sin solapamientos, extremos completos y sin índices añadidos, todos los naipes públicos en el detalle, proporciones de las dos barajas, altura estable y apertura, actualización y cierre de la ampliación. Se revisan capturas de Cinquillo y del recuento de Mus a 320, 390, 844 y 900 píxeles de ancho, además del cambio de distribución entre 699 y 700.
