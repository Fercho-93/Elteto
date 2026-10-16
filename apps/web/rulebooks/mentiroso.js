export default {
  tagline: 'Juega cartas boca abajo, di qué son y aguanta la mirada: **la cantidad es siempre cierta, el valor puede ser mentira**.',
  facts: [['Jugadores', '3–6'], ['Baraja', 'Española de 40'], ['Comodín', 'Los ases'], ['Duración', '10–20 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Quedarte **sin cartas** antes que los demás. Los jugadores que vacían su mano salen de la partida y **pierde el último que aún tiene cartas**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas. Se reparten **todas** entre los jugadores, de una en una; algunos tendrán una carta más.',
        'Los valores van del **2 al rey**, pasando por sota y caballo. Los **ases** son comodines.',
        'Empieza el primer jugador de la mesa y se juega en el sentido de las agujas del reloj.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'Cuando te toca jugar, eliges **una o varias cartas** de tu mano y las dejas **boca abajo** en el montón central.',
        'Dices en voz alta **cuántas** has jugado y de **qué valor** son («dos reyes»). La cantidad debe ser la real, pero el valor puede ser falso.',
        'Los demás jugadores, por turno, deciden si **se lo creen** o si **te acusan de mentiroso**.',
        'Si nadie te acusa, el turno pasa al siguiente jugador, que juega más cartas sobre el montón.',
        'Una acusación se resuelve al instante (ver abajo) y empieza una nueva ronda.',
      ] },
      { note: 'Mientras nadie acuse, **el valor declarado se mantiene**: el siguiente jugador debe declarar el mismo valor, aunque juegue cartas que no lo sean. Solo quien abre ronda elige el valor que quiere.' },
    ] },
    { title: 'La acusación', blocks: [
      'Se dan la vuelta las últimas cartas jugadas, solo esas, no todo el montón.',
      { list: [
        '**Era mentira** (alguna carta no es del valor declarado ni un as): el que jugó **recoge todo el montón**.',
        '**Decía la verdad** (todas eran del valor o ases): el que acusó **recoge todo el montón**.',
        'Quien recoge el montón **abre la ronda siguiente** y puede declarar el valor que quiera.',
      ] },
      'Los **ases son comodines**: valen como cualquier valor y nunca te delatan. No se pueden declarar como valor propio; solo sirven para acompañar a las cartas que dices.',
    ] },
    { title: 'Salir y perder', blocks: [
      { list: [
        'Cuando juegas tu última carta, **todavía pueden acusarte**. Si nadie lo hace, quedas fuera y ya estás a salvo.',
        'Si te acusan y era mentira, recoges el montón y sigues en la partida.',
        'Los jugadores sin cartas dejan de jugar y de acusar.',
        'La partida termina cuando **solo queda un jugador con cartas**: ese pierde.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'En tu turno marca las cartas que quieras jugar, elige el valor y pulsa **Jugar boca abajo**. Si ya hay un valor declarado, es el único que te dejan elegir.',
        'Los demás ven «N cartas de valor X» y el tamaño del montón, sin ver tus cartas.',
        'Cuando te toca responder tienes dos botones: **Me lo creo** o **Mentiroso**.',
        'Responden en orden de mesa los jugadores con cartas. En cuanto uno acusa, se resuelve. Si todos se lo creen, juega el siguiente.',
        'Al resolver, la aplicación muestra las cartas y el mensaje «Decía la verdad» o «Era mentira», y quien recoge el montón vuelve a abrir.',
        'No hay puntos ni manos: es una única partida. Cuando solo queda un jugador con cartas, la partida termina y se anuncia quién pierde.',
        'Los valores disponibles son del 2 al rey; no se declaran ases.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Las mentiras pequeñas, de una sola carta, son más fáciles de creer que las grandes.',
        'Cuenta los ases y las cartas de un valor: si ya han salido casi todos los reyes, un «tres reyes» huele raro.',
        'Acusar a quien ha jugado su última carta es arriesgado, pero puede ser la única forma de que no se escape.',
        'Si recoges un montón gordo, aprovecha: tendrás muchas cartas con las que mentir bien.',
      ] },
    ] },
  ],
};
