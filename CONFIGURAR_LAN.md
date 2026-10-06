# Prueba LAN: Android anfitrión, iPhone y Android invitados

Esta prueba añade una app Android independiente, **Elteto LAN · Prueba**. El anfitrión sirve todos los archivos de la web y un canal WebSocket local. Los invitados abren el enlace desde Safari o Chrome. No utiliza Firebase, STUN/TURN, un servidor externo ni los dos QR de WebRTC.

## Instalar y jugar

1. En GitHub, abre Actions → **Compilar Android LAN** → última ejecución correcta. Descarga el artefacto **Elteto-LAN-Android-prueba**, extrae el ZIP e instala `app-debug.apk` en el Android anfitrión. Es una compilación de prueba, no un lanzamiento de Play Store.
2. Conecta los móviles a una misma Wi-Fi local o activa un hotspot en el Android y conecta los invitados. La red no necesita salida a internet.
3. Abre Elteto LAN en Android. Pulsa **Crear partida**, indica tu nombre y elige Cinquillo (2–6 jugadores) o Mus (4 jugadores) y crea la mesa.
4. El anfitrión muestra un QR con una dirección local HTTP. Escanéalo con la cámara normal del iPhone o Android invitado. Si no abre, escribe una de las direcciones que aparecen arriba en la app anfitriona y utiliza el código de mesa.
5. Espera a que aparezcan ambos jugadores e inicia la partida. Cada invitado recibe solo su mano.

El QR solo funciona dentro de esa red: enviarlo a alguien que está fuera no le da acceso. No abras puertos del router para esta prueba.

## Recuperación y límites de la primera versión

- Mantén la app anfitriona abierta y la pantalla encendida. La app evita el apagado automático, pero esta versión no incorpora un servicio en primer plano ni promete continuar al bloquear el teléfono o cambiar de app.
- Si un invitado pierde la señal, conserva su plaza y se pausa la aceptación de jugadas. Puede volver con el mismo navegador/pestaña: la identidad y la secuencia se guardan en sessionStorage.
- Una pestaña nueva, otro navegador o borrar datos puede perder esa identidad. No hay sustitución de jugador ni abandono automático durante la partida.
- Si el anfitrión cierra la app o sale de la mesa, la partida se cierra. No hay relevo ni persistencia tras reiniciar Android.
- El catálogo habilita Cinquillo (2–6 jugadores) y Mus (exactamente 4). La prueba automática cubre una mesa de Mus con cuatro navegadores; queda por validar físicamente con cuatro móviles.
- Si hay varias interfaces de red (por ejemplo VPN), el QR puede seleccionar una dirección incorrecta. Usa la dirección de la Wi-Fi/hotspot mostrada arriba; si la dirección cambió, vuelve a crear la mesa.
- El transporte de esta prueba es HTTP/WS local sin cifrado. Utiliza una Wi-Fi/hotspot privado.
- Los navegadores invitados cargan la web desde Android, no desde GitHub Pages. Abrir la web pública no inicia un servidor LAN.

## Arquitectura

- `apps/android-host/`: app Android Java, WebView y servidor NanoHTTPD/NanoWSD.
- `LanServer.java`: sirve los archivos empaquetados, autentica al anfitrión únicamente desde loopback y dirige cada mensaje al invitado indicado.
- `apps/web/lan.html`: entrada local sin service worker ni dependencias de internet.
- `apps/web/lan-session.js`: adapta la conexión WebSocket al motor `LocalHostSession` existente, con plaza estable, pausa y confirmación de acciones.
- El motor se ejecuta en el WebView anfitrión. El servidor Java dirige mensajes y no recibe el estado completo de todas las manos en una difusión pública.
- Cada mesa utiliza un código aleatorio. La recuperación del invitado utiliza un token aleatorio de 192 bits que no se incluye en el QR público.
- La clave del anfitrión solo se entrega al WebView local. Los invitados no pueden ocupar su papel.

## Desarrollo y comprobación

Requisitos: Node 22+, JDK 17, Android SDK 35 y Gradle 8.9.

```bash
npm ci
npm run build:web
node tests/lan-session.mjs
bash tests/prepare-lan-java.sh
node tests/lan-servidor.mjs
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/lan-navegador.mjs
gradle -p apps/android-host assembleDebug
```

El flujo `android-lan.yml` realiza estas pruebas y compila el APK. Los recursos web se generan antes de compilar y se incluyen como assets. Las pruebas del servidor usan exactamente la clase Java que ejecuta Android, con dos conexiones WebSocket independientes. La prueba de navegador bloquea los recursos ajenos al servidor local.

La prueba física pendiente debe cubrir Android anfitrión + Safari iPhone, Android anfitrión + Chrome Android, Wi-Fi sin internet, hotspot sin datos, reconexión, y cierre del anfitrión. Los tests automáticos no certifican por sí solos el funcionamiento en cada modelo de móvil.
