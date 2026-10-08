package es.elteto.lan;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** La decisión se obtiene de Firestore con el ID token del usuario: el servidor
 * comprueba firma, caducidad y reglas. Nunca se acepta un booleano del JavaScript. */
public final class FirebaseLicenseVerifier {
    public static final class Grant {
        public final String uid;
        public final String mode;
        private Grant(String uid, String mode) { this.uid = uid; this.mode = mode; }
    }
    public static boolean allowsLocal(boolean activated, String mode, boolean developmentEnabled) {
        // Releases before public development access did not persist a mode.
        return activated && (!"development".equals(mode) || developmentEnabled);
    }
    public static boolean allowsLocal(boolean activated, String mode, boolean developmentEnabled, boolean openLanAccessEnabled) {
        return openLanAccessEnabled || allowsLocal(activated, mode, developmentEnabled);
    }
    static Grant parseGrant(String uid, String json, boolean developmentEnabled) throws Exception {
        JsonObject fields = JsonParser.parseString(json).getAsJsonObject().getAsJsonObject("fields");
        if (fields == null || !"active".equals(fields.getAsJsonObject("status").get("stringValue").getAsString())) throw new Exception("Esta cuenta no tiene acceso activo.");
        String mode = fields.has("mode") ? fields.getAsJsonObject("mode").get("stringValue").getAsString() : "invitation";
        if (!allowsLocal(true, mode, developmentEnabled)) throw new Exception("El acceso de desarrollo está desactivado.");
        return new Grant(uid, mode);
    }
    public static Grant verify(String token, boolean developmentEnabled) throws Exception {
        if (token == null || token.length() > 10000) throw new Exception("Sesión no válida.");
        String[] parts = token.split("\\.");
        if (parts.length != 3) throw new Exception("Sesión no válida.");
        JsonObject claims = JsonParser.parseString(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)).getAsJsonObject();
        String uid = claims.get("sub").getAsString();
        if (!uid.matches("[A-Za-z0-9_-]{1,128}")) throw new Exception("Sesión no válida.");
        HttpURLConnection connection = (HttpURLConnection) new URL("https://firestore.googleapis.com/v1/projects/elteto-fercho93/databases/(default)/documents/hostAccess/" + uid).openConnection();
        connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        try {
            if (connection.getResponseCode() != 200) throw new Exception("No se pudo verificar la invitación. Comprueba tu conexión y tu acceso.");
            String json;
            try (java.io.InputStream input = connection.getInputStream(); java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                json = new String(output.toByteArray(), StandardCharsets.UTF_8);
            }
            return parseGrant(uid, json, developmentEnabled);
        } finally { connection.disconnect(); }
    }
}
