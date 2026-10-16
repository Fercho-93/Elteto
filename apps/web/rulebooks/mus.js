export default {
  tagline: 'El gran juego de envites español: cuatro jugadores, dos parejas, cinco lances por mano y mucho farol a media voz.',
  facts: [['Jugadores', '4, en 2 parejas'], ['Baraja', 'Española de 40: ocho reyes y ocho ases'], ['Meta', 'Una partida a 30 o 40 tantos'], ['Duración', '30–60 min']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Tu pareja y tú competís contra la otra pareja por ser los primeros en **sumar 30 o 40 tantos** (se elige al crear la mesa; por defecto, 40).',
      'En cada mano se juegan hasta **cinco lances**: Grande, Chica, Pares, Juego y, si nadie tiene juego, Punto. En cada uno se puede **envidar** para llevarse más tantos.',
      'Es **una sola partida**: no hay vacas ni series de varios juegos. La pareja que alcanza o supera la meta gana al instante, sin necesidad de acertar la cifra exacta.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de **40 cartas**: del as al 7 y sota, caballo y rey de cada palo.',
        '**Ocho reyes y ocho ases**: los **treses valen como reyes** y los **doses como ases**. No hay otra preferencia entre palos.',
        'Cada jugador recibe **cuatro cartas**. Cada móvil muestra solo las cartas de su dueño.',
        'Las parejas se sientan **frente a frente**: tu compañero está arriba y los dos rivales a los lados. Los asientos se alternan: pareja roja, pareja azul, roja, azul.',
        'La **mano** es el jugador que habla primero y gana los empates. El **postre** es el último en hablar (el que reparte). En cada mano nueva, la mano pasa al jugador siguiente.',
      ] },
    ] },
    { title: 'Mus: pedir cartas o cortar', blocks: [
      'Antes de los lances hay una ronda para decidir si se cambian cartas. Empezando por la mano, cada jugador dice:',
      { list: [
        '**Mus**: quiere descartar y cambiar cartas.',
        '**Cortar mus**: no quiere cambiar; empiezan los lances con las cartas que hay.',
      ] },
      'Si los **cuatro dicen mus**, cada jugador elige **de una a cuatro cartas** para descartar y las confirma. Los demás solo saben cuántas cartas pides, no cuáles. Después se reparte la reposición y se pregunta de nuevo por mus. Puede haber varios descartes seguidos.',
      { list: [
        'No se puede cambiar cero cartas: si das mus, descartas al menos una.',
        'Si el mazo se agota, se baraja el descarte y se sigue repartiendo.',
        '**Mus corrido** (solo en la primera mano): quien corta el mus **se convierte en mano**, y mientras hay descartes la mano pasa de un jugador al siguiente.',
        'Cortar fuera de turno: quien ocupa el tercer lugar desde la mano puede cortar sin esperar su turno, y el postre puede cortar si la mano y el tercero ya han dicho mus. Si una pareja está a **5 tantos o menos** de la meta, cualquiera puede cortar el mus en cualquier momento.',
      ] },
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Orden en Grande y Chica', 'Valor para Juego y Punto'], rows: [
        ['Rey y **tres**', 'La más alta', '10'],
        ['Caballo', 'Segunda', '10'],
        ['Sota', 'Tercera', '10'],
        ['7, 6, 5, 4', 'Siguen por orden', 'Su número'],
        ['As y **dos**', 'La más baja', '1'],
      ] } },
      'Para comparar en Grande y Chica los palos no cuentan: si dos jugadores tienen manos equivalentes, gana quien está **antes desde la mano**.',
    ] },
    { title: 'Los lances', blocks: [
      'Una mano se juega en este orden: **Grande**, **Chica**, **Pares** y **Juego** (o **Punto**).',
      { list: [
        '**Grande**: gana quien tiene las cartas más altas. Se comparan carta a carta de la más alta a la más baja.',
        '**Chica**: gana quien tiene las cartas más bajas, comparando primero las más pequeñas.',
        '**Pares**: gana la mejor combinación de cartas repetidas.',
        '**Juego**: gana la mejor suma a partir de 31.',
        '**Punto**: se juega solo si **nadie** tiene juego; gana la suma más alta por debajo de 31.',
      ] },
    ] },
    { title: 'Pares', blocks: [
      'Antes del lance, cada jugador (empezando por la mano) declara **«Tiene pares»** o **«No tiene»**, sin decir su valor. La aplicación exige que la declaración sea verdadera.',
      { table: { head: ['Combinación', 'Qué es', 'Tantos'], rows: [
        ['Pares', 'Dos cartas iguales', '1'],
        ['Medias', 'Tres cartas iguales', '2'],
        ['Duples', 'Dos parejas, o cuatro cartas iguales', '3'],
      ] } },
      { list: [
        'Los duples ganan a las medias, y las medias a los pares. Dentro de cada tipo gana el valor más alto (en duples, primero la pareja más alta).',
        'Solo participan en el envite los jugadores que tienen pares.',
        'Si **solo una pareja** tiene pares, no hay envite: sus pares se cuentan igualmente. Si nadie tiene pares, se salta el lance.',
      ] },
    ] },
    { title: 'Juego y punto', blocks: [
      'Se suman los valores de las cuatro cartas. Con **31 o más** tienes **juego**. Se declara solo **«Juego»** o **«No juego»**, sin decir la suma.',
      { table: { head: ['Orden del juego (de mayor a menor)', 'Tantos propios'], rows: [
        ['**31**', '3'],
        ['32, 40, 37, 36, 35, 34, 33', '2'],
      ] } },
      { list: [
        'Si solo una pareja tiene juego, no hay envite y sus juegos se cuentan igualmente.',
        'Si los cuatro dicen «No juego», se juega **Punto**: gana la suma más alta por debajo de 31 (30, 29, 28...). Cuenta como un tanto.',
      ] },
    ] },
    { title: 'Hablar, envidar y órdago', blocks: [
      'Cuando hay lance, habla primero la mano (o el primer jugador con jugada) y se sigue por el orden de la mesa.',
      { list: [
        '**Paso**: no apuestas. Si todos los que intervienen pasan seguidos, el lance queda **en paso**.',
        '**Envido**: abres una apuesta de **al menos 2 tantos**. Indicas el total que se juega en el lance.',
        '**Quiero**: aceptas el envite.',
        '**No quiero**: lo rechazas; ya no se compara el lance.',
        '**Reenvío**: respondes con una cifra mayor.',
        '**Órdago**: apuestas toda la partida. Solo se puede **querer** o **no querer**, sin subir más.',
      ] },
      { note: 'Los botones que ves son una **decisión vinculante de pareja**: antes de pulsar, ponte de acuerdo con tu compañero, aunque sea con la mirada.' },
    ] },
    { title: 'Cómo se cuentan los tantos', blocks: [
      { table: { head: ['Situación', 'Quién cobra y cuánto'], rows: [
        ['Lance **en paso** (Grande o Chica)', 'El ganador del lance se lleva **1 tanto** en el recuento.'],
        ['Envite **aceptado**', 'El ganador del lance se lleva la cantidad envidada, en el recuento.'],
        ['Primer envite **rechazado** («negada»)', 'La pareja que envidó cobra **1 tanto** al instante y se considera ganadora del lance (cobra además sus pares, juego o punto propios, si los hay).'],
        ['Reenvío **rechazado**', 'La pareja que reenvió cobra la cantidad del envite **anterior**. Lo mismo vale para un órdago rechazado tras un envite.'],
        ['Pares y juego propios', 'La pareja ganadora del lance suma los tantos de **los dos compañeros** (pares: 1/2/3; juego: 3 por un 31 y 2 por los demás).'],
        ['Punto', 'La pareja ganadora suma **1 tanto**.'],
        ['**Órdago aceptado**', 'Se enseñan las cartas, gana el lance y **toda la partida** la pareja ganadora. Los envites anteriores aún sin contar quedan anulados.'],
      ] } },
      { list: [
        'Los envites aceptados y los premios propios se contabilizan **en el recuento final** de la mano, siguiendo el orden: Grande, Chica, Pares y Juego o Punto.',
        'Las negadas se anotan **al cerrar el lance**.',
        'En cuanto una pareja llega a la meta, **gana la partida** y no se cuenta nada más.',
        'Cinco tantos forman un **amarraco**; el marcador muestra amarracos y piedras sueltas. Con 4 tantos o menos para la meta, se anuncia «Estamos dentro».',
      ] },
    ] },
    { title: 'Restricción de órdago', blocks: [
      'No puedes **aceptar un órdago** (el botón no aparece) si tu pareja habla después de los dos rivales y la mejor jugada de los compañeros que intervienen es la mínima: **dos ases** en Pares o **33** en Juego.',
    ] },
    { title: 'Enseñar cartas y siguiente mano', blocks: [
      { steps: [
        'Al acabar Juego o Punto (o al aceptarse un órdago) los cuatro **enseñan las cuatro cartas**.',
        'Se realiza el **recuento** lance a lance, con el detalle de cada tanto.',
        'Si nadie ha ganado, la **mano** pulsa «Siguiente mano»; la mano pasa al jugador siguiente y se reparte.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Gana la primera pareja que **alcance o supere** los 30 o 40 tantos acordados. No hace falta llegar justo.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Sigue el **reglamento federativo** de ocho reyes y ocho ases, adaptado a **una sola partida** a 30 o 40 tantos.',
        'Cada móvil recibe solo **sus cartas**. Se muestran las de todos únicamente en el recuento o tras un órdago aceptado. El anfitrión, al ser quien custodia la partida, conserva el estado completo.',
        'La aplicación hace sola los pasos automáticos (repartir, enseñar cartas, recuento) y respeta el orden de turno.',
        'Las declaraciones de **pares y juego son veraces**: solo ves el botón que corresponde a tu mano. Decirlas es una decisión de pareja.',
        'Se impiden las acciones fuera de turno, las declaraciones falsas y los órdagos aceptados no permitidos. No se simulan sanciones de árbitro ni respuestas orales simultáneas; no existe «quiero y no pierdo».',
        'En el menú encuentras **Estado de la partida** (marcador, quién habla, historial y recuento) y **Mis señas**, una guía privada para hacer señas físicas con tu compañero. Las señas **no se envían a ningún móvil**.',
        'No hay límite de tiempo. Si alguien se ausenta, la partida se **pausa** en vez de decidir por él.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Con buenas cartas, cortar el mus evita que los rivales mejoren las suyas.',
        'Si tienes un 31 o duples, tu pareja puede apoyarse en ello: avisa a tu compañero con las señas y envida con confianza.',
        'Cerca de la meta, cada tanto cuenta: antes de aceptar un envite grande, comprueba cuántos te faltan.',
        'Un órdago puede cambiar la partida, pero solo si estás seguro de tu mano: es todo o nada.',
      ] },
    ] },
  ],
};
