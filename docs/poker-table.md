# Mesa de Texas Hold’em

La interfaz presenta cada acción pública como una secuencia: anuncio, movimiento, resultado y pausa. Humanos e IA usan el mismo flujo. El motor valida turnos y cantidades; la presentación nunca decide el resultado ni modifica fichas.

## Información y privacidad

Cada asiento conserva espacios para personaje, nombre, saldo, dos cartas, última acción y apuesta. Retirarse elimina las cartas; el personaje permanece. Pulsar un personaje abre sus datos públicos. Solo la vista del propietario incluye su mano privada. Las cartas de rivales se publican durante el showdown; las manos retiradas permanecen ocultas. Si todos los rivales se retiran, el ganador puede seleccionar una o dos cartas para enseñarlas voluntariamente.

Los eventos estructurados contienen actor, secuencia, cantidad añadida, apuesta total y calle. No contienen cartas privadas. Los resultados publican importes exactos por receptor, categoría y los cinco naipes ganadores únicamente cuando esas manos ya son públicas. Las fichas impares siguen el orden a partir del repartidor.

## Presentación

- Ciegas: las fichas viajan desde los saldos a las zonas de apuesta.
- Reparto: dos vueltas en orden, con cartas propias visibles en el panel inferior.
- Apuesta: vuelo de 850 ms; el importe colocado cambia al llegar.
- Retirada: las cartas se desplazan y desaparecen en 650 ms.
- Fin de calle: las apuestas se recogen antes de revelar nuevas cartas.
- Flop: tres cartas sucesivas; turn y river separados incluso en un runout all-in.
- Showdown: cartas en cada asiento; los cinco naipes ganadores resaltados.
- Cobro: botes y devoluciones se entregan en orden, con importes exactos por jugador; el detalle de cada bote permanece consultable.
- Nueva mano: desplazamiento de D, ciegas y nuevo reparto.

Durante los movimientos se bloquean las acciones de juego. La información, las reglas, el menú y la salida siguen accesibles. La preferencia del sistema para reducir movimiento conserva las pausas legibles sin vuelos ni giros.

## Controles

La subida se prepara en un diálogo con deslizador, entrada numérica, incrementos de ciega grande y cantidades rápidas. Abrir o ajustar el selector no apuesta. Solo confirmar envía una acción validada por el motor. El saldo puede mostrarse en fichas o ciegas grandes. El sonido discreto es opcional y empieza desactivado.

## Verificación

`tests/poker-rules.mjs` cubre privacidad, eventos, cinco cartas exactas, revelación voluntaria, botes laterales, empates, fichas impares y runout. `tests/poker-interactions.mjs` prueba los controles y la secuencia de apuestas en Chromium y WebKit. `tests/poker-screen.mjs` comprueba 42 disposiciones móviles/horizontales. `tests/player-experience.mjs` comprueba que los mismos dibujos decodificados sobreviven a cada decisión y que las cifras no se solapan con las fichas.
