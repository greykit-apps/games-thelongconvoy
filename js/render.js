/* The Long Convoy -- the play screen: whichever station you are at.
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

  /* the screens, as the 1990 game had them: the map, the view out of the boat you are on (the bridge and
   * its glasses on the surface, the periscope under it), and the damage. This is the view actually drawn */
  /* the screens, as the 1990 game had them: the dashboard of the vessel you are aboard (the view out in its
   * window, the map in a small one, every instrument at once), and the full Map, Damage and Status screens */
  R.stationOf = (S, ui) => {
    const v = ui.station === "dash" || ui.station === "view" || ui.station === "bridge" || ui.station === "scope" || ui.station === "ebridge";
    if (v) return "dash";
    if (S.side === "escorts" && ui.station === "damage") return "status";
    return ui.station || "dash";
  };
  /* the view in the dashboard's window: the periscope under the water, the bridge on the surface, the escort's bridge */
  /* a boat's bridge is a place to stand while its deck is out of the water: down to about this depth, awash */
  R.BRIDGE_DRY = 13;
  R.innerOf = S => S.side === "escorts" ? "ebridge" : S.sub.depth <= R.BRIDGE_DRY ? "bridge" : "scope";
  R.viewInto = (g, S, ui, now, Wd, Ht) => {
    const st = R.innerOf(S);
    if (st === "scope") scope(g, S, ui, now, Wd, Ht);
    else if (st === "bridge") bridge(g, S, ui, now, Wd, Ht);
    else ebridge(g, S, ui, now, Wd, Ht);
    return st;
  };

  /* a live reading, set over the canvas in the HUD's own type (hud.js): canvas pixels, an anchor (l c r, t m b), a tone */
  R.labels = [];
  const lab = R.lab = (id, html, x, y, cls = "", at = "cm") => { R.labels.push({ id, html, x, y, cls, at }); };
  /* a key in the station's words: the pad's button when the pad was touched last */
  const key = (k, p) => `<kbd>${PP.Input.device === "pad" && p ? p : k}</kbd>`;

  R.draw = (S, ui, now, dt) => {
    const g = R.g, Wd = R.cv.width, Ht = R.cv.height;
    R.labels = [];
    FX.step(dt);
    tossNew(S);
    leaks(S, dt);
    const st = R.stationOf(S, ui);
    g.save();
    if (R.shake > 0.3 && PP.prefs.shake) { g.translate(Math.round((Math.random() - 0.5) * R.shake), Math.round((Math.random() - 0.5) * R.shake)); }
    R.shake *= Math.pow(0.02, dt);
    g.fillStyle = INK; g.fillRect(-8, -8, Wd + 16, Ht + 16);
    R.last = null;
    if (st === "dash") PP.Dash.draw(g, S, ui, now, Wd, Ht);
    else if (st === "status") PP.Dash.status(g, S, ui, now, Wd, Ht);
    else if (st === "scope") scope(g, S, ui, now, Wd, Ht);
    else if (st === "bridge") bridge(g, S, ui, now, Wd, Ht);
    else if (st === "ebridge") ebridge(g, S, ui, now, Wd, Ht);
    else if (st === "panel") PP.Panel.draw(g, S, ui);
    else if (st === "chart") R.last = { chart: PP.Chart.draw(g, S, ui, ui.aids, now) };
    else if (st === "damage") PP.DamageArt.draw(g, S, ui, now);
    g.restore();
    /* our track, for the chart: a point a minute */
    if (!ui.track) ui.track = [];
    const me = PP.Chart.me(S);
    if (!ui.trackT || S.t - ui.trackT > 60) { ui.trackT = S.t; ui.track.push([me.x, me.y]); if (ui.track.length > 4000) ui.track.shift(); }
  };

  /* ---- each depth charge as it leaves an escort, in the air and its splash (fx.js) ----
   * Off the rails it rolls from her stern; from a thrower it is flung out abeam from her quarter; a hedgehog's
   * bombs go up from her forecastle and come down in a ring ahead. A charge off the rails sinks from where it
   * splashed at her stern, so its boil and its fountain come up there too (the engine drops it nearer amidships). */
  const tossed = { S: null, seen: new Set(), at: new Map() };
  function tossNew(S) {
    if (tossed.S !== S || tossed.seen.size > 3000) { tossed.S = S; tossed.seen = new Set(S.charges.map(c => c.id)); tossed.at = new Map(); return; }
    for (const c of S.charges) {
      if (tossed.seen.has(c.id)) continue;
      tossed.seen.add(c.id);
      const sh = S.ships.find(q => q.id === c.by), k = sh && C.SHIPS[sh.cls];
      if (!sh || c.z > 40) { FX.splash(c.x, c.y, c.hh ? 0.6 : 1); continue; }
      const hx = PP.hx(sh.hdg), hy = PP.hy(sh.hdg), ax = Math.cos(sh.hdg), ay = Math.sin(sh.hdg), stern = k.len * 0.5;
      if (c.hh) { FX.toss(sh.x + hx * k.len * 0.3, sh.y + hy * k.len * 0.3, 18, c.x, c.y, 110, 2.6 + Math.random() * 0.4, 1.5, 0.6); continue; }
      const side = (c.x - sh.x) * ax + (c.y - sh.y) * ay;
      if (Math.abs(side) > 25) {
        const q = Math.sign(side) * k.beam * 0.4, ox = sh.x - hx * (stern - 23) + ax * q, oy = sh.y - hy * (stern - 23) + ay * q;
        FX.toss(ox, oy, 12, c.x, c.y, 40, 1.7, 2.5);
      } else {
        const tx = sh.x - hx * (stern + 4), ty = sh.y - hy * (stern + 4);
        tossed.at.set(c.id, [tx, ty]);
        FX.toss(sh.x - hx * stern, sh.y - hy * stern, 9, tx, ty, 1, 0.5, 2.5);
      }
    }
  }

  /* a boat hurt badly enough weeps oil as she goes, where anyone on the surface may see it */
  function leaks(S, dt) {
    for (const s of S.subs || []) if (!s.lost && s.hull < 0.5 && Math.random() < dt * (0.5 - s.hull) * 0.5) FX.oil(s.x, s.y, s.depth, 0);
  }

  /* ---- the escort's bridge: high above the water, the glasses, no deck of a boat in front of you ---- */
  function ebridge(g, S, ui, now, Wd, Ht) {
    const s = PP.Escort.flag(S); if (!s) return;
    const bino = ui.bino, fov = (bino ? 9 : 70) * PP.DEG, brg = ui.look;
    const r = Math.round(Wd / 2), cx = Math.round(Wd / 2), cy = Math.round(Ht * (bino ? 0.5 : 0.4));
    /* her bridge is a third of her length back from the stem, forward of her middle (the engine's point for her) */
    const fwd = C.SHIPS[s.cls].len * 0.17;
    const v = V.draw(g, S, { x: s.x + PP.hx(s.hdg) * fwd, y: s.y + PP.hy(s.hdg) * fwd, self: s.id, late: !bino, eyeH: 45, brg, fov, cx, cy, r, now, aids: ui.aids, calm: PP.calm(), mask: bino ? "bino" : "none" });
    R.last = { view: v, brg, fov, cx, cy, r };
    if (bino) {
      const rr = Math.round(Ht * 0.42), dx = Math.round(rr * 0.62);
      g.fillStyle = INK;
      for (let y = -8; y < Ht + 8; y++) {
        const spans = [];
        for (const ox of [-dx, dx]) { const dy = y - cy, ins = rr * rr - dy * dy; if (ins > 0) { const w = Math.sqrt(ins); spans.push([cx + ox - w, cx + ox + w]); } }
        if (!spans.length) { g.fillRect(-8, y, Wd + 16, 1); continue; }
        const a = Math.min(...spans.map(q => q[0])), b = Math.max(...spans.map(q => q[1]));
        g.fillRect(-8, y, Math.round(a) + 8, 1); g.fillRect(Math.round(b), y, Wd - Math.round(b) + 8, 1);
      }
    } else {
      /* her own deck from the bridge: forward to the bow and its gun, or aft to the stern, its rails and its wake */
      /* her deck seen from her bridge's own height, so the forecastle and the quarterdeck both show below it */
      const H = shipHullOf(s.cls);
      ownBoat(g, S, v.f, cx, cy, brg, now, Wd, Ht, s, H, PP.clamp(H.Lf * 0.1, 26, 34), "escort");
      v.late();
      /* the lip of her open bridge's screen along the foot */
      K.rect(g, -8, Ht - 5, Wd + 16, 6, "#262c33"); K.rect(g, -8, Ht - 5, Wd + 16, 1, "#6a7480");
    }
    /* the boats up in sight, bracketed where they show: her target in the trigger's amber while her guns can fire on
     * it (dim while they load, or while it is out of their range), the others faintly, to click on */
    const tg = PP.Escort.target(S, s), gr = tg && PP.Escort.gunReady(S, s);
    for (const o of PP.Escort.sighted(S, s)) {
      const gd = v.boats.find(q => q.id === o.b.id); if (!gd) continue;
      const on = tg && tg.b.id === o.b.id, w = Math.max(7, gd.px * 0.55), h = Math.max(6, (gd.wl - gd.top) * 0.6 + 4);
      if (!on) { bracket(g, gd.x, (gd.top + gd.wl) / 2, w * 0.8, h * 0.8, "rgba(200,210,220,.45)"); continue; }
      bracket(g, gd.x, (gd.top + gd.wl) / 2, w, h, gr ? "#e6bd6a" : "#8a6a3a");
      lab("gunTgt", `<b>${PP.num(Math.round(o.d / 50) * 50)}</b>`, gd.x, Math.round(gd.top) - 7, "rng", "cb");
    }
    if (ui.aids.labels) ranges(S, v, "bridge");
    const sf = R.safe || { t: 28 }, tw = Math.round(Math.min(Wd * 0.3, Wd / 2 - 80));
    tape(g, S, cx, sf.t + 12, tw, brg, Math.min(fov, 40 * PP.DEG), s.hdg);
    lab("look", `<span class="c">${bino ? "Glasses" : "Looking"}</span><b>${PP.deg3(brg)}</b>`, cx - tw - 8, sf.t + 12, "rd brass", "rm");
    const dx = cx - tw - 8 - DIAL, dy = sf.t + 30 + DIAL;
    bowDial(g, dx, dy, s.hdg, brg, fov);
    lab("rel", `<span class="c">Rel</span><b>${PP.deg3(brg - s.hdg)}</b>`, dx - DIAL - 6, dy, "rd", "rm");
  }

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
    bowDial(g, dx, dy, s.hdg, s.hdg + s.scope.brg, fov);
    lab("rel", `<span class="c">Rel</span><b>${PP.deg3(s.scope.brg)}</b>`, dx - DIAL - 6, dy, "rd", "rm");
    lab("power", s.scope.hi ? "High power" : "Low power", dx + DIAL, dy + DIAL + 6, "cap", "rt");
  }
  /* the range of each ship in sight, over her masts (the nearest wins a crowded spot) */
  function ranges(S, v, k0) {
    const taken = [];
    const mid = (v.x0 + v.x1) / 2, half = (v.x1 - v.x0) / 2 - 16;
    for (const d of v.drawn.filter(q => (S.side === "escorts" || PP.Detect.known(S, PP.Ships.byId(S, q.id))) && q.px > 6 && q.haze < 0.9 && Math.abs(q.x - mid) < half).sort((a, b) => a.d - b.d)) {
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
    if (S.side === "escorts") {
      /* an escort's: her target solid, the other boats up in sight hollow; none up, where the hunt puts the contact */
      const f = PP.Escort.flag(S), L = f ? PP.Escort.sighted(S, f) : [], tg = f && PP.Escort.target(S, f), c = f && !L.length && PP.Escort.solution(S, f).contact;
      for (const o of L) if (o !== tg) mark(PP.angTo(f.x, f.y, o.b.x, o.b.y), false);
      if (tg) mark(PP.angTo(f.x, f.y, tg.b.x, tg.b.y), true); else if (c) mark(c.brg, false);
    } else {
      const rep = R.report;
      if (rep && S.t - rep.t < 120 && rep.id !== S.tdc.tgt) mark(rep.brg, false);
      const e = S.tdc.tgt !== null && W.est(S);
      if (e) mark(e.brg, true);
    }
    K.poly(g, [[cx, y + 9], [cx - 3, y + 13], [cx + 3, y + 13]], "#e6bd6a");
  }
  const REL_MARKS = [[0, "Bow"], [90, "Stbd"], [180, "Stern"], [270, "Port"]];
  /* the boat from above, bow up, and where the glass or the gun looks off her: a brass line, the field of view a wash */
  const DIAL = 15;
  /* a compass card, north up: the vessel turned to her heading, the view's field and its line on the true bearing
   * it looks along (so the angle between hull and line is the relative bearing beside it) */
  function bowDial(g, x, y, hdg, brg, fov) {
    const R0 = DIAL, at = (a, d) => [x + Math.sin(a) * d, y - Math.cos(a) * d];
    K.disc(g, x, y, R0 + 1, R0 + 1, INK); K.disc(g, x, y, R0, R0, "#0b1017"); K.ring(g, x, y, R0, "#3a424e");
    for (let q = 0; q < 4; q++) { const [ax, ay] = at(q * Math.PI / 2, R0 - 1), [bx, by] = at(q * Math.PI / 2, R0 - (q ? 3 : 5)); K.line(g, ax, ay, bx, by, q ? "#c8c0aa" : "#e6bd6a"); }
    const w = Math.min(fov, PP.TAU) / 2, n = Math.max(2, Math.ceil(w / 0.15)), wedge = [[x, y]];
    for (let k = 0; k <= n; k++) wedge.push(at(brg - w + 2 * w * k / n, R0 - 1));
    K.poly(g, wedge, "rgba(230,189,106,.22)");
    const c = Math.cos(hdg), s = Math.sin(hdg), turn = ([a, b], k = 1) => [x + (a * c - b * s) * k, y + (a * s + b * c) * k];
    const hull = [[0, -11], [2, -7], [3, -2], [3, 7], [2, 10], [-2, 10], [-3, 7], [-3, -2], [-2, -7]];
    K.poly(g, hull.map(p => turn(p, 1.22)), INK);
    K.poly(g, hull.map(p => turn(p)), "#6a7480"); K.poly(g, [[-1, -3], [1, -3], [1, 2], [-1, 2]].map(p => turn(p)), "#9aa3ad");
    const [ex, ey] = at(brg, R0 - 1);
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
    const s = S.sub, bino = ui.bino;
    const fov = (bino ? 9 : 70) * PP.DEG, brg = ui.look;
    const r = Math.round(Wd / 2), cx = Math.round(Wd / 2), cy = Math.round(Ht * (bino ? 0.5 : 0.4));
    const v = V.draw(g, S, { x: s.x, y: s.y, late: !bino, eyeH: Math.max(4, C.EYE.bridge - Math.max(0, s.depth)), brg, fov, cx, cy, r, now, aids: ui.aids, calm: PP.calm(), mask: bino ? "bino" : "none" });
    R.last = { view: v, brg, fov, cx, cy, r };
    if (!bino) { ownBoat(g, S, v.f, cx, cy, brg, now, Wd, Ht, s, hullOf(s.cls), 22); v.late(); }
    /* the target bracketed; with the gun manned, its target too when it is another (the nearest in its reach) */
    const brk = id => { const d = v.drawn.find(q => q.id === id); if (d) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(6, d.px * 0.55), Math.max(5, (d.wl - d.top) * 0.6 + 3), "#e6bd6a"); };
    if (S.tdc.tgt !== null) brk(S.tdc.tgt);
    const gq = s.gun.on && W.gunTarget(S);
    if (gq && gq.id !== S.tdc.tgt) brk(gq.id);
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
    }
    if (!bino) rail(g, Wd, Ht, now);
    if (ui.aids.labels) ranges(S, v, "bridge");
    const sf = R.safe || { t: 28 }, tw = Math.round(Math.min(Wd * 0.3, Wd / 2 - 80));
    tape(g, S, cx, sf.t + 12, tw, brg, Math.min(fov, 40 * PP.DEG), s.hdg);
    lab("look", `<span class="c">${bino ? "Glasses" : "Looking"}</span><b>${PP.deg3(brg)}</b>`, cx - tw - 8, sf.t + 12, "rd brass", "rm");
    /* off the bow, under it: the figure and the dial */
    const dx = cx - tw - 8 - DIAL, dy = sf.t + 30 + DIAL;
    bowDial(g, dx, dy, s.hdg, brg, fov);
    lab("rel", `<span class="c">Rel</span><b>${PP.deg3(brg - s.hdg)}</b>`, dx - DIAL - 6, dy, "rd", "rm");
  }
  /* the bridge's rail and the TBT post, in front of you */
  function rail(g, Wd, Ht, now) {
    const y = Math.round(Ht * 0.93);
    for (let yy = y; yy < Ht + 8; yy++) { const k = (yy - y) / (Ht - y); g.fillStyle = K.mix("#2c333d", "#11151b", k); g.fillRect(-8, yy, Wd + 16, 1); }
    K.rect(g, -8, y - 3, Wd + 16, 3, "#454e5a"); K.rect(g, -8, y - 3, Wd + 16, 1, "#6a7480");
    for (let x = 14; x < Wd; x += 30) K.rivet(g, x, y + 6, "#6a7480", INK);
    /* the torpedo sight's binocular post, at the front of the bridge to port of the gun */
    const tx = Math.round(Wd * 0.3);
    K.rect(g, tx - 4, y - 14, 8, 14, "#2a3038"); K.rect(g, tx - 11, y - 20, 22, 7, "#3a424c"); K.rect(g, tx - 9, y - 19, 6, 4, "#11151b"); K.rect(g, tx + 3, y - 19, 6, 4, "#11151b");
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
  /* a boat's deck gun on her hull: where it stands (feet forward of the bridge), its height, and its size by its
   * calibre; and the eye on it, over the layer's shoulder behind its breech to port, trained with it */
  function subGun(s, H) {
    const st = H.st, x = H.Lf * 0.12, k = C.SUBS[s.cls];
    let z = st[st.length - 1].z;
    for (let i = 1; i < st.length; i++) if (st[i].x >= x) { const p = st[i - 1], q = st[i]; z = p.z + (q.z - p.z) * (x - p.x) / (q.x - p.x || 1); break; }
    const big = k.gun === "5-inch" ? 1.25 : k.gun === "4-inch" ? 1.1 : 1, th = s.gun.rel || 0, u = -5 * big, v = -1.5 * big;
    return { x, z, big, eye: { x: x + u * Math.cos(th) - v * Math.sin(th), y: u * Math.sin(th) + v * Math.cos(th), z: z + 5.9 * big } };
  }
  /* an escort's hull, as her bridge sees it: a fine bow, a long low quarterdeck to a square stern; the bridge
   * a third of her length back from the stem (feet; x forward of the bridge, z above the water) */
  const SHULL = {};
  const shipHullOf = cls => SHULL[cls] || (SHULL[cls] = (() => {
    const k = C.SHIPS[cls], Lf = k.len * 3, xb = 0.33 * Lf, xs = -0.67 * Lf, B = k.beam * 3, N = 32, st = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, fore = PP.clamp((u - 0.72) / 0.28, 0, 1), aft = PP.clamp((0.1 - u) / 0.1, 0, 1);
      const bow = 1 - Math.pow(fore, 1.4), tail = 1 - 0.25 * aft;
      /* the forecastle a deck higher than the waist; the stem rakes forward */
      const fc = u > 0.58 ? 8 : 0;
      st.push({ x: xs + (xb - xs) * u, xw: xs + (xb - xs) * u - 0.04 * Lf * fore, d: B * 0.5 * bow * tail, w: B * 0.46 * bow * tail, z: 9 + fc + 5 * fore * fore });
    }
    return { st, Lf, B };
  })());
  /* her own deck from the bridge, the bow or the stern: the boat's, or (kind "escort") an escort's, with her gun
   * forward and her depth-charge rails and throwers aft */
  function ownBoat(g, S, f, cx, cy, brg, now, Wd, Ht, s = S.sub, H = hullOf(s.cls), eye = C.EYE.bridge, kind = "sub", at = null) {
    const st = H.st, NEAR = 2, L = Det.light(S);
    const r = PP.angDiff(s.hdg, brg), cr = Math.cos(r), sr = Math.sin(r);
    /* an escort looking aft sees it from her after lookout instead, over the throwers and the rails: the eye slides
     * back and down as the look swings past the beam */
    const aft = kind === "escort" ? PP.clamp((Math.abs(r) - 1.75) / 0.6, 0, 1) : 0, sl = aft * aft * (3 - 2 * aft);
    /* at: an eye somewhere else on her ({ x, y, z }, feet): the gun layer's, at the deck gun */
    const ox = at ? at.x : kind === "sub" ? -6 : sl * -0.36 * H.Lf, oy = at ? at.y : 0; eye = at ? at.z : PP.lerp(eye, 23, sl);
    const cam = ([x, y, z]) => [(x - ox) * cr + (y - oy) * sr, -(x - ox) * sr + (y - oy) * cr, z];
    const scr = ([fw, la, z]) => [cx + f * la / fw, cy + f * (eye - z) / fw];
    const cut = (a, b) => { const t = (NEAR - a[0]) / (b[0] - a[0]); return [NEAR, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    /* the sea on her: a boat low in the water (going down, or coming up) has it this many feet up her sides, over
     * her casing when she is awash. What is under it is seen through it, dim and green */
    const sink = kind === "sub" ? Math.max(0, s.depth) : 0, seaTint = K.dim("#0f3039", L);
    /* the water over a part darkens it the more there is: bands a few feet deep, each a shade darker */
    const BANDS = [0, 2.5, 6, 1e9], SHADE = [0.55, 0.72, 0.86];
    const under = (col, band = 0) => K.mix(col, seaTint, SHADE[band]);
    const clipZ = (pts, zc, keepUp) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ina = keepUp ? a[2] >= zc : a[2] < zc, inb = keepUp ? b[2] >= zc : b[2] < zc;
        if (ina) out.push(a);
        if (ina !== inb) { const t = (zc - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zc]); }
      }
      return out;
    };
    /* a shape cut at the near plane, then put on the screen */
    const fill0 = (pts, col) => {
      const c = pts.map(cam), out = [];
      for (let i = 0; i < c.length; i++) { const a = c[i], b = c[(i + 1) % c.length]; if (a[0] >= NEAR) out.push(a); if ((a[0] >= NEAR) !== (b[0] >= NEAR)) out.push(cut(a, b)); }
      if (out.length > 2) K.poly(g, out.map(scr), col);
    };
    const fill = (pts, col) => {
      if (sink < 0.05) return fill0(pts, col);
      let rest = clipZ(pts, sink, false);
      const up = clipZ(pts, sink, true);
      /* under the surface, band by band down from it */
      for (let k = 0; k < SHADE.length && rest.length > 2; k++) {
        const zc = sink - BANDS[k + 1], band = k === SHADE.length - 1 ? rest : clipZ(rest, zc, true);
        if (band.length > 2) fill0(band, under(col, k));
        if (k < SHADE.length - 1) rest = clipZ(rest, zc, false);
      }
      if (up.length > 2) fill0(up, col);
    };
    /* a line, cut at the near plane and at the screen's edges, and seen through the water where it is under it */
    const seg = (p, q, col) => {
      if (sink >= 0.05 && (p[2] < sink) !== (q[2] < sink)) {
        const t = (sink - p[2]) / (q[2] - p[2]), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, sink];
        return p[2] < sink ? (seg0(p, m, under(col)), seg0(m, q, col)) : (seg0(p, m, col), seg0(m, q, under(col)));
      }
      return seg0(p, q, sink >= 0.05 && p[2] < sink ? under(col, (sink - Math.min(p[2], q[2])) > 6 ? 2 : (sink - Math.min(p[2], q[2])) > 2.5 ? 1 : 0) : col);
    };
    const seg0 = (p, q, col) => {
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
    const dab = (x, y, len, a, z = sink) => {
      const c = cam([x, y, z]); if (c[0] < NEAR) return;
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
    /* a boat's planes and rudder, at the water by her bow and stern: drawn before her hull, so it hides the ones
     * behind it. The planes tilt as she goes up or down, the rudder swings with the helm */
    if (kind === "sub") {
      const finC = K.dim("#525c66", L), finE = K.dim("#7f8892", L), xs0 = st[0].x, xb0 = st[st.length - 1].x;
      const tilt = PP.clamp(s.vz / C.DIVE.crash, -1, 1) * 0.5, rud = PP.clamp(PP.angDiff(s.hdg, s.ordHdg) * 2.5, -0.6, 0.6);
      const fin = (x, sd, span, ch, z, a) => {
        const w0 = wAt(x), y0 = sd * w0, y1 = sd * (w0 + span), dz = Math.sin(a) * ch / 2;
        fill([[x + ch / 2, y0, z - dz], [x + ch / 2, y1, z - dz], [x - ch / 2, y1, z + dz], [x - ch / 2, y0, z + dz]], finC);
        seg([x + ch / 2, y0, z - dz], [x + ch / 2, y1, z - dz], finE);
      };
      for (const sd of [-1, 1]) { fin(xb0 - H.Lf * 0.07, sd, 7, 4, 2.4, tilt); fin(xs0 + H.Lf * 0.04, sd, 8, 4.5, 1, -tilt * 0.7); }
      const rx = xs0 - 1;
      fill([[rx, 0, -0.5], [rx, 0, 5.5], [rx - Math.cos(rud) * 6, Math.sin(rud) * 6, 5.5], [rx - Math.cos(rud) * 6, Math.sin(rud) * 6, -0.5]], finC);
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
    /* the sea washing on her where it meets her: along her sides at the water, and over her casing where it is
     * awash, flecks that come and go, more as she makes way */
    if (sink > 0.5) {
      const wash = PP.clamp(0.35 + sp / 20, 0.35, 0.9);
      for (let i = 0; i < st.length; i++) {
        const p = st[i];
        for (const k of [-1, 1]) {
          if (p.z > sink) { if (K.hash(i * 2 + (k > 0), tt, 47) < 0.6) dab(p.x, k * (p.w + (p.d - p.w) * PP.clamp(sink / p.z, 0, 1) + 0.3), 2.5, wash * 0.8); }
          else if (p.z > sink - 2.5 && K.hash(i * 2 + (k > 0), tt, 48) < 0.5) dab(p.x, k * p.d * K.hash(i, tt, 49), 3, wash * 0.6);
        }
      }
    }
    /* an escort's fittings, as her crew see them from the bridge, near enough to make out each one: forward her gun
     * (two on a destroyer, the second raised over the first), the hedgehog once she has it and the anchor gear;
     * aft her funnel, boats, tubes and pom-pom, the throwers along each side and the rails at the stern. The
     * charges are hers as they are: a thrower or a rail emptied by a pattern shows bare until its crew load it,
     * and the racks of reserve thin out as she uses them */
    /* her fittings, as solids: the deck under a point, faces shaded by the sun, upright prisms with only the sides
     * toward the eye drawn, and every fitting drawn far to near so the nearer covers the further */
    const Lf = H.Lf, xb = st[st.length - 1].x, xs = st[0].x, parts = [];
    const deck = x => { for (let i = 1; i < st.length; i++) if (st[i].x >= x) { const p = st[i - 1], q = st[i], u = (x - p.x) / (q.x - p.x || 1); return { z: p.z + (q.z - p.z) * u, d: p.d + (q.d - p.d) * u }; } return st[st.length - 1]; };
    /* the sun's side of a face: lit, or in its own shade */
    const sun = PP.angDiff(s.hdg, V.sunPos(S.t).az), sx_ = Math.cos(sun), sy_ = Math.sin(sun);
    const shade = (col, nx, ny) => K.dim(K.mix(col, "#0d1015", PP.clamp(0.32 - (nx * sx_ + ny * sy_) * 0.3, 0, 0.6)), L);
    /* an upright solid: its outline on the deck, its sides from z0 to z1, the ones toward the eye drawn, its top */
    const prism = (pts, z0, z1, col, top = col) => {
      const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ex = (a[0] + b[0]) / 2, ey = (a[1] + b[1]) / 2;
        let nx = b[1] - a[1], ny = a[0] - b[0];
        if ((ex - mx) * nx + (ey - my) * ny < 0) { nx = -nx; ny = -ny; }
        if ((ex - ox) * nx + (ey - oy) * ny >= 0) continue;
        const n = Math.hypot(nx, ny) || 1;
        fill([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], shade(col, nx / n, ny / n));
      }
      if (eye > z1) fill(pts.map(([x, y]) => [x, y, z1]), K.dim(top, L));
    };
    /* outlines: a rectangle along an axis th (radians off her bow, to starboard), and a round one */
    const rect = (x, y, th, u0, u1, v0, v1) => { const c = Math.cos(th), sn = Math.sin(th); return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]); };
    const ring = (x, y, rx, ry = rx, n = 10) => Array.from({ length: n }, (_, i) => [x + Math.cos(i / n * PP.TAU) * rx, y + Math.sin(i / n * PP.TAU) * ry]);
    const put = (x, y, draw) => parts.push([Math.hypot(x - ox, y - oy), draw]);
    /* (from the bridge, what stands round the eye itself is left out; from the gun, nothing is) */
    const drawParts = () => parts.filter(p => p[0] > (at ? 0 : 9)).sort((a, b) => b[0] - a[0]).forEach(p => p[1]());
    /* a gun's blast, over everything, from its muzzle along its line of fire: a jet of flame that flares and is gone
     * in a quarter of a second, and its cordite smoke rolling forward, swelling, left astern as she steams on */
    const drawBlasts = blasts => {
      const lit = PP.clamp(L + 0.25, 0.3, 1), aftFt = Math.abs(s.spd) * 1.689;
      const blob = (pt, rFt, col) => { const q = cam(pt); if (q[0] < NEAR) return; const [px, py] = scr(q), r = PP.clamp(f * rFt / q[0], 1, 46); g.fillStyle = col; K.disc(g, px, py, r, r * 0.8); };
      for (const b of blasts) {
        if (b.age >= b.life) continue;
        const at = (u, up) => [b.p[0] + b.c * u - aftFt * b.age, b.p[1] + b.sn * u, b.p[2] + up];
        const sm = b.age / Math.min(b.life, 2.5);
        if (sm < 1) for (let i = 3; i >= 0; i--) {
          const u = b.sz * (5 + i * 6 + b.age * 14), c0 = Math.round((70 + 90 * sm) * lit);
          blob(at(u, b.sz * (0.5 + b.age * 2.5 + i * 0.4)), b.sz * (2.4 + i * 1.3 + b.age * 5), `rgba(${c0},${c0},${c0 + 6},${(0.55 * (1 - sm) * (1 - i * 0.12)).toFixed(2)})`);
        }
        if (b.age < 0.25) {
          const a = 1 - b.age / 0.25, len = b.sz * (4 + 12 * Math.min(1, b.age / 0.05));
          for (let i = 6; i >= 0; i--) {
            const v = i / 6, u = len * v;
            blob([b.p[0] + b.c * u, b.p[1] + b.sn * u, b.p[2]], b.sz * (0.7 + 2.6 * v) * (0.5 + 0.5 * a), v < 0.3 ? `rgba(255,248,226,${a.toFixed(2)})` : v < 0.65 ? `rgba(255,206,120,${(0.92 * a).toFixed(2)})` : `rgba(255,138,56,${(0.75 * a).toFixed(2)})`);
          }
        }
      }
    };
    if (kind === "escort") {
      const X = C.ESC_SIDE, k = C.SHIPS[s.cls];
      const d = PP.Escort.racks(s), res = PP.Escort.reserve(s), full = PP.clamp(res / (X.charges - X.throwers * 2 - X.rails), 0, 1);
      const GREY = "#7a8189", LIGHT = "#9aa1a8", DARK = "#2c3035", DRUM = "#454c54", DRUMT = "#7a838c", SHIELD = "#6c737b";
      /* a depth charge: a drum on its side, its ends athwartships */
      const charge = (x, y, z, th = 0) => { prism(rect(x, y, th, -0.75, 0.75, -1.15, 1.15), z, z + 1.5, DRUM, DRUMT); seg([x, y - 1.15, z + 1.5], [x, y + 1.15, z + 1.5], K.dim("#a7b0b8", L)); };

      /* the guard rails: stanchions along her edges, the wire along their heads */
      const rail = K.dim("#8a9096", L);
      for (const sd of [-1, 1]) {
        let last = null;
        for (let x = xs + 4; x < xb - 6; x += 9) {
          const q = deck(x), y = sd * (q.d - 0.6), p = [x, y, q.z + 3.2];
          put(x, y, () => seg([x, y, q.z], p, rail));
          if (last) { const a = last; put((a[0] + x) / 2, y, () => seg(a, p, rail)); }
          last = p;
        }
      }
      /* a gun: its ring, its shield, its barrel trained where the engine has it (Escort.guns), run back as it
       * fires; the flash at the muzzle */
      const GS = PP.Escort.guns(S, s), mount = key => GS.find(o => o.g.k === key), blasts = [];
      const gun = (gx, gz, o) => {
        const th = o.rel, age = o.load > 0 ? o.g.reload - o.load : 99, fired = age < 0.3;
        const back = fired ? 1.6 : 0, c = Math.cos(th), sn = Math.sin(th), at = u => [gx + u * c, u * sn];
        put(gx, 0, () => {
          prism(ring(gx, 0, 3.6), gz, gz + 0.9, GREY, LIGHT);
          const barrel = () => prism(rect(gx, 0, th, 3 - back, 15.5 - back, -0.4, 0.4), gz + 3.9, gz + 4.7, DARK, "#4a5057");
          const [bx, by] = at(9), [rx, ry] = at(-2.6), bd = Math.hypot(bx - ox, by), sd = Math.hypot(gx - ox, 0);
          if (bd > sd) barrel();
          /* the shield, raked at its front edges; from behind, its open back with the breech and the layer's seat */
          prism([[-2.6, -3], [1.2, -3.3], [3, -2], [3, 2], [1.2, 3.3], [-2.6, 3]].map(([u, v]) => [gx + u * c - v * sn, u * sn + v * c]), gz + 0.9, gz + 6.4, SHIELD, LIGHT);
          if ((ox - rx) * -c + (0 - ry) * -sn > 0) {
            fill([[-2.62, -2.2], [-2.62, 2.2]].flatMap(([u, v], i) => { const p = [gx + u * c - v * sn, u * sn + v * c]; return i ? [[p[0], p[1], gz + 1.6], [p[0], p[1], gz + 5.4]] : [[p[0], p[1], gz + 5.4], [p[0], p[1], gz + 1.6]]; }), K.dim("#121417", L));
            prism(rect(gx, 0, th, -2.4, -0.6, -0.7, 0.7), gz + 3.4, gz + 4.8, "#4a5057", "#6a7178");
          }
          if (bd <= sd) barrel();
        });
        blasts.push({ p: [gx + c * (16 - back), sn * (16 - back), gz + 4.4], c, sn, age, sz: 1, life: o.g.reload - 0.1 });
      };
      const fc = x => deck(x).z;
      if (mount("A")) gun(xb * 0.62, fc(xb * 0.62), mount("A"));
      if (mount("B")) { const bx = xb * 0.4, bz = fc(bx) + 4; put(bx - 1, 0, () => prism(ring(bx, 0, 4.8, 4.8, 12), fc(bx), bz, GREY, LIGHT)); gun(bx, bz, mount("B")); }
      if (mount("X")) { const xx = -0.46 * Lf; gun(xx, deck(xx).z, mount("X")); }
      /* the hedgehog's bed on the forecastle: twenty-four spigots, a bomb on each while she has a salvo left */
      if (C.monthOf(S.t) >= X.hedgehogFrom || (s.hhLeft || 0) > 0) {
        const hx = xb * 0.8, hz = fc(hx), on = (s.hhLeft || 0) > 0;
        put(hx, 0, () => {
          prism(rect(hx, 0, 0, -3.5, 3.5, -4.5, 4.5), hz, hz + 1.2, GREY, LIGHT);
          for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
            const px = hx - 2.6 + r * 1.7, py = -3.8 + c * 1.52;
            seg([px, py, hz + 1.2], [px + 0.6, py, hz + 2.6], rail);
            if (on) prism(ring(px + 0.6, py, 0.55, 0.55, 6), hz + 2.4, hz + 3.6, DRUM, DRUMT);
          }
        });
      }
      /* the capstan and the cables to the hawse pipes */
      { const cx0 = xb * 0.9, cz = fc(cx0), q = deck(xb * 0.97), ch = K.dim("#1c1f23", L);
        put(cx0, 0, () => { for (const sd of [-1, 1]) seg([cx0, sd * 1.2, cz + 0.4], [xb * 0.97, sd * (q.d - 1.5), q.z + 0.2], ch); prism(ring(cx0, 0, 1.4), cz, cz + 1.6, GREY, LIGHT); }); }

      /* her funnel, low enough that the stern shows over it */
      const fx = -0.2 * Lf, fz = deck(fx).z, top = Math.min(fz + 15, eye - 6);
      put(fx, 0, () => { prism(ring(fx, 0, 7, 4.6, 12), fz, top - 1.5, "#666d75", "#666d75"); prism(ring(fx, 0, 7, 4.6, 12), top - 1.5, top, "#17191c", "#0b0c0e"); });
      /* her boats on their davits, either side abaft the funnel */
      for (const sd of [-1, 1]) {
        const bx = -0.29 * Lf, q = deck(bx), by = sd * (q.d - 2.4);
        put(bx, by, () => {
          for (const dx of [-6.5, 6.5]) seg([bx + dx, sd * q.d, q.z], [bx + dx, by, q.z + 7.5], rail);
          prism([[bx - 8, by], [bx - 6, by - 2.4], [bx + 6, by - 2.4], [bx + 8, by], [bx + 6, by + 2.4], [bx - 6, by + 2.4]], q.z + 4, q.z + 6, "#b5b0a3", "#d2cdbf");
          prism([[bx - 6.5, by], [bx - 5, by - 1.6], [bx + 5, by - 1.6], [bx + 6.5, by], [bx + 5, by + 1.6], [bx - 5, by + 1.6]], q.z + 5.9, q.z + 6, "#6e5a44", "#6e5a44");
        });
      }
      /* a destroyer's torpedo tubes on the centreline */
      if ((k.guns || 1) >= 2) {
        const tx = -0.37 * Lf, tz = deck(tx).z;
        put(tx, 0, () => { prism(ring(tx, 0, 3.2), tz, tz + 1, GREY, LIGHT); for (const v of [-1.8, -0.6, 0.6, 1.8]) prism(rect(tx, 0, 0, -9, 9, v - 0.45, v + 0.45), tz + 1.2, tz + 2.2, "#5d646b", "#80878e"); });
      }
      /* the pom-pom in its tub, aft (on a destroyer between the funnel and the tubes), trained as the engine has it,
       * its barrels flashing as it fires */
      const pm = mount("pom");
      if (pm) { const ax = ((k.guns || 1) >= 2 ? -0.28 : -0.5) * Lf, az = deck(ax).z, th = pm.rel, c = Math.cos(th), sn = Math.sin(th), age = pm.load > 0 ? pm.g.reload - pm.load : 99;
        put(ax, 0, () => {
          prism(ring(ax, 0, 3.4, 3.4, 8), az, az + 3, GREY, "#3a3f45");
          prism(rect(ax, 0, th, -1.5, 1.5, -1.6, 1.6), az + 2, az + 4, SHIELD, LIGHT);
          for (const v of [-0.7, 0.7]) prism(rect(ax - v * sn, v * c, th, 1.5, 6, -0.25, 0.25), az + 3.4, az + 3.9, DARK, DARK);
        });
        blasts.push({ p: [ax + c * 6.5, sn * 6.5, az + 3.6], c, sn, age, sz: 0.45, life: pm.g.reload - 0.1 }); }
      /* the throwers, four a side, the aftmost first, each with a charge on its arbor while loaded and a rack of
       * reserve beside it */
      for (const [key, sd] of [["P", -1], ["S", 1]]) for (let i = 0; i < X.throwers; i++) {
        const tx = xs + Lf * (0.06 + i * 0.03), q = deck(tx), ty = sd * (q.d - 3.2), loaded = i < d[key], rk = Math.round(3 * full);
        put(tx, ty, () => {
          /* the rack beside it, its charges in a row along the deck */
          for (let j = 0; j < rk; j++) charge(tx + 2.4 + j * 1.8, ty - sd * 0.6, q.z);
          /* the thrower: its base, its barrel cocked outboard, the charge on its arbor */
          prism(rect(tx, ty, 0, -0.9, 0.9, -0.9, 0.9), q.z, q.z + 0.8, DARK, GREY);
          prism(rect(tx, ty + sd * 0.5, 0, -0.45, 0.45, -0.5, 0.5), q.z + 0.6, q.z + 1.7, "#4e555c", GREY);
          if (loaded) charge(tx, ty + sd * 0.9, q.z + 1.6);
        });
      }
      /* the rails at the stern: the loaded charges at their ends, the next to go aftmost, and the racks of reserve
       * running forward along them */
      for (const sd of [-1, 1]) {
        const ry = sd * H.B * 0.17, zq = deck(xs + 10).z, rails = K.dim("#9097a0", L), rows = Math.round(10 * full);
        put(xs + 20, ry, () => {
          for (const dy of [-1.3, 1.3]) seg([xs + 0.5, ry + dy, zq + 0.3], [xs + 40, ry + dy, zq + 0.3], rails);
          for (let p = 0; p < X.rails / 2 + rows; p++) {
            const j = p * 2 + (sd > 0 ? 1 : 0), x = xs + 2 + p * 2.6;
            if (p < X.rails / 2 ? j < d.R : true) charge(x, ry, zq + 0.3);
          }
        });
      }
      drawParts();
      drawBlasts(blasts);
    }
    /* the limber holes along her casing, and the foam working at her waterline */
    const hole = K.dim("#0d1015", L), slap = PP.clamp(0.12 + sp / 24 + S.wx.sea * 0.04, 0, 0.7);
    if (kind === "sub") for (let i = 5; i < st.length - 6; i++) for (let h = 0; h < 4; h++) {
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
    /* a boat's fittings, as her bridge watch see them: the deck gun on the casing forward, stowed fore and aft; the
     * jumping wire from the bridge over the bow to the net cutter on her stem; the hatches and bollards on the
     * casing. (Her planes and rudder, at the water, are drawn before her hull) */
    if (kind === "sub") {
      const GREY = "#5d6670", LIGHT = "#7f8892", DARK = "#1d2228", HULLC = "#525c66", wire = K.dim("#8e969e", L), stem = st[st.length - 1];
      /* the jumping wire and the net cutter */
      put(xb * 0.55, 0, () => seg([10, 0, 19], [stem.x - 1.5, 0, stem.z + 4.5], wire));
      put(xb - 2, 0, () => { seg([stem.x - 1.5, 0, stem.z + 4.5], [stem.x - 1, 0, stem.z], wire); prism(rect(stem.x - 2.5, 0, 0, -1, 1.2, -0.15, 0.15), stem.z, stem.z + 2.2, GREY, LIGHT); });
      /* the hatches, flush with the casing, and the bollards in pairs at its edges */
      for (const [hx, hw] of [[xb * 0.62, 2.2], [xs * 0.5, 2.2], [xb * 0.3, 1.4]]) { const q = deck(hx); put(hx, 0, () => fill(rect(hx, 0, 0, -hw, hw, -1.4, 1.4).map(([x, y]) => [x, y, q.z + 0.05]), K.dim(DARK, L))); }
      for (const bx of [xb * 0.8, xs * 0.72]) for (const sd of [-1, 1]) { const q = deck(bx), by = sd * (q.d - 0.7); put(bx, by, () => prism(ring(bx, by, 0.45, 0.45, 6), q.z, q.z + 0.9, GREY, LIGHT)); }
      /* the deck gun: pedestal, cradle, the layer's and trainer's seats either side, the barrel run out over it;
       * trained where its crew last turned it (fore and aft, stowed, unless they have been told otherwise), run back
       * as it fires */
      const blasts = [];
      if (C.SUBS[s.cls].shells > 0) {
        const G = subGun(s, H), gx = G.x, gz = G.z, big = G.big, th = s.gun.rel || 0, c = Math.cos(th), sn = Math.sin(th);
        const age = s.gun.reload > 0 ? C.GUN.reload - s.gun.reload : 99, back = age < 0.3 ? 1.4 * big : 0, gp = (u, v) => [gx + u * c - v * sn, u * sn + v * c];
        put(gx, 0, () => {
          prism(ring(gx, 0, 1.7 * big, 1.7 * big, 8), gz, gz + 0.6, GREY, LIGHT);
          prism(rect(gx, 0, th, -0.8, 0.8, -0.7, 0.7), gz + 0.6, gz + 2.8 * big, GREY, LIGHT);
          prism(rect(gx, 0, th, -1.8 * big, 1.6 * big, -1.1 * big, 1.1 * big), gz + 2.8 * big, gz + 3.8 * big, "#4a525b", LIGHT);
          for (const sd of [-1, 1]) { const [px, py] = gp(-0.6 * big, sd * 1.9 * big); prism(rect(px, py, th, -0.5, 0.5, -0.45, 0.45), gz + 2.4 * big, gz + 3.2 * big, DARK, GREY); }
          prism(rect(gx, 0, th, -2.6 * big - back, 15 * big - back, -0.3 * big, 0.3 * big), gz + 3.8 * big, gz + 4.5 * big, "#3a4148", "#68717a");
          prism(rect(gx, 0, th, -2.9 * big - back, -1.6 * big - back, -0.55 * big, 0.55 * big), gz + 3.6 * big, gz + 4.7 * big, DARK, "#4a525b");
        });
        const [mx, my] = gp(15 * big - back, 0);
        blasts.push({ p: [mx, my, gz + 4.15 * big], c, sn, age, sz: big, life: C.GUN.reload - 0.1 });
      }
      /* her tower: the bridge's shell, rounded at the front, its coaming catching the light, the periscope standards
       * over it; abaft it the lower platform (the wintergarten), railed, with its light gun. From the bridge the shell
       * is under the eye and left out; from the gun it stands up over the deck aft */
      const tz0 = deck(0).z, TW = 4.6, plan = [[10, 0], [8.5, -2.8], [5, -TW], [-11, -TW], [-13, -3], [-13, 3], [-11, TW], [5, TW], [8.5, 2.8]], coam = tz0 + 11.5;
      put(-1, 0, () => {
        prism(plan, tz0, coam, "#4a535d", "#30373f");
        for (let i = 0; i < plan.length; i++) { const a = plan[i], b = plan[(i + 1) % plan.length]; seg([a[0], a[1], coam], [b[0], b[1], coam], K.dim("#9aa2aa", L)); }
        prism(rect(6, 0, 0, -1, 1, -2.2, 2.2), coam - 0.6, coam + 0.6, "#3e464f", "#6a737c");
        for (const [px, h] of [[-3, 9], [-6.5, 7]]) prism(ring(px, 0, 0.6, 0.6, 6), coam, coam + h, "#3e464f", "#6a737c");
      });
      put(-17, 0, () => {
        const wz = tz0 + 8;
        prism([[-13, -3.8], [-21, -2.8], [-21, 2.8], [-13, 3.8]], tz0, wz, "#4a535d", "#565f69");
        for (const [px, py] of [[-14, -3.6], [-17, -3.3], [-20.5, -2.6], [-20.5, 0], [-20.5, 2.6], [-17, 3.3], [-14, 3.6]]) seg([px, py, wz], [px, py, wz + 3], wire);
        seg([-14, -3.6, wz + 3], [-20.5, -2.6, wz + 3], wire); seg([-20.5, -2.6, wz + 3], [-20.5, 2.6, wz + 3], wire); seg([-20.5, 2.6, wz + 3], [-14, 3.6, wz + 3], wire);
        prism(ring(-17.5, 0, 0.8, 0.8, 6), wz, wz + 2.2, GREY, LIGHT);
        prism(rect(-17.5, 0, Math.PI, 0.4, 5.5, -0.15, 0.15), wz + 2, wz + 2.4, DARK, GREY);
      });
      drawParts();
      drawBlasts(blasts);
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
        /* a torpedo away: the air that blew it out of the tube boils up just ahead of the tube's mouth */
        case "fired": { const tp = (S.torps || []).find(q => q.id === e.id); if (tp) { const bx = tp.x + PP.hx(tp.hdg) * 25, by = tp.y + PP.hy(tp.hdg) * 25; FX.add({ k: "boil", x: bx, y: by, r: 11, life: 6, seed: Math.floor(Math.random() * 1e4) }); FX.splash(bx, by, 0.5); } break; }
        /* a dud: a dull thud against her side, a little water thrown up */
        case "torpDud": FX.add({ k: "column", x: e.x, y: e.y, h: 16, w: 6, life: 1 }); break;
        /* a noisemaker let go: its bubbles fizzing up where it was released, for as long as it works */
        case "decoyAway": { const q = (S.decoys || [])[(S.decoys || []).length - 1]; if (q) FX.add({ k: "fizz", x: q.x, y: q.y, r: 14, life: C.DECOY.life, seed: Math.floor(Math.random() * 1e4) }); break; }
        case "dcBoom": { const at = tossed.at.get(e.id); tossed.at.delete(e.id); FX.charge(at ? at[0] : e.x, at ? at[1] : e.y, e.z); } R.shake = Math.max(R.shake, PP.clamp(14 - e.d / 25, 0, 14)); break;
        case "bombs": FX.add({ k: "column", x: e.x + 30, y: e.y, h: 80, w: 25, life: 2.2 }); R.shake = Math.max(R.shake, 8); break;
        /* an escort's gun: from the one you are aboard, a jolt (its blast is drawn at the muzzle, with her deck); from
         * another, the flash of it where she is. Then the shell's fall on the boat, a moment later at a shell's speed */
        case "escortGun": {
          const sh = (S.ships || []).find(q => q.id === e.id), f = S.side === "escorts" && PP.Escort.flag(S);
          if (!sh) break;
          if (f && f.id === sh.id) R.shake = Math.max(R.shake, e.k === "pom" ? 1.5 : 3);
          else FX.add({ k: "flash", x: sh.x, y: sh.y, h: 15, r: 30, life: 0.25 });
          break;
        }
        case "eGunHit": { const b = (S.subs || []).find(q => q.id === e.id); if (b) FX.shell(b.x, b.y, true, e.d / C.SHELL_YPS); break; }
        case "eGunMiss": FX.shell(e.x, e.y, false, e.d / C.SHELL_YPS); break;
        case "shellHit": if (S.side === "escorts") { const b = (S.subs || []).find(q => q.id === e.by); if (b) FX.shell(b.x, b.y, true); } break;
        /* the boat you are in, hit: it jolts (on the escorts' side a boat hit is someone else's trouble) */
        case "hullHit": {
          if (S.side !== "escorts") R.shake = Math.max(R.shake, 4 + e.sev * 20);
          const s = (S.subs || []).find(q => q.id === e.by);
          if (s && e.sev >= 0.15) FX.oil(s.x, s.y, s.depth, e.sev >= 0.4 ? 1 : 0);
          break;
        }
        case "subLost": { const s = (S.subs || []).find(q => q.id === e.by); if (s) FX.oil(s.x, s.y, s.depth, 2); break; }
      }
    }
  };

  /* ---- the title's lookout: a convoy at dusk, from abeam ---- */
  /* the title: the plot under red light, the pack closing on the convoy (main.js plays it) */
  R.title = (cv, D, now) => {
    const g = cv.getContext("2d"), Wd = cv.width, Ht = cv.height;
    g.imageSmoothingEnabled = false;
    const conv = D.convoys[0];
    if (!conv) return;
    const was = R.safe;
    R.safe = { t: 6, b: 6, tr: 6, br: Ht };
    /* the convoy two thirds across, clear of the menu on the left */
    const z = PP.Chart.ZOOMS[3];
    PP.Chart.draw(g, D, { chartZoom: 3, chartAt: { x: conv.x - Wd * 0.2 * z, y: conv.y + Ht * 0.05 * z }, track: [], title: true }, {}, now);
    R.safe = was; R.labels = [];
  };
  R.titleScope = (cv, D, now) => {
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
