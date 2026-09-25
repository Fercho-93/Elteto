import dgram from "react-native-udp";
import { Buffer } from "buffer";
import { DISCOVERY_MAGIC, DISCOVERY_PORT, HostAnnouncement } from "./protocol";

/**
 * Descubrimiento de partidas en la red local (misma WiFi o hotspot de uno de los móviles):
 * el host emite un broadcast UDP con sus datos cada segundo; los demás móviles escuchan
 * ese mismo puerto y muestran las partidas encontradas, sin que nadie tenga que teclear
 * ninguna IP a mano.
 */

export function startHostAnnouncer(getAnnouncement: () => HostAnnouncement): () => void {
  const socket = dgram.createSocket({ type: "udp4" });
  let interval: ReturnType<typeof setInterval> | null = null;

  socket.bind(0, undefined, () => {
    socket.setBroadcast(true);
    const send = () => {
      const payload = Buffer.from(JSON.stringify(getAnnouncement()), "utf8");
      socket.send(payload, 0, payload.length, DISCOVERY_PORT, "255.255.255.255", (err) => {
        if (err) console.warn("No se pudo enviar el anuncio de host:", err);
      });
    };
    send();
    interval = setInterval(send, 1000);
  });

  return () => {
    if (interval) clearInterval(interval);
    try {
      socket.close();
    } catch {
      // ya cerrado
    }
  };
}

export type DiscoveredHost = HostAnnouncement & { address: string; lastSeenAt: number };

export function startHostScanner(onUpdate: (hosts: DiscoveredHost[]) => void): () => void {
  const socket = dgram.createSocket({ type: "udp4" });
  const hosts = new Map<string, DiscoveredHost>();

  const prune = () => {
    const now = Date.now();
    let changed = false;
    for (const [key, host] of hosts) {
      if (now - host.lastSeenAt > 4000) {
        hosts.delete(key);
        changed = true;
      }
    }
    if (changed) onUpdate(Array.from(hosts.values()));
  };

  // `react-native-udp` reexporta el paquete "events" sin tipos propios, así que TS no
  // conoce los métodos heredados de EventEmitter (on/emit/...): se accede vía `any`.
  (socket as any).on("message", (msg: Uint8Array, rinfo: { address: string }) => {
    try {
      const data = JSON.parse(msg.toString()) as HostAnnouncement;
      if (data.magic !== DISCOVERY_MAGIC) return;
      const key = `${rinfo.address}:${data.port}`;
      hosts.set(key, { ...data, address: rinfo.address, lastSeenAt: Date.now() });
      onUpdate(Array.from(hosts.values()));
    } catch {
      // paquete ajeno o corrupto, se ignora
    }
  });

  socket.bind(DISCOVERY_PORT, undefined, () => {
    socket.setBroadcast(true);
  });

  const interval = setInterval(prune, 1000);

  return () => {
    clearInterval(interval);
    try {
      socket.close();
    } catch {
      // ya cerrado
    }
  };
}
