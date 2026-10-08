// Solo se configura una URL cuando existe una APK firmada y publicada.
// No se entregan enlaces rotos ni claves privadas dentro de la web.
// Acceso local abierto temporalmente para las pruebas. Android lee este valor
// al compilar; no se acepta una autorización enviada por un navegador invitado.
export const distributionConfig = { openLanAccessEnabled: true, developmentAdminEnabled: true, androidDownloadUrl: 'https://github.com/Fercho-93/Elteto/releases/download/android-v0.2.0/Elteto.apk' };
