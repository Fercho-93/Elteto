export default {
  tagline: 'Un rummy de diez cartas: combina tu mano en grupos y escaleras, **cierra primero** y que los demás paguen lo que les queda.',
  facts: [['Jugadores', '2–8'], ['Baraja', 'Póker español con comodines'], ['Cartas en mano', '10'], ['Manos', '6, gana la menor suma']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Combinar las diez cartas de tu mano antes que nadie y **cerrar**. Cada mano, los rivales suman puntos por las cartas que les quedan. Tras **seis manos** gana quien tenga **menos puntos**.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja de póker español de 52 cartas más **2 comodines** por baraja (54). Se usan **dos barajas** y **tres** si hay siete u ocho jugadores. Por eso hay cartas repetidas.',
        'Cada jugador recibe **10 cartas**. Se descubre una carta para iniciar el descarte y el resto forma el mazo.',
        'Empieza el primer jugador en la primera mano; después la salida pasa al siguiente en cada mano.',
      ] },
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [['As', '1'], ['2 a 9', 'Su número'], ['10, J, Q, K', '10'], ['Comodín', '**20**']] } },
    ] },
    { title: 'Combinaciones', blocks: [
      { list: [
        '**Grupo**: tres o más cartas del mismo número, de cualquier palo (pueden repetirse palos al haber varias barajas).',
        '**Escalera**: tres o más cartas consecutivas del mismo palo, de A a K. El as puede ir **debajo del 2** o **encima del rey** (Q-K-A), pero la escalera no sigue «dando la vuelta»: K-A-2 no vale.',
        '**Comodín**: sustituye a cualquier carta en un grupo o en una escalera. Una combinación debe llevar al menos una carta natural.',
      ] },
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        '**Roba** la carta superior del mazo o la del descarte.',
        '**Descarta** una carta boca arriba. Con eso termina tu turno.',
        'Si tras descartar te quedan **diez cartas que puedes combinar por completo**, en lugar de un descarte normal pulsas «Cerrar con esta carta».',
      ] },
      'Si el mazo se agota, se baraja el descarte (menos la carta de arriba) y se continúa.',
    ] },
    { title: 'Cerrar', blocks: [
      'Para cerrar, las diez cartas que conservas tras el descarte tienen que estar **todas ligadas** en grupos y escaleras. Hay una segunda forma, el **color**:',
      { list: [
        '**Color**: si todas tus cartas naturales restantes son del **mismo palo**, también puedes cerrar, aunque no estén en escalera. Los comodines valen.',
      ] },
      { note: 'Cuando alguien cierra, la mano termina en el acto. No hay turno de exposición ni de colocación de cartas.' },
    ] },
    { title: 'Recuento', blocks: [
      'El jugador que cierra suma **0** esa mano. Todos los demás suman el valor de **todas las cartas que tienen en la mano** en ese momento.',
      { table: { head: ['Jugador', 'Suma'], rows: [['Quien cierra', '0'], ['Los demás', 'Todas sus cartas en mano']] } },
    ] },
    { title: 'Fin de la partida', blocks: [
      'Tras la **sexta mano** gana el jugador con **menos puntos acumulados**. Si hay empate en el mínimo, ganan todos los empatados.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Botones: «Robar del mazo», «Coger descarte», «Descartar» y «Cerrar con esta carta». Selecciona primero la carta que descartas o con la que cierras.',
        'La aplicación **comprueba el cierre** y responde «Todavía no puedes cerrar» si tus diez cartas restantes no cumplen.',
        'Las dos barajas (o tres) y los comodines se gestionan solos, incluidas las cartas repetidas entre barajas.',
        'Es una variante de Elteto: **seis manos** y puntuación por la menor suma, sin eliminación ni objetivo de puntos.',
        'Al cerrar, **los rivales suman todas las cartas que les quedan en la mano**, ya estén combinadas o no. No se descuentan las combinaciones que tuvieran.',
      ] },
      { note: 'Aunque tengas combinaciones hechas, **no las bajas a la mesa**: solo cuenta quién cierra. Descartar a tiempo cartas altas sueltas es clave.' },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Guarda los comodines: valen 20 si te quedan, pero ayudan a cerrar.',
        'Como los demás pagan todo lo que tienen, **cerrar rápido** pesa más que formar combinaciones perfectas.',
        'Suelta pronto las figuras que no encajan: cada una pesa 10 puntos.',
      ] },
    ] },
  ],
};
