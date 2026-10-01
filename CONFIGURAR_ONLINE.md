# Cómo funciona el juego online y cómo configurarlo

Las salas con internet de Elteto siguen el mismo modelo que las de Timeline (Continuum):
**salas en Firestore, invitados anónimos de Firebase Authentication, reglas de seguridad,
latido de presencia y relevo del anfitrión**. La diferencia la imponen las cartas ocultas
del Mus y el Cinquillo: en Timeline todo el documento de la sala viaja a cada móvil; aquí
las manos y el mazo no salen nunca del anfitrión salvo en la vista privada de cada persona.

El modo **Sin internet** (QR + WebRTC en la misma Wi-Fi) no usa Firebase y sigue como estaba.

## Arquitectura

```
 móvil invitado                    Firestore                      móvil anfitrión
 ──────────────                    ─────────                      ───────────────
 escribe su jugada ──► rooms/{código}/actions/{uid} ──────────────► la lee y la valida
                                                                    con el motor de reglas
 lee su vista      ◄── rooms/{código}/views/{uid}   ◄────────────── escribe una vista por
                                                                    persona (solo su mano)
                       rooms/{código}/secret/state  ◄────────────── guarda el estado completo
                       rooms/{código}               ◄──► jugadores, fase, anfitrión
                       rooms/{código}/presence/{uid} ◄─ latido de cada móvil cada 45 s
```

- **El anfitrión es la autoridad de las reglas del juego**, igual que en el modo directo:
  tiene el estado completo (`packages/game-core`), valida cada jugada con el motor y publica
  la vista redactada de cada persona (`engine.view(state, uid)`).
- **Cada jugada es un documento por persona** (`actions/{uid}`) con un `seq` que sube de uno
  en uno; el anfitrión procesa lo que supere el último `seq` confirmado (`ack`). Si el motor
  rechaza la jugada, el motivo llega en `views/{uid}.error` y el cliente lo muestra.
- **Cada confirmación es un lote atómico**: estado secreto + vistas de todos + subida de
  `version` y `updatedAt` de la sala. Así el estado guardado y lo que ve cada móvil nunca
  se desfasan.
- **Relevo del anfitrión**: si su latido lleva 90 s sin renovarse (15 s si tiene la pantalla
  en segundo plano), la primera persona de la mesa que sigue conectada toma el relevo con una
  transacción. Como `secret/state` solo lo lee quien figura como anfitrión, el nuevo lo
  recupera y continúa la partida donde quedó. Los umbrales son los mismos en el cliente
  (`online-room.js`) y en las reglas (`hostStale()`).
- **Invitados anónimos**: no hay cuentas ni correo. Firebase conserva el UID en el navegador.
- **Invitación**: código de ocho caracteres (`ABCD2345`, sin I ni O), enlace `?join=CÓDIGO` y
  QR del enlace. Se puede entrar con cualquiera de los tres.

### Colecciones

| Ruta | Quién escribe | Quién lee | Contenido |
| --- | --- | --- | --- |
| `rooms/{código}` | anfitrión; cada persona al entrar o salir | cualquiera en el vestíbulo; solo participantes después | `gameId`, `roomName`, `hostUid`, `status` (`lobby`/`playing`/`ended`), `version`, `minPlayers`, `maxPlayers`, `playerOrder`, `players`, `createdAt`, `updatedAt` |
| `rooms/{código}/presence/{uid}` | su dueño | participantes | `seenAt` (hora del servidor), `visible` |
| `rooms/{código}/actions/{uid}` | su dueño, con la sala en juego | el anfitrión y su dueño | `seq`, `json` (≤ 2000), `at` |
| `rooms/{código}/views/{uid}` | el anfitrión | su dueño y el anfitrión | `rev`, `json` (vista), `ack`, `error`, `at` |
| `rooms/{código}/secret/state` | el anfitrión | el anfitrión | `rev`, `json` (estado completo), `acks`, `at` |
| `roomCreation/{uid}` | su dueño, junto con la sala | su dueño | `lastCreatedAt`, `roomCode` (cuota: una sala cada 30 s) |

Las vistas y el estado se guardan como texto JSON porque Firestore no admite arrays dentro
de arrays y los motores no están obligados a evitarlos.

## Qué validan las reglas (`firestore.rules`)

Cada escritura entra por una sola rama, según lo que intente cambiar: **crear** (con su
registro de cuota), **entrar**, **marcharse del vestíbulo**, **expulsar** (solo el
anfitrión, en el vestíbulo), **empezar**, **confirmar jugada** (solo sube la versión),
**cerrar** y **tomar el relevo**. Se comprueba quién escribe, en qué fase está la sala,
qué campos toca, que la versión sube de uno en uno y que `updatedAt` es la hora del servidor.

Lo que **no** pueden comprobar, y por qué:

- **Que una jugada sea legal.** Los motores de Mus y Cinquillo viven en el cliente, así que
  la legalidad la decide el anfitrión. Un anfitrión con el navegador manipulado podría
  falsear la partida; para un juego entre amistades no compensa un servidor autoritativo.
- **Que el anfitrión no mire las manos**: tiene el estado completo por diseño.

Sí garantizan que ninguna otra persona lee manos ajenas ni el mazo (`views` y `secret` están
cerrados), que nadie juega por otro (`actions/{uid}`), que una partida en marcha solo la ven
sus participantes y que no se crean salas en ráfaga.

## Configuración en Firebase (proyecto `elteto-fercho93`)

1. **Authentication → Método de acceso**: habilita **Anónimo**. No hacen falta más proveedores.
2. **Authentication → Configuración → Dominios autorizados**: añade `fercho-93.github.io`.
3. **Firestore Database**: crea la base de datos (modo producción) en una región europea.
4. **Publica las reglas** (una sola vez; añadir juegos no obliga a republicarlas):
   - desde la consola, pestaña **Reglas**: pega el contenido de `firestore.rules` y publica; o
   - con la CLI: `npx firebase deploy --only firestore:rules --project elteto-fercho93`; o
   - con el flujo `.github/workflows/reglas-firestore.yml`, que pasa antes las pruebas de las
     reglas. Necesita el secreto `FIREBASE_SERVICE_ACCOUNT` (Configuración del proyecto →
     Cuentas de servicio → Generar nueva clave privada, pegada entera en Settings → Secrets
     and variables → Actions del repositorio).
5. **Valores del cliente**: `apps/web/firebase-config.js` (`apiKey`, `authDomain`,
   `projectId`, `appId`). Es configuración pública, no una credencial: la seguridad la dan
   las reglas y la autenticación. No pongas ahí una clave de cuenta de servicio.
6. Sube los cambios a `main`: GitHub Pages publica la web.

La base Realtime Database que usaba la señalización anterior ya no se utiliza y puede
dejarse sin reglas o eliminarse.

### Limpieza de salas antiguas (TTL)

Objetivo: siete días desde la última actividad. Firestore no borra las subcolecciones al
borrar una sala, así que cada colección necesita su propia política TTL (Firestore →
**Datos → Políticas TTL**), con **siete días de desplazamiento explícito** (con
desplazamiento cero vencen al instante):

| Grupo de colecciones | Campo |
| --- | --- |
| `rooms` | `updatedAt` |
| `presence` | `seenAt` |
| `actions` | `at` |
| `views` | `at` |
| `secret` | `at` |
| `roomCreation` | `lastCreatedAt` |

Pruébalo primero en un proyecto de ensayo: la eliminación es asíncrona y genera operaciones
facturables. Referencia: https://firebase.google.com/docs/firestore/ttl

### Costes y abuso

Mantén el plan **Spark** mientras sea posible y configura alertas de presupuesto: una alerta
avisa, no corta el gasto. Cada jugada confirmada cuesta una escritura por jugador más tres
(estado, sala y la propia jugada). La cuota de una sala cada 30 s por UID no limita lecturas
ni impide crear otra identidad anónima: obsérvala en las métricas antes de abrir el acceso.

## Probar

```bash
npm ci
npm test                 # compila el motor y comprueba códigos e invitaciones
npm run test:reglas      # reglas de Firestore contra el emulador (necesita Java)
npm run test:online      # sesiones reales (host, invitados, relevo) contra Auth + Firestore
```

`tests/online-navegador.mjs` recorre la interfaz con dos móviles en Chromium (necesita
Playwright; ver su cabecera). Las pruebas de integración cargan el SDK de Firebase desde
`node_modules` en lugar de gstatic (`tests/cdn-loader.mjs`).

Prueba final a mano, con dos móviles reales: crear sala → entrar con el QR → empezar →
jugar un turno → poner el móvil del anfitrión en segundo plano un minuto y comprobar el
relevo → cerrar la sala.

## Dónde está cada cosa

| Archivo | Papel |
| --- | --- |
| `apps/web/firebase-client.js` | Conexión única a Firebase y acceso anónimo (long-polling automático en iOS). |
| `apps/web/online-room.js` | Sesión de sala: crear, entrar, anfitrión, jugadas, presencia, relevo, salir. |
| `apps/web/room-code.js` | Códigos de sala e invitaciones (sin dependencias, cargado al arrancar). |
| `apps/web/local-session.js` | Modo sin internet (WebRTC por QR), independiente de Firebase. |
| `firestore.rules`, `firebase.json`, `.firebaserc` | Reglas, emuladores y proyecto por defecto. |
| `packages/game-core/` | Motores de reglas; el anfitrión los ejecuta. |
