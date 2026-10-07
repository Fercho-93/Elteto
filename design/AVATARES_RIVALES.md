# Rivales de Cinquillo · 0.1.5

## Decisión

Bustos ilustrados con volumen, hombros y manos apoyadas en el borde, sin marcos alrededor de la cara. Se conservan las diez identidades originales. Los laterales usan una pose de tres cuartos orientada hacia el juego; el centro usa la frontal. El jugador local no aparece. Mus mantiene sus ilustraciones anteriores.

La petición exige conservar la mesa aprobada en 0.1.4. No se modifican `cinquillo-table.css`, `cinquillo-screen.js`, la mano, el tapete, las cartas, los controles ni los anclajes de los asientos. El nuevo tamaño de busto depende del tamaño del asiento existente. La etiqueta mantiene nombre y cantidad pública exacta, separados visualmente; su texto completo también está en el título y en la descripción accesible del asiento.

## Comparación

Se simularon seis opciones en 90 combinaciones: cinco pantallas (320×568, 390×664, 390×844, 844×390 y 1280×800) por tres cantidades de jugadores (2, 4 y 6). Son simulaciones de interfaz, no un estudio de usuarios ni partidas en productos ajenos.

| Opción | Evaluación visual |
|---|---|
| Silla anterior | Referencia; demasiada proporción dedicada a silla/cuerpo en tamaños pequeños. |
| Silla anterior con etiqueta sobria | Mejora superficial; conserva la limitación del rostro. |
| Retrato circular | Identidad clara, pero parece una ficha flotante y pierde manos/cuerpo. |
| Retrato rectangular redondeado | Ordenado, pero añade un marco ajeno a la mesa y recorta los personajes. |
| Busto mínimo, sin manos/cartas | Ligero, pero pierde la sensación de estar jugando. |
| Busto integrado con manos y cartas | Elegido: cara reconocible, continuidad con el borde y menos protagonismo de la silla. |

El criterio es un equilibrio entre identidad, sensación de estar sentado y respeto del espacio de juego. No se afirma que esta solución sea universalmente óptima.

## Referencias de mercado

- [UNO Mobile, sitio y galería oficiales](https://www.letsplayuno.com/): referencia pública para una identidad visual compacta alrededor de la partida. La adaptación a los personajes de Elteto es una decisión propia.
- [Poker Now: avatar en el asiento](https://www.pokernow.com/blog/default-in-game-avatar): documenta la identidad visible y persistente durante la partida. Elteto conserva su asignación estable por jugador y no añade compras ni selección de perfil.
- [Zynga Poker: personalización del avatar](https://zyngasupport.helpshift.com/hc/en/27-zynga-poker/faq/22124-how-do-i-change-my-avatar-in-zynga-poker/): referencia para separar identidad del jugador y superficie de juego.
- [Governor of Poker: retrato de perfil](https://orangegames.helpshift.com/hc/en/4-governor-of-poker/faq/67-how-do-i-add-a-picture-to-my-profile/): alternativa de retrato enmarcado considerada en los prototipos.

Se consultó material público; no se crearon cuentas ni se jugaron partidas en estos servicios. No se copiaron sus recursos gráficos.

## Implementación

- `rival-portraits.js` encuadra cada ilustración con medidas propias y un recorte SVG explícito. El rectángulo del atlas completo nunca se muestra por el espacio sobrante del encuadre. Los recortes de cuerpo y manos tienen identificadores separados.
- `rival-portraits.css` modifica únicamente la presentación de rivales de Cinquillo. Cuerpo detrás del tapete, dorsos encima del borde y manos encima de los dorsos. El reflejo lateral se aplica por igual al cuerpo y al agarre.
- Hasta cinco dorsos visibles forman el abanico. Con una carta queda un único dorso; con cero desaparece. El número exacto sigue visible y accesible. No se leen las cartas privadas de ningún rival.
- Turno resaltado con luz dorada discreta y borde de etiqueta. Se mantienen las reacciones a jugadas y al cambio de turno, con respeto a movimiento reducido.
- Dos atlas PNG RGBA transparentes, versionados y locales: `elteto-mascots-bust-v2.png` y `elteto-mascots-bust-side-v2.png`. Generados con la herramienta integrada de imágenes a partir de las referencias aportadas, sin modificar los atlas anteriores. Ambos se incluyen en Android y caché v18.

## Verificación reproducible

`tests/rival-portraits.mjs` comprueba las diez identidades en tres direcciones y tres pantallas: 90 casos por navegador. Comprueba orientación, caras visibles, separación, encuadre y cantidad de dorsos/etiqueta. Además compara 15 geometrías de tapete, zona de cartas y mano con medidas tomadas del commit aprobado `877cdaa` (0.1.4); tolerancia inferior a un píxel entre motores.

Se conservan las 300 combinaciones por navegador de `tests/cinquillo-layout.mjs`, acciones y animaciones de `tests/table-navegador.mjs`, y partidas reales LAN de `tests/lan-navegador.mjs`. La CI ejecuta Chromium y WebKit y adjunta capturas y medidas. WebKit es una aproximación de motor: no sustituye una prueba física en iPhone. La APK de esta rama sigue siendo una compilación de prueba con firma debug.
