const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SIGNAL_VERSION = 1;

function encodeBase64Url(value) {
  const bytes = encoder.encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const result = JSON.parse(decoder.decode(bytes));
  if (!result || result.v !== SIGNAL_VERSION || typeof result.sdp !== "string" || !["offer", "answer"].includes(result.type)) {
    throw new Error("Ese código de conexión no es válido.");
  }
  return result;
}

function waitForIce(peer) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", changed);
      reject(new Error("La red tardó demasiado en preparar la conexión. Inténtalo otra vez."));
    }, 12000);
    function changed() {
      if (peer.iceGatheringState !== "complete") return;
      clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", changed);
      resolve();
    }
    peer.addEventListener("icegatheringstatechange", changed);
  });
}

function createPeer() {
  if (typeof RTCPeerConnection === "undefined") throw new Error("Este navegador no admite conexiones directas. Actualiza el navegador e inténtalo otra vez.");
  // Igual que Continuum: señalización por código, canales de datos directos y sin
  // depender de un servidor de juego ni de un servicio STUN/TURN.
  return new RTCPeerConnection({ iceServers: [] });
}

export function encodeSignal(peerId, description) {
  return encodeBase64Url({ v: SIGNAL_VERSION, peerId, type: description.type, sdp: description.sdp });
}

export function decodeSignal(code) {
  return decodeBase64Url(String(code || "").trim());
}

export async function makeOffer(onMessage, onOpen, onClose) {
  const peer = createPeer();
  const channel = peer.createDataChannel("elteto", { ordered: true });
  let ready = false;
  let closing = false;
  channel.addEventListener("open", () => { ready = true; onOpen?.(); });
  channel.addEventListener("close", () => {
    const hadBeenReady = ready;
    ready = false;
    if (hadBeenReady && !closing) onClose?.();
  });
  channel.addEventListener("message", (event) => {
    try { onMessage(JSON.parse(event.data)); } catch { /* mensaje mal formado */ }
  });

  const peerId = crypto.randomUUID();
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await waitForIce(peer);
  const code = encodeSignal(peerId, peer.localDescription);
  return {
    peerId,
    code,
    acceptAnswer: async (answerCode) => {
      const answer = decodeSignal(answerCode);
      if (answer.type !== "answer" || answer.peerId !== peerId) throw new Error("Esa respuesta pertenece a otra invitación.");
      await peer.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
    },
    send: (message) => {
      if (channel.readyState !== "open") return false;
      channel.send(JSON.stringify(message));
      return true;
    },
    close: () => {
      closing = true;
      try { channel.close(); } catch {}
      try { peer.close(); } catch {}
    },
  };
}

export async function acceptOffer(offerCode, onMessage, onOpen, onClose) {
  const offer = decodeSignal(offerCode);
  if (offer.type !== "offer") throw new Error("Pega primero el código de invitación del anfitrión.");
  const peer = createPeer();
  let channel = null;
  let ready = false;
  let closing = false;
  peer.addEventListener("datachannel", (event) => {
    channel = event.channel;
    channel.addEventListener("open", () => { ready = true; onOpen?.(); });
    channel.addEventListener("close", () => {
      const hadBeenReady = ready;
      ready = false;
      if (hadBeenReady && !closing) onClose?.();
    });
    channel.addEventListener("message", (messageEvent) => {
      try { onMessage(JSON.parse(messageEvent.data)); } catch { /* mensaje mal formado */ }
    });
  });
  await peer.setRemoteDescription({ type: offer.type, sdp: offer.sdp });
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  await waitForIce(peer);
  return {
    answerCode: encodeSignal(offer.peerId, peer.localDescription),
    send: (message) => {
      if (!ready || !channel || channel.readyState !== "open") return false;
      channel.send(JSON.stringify(message));
      return true;
    },
    close: () => {
      closing = true;
      try { channel?.close(); } catch {}
      try { peer.close(); } catch {}
    },
  };
}
