// QR camera reader. Prefer the browser decoder where QR is supported; keep the
// local jsQR decoder for Safari, offline use and native detection failures.
(function () {
  "use strict";
  window.CONTINUUM = window.CONTINUUM || {};
  const CT = window.CONTINUUM;
  let loadingLibrary = null;
  function ensureLibrary() {
    if (typeof jsQR === "function") return Promise.resolve();
    if (loadingLibrary) return loadingLibrary;
    loadingLibrary = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./jsqr.js";
      script.onload = () => typeof jsQR === "function" ? resolve() : reject(new Error("CAMERA_LIBRARY_UNAVAILABLE"));
      script.onerror = () => reject(new Error("CAMERA_LIBRARY_UNAVAILABLE"));
      document.head.appendChild(script);
    }).catch(error => { loadingLibrary = null; throw error; });
    return loadingLibrary;
  }
  function isSupported() { return !!navigator.mediaDevices?.getUserMedia; }
  async function nativeDecoder() {
    if (typeof BarcodeDetector !== "function") return null;
    try {
      if (BarcodeDetector.getSupportedFormats && !(await BarcodeDetector.getSupportedFormats()).includes("qr_code")) return null;
      return new BarcodeDetector({ formats: ["qr_code"] });
    } catch { return null; }
  }

  async function start(videoEl, onFrame, onError, { signal } = {}) {
    if (!isSupported()) throw new Error("CAMERA_UNAVAILABLE");
    let stopped = false, stream = null, frameHandle = null, detector = null, lastScanAt = -Infinity, pass = 0;
    const aborted = () => new DOMException("Camera scan cancelled", "AbortError");
    function stop() {
      if (stopped) return;
      stopped = true;
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      signal?.removeEventListener("abort", stop);
      stream?.getTracks().forEach(track => track.stop());
      if (stream && videoEl.srcObject === stream) { videoEl.pause(); videoEl.srcObject = null; }
    }
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
    try {
      detector = await nativeDecoder();
      if (!detector) await ensureLibrary();
      if (stopped) throw aborted();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
        });
      } catch (error) {
        if (stopped) throw aborted();
        if (error.name !== "OverconstrainedError") throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      }
      // Permissions can resolve after the user has cancelled or opened another scan.
      if (stopped) { stream.getTracks().forEach(track => track.stop()); throw aborted(); }
      const track = stream.getVideoTracks()[0];
      try {
        if (track?.getCapabilities?.().focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      } catch { /* Optional focus controls must not prevent scanning. */ }
      if (stopped) throw aborted();
      videoEl.setAttribute("playsinline", "true");
      videoEl.muted = true;
      videoEl.srcObject = stream;
      await videoEl.play();
      if (stopped) throw aborted();
      const canvas = document.createElement("canvas"), context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("CAMERA_CANVAS_UNAVAILABLE");
      const fallback = () => {
        const width = videoEl.videoWidth, height = videoEl.videoHeight;
        // Alternate a bounded whole frame with a sharper central crop. Full-size
        // multi-megapixel jsQR work can stall a phone's preview and controls.
        const mode = pass++ % 3, crop = mode === 1;
        const sw = crop ? Math.min(width, height) * .75 : width, sh = crop ? sw : height;
        const scale = Math.min(1, (mode === 2 ? 1280 : 960) / Math.max(sw, sh));
        const cw = Math.max(1, Math.round(sw * scale)), ch = Math.max(1, Math.round(sh * scale));
        if (canvas.width !== cw) canvas.width = cw;
        if (canvas.height !== ch) canvas.height = ch;
        context.drawImage(videoEl, (width-sw)/2, (height-sh)/2, sw, sh, 0, 0, cw, ch);
        const data = context.getImageData(0, 0, cw, ch);
        return jsQR(data.data, cw, ch, { inversionAttempts: "attemptBoth" })?.data;
      };
      async function tick(now) {
        if (stopped) return;
        try {
          if (now-lastScanAt >= 180 && videoEl.readyState >= 2 && videoEl.videoWidth && videoEl.videoHeight) {
            lastScanAt = now;
            let value;
            if (detector) {
              try { value = (await detector.detect(videoEl)).find(result => result.rawValue?.trim())?.rawValue; }
              catch { detector = null; }
            }
            if (stopped) return;
            if (!value) { await ensureLibrary(); if (stopped) return; value = fallback(); }
            if (value && !stopped) onFrame(value);
          }
        } catch (error) { if (!stopped) onError?.(error); }
        // Schedule only after decoding finishes: no overlapping native promises.
        if (!stopped) frameHandle = requestAnimationFrame(tick);
      }
      frameHandle = requestAnimationFrame(tick);
      return { stop };
    } catch (error) { stop(); throw error; }
  }
  CT.QrScanner = { isSupported, start };
})();
