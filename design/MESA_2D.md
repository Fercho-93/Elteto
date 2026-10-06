# Mesa ilustrada 2D

La referencia visual son los seis mockups aportados, conservados en references/. El aspecto volumétrico procede de ilustraciones sombreadas y del borde dibujado de la mesa. No hay modelos, cámara giratoria, WebGL ni dependencia de Three.js.

## Composición

- Cuerpos y sillas del atlas transparente de diez mascotas, detrás del tapete.
- Mesa ovalada de madera con borde dorado, patas y tapete verde.
- Capa frontal por asiento, colocada exactamente sobre el cuerpo: abanico de dorsos bajo los recortes de manos y antebrazos. Los recortes reutilizan el mismo atlas, escala e identidad; no introducen una segunda identidad accesible.
- Cartas jugadas y elementos de Mus sobre el tapete; huecos pendientes invisibles.
- Mano propia accesible en primer plano; desplazamiento en pantallas pequeñas y abanico en amplias.

La disposición se adapta a móvil vertical, horizontal y escritorio. Hay posiciones compartidas de 2–8 asientos para futuras vistas de tablero. Los motores actuales siguen siendo Cinquillo (2–6) y Mus (4). Las manos de tableros sin cantidades de cartas quedan vacías.

La distribución toma las manos de cada personaje como punto de apoyo sobre el borde. Los rivales ocupan varios niveles alrededor del óvalo, con etiquetas escalonadas en las mesas de seis. La altura de la escena y el tamaño de los personajes se ajustan juntos para reducir espacio vacío y dejar sitio a la mano propia y sus controles. `table-layout.css` reúne estos ajustes de composición.

Las dos entradas, `index.html` y `lan.html`, cargan esa misma composición. La altura móvil depende de `svh` para reservar sitio a la mano cuando las barras del navegador reducen el espacio disponible. Las pruebas LAN abren el servidor Java real con Chromium y WebKit a 390 × 664: verifican que la cara del rival esté sobre el tapete, su nombre no pise el turno, la mano propia entre en la pantalla y la ampliación funcione.

## Barajas

100 caras originales sin modificaciones: 48 españolas de Basquetteur y Germarquezm (CC BY-SA 3.0, Wikimedia Commons) y 52 francesas de David Bellot/SVG-cards de Huub de Beer (LGPL 2.1). card-art.js asigna explícitamente palo y valor a una imagen. No se reinterpretan sotas, caballos o reyes. El juego usa solo los valores de su variante; las caras 8 y 9 quedan disponibles para futuros juegos con española de 48.

assets/decks/manifest.json conserva fuentes, licencias e integridad SHA-256. credits.html ofrece los créditos; FRENCH-LICENSE.txt y french-source.svg acompañan al material francés. El script de mantenimiento fetch-card-assets.mjs permite recuperar las caras; la compilación y el juego no descargan imágenes.

Las cartas mantienen las proporciones de cada baraja, sin aplastar las figuras. «Ampliar mesa» abre las cartas públicas a mayor tamaño, con desplazamiento horizontal cuando hace falta. La vista sigue actualizándose durante la partida y se cierra con «Volver» o Escape. No muestra manos ocultas. En móvil vertical, la mesa completa prioriza la distribución; la ampliación permite leer sus detalles.

## Privacidad, movimiento y comprobación

Los abanicos rivales muestran solo el número público de dorsos. Las caras ocultas no llegan a la presentación. El atlas y las dos barajas se incluyen en Android y en la caché sin conexión. Vuelo de cartas y reacciones responden a cambios públicos; se respeta movimiento reducido.

Las pruebas de navegador cubren capas y alineación de cuerpo/brazos, integridad y decodificación de las 100 cartas, acciones y recuentos de Cinquillo/Mus, distintos tamaños y lectura sin conexión. La revisión visual acompaña las comprobaciones geométricas. Las mascotas son ilustraciones estáticas animadas como capas; no tienen articulación individual de dedos.

También se comprueban etiquetas sin solapamientos, proporciones de las dos barajas y apertura, actualización y cierre de la ampliación. Se revisan capturas de Cinquillo y del recuento de Mus a 320, 390, 844 y 900 píxeles de ancho.
