export default {
  tagline: 'Cinco cartas, un bote que crece y una sola exigencia: **haz al menos dos bazas** si decides jugar, o pagarás el julepe.',
  facts: [['Jugadores', '5, 6 o 7'], ['Baraja', 'Española de 40'], ['Partida', '10 manos'], ['Duración', '30–45 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano decides si **juegas o te retiras**. Si juegas, debes ganar **al menos dos bazas de cinco**; si ganas menos, te llevas el **julepe** y pagas. Tras **diez manos** gana quien tenga más puntos. Se juega con puntos de la partida, **nunca con dinero real**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas. Con **7 jugadores**, el que está justo antes del que reparte **descansa** esa mano; el descanso rota.',
        'Se reparten **cinco cartas** a cada jugador (con 5 jugadores se dan **seis** y hay que descartar al menos una). La carta del fondo del mazo, boca arriba, es la **pinta**: su palo es el triunfo.',
        '**Puesta**: en la primera mano, todos ponen **1 punto** al bote. En las siguientes, solo lo pone el que reparte.',
        'Reparte uno distinto en cada mano, por turnos. Empieza hablando el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Fuerza de las cartas', blocks: [
      'En el julepe los puntos de las cartas no cuentan; solo importa la fuerza para ganar bazas.',
      { note: 'Fuerza de mayor a menor: **as, tres, rey, caballo, sota, 7, 6, 5, 4, 2**. Los triunfos ganan a cualquier otro palo.' },
    ] },
    { title: 'Cómo se juega una mano', blocks: [
      { steps: [
        '**Juego o paso**: por orden, cada jugador decide si juega o se retira. Quien se retira tira sus cartas. **El que reparte tiene que jugar** y habla el último.',
        '**Descarte**: quien juega puede cambiar cartas del mazo. Marca las que descartas y confirma; recibes otras hasta tener cinco. Puedes cambiar ninguna o todas.',
        '**Bazas**: sale el primer jugador que juega a la izquierda del que reparte. Se juegan cinco bazas.',
        '**Recuento**: cada jugador que ha entrado y ha hecho **menos de dos bazas** se lleva el julepe.',
      ] },
    ] },
    { title: 'Reglas de baza', blocks: [
      { list: [
        '**Asistir**: si tienes del palo de salida, debes jugar de ese palo y, si puedes, **superar** la carta ganadora.',
        '**Fallar**: si no tienes del palo, debes jugar **triunfo**; y si hay otro triunfo en la baza, superarlo si puedes. **Con triunfos en la mano estás obligado a jugarlos**, aunque no ganes.',
        'Solo si no tienes ni el palo ni triunfos juegas cualquier carta.',
        'Gana la baza el triunfo más alto o, sin triunfos, la carta más alta del palo de salida.',
      ] },
    ] },
    { title: 'Si solo juega el que reparte', blocks: [
      'Si todos se retiran, el que reparte no puede jugar solo. Entonces **entra a la fuerza** el primer jugador después de él (el que habla primero), como **sustituto**.',
      { list: [
        'El sustituto devuelve su mano y recibe **seis cartas nuevas**, de las que luego descarta hasta quedarse con cinco.',
        'Si pierde el que reparte, paga a la mesa. Si gana el que reparte y pierde el sustituto, el que reparte cobra la puesta.',
      ] },
    ] },
    { title: 'La pinta del que reparte', blocks: [
      'En su turno de descarte, el que reparte puede **tomar la pinta** y añadirla a su mano. A cambio, si luego se lleva el julepe, **paga el doble**.',
    ] },
    { title: 'Cobros y pagos', blocks: [
      { list: [
        'El **bote** es la puesta acumulada. Cada jugador que se lleva el julepe **paga el bote entero**; el pago se reparte entre quienes han hecho dos o más bazas.',
        'Si **nadie** se lleva el julepe, quienes han jugado se reparten el bote y el bote vuelve a cero.',
        'Si todos los que juegan pierden, los pagos **se quedan en el bote**.',
        'Mientras el bote no se cobre entero, se queda en la mesa y crece: el que reparte pone 1 más en cada mano.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Todo se hace con botones: **«Juego»** o **«Paso»**, y después **«Confirmar descarte»**, tras marcar las cartas que cambias (puedes confirmar sin marcar ninguna). El que reparte tiene además **«Tomar la pinta · riesgo doble»**.',
        'En la baza solo puedes tocar las cartas que son legales según las reglas anteriores.',
        'El marcador muestra tus puntos de partida (pueden ser negativos), el bote y quién descansa.',
        'La partida dura exactamente **diez manos**. Después gana quien tiene más puntos.',
        'Se juega con puntos de la partida, no con dinero real.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Entra con **un triunfo alto** o con dos ases/treses de palos distintos; sin triunfos, los pasos son baratos.',
        'Si el bote es grande, pasa con una mano mediocre: perderlo duele.',
        'Descarta lo que no te sirve para ganar bazas; quedarte con una carta pequeña de un palo suelto casi siempre es mala idea.',
      ] },
    ] },
  ],
};
