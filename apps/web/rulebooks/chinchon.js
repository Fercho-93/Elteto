export default {
  tagline: 'Combina siete cartas en grupos y escaleras, **cierra con 5 puntos o menos** y que los demás sumen sus cartas sueltas.',
  facts: [['Jugadores', '2–8'], ['Baraja', 'Española de 40, sin comodines'], ['Cartas en mano', '7'], ['Eliminación', 'Más de 100 puntos']],
  sections: [
    { title: 'Objetivo', blocks: [
      'Formar combinaciones con tus cartas y **cerrar** la mano cuando te queden pocos puntos sueltos. Cada mano, los puntos que acumulas son malos: **quien supera 100 queda eliminado** y gana el último que sigue en pie.',
    ] },
    { title: 'Material y preparación', blocks: [
      { list: [
        'Baraja española de 40 cartas, sin comodines. Con **cinco o más jugadores** se juega con dos barajas mezcladas.',
        'Se reparten **7 cartas** a cada uno. Se descubre una carta como inicio del montón de descarte y el resto forma el mazo.',
        'La primera mano la inicia el primer jugador; en las siguientes la salida rota entre los jugadores que siguen en juego.',
      ] },
    ] },
    { title: 'Valor de las cartas', blocks: [
      { table: { head: ['Carta', 'Puntos'], rows: [['As a 7', 'Su número (1 a 7)'], ['Sota', '8'], ['Caballo', '9'], ['Rey', '10']] } },
    ] },
    { title: 'Combinaciones', blocks: [
      { list: [
        '**Grupo**: tres o más cartas del mismo número (de cualquier palo).',
        '**Escalera**: tres o más cartas consecutivas del mismo palo. Orden: **1, 2, 3, 4, 5, 6, 7, sota, caballo, rey**. El 7 enlaza con la sota. El as va siempre abajo y la escalera **no da la vuelta** (el rey no enlaza con el as).',
      ] },
      'Una carta solo puede estar en una combinación a la vez. Las que no entran en ninguna son las **sueltas** y son las que puntúan en tu contra.',
    ] },
    { title: 'Cómo se juega', blocks: [
      { steps: [
        '**Roba** una carta: la superior del mazo o la superior del descarte.',
        '**Descarta** una carta boca arriba sobre el montón. Con ello terminas tu turno.',
        'Si en lugar de descartar sin más quieres terminar la mano, usa **«Cerrar con esta carta»**: esa carta es tu descarte final.',
        'Si el mazo se acaba, se baraja el descarte (menos la carta de arriba) y se sigue.',
      ] },
    ] },
    { title: 'Cerrar la mano', blocks: [
      'Puedes cerrar cuando, después de descartar, las cartas que te quedan **sin combinar suman 5 puntos o menos**. No hace falta tener todo ligado.',
      { list: [
        'Al cerrar, enseñas tus combinaciones óptimas.',
        '**Chinchón**: si cierras con las **siete cartas completamente combinadas** (sueltas = 0), restas **10 puntos** en lugar de sumar nada.',
      ] },
    ] },
    { title: 'Recuento', blocks: [
      { steps: [
        'Cuando alguien cierra, cada rival expone, en orden desde el cierre, sus mejores combinaciones.',
        'Después, los rivales pueden **colocar cartas sueltas** en cualquier grupo o escalera expuesto si encajan (también en los del que cerró, salvo si hizo chinchón).',
        'Cada jugador suma el valor de lo que le queda en la mano. El que cerró suma sus sueltas (0 a 5) o resta 10 si hizo chinchón.',
      ] },
      { note: 'Si te quedas sin cartas en la mano al descartar, la mano acaba también.' },
    ] },
    { title: 'Fin de la partida', blocks: [
      'Los puntos se acumulan entre manos. Quien **supera 100 puntos queda eliminado**, sin posibilidad de volver. Gana el último jugador que queda en la partida.',
    ] },
    { title: 'Así se juega en Elteto', blocks: [
      { list: [
        'Botones principales: «Robar del mazo», «Coger descarte», «Descartar» y «Cerrar con esta carta».',
        'La aplicación **calcula sola** la mejor distribución de tus cartas en combinaciones, tanto al cerrar como cuando te toca exponer. No tienes que ordenarlas.',
        'Si pulsas cerrar sin cumplir la condición (más de 5 puntos sueltos), verás «Todavía no puedes cerrar».',
        'Tras el cierre aparecen «Exponer cartas» (cada rival en su turno) y las opciones de colocar cartas, con la etiqueta «→ grupo / escalera n». Pulsa «Terminar» cuando acabes.',
        'La eliminación es automática al superar 100. No hay reenganches.',
        'El chinchón cuenta como **cualquier mano con todas las cartas combinadas**, no solo la escalera de siete.',
      ] },
    ] },
    { title: 'Consejos', blocks: [
      { list: [
        'Descarta pronto las cartas altas sueltas: rey, caballo y sota pesan mucho.',
        'No cierres solo porque puedes: si un rival cierra antes, sus colocaciones pueden dejarte lejos de tu objetivo.',
        'Observa qué coge el rival del descarte para saber qué combinaciones busca.',
      ] },
    ] },
  ],
};
