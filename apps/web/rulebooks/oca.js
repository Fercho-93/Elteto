export default {
  tagline: 'Una carrera de 63 casillas en la que el dado decide, las ocas empujan y llegar justo a la meta cuesta más de lo que parece.',
  facts: [['Jugadores', '2 a 4'], ['Material', 'Tablero de 63 casillas y un dado'], ['Meta', 'Casilla 63, con tirada exacta'], ['Duración', '15–30 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Ser el **primero en llegar a la casilla 63** (el Jardín de la Oca) con una tirada exacta. Si te pasas, rebotas hacia atrás.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'El tablero es una espiral de **63 casillas** numeradas. Solo se usa **un dado**.',
        'Cada jugador tiene una ficha. Todas **salen de la casilla 1** y comparten esa casilla al empezar.',
        'Se juega por turnos, en el orden de la mesa. Empieza el primer jugador.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'En tu turno **tiras el dado** y avanzas tu ficha tantas casillas como indique.',
        'Miras en qué casilla has caído. Si es una casilla especial, se aplica su efecto (tabla siguiente).',
        'Si has caído en una oca, **vuelves a tirar**. En cualquier otro caso pasa el turno al siguiente jugador.',
      ] },
      'Las casillas normales no tienen efecto.',
    ] },
    { title: 'Casillas especiales', blocks: [
      { table: { head: ['Casilla', 'Qué pasa'], rows: [
        ['**Ocas**: 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54 y 59', 'Saltas a la **siguiente oca** y **vuelves a tirar**. La oca 59 te lleva directamente a la meta, la 63.'],
        ['**6** · Puente', 'Pasas a la **12**. No tiras de nuevo.'],
        ['**26** y **53** · Dados', 'Si caes en una, pasas a la otra (26 ↔ 53). No tiras de nuevo.'],
        ['**19** · Posada', 'Pierdes **dos turnos**.'],
        ['**31** · Pozo', 'Pierdes **dos turnos**.'],
        ['**42** · Laberinto', 'Pierdes **dos turnos**.'],
        ['**52** · Prisión', 'Te quedas preso hasta que **otro jugador llegue a esta casilla**.'],
        ['**58** · Calavera', 'Vuelves a la casilla **1**.'],
        ['**63** · Jardín de la Oca', '**Meta**: ganas la partida.'],
      ] } },
    ] },
    { title: 'Llegar a la meta', blocks: [
      'Tienes que alcanzar el 63 **con el número justo**. Si la tirada te llevaría más allá, avanzas hasta el 63 y **retrocedes** el resto de casillas que te sobran.',
      'Ejemplo: estás en la 60 y sacas un 5. Llegas al 63 con tres pasos y retrocedes dos, así que acabas en la **61**.',
      { note: 'Si al rebotar caes en una casilla especial, también se aplica su efecto.' },
    ] },
    { title: 'Casillas ocupadas', blocks: [
      'Si caes en una casilla donde ya hay otra ficha, **esa ficha se intercambia contigo**: va a la casilla de la que tú vienes.',
      'La casilla **1** es la excepción: es la salida compartida y allí pueden estar varias fichas a la vez.',
    ] },
    { title: 'Prisión y turnos perdidos', blocks: [
      { list: [
        '**Turnos perdidos** (19, 31 y 42): en tus dos turnos siguientes no tiras; solo pulsas «Pasar turno». Al tercero vuelves a tirar.',
        '**Prisión** (52): mientras estés preso no tiras. Quedas libre cuando otro jugador cae en la 52: él ocupa la prisión y tú pasas a la casilla **de la que él venía**.',
        'Solo puede haber **un preso** a la vez.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Gana la partida quien primero **llegue a la casilla 63**, ya sea con tirada exacta o saltando desde la oca 59.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación sigue la **edición española de Cayro**. Otras ediciones tienen efectos distintos en el pozo, el laberinto, el puente y los dados.',
        'Tiras con el botón **«Tirar dado»**. En turno de castigo o prisión, el botón pasa a **«Pasar turno»**.',
        'La ficha avanza paso a paso por el tablero y verás el recorrido, incluido el salto de la casilla especial. Puedes ampliar el tablero desde el menú.',
        'El puente (6) y los dados (26 y 53) **no repiten tirada**. Solo las **ocas** repiten.',
        'Las flechas del tablero siguen el orden consecutivo del 1 al 63.',
        'Con dos a cuatro jugadores, todas las fichas salen juntas de la casilla 1 y no se intercambian allí.',
        'La partida termina en el momento en que una ficha alcanza el 63; no hay segundo ni tercer puesto.',
      ] },
    ] },
    { title: 'Dudas frecuentes', blocks: [
      { list: [
        '**¿Y si caigo en una oca y la siguiente está ocupada?** Saltas igualmente y la ficha que estaba allí pasa a la casilla de la que partías al lanzar el dado.',
        '**¿Se repite tirada en el puente?** No: el puente te lleva a la 12 y el turno pasa.',
        '**¿Y en las ocas tras la 59?** La 59 te lleva a la 63 y ganas.',
      ] },
    ] },
  ],
};
