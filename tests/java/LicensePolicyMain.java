package es.elteto.lan;

public final class LicensePolicyMain {
    private static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    private static void rejected(String json, boolean developmentEnabled) throws Exception {
        try { FirebaseLicenseVerifier.parseGrant("test-user", json, developmentEnabled); }
        catch (Exception expected) { return; }
        throw new AssertionError("License should have been rejected");
    }
    public static void main(String[] args) throws Exception {
        String normal = "{\"fields\":{\"status\":{\"stringValue\":\"active\"}}}";
        String development = "{\"fields\":{\"status\":{\"stringValue\":\"active\"},\"mode\":{\"stringValue\":\"development\"}}}";
        String revoked = "{\"fields\":{\"status\":{\"stringValue\":\"revoked\"}}}";
        check(FirebaseLicenseVerifier.parseGrant("test-user", normal, false).mode.equals("invitation"));
        check(FirebaseLicenseVerifier.parseGrant("test-user", development, true).mode.equals("development"));
        rejected(development, false);
        rejected(revoked, true);
        check(FirebaseLicenseVerifier.allowsLocal(true, "invitation", false));
        check(FirebaseLicenseVerifier.allowsLocal(true, null, false));
        check(FirebaseLicenseVerifier.allowsLocal(true, "development", true));
        check(!FirebaseLicenseVerifier.allowsLocal(true, "development", false));
        check(!FirebaseLicenseVerifier.allowsLocal(false, "invitation", true));
        System.out.println("Android license: server mode, temporary access withdrawal and legacy offline access: OK");
    }
}
