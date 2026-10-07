# Rivales de Cinquillo · retratos originales

## Resultado

Una fila discreta, alineada a la izquierda y situada completamente fuera del tapete, reúne los retratos circulares originales. Cada nombre y cantidad pública de cartas aparece al lado del retrato: el contador nunca se superpone a la cara. La fila no tiene fondo, borde ni sombra y utiliza el espacio superior existente sin reducir la mesa. La imagen es idéntica byte a byte a `design/references/personajes-10.png`: SVG y CSS encuadran cada rostro sin modificar el bitmap.

Las expresiones originales aportan el toque divertido. El turno añade un borde dorado fino, nombre dorado y una reacción breve; una jugada produce un gesto de 260 ms. No hay animación continua. Con una carta se destaca el contador. El movimiento reducido suprime las reacciones. Todo usa el estado público existente: no añade mensajes ni eventos de red.

Los rivales siguen el orden de turno desde el jugador local, que no tiene avatar propio. La asignación de personajes sigue siendo estable entre dispositivos. El nombre completo, personaje y cantidad tienen descripción accesible y se consultan también en el marcador existente. Los retratos son informativos, no botones pequeños.

## Comparación inicial (0.1.5)

Se probaron seis composiciones nuevas con la imagen original en 240 simulaciones: ocho pantallas y 2–6 jugadores. Las capturas usan una partida del motor tras 18 jugadas legales. Se midió encaje, colisiones y conservación de la geometría. Es una evaluación visual y de navegador, no un estudio con usuarios.

| Composición | Sin colisiones | Mesa y mano iguales | Valoración |
|---|---:|---:|---|
| Círculos independientes | 40/40 | 40/40 | Ligeros; nombres demasiado próximos al borde. |
| Franja compacta | 40/40 | 40/40 | Elegida: información agrupada, fondo legible y posición estable. |
| Tarjetas individuales | 39/40 | 40/40 | Exceso de cajas; invade una combinación compacta. |
| Círculos en antiguos asientos | 39/40 | 40/40 | Dependencia del borde y poco aire lateral. |
| Cápsulas horizontales | 37/40 | 40/40 | Buenas con pocos jugadores; nombres apretados al crecer. |
| Identidad mínima | 40/40 | 40/40 | Ligera pero pierde demasiada expresión. |

La revisión 0.1.6 elimina el panel oscuro que invadía el tapete y separa los contadores de los retratos. Usa retratos de 32 px en móvil habitual, 28 px con cuatro o cinco rivales, 24 px en pantallas estrechas o cortas y 36 px en pantallas amplias y altas. Las fichas son informativas; los controles conservan su tamaño táctil. Los nombres largos se abrevian visualmente sin perder la descripción accesible completa. El tapete y los naipes conservan sus dimensiones.

## Referencias públicas

- [Board Game Arena, guías UX A.1 y A.3](https://en.doc.boardgamearena.com/images/5/57/Guidelines_UX_new_compressed.pdf): agrupar información relacionada, priorizar el tablero y limitar los paneles de jugadores.
- [UNO Mobile](https://www.letsplayuno.com/) y sus capturas públicas: retratos e información del jugador separados de las cartas.
- [Plato / Ocho](https://platoapp.com/en/games/ocho): referencia de presentación social compacta; Elteto conserva sus propios personajes.
- [Poker Now, identidad en el asiento](https://www.pokernow.com/blog/default-in-game-avatar): identidad reconocible y consistente.
- [Zynga Poker, avatares](https://zyngasupport.helpshift.com/hc/en/27-zynga-poker/faq/22124-how-do-i-change-my-avatar-in-zynga-poker/) y [Governor of Poker, perfil](https://orangegames.helpshift.com/hc/en/4-governor-of-poker/faq/67-how-do-i-add-a-picture-to-my-profile/): alternativas de retrato consideradas.

Se revisó material público, sin crear cuentas ni jugar partidas en estos servicios. No se afirma haber examinado todos los juegos del mercado ni se copian sus recursos. Las decisiones concretas de Elteto son una adaptación propia.

## Alcance y pruebas

`rival-portraits.js` y `rival-portraits.css` contienen el componente. Desde 0.1.7, `table-view.js` lo usa también en Mus: tres rivales en orden de turno, uno identificado como compañero, parejas A/B y cantidades públicas. Se mantienen las diez identidades originales y se elimina la composición de cuerpos y sillas de Mus. La geometría de Cinquillo, los motores, las reglas, los transportes y la conexión se conservan. El cierre de Cinquillo y la pantalla adaptada de Mus se documentan en [MESA_2D.md](MESA_2D.md).

`tests/rival-portraits.mjs` comprueba diez identidades desde tres puntos de vista y tres pantallas: 90 casos por navegador, además de cantidades 0/1/5/20 y 15 comparaciones con la geometría de 0.1.4 (`877cdaa`). La referencia conserva las medidas de tapete, cartas y mano; tolerancia entre motores inferior a un píxel.

Se mantienen 300 escenarios de distribución por navegador, acciones, movimiento reducido, caché sin conexión y partidas LAN con servidor Java real. La matriz comprueba expresamente que toda la fila esté fuera del tapete y que cada contador esté dentro de pantalla y separado del retrato, con 2–6 jugadores y estados iniciales, intermedios y completos. La CI ejecuta Chromium y WebKit y adjunta capturas y medidas. Android 0.1.6 (código 7) usa caché v20 e incluye la imagen original. Los atlas experimentales descartados no se empaquetan. No sustituye una instalación en un teléfono físico.
