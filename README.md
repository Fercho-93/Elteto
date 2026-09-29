# Elteto

Juego de cartas para jugar a Mus y Cinquillo desde móviles, con una mesa gamberra, reglas compartidas y partidas entre personas conectadas a la misma red.

## Aplicación web y GitHub Pages

`apps/web/` contiene la versión web instalable. GitHub Actions compila las reglas compartidas de `packages/game-core/`, genera una web estática y la publica en GitHub Pages al actualizar `main`.

Con internet, el anfitrión crea una sala y la web muestra un enlace QR. Cada invitado lo escanea con la cámara normal del móvil; el enlace abre Elteto y lo mete en la sala. Si el invitado ya había usado Elteto, se recuerda su nombre; también se puede copiar o compartir el enlace.

Firebase Realtime Database pasa únicamente los mensajes temporales necesarios para establecer la conexión WebRTC. Las jugadas y las cartas siguen viajando directamente entre los móviles. El anfitrión conserva la autoridad de la partida y cada jugador recibe solo su vista de las cartas. No hay un servidor de juego.

### Configurar Firebase (solo para el modo con internet)

1. Crea un proyecto Firebase y registra una aplicación web.
2. En Firebase Authentication, activa el proveedor **Anónimo**.
3. Crea una **Realtime Database**.
4. Copia las reglas de `database.rules.json` en la pestaña **Reglas** de esa base de datos y publícalas.
5. Copia los valores de configuración de la aplicación web en `apps/web/firebase-config.js`: `apiKey`, `authDomain`, `databaseURL`, `projectId` y `appId`.
6. Guarda esos cambios en `main`; GitHub Pages publicará el juego configurado.

La configuración web de Firebase es visible desde el navegador. La seguridad depende de las reglas de Realtime Database y del acceso anónimo; no pongas una clave de cuenta de servicio ni credenciales privadas en la web.

Para probarlo, abre [Elteto en GitHub Pages](https://fercho-93.github.io/Elteto/) en ambos teléfonos. Conéctalos a la misma Wi-Fi o al hotspot de uno de ellos. En un móvil crea la partida y muestra el QR; desde la cámara del otro, escanéalo. La cámara abrirá el enlace y el juego comenzará a conectarse. La primera vez, el navegador puede pedir permiso para abrir la página o usar la cámara si escaneas desde dentro de Elteto.

Cinquillo admite de dos a seis participantes. Mus necesita cuatro.

### Jugar sin internet entre iPhone y Android

El modo **Sin internet** no usa Firebase ni un servidor de señalización. La app crea la conexión WebRTC directa e intercambia la oferta y la respuesta mediante dos códigos QR. Este modo está disponible en la web instalable de GitHub Pages para Safari en iPhone y Chrome en Android.

1. Antes de salir de casa, abre [Elteto en Pages](https://fercho-93.github.io/Elteto/) en los dos móviles y espera a que cargue. Instálalo con «Añadir a pantalla de inicio» si quieres; así el navegador guarda la app para abrirla después sin cobertura. Hazlo una vez mientras tengas internet.
2. En el lugar sin cobertura, conecta los dos móviles a la misma Wi‑Fi local. Si no hay router, activa el **punto de acceso Wi‑Fi** de uno de ellos y conecta el otro. La red puede no tener salida a internet.
3. En el móvil anfitrión, abre Elteto, crea la sala, elige el juego y toca **Invitar sin internet**.
4. En el otro móvil, abre Elteto, toca **Unirse**, escribe el nombre y escanea el primer QR con **Abrir cámara dentro de Elteto**. La cámara normal no puede abrir un código SDP sin internet.
5. El invitado verá un segundo QR. El anfitrión lo escanea con **Escanear respuesta**. Al conectar, ambos vuelven a la sala y el anfitrión puede iniciar la partida.

Los dos móviles deben permanecer en la misma red local y dejar Elteto abierto durante la partida. El modo offline de navegador requiere que la app se haya cargado previamente mientras había internet: GitHub Pages no puede entregar por primera vez la app cuando no hay conexión. Cinquillo ya permite jugar con dos personas; Mus sigue necesitando cuatro por sus reglas.

La opción **Invitar con Firebase** conserva el enlace de un solo QR cuando hay internet.

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
