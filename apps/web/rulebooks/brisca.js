export default {
  tagline: 'Tres cartas en la mano, un palo de triunfo y una idea sencilla: **llévate las bazas que valen puntos**.',
  facts: [['Jugadores', '2, 3, 4 (parejas) o 6 (equipos)'], ['Baraja', 'Española de 40 (sin 8 ni 9)'], ['Meta', 'Tres juegos'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano intentas reunir **más puntos** que los demás con las cartas que ganes en las bazas. Quien lo consigue anota un **juego**. Gana la partida el primer jugador (o equipo) que llegue a **tres juegos**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas. Con **3 jugadores** se retira el dos de oros (39 cartas) y con **6 jugadores** se retiran los cuatro doses (36 cartas), para que el mazo se agote justo al final.',
        'Se reparten **3 cartas** a cada jugador. La carta que queda en el fondo del mazo, boca arriba, es la **pinta**: su palo es el **triunfo**.',
        'Con 4 jugadores se forman **dos parejas** y con 6 **dos equipos de tres**; los compañeros se sientan alternados con los rivales.',
        'El reparto rota en cada mano. Sale en la primera baza el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Valor y fuerza de las cartas', blocks: [
      'Cada carta tiene unos puntos al ganarse y una fuerza para decidir la baza. Fíjate en que **no coinciden**: el siete y el seis no valen nada, pero ganan al rey.',
      { table: { head: ['Carta', 'Puntos'], rows: [['As', '11'], ['Tres', '10'], ['Rey (12)', '4'], ['Caballo (11)', '3'], ['Sota (10)', '2'], ['7, 6, 5, 4, 2', '0']] } },
      { note: 'Fuerza de mayor a menor: **as, tres, rey, caballo, sota, 7, 6, 5, 4, 2**. El total de la baraja es de **120 puntos**; con más de 60 se gana.' },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'El primer jugador de la baza **juega una carta** de su mano. Su palo es el palo de salida.',
        'Los demás juegan una carta cada uno, por orden. **No hay obligación de asistir**: puedes echar la carta que quieras, sirvas o no al palo.',
        'Gana la baza el **triunfo más alto**; si nadie ha jugado triunfo, gana la carta más alta **del palo de salida**. Una carta de otro palo que no sea triunfo nunca gana.',
        'El ganador se lleva las cartas de la baza (y sus puntos) y **roba el primero**; después roban los demás en orden, una carta cada uno, hasta que el mazo se acabe.',
        'El ganador **sale** en la baza siguiente.',
      ] },
      'La última carta que se roba es la pinta, que se queda quien robe en último lugar. Cuando el mazo se acaba, los jugadores siguen con las tres cartas que tienen hasta vaciar la mano.',
      { note: 'En equipo, los puntos que gana cualquier compañero se suman al **marcador común**.' },
    ] },
    { title: 'Cambiar la pinta', blocks: [
      'Si ganas una baza y tienes en la mano el **siete de triunfo** (o el **dos de triunfo** cuando la pinta es una carta de poco valor), puedes cambiarlo por la pinta del mazo y quedártela.',
      { list: [
        'Se cambia por el **siete** cuando la pinta es de las fuertes (sota, caballo, rey, tres o as) y por el **dos** cuando es 7, 6, 5 o 4.',
        'Solo el **ganador de la baza**, antes de robar, y solo mientras queden **más cartas en el mazo que jugadores** en la mesa.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Cuando todos han jugado su última carta, se cuentan los puntos de cada jugador o equipo.',
      { list: [
        'Quien tiene **más puntos** anota un juego.',
        'Si hay empate entre los mejores, anota el juego quien haya ganado la **última baza** si está entre ellos; si no, el primero del empate.',
        'Si **todos** empatan (por ejemplo 60 a 60 entre dos jugadores), **nadie suma juego** y se reparte otra mano.',
        'Gana la partida quien llega a **tres juegos**.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación **reparte, roba y cuenta los puntos** por ti. Toca una carta de tu mano para jugarla; como no hay obligación de servir, puedes jugar cualquiera.',
        'Cuando ganas una baza aparece el botón **«Cambiar triunfo»** si puedes hacerlo, junto a «Continuar».',
        'La pinta se ve siempre sobre la mesa y el marcador muestra los puntos y los juegos. Con parejas o equipos verás «Pareja A / B» junto a cada nombre.',
        'Al terminar la mano, el botón **«Siguiente mano»** inicia la siguiente. La partida acaba sola cuando alguien llega a tres juegos.',
        'Se juega a **tres juegos**, no a un número de puntos. Se admiten 2, 3, 4 y 6 jugadores.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Guarda los triunfos altos para ganar bazas con **ases y treses** de los rivales.',
        'Si tu compañero ya va ganando la baza con seguridad, **échale puntos** (un as o un tres).',
        'Con cartas sin valor y sin posibilidades de ganar, juega **un cero** para no regalar puntos.',
        'Cuenta los triunfos que han salido: te dice cuándo tu as ya no corre peligro.',
      ] },
    ] },
  ],
};
