# Catálogo jugable

Los veinte reglamentos tienen motor en web y Android LAN. Los originales de `reglas_juegos/` se conservan íntegros. Los resúmenes de `lectura/` y `catalog.ts` describen las decisiones siguientes cuando la fuente permite variantes o no fija la duración.

| Juego | Mesa | Final y variante |
|---|---|---|
| Dominó | 4, parejas alternas | Doble seis, 150 puntos, salida rotatoria, tranca por menor suma |
| Oca | 2–4 | Un dado, salida 1, llegada exacta 63; solo ocas repiten |
| Damas españolas | 2 | Peones hacia delante, damas voladoras, captura por cantidad/calidad; tablas por acuerdo, repetición o falta de progreso |
| Burro | 3–4 | Parejas, sin caballo de bastos, intercambio doble del PDF; pierde quien completa BURRO |
| Mentiroso | 3–6 | Española 40, ases comodín, pierde el último con cartas |
| Siete y medio | 2–8 | 100 fichas, 15 manos, apuesta 1–10 cubierta por banca; sin compra de banca; cambio automático si no puede cubrir |
| Escoba | 2, 3, 4 o 6 | Meta 21; equipos alternos con 4/6; puntuación de la fuente y captura obligatoria si la carta elegida lo permite |
| Brisca | 2, 3, 4 o 6 | Tres juegos; equipos alternos con 4/6; quitar dos de oros con 3 y cuatro doses con 6 |
| Tute | 2–4 | Tres juegos; a dos: baceta, 101 y capote; a tres: trece cartas; a cuatro: parejas |
| Pocha | 3–5 | Subida, máximo repetido por jugador, bajada; desempate de una carta |
| Julepe | 5–7 | Diez manos con puntos; dador obligado, descanso rotatorio con 7 y sustituto si todos pasan |
| Guiñote | 4, parejas alternas | Reparto completo de diez cartas de la fuente, sin baceta; 101 y tres juegos |
| Butifarra | 4, parejas alternas | Española 48, 100 puntos, delegación, contra y recontra |
| Chinchón | 2–8 | Española 40, sin comodines, cierre ≤5, eliminación >100 sin reenganche; dos barajas con 5–8 |
| Remigio | 2–8 | Seis manos, menor suma; dos barajas de póker español 54, tres con 7–8; cierre combinado o color |
| Continental | 2–8 | Siete contratos, descarte con castigo por prioridad, comodines sustituibles, gana menor suma |
| Texas Hold’em | 2–7 | Sin límite, 500 fichas, ciegas 5/10, botes laterales y all-in corto; gana quien reúne las fichas |

Las fichas son puntos de partida, sin pagos ni dinero real. Las mesas conservan el límite existente de ocho personas. Los identificadores de sala usan guiones; `getGame` y `getGamePlan` aceptan también los nombres antiguos con guion bajo.

## Implementación

- `shared.ts`: estado, reparto determinista, identidad de cartas, validación e inmutabilidad; las vistas públicas usan una lista explícita de campos y copias independientes.
- `boards.ts`, `social-cards.ts`, `tricks.ts`, `melds.ts`, `holdem.ts`: motores por familia. Cada motor valida turno, propiedad y fase antes de mutar la copia del estado.
- `catalog-games.js` y `.css`: presentación común con mano privada, acciones de fase, tapete, avatares, señal de turno, marcador, reglas y ampliación. En horizontal los controles pasan a la derecha. Las superficies largas tienen desplazamiento interno.
- El buscador de creación lista todos los juegos y muestra sus cantidades admitidas; evita arrancar mesas de cinco en Brisca/Escoba.
- El transporte de salas y los motores y tableros anteriores de Cinquillo, Mus y Parchís se mantienen. El nuevo código y las reglas se incluyen en la caché; su contenido participa en la versión del despliegue.

## Comprobaciones

`npm test` incluye partidas completas en todas las cantidades admitidas para catorce motores nuevos; contratos y cierres de los tres de combinaciones; privacidad, puntuación, propiedad, conservación de cartas y fichas, capturas, banca, multiplicadores y botes laterales. También conserva las pruebas anteriores.

`node tests/catalog-screen.mjs` y `CATALOG_BROWSER=webkit node tests/catalog-screen.mjs` comprueban las pantallas con Chromium y WebKit: seis tamaños, mesa mínima/máxima, controles mediante clics, reglas, menú y ampliación. Las capturas y medidas se guardan en `tests/artifacts/catalog/`. No se distribuyen las funciones auxiliares de prueba con la aplicación.
