export default {
  tagline: 'Acércate a **7½** sin pasarte. Un jugador hace de banca y los demás se juegan fichas contra él.',
  facts: [['Jugadores', '2–8'], ['Baraja', 'Española de 40'], ['Partida', '15 manos'], ['Fichas', '100 por jugador'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano intentas sumar **7½ puntos o lo más cerca posible sin pasarte**. Quien se pasa pierde su apuesta. Al terminar la partida gana quien tenga **más fichas**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Se usa la baraja española de 40 cartas (sin ochos ni nueves).',
        'Cada jugador empieza con **100 fichas**. No hay dinero real: las fichas solo cuentan dentro de la partida.',
        'Un jugador hace de **banca** y el resto son los apostantes. La primera banca es el primer jugador de la mesa.',
        'Al empezar cada mano se reparte **una carta a cada jugador**, también a la banca. Esa primera carta queda **oculta** para los demás; solo tú la ves.',
      ] },
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [
        ['As, 2, 3, 4, 5, 6, 7', 'Su número (el as vale 1)'],
        ['Sota, caballo y rey', '**Medio punto**'],
      ] } },
      'Tu total puede acabar en ½. Por ejemplo, un 5, un 3 y un rey suman 8½: te has pasado. Un 7 y un rey suman **7½**, la mejor mano posible.',
    ] },
    { title: 'Cómo se juega una mano', blocks: [
      { steps: [
        'Empezando por el jugador que sigue a la banca, cada apostante ve su carta y **apuesta** de 1 a 10 fichas (más abajo, el tope exacto).',
        'Justo después de apostar, ese jugador **pide cartas** o **se planta**. Puede pedir tantas veces como quiera.',
        'Si pides, eliges cómo: **boca arriba** (todos la ven) o **oculta**. Solo puedes tener **una carta oculta**: al pedir otra oculta, la anterior se destapa.',
        'Si tu total supera 7½ te **pasas**: se destapan tus cartas, pierdes tu apuesta y tu turno termina solo.',
        'Cuando han jugado todos, juega la **banca**. Sus cartas ya se ven todas. Pide o se planta con las mismas reglas, pero **no puede pedir oculta**.',
        'La banca se planta o se pasa y se hace el recuento: se enseñan todas las cartas y se pagan las apuestas.',
      ] },
    ] },
    { title: 'Quién gana a quién', blocks: [
      'Cada apostante se compara solo con la banca:',
      { list: [
        'Si **te pasas**, pierdes tu apuesta, aunque la banca también se pase.',
        'Si la banca se pasa y tú no, **ganas** tu apuesta.',
        'Si ninguno se pasa, gana quien tenga **más puntos**. En caso de **empate gana la banca**.',
      ] },
      { note: 'Un 7½ ganador cobra el **doble** de su apuesta y además **toma la banca** en la mano siguiente. Si tienes 7½ y la banca también, es un empate y pierdes la apuesta normal.' },
    ] },
    { title: 'La banca y el reparto de fichas', blocks: [
      { list: [
        'Si varios apostantes ganan con 7½ en la misma mano, toma la banca el primero según el orden de la mesa.',
        'Si nadie gana con 7½, **la banca sigue** siendo la misma.',
        'La banca debe poder pagar el doble a todos. Si le quedan pocas fichas para cubrir las apuestas, o se queda sin ellas, **pasa al jugador con más fichas**.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'La partida dura **15 manos**. Gana quien acabe con **más fichas**; si hay empate a fichas, el jugador que se siente antes en la mesa.',
      'Termina antes si solo queda **un jugador con fichas**. Quien llega a 0 fichas queda eliminado y deja de apostar.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Los botones de apuesta muestran de «1 fichas» hasta tu máximo. El máximo es el menor de estos tres valores: tus fichas, **10** y las fichas de la banca divididas entre **2 × (jugadores − 1)**. Así la banca siempre puede pagar un 7½ doble a todos.',
        'Ves tu total en pantalla («Tu suma»). Los botones de turno son **Pedir boca arriba**, **Pedir oculta** y **Plantarse**.',
        'Se pasa de turno solo: al plantarte, al pasarte o cuando la banca resuelve. Si todos los apostantes se pasan o no apuestan, la banca no tiene que jugar.',
        'Cuando se acaba la mano se enseñan todas las cartas y se muestra «Banca resuelta». Pulsa **Siguiente mano** para seguir.',
        'No hay compra de banca ni dinero: solo las 100 fichas iniciales. Si el mazo se agotase, solo podrías plantarte.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Con una figura (medio punto) puedes pedir sin riesgo: la carta más alta es un 7 y sumarías como mucho 7½. Cuanto más cerca estés de 7½, más peligroso es pedir.',
        'Recuerda que la banca gana los empates; con 7 te interesa más superarla que igualarla.',
        'Apuesta alto cuando tu primera carta sea buena y bajo cuando necesites arriesgar.',
        'Vigila las cartas visibles de los demás: sirven para adivinar qué oculta tienen.',
      ] },
    ] },
  ],
};
