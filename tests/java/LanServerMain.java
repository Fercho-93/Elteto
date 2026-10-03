import es.elteto.lan.LanServer;
import java.io.File;
/** Desktop runner for testing the same HTTP/WebSocket server used by Android. */
public class LanServerMain {
 public static void main(String[] args)throws Exception {
  LanServer server=new LanServer(new File(args[0]),Integer.parseInt(args[1]));
  server.start(0,false);
  Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
  System.out.println(server.hostUrl());System.out.flush();
  Thread.currentThread().join();
 }
}
