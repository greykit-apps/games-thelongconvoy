/* The Long Convoy -- sound, all of it synthesised: no audio files.
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

  /* ---- the title theme: the hunt. D minor, slow (56 a minute), sixteen bars round: a low drone and strings
   * under a lone horn, a muffled heartbeat on the drum once the hunt is on, the sonar's ping every other bar
   * ringing out in a deep reverb, and in the second half high strings trembling over an E flat of dread.
   * Lengths are eighths. ---- */
  const NOTE = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0); return 440 * Math.pow(2, (k + (+m[3] + 1) * 12 - 69) / 12); };
  const parse = s => s.split(/\s+/).filter(x => x && x !== "|").map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : NOTE(n), parseInt(l, 10)]; });
  const STEP = 60 / 56 / 2, BAR = 8, N = 16 * BAR;
  /* the chords, two bars each: the low strings play them, the drone holds their root */
  const CHORDS = [["D2", "D3 F3 A3"], ["D2", "D3 F3 A3"], ["Bb1", "D3 F3 Bb3"], ["A1", "C#3 E3 A3"],
    ["D2", "D3 F3 A3"], ["Eb2", "Eb3 G3 Bb3"], ["G1", "D3 G3 Bb3"], ["A1", "C#3 E3 A3"]];
  const HORN = parse(`r:16 | A3:6 D4:2 F4:4 E4:2 D4:2 | D4:6 C4:2 Bb3:8 | A3:4 C#4:4 E4:8 |
    D4:4 F4:4 A4:6 G4:2 | G4:6 F4:2 Eb4:8 | D4:4 Eb4:2 D4:2 Bb3:8 | A3:8 r:8`);
  const EV = Array.from({ length: N }, () => []);
  CHORDS.forEach(([root, ch], i) => { EV[i * 16].push(["pad", NOTE(root), ch.split(" ").map(NOTE)]); if (i >= 4) EV[i * 16].push(["trem", NOTE(ch.split(" ")[1]) * 4]); });
  { let t = 0; for (const [f, l] of HORN) { if (f) EV[t].push(["horn", f, l]); t += l; } }
  /* the heartbeat from the third bar: a beat and its echo, once a bar; the ping every other bar */
  for (let b = 2; b < 16; b++) EV[b * BAR].push(["beat"]);
  for (let b = 0; b < 16; b += 2) EV[b * BAR + 4].push(["ping"]);
  /* how often the theme pings, and when (on the page's clock, performance.now) each one it has scheduled will
   * sound: the title's painting rings the destroyer's sonar out on them (js/art/intro.js) */
  A.PING_EVERY = STEP * BAR * 2;
  A.pings = [];

  A.startTune = () => {
    if (A.muted || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(0.55, a.currentTime + 2.5); g.connect(A.comp);
    /* the deep: a long reverb, its tail made from noise dying away over four seconds */
    const verb = a.createConvolver(), ir = a.createBuffer(2, a.sampleRate * 4, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    verb.buffer = ir;
    const wet = a.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(g);
    /* the ping's own echo, slow and long, into the reverb */
    const dl = a.createDelay(2), fb = a.createGain(); dl.delayTime.value = STEP * 3; fb.gain.value = 0.42;
    dl.connect(fb); fb.connect(dl); dl.connect(verb);
    const send = (node, dry, rev) => { const d = a.createGain(), r = a.createGain(); d.gain.value = dry; r.gain.value = rev; node.connect(d); d.connect(g); node.connect(r); r.connect(verb); };
    /* a voice: oscillators into a lowpass and an envelope that swells in and fades out */
    const voice = (oscs, at, dur, { cut, vol, att, rel, dry, rev, q = 0.5 }) => {
      const lp = a.createBiquadFilter(), e = a.createGain(), end = at + dur;
      lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = q;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol, at + att); e.gain.setValueAtTime(vol, Math.max(at + att, end - rel * 0.3)); e.gain.linearRampToValueAtTime(0, end + rel);
      lp.connect(e); send(e, dry, rev);
      const os = oscs.map(([type, f, det]) => { const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det || 0; o.connect(lp); o.start(at); o.stop(end + rel + 0.05); return o; });
      return { lp, e, os };
    };
    const pad = (root, notes, at) => {
      const dur = STEP * 16;
      /* the drone: the root low, a sine and a soft saw */
      voice([["sine", root], ["sawtooth", root, -4], ["sawtooth", root * 2, 5]], at, dur, { cut: 260, vol: 0.32, att: 2.4, rel: 2.2, dry: 0.8, rev: 0.3 });
      /* the strings: each note two saws a little apart, dark, breathing slowly open and shut */
      const v = voice(notes.flatMap(f => [["sawtooth", f, -7], ["sawtooth", f, 7]]), at, dur, { cut: 520, vol: 0.075, att: 2.8, rel: 2.4, dry: 0.55, rev: 0.6 });
      v.lp.frequency.setValueAtTime(420, at); v.lp.frequency.linearRampToValueAtTime(900, at + dur * 0.5); v.lp.frequency.linearRampToValueAtTime(460, at + dur);
    };
    const trem = (f, at) => {
      const dur = STEP * 16, v = voice([["sawtooth", f, -5], ["triangle", f, 6]], at, dur, { cut: 2600, vol: 0.022, att: 3.2, rel: 2.5, dry: 0.35, rev: 0.8 });
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 7.5; lg.gain.value = 0.014;
      lfo.connect(lg); lg.connect(v.e.gain); lfo.start(at); lfo.stop(at + dur + 2.6);
    };
    /* the horn: a dark brassy tone, slow to speak, a little vibrato as the note is held */
    const horn = (f, at, len) => {
      const dur = len * STEP * 0.96, v = voice([["sawtooth", f], ["triangle", f * 0.5], ["square", f, 4]], at, dur, { cut: 1100, vol: 0.12, att: 0.32, rel: 0.6, dry: 0.7, rev: 0.55, q: 1.1 });
      v.lp.frequency.setValueAtTime(500, at); v.lp.frequency.linearRampToValueAtTime(1300, at + 0.35); v.lp.frequency.linearRampToValueAtTime(800, at + dur);
      if (dur > 1.2) {
        const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 4.8;
        lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(14, at + Math.min(1.4, dur * 0.6));
        lfo.connect(lg); lfo.start(at); lfo.stop(at + dur + 0.6);
        for (const o of v.os) lg.connect(o.detune);
      }
    };
    /* the heartbeat: a muffled drum and its softer second beat */
    const thump = (at, vol) => {
      const o = a.createOscillator(), e = a.createGain(), lp = a.createBiquadFilter();
      o.type = "sine"; o.frequency.setValueAtTime(72, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.5);
      lp.type = "lowpass"; lp.frequency.value = 180;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(vol, at + 0.012); e.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
      o.connect(lp); lp.connect(e); send(e, 0.9, 0.25); o.start(at); o.stop(at + 1);
    };
    const beat = at => { thump(at, 0.55); thump(at + 0.34, 0.32); };
    /* the sonar's ping: a clean sine, lower than the boat's, ringing out into the echo and the reverb */
    const ping = at => {
      A.pings = A.pings.slice(-3).concat([performance.now() + (at - a.currentTime) * 1000]);
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.value = 1180;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.11, at + 0.015); e.gain.exponentialRampToValueAtTime(0.001, at + 2.2);
      o.connect(e); e.connect(g); e.connect(dl); e.connect(verb); o.start(at); o.stop(at + 2.3);
    };
    const st = { g, fb, t0: a.currentTime + 0.1, n: 0, timer: null };
    const sched = () => {
      const late = a.currentTime + 0.02 - st.t0;
      if (st.n * STEP < late) st.n = Math.ceil(late / STEP);
      for (let at; (at = st.t0 + st.n * STEP) < a.currentTime + 2; st.n++) {
        for (const [k, x, y] of EV[st.n % N]) {
          if (k === "pad") pad(x, y, at);
          else if (k === "trem") trem(x, at);
          else if (k === "horn") horn(x, at, y);
          else if (k === "beat") beat(at);
          else if (k === "ping") ping(at);
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
