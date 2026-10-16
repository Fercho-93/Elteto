export default {
  tagline: 'Baza a baza, con **cantes de 20 y 40**, cambio de pinta y la amenaza del tute: cuatro reyes o cuatro caballos.',
  facts: [['Jugadores', '2, 3 o 4 (parejas)'], ['Baraja', 'Española de 40'], ['Meta', 'Tres juegos'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano sumas puntos con las cartas de las bazas que ganas y con los **cantes**. Quien cierra la mano con más puntos anota un **juego**. Gana la partida quien consigue **tres juegos**. Con dos jugadores, un juego exige llegar a **101 puntos**, que pueden acumularse en varias manos.',
    ] },
    { title: 'Material y preparación', blocks: [
      { table: { head: ['Jugadores', 'Cartas por mano', 'Particularidades'], rows: [
        ['2', '8', 'Hay mazo y se roba. 101 puntos por juego, con acumulación. Se puede intentar el capote.'],
        ['3', '13', 'Cada uno juega por su cuenta. Queda una sola carta en el mazo: la pinta, que puede cambiarse al inicio.'],
        ['4', '10', 'Dos parejas alternas y sin mazo: se juegan las diez cartas repartidas.'],
      ] } },
      { list: [
        'La **pinta** (su palo es el triunfo) es la carta boca arriba al fondo del mazo. Con 4 jugadores es la última carta que recibe el que reparte.',
        'El reparto rota en cada mano. Empieza el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Valor y fuerza de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [['As', '11'], ['Tres', '10'], ['Rey (12)', '4'], ['Caballo (11)', '3'], ['Sota (10)', '2'], ['7, 6, 5, 4, 2', '0']] } },
      { note: 'Fuerza de mayor a menor: **as, tres, rey, caballo, sota, 7, 6, 5, 4, 2**. Las 40 cartas suman 120 puntos; la **última baza** vale **10 más** («diez de últimas»).' },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'Sale el jugador siguiente al que reparte y juega una carta; su palo es el de salida.',
        'Cada jugador juega una carta, por orden, respetando la obligación de servir (ver más abajo).',
        'Gana la baza el **triunfo más alto** o, si no hay triunfos, la carta **más alta del palo de salida**.',
        'El ganador recoge las cartas, puede **cantar** o **cambiar la pinta** y, si hay mazo (2 jugadores), roba primero. Después **sale**.',
        'Al agotarse las cartas, se cuentan los puntos y se anota el juego.',
      ] },
    ] },
    { title: 'Servir, montar y fallar', blocks: [
      'Con 3 y 4 jugadores, y con 2 cuando el mazo ya está agotado, rigen estas obligaciones, **en este orden**:',
      { list: [
        '**Asistir**: si tienes del palo de salida, debes jugar de ese palo.',
        '**Montar**: si puedes superar la carta que va ganando, **debes** hacerlo. Si no puedes, juegas cualquiera de ese palo. Se aplica también si va ganando tu compañero.',
        '**Fallar**: si no tienes del palo de salida pero sí triunfos, debes jugar triunfo, y **superar** al triunfo que ya haya si puedes.',
        'Si no tienes del palo ni triunfos, o no puedes superar un triunfo ajeno, juegas la carta que quieras.',
      ] },
      { note: 'Con dos jugadores y mazo, **no hay obligación de servir**, salvo una: si te salen de triunfo y tienes triunfos, debes jugar uno.' },
    ] },
    { title: 'Cantes', blocks: [
      'Tras ganar una baza puedes cantar un palo en el que tengas **caballo y rey** juntos en la mano.',
      { list: [
        '**20** en un palo cualquiera y **40** en el palo de triunfo.',
        'Cada palo se canta **una sola vez** por jugador. Los puntos se suman al instante.',
        'Si tienes caballo y rey del triunfo, **cantas primero las cuarenta**; no puedes cantar antes un palo de 20.',
        'En parejas, los dos compañeros pueden cantar cuando la baza la gana alguno de ellos, y los puntos suman al equipo.',
      ] },
    ] },
    { title: 'Cambio de pinta', blocks: [
      'Puedes cambiar la pinta por el **siete de triunfo** (si la pinta es sota o superior) o por el **dos de triunfo** (si es 7, 6, 5 o 4).',
      { list: [
        'Con 2 jugadores: solo el **ganador de la baza**, antes de robar, y mientras quede en el mazo más cartas que jugadores.',
        'Con 3 jugadores: al empezar la mano, cada jugador por orden elige **«Cambiar triunfo»** o **«Continuar»**.',
        'Con 4 jugadores no existe: la pinta está en la mano del que reparte.',
      ] },
    ] },
    { title: 'Tute, capote y 101', blocks: [
      { list: [
        '**Cantar tute** (3 y 4 jugadores): quien tenga los **cuatro reyes** o los **cuatro caballos** lo canta y **gana el juego en el acto**, sin esperar al recuento.',
        '**Capote** (2 jugadores): cuando se agota el mazo, el jugador que sale puede pulsar **«Intentar capote»** antes de jugar. Se compromete a ganar **todas** las bazas restantes: si lo logra, gana el juego; si pierde una, **el juego es para el rival**.',
        '**101 (2 jugadores)**: si nadie llega a 101 al terminar la mano, los puntos **se conservan** y se suman a los de la mano siguiente. Quien tenga ya 101 o más durante una mano posterior puede pulsar **«Cantar 101»** y gana el juego. Reparte el ganador de la última baza.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      { list: [
        '**3 y 4 jugadores**: al acabar la mano, el jugador o la pareja con **más puntos** anota un juego. Si hay empate y el ganador de la última baza está entre los empatados, se lo lleva.',
        '**2 jugadores**: anota el juego quien llegue a **101 o más** al acabar la mano (en caso de empate, quien ganó la última baza).',
        'Gana la partida quien llega a **tres juegos**.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación reparte, roba, suma puntos y comprueba que tu carta sea legal: solo se pueden tocar las cartas permitidas.',
        'Tras cada baza ganada verás los botones **«Continuar»**, **«Cantar 20/40 · palo»** y **«Cambiar triunfo»**, solo si están disponibles.',
        'Con 4 jugadores formas pareja con quien tienes enfrente; el marcador se comparte por «Pareja A / B».',
        'Las variantes están fijadas por el número de jugadores (ver tabla). No hay cartas de 8 y 9, ni apuestas.',
        'El botón **«Siguiente mano»** abre la siguiente mano; la partida termina sola al llegar a tres juegos.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Cuando te toque cantar, hazlo en cuanto puedas: un rey o un caballo puede acabar jugándose y perderás el cante.',
        'Guarda el as o el tres del triunfo para ganar las últimas bazas: **los diez de últimas** deciden muchos juegos.',
        'Recuerda que **debes montar**, incluso sobre tu compañero.',
      ] },
    ] },
  ],
};
