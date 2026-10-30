/* The Long Convoy -- the sonar's waterfall, after 688 Attack Sub's. What the vessel you are aboard hears, drawn as
 * it is heard: across, the bearing from the bow (port to the left, astern at both ends); down, the last few minutes,
 * the newest line at the top, a line a second of the game's clock. Each thing heard is a band at its bearing, the
 * louder the brighter and wider; the sea is a speckle under them all, and your own noise (speed, diesels, the flow
 * past an escort's dome) raises it until nothing shows. Depth charges flash right across it; pings and echoes
 * strike as bright points.
 *
 * It is a picture of the hearing the game already does (js/engine/detect.js), worked out from the same distances
 * and noises, on the page's side only: the engine, the AI and the map's markers never see it. It keeps falling
 * whatever screen is up, as 688's did. */
"use strict";
(() => {
  const C = PP.C, K = PP.K, Sub = PP.Sub, R = PP.Render, D = C.DET, Snr = PP.Sonar = {};
  const COLS = 180, ROWS = 240, DEG = 360 / COLS;
  /* the red light's ramp: the dark sea to a band at full strength */
  const RAMP = ["#0a0303", "#1d0605", "#3a0c08", "#651a0e", "#9c3216", "#d2602a", "#f39a4a", "#ffd58a", "#fff3d2"].map(h => {
    const n = parseInt(h.slice(1), 16); return (0xff000000 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0;
  });
  const shade = v => RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1) / 1.25)))];

  /* the history: one canvas a column a 2 degrees, a row a second, scrolled down as each new line goes on */
  const W = { S: null, who: null, t: 0, cv: null, img: null, line: null, marks: [], flash: 0, heard: [] };
  function reset(S, who) {
    W.S = S; W.who = who; W.t = S.t; W.marks = []; W.flash = 0; W.heard = [];
    W.cv = K.mk(COLS, ROWS); W.line = W.cv.getContext("2d").createImageData(COLS, 1);
    /* the history starts as the sea's speckle alone, not black */
    const g = W.cv.getContext("2d"), img = g.createImageData(COLS, ROWS), d = new Uint32Array(img.data.buffer), me = listener(S), f0 = 0.1 + (me ? ownNoise(S, me) : 0);
    for (let i = 0; i < d.length; i++) d[i] = shade(f0 + Math.random() * 0.2);
    g.putImageData(img, 0, 0);
  }
  const listener = S => S.side === "escorts" ? PP.Escort.flag(S) : S.sub;
  const rel = (me, x, y) => PP.angDiff(me.hdg, PP.angTo(me.x, me.y, x, y)) / PP.DEG;

  /* a ping striking us, an echo come back, at a true bearing (main.js sonarSounds); a charge going off */
  Snr.mark = (brg, v = 1) => { if (W.S) W.marks.push({ brg, v }); };
  Snr.boom = (S, x, y, v = 1) => { const me = listener(S); if (!me || W.S !== S) return; W.marks.push({ brg: PP.angTo(me.x, me.y, x, y), v: 1.4 * v, wide: true }); W.flash = Math.max(W.flash, 0.5 * v); };

  /* what is heard now: each a true bearing, a strength (0 to about 1.3), how wide its band, and what it sounds like */
  function sources(S, me) {
    const out = [], e = C.era(C.monthOf(S.t)), expert = S.real.expert ? 1 : 0;
    if (S.side === "escorts") {
      const k = C.SHIPS[me.cls], deaf = me.spd > D.hydFastKn ? D.hydFast : 1, sea = 1 - S.wx.sea * 0.06;
      for (const s of S.subs) {
        if (s.lost) continue;
        const d = PP.dist(me.x, me.y, s.x, s.y), Rh = D.hyd * Sub.noise(s) * e.asw * k.sonar * deaf * sea * (1 + expert * 0.25), a = 1 - d / Rh;
        if (a > 0) out.push({ x: s.x, y: s.y, v: 0.1 + a * 0.95, w: 1.6 + a * 2, what: Sub.surfaced(s) || Sub.snorkeling(s) ? "diesels" : "faint motors" });
      }
      for (const sh of S.ships) {
        if (sh === me || sh.sunk) continue;
        const d = PP.dist(me.x, me.y, sh.x, sh.y), a = 1 - d / (9000 * (0.5 + sh.spd / 16) * deaf * sea);
        if (a > 0) out.push({ x: sh.x, y: sh.y, v: sh.sinking ? 1.2 : 0.2 + a * 0.75, w: sh.sinking ? 6 : 2 + a * 3, what: sh.sinking ? "breaking up" : sh.role === "escort" ? "fast, light screws" : "heavy, slow screws" });
      }
    } else {
      const s = me, surf = Sub.surfaced(s), ear = (surf ? 0.25 : 1) * (1 - s.sys.sonar);
      for (const sh of S.ships) {
        if (sh.sunk) continue;
        const d = PP.dist(s.x, s.y, sh.x, sh.y), a = 1 - d / (D.ourHyd * (0.45 + sh.spd / 18));
        if (a > 0 && ear > 0.05) out.push({ x: sh.x, y: sh.y, v: (sh.sinking ? 1.2 : 0.2 + a * 0.9) * ear, w: sh.sinking ? 6 : 1.6 + a * 3, what: sh.sinking ? "breaking up" : sh.spd > 14 ? "fast, light screws" : "heavy, slow screws" });
      }
      for (const t of S.torps || []) { const d = PP.dist(s.x, s.y, t.x, t.y); if (d < 6000) out.push({ x: t.x, y: t.y, v: (0.35 + 0.5 * (1 - d / 6000)) * ear, w: 1.2, what: "torpedo" }); }
    }
    for (const q of S.decoys || []) { const d = PP.dist(me.x, me.y, q.x, q.y); if (S.t - q.t0 < C.DECOY.life && d < 3000) out.push({ x: q.x, y: q.y, v: 0.5 + 0.5 * (1 - d / 3000), w: 3, what: "noisemaker" }); }
    return out;
  }
  /* our own noise: the speckle's floor */
  function ownNoise(S, me) {
    if (S.side === "escorts") return me.spd > D.hydFastKn ? 0.75 : 0.04 + me.spd / D.hydFastKn * 0.18;
    const s = me;
    return Sub.surfaced(s) ? 0.55 : (Sub.snorkeling(s) ? 0.4 : 0) + Math.pow(Math.abs(s.spd) / 9, 2) * 0.12 + (s.silent ? 0 : 0.02);
  }

  /* one line: every band and mark, astern (the screws' own wash) heard only a third as well, over the speckle */
  function line(S, me) {
    const row = new Float32Array(COLS), floor = 0.1 + ownNoise(S, me) + W.flash;
    const src = sources(S, me);
    W.heard = src.filter(q => q.v > 0.32).map(q => ({ brg: PP.angTo(me.x, me.y, q.x, q.y), v: q.v, what: q.what }));
    const add = (r, v, w) => { const c0 = (r + 180) / DEG; for (let i = Math.floor(c0 - 3 * w / DEG); i <= Math.ceil(c0 + 3 * w / DEG); i++) { const dd = (i + 0.5 - c0) * DEG / w; row[(i % COLS + COLS) % COLS] += v * Math.exp(-dd * dd); } };
    for (const q of src) add(rel(me, q.x, q.y), q.v * (0.85 + Math.random() * 0.3), q.w);
    for (const m of W.marks) add(PP.angDiff(me.hdg, m.brg) / PP.DEG, m.v, m.wide ? 40 : 1.5);
    W.marks = []; W.flash *= 0.55;
    for (let i = 0; i < COLS; i++) row[i] = (Math.abs(i * DEG + DEG / 2 - 180) > 150 ? row[i] * 0.35 : row[i]) + floor + Math.random() * 0.2;
    return row;
  }

  /* each frame: a line for every second of the game's clock gone by (a few at most, at speed) */
  Snr.tick = S => {
    const me = listener(S);
    if (!me) return;
    if (W.S !== S || W.who !== me.id) reset(S, me.id);
    if (S.t - W.t > 60) W.t = S.t - 4;
    const g = W.cv.getContext("2d");
    for (let n = 0; S.t - W.t >= 1 && n < 4; n++) {
      W.t += 1;
      g.drawImage(W.cv, 0, 0, COLS, ROWS - 1, 0, 1, COLS, ROWS - 1);
      const row = line(S, me), d = new Uint32Array(W.line.data.buffer);
      for (let i = 0; i < COLS; i++) d[i] = shade(row[i]);
      g.putImageData(W.line, 0, 0);
    }
  };

  /* the waterfall in a rectangle, its bearing scale over it and the marks of what we hold under it. small: the
   * dashboard's, with fewer words */
  Snr.draw = (g, S, x, y, w, h, small = false) => {
    const me = listener(S);
    if (!me || !W.cv || W.S !== S) { K.rect(g, x, y, w, h, "#0a0303"); return; }
    const sh = small ? 9 : 14, fh = small ? 5 : 8, wy = y + sh, wh = h - sh - fh;
    K.rect(g, x, y, w, h, "#0a0303");
    const rows = Math.min(ROWS, Math.max(8, Math.round(wh / (small ? 1 : 2))));
    g.imageSmoothingEnabled = false;
    g.drawImage(W.cv, 0, 0, COLS, rows, x, wy, w, wh);
    /* the scale: a tick every 30 degrees, the bow's and the beams' longer; astern hatched */
    const X = r => x + (r + 180) / 360 * w;
    for (let r = -180; r <= 180; r += 30) K.rect(g, X(r), y + (r % 90 ? sh - 3 : sh - 6), 1, r % 90 ? 3 : 6, r === 0 ? "#ffc65a" : "#9a5a48");
    for (let r = -180; r < -150; r += 4) { K.rect(g, X(r), y + sh - 2, 2, 1, "#5a2a20"); K.rect(g, X(-r) - 2, y + sh - 2, 2, 1, "#5a2a20"); }
    const L = (id, t, xx, cls) => R.lab("s:" + (small ? "d" : "f") + id, t, xx, y + (small ? 3 : 5), "dl sm" + (cls ? " " + cls : ""), "cm");
    if (!small) { L("p90", "Port 90", X(-90)); L("bow", "Bow", X(0), "read"); L("s90", "Stbd 90", X(90)); L("aL", "Astern", X(-165)); L("aR", "Astern", X(165)); }
    else { L("bow", "Bow", X(0), "read"); }
    /* what we hold: on a boat the ship selected (yellow) and ships heard of late; aboard an escort her group's
     * fresh contacts */
    const fy = y + h - fh, caret = (r, col) => { const cx = Math.round(X(r)); K.rect(g, cx, fy + 1, 1, fh - 1, col); K.rect(g, cx - 1, fy + 2, 3, 1, col); };
    if (S.side === "escorts") {
      for (const q of PP.Escort.mine(S)) { const ai = q.ai; if (ai.datum && ai.contact && S.t - ai.contact < 300) caret(rel(me, ai.datum.x, ai.datum.y), S.t - ai.contact < 60 ? "#ffc65a" : "#c98a3c"); }
    } else {
      for (const q of S.ships) if (!q.sunk && q.kn && q.kn.t >= 0 && (S.t - (q.kn.ear || -1e9) < 60 || S.t - q.kn.t < 60)) caret(rel(me, q.kn.x, q.kn.y), q.id === S.tdc.tgt ? "#ffe9a0" : "#c98a3c");
    }
    K.rect(g, x, wy - 1, w, 1, "rgba(255,110,80,.25)");
  };

  /* the full screen: the waterfall large, and down the right what it is hearing and how well */
  Snr.screen = (g, S, ui, now, Wd, Ht) => {
    K.rect(g, 0, 0, Wd, Ht, "#0d0504");
    /* framed as the Map and the Damage report are: the stations across the top, the clock top right, the keys at
     * the foot; the waterfall under the stations, what it hears in a column under the clock */
    const sf = R.safe || { t: 28, b: 12, tr: 28 }, me = listener(S), m = 8, pw = Math.max(120, Math.round(Wd * 0.22));
    const wx = m, wy = sf.t + 16, ww = Wd - pw - 3 * m, wh = Ht - wy - Math.max(sf.b, 20) - 4;
    K.rect(g, wx - 1, wy - 1, ww + 2, wh + 2, "rgba(255,110,80,.3)");
    Snr.draw(g, S, wx, wy, ww, wh);
    const esc = S.side === "escorts", px = wx + ww + m + m, B = [], py = Math.max(wy, (sf.tr || 0) + 6);
    R.lab("s:title", `<b>Sonar</b> <span class="c">${esc ? (me && me.ping ? "active, pinging" : "passive, listening") : "hydrophones"} · a line a second, newest at the top</span>`, wx, wy - 8, "dl", "lm");
    if (esc && me) B.push({ id: "pa", html: me.ping ? "Active <kbd>X</kbd>" : "Passive <kbd>X</kbd>", x: px, y: py, w: 92, h: 16, act: "silent", on: !!me.ping, title: "Passive: listen (slow, under 15 knots). Active: ping, which they hear too (X)" });
    if (me) {
      let y = py + (esc ? 30 : 8);
      const say = (id, html, cls = "") => { R.lab("s:" + id, html, px, y, "dl" + (cls ? " " + cls : ""), "lm"); y += 15; };
      const why = esc ? (me.spd > D.hydFastKn ? "Too fast to hear: under 15 knots to listen" : "") : Sub.surfaced(me) ? "On the surface: the hydrophones hear the sea" : me.sys.sonar > 0.3 ? "The hydrophones are damaged" : "";
      say("spd", `<span class="c">Speed</span> <b>${Math.abs(me.spd).toFixed(1)} kn</b>`);
      /* (in two lines at its colon, so it keeps inside the column) */
      if (why) why.split(/(?<=:) /).forEach((w, i) => say("why" + i, w, "amber"));
      y += 6; say("hd", '<span class="c">Heard now</span>');
      const list = W.heard.slice().sort((a, b) => b.v - a.v).slice(0, 9);
      if (!list.length) say("none", '<span class="c">Nothing above the sea</span>');
      list.forEach((q, i) => say("h" + i, `<b>${PP.deg3(q.brg)}</b> <span class="c">${q.what}</span>`));
    }
    R.dash = { sonar: true, buttons: B };
  };
})();
