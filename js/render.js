/* PumaPack -- the play screen: whichever station you are at.
 *
 * The periscope (round, the reticle and its stadimeter ticks, the bearing
 * ring along the top, the sea washing over the glass in a swell), the
 * bridge (wide, or through the glasses, the rail and the TBT in front of
 * you, her own deck running away to the bow or the stern, the deck gun's
 * sight when it is manned), the instruments, the chart,
 * the damage report. And the title's lookout: a convoy at dusk. */
"use strict";
(() => {
  const K = PP.K, C = PP.C, Sub = PP.Sub, Det = PP.Detect, W = PP.Weapons, V = PP.View, FX = PP.FX, R = PP.Render = { cv: null, g: null, shake: 0, last: null };
  const INK = "#05070a";
  R.init = cv => { R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false; };

  /* the station actually shown: no bridge while she is under */
  R.stationOf = (S, ui) => ui.station === "bridge" && !Sub.surfaced(S.sub) ? "scope" : ui.station;

  /* a live reading, set over the canvas in the HUD's own type (hud.js): canvas pixels, an anchor (l c r, t m b), a tone */
  R.labels = [];
  const lab = R.lab = (id, html, x, y, cls = "", at = "cm") => { R.labels.push({ id, html, x, y, cls, at }); };
  /* a key in the station's words: the pad's button when the pad was touched last */
  const key = (k, p) => `<kbd>${PP.Input.device === "pad" && p ? p : k}</kbd>`;

  R.draw = (S, ui, now, dt) => {
    const g = R.g, Wd = R.cv.width, Ht = R.cv.height;
    R.labels = [];
    FX.step(dt);
    const st = R.stationOf(S, ui);
    g.save();
    if (R.shake > 0.3 && PP.prefs.shake) { g.translate(Math.round((Math.random() - 0.5) * R.shake), Math.round((Math.random() - 0.5) * R.shake)); }
    R.shake *= Math.pow(0.02, dt);
    g.fillStyle = INK; g.fillRect(-8, -8, Wd + 16, Ht + 16);
    R.last = null;
    if (st === "scope") scope(g, S, ui, now, Wd, Ht);
    else if (st === "bridge") bridge(g, S, ui, now, Wd, Ht);
    else if (st === "panel") PP.Panel.draw(g, S, ui);
    else if (st === "chart") R.last = { chart: PP.Chart.draw(g, S, ui, ui.aids, now) };
    else if (st === "damage") PP.DamageArt.draw(g, S, ui, now);
    g.restore();
    /* our track, for the chart: a point a minute */
    if (!ui.track) ui.track = [];
    if (!ui.trackT || S.t - ui.trackT > 60) { ui.trackT = S.t; ui.track.push([S.sub.x, S.sub.y]); if (ui.track.length > 4000) ui.track.shift(); }
  };

  /* ---- the periscope ---- */
  function scope(g, S, ui, now, Wd, Ht) {
    const s = S.sub, sf = R.safe || { t: 28, b: 12 }, r = Math.round(Math.min(Wd * 0.42, (Ht - sf.t - 22 - sf.b) / 2)), cx = Math.round(Wd / 2), cy = Math.round(sf.t + 22 + r);
    const fov = (s.scope.hi ? 8 : 32) * PP.DEG, brg = PP.normAng(s.hdg + s.scope.brg);
    const up = s.scope.h > 0 && s.depth <= C.PD + 6;
    if (up) {
      const eyeH = Math.max(0.5, C.EYE.scope + (C.PD - s.depth) * 0.6);
      const v = V.draw(g, S, { x: s.x, y: s.y, eyeH, brg, fov, cx, cy, r, now, aids: ui.aids, calm: PP.calm(), mask: "scope" });
      R.last = { view: v, brg, fov, cx, cy, r };
      /* the glass coming up out of the water, or a wave washing over it */
      const exposed = (C.PD + 7 - s.depth) * s.scope.h, wave = S.wx.sea * 1.4 * (0.5 + 0.5 * Math.sin(now / 900));
      let wet = s.scope.h < 1 ? 1 - s.scope.h : 0;
      if (exposed < wave + 1.5 && s.scope.h >= 1) wet = Math.max(wet, PP.clamp((wave + 1.5 - exposed) / 3, 0, 0.85));
      if (wet > 0) {
        const wy = Math.round(cy + r - wet * r * 2.1);
        g.fillStyle = "rgba(34,92,96,.88)"; g.fillRect(cx - r, wy, r * 2, cy + r - wy);
        for (let x = cx - r; x < cx + r; x += 2) { const hh = Math.round(Math.sin(x / 9 + now / 300) * 3); g.fillStyle = "rgba(190,230,232,.55)"; g.fillRect(x, wy + hh, 2, 1); }
        for (let i = 0; i < 18; i++) { const bx = cx - r + K.hash(i, 1, Math.floor(now / 140)) * r * 2, by = wy + K.hash(i, 2, Math.floor(now / 140)) * (cy + r - wy); g.fillStyle = "rgba(220,245,245,.5)"; g.fillRect(Math.round(bx), Math.round(by), 1, 1); }
      }
      /* the target, bracketed */
      if (S.tdc.tgt !== null) { const d = v.drawn.find(q => q.id === S.tdc.tgt); if (d) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(6, d.px * 0.55), Math.max(5, (d.wl - d.top) * 0.6 + 3), "#e6bd6a"); }
      /* the Field aid: where the solution aims, on the horizon */
      if (ui.aids.solution) {
        const e = W.est(S), sol = e && W.solve(S, e, s.bank);
        if (sol && sol.ok && Math.abs(PP.angDiff(brg, sol.hdg)) < fov / 2) { const x = v.toX(sol.hdg); K.rect(g, x, v.hz - 10, 1, 7, "rgba(230,189,106,.9)"); K.rect(g, x - 2, v.hz - 4, 5, 1, "rgba(230,189,106,.9)"); }
      }
      reticle(g, cx, cy, r, s.scope.hi, v.hz);
      if (s.sys.scope > 0) crack(g, cx, cy, r, s.sys.scope);
      /* how far off each ship in sight is (a Field aid): above her masts, clear of the reticle; the nearer wins a crowded spot */
      if (ui.aids.labels) ranges(S, v, "scope");
    } else {
      /* the periscope well */
      g.fillStyle = "#0a1016"; K.disc(g, cx, cy, r, r);
      for (let y = cy - r; y < cy + r; y += 3) { g.fillStyle = "rgba(127,224,168,.03)"; g.fillRect(cx - r, y, r * 2, 1); }
      const [msg, sub2] = s.sys.scope >= 0.5 ? ["Periscope damaged", Sub.portOnly(S, "scope") ? "Only a yard can mend it" : "The crew are on it"]
        : Sub.surfaced(s) ? ["On the surface", `${key("1", "pad:LB")} the bridge · ${key("P", "pad:R-click")} periscope depth`]
        : s.depth > C.PD + 4 ? [`Too deep: ${Math.round(s.depth)} ft`, `Periscope depth is ${C.PD} ft: ${key("P", "pad:R-click")}`]
        : ["Periscope down", `Raise it: ${key("up", "pad:B")}`];
      lab("well", `<b>${msg}</b><span>${sub2}</span>`, cx, cy, "well");
    }
    mask(g, cx, cy, r, Wd, Ht);
    handles(g, cx, cy, r);
    /* the bearing ring above the glass, in true bearings like the crew's reports */
    const ty = cy - r - 12;
    tape(g, S, cx, ty, r, brg, fov, s.hdg);
    lab("true", `<span class="c">True</span><b>${PP.deg3(brg)}</b>`, cx - r - 8, ty, "rd brass", "rm");
    /* off the bow, under it: the figure and the dial, as on the bridge (kept on the screen where the window is
     * narrow); the power under them */
    const dx = Math.max(cx - r - 8, 80) - DIAL, dy = ty + 18 + DIAL;
    bowDial(g, dx, dy, s.scope.brg, fov);
    lab("rel", `<span class="c">Rel</span><b>${PP.deg3(s.scope.brg)}</b>`, dx - DIAL - 6, dy, "rd", "rm");
    lab("power", s.scope.hi ? "High power" : "Low power", dx + DIAL, dy + DIAL + 6, "cap", "rt");
  }
  /* the range of each ship in sight, over her masts (the nearest wins a crowded spot) */
  function ranges(S, v, k0) {
    const taken = [];
    const mid = (v.x0 + v.x1) / 2, half = (v.x1 - v.x0) / 2 - 16;
    for (const d of v.drawn.filter(q => PP.Detect.known(S, PP.Ships.byId(S, q.id)) && q.px > 6 && q.haze < 0.9 && Math.abs(q.x - mid) < half).sort((a, b) => a.d - b.d)) {
      if (taken.some(x => Math.abs(x - d.x) < 30)) continue;
      taken.push(d.x);
      /* just right of her middle, so the crosshair on her does not run through the figures */
      lab(`${k0}:${d.id}`, PP.num(Math.round(d.d / 100) * 100), d.x + 3, Math.min(d.top, v.hz - 6) - 4, "rng", "lb");
    }
  }
  /* the training handles either side of the eyepiece */
  function handles(g, cx, cy, r) {
    const pw = Math.max(16, Math.round(r / 5));
    for (const sd of [-1, 1]) {
      const x0 = cx + sd * (r + 4), x1 = cx + sd * (r + pw + 14), y = cy + Math.round(r * 0.18);
      K.rect(g, Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 6, "#2a3038"); K.rect(g, Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 1, "#4a5260");
      K.rect(g, x1 - 4, y - 14, 8, 28, "#1c2128"); K.rect(g, x1 - 4, y - 14, 2, 28, "#3a424e");
    }
  }
  function mask(g, cx, cy, r, Wd, Ht) {
    g.fillStyle = INK;
    for (let y = -8; y < Ht + 8; y++) {
      const dy = y - cy, inside = r * r - dy * dy;
      if (inside <= 0) { g.fillRect(-8, y, Wd + 16, 1); continue; }
      const w = Math.sqrt(inside);
      g.fillRect(-8, y, Math.round(cx - w) + 8, 1); g.fillRect(Math.round(cx + w), y, Wd - Math.round(cx + w) + 8, 1);
    }
    /* the tube's vignette, dithered */
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r; if (d < 0.86 || d > 1) continue;
      if (K.bayer(x, y) + 0.5 < (d - 0.86) / 0.14) { g.fillStyle = INK; g.fillRect(x, y, 1, 1); }
    }
  }
  function reticle(g, cx, cy, r, hi, hz) {
    const col = "rgba(8,12,16,.85)";
    g.fillStyle = col;
    g.fillRect(cx - r, cy, r * 2, 1); g.fillRect(cx, cy - r, 1, r * 2);
    /* stadimeter ticks along the vertical, every few mils */
    for (let i = -8; i <= 8; i++) { if (!i) continue; const y = cy + i * (hi ? 10 : 6), w = i % 4 === 0 ? 7 : 3; g.fillRect(cx - w, y, w * 2 + 1, 1); }
    for (let i = -10; i <= 10; i++) { if (!i) continue; const x = cx + i * r / 10, h = i % 5 === 0 ? 6 : 3; g.fillRect(x, cy - h, 1, h * 2 + 1); }
    void hz;
  }
  function crack(g, cx, cy, r, v) {
    g.fillStyle = "rgba(220,230,236,.35)";
    for (let i = 0; i < 6 * v; i++) { let x = cx + (K.hash(i, 1, 4) - 0.5) * r, y = cy + (K.hash(i, 2, 4) - 0.5) * r; for (let k = 0; k < 30; k++) { g.fillRect(Math.round(x), Math.round(y), 1, 1); x += (K.hash(i, k, 5) - 0.4) * 4; y += (K.hash(i, k, 6) - 0.5) * 4; } }
  }
  /* a bearing ring, in true bearings: ticks every few degrees, a figure every ten (every two in high power, so
   * there is always one); the locked target's bearing a brass mark on it, the crew's last report a hollow one,
   * and an arrow at the end for either when it is off the ring */
  function tape(g, S, cx, y, r, centre, fov, bow) {
    K.rect(g, cx - r, y - 8, r * 2, 16, "#0b1017");
    const step = fov < 0.3 ? 1 : 5, every = fov < 0.3 ? 2 : 10, f = r / Math.tan(fov / 2);
    const c = centre / PP.DEG;
    for (let dgr = Math.floor((c - fov / PP.DEG) / step) * step; dgr <= c + fov / PP.DEG; dgr += step) {
      const a = (dgr - c) * PP.DEG; if (Math.abs(a) > fov / 2) continue;
      const x = Math.round(cx + Math.tan(a) * f), big = dgr % every === 0;
      K.rect(g, x, y + 8 - (big ? 5 : 3), 1, big ? 5 : 3, "#c8c0aa");
      if (big && Math.abs(x - cx) < r - 10) { const v = ((Math.round(dgr) % 360) + 360) % 360; lab("tape:" + v, String(v).padStart(3, "0"), x, y + 2, "tape", "cb"); }
    }
    const mark = (b, solid) => {
      const a = PP.angDiff(centre, b);
      if (Math.abs(a) < fov / 2 - 0.01) { const x = Math.round(cx + Math.tan(a) * f); K.poly(g, [[x, y - 1], [x - 4, y - 8], [x + 4, y - 8]], solid ? "#e6bd6a" : INK); if (!solid) { K.line(g, x - 4, y - 8, x, y - 1, "#f0a43c"); K.line(g, x + 4, y - 8, x, y - 1, "#f0a43c"); K.rect(g, x - 4, y - 8, 9, 1, "#f0a43c"); } }
      else { const sd = Math.sign(a), x = cx + sd * (r + 3); K.poly(g, [[x + sd * 5, y], [x, y - 4], [x, y + 4]], solid ? "#e6bd6a" : "#f0a43c"); }
    };
    /* the bow, the beams and the stern, under the ring where they fall on it */
    for (const [rel, n] of REL_MARKS) {
      const a = PP.angDiff(centre, bow + rel * PP.DEG);
      if (Math.abs(a) > fov / 2) continue;
      const x = Math.round(cx + Math.tan(a) * f);
      K.rect(g, x, y + 9, 1, 5, "#e9e2cf");
      K.text5(g, n, Math.round(PP.clamp(x - K.text5w(n) / 2, cx - r, cx + r - K.text5w(n))), y + 16, "#e9e2cf", INK);
    }
    const rep = R.report;
    if (rep && S.t - rep.t < 120 && rep.id !== S.tdc.tgt) mark(rep.brg, false);
    const e = S.tdc.tgt !== null && W.est(S);
    if (e) mark(e.brg, true);
    K.poly(g, [[cx, y + 9], [cx - 3, y + 13], [cx + 3, y + 13]], "#e6bd6a");
  }
  const REL_MARKS = [[0, "Bow"], [90, "Stbd"], [180, "Stern"], [270, "Port"]];
  /* the boat from above, bow up, and where the glass or the gun looks off her: a brass line, the field of view a wash */
  const DIAL = 15;
  function bowDial(g, x, y, rel, fov) {
    const R0 = DIAL, at = (a, d) => [x + Math.sin(a) * d, y - Math.cos(a) * d];
    K.disc(g, x, y, R0 + 1, R0 + 1, INK); K.disc(g, x, y, R0, R0, "#0b1017"); K.ring(g, x, y, R0, "#3a424e");
    for (let q = 0; q < 4; q++) { const [ax, ay] = at(q * Math.PI / 2, R0 - 1), [bx, by] = at(q * Math.PI / 2, R0 - 3); K.line(g, ax, ay, bx, by, "#c8c0aa"); }
    const w = Math.min(fov, PP.TAU) / 2, n = Math.max(2, Math.ceil(w / 0.15)), wedge = [[x, y]];
    for (let k = 0; k <= n; k++) wedge.push(at(rel - w + 2 * w * k / n, R0 - 1));
    K.poly(g, wedge, "rgba(230,189,106,.22)");
    const hull = [[0, -11], [2, -7], [3, -2], [3, 7], [2, 10], [-2, 10], [-3, 7], [-3, -2], [-2, -7]].map(([a, b]) => [x + a, y + b]);
    K.poly(g, hull.map(([a, b]) => [a + Math.sign(a - x), b + Math.sign(b - y)]), INK);
    K.poly(g, hull, "#6a7480"); K.rect(g, x - 1, y - 3, 3, 5, "#9aa3ad");
    const [ex, ey] = at(rel, R0 - 1);
    K.line(g, x, y, ex, ey, "#e6bd6a");
  }
  function bracket(g, x, y, w, h, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const L = Math.max(3, Math.round(Math.min(w, h) / 2));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.rect(g, x + sx * w - (sx > 0 ? L - 1 : 0), y + sy * h, L, 1, col); K.rect(g, x + sx * w, y + sy * h - (sy > 0 ? L - 1 : 0), 1, L, col); }
  }
  R.bracket = bracket;

  /* ---- the bridge ---- */
  function bridge(g, S, ui, now, Wd, Ht) {
    const s = S.sub, gunOn = s.gun.on, bino = ui.bino && !gunOn;
    if (gunOn) ui.look = s.gun.brg;
    const fov = (gunOn ? 14 : bino ? 9 : 70) * PP.DEG, brg = ui.look;
    const r = Math.round(Wd / 2), cx = Math.round(Wd / 2), cy = Math.round(Ht * (bino ? 0.5 : 0.44));
    const v = V.draw(g, S, { x: s.x, y: s.y, eyeH: C.EYE.bridge, brg, fov, cx, cy, r, now, aids: ui.aids, calm: PP.calm(), mask: bino ? "bino" : "none" });
    R.last = { view: v, brg, fov, cx, cy, r };
    if (!bino && !gunOn) ownBoat(g, S, v.f, cx, cy, brg, now, Wd, Ht);
    if (S.tdc.tgt !== null) { const d = v.drawn.find(q => q.id === S.tdc.tgt); if (d) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(6, d.px * 0.55), Math.max(5, (d.wl - d.top) * 0.6 + 3), "#e6bd6a"); }
    if (bino) {
      /* two circles of the glasses */
      const rr = Math.round(Ht * 0.42), dx = Math.round(rr * 0.62);
      g.fillStyle = INK;
      for (let y = -8; y < Ht + 8; y++) {
        let spans = [];
        for (const ox of [-dx, dx]) { const dy = y - cy, ins = rr * rr - dy * dy; if (ins > 0) { const w = Math.sqrt(ins); spans.push([cx + ox - w, cx + ox + w]); } }
        if (!spans.length) { g.fillRect(-8, y, Wd + 16, 1); continue; }
        const a = Math.min(...spans.map(q => q[0])), b = Math.max(...spans.map(q => q[1]));
        g.fillRect(-8, y, Math.round(a) + 8, 1); g.fillRect(Math.round(b), y, Wd - Math.round(b) + 8, 1);
      }
    } else if (gunOn) {
      /* the gun's sight: a ring, the range ladder, the ready lamp */
      const rx = cx, ry = cy;
      K.ring(g, rx, ry, 18, "rgba(230,189,106,.9)", 1); K.rect(g, rx - 30, ry, 60, 1, "rgba(230,189,106,.6)"); K.rect(g, rx, ry - 30, 1, 60, "rgba(230,189,106,.6)");
      const sf0 = R.safe || {}, lx = Wd - 70, top = Math.max(60, (sf0.tr || 0) + 14), bot = Math.min(Ht - 90, (sf0.br || Ht) - 16);
      K.rect(g, lx - 6, top - 10, 52, bot - top + 24, "rgba(5,8,12,.6)");
      for (let rr2 = 1000; rr2 <= C.GUN.range; rr2 += 1000) { const y = Math.round(bot - (rr2 / C.GUN.range) * (bot - top)); K.rect(g, lx, y, 8, 1, "#c8c0aa"); K.text3(g, String(rr2 / 1000), lx + 12, y - 2, "#e9e2cf"); }
      const yy = Math.round(bot - (s.gun.rng / C.GUN.range) * (bot - top));
      K.poly(g, [[lx - 5, yy - 4], [lx - 1, yy], [lx - 5, yy + 4]], "#ffd36a");
      lab("gunRng", `${PP.num(s.gun.rng)}<span class="c">yd</span>`, lx - 8, yy, "rd brass", "rm");
      const ready = s.gun.man >= 1 && s.gun.reload <= 0;
      lab("gunSt", `<b>${s.gun.man < 1 ? "Manning the gun" : s.gun.reload > 0 ? "Loading" : "Ready"}</b><span>${s.shells} shells</span>`, rx, ry + 26, "gun " + (ready ? "green" : "amber"), "ct");
    }
    if (!bino) rail(g, Wd, Ht, now);
    if (ui.aids.labels && !gunOn) ranges(S, v, "bridge");
    const sf = R.safe || { t: 28 }, tw = Math.round(Wd * 0.3);
    tape(g, S, cx, sf.t + 12, tw, brg, Math.min(fov, 40 * PP.DEG), s.hdg);
    lab("look", `<span class="c">${bino ? "Glasses" : gunOn ? "Gun" : "Looking"}</span><b>${PP.deg3(brg)}</b>`, cx - tw - 8, sf.t + 12, "rd brass", "rm");
    /* off the bow, under it: the figure and the dial */
    const dx = cx - tw - 8 - DIAL, dy = sf.t + 30 + DIAL;
    bowDial(g, dx, dy, PP.angDiff(s.hdg, brg), fov);
    lab("rel", `<span class="c">Rel</span><b>${PP.deg3(brg - s.hdg)}</b>`, dx - DIAL - 6, dy, "rd", "rm");
  }
  /* the bridge's rail and the TBT post, in front of you */
  function rail(g, Wd, Ht, now) {
    const y = Math.round(Ht * 0.84);
    for (let yy = y; yy < Ht + 8; yy++) { const k = (yy - y) / (Ht - y); g.fillStyle = K.mix("#2c333d", "#11151b", k); g.fillRect(-8, yy, Wd + 16, 1); }
    K.rect(g, -8, y - 3, Wd + 16, 3, "#454e5a"); K.rect(g, -8, y - 3, Wd + 16, 1, "#6a7480");
    for (let x = 14; x < Wd; x += 30) K.rivet(g, x, y + 6, "#6a7480", INK);
    const tx = Math.round(Wd / 2);
    K.rect(g, tx - 5, y - 22, 10, 22, "#2a3038"); K.rect(g, tx - 14, y - 30, 28, 10, "#3a424c"); K.rect(g, tx - 12, y - 28, 8, 6, "#11151b"); K.rect(g, tx + 4, y - 28, 8, 6, "#11151b");
    void now;
  }

  /* ---- our own boat, seen from her bridge: the deck running away to the bow or the stern, her
   * sides down to the water, the bow wave and the wake, as long as her class truly is. In her
   * own frame, feet: x forward of the bridge, y to starboard, z up from the sea. She pitches
   * with the eye, so it is the sea's horizon that moves against her, not her deck. ---- */
  const HULL = {};
  const hullOf = cls => HULL[cls] || (HULL[cls] = (() => {
    const Lf = C.SUBS[cls].len * 3, xb = 0.43 * Lf, xs = -0.57 * Lf, B = Math.max(18, Lf * 0.09), N = 32, st = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, fore = PP.clamp((u - 0.7) / 0.3, 0, 1), aft = PP.clamp((0.28 - u) / 0.28, 0, 1);
      const bow = 1 - Math.pow(fore, 1.6), tail = 1 - 0.8 * Math.pow(aft, 1.5);
      /* the stem rakes forward, so her waterline ends short of her deck */
      st.push({ x: xs + (xb - xs) * u, xw: xs + (xb - xs) * u - 0.035 * Lf * fore, d: B * 0.24 * bow * tail, w: B * 0.5 * bow * tail, z: 7 + 4 * fore * fore - 1.5 * aft });
    }
    return { st, Lf, B };
  })());
  function ownBoat(g, S, f, cx, cy, brg, now, Wd, Ht) {
    const s = S.sub, H = hullOf(s.cls), st = H.st, eye = C.EYE.bridge, NEAR = 2, L = Det.light(S);
    const r = PP.angDiff(s.hdg, brg), cr = Math.cos(r), sr = Math.sin(r);
    const cam = ([x, y, z]) => [x * cr + y * sr, -x * sr + y * cr, z];
    const scr = ([fw, la, z]) => [cx + f * la / fw, cy + f * (eye - z) / fw];
    const cut = (a, b) => { const t = (NEAR - a[0]) / (b[0] - a[0]); return [NEAR, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    /* a shape cut at the near plane, then put on the screen */
    const fill = (pts, col) => {
      const c = pts.map(cam), out = [];
      for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; if (a[0] >= NEAR) out.push(a); if ((a[0] >= NEAR) !== (b[0] >= NEAR)) out.push(cut(a, b)); }
      if (out.length > 2) K.poly(g, out.map(scr), col);
    };
    /* a line, cut at the near plane and at the screen's edges */
    const seg = (p, q, col) => {
      let a = cam(p), b = cam(q);
      if (a[0] < NEAR && b[0] < NEAR) return;
      if (a[0] < NEAR) a = cut(a, b); else if (b[0] < NEAR) b = cut(b, a);
      const [x0, y0] = scr(a), [x1, y1] = scr(b), dx = x1 - x0, dy = y1 - y0;
      let t0 = 0, t1 = 1;
      for (const [pp, qq] of [[-dx, x0 + 2], [dx, Wd + 2 - x0], [-dy, y0 + 2], [dy, Ht + 2 - y0]]) {
        if (pp === 0) { if (qq < 0) return; continue; }
        const t = qq / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      }
      if (t0 < t1) K.line(g, x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1, col);
    };
    const side = k => st.map(p => [p.x, k * p.d, p.z]).concat(st.map(p => [p.xw, k * p.w, 0]).reverse());
    const sp = Math.abs(s.spd), lit = PP.clamp(L + 0.2, 0.25, 1), foam = a => `rgba(230,240,246,${(a * lit).toFixed(3)})`, tt = Math.floor(now / 110);
    /* a fleck of foam on the water, len feet long */
    const dab = (x, y, len, a) => {
      const c = cam([x, y, 0]); if (c[0] < NEAR) return;
      const [px, py] = scr(c); if (px < -8 || px > Wd + 8 || py < -2 || py > Ht + 2) return;
      g.fillStyle = foam(a); g.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(f * len / c[0])), 1);
    };
    const wAt = x => { for (let i = 1; i < st.length; i++) if (st[i].xw >= x) { const p = st[i - 1], q = st[i]; return p.w + (q.w - p.w) * (x - p.xw) / (q.xw - p.xw || 1); } return 0; };
    /* on the water first: the wake streaming astern, the bow wave peeling off either side; the flecks
     * drift aft as fast as she runs, so the sea seems to pass her */
    if (sp > 1) {
      const k = PP.clamp(sp / 18, 0, 1), odo = S.t * sp * 1.689, xs = st[0].xw, xb = st[st.length - 1].xw, Lw = H.Lf * 1.2, back = H.Lf * (0.1 + k * 0.12);
      for (let i = 0; i < 110; i++) {
        const a = (K.hash(i, 1, 51) * Lw + odo) % Lw, wd = H.B * 0.3 + a * 0.1;
        dab(xs - a, (K.hash(i, 2, 51) * 2 - 1) * wd * (0.3 + 0.7 * K.hash(i, 3, 51)), 3 + a * 0.02, k * 0.6 * Math.pow(1 - a / Lw, 1.5));
      }
      for (const y of [-1, 1]) for (let i = 0; i < 46; i++) {
        const a = (K.hash(i, y + 5, 52) * back + odo) % back, x = xb - a;
        dab(x, y * (wAt(x) + 1 + a * (0.3 + 0.4 * k) * (0.7 + 0.3 * K.hash(i, 9, 52))), 2 + k * 3, (0.3 + 0.5 * k) * (1 - a / back));
      }
    }
    /* her sides, the sunlit one the paler; then the deck over them */
    const sunSide = Math.sin(PP.angDiff(s.hdg, V.sunPos(S.t).az)) > 0 ? 1 : -1;
    for (const k of [-1, 1]) fill(side(k), K.dim(k === sunSide ? "#3c444e" : "#272d35", L));
    fill(st.map(p => [p.x, -p.d, p.z]).concat(st.map(p => [p.x, p.d, p.z]).reverse()), K.dim("#4b4943", L));
    /* the planking, and the deck's edges catching the light */
    const plank = K.dim("#3b3934", L), edge = K.dim("#6c6e6c", L);
    for (const q of [-0.66, -0.33, 0, 0.33, 0.66]) for (let i = 4; i < st.length - 3; i++) seg([st[i].x, q * st[i].d, st[i].z], [st[i + 1].x, q * st[i + 1].d, st[i + 1].z], plank);
    for (const k of [-1, 1]) for (let i = 0; i < st.length - 1; i++) seg([st[i].x, k * st[i].d, st[i].z], [st[i + 1].x, k * st[i + 1].d, st[i + 1].z], edge);
    /* the jackstaff at her bow and the ensign staff at her stern */
    const bw = st[st.length - 1], sn = st[0];
    seg([bw.x - 2, 0, bw.z], [bw.x - 2, 0, bw.z + 9], edge); seg([sn.x + 3, 0, sn.z], [sn.x + 3, 0, sn.z + 10], edge);
    /* the limber holes along her casing, and the foam working at her waterline */
    const hole = K.dim("#0d1015", L), slap = PP.clamp(0.12 + sp / 24 + S.wx.sea * 0.04, 0, 0.7);
    for (let i = 5; i < st.length - 6; i++) for (let h = 0; h < 4; h++) {
      const u = h / 4, p = st[i], q = st[i + 1], x = p.x + (q.x - p.x) * u, d = p.d + (q.d - p.d) * u, w = p.w + (q.w - p.w) * u, z = p.z + (q.z - p.z) * u;
      for (const k of [-1, 1]) {
        const c = cam([x, k * (d + (w - d) * 0.3), z * 0.7]); if (c[0] < NEAR) continue;
        const [px, py] = scr(c), sz = f / c[0];
        if (px > -4 && px < Wd + 4 && py > -4 && py < Ht + 4) K.rect(g, px, py, Math.max(1, sz * 0.9), 1, hole);
      }
    }
    for (let i = 0; i < st.length; i++) for (const k of [-1, 1]) {
      if (K.hash(i * 2 + (k > 0), tt, 43) > 0.55) continue;
      dab(st[i].xw, k * (st[i].w + 0.4), 1.5, slap);
    }
  }

  /* ---- what happened, as pictures ---- */
  R.events = (S, evs) => {
    for (const e of evs) {
      switch (e.t) {
        case "torpHit": FX.hit(e.x, e.y, 1); break;
        case "shipExplodes": FX.hit(e.x, e.y, 2.2); break;
        case "gunHit": FX.shell(e.x, e.y, true); break;
        case "gunSplash": case "shellNear": FX.shell(e.x, e.y, false); break;
        case "torpPremature": FX.add({ k: "column", x: e.x, y: e.y, h: 110, w: 30, life: 2.6 }); break;
        case "dcBoom": FX.charge(e.x, e.y, e.z); R.shake = Math.max(R.shake, PP.clamp(14 - e.d / 25, 0, 14)); break;
        case "bombs": FX.add({ k: "column", x: e.x + 30, y: e.y, h: 80, w: 25, life: 2.2 }); R.shake = Math.max(R.shake, 8); break;
        case "hullHit": R.shake = Math.max(R.shake, 4 + e.sev * 20); break;
      }
    }
  };

  /* ---- the title's lookout: a convoy at dusk, from abeam ---- */
  R.title = (cv, D, now) => {
    const g = cv.getContext("2d"), Wd = cv.width, Ht = cv.height;
    g.imageSmoothingEnabled = false;
    const conv = D.convoys[0];
    if (!conv) return;
    /* from the far side of the convoy from the sun: the ships dark against the sunset */
    const sp = V.sunPos(D.t), side = PP.angDiff(conv.base, sp.az) > 0 ? -1 : 1, ex = conv.x - PP.hx(sp.az) * 3200 + PP.hx(sp.az + side * Math.PI / 2) * 1400, ey = conv.y - PP.hy(sp.az) * 3200 + PP.hy(sp.az + side * Math.PI / 2) * 1400;
    const brg = PP.angTo(ex, ey, conv.x, conv.y) - 0.07;
    V.draw(g, D, { x: ex, y: ey, eyeH: 18, brg, fov: 30 * PP.DEG, cx: Math.round(Wd * 0.5), cy: Math.round(Ht * 0.56), r: Math.ceil(Wd / 2) + 2, now, aids: {}, calm: PP.calm(), mask: "none" });
    /* the eye keeps station on the convoy, so the boat runs the way the convoy goes across the screen */
    titleScope(g, Det.light(D), PP.angDiff(brg, conv.base) >= 0 ? 1 : -1, now, Wd, Ht);
  };

  /* ---- and close by, one of ours at periscope depth, running alongside the eye: the scope coming
   * up out of the water, the feather at its foot, the wake streaming back from it. Up again each
   * time the title opens (main.js clears R.scopeT0); already up, and the water still, when calm. ---- */
  R.scopeT0 = null;
  function titleScope(g, L, dir, now, Wd, Ht) {
    const calm = PP.calm(), hash = K.hash, rd = Math.round;
    if (R.scopeT0 === null) R.scopeT0 = now;
    const t = calm ? 30 : (now - R.scopeT0) / 1000;
    const u = Ht / 360, cx = rd(Wd * 0.8), wl = rd(Ht * 0.84 + (calm ? 0 : Math.sin(now / 1100) * 1.2 * u));
    const rise = PP.clamp((t - 0.9) / 2.4, 0, 1), up = 1 - Math.pow(1 - rise, 3);
    const FULL = rd(112 * u), H = rd(FULL * up), run = Math.max(0, t - 0.9), spd = 30 * u, flow = calm ? 0 : run * spd;
    /* sizes across, measured forward (the way she runs) from the scope's centre */
    const tw = Math.max(4, rd(6 * u)), bw = tw + 2 * Math.max(1, rd(1.5 * u)), nose = Math.max(2, rd(4 * u)), b0 = -Math.floor(tw / 2), b1 = b0 + tw;
    const lit = PP.clamp(L + 0.35, 0.4, 1), foam = a => `rgba(226,236,240,${(a * lit).toFixed(3)})`;
    const px = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(rd(x), rd(y), Math.max(1, rd(w)), Math.max(1, rd(h))); };
    const fx = a => cx + dir * a, fr = (a0, a1, y, h, c) => px(Math.min(fx(a0), fx(a1)), y, Math.abs(a1 - a0), Math.min(h, wl - y), c);
    /* before it breaks the surface: the water humping over the head */
    if (H < 1) {
      const k = PP.clamp(t / 0.9, 0, 1);
      for (let i = -6; i <= 6; i++) if (hash(i, Math.floor(now / 140), 3) < 0.75 * k) px(cx + i * u * 1.5, wl - (i * i < 8 ? 1 : 0), 1, 1, foam(0.55 * k));
      return;
    }
    /* the wake, behind: white water right aft of the scope, the two arms of the vee opening away (the near
     * one wider on the screen than the far), churn between; the pattern stays on the water, so it streams back */
    const LEN = 220 * u, len = calm ? LEN : Math.min(LEN, run * spd * 2.4);
    for (let s = 0; s < len; s++) {
      const x = fx(b0 - 1 - s), k = s / LEN, a = (1 - k) * (1 - k), q = Math.floor(s - flow);
      const top = wl - 1 - s * 0.05, bot = wl + 1 + s * 0.15, boil = Math.max(0, 1 - s / (26 * u));
      if (hash(Math.floor(q / 3), 1, 41) > 0.22) px(x, top, 1, 1, foam(0.8 * a));
      if (hash(Math.floor(q / 3), 2, 41) > 0.18) px(x, bot, 1, 1, foam(0.95 * a));
      if (hash(Math.floor(q / 5), 3, 41) > 0.55) px(x, bot + 1, 1, 1, foam(0.4 * a));
      for (let y = Math.ceil(top + 1); y < bot; y++) {
        const mid = 1 - Math.abs((y - wl) / Math.max(1, bot - wl)), d = Math.max(boil, (1 - k * 1.5) * (0.2 + 0.6 * mid));
        if (d > 0 && hash(q, y - wl, 42) < d) px(x, y, 1, 1, foam(Math.max(boil * 0.95, 0.7 * a * (0.5 + hash(q, y, 43) * 0.5))));
      }
      /* white water heaped up just aft of it */
      if (boil > 0) for (let y = 1; y < boil * 3 * u; y++) if (hash(q, -y, 44) < boil) px(x, wl - y, 1, 1, foam(0.8 * boil));
    }
    /* its broken reflection, under it */
    for (let y = wl + 2; y < wl + 12 * u; y++) {
      const off = calm ? 0 : rd(Math.sin(y * 1.7 + now / 260) * u);
      if (hash(y, Math.floor(now / 180), 5) < 0.6) fr(b0 + off, b1 + off, y, 1, `rgba(6,10,16,${(0.5 * (1 - (y - wl) / (12 * u))).toFixed(2)})`);
    }
    /* the scope: the heavy barrel low down, the tube, a collar, and the head with its glass looking ahead.
     * Dark against the sunset behind it; the sky catches its top edges and the glass. */
    const body = "#121820", shade = "#1c2430", rim = "#46525f", warm = "#cf9260", glass = "#05080c";
    const yT = wl - H, hh = Math.max(5, rd(11 * u)), barrel = yT + rd(FULL * 0.6), collar = yT + hh + rd(5 * u);
    if (barrel < wl) { fr(-Math.floor(bw / 2), -Math.floor(bw / 2) + bw, barrel, wl - barrel, body); fr(-Math.floor(bw / 2), -Math.floor(bw / 2) + 1, barrel, wl - barrel, rim); fr(-Math.floor(bw / 2), -Math.floor(bw / 2) + bw, barrel, 1, rim); }
    const tubeB = Math.min(wl, barrel);
    fr(b0, b1, yT + hh, tubeB - yT - hh, body);
    fr(b0, b0 + 1, yT + hh, tubeB - yT - hh, rim);
    fr(b1 - Math.max(1, rd(tw / 3)), b1, yT + hh, tubeB - yT - hh, shade);
    if (collar < wl) fr(b0 - 1, b1 + 1, collar, Math.max(1, rd(2 * u)), shade);
    /* the head: as wide as the tube behind, a nose forward with the glass in its face, a rounded top */
    fr(b0, b1 + nose, yT + 1, hh - 1, body);
    fr(b0 + 1, b1 + nose - 1, yT, 1, warm);
    fr(b0, b0 + 1, yT + 1, hh - 1, rim);
    fr(b1 + nose, b1 + nose + 1, yT + 2, hh - 3, body);
    fr(b1, b1 + nose, yT + hh - 1, 1, shade);
    if (H > 4 * u) {
      const gy = yT + rd(2.5 * u), gh = Math.max(2, rd(4 * u));
      fr(b1 + nose - 1, b1 + nose + 1, gy, gh, glass);
      fr(b1 + nose - 1, b1 + nose + 1, gy, 1, warm);
      if (!calm && hash(Math.floor(now / 1800), 1, 7) > 0.55) fr(b1 + nose, b1 + nose + 1, gy + 1, 1, "#fff3d6");
    }
    /* water running off it as it comes up */
    if (!calm && run < 2.6) for (let i = 0; i < 8; i++) {
      const tt = (run * 1.4 + i / 8) % 1, y = yT + 3 + tt * (H - 3);
      if (y < wl && hash(i, Math.floor(run * 1.4 + i / 8), 8) > 0.3) fr(i % 2 ? b1 : b0 - 1, i % 2 ? b1 + 1 : b0, y, 2, foam(0.7 * (1 - run / 2.6)));
    }
    /* the feather: water thrown up the scope's face and piled ahead of it, spray off the top, a collar round its foot */
    const fh = Math.min(H, 13 * u), fl = 16 * u;
    for (let i = 0; i < fl; i++) {
      const h = fh * Math.pow(1 - i / fl, 1.8);
      for (let y = 0; y < h; y++) if (hash(i, y + (calm ? 0 : Math.floor(now / 80)), 9) < 0.85 - y / (h + 1) * 0.55) fr(b1 + i, b1 + i + 1, wl - y, 1, foam(0.95 - y / (h + 1) * 0.5));
    }
    fr(b0 - 3, b1 + 2, wl - 1, 2, foam(0.9));
    if (!calm) for (let i = 0; i < 7; i++) {
      const ph = (now / 650 + i * 0.143) % 1, ax = b1 + 1 + ph * 9 * u * (0.6 + hash(i, 2, 11) * 0.8), ay = wl - fh * 0.9 - Math.sin(ph * Math.PI) * 6 * u * (0.5 + hash(i, 3, 11));
      if (hash(i, Math.floor(now / 650 + i * 0.143), 11) > 0.25) fr(ax, ax + 1, ay, 1, foam(0.8 * (1 - ph)));
    }
  }
})();
