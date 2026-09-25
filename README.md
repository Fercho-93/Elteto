# Elteto

App móvil (React Native / Expo) para jugar a juegos de cartas y de mesa **con amigos, cada uno
desde su propio móvil, sin necesidad de internet**. Los dispositivos se conectan entre sí por
la misma red WiFi o por el hotspot personal de uno de los jugadores; uno hace de anfitrión
(host) y los demás se unen automáticamente a su partida (descubrimiento por broadcast UDP,
sin tener que introducir ninguna IP a mano).

Juegos disponibles de momento:

- **Mus** (4 jugadores, 2 parejas)
- **Cinquillo** (3 a 6 jugadores)

Pensado para ir añadiendo más juegos de cartas y de mesa (parchís, dominó, ...) reutilizando
la misma infraestructura de red y de lobby.

## Estructura

```
packages/game-core/   Motor de reglas puro en TypeScript (sin dependencias de React Native).
                       Aquí viven las reglas de cada juego (mus.ts, cinquillo.ts) y el
                       contrato común GameEngine que deben implementar los juegos futuros.
apps/mobile/           App Expo/React Native.
  src/net/             Protocolo de mensajes, descubrimiento de partidas (UDP) y
                       transporte host/cliente (TCP) sobre la red local.
  src/state/           Contexto de React que expone la sesión de juego a la UI.
  src/app/             Pantallas (Expo Router): inicio, crear sala, unirse, lobby y partida.
  src/components/      UI de cada juego (MusScreen, CinquilloScreen).
```

## Cómo funciona el multijugador local

1. Un jugador pulsa **Crear partida**: su móvil abre un servidor TCP y empieza a anunciar la
   sala por broadcast UDP en la red local.
2. Los demás jugadores pulsan **Unirse a una partida**: su móvil escucha ese broadcast y
   muestra la lista de salas encontradas, sin pedir ninguna IP.
3. Al unirse, cada jugador se conecta por TCP directamente al anfitrión.
4. El anfitrión es la autoridad de la partida: aplica las reglas (`game-core`) a cada jugada y
   reenvía a cada móvil solo la información que le corresponde ver (p. ej. su propia mano).

Esto requiere que todos los móviles estén en la misma red: o bien conectados al mismo WiFi, o
bien todos conectados al hotspot personal que active uno de ellos. No se necesita datos
móviles ni conexión a internet.

## Desarrollo

```bash
npm install            # instala dependencias de todo el workspace (raíz + apps/mobile + packages/game-core)
cd apps/mobile
npx expo start         # sirve la app para probarla con Expo Go / un dev client
```

`react-native-tcp-socket` y `react-native-udp` son módulos nativos: para probar el
multijugador local en un dispositivo real hace falta un **development build**
(`npx expo run:android` / `npx expo run:ios`, o `eas build --profile development`), no
funcionan dentro de Expo Go.

Comprobaciones antes de dar por terminado un cambio:

```bash
cd apps/mobile
npx tsc --noEmit
npx eslint src
```
