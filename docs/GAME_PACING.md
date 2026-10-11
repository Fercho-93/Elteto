# Ritmo de las partidas

Cada acción pública se presenta en orden: anuncio del jugador (1 s), movimiento completo y resultado legible (2 s). Fichas: 450 ms por casilla, 1.050 ms por tramo de damas; dado: 2.200 ms; cartas: 1.200 ms; fichas del póker hacia la apuesta, el bote y el ganador: 1.200 ms. Durante la presentación se bloquean las acciones de juego para evitar pulsaciones prematuras. Menú, historial y reglas siguen accesibles.

La autoridad deja a la IA un mínimo de 4,8 s (5,5 s en Parchís/damas y 6,5 s en Oca), ampliado al anuncio + movimiento completo + resultado + 800 ms cuando un recorrido tarda más. La misma política funciona en WebRTC, LAN Android y salas online. Los mensajes repetidos no reinician el temporizador.

Mus usa sus eventos públicos para anunciar MUS, corte, descarte, declaraciones, envites, reenvites y respuestas, sin incluir cartas privadas. Reparto: 2,2 s y cartas repartidas: 1,6 s; reposición y enseñanza: 5,2 s; cada paso de tanteo: 4,8 s. Las transiciones automáticas recibidas durante una presentación se conservan al terminar. Con movimiento reducido se conservan las pausas de lectura; al volver de una pestaña oculta se recupera el estado actual.

Referencias de presentación: [PokerStars: mesa, apuestas, animaciones y anuncios](https://www.pokerstars.com/help/articles/table-appearance-feature/232136/) y [Monopoly de Marmalade: experiencia móvil y tablero animado](https://www.marmaladegamestudio.com/ua-monopoly). Los tiempos son decisiones propias de Elteto, no tiempos oficiales de estos productos. Las reglas y el cálculo de resultados permanecen en el motor.

Los dibujos de los avatares usan imágenes PNG recortadas con CSS y conservan sus nodos decodificados entre actualizaciones. Las nuevas cartas del póker salen del mazo y el saldo del bote tiene una zona separada de las fichas. El menú distingue la ausencia temporal de la salida de la sala.

La primera entrada solicita nombre y personaje, que se conservan para las siguientes partidas. En Parchís se distingue la tirada inicial que decide el orden de una tirada de movimiento: solo esta última permite sacar una ficha con un cinco y salida libre.
