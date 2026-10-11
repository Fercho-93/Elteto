# Mus digital — contrato de implementación

Definido antes de implementar. Referencia: Federación de Mus, Reglamento V.7 (16/02/2025), https://lafederaciondemus.es/wp-content/uploads/2026/02/Reglamento-de-Juego-Federacion.pdf.
La adaptación expresamente solicitada es una única partida a 30 o 40 tantos, sin vacas ni varios juegos. Se conserva el perfil anterior exclusivamente para continuar salas ya guardadas.

## A. Modelo

Autoridad: estado serializable versionado, cuatro asientos inmutables, parejas alternas, mano y postre, objetivo, fase, lance, estado del envite, decisiones/declaraciones, descartes confirmados, libro de tanteo y eventos con secuencia. Privado: manos, mazo, descartes y cálculos. Vista individual: solo la mano propia, su análisis y señas; declaraciones públicas booleanas; cantidades de descarte; marcador y hechos públicos. Ninguna comparación ganadora de un envite aceptado se publica antes de enseñar las cartas.

## B. Estados

LOBBY y SETUP pertenecen a la sala. El motor recorre DEALING → CARDS_DEALT → MUS_DECISION → MUS_DISCARD → MUS_REDEAL → CARDS_DEALT → MUS_DECISION. Al cortar: GRANDE → CHICA → PARES_DECLARATION → PARES → JUEGO_DECLARATION → JUEGO o PUNTO → SHOWING_CARDS → COUNTING → HAND_OVER o GAME_OVER. Los estados transitorios son reales y se publican; un avance de la autoridad, con revisión esperada, evita dobles transiciones. Internamente cada lance usa WAITING_FOR_TURN/PASS/BET/RAISE/ACCEPT/REJECT/ORDAGO/RESOLVE. Las fases no se resuelven por temporizadores del cliente.

## C. Reglas

40 cartas, ocho reyes/ases. 3=rey, 2=as; figuras y treses=10, ases y doses=1. Comparaciones lexicográficas de grande, chica y pares; juego 31,32,40,37,36,35,34,33; punto 30 descendente. Empates favorecen al primer asiento desde la mano. Pares/medias/duples valen 1/2/3 por cada integrante de la pareja ganadora; juego 31 vale 3, otros juegos 2. La Real queda excluida. El reparto y reciclaje conservan las 40 cartas. El mus normal requiere descartar al menos una carta: cero cartas solo pertenece al mus visto, imposible con reparto digital oculto. Las declaraciones son confirmaciones veraces comprobadas en el motor. Cortes anticipados se autorizan según arts.26/28. Las acciones del interfaz son decisiones vinculantes de pareja; así no simulan expresiones simultáneas orales. El compañero se consulta físicamente. Se impide aceptar órdagos reglamentariamente inválidos de mínimo postre. No hay señas enviadas por red.

## D. Mano

Repartir sin revelar siquiera la mano propia hasta completar reparto. Decidir mus por orden, publicar respuestas, seleccionar localmente y confirmar descarte, publicar solo cantidades, reponer cuando todos confirmen, repetir. Tras corte publicar autor; gestionar pasos/envites y sus respuestas; declarar pares/juego sin cantidades ni categorías privadas. Mostrar cartas solo al cerrar el último lance o aceptar órdago. Un lance aceptado queda pendiente, sin anunciar ganador antes de tiempo.

## E. Tanteo

Negadas/reenvites rechazados se apuntan al cerrar ese lance (art.62). Al mostrar cartas, resolver el resto en orden grande, chica, pares, juego/punto. Mantener entradas separadas por paso, envite, negada y valor propio. Pares/juego/punto no tienen deje (art.61); el punto intrínseco se conserva. Registrar antes/después, incremento, lance, causa, ganador y mano. Detener al alcanzar o superar objetivo, sin contar lances posteriores. Órdago aceptado anula envites pendientes anteriores. Amarracos=floor(total/5), piedras=total%5, sin acumulaciones independientes que puedan divergir. A cuatro o menos de meta: «estamos dentro» y amarracos centrales.

## F/G. Mesa y perspectiva

Vertical primero: marcador discreto superior, compañero enfrente, rivales a ambos lados, yo abajo; nombres bajo personajes. Tapete verde oscuro y centro MUS/lance/envite/habla. Cuatro cartas españolas grandes en el tercio inferior con desplazamiento horizontal si no caben; acciones bajo las cartas. En pantallas cortas se permite desplazamiento vertical para conservar el tamaño de cartas y controles, sin superponer nombres y lance. Confirmación separada del descarte. Acciones distintas para mus/corte, paso/envite/órdago, quiero/no quiero. Declaraciones y decisiones visibles. Historial, estado, señas propias y recuento en paneles accesibles. Detalle del tanteo y cartas enseñadas consultables sin perder la partida.

## H. Comunicación y límites

Se reutilizan WebRTC offline, WebSocket LAN Android y Firestore online. La autoridad valida identidad, revisión, turno y getAvailableActions antes de aplicar; cada mensaje de estado procede de view(playerId), nunca de state. Firestore limita cada vista al usuario y secret/state al anfitrión. El Android anfitrión conserva la autoridad: no es un servidor independiente ni puede prometerse protección frente a un anfitrión que modifique su propio código. Jugadores remotos no reciben ni pueden leer las manos ajenas. La reconexión LAN y online conserva asiento; la conexión WebRTC original conserva la plaza y pausa la mesa, pero no incorpora una nueva negociación por QR durante una partida; una ausencia pausa Mus sin jugar automáticamente por una persona.
Temporizadores casuales desactivados; configuración y deadlines previstos para modo competitivo posterior. Eventos usan secuencia determinista y hora de la autoridad opcional; la hora no afecta al resultado. Versionar y migrar sin reinterpretar partidas antiguas.

## Verificación por fase

Validar cuatro jugadores/cartas y conservación de baraja, turno y acciones legales, no filtrar mano/mazo/análisis ajenos, libro de tanteo consistente y cierre inmediato de objetivo. Pruebas puras de comparadores, manos completas, mus repetido, envites/reenvites/negadas/órdago y objetivos; pruebas de vistas y canales de cuatro jugadores; pruebas móviles y perspectivas relativas.

## Comprobaciones ejecutadas

- Motor: 100 partidas completas FEM a 30/40, comparadores y empates por mano; seis rondas consecutivas de descarte; envites, negadas, reenvites y órdagos; límites de postre; recuento interrumpido al ganar y determinismo.
- LAN: cuatro sesiones independientes, confirmaciones simultáneas, estados de reparto ocultos, mensajes sin manos ajenas, desconexión y vuelta al mismo asiento y mano.
- Online: sesiones reales contra emuladores Auth/Firestore, cuatro manos privadas y aceptación sincronizada; permisos del estado secreto y vistas individuales; recuperación de la autoridad.
- Navegador Chromium: 24 perspectivas y tamaños, controles reales, selección previa al descarte, cartas enseñadas, historial y vuelta desde las reglas. En pantallas cortas se comprueba que lance y nombres no se solapan.
- Regresiones: suite npm, reglas de Firestore y acceso. Las pruebas WebKit están incorporadas al flujo de GitHub Actions. No se sustituyen por pruebas en cuatro teléfonos físicos.
