export default {
  tagline: 'El juego de descartes más gamberro de Elteto: suelta cartas por color o por símbolo, haz que los demás se chupen cartas y canta **¡Tetuno!** cuando te quede una.',
  facts: [['Jugadores', '2 a 8'], ['Material', 'Baraja propia de 108 cartas'], ['Meta', '300 puntos'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Quedarte **sin cartas** antes que nadie. Quien lo consigue gana la mano y se apunta los puntos de las cartas que les quedan a los demás. Gana la partida el primero que llega a **300 puntos**.',
    ] },
    { title: 'La baraja', blocks: [
      'Cuatro colores, cada uno con su avatar: **Rojo Boletus**, **Amarillo Banana**, **Verde Guaca** y **Azul Gotelé**. En cada color hay un 0, dos de cada número del 1 al 9 y dos de cada carta especial.',
      { table: { head: ['Carta', 'Qué hace'], rows: [
        ['**Chúpate 2** · Peluson', 'El siguiente roba **dos cartas** y pierde el turno, salvo que devuelva otro Chúpate.'],
        ['**Te salto** · Ohio', 'El siguiente **se queda sin turno**.'],
        ['**Media vuelta** · Huevada', '**Cambia el sentido** de la mesa. Entre dos jugadores funciona como un Te salto.'],
        ['**Comodín** · Berenjeno', 'Se juega sobre cualquier carta y **eliges el color** que manda.'],
        ['**Chúpate 4** · Moñigo', 'Eliges color y el siguiente roba **cuatro** y pierde el turno. Solo puedes soltarlo si **no tienes cartas del color que manda**.'],
      ] } },
      'Hay cuatro Comodines y cuatro Chúpate 4: 108 cartas en total.',
    ] },
    { title: 'Preparación', blocks: [
      { list: [
        'Se reparten **siete cartas** a cada jugador. El resto forma el mazo, boca abajo.',
        'Se descubre la primera carta del mazo para empezar el descarte. Siempre es un **número**: si sale una especial, vuelve al mazo.',
        'Empieza el jugador siguiente a quien reparte, que va rotando en cada mano.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'En tu turno suelta una carta que coincida con la de arriba del descarte en **color** o en **símbolo** (número o tipo de especial). Los comodines entran siempre.',
        'Si no puedes o no quieres jugar, **roba una carta**. Si la que robas casa, puedes jugarla en el momento; si no, pasas.',
        'El turno sigue en el sentido de la mesa, que cambia con cada **Media vuelta**.',
      ] },
    ] },
    { title: 'Chúpate acumulado', blocks: [
      'Cuando te cae un Chúpate puedes **devolverlo** y sumar el castigo para el siguiente:',
      { list: [
        'Sobre un **Chúpate 2** puedes poner otro Chúpate 2 o un Chúpate 4.',
        'Sobre un **Chúpate 4** solo cabe otro Chúpate 4.',
        'Si no devuelves, **te comes todas las acumuladas** y pierdes el turno.',
      ] },
      { note: 'Mientras haya un castigo pendiente, el Chúpate 4 se puede soltar aunque tengas cartas del color.' },
    ] },
    { title: '¡Tetuno!', blocks: [
      'Cuando juegues tu penúltima carta tienes que **cantar ¡Tetuno!**: pulsa el botón antes de tocar la carta.',
      'Si te olvidas, cualquier otro jugador puede pulsar **«¡Pillado!»** antes de la siguiente jugada y te **chupas dos cartas**. Si nadie te pilla a tiempo, te libras.',
    ] },
    { title: 'Recuento y cómo se gana', blocks: [
      'La mano termina cuando alguien suelta su última carta. Si era un Chúpate, el siguiente se come las cartas igualmente antes de contar.',
      { table: { head: ['Carta en la mano de los demás', 'Puntos'], rows: [
        ['Números', 'Su valor (0 a 9)'],
        ['Chúpate 2, Te salto y Media vuelta', '20'],
        ['Comodín y Chúpate 4', '50'],
      ] } },
      'Quien se queda sin cartas se lleva la suma de todas las manos ajenas. Gana la partida el primero que llega a **300**.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Toca una carta iluminada para soltarla; las que no casan se ven apagadas.',
        'Al tocar un comodín, la app te pregunta **qué color manda**.',
        'El botón **«Cantar ¡Tetuno!»** aparece cuando te quedan dos cartas.',
        'Si el mazo se acaba, se baraja el descarte (menos la carta de arriba) y se sigue robando.',
        'El Chúpate 4 no se puede desafiar: la app solo te deja jugarlo cuando no tienes el color que manda.',
      ] },
    ] },
  ],
};
