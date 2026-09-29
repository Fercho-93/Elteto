# Elteto

Juego de cartas para jugar a Mus y Cinquillo desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas conectadas a la misma red.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages al actualizar `main`.

La web conecta los móviles con WebRTC DataChannels. El anfitrión crea una invitación y enseña un QR; cada invitado lo escanea y devuelve otro QR que escanea el anfitrión. También se pueden copiar los códigos o compartirlos desde el teléfono. El anfitrión conserva la autoridad de la partida y comparte a cada jugador solo su vista de las cartas. No hace falta un servidor de juego.

Para probarlo, abre la página segura de Pages en ambos teléfonos y conéctalos a la misma Wi-Fi o al hotspot de uno de ellos. En un móvil crea la sala; en el otro escanea la invitación. Después, escanea con el anfitrión el QR de respuesta del invitado. La cámara necesita permiso. Si el escaneo no funciona, puedes copiar y pegar el código.

Cinquillo requiere al menos tres participantes y Mus cuatro. Con dos teléfonos puedes comprobar la conexión y la sala; para iniciar una partida completa, añade más participantes desde otros teléfonos o navegadores.

La web se puede instalar desde el navegador con «Añadir a pantalla de inicio».

## Desarrollo web

Requisitos: Node.js 20 o posterior.

```bash
npm ci
npm run build:web
```

El sitio compilado aparece en `dist/`. Para probarlo localmente, sírvelo desde HTTPS o desde `localhost`, porque el navegador restringe WebRTC, el acceso a la cámara y la instalación PWA en orígenes inseguros.

## App móvil nativa

`apps/mobile/` conserva el cliente Expo para las compilaciones móviles nativas. Comparte el motor de reglas con la versión web, en `packages/game-core/`.

## Motor de reglas

`packages/game-core/` contiene los motores puros de Mus y Cinquillo. Cada motor valida las acciones, conserva el estado completo en el anfitrión y produce una vista individual para cada jugador.
