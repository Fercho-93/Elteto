export default {
  tagline: 'La Oca de toda la vida en versión gamberra: 63 casillas, un dado y, en vez de ocas, los avatares de Elteto. De avatar en avatar y tiro porque me toca.',
  facts: [['Jugadores', '2 a 4'], ['Material', 'Tablero de 63 casillas y un dado'], ['Meta', 'Casilla 63, con tirada exacta'], ['Duración', '15–30 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Ser el **primero en llegar a la casilla 63** (el **Fiestón**) con una tirada exacta. Si te pasas, rebotas hacia atrás.',
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
        'Si has caído en un avatar (las ocas de siempre), **vuelves a tirar**. En cualquier otro caso pasa el turno al siguiente jugador.',
      ] },
      'Las casillas normales no tienen efecto.',
    ] },
    { title: 'Casillas especiales', blocks: [
      { table: { head: ['Casilla', 'Qué pasa'], rows: [
        ['**Avatares** (las ocas): 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54 y 59', '«De avatar en avatar y tiro porque me toca»: saltas al **siguiente avatar** y **vuelves a tirar**. El de la 59 te lleva directamente al Fiestón, la 63.'],
        ['**6** · Tirolina (el puente)', 'Te tiras hasta el **Aterrizaje**, la **12**. No tiras de nuevo.'],
        ['**26** y **53** · Pedo-cohete (los dados)', 'Si caes en uno, sales disparado al otro (26 ↔ 53). No tiras de nuevo.'],
        ['**19** · Resaca (la posada)', 'Pierdes **dos turnos** durmiendo la mona.'],
        ['**31** · Váter (el pozo)', 'Te has caído al váter: pierdes **dos turnos**.'],
        ['**42** · Rotonda (el laberinto)', 'Das vueltas sin encontrar la salida: pierdes **dos turnos**.'],
        ['**52** · Trullo (la prisión)', 'Te quedas encerrado hasta que **otro jugador llegue a esta casilla**.'],
        ['**58** · Cáscara (la calavera)', 'Resbalas con la cáscara de Banana y vuelves a la casilla **1**.'],
        ['**63** · Fiestón', '**Meta**: ganas la partida.'],
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
        '**Turnos perdidos** (Resaca 19, Váter 31 y Rotonda 42): en tus dos turnos siguientes no tiras; solo pulsas «Pasar turno». Al tercero vuelves a tirar.',
        '**Trullo** (52): mientras estés encerrado no tiras. Quedas libre cuando otro jugador cae en la 52: él ocupa el trullo y tú pasas a la casilla **de la que él venía**.',
        'Solo puede haber **un preso** a la vez.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Gana la partida quien primero **llegue a la casilla 63**, ya sea con tirada exacta o saltando desde la oca 59.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Las reglas son las de la **edición española de Cayro**; solo cambian los dibujos y los nombres de las casillas. Otras ediciones tienen efectos distintos en el pozo, el laberinto, el puente y los dados.',
        'Cada ficha lleva el **avatar** de su jugador encima de su color.',
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
