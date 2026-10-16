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
        '**Puesta**: cuando el bote está vacío (la primera mano, o tras cobrarse), todos ponen **1 punto**. En las demás manos, solo lo pone el que reparte.',
        'El reparto rota en cada mano. Habla primero el jugador siguiente al que reparte.',
      ] },
    ] },
    { title: 'Fuerza de las cartas', blocks: [
      'En el julepe los puntos de las cartas no cuentan; solo importa la fuerza para ganar bazas.',
      { note: 'Fuerza de mayor a menor: **as, tres, rey, caballo, sota, 7, 6, 5, 4, 2**. Los triunfos ganan a cualquier otro palo.' },
    ] },
    { title: 'Cómo se juega una mano', blocks: [
      { steps: [
        '**Juego o paso**: por orden, cada jugador decide si juega o se retira. Quien se retira tira sus cartas. **El que reparte tiene que jugar** y habla el último.',
        '**Descarte**: quien juega puede cambiar cartas del mazo. Marca las que descartas y confirma; recibes otras hasta tener cinco. Puedes cambiar hasta las cinco.',
        '**Bazas**: sale el primer jugador que juega después del que reparte. Se juegan cinco bazas y el ganador de cada una sale en la siguiente.',
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
      'Si todos se retiran, el que reparte no juega solo. Entra a la fuerza, como **sustituto**, el primer jugador que habla (el siguiente al que reparte).',
      { list: [
        'El sustituto devuelve su mano al mazo y recibe **seis cartas nuevas**, de las que luego descarta hasta quedarse con cinco.',
        'El sustituto **nunca paga**. Si pierde el que reparte, paga el bote y ese pago **se queda en el bote**.',
        'Si gana el que reparte y pierde el sustituto, el que reparte **cobra el bote entero**. Si ganan los dos, el que reparte cobra **la mitad** y la otra mitad queda en el bote.',
      ] },
    ] },
    { title: 'La pinta del que reparte', blocks: [
      'En su turno de descarte, el que reparte puede **tomar la pinta** y añadirla a su mano (el triunfo no cambia). A cambio, si luego se lleva el julepe, **paga el doble**.',
    ] },
    { title: 'Cobros y pagos', blocks: [
      { list: [
        'El **bote** es la puesta acumulada. Cada jugador que se lleva el julepe **paga el bote entero**; el pago se reparte entre quienes han hecho dos o más bazas.',
        'Si **nadie** se lleva el julepe, quienes han jugado se reparten el bote y el bote vuelve a cero.',
        'Si todos los que juegan pierden, los pagos **se suman al bote**.',
        'Si hay ganadores y perdedores, el bote **no baja**: sigue en la mesa y el que reparte añade 1 en cada mano. Solo se vacía cuando nadie se lleva el julepe.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Todo se hace con botones: **«Juego»** o **«Paso»**, y después **«Confirmar descarte»**, tras marcar las cartas que cambias. El que reparte tiene además **«Tomar la pinta · riesgo doble»**.',
        'En la baza solo puedes tocar las cartas que son legales según las reglas anteriores.',
        'El marcador muestra tus puntos de partida (pueden ser negativos) y el bote.',
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
