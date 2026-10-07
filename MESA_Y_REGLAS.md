# Mesa y reglas de Elteto

## Fuentes y estado

Las reglas aportadas el 6 de octubre de 2026 se conservan en `reglas_juegos/`. El catálogo tipado de los 20 juegos está en `packages/game-core/src/catalog.ts`. La biblioteca local se abre desde la portada y está incluida en la web, Android y la caché sin conexión. Los originales mantienen bytes, tamaños y SHA-256.

Los veinte juegos tienen motor y mesa jugables en web y Android LAN. Los 17 añadidos comparten acciones, vistas privadas, avatares y menú. Variantes, finales y validación: [design/CATALOGO_JUGABLE.md](design/CATALOGO_JUGABLE.md).

## Cinquillo clásico

Baraja española de 40 cartas: oros, copas, espadas y bastos, índices 1–7 y 10–12. Sale el cinco de oros. Se abren palos con cinco y se continúa sin saltos por el orden de la baraja; siete seguido de sota. Solo se pasa sin jugada.

La mano termina al vaciar una mano. Su ganador suma cinco más el número de cartas restantes de todos los demás; los demás restan una por carta restante. La partida acaba cuando el ganador llega a 30 puntos. El ganador confirma la siguiente mano, conservando puntuación y repartiendo de nuevo. Se muestran puntos, mano y meta. Un resumen al terminar cada mano explica las variaciones y los totales; solo el ganador puede iniciar el siguiente reparto. Puede cerrarse para consultar la mesa y abrirse de nuevo desde el menú. El final de partida tiene su propio resultado. Las mesas francesas antiguas conservan su final sin puntuación española.

La fuente clásica de Ludoteka juega entre cuatro. Se conservan mesas de dos a seis como ampliación explícita de Elteto con las mismas reglas. Las salas guardadas de la versión anterior mantienen su baraja francesa y su final de una mano; no se convierten índices de una baraja a la otra.

## Mus de Fournier

Nuevas mesas: cuatro jugadores por parejas alternas, española de 40, ocho reyes y ocho ases. Tres y rey son equivalentes para grande, chica, pares y juego; dos y as también. Se reparten cuatro cartas de una en una. Se aplica mus corrido en la primera mano de cada juego: quien corta es mano, y si todos van al descarte corre el dador.

Decisión de mus, descartes repetidos, grande, chica, pares y juego o punto. Los envites aceptados se cuentan por orden al recuento. Los dejes se cobran inmediatamente. Un deje en punto no elimina el punto adicional que debe contarse al final. Los valores de pares y juego se suman en la pareja ganadora. Se muestran las cartas al acabar la mano.

Cada juego completo termina a 40 tantos o al aceptar un órdago. Gana la partida quien consigue tres juegos completos. Se muestran juegos ganados y tantos; tras ganar un juego se reinician los tantos y comienza otro reparto con distinto orden determinista. El perfil `four-kings` existe mediante `createMusState`; las salas antiguas mantienen cuatro reyes y un juego.

Las seña físicas, corte manual y errores de reparto no se simulan como acciones digitales. No se añade juego real, ausente en la fuente. La posición inicial de parejas continúa siendo la asignada por la sala.

## Parchís

Disponible para 2–4 jugadores, con cuatro fichas por color, tablero de 68 casillas y pasillos de llegada. Se implementan tirada inicial, salida con cinco, seises, barreras, capturas y bonificaciones, llegada exacta y victoria. El tablero se amplía y las fichas se pueden elegir mediante botones grandes. Fuente, decisiones de edición y pruebas: [design/PARCHIS.md](design/PARCHIS.md).

## Estructura para ampliar juegos

La presentación común utiliza ilustraciones 2D, mesa de madera y tapete verde. Cinquillo y Mus muestran los diez retratos originales en una fila discreta fuera del tapete. Los nombres y cantidades públicas de cartas quedan al lado; Mus indica compañero y parejas A/B. La mano privada y los controles permanecen visibles en web y Android LAN. Las caras españolas y francesas son imágenes tradicionales originales almacenadas en `apps/web/assets/decks/`, con licencia y procedencia de cada carta. La mano propia conserva botones accesibles; las rivales solo reciben cantidades públicas. Hay vuelo de cartas y reacciones breves, con movimiento reducido respetado. Los huecos de cartas pendientes permanecen invisibles.

`seatPosition` prepara posiciones para 2–8 participantes y `renderSeats` acepta vistas de tablero sin cartas. No habilita Parchís de ocho colores ni amplía el límite actual de Cinquillo (2–6) o Mus (4). No se copian como reglas los tableros ni los recuentos dibujados en los mockups. La composición, sus capas y los recursos están documentados en `design/MESA_2D.md`. No se utiliza WebGL ni modelos 3D.

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Fuentes | `reglas_juegos/` | Copias originales, procedencia, integridad y biblioteca sin scripts |
| Fichas | `packages/game-core/src/catalog.ts` | Familias, variantes, materiales, fases, acciones y criterios de aceptación |
| Material | `packages/game-core/src/deck.ts` | Española 40/48, póker 52/54, varias barajas con identidad física, dominó doble seis |
| Motores | `packages/game-core/src/games/` | Estado del anfitrión, validación y vista privada por jugador |
| Registro | `packages/game-core/src/engine.ts` | Solo motores de fichas disponibles; nunca planes pendientes |
| Presentación | `apps/web/table-view.js`, `apps/mobile/src/components/` | Tablero, mano privada, acciones y animaciones |
| Transporte | Archivos existentes de sala | Envío del estado y las acciones; sin cambios de conexión |
| Comprobaciones | `tests/` | Partidas completas, reglas, privacidad, integración y recursos sin conexión |

Las fichas cubren secuencias, bazas, combinaciones, captura, apuestas, banca, parejas, farol, carreras, damas y fichas de dominó. Una nueva implementación debe resolver las decisiones expresas de su ficha, construir su estado/acciones/vista, comprobar reglas y privacidad, añadir su mesa y solo entonces cambiar `status` a `playable` y registrar su motor.

Las identidades `PhysicalCard.id` distinguen cartas iguales de barajas diferentes. Los motores nuevos de Remigio/Continental no deben identificar cartas solo por palo e índice. El material de póker español usa los cuatro palos españoles con índices A–K, no la española ordinaria de 40/48.

La biblioteca transcribe los PDFs multilingües, pero el texto español original prevalece. Mentiroso presenta un objetivo inicial que contradice su final: la ficha adopta el final explícito (pierde el último con cartas). Burro es la variante de parejas del PDF. Guiñote sigue el reparto completo de la fuente; no se sustituye por otro reglamento regional. Oca usa 63 casillas y los efectos del texto español del PDF. Parchís fija su edición y coordenadas en `design/PARCHIS.md`.
