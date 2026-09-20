/**
 * A synthesised "moo".
 *
 * Generated with the Web Audio API rather than shipped as an audio file: it
 * costs no bytes, needs no licence, and works offline. A moo is essentially a
 * low buzzy tone whose pitch rises then falls, shaped by two vocal-tract
 * resonances — a sawtooth through a pair of bandpass filters gets close.
 */

let ctx: AudioContext | null = null;
/** Timestamp of the last moo, so rapid clicks don't stack into a drone. */
let lastMooAt = 0;

const MIN_GAP_MS = 350;

/**
 * Browsers block audio until the user interacts, so the context is created on
 * the first click rather than at import time — and resumed if the browser
 * suspended it in the meantime.
 */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** True if the moo actually played. */
export function moo(): boolean {
  const now = Date.now();
  if (now - lastMooAt < MIN_GAP_MS) return false;

  const audio = getContext();
  if (!audio) return false;
  lastMooAt = now;

  const t = audio.currentTime;
  const duration = 1.15;

  // Source: a sawtooth is rich in harmonics, which is what makes it read as a
  // voice rather than a beep.
  const osc = audio.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(132, t);
  osc.frequency.linearRampToValueAtTime(178, t + 0.22);
  osc.frequency.setValueAtTime(178, t + 0.55);
  osc.frequency.linearRampToValueAtTime(116, t + duration);

  // A little wobble keeps it from sounding like a synth pad.
  const vibrato = audio.createOscillator();
  vibrato.frequency.value = 5.5;
  const vibratoDepth = audio.createGain();
  vibratoDepth.gain.value = 4.5;
  vibrato.connect(vibratoDepth).connect(osc.frequency);

  // Two resonances standing in for a vocal tract.
  const formant1 = audio.createBiquadFilter();
  formant1.type = 'bandpass';
  formant1.frequency.value = 620;
  formant1.Q.value = 5;

  const formant2 = audio.createBiquadFilter();
  formant2.type = 'bandpass';
  formant2.frequency.value = 1080;
  formant2.Q.value = 7;
  const formant2Gain = audio.createGain();
  formant2Gain.gain.value = 0.55;

  // Roll off the fizz above the formants.
  const tone = audio.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;

  // The mouth opens and closes: soft in, fuller middle, tapered release.
  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.22, t + 0.09);
  env.gain.linearRampToValueAtTime(0.3, t + 0.45);
  env.gain.linearRampToValueAtTime(0.24, t + 0.75);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  // The bandpass pair throws away most of the level (measured peak 0.12), so
  // make it up on the way out. Keeps the peak around 0.35 — audible without
  // being startling, and comfortably clear of clipping.
  const output = audio.createGain();
  output.gain.value = 3;

  osc.connect(formant1);
  osc.connect(formant2);
  formant1.connect(tone);
  formant2.connect(formant2Gain).connect(tone);
  tone.connect(env).connect(output).connect(audio.destination);

  osc.start(t);
  vibrato.start(t);
  osc.stop(t + duration + 0.05);
  vibrato.stop(t + duration + 0.05);

  // Let the nodes go once they've finished.
  osc.onended = () => {
    osc.disconnect();
    vibrato.disconnect();
    vibratoDepth.disconnect();
    formant1.disconnect();
    formant2.disconnect();
    formant2Gain.disconnect();
    tone.disconnect();
    env.disconnect();
    output.disconnect();
  };

  return true;
}

/** Duration of one moo, in ms — used to time the speech bubble. */
export const MOO_MS = 1200;
