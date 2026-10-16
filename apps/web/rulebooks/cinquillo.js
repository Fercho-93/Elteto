export default {
  tagline: 'Un juego de escaleras sobre la mesa: **ser el primero en quedarte sin cartas** y cobrar las de los demás.',
  facts: [['Jugadores', '2 a 6 (clásico: 4)'], ['Baraja', 'Española de 40 cartas'], ['Meta', '30 puntos'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano, intenta **quedarte sin cartas antes que los demás** colocándolas en la mesa formando escaleras de cada palo.',
      'La partida se juega a varias manos: gana quien llegue primero a **30 puntos**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Se usa la baraja española de 40 cartas: as, 2, 3, 4, 5, 6, 7, sota, caballo y rey de cada palo (no hay 8 ni 9).',
        'Se reparten **todas** las cartas, una a una. Con 4 jugadores son 10 cada uno. Si no sale exacto (3, 5 o 6 jugadores), algunos reciben una carta más.',
        'Empieza la mano quien tiene el **5 de oros**. Los turnos siguen el orden de la mesa.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      'En tu turno juegas **una carta** o pasas, pero solo puedes pasar si no tienes ninguna jugada.',
      { steps: [
        'La primera carta de la mano es siempre el **5 de oros**.',
        'Después, cada palo se abre con su **5**: puedes colocar el 5 de cualquier palo en cualquier momento de tu turno.',
        'Una escalera ya abierta crece por sus dos extremos: puedes poner la carta **inmediatamente inferior** al extremo bajo o la **inmediatamente superior** al extremo alto, siempre del mismo palo.',
        'Si tienes alguna carta jugable, **tienes que jugar**: no se puede pasar para guardar cartas.',
      ] },
      { note: 'Ojo con el salto: en la baraja española después del **7** va la **sota**, sin 8 ni 9. La escalera completa de un palo es 1, 2, 3, 4, 5, 6, 7, sota, caballo, rey.' },
    ] },
    { title: 'Orden de las cartas', blocks: [
      { table: { head: ['Posición', 'Carta'], rows: [
        ['1 a 7', 'As, 2, 3, 4, 5, 6, 7'],
        ['8', 'Sota (10)'],
        ['9', 'Caballo (11)'],
        ['10', 'Rey (12)'],
      ] } },
      'El as no se une al rey: son los dos extremos de la escalera. Una escalera llega a su fin cuando ha alcanzado el as por abajo y el rey por arriba.',
    ] },
    { title: 'Fin de la mano y puntuación', blocks: [
      'La mano termina cuando alguien juega su última carta. Se cuentan las cartas que conservan los demás:',
      { list: [
        'Quien se queda sin cartas **suma 5 puntos más una por cada carta** que quedaba en las manos de todos los rivales.',
        'Cada rival **resta** tantos puntos como cartas conserve.',
      ] },
      'Ejemplo con 4 jugadores: A se queda sin cartas; B conserva 3, C conserva 1 y D conserva 4. A suma 5 + 8 = **13**; B resta 3, C resta 1 y D resta 4.',
      'Los puntos se acumulan de mano en mano y **pueden ser negativos**.',
    ] },
    { title: 'Cómo se gana', blocks: [
      { list: [
        'Si al cerrar una mano quien se ha quedado sin cartas llega a **30 puntos o más**, gana la partida.',
        'Si no, el ganador de la mano da paso a un nuevo reparto y empieza quien tenga el 5 de oros.',
        'Si nadie puede jugar y todos pasan seguidos, la mano queda **bloqueada** y la partida termina sin ganador.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación reparte, saca el turno y reconoce por sí sola quién tiene el 5 de oros. Tu mano se muestra con filtros por palo para encontrar cartas más rápido.',
        'Tocas una carta para colocarla. La aplicación **solo admite jugadas válidas**: si la carta no continúa ninguna escalera, no se juega.',
        'El botón **Pasar** está activo en tu turno, pero la aplicación rechaza el paso si tienes una jugada posible.',
        'Cada mano cuenta con su pantalla de resultado: puntos de la mano, marcador y quién gana. Quien ha ganado la mano inicia el siguiente reparto.',
        'La modalidad clásica es de 4 jugadores. Elteto permite mesas de **2, 3, 4, 5 y 6** con las mismas reglas y la misma puntuación; con 3, 5 y 6 algunos reciben una carta de más.',
        'La meta es siempre de **30 puntos**. No hay otras variantes de baraja ni de puntuación.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Abre pronto los palos en los que tengas muchas cartas seguidas: así controlas tus propias salidas.',
        'Guarda el 5 de un palo mientras te convenga: es la única forma de que otros no avancen en ese palo.',
        'Si tienes varias cartas jugables, evita colocar las que abren camino a los rivales y reserva esas para cuando no tengas alternativa.',
        'Cuando vaya a terminar otro jugador, intenta soltar cartas altas o difíciles: cada carta que te quede cuesta un punto.',
      ] },
    ] },
  ],
};
