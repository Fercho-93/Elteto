export default {
  tagline: 'Forma parejas, quítate todas las cartas y no te quedes con la última: **quien se la queda es el burro**.',
  facts: [['Jugadores', '3–4'], ['Baraja', 'Española de 40, sin el caballo de bastos'], ['Partida', 'Hasta 5 derrotas'], ['Duración', '15–25 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Descartar todas tus cartas formando **parejas**. Una carta queda sin pareja y quien la tiene al final **pierde la mano**. Cada derrota te da una letra de **B-U-R-R-O**; quien completa la palabra, es **el burro** y pierde la partida.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Se juega con la baraja española de 40 cartas, pero **se retira el caballo de bastos**. Quedan 39 cartas.',
        'Se reparten **todas las cartas**, una a una, entre los jugadores. Unos pueden tener una carta más que otros.',
        'Una pareja son **dos cartas del mismo valor**, sea cual sea el palo (dos reyes, dos sietes, etc.).',
        'Al empezar, cada jugador **descarta todas sus parejas** a la vez.',
      ] },
      { note: 'Al retirar el caballo de bastos quedan solo tres caballos. Uno de ellos se queda sin pareja: **ese es el burro** y lo tendrá alguien al final de la mano.' },
    ] },
    { title: 'Cómo se juega', blocks: [
      'La partida se juega en rondas. En cada ronda hay un **dueño**, que va cambiando por turnos de mesa, y ocurren dos robos a ciegas:',
      { steps: [
        'El jugador que **sigue al dueño** le roba una carta de su mano, sin verla, y descarta su pareja si la forma.',
        'Después el **dueño** roba una carta al jugador que tiene **detrás** (el anterior en la mesa) y descarta su pareja si la forma.',
        'El papel de dueño pasa al siguiente jugador y se repite.',
        'Quien se ha quedado sin cartas se salta: ni roba ni le roban.',
      ] },
      'Solo la carta robada puede formar pareja, así que tras cada robo se retira como mucho una pareja.',
    ] },
    { title: 'Quedarse sin cartas', blocks: [
      { list: [
        'Cuando descartas tu última carta, **quedas a salvo** en esa mano y ya no participas más.',
        'La mano termina cuando solo queda **un jugador con cartas**: ese es el **perdedor**.',
        'El perdedor recibe una letra: primero B, luego U, R, R y O.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Cuando alguien reúne las cinco letras, **BURRO**, la partida termina y esa persona pierde. En Elteto el resultado es el de «X pierde»: no hay un ganador único, sino un burro.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Las **parejas se retiran solas**, tanto al repartir como después de cada robo. Tú no tienes que descartar nada.',
        'Para robar verás los botones **Carta 1, Carta 2…**: son las cartas boca abajo del jugador al que robas. En la mesa se indica «Robas de…» y cuántas parejas hay fuera.',
        'Tu mano está siempre a la vista solo para ti; los demás únicamente saben cuántas cartas tienes.',
        'Al acabar la mano se muestra la letra del perdedor. **El perdedor** es quien pulsa **Siguiente mano**.',
        'La primera ronda de cada mano la abre un jugador distinto, por turnos de mesa.',
        'Las cinco letras cierran la partida: el que las completa pierde.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Cuando te toque ser robado, no puedes elegir qué carta te quitan: **baraja tu mano** mentalmente para no dar pistas.',
        'Si te quedan pocas cartas, el burro es un caballo: el que tiene uno suelto es el candidato a perder.',
        'Fíjate en lo que roba cada jugador: si descarta una pareja nada más robar, la carta que robó le ha servido.',
      ] },
    ] },
  ],
};
