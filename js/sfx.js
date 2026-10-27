/* PumaPack -- sound, all of it synthesised: no audio files.
 *
 * On the surface the diesels chug and the sea washes along the casing;
 * under it, only the motors' whine and, when a ship is near, its screws
 * thrashing in the hydrophones. The dive alarm, the torpedo leaving the
 * tube, a hit far off, a dud's clank, the ping of a hunting escort, depth
 * charges, the hull groaning below its test depth. On the title, rock of
 * our own: the 1985 game had no music to borrow. (The synth and the amp
 * are Raid on Puma Bay's; the song is new.) */
"use strict";
(() => {
  const A = PP.SFX = { ctx: null, muted: false, out: null, loops: {}, tune: null };
  let noiseBuf = null;

  A.unlock = () => {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try { const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; A.ctx = new Ctx(); } catch (e) { A.ctx = null; return; }
    const a = A.ctx;
    A.out = a.createGain(); A.out.gain.value = A.muted ? 0 : 0.5; A.out.connect(a.destination);
    A.comp = a.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 4; A.comp.connect(A.out);
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  A.setMuted = m => { A.muted = m; if (A.out) A.out.gain.value = m ? 0 : 0.5; if (m) { A.stopTune(); for (const k of Object.keys(A.loops)) A.loop(k, 0); } };

  function tone(f0, f1, ms, type, vol, dest, at = 0) {
    const a = A.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + ms / 1000);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  function hiss(ms, vol, freq, dest, q = 0.8, at = 0, type = "lowpass", f1 = null) {
    const a = A.ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + ms / 1000 + 0.02);
  }

  const SOUNDS = {
    menu: d => tone(900, 900, 18, "square", 0.04, d),
    /* the title's signal typing itself out: a teleprinter's short clatter */
    type: d => { for (let i = 0; i < 9; i++) tone(1500 + (i * 397) % 700, 1200, 12, "square", 0.022, d, i * 0.075 + (i % 3) * 0.012); },
    bell: d => { tone(1760, 1760, 120, "triangle", 0.06, d); tone(1760, 1760, 160, "triangle", 0.05, d, 0.14); },
    klaxon: d => { for (let i = 0; i < 2; i++) { tone(260, 520, 420, "sawtooth", 0.07, d, i * 0.62); } },
    crash: d => { for (let i = 0; i < 3; i++) tone(300, 560, 300, "sawtooth", 0.08, d, i * 0.4); hiss(1500, 0.3, 600, d, 0.6, 0.2, "bandpass", 1800); },
    blow: d => hiss(1800, 0.45, 600, d, 0.7, 0, "bandpass", 2400),
    launch: d => { tone(110, 40, 260, "sine", 0.6, d); hiss(700, 0.35, 1200, d, 0.8, 0, "bandpass", 300); hiss(1200, 0.12, 2400, d, 0.6, 0.15, "highpass"); },
    hit: d => { hiss(1800, 0.8, 320, d, 0.5, 0, "lowpass", 60); tone(55, 24, 1500, "sine", 0.7, d); hiss(500, 0.3, 1500, d, 0.4, 0.04); },
    bigHit: d => { SOUNDS.hit(d); for (let i = 1; i < 4; i++) hiss(900, 0.45, 400, d, 0.5, i * 0.22, "lowpass", 80); },
    dud: d => { tone(980, 940, 70, "square", 0.05, d); tone(1460, 1400, 110, "triangle", 0.05, d, 0.03); },
    dc: d => { tone(42, 20, 1800, "sine", 0.9, d); hiss(2200, 0.7, 220, d, 0.5, 0, "lowpass", 40); },
    dcNear: d => { hiss(160, 0.8, 2600, d, 0.5, 0, "bandpass"); tone(60, 22, 2000, "sine", 1, d); hiss(2600, 0.9, 300, d, 0.5, 0.02, "lowpass", 40); for (let i = 0; i < 5; i++) tone(2400 + i * 300, 2200, 50, "square", 0.02, d, 0.05 + i * 0.07); },
    splashes: d => { for (let i = 0; i < 4; i++) hiss(260, 0.12, 900, d, 0.8, i * 0.18, "bandpass", 400); },
    ping: d => { tone(1480, 1470, 700, "sine", 0.09, d); tone(1480, 1470, 500, "sine", 0.03, d, 0.32); },
    pingNear: d => { tone(1480, 1470, 500, "sine", 0.14, d); tone(1480, 1470, 400, "sine", 0.1, d, 0.06); },
    creak: d => { tone(72, 52, 1600, "sawtooth", 0.06, d); tone(140, 96, 1100, "triangle", 0.03, d, 0.3); hiss(900, 0.08, 300, d, 3, 0.1, "bandpass"); },
    gun: d => { hiss(130, 0.6, 1800, d, 0.7, 0, "bandpass"); tone(140, 50, 260, "sine", 0.4, d); },
    shellNear: d => { tone(1900, 620, 380, "sine", 0.04, d); SOUNDS.splash(d); },
    splash: d => { hiss(500, 0.4, 1600, d, 0.6, 0.3, "bandpass", 500); hiss(900, 0.15, 3000, d, 0.5, 0.4, "highpass"); },
    shellHit: d => { hiss(400, 0.7, 1200, d, 0.6, 0, "lowpass", 200); tone(200, 60, 300, "square", 0.08, d); },
    breakup: d => { for (let i = 0; i < 4; i++) tone(90 - i * 8, 40, 1400, "sawtooth", 0.045, d, i * 0.5); hiss(3000, 0.3, 260, d, 0.5, 0.2, "lowpass", 50); },
    plane: d => { tone(115, 108, 2000, "sawtooth", 0.035, d); tone(118, 110, 2000, "sawtooth", 0.03, d); },
    bombs: d => { for (let i = 0; i < 3; i++) { tone(60, 25, 900, "sine", 0.7, d, i * 0.25); hiss(700, 0.5, 400, d, 0.5, i * 0.25, "lowpass", 70); } },
    reloaded: d => { tone(220, 160, 90, "square", 0.04, d); tone(320, 300, 40, "square", 0.03, d, 0.09); },
    relief: d => { tone(660, 660, 160, "triangle", 0.05, d); tone(523, 523, 220, "triangle", 0.05, d, 0.16); tone(392, 392, 420, "triangle", 0.04, d, 0.36); },
    sighted: d => { tone(784, 784, 90, "triangle", 0.05, d); tone(1046, 1046, 140, "triangle", 0.05, d, 0.1); },
    warn: d => { for (let i = 0; i < 3; i++) tone(1300, 1300, 70, "square", 0.06, d, i * 0.14); },
    sunk: d => { [523, 659, 784].forEach((f, i) => tone(f, f, 150, "square", 0.05, d, i * 0.12)); },
    won: d => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, i === 6 ? 500 : 140, "square", 0.06, d, i * 0.13)); },
    over: d => { [392, 349, 330, 262].forEach((f, i) => tone(f, f, 260, "square", 0.07, d, i * 0.24)); },
  };
  /* name; vol 0..1 (a far charge is quieter) */
  /* the sound's own gain, so a caller can cut it short (disconnect it); undefined when nothing played */
  A.play = (name, vol = 1) => {
    if (A.muted || !A.ctx || !SOUNDS[name] || vol < 0.03) return;
    const g = A.ctx.createGain(); g.gain.value = vol; g.connect(A.comp);
    SOUNDS[name](g);
    setTimeout(() => g.disconnect(), 4200);
    return g;
  };

  /* ---- what keeps sounding: the diesels, the motors, the sea, screws in the hydrophones ---- */
  A.loop = (name, level, pitch = 1) => {
    if (!A.ctx) return;
    let L = A.loops[name];
    if (!L) {
      if (level <= 0 || A.muted) return;
      const a = A.ctx, g = a.createGain();
      g.gain.value = 0; g.connect(A.comp);
      const noise = (type, f, q) => { const s = a.createBufferSource(), fl = a.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); return { s, fl }; };
      if (name === "diesel") {
        const n = noise("lowpass", 220, 1), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.5; lfo.type = "square"; lfo.frequency.value = 9; lg.gain.value = 0.45; lfo.connect(lg); lg.connect(am.gain);
        const hum = a.createOscillator(), hg = a.createGain(); hum.type = "sawtooth"; hum.frequency.value = 46; hg.gain.value = 0.06; hum.connect(hg); hg.connect(g);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start(); hum.start();
        L = { g, set: p => { lfo.frequency.setTargetAtTime(6 + p * 6, a.currentTime, 0.3); hum.frequency.setTargetAtTime(40 + p * 14, a.currentTime, 0.3); }, stop: () => { n.s.stop(); lfo.stop(); hum.stop(); } };
      } else if (name === "motor") {
        const o = a.createOscillator(), og = a.createGain(), n = noise("bandpass", 900, 2);
        o.type = "sine"; o.frequency.value = 180; og.gain.value = 0.25; o.connect(og); og.connect(g); n.fl.connect(g); n.s.start(); o.start();
        L = { g, set: p => o.frequency.setTargetAtTime(140 + p * 160, a.currentTime, 0.4), stop: () => { o.stop(); n.s.stop(); } };
      } else if (name === "sea") {
        const n = noise("lowpass", 600, 0.5), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.6; lfo.frequency.value = 0.18; lg.gain.value = 0.35; lfo.connect(lg); lg.connect(am.gain);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start();
        L = { g, set: p => n.fl.frequency.setTargetAtTime(400 + p * 700, a.currentTime, 0.5), stop: () => { n.s.stop(); lfo.stop(); } };
      } else {
        /* screws: a thrash at the shafts' pace */
        const n = noise("bandpass", 420, 1.4), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        am.gain.value = 0.3; lfo.type = "sawtooth"; lfo.frequency.value = 3; lg.gain.value = 0.3; lfo.connect(lg); lg.connect(am.gain);
        n.fl.connect(am); am.connect(g); n.s.start(); lfo.start();
        L = { g, set: p => lfo.frequency.setTargetAtTime(2 + p * 4, a.currentTime, 0.3), stop: () => { n.s.stop(); lfo.stop(); } };
      }
      A.loops[name] = L;
    }
    L.set(pitch);
    const v = A.muted ? 0 : Math.max(0, Math.min(1, level)) * ({ diesel: 0.4, motor: 0.08, sea: 0.22, screws: 0.3 }[name] || 0.2);
    L.g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.2);
  };
  A.stopLoops = () => { for (const [k, L] of Object.entries(A.loops)) { try { L.stop(); } catch (e) { /* already */ } delete A.loops[k]; } };

  /* ---- the title theme: ours, and loud. D minor at 140: a distorted rhythm
   * guitar chugging power chords, a sonar ping before the band comes in, a
   * lead with an echo, bass under the roots, a rock kit. Lengths are
   * sixteenths; "m" is palm-muted. ---- */
  const NOTE = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0); return 440 * Math.pow(2, (k + (+m[3] + 1) * 12 - 69) / 12); };
  const parse = s => s.split(/\s+/).filter(x => x && x !== "|").map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : NOTE(n), parseInt(l, 10), /m$/.test(l)]; });
  const GALLOP = "D3:1m D3:1m D3:2m D3:1m D3:1m D3:2m";
  const R1 = `${GALLOP} F3:2 D3:1m D3:1m G3:2 D3:1m D3:1m`, R2 = `${GALLOP} A3:2 G3:2 F3:2 E3:2`, R4 = `${GALLOP} Bb2:4 C3:4`;
  const CH = r => `${r}:3 ${r}:1m ${r}:2m ${r}:2 ${r}:2m ${r}:2m ${r}:2 ${r}:2m`;
  const PUSH = "Bb2:2 Bb2:1m Bb2:1m Bb2:2 Bb2:2m C3:2 C3:1m C3:1m C3:2 C3:2m";
  const GTR = parse(`r:64 | ${R1} | ${R2} | ${R1} | ${R4} |
    ${CH("D3")} | ${CH("Bb2")} | ${CH("F3")} | ${CH("C3")} |
    ${PUSH} | D3:6 D3:1m D3:1m D3:2m D3:2m D3:2 D3:2m | ${PUSH} | A2:2 A2:2 A2:2 A2:2 A2:1m A2:1m A2:1m A2:1m A2:1m A2:1m A2:1m A2:1m`);
  const LEAD = parse(`r:64 |
    D4:2 F4:2 G4:2 A4:6 G4:2 F4:2 | G4:2 A4:2 C5:2 D5:2 E5:2 D5:2 C5:2 A4:2 | D4:2 F4:2 G4:2 A4:4 C5:2 D5:4 | C5:2 A4:2 G4:2 F4:2 G4:8 |
    A4:4 D5:4 F5:6 E5:2 | D5:4 C5:2 D5:2 F5:4 D5:4 | C5:4 A4:4 C5:2 F5:2 E5:2 F5:2 | G5:8 E5:4 C5:4 |
    D5:2 F5:2 G5:4 G5:2 A5:2 G5:2 E5:2 | F5:8 D5:8 | D5:2 F5:2 G5:4 A5:2 C6:2 A5:2 G5:2 | A5:4 G5:2 F5:2 E5:4 C#5:4`);
  const KIT = {
    none: ["................", "................", "................"],
    riff: ["x.x...x.x.x...x.", "....x.......x...", "x.x.x.x.x.x.x.x."],
    chorus: ["x.....xxx.....x.", "....x.......x...", "xxxxxxxxxxxxxxxx"],
    push: ["x.x.x...x.x.x...", "....x.......x...", "x.x.x.x.x.x.x.x."],
    half: ["x.....x.x.......", "........x.......", "x...x...x...x..."],
    fill: ["x...x...x...x...", "....x.x.xxxxxxxx", "x.x.x.x........."],
  };
  const BARS = ["none", "none", "none", "fill", "riff", "riff", "riff", "riff", "chorus", "chorus", "chorus", "chorus", "push", "half", "push", "fill"];
  const CRASH = [4, 8, 10, 12];
  const PINGS = [0, 16, 32, 40, 48];
  const STEP = 60 / 140 / 4, N = BARS.length * 16;
  const EV = Array.from({ length: N }, () => []);
  for (const [track, k] of [[GTR, "g"], [LEAD, "l"]]) { let t = 0; for (const [f, l, m] of track) { if (f && t < N) EV[t].push([k, f, l, m]); t += l; } }
  BARS.forEach((p, b) => {
    for (let i = 0; i < 16; i++) "ksh".split("").forEach((d, j) => {
      if (KIT[p][j][i] === "x") EV[b * 16 + i].push([d, d === "h" ? (i % 2 ? 0.55 : 1) : p === "fill" && d === "s" ? 0.45 + i / 22 : 1]);
    });
    if (CRASH.includes(b)) EV[b * 16].push(["c", 1]);
  });
  for (const t of PINGS) EV[t].push(["p", 1]);

  A.startTune = () => {
    if (A.muted || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    g.gain.value = 0.5; g.connect(A.comp);
    const amp = (k, cut, out) => {
      const inp = a.createGain(), ws = a.createWaveShaper(), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(), o = a.createGain();
      const c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * (i / 511.5 - 1)) / Math.tanh(k);
      ws.curve = c; ws.oversample = "4x";
      hp.type = "highpass"; hp.frequency.value = 90; lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = 0.9; o.gain.value = out;
      inp.connect(ws); ws.connect(hp); hp.connect(lp); lp.connect(o); o.connect(g);
      return { inp, o };
    };
    const gtr = amp(18, 3200, 0.15), lead = amp(9, 2800, 0.13);
    const dl = a.createDelay(1), fb = a.createGain(), wet = a.createGain();
    dl.delayTime.value = STEP * 3; fb.gain.value = 0.34; wet.gain.value = 0.32;
    lead.o.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(g);
    const bass = a.createBiquadFilter(); bass.type = "lowpass"; bass.frequency.value = 600; bass.connect(g);
    const chord = (f, at, dur, m) => {
      const end = at + (m ? Math.min(dur, STEP * 1.1) : dur * 0.92), v = m ? 0.22 : 0.26;
      const lp = a.createBiquadFilter(), e = a.createGain();
      lp.type = "lowpass"; lp.frequency.value = m ? 900 : 4000;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(v, at + 0.004);
      if (m) e.gain.exponentialRampToValueAtTime(0.02, end); else e.gain.setValueAtTime(v, end - 0.03);
      e.gain.linearRampToValueAtTime(0, end + 0.01);
      lp.connect(e); e.connect(gtr.inp);
      for (const r of [1, 1.5, 2]) for (const d of [-8, 8]) {
        const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * r; o.detune.value = d;
        o.connect(lp); o.start(at); o.stop(end + 0.02);
      }
      const b = a.createOscillator(), be = a.createGain();
      b.type = "sawtooth"; b.frequency.value = f / 2 < 55 ? f : f / 2;
      be.gain.setValueAtTime(0, at); be.gain.linearRampToValueAtTime(0.3, at + 0.005); be.gain.setValueAtTime(0.3, end - 0.02); be.gain.linearRampToValueAtTime(0, end);
      b.connect(be); be.connect(bass); b.start(at); b.stop(end + 0.01);
    };
    const solo = (f, at, dur) => {
      const o = a.createOscillator(), e = a.createGain(), end = at + dur - 0.01;
      o.type = "sawtooth"; o.frequency.setValueAtTime(f * 0.97, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.03);
      if (dur > STEP * 3) {
        const lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.4, dur * 0.6));
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(at); lfo.stop(end);
      }
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.5, at + 0.008); e.gain.setValueAtTime(0.5, end - 0.03); e.gain.linearRampToValueAtTime(0, end);
      o.connect(e); e.connect(lead.inp); o.start(at); o.stop(end + 0.01);
    };
    /* the sonar's ping, with the lead's echo on it */
    const ping = at => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.value = 1480;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.16, at + 0.01); e.gain.exponentialRampToValueAtTime(0.001, at + 1.4);
      o.connect(e); e.connect(g); e.connect(dl); o.start(at); o.stop(at + 1.5);
    };
    const noise = (at, type, freq, vol, dec, q = 0.7) => {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      s.connect(f); f.connect(e); e.connect(g); s.start(at, Math.random() * 0.5); s.stop(at + dec + 0.02);
    };
    const thump = (at, f0, f1, vol, dec, type = "sine") => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dec * 0.5);
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      o.connect(e); e.connect(g); o.start(at); o.stop(at + dec + 0.02);
    };
    const DRUM = {
      k: (at, v) => { thump(at, 150, 45, 0.9 * v, 0.28); noise(at, "highpass", 3000, 0.08 * v, 0.015); },
      s: (at, v) => { noise(at, "bandpass", 1800, 0.5 * v, 0.17, 0.6); thump(at, 200, 150, 0.25 * v, 0.09, "triangle"); },
      h: (at, v) => noise(at, "highpass", 7500, 0.09 * v, 0.035),
      c: at => noise(at, "highpass", 4800, 0.22, 1.3, 0.5),
    };
    const st = { g, fb, t0: a.currentTime + 0.1, n: 0, timer: null };
    const sched = () => {
      const late = a.currentTime + 0.02 - st.t0;
      if (st.n * STEP < late) st.n = Math.ceil(late / STEP);
      for (let at; (at = st.t0 + st.n * STEP) < a.currentTime + 1.5; st.n++) {
        for (const [k, x, l, m] of EV[st.n % N]) {
          if (k === "g") chord(x, at, l * STEP, m);
          else if (k === "l") solo(x, at, l * STEP);
          else if (k === "p") ping(at);
          else DRUM[k](at, x);
        }
      }
    };
    sched();
    st.timer = setInterval(sched, 250);
    A.tune = st;
  };
  A.stopTune = () => {
    if (!A.tune) return;
    clearInterval(A.tune.timer);
    const { g, fb } = A.tune;
    g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.15);
    setTimeout(() => { g.disconnect(); fb.disconnect(); }, 1800);
    A.tune = null;
  };
})();
