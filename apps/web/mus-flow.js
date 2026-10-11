// Only the authority advances published transition states. Revisions make timers idempotent.
const delays = {
  dealing: 1000,
  "cards-dealt": 650,
  redeal: 1000,
  showing: 1600,
  counting: 1300,
};
export class MusFlowRunner {
  constructor(snapshot, apply, onError = () => {}) {
    this.snapshot = snapshot;
    this.apply = apply;
    this.onError = onError;
    this.key = null;
    this.timer = null;
    this.closed = false;
  }
  schedule() {
    const current = this.snapshot(),
      s = current?.state;
    if (
      this.closed ||
      current?.engine?.id !== "mus" ||
      s?.version !== 2 ||
      s.finished ||
      delays[s.phase] === undefined ||
      current.paused
    ) {
      this.cancel();
      return;
    }
    const key = `${s.handNumber}:${s.revision}:${s.phase}`;
    if (this.key === key) return;
    this.cancel();
    this.key = key;
    this.timer = setTimeout(async () => {
      this.timer = null;
      const now = this.snapshot();
      if (this.closed || now?.paused || now?.state?.revision !== s.revision) {
        this.key = null;
        return;
      }
      try {
        await this.apply({ type: "advance", expectedRevision: s.revision });
      } catch (e) {
        this.onError(e);
      } finally {
        this.key = null;
        this.schedule();
      }
    }, delays[s.phase]);
    this.timer.unref?.();
  }
  cancel() {
    clearTimeout(this.timer);
    this.timer = null;
    this.key = null;
  }
  close() {
    this.closed = true;
    this.cancel();
  }
}
