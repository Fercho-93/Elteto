package es.elteto.lan;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);
        addresses=new TextView(this);addresses.setPadding(18,18,18,18);addresses.setTextColor(Color.WHITE);addresses.setBackgroundColor(Color.rgb(33,23,43));
        addresses.setText("Preparando Elteto…");layout.addView(addresses);
        TextView network=new TextView(this);network.setText("Abrir ajustes Wi-Fi / hotspot · Mantén esta app abierta");network.setPadding(18,12,18,12);
        network.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_WIRELESS_SETTINGS)));layout.addView(network);
        web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
        web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,String url){return !url.startsWith("http://127.0.0.1:");}});
        layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);
        new Thread(()->{
            try {
                File root=new File(getFilesDir(),"web");copyAssets("",root);
                server=new LanServer(root,3000);server.start(0,false);
                runOnUiThread(()->{showAddresses();web.loadUrl(server.hostUrl());});
            }catch(Exception e){runOnUiThread(()->addresses.setText("No se pudo iniciar el servidor: "+e.getMessage()));}
        }).start();
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
    @Override protected void onDestroy(){if(server!=null)server.stop();if(web!=null)web.destroy();super.onDestroy();}
}
