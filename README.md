# Elteto

Juego de cartas para jugar a Mus y Cinquillo desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas conectadas a la misma red.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages al actualizar `main`.

El anfitrión crea una sala y la web muestra un único QR. Cada invitado lo escanea con la cámara normal del móvil; el enlace abre Elteto y lo mete en la sala. Si el invitado ya había usado Elteto, se recuerda su nombre; si no, entra como «Invitado» y puede escribir su nombre pegando el enlace en la pantalla de unión. También se puede copiar o compartir el enlace.

Firebase Realtime Database pasa únicamente los mensajes temporales necesarios para establecer la conexión WebRTC. Las jugadas y las cartas siguen viajando directamente entre los móviles. El anfitrión conserva la autoridad de la partida y cada jugador recibe solo su vista de las cartas. No hay un servidor de juego.

### Configurar Firebase (necesario para crear y unirse a salas)

1. Crea un proyecto Firebase y registra una aplicación web.
2. En Firebase Authentication, activa el proveedor **Anónimo**.
3. Crea una **Realtime Database**.
4. Copia las reglas de `database.rules.json` en la pestaña **Reglas** de esa base de datos y publícalas.
5. Copia los valores de configuración de la aplicación web en `apps/web/firebase-config.js`: `apiKey`, `authDomain`, `databaseURL`, `projectId` y `appId`.
6. Guarda esos cambios en `main`; GitHub Pages publicará el juego configurado.

La configuración web de Firebase es visible desde el navegador. La seguridad depende de las reglas de Realtime Database y del acceso anónimo; no pongas una clave de cuenta de servicio ni credenciales privadas en la web.

Para probarlo, abre [Elteto en GitHub Pages](https://fercho-93.github.io/Elteto/) en ambos teléfonos. Conéctalos a la misma Wi-Fi o al hotspot de uno de ellos. En un móvil crea la partida y muestra el QR; desde la cámara del otro, escanéalo. La cámara abrirá el enlace y el juego comenzará a conectarse. La primera vez, el navegador puede pedir permiso para abrir la página o usar la cámara si escaneas desde dentro de Elteto.

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
