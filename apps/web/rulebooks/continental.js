export default {
  tagline: 'Siete manos, cada una con un **contrato** distinto de tríos y escaleras. Gana quien acumule **menos puntos**.',
  facts: [['Jugadores', '2–8'], ['Baraja', 'Francesa con 2 comodines por baraja'], ['Manos', '7 (de 6 a 12 cartas)'], ['Gana', 'La menor suma']],
  sections: [
    { title: 'Objetivo', blocks: [
      'En cada mano debes **cumplir el contrato**, bajar tus combinaciones y quedarte sin cartas. Quien se queda sin cartas suma 0; los demás suman lo que les queda. Tras siete manos gana quien tenga **menos puntos**.',
    ] },
    { title: 'Los siete contratos', blocks: [
      'Cada mano tiene su contrato y un número de cartas repartidas. **Un trío** son tres o más cartas del mismo número. **Una escalera** son **cuatro o más** consecutivas del mismo palo.',
      { table: { head: ['Mano', 'Cartas', 'Contrato'], rows: [
        ['1', '6', '2 tríos'],
        ['2', '7', '1 trío + 1 escalera'],
        ['3', '8', '2 escaleras'],
        ['4', '9', '3 tríos'],
        ['5', '10', '2 tríos + 1 escalera'],
        ['6', '11', '1 trío + 2 escaleras'],
        ['7', '12', '3 escaleras'],
      ] } },
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Barajas francesas de 52 cartas con **2 comodines** cada una. Se usan **dos barajas** y se añaden más según avanzan las manos: con cuatro jugadores pasan a tres barajas desde la quinta mano; con cinco o más, a tres desde la tercera y a cuatro desde la quinta.',
        'Se reparten las cartas de la mano, se aparta **un tercio del mazo** como montón de **castigo** y se descubre una carta para iniciar el descarte.',
        'La primera mano la empieza el primer jugador y la salida rota con cada mano.',
      ] },
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [['Comodín', '**50**'], ['As', '20'], ['8, 9, 10, J, Q, K', '10'], ['2 a 7', '5']] } },
    ] },
    { title: 'Combinaciones', blocks: [
      { list: [
        '**Trío**: tres o más cartas del mismo número, de cualquier palo.',
        '**Escalera**: cuatro o más cartas seguidas del mismo palo, sin repetir número. El as puede ir antes del 2 o después del rey, y la escalera puede continuar «dando la vuelta» (por ejemplo, Q-K-A-2).',
        '**Comodines**: sustituyen a cualquier carta, pero cada combinación necesita al menos una natural.',
      ] },
    ] },
    { title: 'Cómo se juega un turno', blocks: [
      { steps: [
        '**Roba** la carta superior del mazo o la del descarte.',
        'Si robaste del mazo, los demás pueden **reclamar el descarte** (ver abajo).',
        'Si aún no has bajado, puedes **exponer el contrato**: bajas de una vez exactamente las cartas del contrato de esta mano.',
        'Una vez bajado, puedes **ampliar combinaciones** (tuyas o ajenas) y **sustituir comodines** por la carta natural que representan.',
        '**Descarta** una carta para terminar el turno.',
      ] },
      { note: 'No puedes colocar cartas en la mesa hasta que hayas expuesto tu contrato.' },
    ] },
    { title: 'Reclamar el descarte', blocks: [
      'Cuando un jugador roba del mazo, los demás, por orden, pueden quedarse la carta del descarte. Quien la coge debe además llevarse **una carta de castigo** (la superior del montón de castigo; si no queda, roba del mazo).',
      'Si nadie la quiere, el jugador del turno descarta y la partida sigue. Si el jugador cogió el descarte directamente, no hay reclamación.',
    ] },
    { title: 'Exponer y salir', blocks: [
      { list: [
        'El contrato se baja entero: no vale bajar solo una parte. Las cartas seleccionadas deben formar **exactamente** los tríos y escaleras pedidos.',
        'Tras bajar puedes añadir cartas a tríos o escaleras de la mesa mientras sigan siendo válidos.',
        '**Sustituir comodín**: cambias un comodín de una combinación por la carta natural que le falta; el comodín pasa a tu mano.',
        'La mano acaba cuando un jugador **se queda sin cartas**, ya sea bajando, ampliando o descartando la última.',
      ] },
    ] },
    { title: 'Recuento y fin de la partida', blocks: [
      'Al terminar la mano, cada jugador suma el valor de las cartas que **conserva en la mano**. Las ya bajadas no cuentan. Quien no llegó a exponer su contrato se queda con toda la mano.',
      'Tras la séptima mano gana el jugador con **menos puntos**. Si varios empatan en el mínimo, comparten la victoria.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'La pantalla muestra siempre el **contrato** en curso. Selecciona todas las cartas del contrato y pulsa «Exponer contrato».',
        'Botones: «Robar del mazo», «Coger descarte», «Dejar pasar», «Coger descarte + castigo», «Exponer contrato», «Sustituir comodín» y «Descartar».',
        'Las ampliaciones aparecen como opciones («7 de oros → escalera 2») solo cuando son válidas.',
        'La reclamación del descarte se ofrece de forma automática a cada jugador por orden, solo si el que tiene el turno ha robado del mazo.',
        'Siempre se juegan **siete manos**, sin eliminación. No hay botón de cierre: la mano acaba al vaciarse la de un jugador.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Guarda las cartas que encajan en tu contrato; las altas sueltas pesan mucho: el as vale 20 y un comodín suelto, 50.',
        'Expón en cuanto puedas: así te quedas con menos cartas y puedes ampliar y robar comodines.',
        'Reclamar el descarte ayuda, pero la carta de castigo añade peso a tu mano.',
      ] },
    ] },
  ],
};
