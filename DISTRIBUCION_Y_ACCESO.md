# Distribución y acceso

## Recorrido

«Crear partida» pide una invitación si la cuenta no tiene acceso. Se introduce
correo, contraseña y código. El canje consume la invitación y crea la licencia en
una única transacción. «Ya tengo acceso» recupera esa licencia en otro dispositivo
sin gastar otro código. «Recuperar contraseña» usa Firebase Auth.

Después se puede jugar en web, instalar la PWA en iPhone o descargar la APK desde
la URL configurada en `apps/web/distribution-config.js`. La instalación exige
confirmación del sistema; una web no instala aplicaciones silenciosamente.

Los invitados entran por `guest.html?join=CODIGO` o por el servidor de la APK.
No consumen invitaciones ni crean cuentas con contraseña. Esta entrada no anuncia
manifest ni registra service worker. No permite crear salas ni heredar el rol del
anfitrión. Al cerrar se retiran las cartas y se muestra el fin del acceso.
Las reglas impiden nuevas jugadas y lecturas privadas. Cada nueva mesa LAN cambia
de código. Las salas online caducan como máximo en seis horas sin tareas de pago.

## Firebase y administración

Se reutiliza `elteto-fercho93` con acceso anónimo para invitados y Email/Password
para anfitriones. Publicar `firestore.rules`. El workflow «Preparar invitaciones»
habilita correo/contraseña y genera códigos con la credencial administrativa que
ya usa GitHub. No cambia el plan, activa TTL ni despliega Cloud Functions.
El consumo de partidas online sigue siendo independiente de las activaciones.

- `activationCodes/{sha256}`: estado `unused`/`used`, fechas, UID de canje.
  Solo administración crea invitaciones. Los clientes no pueden listarlas,
  borrarlas ni volver a habilitarlas. El código aleatorio tiene 120 bits; Firebase
  guarda su huella, no el código completo.
- `hostAccess/{uid}`: estado `active`/`revoked`, huella y fecha de canje.
  Solo su dueño lee la licencia. Se crea junto con el consumo del código.
  Revocar una licencia nunca rehabilita su invitación.

Administración local:

```text
npx firebase-tools login
npm run invitaciones -- generate 20
npm run invitaciones -- list
npm run invitaciones -- revoke UID
```

`generate` guarda un CSV en `.private/`, excluido de Git, con códigos y enlaces.
El enlace usa `#activate=…`, que no viaja en la petición HTTP. La aplicación lo
retira de la barra al abrir el formulario. Si se interrumpe una generación, revisar
los códigos registrados antes de repartir el CSV: puede contener el último cuyo
registro falló.

También se puede usar la credencial administrativa existente de GitHub:

```text
npm run invitaciones -- generate 20 --github
```

Los códigos completos permanecen en el CSV local. El workflow recibe solo sus
huellas SHA-256 y las registra en Firebase; no necesita otra clave privada ni
publica archivos con invitaciones. Esperar a que «Preparar invitaciones» termine
correctamente antes de repartirlas. Conservar copias privadas de los códigos y,
cuando se configure, de la firma Android. No subirlos a Git.

## Offline y límites

La APK de distribución se compila con «Publicar Android». Necesita una firma
estable en los secretos `ELTETO_ANDROID_KEYSTORE` (base64) y
`ELTETO_ANDROID_STORE_PASSWORD`. No publicar una URL de descarga hasta que el
workflow haya producido la APK. Una instalación de prueba firmada con otra clave
debe desinstalarse antes de instalar esta versión.

Android verifica la licencia contra Firestore antes de activar el servidor local.
El puente nativo consulta con un ID token que Firebase valida; no acepta un
booleano del JavaScript. La activación se conserva en datos privados de la APK
para abrir mesas sin internet. Desinstalar o borrar datos requiere recuperar la
cuenta con internet. Cerrar sesión desactiva ese Android.

La PWA recuerda el acceso y empaqueta el SDK localmente para abrir mesas directas
tras la primera carga. Un invitado nuevo puede entrar sin internet por Wi-Fi desde
el servidor de la APK. Un anfitrión iPhone/PWA no sirve archivos a otros móviles:
su invitado offline debe haber cargado previamente la página. No se promete una
primera carga sin internet desde GitHub Pages ni una APK para iPhone.

Una licencia offline no puede revocarse inmediatamente sin reconectar. El código
evita una segunda activación; alguien puede entregar su invitación antes de usarla
o compartir sus credenciales. Los archivos web son públicos y el navegador puede
conservarlos o crear un acceso directo. La protección está en los permisos, no en
prohibir la caché. No es DRM frente a quien modifica o recompila la aplicación.

## Pruebas

`npm test`, `npm run test:reglas`, `npm run test:acceso`, `npm run test:online`.
Se prueba el canje simultáneo entre dos cuentas, falsificación de licencias,
caducidad, recuperación y revocación en los emuladores oficiales. Las pruebas LAN
cubren invitación nueva tras el cierre, rechazo del enlace anterior, manos
privadas y recuperación de conexión.
