# Reglamentos de Elteto

Un archivo por juego, `rulebooks/<id>.js` (mismo `id` que el catálogo, con guiones), con un
único `export default` de datos. `game-help.js` lo muestra dentro de la aplicación, sin
conexión y sin enlaces. Se añade solo al final la sección «Si alguien sale o se ausenta».

```js
export default {
  tagline: 'Una frase: de qué va el juego.',
  facts: [['Jugadores', '2'], ['Baraja', 'Española de 40'], ['Duración', '15–30 min']],
  sections: [
    { title: 'Objetivo', blocks: ['Párrafo con **negritas**.'] },
    { title: 'Cómo se juega', blocks: [{ steps: ['Primer paso.', 'Segundo paso.'] }] },
    { title: 'Valor de las cartas', blocks: [{ table: { head: ['Carta', 'Puntos'], rows: [['As', '11']] } }] },
    { title: 'Ojo', blocks: [{ note: 'Aviso importante.' }, { list: ['Punto', 'Punto'] }] },
  ],
};
```

Bloques admitidos: texto (`string`), `{ list: [...] }`, `{ steps: [...] }` (numerada),
`{ table: { head, rows } }` y `{ note: '...' }`. Texto plano: solo `**negrita**`; nada de HTML ni enlaces.
