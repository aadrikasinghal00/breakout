// Tiny synthesised UI sounds — no audio assets, no network. Everything is built from
// a couple of oscillators + an exponential gain ramp, so the whole thing stays under a
// few hundred bytes and never blocks first paint.
//
// Browsers refuse to start an AudioContext before the user has interacted with the page,
// so `ctx()` lazily creates one and every play call resumes it and swallows failures —
// a muted first nudge is always better than an unhandled rejection.

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  _ctx ??= new AC();
  if (_ctx.state === "suspended") void _ctx.resume().catch(() => {});
  return _ctx;
}

/** One short sine blip with a fast attack and an exponential tail. */
function blip(c: AudioContext, at: number, freq: number, peak: number, decay: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  // Attack over 6ms — quick enough to feel tactile, slow enough to avoid a click.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** Badge nudge: a single soft, tactile tick — like a fingernail on glass. */
export function playTick() {
  try {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + 0.01;
    blip(c, t, 880, 0.05, 0.07);
    blip(c, t, 1760, 0.018, 0.045); // faint upper partial → "tick", not "beep"
  } catch {
    /* audio is a nicety; never let it break the UI */
  }
}

/** Notification nudge: a gentle two-note rise, quieter than a system alert. */
export function playChime() {
  try {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + 0.01;
    blip(c, t, 660, 0.045, 0.16);
    blip(c, t + 0.09, 988, 0.04, 0.26);
  } catch {
    /* see above */
  }
}
