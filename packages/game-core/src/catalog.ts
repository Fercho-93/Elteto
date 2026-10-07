/** Source-grounded plans. Only the engine registry defines what can create a room. */
export type GamePlan = {
 id: string; label: string; family: string; status: "playable" | "planned";
 players: readonly number[]; material: string; defaultVariant: string;
 rules: { file: string; url: string; sha256: string };
 summary: string; implementationNotes: string;
 phases: readonly string[]; actions: readonly string[]; acceptance: readonly string[];
};
export const GAME_CATALOG: readonly GamePlan[] = [
  {
    "id": "cinquillo",
    "label": "Cinquillo",
    "family": "sequences",
    "status": "playable",
    "players": [
      2,
      3,
      4,
      5,
      6
    ],
    "material": "spanish-40",
    "defaultVariant": "clasico",
    "rules": {
      "file": "reglas_juegos/cinquillo.html",
      "url": "https://www.ludoteka.com/juegos/cinquillo/reglas",
      "sha256": "8d38f740012a9026f4f58e8e41fade592978daeba0ebfecd9009b648620313d8"
    },
    "summary": "Salida 5 de oros; escalera 1–7,10–12; ganador +5 y cartas ajenas, perdedores -cartas; meta 30.",
    "implementationNotes": "La modalidad clásica de la fuente usa cuatro jugadores. Elteto conserva también mesas de 2, 3, 5 y 6 con las mismas reglas y puntuación.",
    "phases": [
      "reparto",
      "jugar",
      "recuento"
    ],
    "actions": [
      "play",
      "pass",
      "next-hand"
    ],
    "acceptance": [
      "Salto de 7 a sota",
      "Paso prohibido con jugada",
      "Recuento y nueva mano",
      "Privacidad"
    ]
  },
  {
    "id": "mus",
    "label": "Mus",
    "family": "betting",
    "status": "playable",
    "players": [
      4
    ],
    "material": "spanish-40",
    "defaultVariant": "ocho-reyes",
    "rules": {
      "file": "reglas_juegos/mus.html",
      "url": "https://www.nhfournier.es/como-jugar/mus/",
      "sha256": "234c68988b16a0a8569cc40237e4797b47f18d19dc47d9f8ac62b56068dd348a"
    },
    "summary": "8 reyes/8 ases; cuatro jugadores por parejas; 40 tantos por juego, gana quien logra 3 juegos completos.",
    "implementationNotes": "Las salas antiguas conservan 4 reyes y un juego; el perfil alternativo de 4 reyes queda disponible en el motor.",
    "phases": [
      "mus",
      "discard",
      "grande",
      "chica",
      "pares",
      "juego",
      "showdown"
    ],
    "actions": [
      "mus",
      "discard",
      "pass",
      "bet",
      "ordago",
      "accept",
      "reject",
      "next-hand"
    ],
    "acceptance": [
      "Equivalencia 3/rey y 2/as",
      "31 vence a 32",
      "Dejes y punto",
      "Órdago decide juego, no partida",
      "Mus corrido inicial"
    ]
  },
  {
    "id": "texas_holdem",
    "label": "Póker Texas Hold’em",
    "family": "betting",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "material": "french-52",
    "defaultVariant": "sin-limite",
    "rules": {
      "file": "reglas_juegos/texas_holdem.html",
      "url": "https://www.nhfournier.es/como-jugar/texas-holdem/",
      "sha256": "0391b861c37a8d01e4deaf379e3077c3fbb437f3bd55d63e3917a92ab44db220"
    },
    "summary": "Dos privadas y cinco comunitarias; mejor combinación de cinco; apuestas en fichas.",
    "implementationNotes": "Elegir límite, sin límite o pot-limit. Definir fichas, ciegas y final de sesión; la fuente no completa todos los casos de all-in.",
    "phases": [
      "ciegas",
      "preflop",
      "flop",
      "turn",
      "river",
      "recuento"
    ],
    "actions": [
      "fold",
      "check",
      "call",
      "bet",
      "raise",
      "all-in"
    ],
    "acceptance": [
      "Botes laterales",
      "Empates",
      "Subida mínima",
      "All-in corto",
      "Juego de dos jugadores"
    ]
  },
  {
    "id": "parchis",
    "label": "Parchís",
    "family": "race",
    "status": "playable",
    "players": [
      2,
      3,
      4
    ],
    "material": "parchis",
    "defaultVariant": "cayro-es",
    "rules": {
      "file": "reglas_juegos/parchis.pdf",
      "url": "https://cayro.es/wp-content/uploads/2025/01/074-1-074-6-095-096-097-100-118-160-608-632-752-843-860-1615-2631-t-131-a-t-134-t-134-a-t-135-t-136-t-138-t-138-6-t-138-6-a-t-138-a-t-139-t-155-ins-parchis-p-0622-es-en-fr-de-it-pt-el-pl-nl-af.pdf",
      "sha256": "a25b7b509900f943a645bdb02652f0c729f3ed8d9941f4e3411d461f33d5659f"
    },
    "summary": "Salida con 5; 6 repite y cuenta 7 con cuatro fichas fuera; tercer 6 devuelve última ficha; capturar +20, meta +10 y llegada exacta.",
    "implementationNotes": "Tablero Elteto de 68 casillas, pasillos de siete y meta exacta: salidas amarillo 5, verde 22, rojo 39 y azul 56. Seguros 5/12/17 y sus rotaciones. Máximo dos fichas por casilla; 5 permite salir o mover; sin excepción de captura en salidas seguras. Desempate inicial entre empatados y bonificaciones completas si hay movimiento válido.",
    "phases": [
      "tirar",
      "mover",
      "bonificacion"
    ],
    "actions": [
      "roll",
      "move"
    ],
    "acceptance": [
      "Seguros",
      "Barrera obligatoria con 6",
      "Tercer 6",
      "Bonificaciones y llegada exacta"
    ]
  },
  {
    "id": "damas_espanolas",
    "label": "Damas españolas",
    "family": "checkers",
    "status": "planned",
    "players": [
      2
    ],
    "material": "checkers-8x8",
    "defaultVariant": "espanolas",
    "rules": {
      "file": "reglas_juegos/damas_espanolas.html",
      "url": "https://www.ludoteka.com/juegos/damas-espa%C3%B1olas/reglas",
      "sha256": "356e6ec051836ef535c8a94a89e8577d90957b4e34e06b410b0a3c134a270bdc"
    },
    "summary": "12 piezas por bando; blancas empiezan; peones hacia delante; damas voladoras; captura por cantidad y calidad.",
    "implementationNotes": "Partida única; no mezclar con damas internacionales ni ganapierde.",
    "phases": [
      "mover",
      "capturar",
      "fin"
    ],
    "actions": [
      "move",
      "offer-draw",
      "accept-draw"
    ],
    "acceptance": [
      "Captura máxima y damas",
      "Coronación",
      "Bloqueo",
      "Triple repetición",
      "40 movimientos sin progreso",
      "Final de 3 damas contra 1"
    ]
  },
  {
    "id": "oca",
    "label": "Juego de la oca",
    "family": "race",
    "status": "planned",
    "players": [
      2,
      3,
      4
    ],
    "material": "goose",
    "defaultVariant": "cayro-es",
    "rules": {
      "file": "reglas_juegos/oca.pdf",
      "url": "https://cayro.es/wp-content/uploads/2025/01/095-097-118-158-752-843-860-1615-t-131-a-t-135-t-138-t-138-6-t-138-6-a-t-138-a-ins-oca-o-0622-es-en-fr-de-it-pt-pl-nl-af.pdf",
      "sha256": "9da0456ca10c6fbb7acbc9652015799e067996384bf5b698445889e83a6dfe04"
    },
    "summary": "Ocas avanzan a siguiente oca y repiten; 6→12; 26↔53; 19/31/42 pierden 2 turnos; 52 espera relevo; 58→1; llegada exacta con rebote en 63.",
    "implementationNotes": "Usar exclusivamente texto español del PDF; las traducciones difieren. Definir coordenadas de ocas y tablero de esta edición.",
    "phases": [
      "tirar",
      "resolver-casilla",
      "fin"
    ],
    "actions": [
      "roll"
    ],
    "acceptance": [
      "Rebote",
      "Intercambio de casilla ocupada",
      "Prisión y relevo",
      "Penalizaciones"
    ]
  },
  {
    "id": "brisca",
    "label": "Brisca",
    "family": "tricks",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      6
    ],
    "material": "spanish-40",
    "defaultVariant": "fournier",
    "rules": {
      "file": "reglas_juegos/brisca.html",
      "url": "https://www.nhfournier.es/como-jugar/brisca/",
      "sha256": "e09b1e771ab8077894de2f0987319e616aa31f6c000f5e2a8396ee04e742f267"
    },
    "summary": "Tres cartas por mano; sin obligación de asistir; gana triunfo o palo de salida; as 11, tres 10, rey 4, caballo 3, sota 2.",
    "implementationNotes": "Acordar número de juegos y formato individual o por equipos.",
    "phases": [
      "reparto",
      "baza",
      "robar",
      "recuento"
    ],
    "actions": [
      "play",
      "exchange-trump",
      "next-hand"
    ],
    "acceptance": [
      "Triunfo",
      "Robo ganador primero",
      "Cambio 7/2",
      "Empate 60",
      "Parejas"
    ]
  },
  {
    "id": "tute",
    "label": "Tute",
    "family": "tricks",
    "status": "planned",
    "players": [
      2,
      3,
      4
    ],
    "material": "spanish-40",
    "defaultVariant": "parejas-cuatro",
    "rules": {
      "file": "reglas_juegos/tute.html",
      "url": "https://www.nhfournier.es/como-jugar/tute/",
      "sha256": "40df75b8d2afba12757945224a4173decb6a17c48ff33c282826fa19cfeb534a"
    },
    "summary": "Por parejas: diez cartas; asistir, montar, fallar y pisar; cánticos 20/40, diez últimas, tute de reyes o caballos.",
    "implementationNotes": "Motores o perfiles diferentes para 2, 3 y 4. No aplicar 101 tantos ni capote de dos a parejas de cuatro.",
    "phases": [
      "reparto",
      "baza",
      "cantar",
      "recuento"
    ],
    "actions": [
      "play",
      "sing",
      "exchange-trump",
      "declare-capote",
      "next-hand"
    ],
    "acceptance": [
      "Obligación según modalidad",
      "Tute inmediato",
      "Cantos tras baza",
      "Contrafallo",
      "Capote solo para dos"
    ]
  },
  {
    "id": "chinchon",
    "label": "Chinchón",
    "family": "melds",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "material": "spanish-40",
    "defaultVariant": "cuarenta",
    "rules": {
      "file": "reglas_juegos/chinchon.html",
      "url": "https://www.nhfournier.es/como-jugar/chinchon/",
      "sha256": "9059310781bde180a5ea31040bb7e2decd2d2deede49b55e0167a1d3aa092162"
    },
    "summary": "Siete cartas; grupos de tres o más y escaleras; as bajo; chinchón de siete cartas.",
    "implementationNotes": "Definir 40/48, puntos de eliminación y reenganches antes de empezar; más de cuatro jugadores usan dos barajas.",
    "phases": [
      "robar",
      "descartar",
      "cerrar",
      "recuento"
    ],
    "actions": [
      "draw",
      "discard",
      "close",
      "next-hand"
    ],
    "acceptance": [
      "Cierre válido",
      "Valor figuras 8/9/10 con 40",
      "Valor nominal con 48",
      "Dos barajas y cartas duplicadas",
      "Reenganche"
    ]
  },
  {
    "id": "escoba",
    "label": "Escoba de quince",
    "family": "capture",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      6
    ],
    "material": "spanish-40",
    "defaultVariant": "fournier",
    "rules": {
      "file": "reglas_juegos/escoba.html",
      "url": "https://www.nhfournier.es/como-jugar/escoba/",
      "sha256": "9b47d29f58495b8a787b89313ef6895953cad53eac8ba3dbdca6608f1cf65897"
    },
    "summary": "Tres cartas por jugador y cuatro en mesa; capturar sumando 15; sota 8, caballo 9, rey 10; objetivos 21/31.",
    "implementationNotes": "Distinguir penalizaciones de juego manual de validación digital; definir meta 21 o 31 y equipos.",
    "phases": [
      "reparto",
      "capturar",
      "recuento"
    ],
    "actions": [
      "play",
      "capture",
      "next-hand"
    ],
    "acceptance": [
      "Escoba inicial 15/30",
      "Siete de oros",
      "Cuatro sietes",
      "Última captura",
      "Puntos por mayorías"
    ]
  },
  {
    "id": "pocha",
    "label": "Pocha",
    "family": "tricks",
    "status": "planned",
    "players": [
      3,
      4,
      5
    ],
    "material": "spanish-40",
    "defaultVariant": "fournier",
    "rules": {
      "file": "reglas_juegos/pocha.html",
      "url": "https://www.nhfournier.es/como-jugar/pocha/",
      "sha256": "9a016e87ca0805ace96164884092c7a73726a719933ae385fdc5417c8f3a2fdd"
    },
    "summary": "Predecir bazas; dador no puede completar suma total; acertar +10+5 por baza, fallar -5 por diferencia.",
    "implementationNotes": "La fuente admite número variable; empezar por 3–5, con calendario de manos explícito.",
    "phases": [
      "reparto",
      "prevision",
      "baza",
      "recuento"
    ],
    "actions": [
      "predict",
      "play",
      "next-hand"
    ],
    "acceptance": [
      "Petición prohibida al dador",
      "Retirar doses con tres",
      "Manos subida/meseta/bajada",
      "Desempate una carta"
    ]
  },
  {
    "id": "julepe",
    "label": "Julepe",
    "family": "tricks",
    "status": "planned",
    "players": [5,6,7],
    "material": "spanish-40",
    "defaultVariant": "seis-jugadores",
    "rules": {
      "file": "reglas_juegos/julepe.html",
      "url": "https://www.nhfournier.es/como-jugar/julepe/",
      "sha256": "b7aab3c6995fadf36ff582617dc327720966ce20fd2b4ccc109b8567ffe35284"
    },
    "summary": "Cinco cartas; decisión de jugar; hacer al menos dos bazas para evitar julepe.",
    "implementationNotes": "Revisar las condiciones de triunfo, participación y pagos de la fuente antes de implementar.",
    "phases": [
      "reparto",
      "participar",
      "descarte",
      "baza",
      "recuento"
    ],
    "actions": [
      "join",
      "fold",
      "discard",
      "play",
      "next-hand"
    ],
    "acceptance": [
      "Descarte",
      "Dos bazas mínimas",
      "Fondo común en fichas",
      "Obligaciones de triunfo"
    ]
  },
  {
    "id": "guinote",
    "label": "Guiñote",
    "family": "tricks",
    "status": "planned",
    "players": [
      4
    ],
    "material": "spanish-40",
    "defaultVariant": "parejas",
    "rules": {
      "file": "reglas_juegos/guinote.html",
      "url": "https://www.nhfournier.es/como-jugar/guinote/",
      "sha256": "dd2c0bf353aa4154edc5a13da80bd40bc044baf008593cebaebdd0b3c77c09e8"
    },
    "summary": "Parejas de cuatro; reparto completo de diez cartas; sota supera caballo; cantos sota-rey, diez últimas y tute de sotas/reyes; llegar a 101.",
    "implementationNotes": "La fuente aportada reparte toda la baraja, sin baceta. Concretar juegos de la partida; no mezclar con la variante regional de seis cartas.",
    "phases": [
      "reparto",
      "baza",
      "robar",
      "cantar",
      "recuento"
    ],
    "actions": [
      "play",
      "sing",
      "exchange-trump",
      "next-hand"
    ],
    "acceptance": [
      "Asistir, montar y fallar",
      "Cantos",
      "101 y vuelta",
      "Diez últimas"
    ]
  },
  {
    "id": "butifarra",
    "label": "Butifarra",
    "family": "tricks",
    "status": "planned",
    "players": [
      4
    ],
    "material": "spanish-48",
    "defaultVariant": "catalana",
    "rules": {
      "file": "reglas_juegos/butifarra.html",
      "url": "https://www.nhfournier.es/como-jugar/butifarra/",
      "sha256": "30eadd3ffa546202c92d229cc7505a75f5ef9b94c4f4a29609003332f732ab0d"
    },
    "summary": "12 cartas por jugador; nueve más alto; sin triunfo duplica; contrar y recontrar; meta 100.",
    "implementationNotes": "Baraja catalana de 48; no usar jerarquía ni valores de brisca.",
    "phases": [
      "reparto",
      "elegir-triunfo",
      "contra",
      "baza",
      "recuento"
    ],
    "actions": [
      "choose-trump",
      "delegate",
      "double",
      "play",
      "next-hand"
    ],
    "acceptance": [
      "Jerarquía de nueves",
      "Asistir y montar",
      "Delegación",
      "Multiplicadores",
      "Puntuación de bazas"
    ]
  },
  {
    "id": "remigio",
    "label": "Remigio",
    "family": "melds",
    "status": "planned",
    "players": [2,3,4,5,6,7,8,9,10],
    "material": "spanish-poker-54",
    "defaultVariant": "fournier",
    "rules": {
      "file": "reglas_juegos/remigio.html",
      "url": "https://www.nhfournier.es/como-jugar/remigio/",
      "sha256": "b28b157bead606ea319108c15b9c4c6231fafe223b798ac7835da4a819ab53c9"
    },
    "summary": "Diez cartas; combinaciones de iguales y escaleras; figuras 10, as 1, comodín 20.",
    "implementationNotes": "Póker español 52+2 por baraja; confirmar número de barajas y objetivo según participantes.",
    "phases": [
      "robar",
      "descartar",
      "cerrar",
      "recuento"
    ],
    "actions": [
      "draw",
      "discard",
      "close",
      "next-hand"
    ],
    "acceptance": [
      "Cartas duplicadas entre barajas",
      "Comodines",
      "Cierre y penalizaciones"
    ]
  },
  {
    "id": "continental",
    "label": "Continental",
    "family": "melds",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "material": "french-jokers-54",
    "defaultVariant": "siete-manos",
    "rules": {
      "file": "reglas_juegos/continental.html",
      "url": "https://www.nhfournier.es/como-jugar/continental/",
      "sha256": "b1b895bbc2c151d4fa7f0eac9135da057a6a1eeb8fad14f01206a3a17c311e42"
    },
    "summary": "Contratos 6:2 tríos, 7:trío+escalera, 8:2 escaleras, 9:3 tríos, 10:2 tríos+escalera, 11:trío+2 escaleras, 12:3 escaleras.",
    "implementationNotes": "Dos comodines por baraja. Para cuatro: comenzar con dos y terminar con tres barajas. Para cinco a ocho: empezar con dos, añadir una tras mano 2 y otra tras mano 4; ampliación a 16 cartas opcional.",
    "phases": [
      "robar",
      "exponer",
      "colocar",
      "descartar",
      "recuento"
    ],
    "actions": [
      "draw",
      "claim-discard",
      "meld",
      "extend",
      "replace-joker",
      "discard",
      "next-hand"
    ],
    "acceptance": [
      "Castigo por descarte fuera de turno",
      "Prioridad de reclamación",
      "Escalera mínimo cuatro",
      "Comodín reemplazable",
      "Identidades de varias barajas"
    ]
  },
  {
    "id": "siete_y_medio",
    "label": "Siete y medio",
    "family": "banking",
    "status": "planned",
    "players": [
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "material": "spanish-40",
    "defaultVariant": "general",
    "rules": {
      "file": "reglas_juegos/siete_y_medio.html",
      "url": "https://www.ludoteka.com/clasika/siete-y-medio.html",
      "sha256": "22c47266a7a0a495f0b4706dac5b66f324ad3bb068afe8a99939d7edf091d3fd"
    },
    "summary": "Figuras medio punto; una carta oculta por jugador; banca gana empates; siete y medio cobra doble y toma banca.",
    "implementationNotes": "Solo fichas. Acordar capital y fin de sesión; variante de 15/30 manos de Ludoteka separada.",
    "phases": [
      "apostar",
      "pedir",
      "banca",
      "recuento"
    ],
    "actions": [
      "bet",
      "hit",
      "stand",
      "buy-bank",
      "next-hand"
    ],
    "acceptance": [
      "Pasarse",
      "Empate con banca",
      "Carta oculta única",
      "Pago doble",
      "Rotación banca"
    ]
  },
  {
    "id": "burro",
    "label": "Burro",
    "family": "matching",
    "status": "planned",
    "players": [
      3,
      4
    ],
    "material": "spanish-40",
    "defaultVariant": "zacatrus-pdf",
    "rules": {
      "file": "reglas_juegos/burro.pdf",
      "url": "https://zacatrus.s3.eu-west-1.amazonaws.com/doc/baraja/Juego-cartas-Burro.pdf",
      "sha256": "1a9143e40dcf6a61bbdf8a7dbb75116d45693181733cd9a4f29c4e0ead856f5f"
    },
    "summary": "Retirar caballo de bastos; repartir 39; descartar parejas; perder una letra; cinco derrotas completan BURRO.",
    "implementationNotes": "Usar este PDF, no burro de pasar cartas simultáneamente. Definir de forma inequívoca el doble intercambio por turno descrito.",
    "phases": [
      "retirar-carta",
      "parejas",
      "robar",
      "fin-mano"
    ],
    "actions": [
      "draw-hidden",
      "discard-pair",
      "next-hand"
    ],
    "acceptance": [
      "Carta retirada",
      "Robo oculto",
      "Eliminación sin cartas",
      "Cinco letras"
    ]
  },
  {
    "id": "mentiroso",
    "label": "Mentiroso",
    "family": "bluff",
    "status": "planned",
    "players": [
      3,
      4,
      5,
      6
    ],
    "material": "spanish-40",
    "defaultVariant": "zacatrus-pdf",
    "rules": {
      "file": "reglas_juegos/mentiroso.pdf",
      "url": "https://zacatrus.s3.eu-west-1.amazonaws.com/doc/baraja/Juego-cartas-Mentiroso.pdf",
      "sha256": "a817fd9e5c6883ad1c335b3d78c48e1180a1ee2913ed2637eb5bc4dbcecd4a6d"
    },
    "summary": "Ases comodines; cantidad declarada verdadera; valor puede ser falso; desafío recoge montón; pierde último con cartas.",
    "implementationNotes": "El objetivo inicial habla de primero sin cartas, pero el final define último perdedor. Adoptar final explícito del PDF y fijar turno tras desafío.",
    "phases": [
      "declarar",
      "responder",
      "desafio",
      "fin"
    ],
    "actions": [
      "play-facedown",
      "challenge"
    ],
    "acceptance": [
      "As comodín",
      "Desafío verdad/mentira",
      "Ventana tras última carta",
      "Cartas privadas"
    ]
  },
  {
    "id": "domino",
    "label": "Dominó",
    "family": "tiles",
    "status": "planned",
    "players": [
      4
    ],
    "material": "domino-double-six",
    "defaultVariant": "parejas-espanol",
    "rules": {
      "file": "reglas_juegos/domino.html",
      "url": "https://www.ludoteka.com/juegos/domino/reglas",
      "sha256": "28b68f8c6a3aa7b73020069cb3c07001985a3d094519137e2fafa1f702b6da20"
    },
    "summary": "28 fichas, siete por jugador; parejas alternas; salida libre rotatoria; tranca gana pareja con menos puntos; meta 150.",
    "implementationNotes": "Usar parejas español; la fuente contiene otras variantes. Fijar criterio de empate de tranca antes de implementar.",
    "phases": [
      "reparto",
      "colocar",
      "pasar",
      "recuento"
    ],
    "actions": [
      "place",
      "pass",
      "next-hand"
    ],
    "acceptance": [
      "Tranca",
      "Puntos incluyen compañero",
      "Salida rotatoria",
      "Empate de tranca"
    ]
  }
];
export function getGamePlan(id: string): GamePlan {
 const plan = GAME_CATALOG.find(game => game.id === id);
 if (!plan) throw new Error(`Juego sin ficha de reglas: ${id}`);
 return plan;
}
