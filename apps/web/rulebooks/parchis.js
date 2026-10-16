export default {
  tagline: 'Una carrera de cuatro fichas por color: saca con un 5, captura rivales, forma barreras y entra en meta con el número exacto.',
  facts: [['Jugadores', '3 a 6'], ['Material', 'Tablero de 17 casillas por color (triángulo, cuadrado, pentágono o hexágono), 4 fichas por jugador y uno o dos dados'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Ser el primero en llevar **tus cuatro fichas a la meta**, en el centro del tablero. Cada ficha sale de su casa, da la vuelta completa al tablero y entra por el pasillo de su color.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Cada jugador tiene un color y **cuatro fichas**, que empiezan en su casa (el nido).',
        'Los colores son amarillo, verde, rojo y azul, y con más jugadores **naranja** y **morado**, por orden de asiento.',
        'El tablero se adapta a la mesa: **triángulo** con 3 jugadores (51 casillas), **cuadrado** con 4 (68), **pentágono** con 5 (85) y **hexágono** con 6 (102). Cada color tiene su brazo de 17 casillas, con la salida en la quinta: en el cuadrado, la 5 (amarillo), la 22 (verde), la 39 (rojo) y la 56 (azul); en el pentágono y el hexágono, naranja sale en la 73 y morado en la 90.',
        'Con **5 o 6 jugadores**, antes del sorteo el primer jugador elige si se juega con **uno o dos dados**.',
        '**Sorteo inicial**: cada jugador tira una vez. Empieza quien saca más. Si hay empate, solo repiten los empatados. Esta tirada no mueve fichas.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'En tu turno **tiras el dado**.',
        'Mueves **una** de tus fichas tantas casillas como indique el dado. Si no hay ningún movimiento posible, pierdes el turno.',
        'Con un **5** puedes **sacar una ficha** de casa a tu casilla de salida o, si prefieres, mover otra ficha 5 casillas. Sin un 5 no puedes sacar fichas.',
        'Con un **6** vuelves a tirar al terminar. Si has sacado tres seises seguidos, la última ficha que movías vuelve a casa y se acaba tu turno.',
        'Si capturas o llevas una ficha a meta, ganas una **bonificación** (más abajo) y la juegas antes de que acabe tu turno.',
      ] },
      { note: 'Tu ficha recorre todas las casillas comunes desde tu salida hasta la punta de tu brazo (64 en el cuadrado; cuatro menos que el total en cualquier tablero); después entra en el pasillo de tu color (7 casillas) y, por último, en la meta.' },
    ] },
    { title: 'Capturar y seguros', blocks: [
      { list: [
        'Si terminas el movimiento en una casilla ocupada por **una ficha rival**, la capturas: vuelve a su casa. No se capturan fichas al pasar por encima, solo al caer exactamente.',
        'Capturar da una **bonificación de 20** casillas.',
        'Las casillas con círculo son **seguros**: la 5.ª, la 12.ª y la 17.ª de cada brazo (en el cuadrado, 5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63 y 68). Una ficha en un seguro **no puede ser capturada**.',
        'En un seguro pueden convivir dos fichas de distinto color, pero nunca captura nadie: tampoco al salir de casa en la casilla de salida de otro color.',
        'Una ficha en el **pasillo de meta** (la fila de colores del final) tampoco puede ser capturada.',
      ] },
    ] },
    { title: 'Barreras', blocks: [
      { list: [
        'Dos fichas **del mismo color** en una casilla forman una **barrera**. Es imposible pasar por encima y no se puede entrar en esa casilla: ni los rivales ni tú.',
        'Nunca puede haber **más de dos fichas** en una casilla.',
        'Si sacas un **6** y tienes una barrera, **debes deshacerla**: mueves una de sus dos fichas. Si no puedes moverla, no mueves ninguna otra ficha con ese 6, pero igualmente repites tirada.',
      ] },
    ] },
    { title: 'Seises y la regla del 7', blocks: [
      { list: [
        'Cada 6 te da una tirada extra.',
        'Si ya **no te queda ninguna ficha en casa**, un 6 vale **7 casillas**.',
        'Tres seises seguidos: pierdes la última ficha movida, que vuelve a casa, y termina tu turno. La tercera tirada no se juega.',
      ] },
    ] },
    { title: 'Con dos dados (5 o 6 jugadores)', blocks: [
      { list: [
        'Cada dado se juega **por separado**: puedes mover la misma ficha con los dos o una ficha con cada uno, en el orden que prefieras.',
        'Sacas una ficha de casa con un **5** en cualquiera de los dados o con una **suma de 5** (1 + 4 o 2 + 3), que gasta los dos dados.',
        'Los **dobles** sustituyen al 6: dan otra tirada, obligan a abrir tu barrera con el primer dado y, si sacas **tres dobles seguidos**, la última ficha movida vuelve a casa.',
        'Un 6 cuenta **7** si no te queda ninguna ficha en casa, igual que con un dado.',
        'Si un dado no tiene ningún movimiento válido, se pierde. Las bonificaciones se juegan antes del dado que quede.',
      ] },
    ] },
    { title: 'Bonificaciones y llegada a meta', blocks: [
      { table: { head: ['Qué haces', 'Premio'], rows: [
        ['Capturas una ficha rival', '**20 casillas**'],
        ['Llevas una ficha a la meta', '**10 casillas**'],
      ] } },
      { list: [
        'Cada premio se gasta **entero** con **una sola ficha** de tu elección, que pueda recorrer esas casillas.',
        'Si ninguna ficha puede hacer ese recorrido, el premio se pierde.',
        'Puedes encadenar premios: una captura con el premio puede generar otro.',
        'La entrada en la meta exige el **número exacto**. Si te pasas, esa ficha no puede moverse con esa tirada.',
        'Un 5 que se usa para sacar una ficha no da movimiento adicional.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Gana quien primero tenga las cuatro fichas en la meta. La partida termina en ese momento.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación sigue la edición **Cayro en español**. En el tablero cuadrado las salidas son 5, 22, 39 y 56; en todos, los seguros se marcan con un círculo.',
        'El botón **«Sortear»** hace la tirada inicial y **«Tirar»** el resto de turnos. Tras tirar eliges ficha con los botones **«Ficha 1»** a **«Ficha 4»**; debajo de cada uno pone lo que hará: **«Salir»**, **«Avanza n»** o **«Meta»**.',
        'Solo se habilitan las fichas que **pueden** moverse. La aplicación aplica las barreras, el máximo de dos fichas por casilla, los seguros y la entrada exacta.',
        'Con un 5 eliges entre **salir** o **mover**. Con un 6 y una barrera propia, solo se ofrece abrirla.',
        'Las bonificaciones de 20 y 10 se presentan como un movimiento más: avanzas esa cantidad completa con una ficha. Si no hay ninguna posible, se pierde sola.',
        'Si no existe ningún movimiento válido, la aplicación pasa el turno (o te hace tirar de nuevo si has sacado un 6).',
        'Puedes ampliar el tablero con el botón **Tablero** y ver cuántas fichas tienes en meta en el menú.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Saca fichas cuando puedas: cuantas más tengas en juego, más opciones tendrás con cada tirada.',
        'Aprovecha los seguros para descansar y evitar ser capturado cerca de las fichas rivales.',
        'Una barrera bien situada bloquea a todos los rivales. Pero recuerda que los seises te obligan a deshacerla.',
      ] },
    ] },
  ],
};
