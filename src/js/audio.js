// Web-Audio: Brown Noise als Dauerschleife + Signalton bei Timer-Ablauf.
// Beides komplett generiert, es werden keine Audiodateien mitgeliefert.

let ctx = null;
let noiseSource = null;
let noiseGain = null;
let noiseFilter = null;
let currentVolume = 0.4;

function audioCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Nach der ersten Nutzerinteraktion aufrufen, damit der Kontext laufen darf. */
export function unlockAudio() {
  try {
    audioCtx();
  } catch {
    /* Audio ist optional */
  }
}

// ------------------------------------------------------------- Brown Noise

function createBrownBuffer(context) {
  const seconds = 8;
  const length = context.sampleRate * seconds;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }

  // Naht der Schleife glaetten, sonst knackt es beim Loop-Punkt.
  const fade = Math.floor(context.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] = data[i] * t + data[length - fade + i] * (1 - t);
  }
  return buffer;
}

export function startNoise(volume = currentVolume) {
  currentVolume = volume;
  const context = audioCtx();
  stopNoise();

  noiseSource = context.createBufferSource();
  noiseSource.buffer = createBrownBuffer(context);
  noiseSource.loop = true;

  // Sanfter Tiefpass nimmt die restliche Schaerfe raus.
  noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 1100;

  noiseGain = context.createGain();
  noiseGain.gain.value = 0;

  noiseSource.connect(noiseFilter).connect(noiseGain).connect(context.destination);
  noiseSource.start();
  noiseGain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.6);
}

export function stopNoise() {
  if (!noiseSource) return;
  const source = noiseSource;
  const gain = noiseGain;
  noiseSource = null;
  noiseGain = null;
  noiseFilter = null;
  try {
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
    }
    setTimeout(() => {
      try {
        source.stop();
        source.disconnect();
      } catch {
        /* bereits gestoppt */
      }
    }, 420);
  } catch {
    /* egal */
  }
}

export function setNoiseVolume(volume) {
  currentVolume = volume;
  if (noiseGain && ctx) {
    noiseGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.15);
  }
}

export function isNoisePlaying() {
  return !!noiseSource;
}

// --------------------------------------------------------------- Signalton

/** Ruhiger Dreiklang statt schriller Wecker. */
export function playChime() {
  const context = audioCtx();
  const now = context.currentTime;
  const notes = [
    { freq: 660, at: 0.0 },
    { freq: 880, at: 0.42 },
    { freq: 1174, at: 0.84 },
  ];

  const master = context.createGain();
  master.gain.value = 0.34;
  master.connect(context.destination);

  notes.forEach(({ freq, at }) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const start = now + at;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.5);

    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + 1.6);
  });
}
