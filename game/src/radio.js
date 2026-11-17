// Procedural WebAudio: two radio stations (pentatonic plucks), engine hum,
// siren, gunshots, horn, and jingles. Silent until the first user gesture.
import { RADIO } from './config.js';

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const PATTERNS = [
  [0, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, 2, 4],
  [7, 4, 2, 0, 2, 4, 7, 9, 12, 9, 7, 4, 2, 0, 4, 7],
];

export function createRadio() {
  let ctx = null, master = null, musicGain = null, engineOsc = null, engineGain = null;
  let started = false, muted = false, station = 0, stepIdx = 0, nextT = 0, timer = null;
  let sirenOsc = null, sirenGain = null, sirenLfo = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch { return false; }
  }
  function pluck(freq, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule() {
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.3;
    while (nextT < ahead) {
      const pat = PATTERNS[station % PATTERNS.length];
      const deg = pat[stepIdx % pat.length];
      const base = station === 0 ? 220 : 174.6;
      const f = base * Math.pow(2, SCALE[deg % SCALE.length] / 12);
      pluck(f, nextT, 0.5, 0.5);
      if (stepIdx % 4 === 0) pluck(base / 2, nextT, 0.7, 0.35);
      if (stepIdx % 8 === 6) pluck(f * 2, nextT, 0.3, 0.22);
      nextT += station === 0 ? 0.24 : 0.3;
      stepIdx++;
    }
  }
  const R = {
    unlock() {
      if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
      if (!ensure()) return;
      started = true; nextT = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 90);
    },
    setStation(i) { station = i; stepIdx = 0; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    engine(v) { if (engineGain && ctx) { engineGain.gain.value = 0.02 + v * 0.05; engineOsc.frequency.value = 50 + v * 90; } },
    horn() {
      if (!ctx || muted) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 340;
      g.gain.setValueAtTime(0.18, ctx.currentTime); g.gain.setValueAtTime(0, ctx.currentTime + 0.28);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.3);
    },
    shoot() {
      if (!ctx || muted) return;
      const len = ctx.sampleRate * 0.09, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.4;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      src.connect(f); f.connect(g); g.connect(master); src.start();
    },
    punch() {
      if (!ctx || muted) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(140, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.35, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.13);
    },
    crash() { if (ctx && !muted) R.punch(); },
    pickup() {
      if (!ctx || muted) return;
      [660, 880, 990].forEach((f, i) => pluck(f, ctx.currentTime + i * 0.07, 0.25, 0.3));
    },
    pass() {
      if (!ctx || muted) return;
      [523, 659, 784, 1046].forEach((f, i) => pluck(f, ctx.currentTime + i * 0.11, 0.4, 0.35));
    },
    siren(on) {
      if (!ctx) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
        sirenLfo = ctx.createOscillator(); sirenLfo.frequency.value = 0.7;
        const lg = ctx.createGain(); lg.gain.value = 180;
        sirenLfo.connect(lg); lg.connect(sirenOsc.frequency);
        sirenGain = ctx.createGain(); sirenGain.gain.value = 0.05;
        sirenOsc.connect(sirenGain); sirenGain.connect(master);
        sirenOsc.start(); sirenLfo.start();
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); sirenLfo.stop(); } catch { /* already stopped */ }
        sirenOsc = null; sirenLfo = null; sirenGain = null;
      }
    },
    trackName() { return RADIO[station].tracks[Math.floor(Date.now() / 30000) % RADIO[station].tracks.length]; },
    stationName() { return RADIO[station].station; },
  };
  return R;
}
