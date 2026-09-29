# Elteto

Juego de cartas para jugar a Mus y Cinquillo desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas conectadas a la misma red.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages cuando se actualiza `main`.

La web conecta los móviles con WebRTC DataChannels. El anfitrión crea una invitación; cada invitado devuelve un código de respuesta. El anfitrión conserva la autoridad de la partida y comparte a cada jugador solo su vista de las cartas. Los códigos se pueden copiar o pasar con la hoja de compartir del teléfono. La web no usa un servidor de juego ni necesita enviar las jugadas a internet.

Para probar partidas locales, abrid la página segura de Pages en ambos teléfonos y conectadlos a la misma Wi-Fi o al hotspot de uno de ellos. Un jugador crea la sala y comparte el código de invitación. Cada invitado pega ese código, comparte su respuesta con el anfitrión y espera a que aparezca en la mesa.

Los juegos exigen al menos tres participantes para Cinquillo y cuatro para Mus. Con dos teléfonos puedes confirmar la conexión y ver cómo se actualiza la sala; para empezar una partida completa, añade participantes desde más teléfonos o navegadores.

La aplicación web también se puede instalar desde el navegador usando «Añadir a pantalla de inicio».

## Desarrollo web

Requisitos: Node.js 20 o posterior.

```bash
npm ci
npm run build:web
```

El sitio compilado aparece en `dist/`. Para probarlo en el navegador durante el desarrollo, sírvelo desde un origen HTTPS o desde `localhost`, porque el navegador restringe WebRTC y la instalación PWA en orígenes inseguros.

## App móvil nativa

`apps/mobile/` conserva el cliente Expo para las compilaciones móviles nativas. Comparte el motor de reglas con la versión web. Para usar módulos nativos, instala un development build propio; Expo Go no los incluye todos.

## Motor de reglas

`packages/game-core/` contiene los motores puros de Mus y Cinquillo. Cada motor valida las acciones, conserva el estado completo en el anfitrión y produce una vista individual para cada jugador.
