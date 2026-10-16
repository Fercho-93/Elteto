export default {
  tagline: 'Dos jugadores, un tablero de 8 × 8 y una norma que lo cambia todo: **comer es obligatorio**.',
  facts: [['Jugadores', '2'], ['Tablero', '8 × 8, casillas oscuras'], ['Fichas', '12 por jugador'], ['Duración', '15–30 min']],
  sections: [
    { title: 'Objetivo', blocks: ['Gana quien deja al rival **sin jugadas posibles**: porque le ha capturado todas las fichas o porque las que le quedan están bloqueadas.'] },
    { title: 'Preparación', blocks: [
      { list: [
        'Cada jugador coloca sus 12 fichas en las casillas oscuras de las tres filas más cercanas a él.',
        'Solo se juega sobre las casillas oscuras; las claras nunca se usan.',
        'Empiezan las **blancas** (las fichas que avanzan desde la parte inferior de tu pantalla) y después se alternan los turnos.',
      ] },
    ] },
    { title: 'Cómo se mueve cada ficha', blocks: [
      { list: [
        '**Peón**: avanza **una** casilla en diagonal hacia delante, a una casilla libre. Nunca retrocede al moverse.',
        '**Dama**: es un peón coronado. Se mueve en diagonal, hacia delante o hacia atrás, **todas las casillas libres que quiera** (dama voladora).',
      ] },
      { note: 'Un peón se corona al terminar su movimiento en la última fila del rival. Desde ese momento es una dama.' },
    ] },
    { title: 'Capturar', blocks: [
      'Capturas saltando por encima de una ficha rival que esté en diagonal justo detrás de la cual haya una casilla libre. La ficha saltada sale del tablero.',
      { list: [
        '**Peón**: captura solo **hacia delante**, saltando una ficha rival contigua.',
        '**Dama**: captura a distancia. Recorre la diagonal hasta una ficha rival, la salta y puede caer en cualquiera de las casillas libres que haya detrás.',
        '**Capturas encadenadas**: si tras un salto la misma ficha puede seguir capturando, debe continuar en ese mismo turno hasta completar el recorrido. En Elteto marcas el recorrido completo, con todos los saltos.',
        'Las fichas capturadas se retiran al terminar el recorrido, y una misma ficha no puede saltarse dos veces.',
      ] },
    ] },
    { title: 'La captura es obligatoria', blocks: [
      'Si puedes capturar, **tienes que hacerlo**: no vale elegir un movimiento sin captura. Si hay varias capturas posibles, la regla de la mayoría decide:',
      { steps: [
        'Debes elegir la secuencia que captura **más fichas**.',
        'Si hay empate, la que captura **más damas**.',
        'Si aun así hay empate, puedes elegir libremente entre ellas.',
      ] },
      'Elteto solo te deja marcar jugadas válidas y te indica «Captura obligatoria» cuando toca.',
    ] },
    { title: 'Tablas (empate)', blocks: [
      'La partida termina en tablas, sin ganador, en cualquiera de estos casos:',
      { list: [
        '**Por acuerdo**: un jugador pulsa «Ofrecer tablas» en su turno y el otro «Aceptar tablas». Si el rival hace una jugada, la oferta caduca.',
        '**Repetición**: la misma posición, con el mismo jugador a mover, aparece por **tercera vez**.',
        '**Sin progreso**: se juegan **40 medias jugadas seguidas** (20 de cada jugador) sin ninguna captura ni movimiento de un peón.',
        '**Final de tres damas contra una**: si el bando de tres damas no consigue ganar antes de **26 medias jugadas** mientras la dama solitaria controla la diagonal principal.',
      ] },
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Toca una de tus fichas y después marca el recorrido completo, con todas las casillas de llegada de cada salto. La aplicación solo acepta jugadas legales.',
        'Si hay una captura disponible, el movimiento sin captura no se admite y las capturas menores que la máxima tampoco.',
        'Los botones «Ofrecer tablas» y «Aceptar tablas» aparecen en tu turno y cuando el rival te propone el empate.',
        'La partida termina sola cuando alguien se queda sin jugadas o se cumple una regla de tablas; no hace falta declararlo.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Mantén tus peones agrupados: una ficha aislada es fácil de capturar.',
        'Antes de mover, comprueba si el rival podrá capturar después. Como comer es obligatorio, puedes **sacrificar una ficha** para forzar que el rival se coloque donde te interesa y capturar varias a cambio.',
        'Corona cuanto antes: una dama voladora vale mucho más que un peón.',
      ] },
    ] },
  ],
};
