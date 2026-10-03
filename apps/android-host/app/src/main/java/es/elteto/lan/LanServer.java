package es.elteto.lan;

import fi.iki.elonen.NanoWSD;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.*;
import java.net.*;
import java.security.SecureRandom;
import java.util.*;

/** One local table. Only the loopback WebView can become the authoritative host.
 * Guests receive messages addressed to their own socket, never the whole state. */
public class LanServer extends NanoWSD {
    private final File root;
    private final String hostKey = UUID.randomUUID().toString();
    private final String roomCode;
    private final Map<String, Peer> guests = new HashMap<>();
    private final Map<String, String> guestIds = new HashMap<>();
    private Peer host;
    public LanServer(File root, int port) {
        super("0.0.0.0", port);
        this.root = root;
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i=0;i<8;i++) code.append(alphabet.charAt(random.nextInt(alphabet.length())));
        roomCode = code.toString();
    }
    public String hostUrl() { return "http://127.0.0.1:" + getListeningPort() + "/#host=" + hostKey; }
    public static List<String> addresses() {
        List<String> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface network = interfaces.nextElement();
                if (!network.isUp() || network.isLoopback()) continue;
                for (InetAddress address : Collections.list(network.getInetAddresses())) {
                    if (address instanceof Inet4Address && address.isSiteLocalAddress()) result.add(address.getHostAddress());
                }
            }
        } catch (SocketException ignored) {}
        return result;
    }
    @Override protected Response serveHttp(IHTTPSession session) {
        if (session.getMethod() != Method.GET) return newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "GET only");
        String uri = session.getUri();
        if (uri.equals("/lan-config")) {
            JsonObject config = new JsonObject();
            config.addProperty("roomCode", roomCode);
            List<String> ips = addresses();
            String ip = ips.isEmpty() ? "127.0.0.1" : ips.get(0);
            // A guest always uses the actual address it opened. A host chooses its
            // LAN interface in the Android address bar if several are present.
            String authority = session.getHeaders().get("host");
            String base = session.getRemoteIpAddress().equals("127.0.0.1") ? ip + ":" + getListeningPort() : authority;
            config.addProperty("inviteBase", "http://" + base);
            Response response = newFixedLengthResponse(Response.Status.OK,"application/json",config.toString());
            response.addHeader("Cache-Control","no-store"); return response;
        }
        if (uri.equals("/")) uri = "/lan.html";
        try {
            File file = new File(root, uri.substring(1)).getCanonicalFile();
            if (!file.toPath().startsWith(root.getCanonicalFile().toPath()) || !file.isFile()) return newFixedLengthResponse(Response.Status.NOT_FOUND,"text/plain","No encontrado");
            String name = file.getName();
            String mime = name.endsWith(".js") ? "text/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
            Response response = newFixedLengthResponse(Response.Status.OK,mime,new FileInputStream(file),file.length());
            response.addHeader("Cache-Control","no-store"); return response;
        } catch (IOException e) { return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,"text/plain","Error al cargar el juego"); }
    }
    @Override protected WebSocket openWebSocket(IHTTPSession session) { return new Peer(session); }
    private static JsonObject packet(String type) { JsonObject result=new JsonObject(); result.addProperty("type",type); return result; }
    private class Peer extends WebSocket {
        private final boolean wantsHost;
        private final boolean valid;
        private final String id;
        Peer(IHTTPSession session) {
            super(session);
            wantsHost = session.getParms().containsKey("host");
            String resume=session.getParms().getOrDefault("resume", "");
            valid = session.getUri().equals("/socket") && (wantsHost
                ? session.getRemoteIpAddress().equals("127.0.0.1") && hostKey.equals(session.getParms().get("host"))
                : roomCode.equals(session.getParms().get("code")) && resume.matches("[a-f0-9]{48}"));
            synchronized (LanServer.this) {
                // Keep the private recovery token separate from the public player id.
                id = valid && !wantsHost ? guestIds.computeIfAbsent(resume, key -> UUID.randomUUID().toString()) : "";
            }
        }
        void transmit(JsonObject value) { try { send(value.toString()); } catch (IOException e) { terminate(); } }
        void fatal(String message) { JsonObject p=packet("fatal");p.addProperty("message",message);transmit(p);terminate(); }
        void terminate() { try { close(WebSocketFrame.CloseCode.NormalClosure,"Mesa cerrada",false); } catch(IOException ignored){} }
        @Override protected void onOpen() {
            synchronized(LanServer.this) {
                if (!valid) { fatal("Invitación local no válida.");return; }
                if (wantsHost) {
                    if (host!=null) { fatal("Ya hay un anfitrión conectado.");return; }
                    host=this;
                } else {
                    if (host==null) { fatal("El anfitrión aún no ha abierto la mesa.");return; }
                    if (guests.size()>=5 && !guests.containsKey(id)) { fatal("La mesa está completa.");return; }
                    Peer old=guests.put(id,this);
                    if(old!=null && old!=this)old.terminate();
                }
                transmit(packet("connected"));
            }
        }
        @Override protected void onMessage(WebSocketFrame frame) {
            synchronized(LanServer.this) {
                if(!valid || (wantsHost ? host!=this : guests.get(id)!=this))return;
                try {
                    String text=frame.getTextPayload();
                    if(text.length()>150000){fatal("Mensaje demasiado grande.");return;}
                    JsonObject data=JsonParser.parseString(text).getAsJsonObject();
                    if(wantsHost) {
                        Peer target=guests.get(data.get("target").getAsString());
                        if(target!=null) {
                            if(data.has("close")){target.fatal("Has salido de esta mesa.");}
                            else target.transmit(data.getAsJsonObject("message"));
                        }
                    } else if(host!=null) {
                        JsonObject envelope=packet("guest-message");
                        envelope.addProperty("playerId",id);envelope.add("message",data);host.transmit(envelope);
                    }
                }catch(RuntimeException ignored){}
            }
        }
        @Override protected void onClose(WebSocketFrame.CloseCode code,String reason,boolean remote) {
            synchronized(LanServer.this) {
                if(host==this) {
                    host=null;
                    List<Peer> remaining=new ArrayList<>(guests.values());guests.clear();guestIds.clear();
                    for(Peer peer:remaining)peer.fatal("El anfitrión ha cerrado la mesa. Abre una nueva partida.");
                } else if(guests.get(id)==this) {
                    guests.remove(id);
                    if(host!=null){JsonObject p=packet("guest-left");p.addProperty("playerId",id);host.transmit(p);}
                }
            }
        }
        @Override protected void onPong(WebSocketFrame frame) {}
        @Override protected void onException(IOException error) { terminate(); }
    }
}
