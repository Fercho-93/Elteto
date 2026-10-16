export default {
  tagline: 'Parejas, diez cartas cada uno y **cantes de sota y rey**: la sota manda sobre el caballo y la partida se juega a 101 puntos.',
  facts: [['Jugadores', '4, en dos parejas'], ['Baraja', 'Española de 40'], ['Meta', 'Tres juegos de 101 puntos'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Tu pareja y tú debéis reunir **101 puntos** antes que los rivales, sumando las cartas que ganáis en las bazas, los **cantes** y los **diez de últimas**. Cada vez que lo consigue una pareja, anota un **juego**; gana la partida la primera pareja con **tres juegos**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas y **cuatro jugadores en dos parejas**; los compañeros se sientan enfrentados.',
        'Se reparten **las 40 cartas, diez a cada jugador**. No hay mazo ni se roba.',
        'La **pinta** es la última carta que recibe el que reparte: se enseña y su palo es el **triunfo**.',
        'El reparto rota en cada mano. Sale en la primera baza el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Valor y fuerza de las cartas', blocks: [
      'En el guiñote la **sota** vale más que el caballo, al contrario que en otros juegos.',
      { table: { head: ['Carta', 'Puntos'], rows: [['As', '11'], ['Tres', '10'], ['Rey (12)', '4'], ['Sota (10)', '3'], ['Caballo (11)', '2'], ['7, 6, 5, 4, 2', '0']] } },
      { note: 'Fuerza de mayor a menor: **as, tres, rey, sota, caballo, 7, 6, 5, 4, 2**. Las cartas suman 120 puntos y la **última baza** da **10 más**.' },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'Sale una carta el jugador siguiente al que reparte; su palo es el de salida.',
        'Los demás juegan por orden, cumpliendo las obligaciones de servir.',
        'Gana la baza el **triunfo más alto** o, si no hay, la carta más alta del palo de salida.',
        'Quien gana recoge las cartas para su pareja y **sale** en la siguiente.',
      ] },
    ] },
    { title: 'Servir y montar', blocks: [
      'En todas las bazas, en este orden:',
      { list: [
        '**Asistir**: si tienes del palo de salida, debes jugar de ese palo.',
        '**Montar**: si puedes superar la carta ganadora, **debes** hacerlo, aunque vaya ganando tu compañero.',
        '**Fallar**: si no tienes del palo, pero sí triunfos, debes jugar triunfo y **superar** al que haya, si puedes.',
        'Si no tienes ni el palo ni triunfos, o no puedes superar un triunfo, juegas cualquier carta.',
      ] },
    ] },
    { title: 'Cantes y tute', blocks: [
      'Cuando tu pareja gana una baza, tú o tu compañero podéis cantar un palo del que tengáis en la mano la **sota y el rey**.',
      { list: [
        '**20** en un palo cualquiera; **40** en el palo de triunfo.',
        'Un jugador solo puede cantar **una vez cada palo**. Si tienes sota y rey del triunfo, **cantas antes las cuarenta**.',
        'Los puntos del cante suman al instante al marcador de la pareja.',
        '**Tute**: quien tenga los **cuatro reyes** o las **cuatro sotas** puede cantar tute y **gana el juego en el acto**.',
      ] },
    ] },
    { title: 'Puntuación y fin de la partida', blocks: [
      { steps: [
        'Al agotarse las cartas, cada pareja cuenta sus puntos: cartas + cantes + diez de últimas.',
        'Si una pareja llega a **101 o más**, anota un juego. Si ambas llegan, anota quien tenga más; si empatan, la que ganó la última baza.',
        'Si **ninguna** llega a 101, los puntos **no se pierden**: se suman a los de la mano siguiente. Reparte el ganador de la última baza.',
        'Con puntos acumulados, la pareja que pase de **101** durante una mano puede pulsar **«Cantar 101»** y anotar el juego sin terminar de jugarla.',
        'Se juega hasta que una pareja anota **tres juegos**.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Es la variante de **diez cartas por jugador y sin baceta**: no se roba ni se cambia la pinta.',
        'Las cartas que no puedes jugar quedan bloqueadas; solo se pueden tocar las legales.',
        'Tras cada baza verás **«Continuar»**, los cantes disponibles («Cantar 20» o «Cantar 40» con el palo) y, si tienes los cuatro reyes o las cuatro sotas, **«Cantar tute»**. Pueden cantar los dos miembros de la pareja.',
        'El marcador de pareja se comparte: «Pareja A» y «Pareja B». Los puntos acumulados pasan a la mano siguiente.',
        'El botón **«Siguiente mano»** inicia otra mano; la partida acaba sola al llegar a tres juegos.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Con el rey y la sota de un palo, **espera a ganar una baza** para cantar; si te los juegan antes, pierdes el cante.',
        'Intenta ganar la **última baza**: son 10 puntos seguros.',
        'Ayuda a tu compañero a ganar bazas con **ases y treses**, y cuenta los triunfos que han salido.',
      ] },
    ] },
  ],
};
