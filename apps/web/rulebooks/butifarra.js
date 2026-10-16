export default {
  tagline: 'Parejas, 48 cartas y **un nueve que lo manda todo**: quien elige el triunfo, o decide jugar sin él, marca el ritmo de la mano.',
  facts: [['Jugadores', '4, en dos parejas'], ['Baraja', 'Española de 48 (con 8 y 9)'], ['Meta', '100 puntos'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Tu pareja y tú queréis ganar **bazas** y las cartas de valor que contienen. Cada mano se puntúa solo lo que supera **36 puntos**. La primera pareja que alcanza **100 puntos** gana la partida.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de **48 cartas**: del 1 al 12 de cada palo, incluidos el **8 y el 9**.',
        'Cuatro jugadores en **dos parejas**; los compañeros se sientan enfrentados.',
        'Se reparten **12 cartas a cada jugador** y no queda mazo.',
        'El reparto rota en cada mano. **Elige el triunfo el que reparte** (o delega en su compañero). Sale en la primera baza el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Valor y fuerza de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [['Nueve (la «manilla»)', '5'], ['As', '4'], ['Rey (12)', '3'], ['Caballo (11)', '2'], ['Sota (10)', '1'], ['8, 7, 6, 5, 4, 3, 2', '0']] } },
      { note: 'Fuerza de mayor a menor: **9, as, rey, caballo, sota, 8, 7, 6, 5, 4, 3, 2**. Además, **cada baza vale 1 punto**. En total hay **72 puntos** en juego por mano: 60 de cartas y 12 de bazas.' },
    ] },
    { title: 'Elegir el triunfo', blocks: [
      'Antes de jugar, el que reparte mira sus cartas y elige **una de estas opciones**:',
      { list: [
        'Un **palo de triunfo**: sus cartas ganan a las de los demás palos.',
        '**Butifarra** (sin triunfo): no hay palo que gane a otro; gana siempre la carta más alta del palo de salida. Esta mano **vale doble**.',
        '**Delegar**: pasa la elección a su compañero, que debe elegir. Solo se puede delegar una vez.',
      ] },
    ] },
    { title: 'Contrar y recontrar', blocks: [
      'Una vez elegido el triunfo, los rivales de quien ha elegido pueden **contrar**, y entonces la pareja que eligió puede **recontrar**.',
      { steps: [
        'Habla primero el jugador siguiente al que reparte; después, el otro rival. Cada uno puede decir **«Contrar»** o **«Sin doblar»**. Si alguien contra, el otro rival ya no decide.',
        'Si hay contra, el que reparte y su compañero pueden **recontrar**. El primero que lo haga cierra el turno de palabra.',
        'Cada contra o recontra **duplica** la puntuación de la mano.',
      ] },
      'La multiplicación máxima es ×4 con triunfo y ×8 en butifarra.',
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'Sale una carta el jugador siguiente al que reparte.',
        'Cada jugador juega una carta por orden, cumpliendo las obligaciones de abajo.',
        'Gana la baza el **triunfo más alto** o, si no hay triunfos, la carta más alta del palo de salida. En butifarra, siempre la del palo de salida.',
        'El ganador se lleva las cartas para su pareja y **sale** en la baza siguiente.',
      ] },
      'Se juegan las 12 bazas. Recoges tus puntos al terminar.',
    ] },
    { title: 'Servir, montar y fallar', blocks: [
      { list: [
        '**Asistir**: si tienes del palo de salida, debes jugar de ese palo. Si puedes **superar** la carta ganadora, debes hacerlo.',
        '**Fallar**: si no tienes del palo, pero sí triunfos, debes jugar triunfo y superar al que haya si puedes. Si no puedes superar, juegas la carta que quieras.',
        'Si no tienes ni el palo ni triunfos, juegas cualquier carta.',
        '**Excepción importante**: si tu **compañero va ganando** la baza, no tienes que montar ni fallar. Sigues obligado a asistir si tienes del palo, pero con la carta que quieras.',
      ] },
    ] },
    { title: 'Puntuación', blocks: [
      'Al acabar la mano, cada pareja cuenta sus puntos (cartas ganadas + 1 por baza).',
      { list: [
        'Solo puntúa la pareja que supera los **36 puntos**: anota **los puntos que pasa de 36**, multiplicados por los contras.',
        'Con 36 puntos o menos no se anota nada; con 36 exactos ninguna pareja puntúa.',
        'Ejemplo: tu pareja hace 45 puntos, sin contrar y con triunfo: anotáis **9**. Si se había contrado: **18**.',
        'La partida termina cuando una pareja llega a **100 puntos**.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Elegir triunfo: botones con los cuatro palos, **«Butifarra · sin triunfo»** y **«Delegar»**. Después, **«Contrar»**, **«Recontrar»** o **«Sin doblar»**.',
        'En las bazas solo puedes tocar las cartas legales.',
        'No hay cantes ni apuestas extra: solo contra, recontra y butifarra.',
        'El marcador de pareja se comparte: «Pareja A» y «Pareja B». Gana la primera en llegar a **100 puntos**.',
        'El botón **«Siguiente mano»** abre la mano siguiente.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Elige como triunfo tu palo más largo y con cartas altas; con varios palos fuertes y el nueve, valora la **butifarra**.',
        'Si tu compañero va ganando, **cárgale puntos**: tu 9, tu as o tu rey cuentan a favor de la pareja.',
        'Con ×2 o más en juego, cada punto de diferencia pesa mucho: no contres a la ligera.',
      ] },
    ] },
  ],
};
