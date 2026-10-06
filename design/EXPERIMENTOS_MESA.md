# Distribución de Cinquillo · octubre de 2026

## Objetivo y referencias

Mantener visibles la información para decidir, la mano y la acción del turno. Conservar los personajes ilustrados y las barajas tradicionales. Separar lo necesario para jugar de las consultas ocasionales.

Se revisaron páginas y capturas oficiales, sin reutilizar sus recursos gráficos ni realizar partidas de usuario en esos productos:

- [UNO Mobile](https://www.letsplayuno.com/): jerarquía visual de mesa, rivales y mano propia.
- [Trickster Cards](https://www.trickstercards.com/features/for-beginners/): ayudas sobre cartas jugables y ayuda de reglas separada.
- [Solitaire de MobilityWare](https://www.mobilityware.com/klondikesolitaire/): adaptación a vertical y horizontal; prioridad a la lectura de los naipes.
- [Cinquillo de Ludoteka](https://www.ludoteka.com/juegos/cinquillo): referencia del juego y sus escaleras por palo.

La selección siguiente es una decisión de diseño apoyada en pruebas geométricas y revisión visual; no equivale a un estudio de usabilidad con personas ni a una exploración exhaustiva del mercado.

## Comparación inicial

Cinco composiciones se simularon en 45 situaciones cada una: cinco tamaños, 2/4/6 participantes y reparto/18 jugadas/mesa completa. Total: 225 simulaciones de prototipos. La mesa completa es un estado público sintético para estresar el diseño; la fase intermedia se obtiene mediante acciones legales del motor.

| Prototipo | Mano dentro de pantalla | Juego dentro del tapete | Página sin desplazamiento vertical | Decisión |
|---|---:|---:|---:|---|
| Pantalla anterior con scroll | 0/45 | 27/45 | 0/45 | Reorganizar: obliga a alternar mesa y mano |
| Cuatro columnas y mano fija | 38/45 | 43/45 | 38/45 | Base para móvil vertical; corregir límites |
| Cuatro zonas, dos por dos | 36/45 | 27/45 | 36/45 | Reservar a pantallas amplias y altas |
| Escaleras completas solapadas | 37/45 | 21/45 | 37/45 | Descartar: 18 casos de solapamiento entre extremos |
| Mano en panel lateral | 45/45 | 30/45 | 36/45 | Descartar: estrecha el tapete |

Las cifras corresponden a prototipos previos al ajuste final, no al producto terminado. «Mano dentro de pantalla» se refiere a la franja de cartas: las manos largas se desplazan horizontalmente, no se presentan veinte cartas simultáneamente.

## Composición elegida

- Cabecera breve con juego, número de mano, acceso a todas las cartas y menú.
- Rivales detrás del borde superior, orientados hacia el juego. El jugador local no aparece como avatar.
- Cuatro columnas en móvil vertical. Cada palo muestra sus dos extremos completos, uno encima del otro. El cinco inicial aparece una sola vez.
- En horizontal con poca altura, cuatro columnas con extremos lado a lado y controles junto a la mano.
- A partir de 700 × 700, cuatro zonas en dos filas con extremos lado a lado. El tamaño se calcula respecto al espacio real del tapete.
- Mano persistente, caras completas y filtros Todas/Oros/Copas/Espadas/Bastos. Cada filtro indica cantidad y si contiene alguna jugada legal. Filtrar es una operación local sin efectos en el motor.
- Turno y acción junto a la mano. Pasar solo se habilita cuando está permitido. El ganador puede continuar y consultar los puntos.
- Marcador, reglas, historial y salida en el menú. La consulta ampliada conserva todos los naipes públicos, a 108 píxeles de ancho y sin superposición.

No se añaden números encima de las caras originales. Las cartas intermedias se resumen en las pilas de los extremos porque no ofrecen una nueva acción legal; se mantienen consultables con «Mesa». Verde profundo, borde fino de madera, papel claro y dorado suave forman la paleta.

## Verificación reproducible

Tras `npm run build:web`, ejecutar:

```sh
node tests/cinquillo-layout.mjs
LAYOUT_BROWSER=webkit node tests/cinquillo-layout.mjs
node tests/table-navegador.mjs
TABLE_BROWSER=webkit node tests/table-navegador.mjs
```

La matriz final contiene 225 casos por navegador: 15 tamaños entre 320 × 568 y 1280 × 800, incluidos 640 × 360 y los límites de las distribuciones; 2–6 jugadores, nombres largos y tres estados. Se comprueba la franja de mano, ausencia de scroll de página, cartas dentro del tapete, etiquetas sin colisiones, caras no tapadas y controles de al menos 44 × 44 píxeles. Los nombres largos se abrevian visualmente; el marcador y las etiquetas accesibles conservan el nombre completo.

La suite de mesa añade cartas dentro del borde curvo, integridad y proporciones de las barajas, privacidad, filtros sin acciones, cambio de orientación, conservación del foco y del scroll de consultas al recibir actualizaciones, cierre con Escape, siguiente mano, Mus, movimiento reducido y caché sin conexión. La prueba LAN usa varios navegadores y el servidor Java real.

Las capturas y medidas se guardan en `tests/artifacts/`, fuera del paquete Android. El flujo Android ejecuta ambas suites en Chromium y WebKit y publica las evidencias como un artefacto separado.

Límites: las pruebas de navegador no sustituyen una prueba física en iPhone o Android ni una sesión de accesibilidad con personas. En alturas inferiores al mínimo de diseño se conserva desplazamiento vertical para evitar comprimir más las cartas. La barra del navegador se contempla mediante el alto dinámico disponible y los márgenes seguros del dispositivo.
