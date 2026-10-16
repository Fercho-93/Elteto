export default {
  tagline: 'Captura cartas de la mesa sumando **15** con una de tu mano y limpia la mesa para hacer **escoba**.',
  facts: [['Jugadores', '2, 3, 4 o 6'], ['Baraja', 'Española de 40'], ['Meta', '21 puntos'], ['Duración', '20–40 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Sumar **21 puntos** repartidos en varias manos. Los puntos salen de las escobas, de capturar más cartas, más oros y más sietes, y de algunas cartas concretas.',
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Valor'], rows: [['As a 7', 'Su número'], ['Sota', '8'], ['Caballo', '9'], ['Rey', '10']] } },
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas. Se reparten **tres cartas** a cada jugador y se colocan **cuatro boca arriba** en la mesa.',
        'Con 2 o 3 jugadores, cada uno juega por su cuenta. Con **4 o 6**, juegan **dos equipos** alternos: los asientos pares contra los impares.',
        'Empieza el jugador siguiente al que reparte, y el reparto va rotando de mano en mano.',
      ] },
      { note: '**Escoba inicial:** si las cuatro cartas de la mesa suman 15 (o 30), el dador se lleva esas cartas y apunta una escoba (dos si suman 30).' },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        'En tu turno eliges **una carta de tu mano**.',
        'Si hay cartas en la mesa que, sumadas a la tuya, den **exactamente 15**, las capturas todas junto con tu carta. Puedes elegir qué combinación llevarte si hay varias.',
        'Si tu carta no puede capturar nada, **la dejas en la mesa**.',
        'Cuando todos se quedan sin cartas, se reparten otras tres a cada uno (la mesa no se repone) hasta agotar el mazo.',
      ] },
      { note: '**Capturar es obligatorio** con la carta que juegas: si esa carta puede formar 15, no puedes dejarla en la mesa. Eso sí, eliges libremente qué carta de tu mano jugar.' },
    ] },
    { title: 'Escoba', blocks: [
      'Si al capturar **dejas la mesa vacía**, haces escoba y vale **1 punto**. Cada escoba se apunta a quien la hace.',
    ] },
    { title: 'Recuento al terminar la mano', blocks: [
      'Cuando se juega la última carta, las que quedan en la mesa se las lleva **quien hizo la última captura**. Después se cuentan los puntos:',
      { table: { head: ['Concepto', 'Puntos'], rows: [
        ['Cada escoba', '1'],
        ['Siete de oros', '1'],
        ['Más cartas', '1'],
        ['Más oros', '1 (**2** si se capturan los diez)'],
        ['Más sietes', '1 (**2** si se capturan los cuatro)'],
        ['Rival con menos de 10 cartas (solo con dos bandos)', '2'],
      ] } },
      { list: [
        'En cada categoría, si hay **empate en la cifra mayor**, nadie suma ese punto.',
        'En parejas o equipos, las cartas y escobas de los compañeros se suman.',
      ] },
    ] },
    { title: 'Fin de la partida', blocks: [
      { list: [
        'Se juegan manos hasta que alguien llega a **21 puntos o más**. Si dos bandos pasan de 21 igualados, se juega otra mano.',
        'Con dos bandos, si uno **no captura ninguna carta** en toda la mano, el otro gana la partida de inmediato.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Pulsa una carta de tu mano y marca las de la mesa que quieres capturar. Después, «Jugar selección». Si no seleccionas ninguna carta de la mesa, tu carta queda en la mesa.',
        'La aplicación **comprueba que la suma sea 15** y rechaza capturas incorrectas, o dejar una carta que sí podía capturar.',
        'Reparto, escoba inicial, recuento y reparto de nuevas cartas son automáticos. Verás un botón «Siguiente mano» al acabar cada una.',
        'Aquí **la escoba cuenta también en la última jugada** de la mano. Recuerda que en algunas mesas físicas no se apunta.',
        'Con 4 o 6 jugadores, el asiento par juega junto al par y el impar con el impar. El marcador es común del equipo.',
        'El 7 de oros, los cuatro sietes, los diez oros y el límite de 10 cartas se detectan solos.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Si la mesa suma poco, **evita dejarla fácil**: quien pueda limpiarla gana una escoba.',
        'Prioriza el **siete de oros**, los sietes y los oros: son cuatro puntos de mayoría.',
        'Cuenta las cartas que van saliendo; con seis o más cartas capturadas de ventaja ya casi aseguras el punto de cartas.',
      ] },
    ] },
  ],
};
