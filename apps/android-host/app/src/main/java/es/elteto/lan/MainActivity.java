package es.elteto.lan;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.widget.Toast;
import android.os.Bundle;
import android.graphics.Color;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;
import android.provider.Settings;
import java.io.*;
import java.util.List;

public class MainActivity extends Activity {
    private LanServer server;
    private WebView web;
    private TextView addresses;
    private static final int CAMERA_REQUEST = 1001;
    private PermissionRequest pendingCamera;
    private boolean cameraPromptOpen;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);
        addresses=new TextView(this);addresses.setPadding(18,18,18,18);addresses.setTextColor(Color.WHITE);addresses.setBackgroundColor(Color.rgb(33,23,43));
        addresses.setText("Preparando Elteto…");layout.addView(addresses);
        TextView network=new TextView(this);network.setText("Abrir ajustes Wi-Fi / hotspot · Mantén esta app abierta");network.setPadding(18,12,18,12);
        network.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_WIRELESS_SETTINGS)));layout.addView(network);
        web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,String url){return server==null || !"127.0.0.1".equals(android.net.Uri.parse(url).getHost()) || android.net.Uri.parse(url).getPort()!=server.getListeningPort();}});
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> requestCamera(request));
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                runOnUiThread(() -> { if (pendingCamera == request) pendingCamera = null; });
            }
        });
        web.addJavascriptInterface(new ActivationBridge(), "EltetoActivation");
        layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);
        new Thread(()->{
            try {
                File root=new File(getFilesDir(),"web");copyAssets("",root);
                server=new LanServer(root,3000);server.setHostAuthorized(localAccessAllowed());server.start(0,false);
                runOnUiThread(()->{showAddresses();web.loadUrl(server.hostUrl());});
            }catch(Exception e){runOnUiThread(()->addresses.setText("No se pudo iniciar el servidor: "+e.getMessage()));}
        }).start();
    }
    private boolean trustedCameraOrigin(PermissionRequest request) {
        android.net.Uri origin = request.getOrigin();
        return server != null && "http".equals(origin.getScheme())
            && "127.0.0.1".equals(origin.getHost()) && origin.getPort() == server.getListeningPort();
    }
    private void requestCamera(PermissionRequest request) {
        boolean video = java.util.Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
        if (!video || !trustedCameraOrigin(request) || isFinishing() || isDestroyed()) { request.deny(); return; }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); return;
        }
        if (pendingCamera != null) pendingCamera.deny();
        pendingCamera = request;
        if (!cameraPromptOpen) {
            cameraPromptOpen = true;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
        }
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != CAMERA_REQUEST) return;
        cameraPromptOpen = false;
        PermissionRequest request = pendingCamera;
        pendingCamera = null;
        if (request == null) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                && trustedCameraOrigin(request) && !isFinishing() && !isDestroyed()) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            request.deny();
            Toast.makeText(this, "Permite la cámara para escanear QR. Puedes activarla en Ajustes > Aplicaciones > Elteto > Permisos.", Toast.LENGTH_LONG).show();
        }
    }
    private boolean localAccessAllowed() {
        return FirebaseLicenseVerifier.allowsLocal(getPreferences(MODE_PRIVATE).getBoolean("activated",false),
            getPreferences(MODE_PRIVATE).getString("mode","invitation"), BuildConfig.DEVELOPMENT_ADMIN_ENABLED, BuildConfig.OPEN_LAN_ACCESS_ENABLED);
    }
    public class ActivationBridge {
        @JavascriptInterface public boolean isActivated() { return localAccessAllowed(); }
        @JavascriptInterface public boolean isOpenAccess() { return BuildConfig.OPEN_LAN_ACCESS_ENABLED; }
        @JavascriptInterface public String activate(String token) {
            com.google.gson.JsonObject result=new com.google.gson.JsonObject();
            try {
                FirebaseLicenseVerifier.Grant grant=FirebaseLicenseVerifier.verify(token, BuildConfig.DEVELOPMENT_ADMIN_ENABLED);
                getPreferences(MODE_PRIVATE).edit().putBoolean("activated",true).putString("uid",grant.uid).putString("mode",grant.mode).commit();
                server.setHostAuthorized(true);result.addProperty("ok",true);
            } catch(Exception e) { result.addProperty("ok",false);result.addProperty("message","No se pudo verificar el acceso. Comprueba internet y vuelve a entrar."); }
            return result.toString();
        }
        @JavascriptInterface public void deactivate() { getPreferences(MODE_PRIVATE).edit().clear().commit();server.setHostAuthorized(localAccessAllowed()); }
    }
    private void showAddresses(){
        if(server==null)return;
        List<String> ips=LanServer.addresses();
        StringBuilder text=new StringBuilder("Otros móviles: conecta a la misma Wi-Fi o hotspot\n");
        for(String ip:ips)text.append("http://").append(ip).append(":").append(server.getListeningPort()).append("\n");
        if(ips.isEmpty())text.append("Activa el hotspot o conecta a una Wi-Fi local y vuelve aquí.");
        addresses.setText(text.toString().trim());
    }
    @Override protected void onResume(){super.onResume();showAddresses();}
    private void copyAssets(String name,File destination)throws IOException{
        String[] children=getAssets().list(name);
        if(children!=null && children.length>0){destination.mkdirs();for(String child:children)copyAssets(name.isEmpty()?child:name+"/"+child,new File(destination,child));}
        else{destination.getParentFile().mkdirs();try(InputStream in=getAssets().open(name);OutputStream out=new FileOutputStream(destination)){byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);}}
    }
    @Override protected void onDestroy(){if(pendingCamera!=null){pendingCamera.deny();pendingCamera=null;}if(server!=null)server.stop();if(web!=null)web.destroy();super.onDestroy();}
}
