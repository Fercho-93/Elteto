export default {
  tagline: 'Un juego de bazas donde no basta con ganar: hay que **acertar exactamente cuántas bazas te llevarás**.',
  facts: [['Jugadores', '3–5'], ['Baraja', 'Española de 40 (36 con tres)'], ['Cartas por mano', 'De 1 al máximo y vuelta'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano predices cuántas bazas vas a ganar. Si aciertas, sumas muchos puntos; si te pasas o te quedas corto, **restas**. Gana quien acumula más puntos al terminar todas las manos.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas. Con **tres jugadores** se quitan los cuatro doses y se juega con 36.',
        'El reparto y quién empieza rotan: cada mano reparte un jugador distinto y **empieza el siguiente a su izquierda** (la «mano»).',
        'Tras repartir se descubre la **pinta**: su palo es el **triunfo** de esa mano. Si se han repartido todas las cartas, la pinta es la última carta del dador.',
      ] },
      'El número de cartas cambia en cada mano. Empieza en 1, sube de una en una hasta el máximo, se repite el máximo **una vez por jugador** y vuelve a bajar hasta 1.',
      { table: { head: ['Jugadores', 'Máximo', 'Manos'], rows: [['3', '12 cartas', '25'], ['4', '10 cartas', '22'], ['5', '8 cartas', '19']] } },
    ] },
    { title: 'Orden de las cartas', blocks: [
      'De mayor a menor: **as, rey, caballo, sota, 7, 6, 5, 4, 3, 2**. El tres no tiene ningún valor especial. Las cartas no puntúan por sí mismas: solo importa qué baza ganan.',
    ] },
    { title: 'Cómo se juega una mano', blocks: [
      { steps: [
        '**Predicción.** Empezando por la mano y acabando por el dador, cada jugador anuncia cuántas bazas cree que ganará (de 0 al número de cartas).',
        '**Restricción del dador.** El dador no puede decir un número que haga que la suma de todas las predicciones **coincida con las bazas disponibles**. Así siempre fallará al menos un jugador.',
        '**Juego de bazas.** La mano sale con una carta; los demás juegan una carta cada uno siguiendo las obligaciones de abajo.',
        '**Ganar la baza.** Gana la carta de triunfo más alta; si no hay triunfos, la carta más alta del palo de salida. Quien gana la baza sale en la siguiente.',
        '**Recuento.** Al jugarse todas las cartas se compara lo anunciado con las bazas ganadas.',
      ] },
    ] },
    { title: 'Obligaciones al jugar', blocks: [
      { list: [
        '**Asistir**: si tienes cartas del palo de salida, tienes que jugar una de ese palo.',
        '**Montar**: si puedes superar la carta que va ganando la baza con una del palo de salida, **debes hacerlo**. Si no puedes, juegas cualquier carta de ese palo.',
        '**Fallar**: si no tienes del palo de salida pero sí triunfos, **debes jugar triunfo**, y uno más alto que los ya jugados si puedes.',
        'Si no tienes ni del palo ni triunfos, o no puedes superar el triunfo que va ganando, juegas la carta que quieras.',
      ] },
    ] },
    { title: 'Puntuación', blocks: [
      'La puntuación es acumulada durante toda la partida y puede ser negativa.',
      { table: { head: ['Resultado', 'Puntos'], rows: [
        ['Aciertas tu predicción', '**+10** y **+5 por cada baza** ganada'],
        ['Fallas (por exceso o por defecto)', '**−5 por cada baza de diferencia**'],
      ] } },
      { list: [
        'Predecir 0 y ganar 0 bazas da **+10**.',
        'Predecir 3 y ganar 3 da 10 + 15 = **+25**.',
        'Predecir 2 y ganar 4 (o predecir 4 y ganar 2) da 2 × (−5) = **−10**.',
      ] },
    ] },
    { title: 'Fin de la partida', blocks: [
      'Al acabar la última mano del calendario gana quien tenga **más puntos**. Si hay empate en cabeza, se juegan **manos adicionales de una carta** hasta que quede un único líder.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación reparte, descubre la pinta y señala el **triunfo**. Tus cartas jugables aparecen resaltadas: solo puedes elegir una de las legales (asistir, montar o fallar).',
        'En la fase de predicción verás un botón por cada número de bazas posible. Para el dador **desaparece la opción prohibida**.',
        'Cada jugador ve su marcador como «bazas ganadas / bazas anunciadas».',
        'Al cerrarse una baza, el ganador pulsa «Continuar» y sale en la siguiente. Al terminar la mano, «Siguiente mano» hace el recuento y reparte.',
        'El calendario es el descrito arriba para 3, 4 o 5 jugadores. No hay menos de tres jugadores ni más de cinco.',
        'Si hay empate al final, el motor encadena manos de **una sola carta** hasta desempatar.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'En las manos de una carta, predecir 0 o 1 depende solo del triunfo y del número de rivales.',
        'Predecir pocas bazas suele ser más seguro que muchas: cuenta tus triunfos altos y los ases.',
        'Fíjate en lo que dicen los demás: si la suma queda baja, habrá bazas que nadie quiere, y esas cartas «sobrantes» te pueden caer.',
        'Si ya has cumplido tu predicción, puedes soltar cartas altas para no ganar más bazas de la cuenta.',
      ] },
    ] },
  ],
};
