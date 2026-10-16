export default {
  tagline: 'Cuatro jugadores en dos parejas, 28 fichas y un objetivo: **vaciar la mano o dejar a los rivales con más puntos**.',
  facts: [['Jugadores', '4, en parejas'], ['Fichas', '28, doble seis'], ['Reparto', '7 por jugador'], ['Meta', '150 puntos'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Ganas cada mano si tú o tu compañero os quedáis **sin fichas**, o si la mesa se **tranca** y vuestra pareja tiene menos puntos en las fichas que quedan. La primera pareja que llegue a **150 puntos** gana la partida.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'El dominó doble seis tiene **28 fichas**, cada una con dos mitades numeradas de 0 (blanca) a 6.',
        'Se reparten **7 fichas a cada jugador**: no queda ninguna en el montón.',
        'Juegan dos **parejas** y los compañeros se sientan alternos: tú y tu pareja jugáis un turno sí y otro no.',
        'Se juega en el sentido de las agujas del reloj. Puede abrir con **cualquier ficha**; no hace falta empezar por el doble seis.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'El primer jugador coloca una ficha cualquiera. Será el principio de la **hilera**.',
        'Cada jugador, por turno, debe colocar una ficha en uno de los **dos extremos** de la hilera, haciendo coincidir el **mismo número**.',
        'Los dobles (6-6, 3-3…) se colocan como cualquier otra ficha. No tienen efectos especiales.',
        'Si no tienes ninguna ficha que encaje, **pasas**. Solo puedes pasar cuando no puedas jugar: si puedes, estás obligado.',
        'La mano termina cuando alguien se queda sin fichas o cuando se tranca el juego.',
      ] },
      { note: 'En cada mano **abre un jugador distinto**, rotando por la mesa en el sentido de juego, sea quien sea quien ganó la mano anterior.' },
    ] },
    { title: 'Domino y tranca', blocks: [
      { list: [
        '**Domino**: el jugador que coloca su última ficha cierra la mano y gana para su pareja.',
        '**Tranca**: si los cuatro jugadores pasan seguidos, el juego está cerrado y nadie puede colocar más fichas.',
        'En la tranca se suman los puntos de todas las fichas que quedan a cada pareja (las de los dos compañeros juntas). Gana la mano la pareja con **menos puntos**.',
        'Si las dos parejas empatan a puntos, **la tranca queda empatada y nadie puntúa**; la mano siguiente sigue con la rotación normal.',
      ] },
    ] },
    { title: 'Puntuación', blocks: [
      'La pareja que gana la mano suma **todos los puntos de las fichas que quedan sin colocar**, las de los rivales y también las de su propio compañero. El doble blanco vale 0.',
      { table: { head: ['Ficha', 'Puntos'], rows: [
        ['6-6', '12'],
        ['5-3', '8'],
        ['4-0', '4'],
        ['0-0', '0'],
      ] } },
      'Por ejemplo, si cierras la mano y entre las fichas que quedan en los otros tres jugadores hay 31 puntos, tu pareja suma **31**.',
    ] },
    { title: 'Cómo se gana', blocks: [
      'Se juegan manos hasta que una pareja alcanza o supera **150 puntos**: esa pareja gana la partida.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Solo se juega con **4 jugadores**. Los asientos 1 y 3 forman la **Pareja A** y los asientos 2 y 4 la **Pareja B**.',
        'Toca una de tus fichas y después elige **Izquierda** o **Derecha**. La aplicación orienta la ficha sola. Si la elección no encaja, te lo dirá.',
        'El botón **Pasar** solo se acepta si ninguna de tus fichas encaja en ningún extremo.',
        'La aplicación cuenta los pases: al cuarto seguido declara la tranca y reparte los puntos de la mano.',
        'Al acabar la mano verás un mensaje con la pareja ganadora y los puntos que suma. Pulsa **Siguiente mano**.',
        'La hilera avanza en línea: solo tiene dos extremos y no hay ramas. Cuando una pareja suma 150 la partida acaba sola.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Cuando puedas, empieza por las fichas altas: si hay tranca, restan puntos.',
        'Si tu compañero no tiene un número, **cierra los extremos** con ese número para que los rivales tengan que pasar.',
        'Cuenta los números que han salido: los siete de cada número te indican cuáles pueden quedar.',
        'Si pasas, tu compañero y tus rivales saben que no tienes ese número.',
      ] },
    ] },
  ],
};
