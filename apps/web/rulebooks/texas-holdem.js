export default {
  tagline: 'Póker sin límite: dos cartas privadas, cinco comunitarias y el mejor juego de cinco gana el bote.',
  facts: [['Jugadores', '2 a 7'], ['Baraja', 'Francesa de 52 cartas'], ['Fichas', '1.000 por jugador, sin dinero real'], ['Modalidad', 'Sin límite (No-Limit)'], ['Duración', 'Variable: hasta que uno tenga todas las fichas']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano, **ganar el bote** con la mejor combinación de cinco cartas o haciendo que todos los demás se retiren.',
      'La partida se acaba cuando un jugador **reúne todas las fichas** de la mesa.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Cada jugador empieza con **1.000 fichas**. Son solo fichas de juego, sin valor real.',
        'Se reparten **dos cartas tapadas** a cada jugador (tus cartas privadas). Solo tú ves las tuyas.',
        'Sobre la mesa se irán colocando **cinco cartas comunitarias** boca arriba, que usan todos.',
        'El **botón de reparto** marca quién da. Antes de ver las cartas, los dos jugadores siguientes a su izquierda ponen las **ciegas**: la pequeña y la grande.',
      ] },
    ] },
    { title: 'Combinaciones', blocks: [
      'Tu mano final es la **mejor combinación de cinco cartas** entre tus dos privadas y las cinco comunitarias. Puedes usar las dos, una o ninguna.',
      { table: { head: ['Combinación', 'Descripción'], rows: [
        ['1. Escalera de color', 'Cinco cartas seguidas del mismo palo (la escalera de color más alta termina en el as).'],
        ['2. Póker', 'Cuatro cartas del mismo valor.'],
        ['3. Full', 'Tres de un valor y dos de otro.'],
        ['4. Color', 'Cinco cartas del mismo palo.'],
        ['5. Escalera', 'Cinco valores consecutivos. El as vale alto o bajo (A-2-3-4-5).'],
        ['6. Trío', 'Tres cartas del mismo valor.'],
        ['7. Doble pareja', 'Dos parejas.'],
        ['8. Pareja', 'Dos cartas del mismo valor.'],
        ['9. Carta alta', 'Ninguna de las anteriores: cuenta la carta más alta.'],
      ] } },
      'Entre combinaciones iguales gana la de cartas más altas; si todas las cinco son equivalentes, hay **empate** y el bote se reparte. Los palos nunca desempatan.',
    ] },
    { title: 'Cómo se juega', blocks: [
      'Cada mano tiene hasta cuatro rondas de apuestas:',
      { steps: [
        '**Antes del flop**: con tus dos cartas privadas. Habla primero el jugador a la izquierda de la ciega grande.',
        '**Flop**: se ponen tres cartas comunitarias. Segunda ronda de apuestas, empezando por el primer jugador a la izquierda del botón.',
        '**Turn**: cuarta carta comunitaria. Tercera ronda de apuestas.',
        '**River**: quinta y última carta comunitaria. Última ronda de apuestas.',
        '**Duelo final**: si quedan dos o más jugadores tras la última ronda, enseñan sus cartas y gana la mejor combinación.',
      ] },
      'Si en cualquier momento todos menos uno se retiran, ese jugador gana el bote **sin tener que enseñar**.',
    ] },
    { title: 'Tus decisiones en cada turno', blocks: [
      { list: [
        '**Retirarme**: abandonas la mano y pierdes lo que hayas puesto.',
        '**Pasar**: no apuestas nada. Solo puedes si **nadie ha apostado** en esta ronda (o tu apuesta ya iguala la más alta).',
        '**Igualar**: pones las fichas que te faltan para igualar la apuesta más alta. Si no tienes tantas, igualas con todas las que te quedan.',
        '**Apostar / Subir**: elige cuánto. El campo **«Hasta»** es el **total** que habrás puesto en esta ronda, no lo que añades.',
        '**All-in**: apuestas todas tus fichas.',
      ] },
      { note: 'La ronda termina cuando todos los que siguen en la mano han puesto lo mismo, o están all-in.' },
    ] },
    { title: 'Subidas mínimas', blocks: [
      { list: [
        'Una subida debe alcanzar la apuesta actual **más la última subida completa**. Después del flop, la apuesta mínima es una ciega grande.',
        'Un **all-in corto** (menor que la subida mínima) es válido, pero **no reabre las apuestas**: quien ya había actuado solo puede igualar o retirarse, no volver a subir por esa subida corta.',
      ] },
    ] },
    { title: 'Ciegas', blocks: [
      'Al empezar, la ciega pequeña es **5** y la grande **10**. Cada **vuelta completa a la mesa** (tantas manos como jugadores con fichas) ambas suben **5**: 5/10, 10/15, 15/20, 20/25... Encima de la mesa se ve cuántas manos faltan para la subida.',
      'El botón de reparto **rota** cada mano entre los jugadores que aún tienen fichas.',
      { note: 'Mano a mano (dos jugadores): el botón paga la ciega pequeña y habla primero antes del flop; después del flop habla primero la grande.' },
      'Si no tienes fichas para toda la ciega, pones las que te queden y estás all-in.',
    ] },
    { title: 'Botes laterales y empates', blocks: [
      { list: [
        'Si alguien va **all-in**, solo puede ganar los botes a los que ha contribuido. Lo que apuesten los demás por encima forma **botes laterales** en los que no participa.',
        'Cada bote lo gana la mejor mano **entre quienes están en él**.',
        'Si una apuesta no la iguala nadie, la parte sobrante **vuelve** a su dueño.',
        'En caso de empate, el bote se reparte en **fichas enteras**. Si sobran fichas, se dan una a una a los ganadores a partir del asiento siguiente al botón.',
      ] },
    ] },
    { title: 'Cómo se gana', blocks: [
      'Quien se queda sin fichas queda **eliminado** y pasa a **observador**. La partida termina cuando solo un jugador conserva fichas: ese es el ganador.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La aplicación reparte, coloca ciegas, rota el botón, calcula los botes y reparte las fichas. Tú solo decides en tu turno.',
        'Los botones cambian según la situación: **Retirarme**, **Pasar** o **Igualar n**, **Apostar / Subir** y **All-in**. Al apostar puedes elegir importe con atajos (2, 3 o 4 ciegas antes del flop; ½, ¾ o el bote después) o con el campo numérico.',
        '**«Enseñar cartas»** (botón): si ganas la mano porque todos se retiran, puedes mostrar una o las dos cartas. Es voluntario y solo para el ganador.',
        'Cuando termina una mano, aparece el detalle del reparto del bote. Un botón **«Siguiente mano»** da la siguiente.',
        '**Ausentarme y volver**: en el menú puedes ausentarte sin perder plaza, personaje ni fichas. Si estás ausente y te toca, tras **12 segundos** la aplicación **pasa** si es gratis o **te retira** si hay que pagar. Las ciegas siguen contando. Si todos están ausentes, la partida espera.',
        'Si vuelves a abrir la sala desde el mismo navegador, recuperas tu plaza. Quien pierde todas las fichas permanece como observador.',
        'La mesa admite **de 2 a 7 jugadores** y no hay dinero real.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Con pocas fichas respecto a la ciega grande, apuesta fuerte con manos buenas: no podrás esperar mucho.',
        'No pierdas de vista el bote: si tienes que pagar poco para ver una carta más, puede compensar.',
        'Tu posición importa: jugar tarde, cerca del botón, te da información sobre lo que han hecho los demás.',
      ] },
    ] },
  ],
};
