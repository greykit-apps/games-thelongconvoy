/* PumaPack -- the dashboard: every instrument of the vessel you are aboard
 * on one screen, as the 1990 game had it, in our own art and the boat's
 * red light.
 *
 * The view out (the periscope, the bridge, the escort's bridge) in the big
 * window; the map in a small one to its left, with the timing, AUTO / USER
 * CONTROL and the message window under it; the gauges along the foot. A
 * submarine's: the telegraph, the compass, the depth, the battery and fuel,
 * the tubes, the snorkel and the radar warning. An escort's: the telegraph,
 * the compass, the sonar scope and its P/A switch, the charges' depth, the
 * racks and the hedgehog. The gauges are drawn here; their readings are the
 * HUD's labels (PP.Render.lab) and their buttons the HUD's (R.dash.buttons,
 * hud.js), so every word is real text and every control a real button. */
"use strict";
(() => {
  const K = PP.K, C = PP.C, Sub = PP.Sub, R = PP.Render, D = PP.Dash = {};
  const PLATE = "#140705", PLATE2 = "#1d0b09", EDGE = "rgba(255,110,80,.3)", INK = "#0b0504", TICK = "#c27662", DIM = "#6e3a2e", AMBER = "#ffc65a", HOT = "#ff3d24", GREEN = "#8fe3a1";
  const lab = (id, html, x, y, cls = "", at = "cm") => R.lab("d:" + id, html, x, y, cls, at);
  const plate = (g, x, y, w, h) => { K.rect(g, x, y, w, h, PLATE); K.rect(g, x, y, w, 1, EDGE); K.rect(g, x, y + h - 1, w, 1, EDGE); K.rect(g, x, y, 1, h, EDGE); K.rect(g, x + w - 1, y, 1, h, EDGE); };
  const well = (g, x, y, w, h) => { K.rect(g, x - 1, y - 1, w + 2, h + 2, EDGE); K.rect(g, x, y, w, h, INK); };

  /* ---- the layout, in canvas pixels, from the size of the screen ---- */
  /* minBand: the least height the gauges' band must keep (an escort's dials over her charges need it) */
  D.layout = (Wd, Ht, minBand = 0) => {
    /* on a squarer screen the view gives up some height, for the gauges' band to stack in; on a wide one it gives
     * up what the band needs at least, and stays a wide window */
    const m = 6, lw = Math.round(Wd * 0.25), vx = m + lw + m, vw = Wd - vx - m, strip = 16;
    const vh = Math.min(Math.round(Ht * (Wd / Ht < 1.55 ? 0.46 : 0.55)), Ht - 2 * m - strip - 6 - minBand);
    const by = m + vh + strip + 6, bh = Ht - by - m;
    return {
      view: { x: vx, y: m, w: vw, h: vh }, strip: { x: vx, y: m + vh + 2, w: vw, h: strip },
      map: { x: m, y: m, w: lw, h: Math.round(Ht * 0.3) },
      left: { x: m, y: m + Math.round(Ht * 0.3) + 4, w: lw, h: Ht - (m + Math.round(Ht * 0.3) + 4) - m },
      bottom: { x: vx, y: by, w: vw, h: bh },
    };
  };

  /* ---- the gauges ---- */
  const dial = (g, cx, cy, r) => { K.disc(g, cx, cy, r + 2, r + 2, EDGE); K.disc(g, cx, cy, r + 1, r + 1, PLATE2); K.ring(g, cx, cy, r - 3, DIM); };
  const at = (cx, cy, r, a) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  const needle = (g, cx, cy, r, a, col, w = 2) => { const [x, y] = at(cx, cy, r, a); K.line(g, cx, cy, x, y, col, w); K.disc(g, cx, cy, 2, 2, col); };
  const tick = (g, cx, cy, r0, r1, a, col) => { const [x0, y0] = at(cx, cy, r0, a), [x1, y1] = at(cx, cy, r1, a); K.line(g, x0, y0, x1, y1, col, 1); };
  /* a sweep from -135 to +135 degrees, v 0..1 */
  const SW = 135 * PP.DEG, sweep = v => -SW + 2 * SW * PP.clamp(v, 0, 1);

  function compass(g, cx, cy, r, hdg, ord) {
    dial(g, cx, cy, r);
    for (let d = 0; d < 360; d += 30) tick(g, cx, cy, r - (d % 90 ? 6 : 9), r - 2, d * PP.DEG, d === 0 ? AMBER : TICK);
    const [ox, oy] = at(cx, cy, r - 2, ord); K.disc(g, ox, oy, 2, 2, AMBER);
    needle(g, cx, cy, r - 7, hdg, AMBER, 2);
  }
  /* the depth gauge: a little past crush depth at full scale, test depth amber and crush red on it; periscope depth a
   * broad green band on the rim, the whole of which a click takes for periscope depth; the ordered depth a dot, hers
   * the needle */
  const depthTop = D.depthTop = s => Math.max(Sub.crushDepth(s), 100) * 1.1;
  D.PD_SNAP = 0.07;
  /* how long the emergency blow's and the crash dive's buttons wait for their second click */
  const ARM_MS = D.ARM_MS = 3000;
  function depthGauge(g, cx, cy, r, s) {
    dial(g, cx, cy, r);
    const top = depthTop(s), test = Sub.testDepth(s), crush = Sub.crushDepth(s), pd = C.PD / top;
    for (let a = sweep(pd - D.PD_SNAP); a <= sweep(pd + D.PD_SNAP); a += 0.025) tick(g, cx, cy, r - 6, r - 1, a, "rgba(143,227,161,.35)");
    for (let d = 0; d <= top; d += 50) tick(g, cx, cy, r - (d % 100 ? 5 : 8), r - 2, sweep(d / top), d >= crush ? HOT : d >= test ? "#ff9f3a" : TICK);
    tick(g, cx, cy, r - 12, r - 1, sweep(pd), GREEN);
    const [lx, ly] = at(cx, cy, r - 19, sweep(pd));
    lab("pdMark", "PD", lx, ly, "dl sm green", "cm");
    const [ox, oy] = at(cx, cy, r - 2, sweep(s.ordDepth / top)); K.disc(g, ox, oy, 2, 2, AMBER);
    needle(g, cx, cy, r - 7, sweep(s.depth / top), s.depth > test ? HOT : AMBER, 2);
  }
  /* the sonar scope: each contact ours hold, out to reach yards; aim, where what she fires should go (a cross) */
  function sonarScope(g, cx, cy, r, S, f, now, reach = 6000, aim = null) {
    dial(g, cx, cy, r); K.ring(g, cx, cy, Math.round(r * 0.5), DIM);
    const hd = f.hdg;
    tick(g, cx, cy, 0, r - 3, hd, DIM);
    if (f.ping) { const a = (now / 900) % PP.TAU; tick(g, cx, cy, 0, r - 3, a, "rgba(143,227,161,.5)"); }
    for (const q of PP.Escort.mine(S)) {
      const ai = q.ai; if (!ai.datum || !ai.contact || S.t - ai.contact > 900) continue;
      const b = PP.angTo(f.x, f.y, ai.datum.x, ai.datum.y), d = PP.dist(f.x, f.y, ai.datum.x, ai.datum.y), age = S.t - ai.contact;
      const [x, y] = at(cx, cy, Math.min(r - 4, (r - 4) * d / reach), b);
      K.disc(g, x, y, 2, 2, age < 60 ? AMBER : age < 300 ? "#c98a3c" : DIM);
    }
    if (aim) {
      const [x, y] = at(cx, cy, Math.min(r - 4, (r - 4) * aim.rng / reach), aim.brg), col = aim.over ? AMBER : "#c98a3c";
      K.rect(g, x - 3, y, 7, 1, col); K.rect(g, x, y - 3, 1, 7, col);
    }
    K.disc(g, cx, cy, 1.5, 1.5, "#fff0e6");
  }

  /* ---- the view and the small map, each in its own window ---- */
  const win = { v: null, m: null };
  const canvasFor = (k, w, h) => { if (!win[k] || win[k].width !== w || win[k].height !== h) { win[k] = K.mk(w, h); win[k].getContext("2d").imageSmoothingEnabled = false; } return win[k]; };
  function inWindow(g, S, ui, now, r, k, draw) {
    const c = canvasFor(k, r.w, r.h), cg = c.getContext("2d"), was = R.safe, n0 = R.labels.length;
    R.safe = { t: 4, b: 4, tr: 0, br: r.h };
    cg.fillStyle = INK; cg.fillRect(0, 0, r.w, r.h);
    const out = draw(cg, r.w, r.h);
    R.safe = was;
    /* the readings it set, moved to where the window sits */
    for (let i = n0; i < R.labels.length; i++) { R.labels[i].x += r.x; R.labels[i].y += r.y; }
    well(g, r.x, r.y, r.w, r.h); g.drawImage(c, r.x, r.y);
    return out;
  }

  /* ---- the dashboard ---- */
  D.draw = (g, S, ui, now, Wd, Ht) => {
    const esc = S.side === "escorts", L = D.layout(Wd, Ht, 164), B = [];
    const btn = (id, html, x, y, w, h, o = {}) => B.push(Object.assign({ id, html, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, o));
    K.rect(g, 0, 0, Wd, Ht, "#0d0504");
    /* the view out */
    const v = L.view;
    const inner = inWindow(g, S, ui, now, v, "v", (cg, w, h) => R.viewInto(cg, S, ui, now, w, h));
    if (R.last) { R.last.ox = v.x; R.last.oy = v.y; }
    const st = L.strip, bw = 58;
    plate(g, st.x, st.y, st.w, st.h);
    btn("lookL", "&#9664; Left", st.x + 2, st.y + 2, bw, st.h - 4, { hold: "aL" });
    btn("lookR", "Right &#9654;", st.x + st.w - bw - 2, st.y + 2, bw, st.h - 4, { hold: "aR" });
    if (inner === "scope") {
      btn("scopeUD", S.sub.scope.up ? "Scope down" : "Scope up", st.x + bw + 6, st.y + 2, 58, st.h - 4, { act: "scope", on: S.sub.scope.up });
      btn("power", S.sub.scope.hi ? "Low power" : "High power", st.x + bw + 68, st.y + 2, 58, st.h - 4, { act: "zoom" });
    } else btn("glasses", ui.bino ? "Glasses down" : "Glasses", st.x + bw + 6, st.y + 2, 58, st.h - 4, { act: "zoom", on: !!ui.bino });
    if (esc) {
      /* her guns: dark with nothing up in sight; live (the trigger's amber, its lamp lit) when one is on her target,
       * in reach and loaded; reloading, the bar along the foot filling as the next round goes in; the tip says which
       * bear, or why none do */
      const f = PP.Escort.flag(S), tg = f && PP.Escort.target(S, f), G = tg ? PP.Escort.guns(S, f, tg) : [], bear = G.filter(o => o.bears), ready = bear.some(o => o.load <= 0);
      const why = !tg ? "" : ready ? "fire (G)" : bear.length ? "loading" : G.some(o => o.inArc && o.inRange) ? "training round" : G.some(o => o.inArc) ? "out of range of those that bear" : "none bear on the target";
      const names = bear.map(o => o.g.k === "pom" ? "the pom-pom" : o.g.k).join(", ");
      btn("guns", "<i class=\"lamp\"></i>Guns <kbd>G</kbd>", st.x + bw + 68, st.y + 2, 50, st.h - 4, { act: "gun", dim: !tg,
        cls: "guns" + (tg ? " danger" + (ready ? " ready" : bear.length ? " loading" : "") : ""),
        fill: bear.length && !ready ? Math.max(...bear.map(o => 1 - o.load / o.g.reload)) : undefined,
        label: !tg ? "Guns, nothing in sight" : `Guns, ${ready ? "ready" : why}`,
        title: tg ? `Guns: ${tg.b.name}, ${Math.round(tg.d).toLocaleString()} yd; ${bear.length ? `${names} bear${bear.length === 1 ? "s" : ""}; ` : ""}${why}` : "Guns: no target in sight (G)" });
      btn("next", "Next escort <kbd>N</kbd>", st.x + bw + 122, st.y + 2, 78, st.h - 4, { act: "boatNext", dim: PP.Escort.mine(S).length < 2, title: "Take command of the next escort (N)" });
    }
    if (!esc) {
      const s0 = S.sub;
      /* the deck gun, as an escort's: Man gun, then a lamp lit when it is laid on its target and loaded, a bar
       * filling while it reloads; the tip says at what, or why not */
      const g0 = s0.gun, gq = g0.on && PP.Weapons.gunTarget(S), gv = gq && PP.Weapons.gunSight(S, gq), gl = g0.reload > 0;
      const gReady = gv && gv.on && g0.man >= 1 && !gl && s0.shells > 0;
      const gWhy = !g0.on ? "" : g0.man < 1 ? "manning" : !gq ? "nothing in reach" : !gv.inArc ? "abaft its arc" : !gv.on ? "training round" : gl ? "loading" : s0.shells <= 0 ? "no shells" : "fire (G)";
      btn("gun", g0.on ? "<i class=\"lamp\"></i>Gun <kbd>G</kbd>" : "Man gun", st.x + bw + (inner === "scope" ? 128 : 68), st.y + 2, 50, st.h - 4, { act: "gun", dim: !Sub.surfaced(s0),
        cls: "guns" + (gq ? " danger" + (gReady ? " ready" : gl ? " loading" : "") : ""), fill: gq && gl ? 1 - g0.reload / C.GUN.reload : undefined,
        label: g0.on ? `Deck gun, ${gReady ? "ready" : gWhy}` : "Man the deck gun",
        title: !Sub.surfaced(s0) ? "The deck gun: on the surface only" : !g0.on ? "Man the deck gun: its crew lay it on the target themselves (G)" : `Deck gun${gq ? `: ${gq.name}, ${PP.num(Math.round(PP.dist(s0.x, s0.y, gq.x, gq.y) / 50) * 50)} yd` : ""}; ${gWhy}. ${s0.shells} shells. Shift+G secures it` });
      btn("select", "Select <kbd>T</kbd>", st.x + st.w - bw - 70, st.y + 2, 64, st.h - 4, { act: "lock" });
      btn("swing", "On target <kbd>H</kbd>", st.x + st.w - bw - 138, st.y + 2, 64, st.h - 4, { act: "onHer" });
    }
    /* the small map */
    const m = L.map;
    ui.mini = ui.mini || { chartZoom: 3, chartAt: null };
    /* (as the title's plot: no names, no rings, at this size they would crowd it) */
    const mui = { chartZoom: ui.mini.chartZoom, chartAt: null, track: ui.track, sel: ui.sel, title: true, mini: true };
    inWindow(g, S, ui, now, m, "m", (cg, w, h) => PP.Chart.draw(cg, S, mui, { tracks: true }, now));
    btn("mapIn", "+", m.x + m.w - 30, m.y + m.h - 14, 13, 12, { act: "miniIn" });
    btn("mapOut", "&minus;", m.x + m.w - 15, m.y + m.h - 14, 13, 12, { act: "miniOut" });
    btn("mapFull", "Map <kbd>2</kbd>", m.x + 2, m.y + m.h - 14, 50, 12, { act: "st2" });
    /* the left column: timing, AUTO / USER CONTROL, the screens, the message window */
    const lf = L.left; plate(g, lf.x, lf.y, lf.w, lf.h);
    const me = esc ? PP.Escort.flag(S) : S.sub, auto = !!(me && me.auto);
    let y = lf.y + 4;
    lab("time", `<span class="c">Timing</span><b>${PP.Engine.tcNow(S)}x</b>`, lf.x + 6, y + 7, "dl", "lm");
    btn("tcD", "&#9664;", lf.x + lf.w - 50, y, 21, 14, { act: "tcD" });
    btn("tcU", "&#9654;", lf.x + lf.w - 26, y, 21, 14, { act: "tcU" });
    y += 18;
    lab("clock", `${C.timeStr(S.t)} <span class="c">${C.dateStr(S.t)}</span>`, lf.x + 6, y + 6, "dl", "lm");
    y += 16;
    btn("auto", auto ? "AUTO" : "USER CONTROL", lf.x + 4, y, lf.w - 8, 16, { act: "auto", on: !auto, cls: auto ? "auto" : "user", title: auto ? "On AUTO, following orders: J, or a touch of the helm, gives you control" : "You have control: J hands over to AUTO, following orders" });
    y += 20;
    const scr = esc ? [["Map", "st2"], ["Status", "st4"], ["Log", "st6"]] : [["Map", "st2"], ["Damage", "st3"], ["Status", "st4"], ["Log", "st6"]];
    const sw = Math.floor((lf.w - 8 - (scr.length - 1) * 3) / scr.length);
    scr.forEach(([n, a], i) => btn("scr" + n, n, lf.x + 4 + i * (sw + 3), y, sw, 14, { act: a }));
    y += 18;
    D.msgRect = { x: lf.x + 4, y, w: lf.w - 8, h: lf.y + lf.h - y - 4 };
    well(g, D.msgRect.x, D.msgRect.y, D.msgRect.w, D.msgRect.h);
    /* the gauges */
    const bt = L.bottom; plate(g, bt.x, bt.y, bt.w, bt.h);
    if (!esc) subGauges(g, S, ui, now, bt, btn); else escGauges(g, S, ui, now, bt, btn);
    R.dash = { L, buttons: B, msg: D.msgRect, inner };
  };

  /* a submarine's band, as an escort's: the telegraph, the compass and the depth across the top, each set by a click
   * on its rim, an odometer under each; her target beside them; under them her torpedoes, laid out as she is, bow to
   * the right: the spreads on the left, her plan in the middle with its tubes, reloads and deck fittings and the
   * trigger under it, her battery, fuel and depth controls on the right */
  function subGauges(g, S, ui, now, bt, btn) {
    const s = S.sub, k = C.SUBS[s.cls], e = C.era(C.monthOf(S.t)), W = PP.Weapons;
    const PH = PP.clamp(Math.round(bt.h * 0.45), 84, 104), BW = 34;
    const r = Math.max(14, Math.min(Math.floor((bt.h - 6 - 18 - PH - 16) / 2), Math.floor((bt.w - 154 - BW - 10) / 6)));
    const top = bt.y + 6, gy = top + r, oy = top + 2 * r + 9;
    const dialsEnd = bt.x + 10 + 6 * r + 36 + BW + 10, cpw = bt.x + bt.w - 6 - (dialsEnd + 12), wide = cpw >= 96;
    let gx = bt.x + 10 + r;
    /* the telegraph */
    rim(btn, "rimTel", gx, gy, r, "rim:tel", "Telegraph", "Ring it: a word, or the rim (W, S)");
    bigTelegraph(g, gx, gy, r, C.BELLS, C.BELL_F, s.bell, s.spd / Math.max(0.1, Sub.maxKn(s)), Sub.maxKn(s), Sub.bellMax(s), btn);
    odo("tele", Math.abs(s.spd), 3, 1, gx, oy, "kn");
    /* the compass and the helm */
    gx += r * 2 + 18;
    rim(btn, "rimHdg", gx, gy, r, "rim:hdg", "Compass", "Steer for a heading: click it on the rim (A, D)");
    compass(g, gx, gy, r, s.hdg, s.ordHdg);
    odo("hdg", ((s.hdg / PP.DEG) % 360 + 360) % 360, 3, 0, gx, oy, "", 360);
    btn("helmL", "&#9664;", gx - r - 8, gy + r - 10, 14, 12, { hold: "hL", label: "Helm to port", title: "Helm to port (A)" });
    btn("helmR", "&#9654;", gx + r - 6, gy + r - 10, 14, 12, { hold: "hR", label: "Helm to starboard", title: "Helm to starboard (D)" });
    /* the depth */
    gx += r * 2 + 18;
    rim(btn, "rimDep", gx, gy, r, "rim:dep", "Depth", "Order a depth: click it on the rim; anywhere on the green is periscope depth");
    depthGauge(g, gx, gy, r, s);
    odo("depth", s.depth, 3, 0, gx, oy, Sub.surfaced(s) ? "surfaced" : "ft", 0, s.depth > Sub.testDepth(s) ? "red" : "");
    btn("up", "&#9650;", gx + r - 6, gy - r - 2, 14, 12, { act: "shallower", label: "Shallower", title: "Shallower (Q)" });
    btn("down", "&#9660;", gx + r - 6, gy - r + 12, 14, 12, { act: "deeper", label: "Deeper", title: "Deeper (E)" });
    /* the dive bubble beside it, the emergency blow over it and the crash dive under it */
    bubble(g, S, s, gx + r + 12, top - 2, BW, oy + 6 - top, btn);
    /* her target, beside the dials or down the right */
    if (wide) subAttack(g, S, s, dialsEnd + 12, top, Math.min(cpw, 170), oy + 7 - top);
    else subAttack(g, S, s, bt.x + bt.w - 94, top, 88, bt.y + bt.h - 16 - top);
    /* the torpedoes' box */
    const px = bt.x + 6, py = oy + 10, ph = Math.max(PH, bt.y + bt.h - 16 - py), ch = ph - 6, y0 = py + 3;
    /* laid out as she is, bow to the right: her battery and fuel at the stern end, her plan, and the spreads fanning
     * out of her bow. No wider than keeps her plan to a boat's length for her height: on a wide screen the box
     * stops there */
    const room = bt.w - (wide ? 12 : 104), MW = PP.clamp(Math.round(room * 0.15), 60, 84), SPW = PP.clamp(Math.round(room * 0.2), 56, 100);
    const pw = Math.min(room, MW + SPW + 16 + Math.round((ch - 18) * 4.2)), rh = Math.floor((ch - 6) / 4);
    well(g, px, py, pw, ph);
    const spx = px + pw - 3 - SPW;
    for (let n = 1; n <= 4; n++) {
      const y = y0 + (n - 1) * (rh + 2);
      spreadRow(g, spx, y, rh, n, n === s.spread);
      btn("spr" + n, SPW >= 60 ? `Spread ${n}` : String(n), spx, y, SPW, rh, { act: "spr" + n, cls: "pick row", on: n === s.spread,
        label: `Spread of ${n}`, title: n === 1 ? "One torpedo at a time (V)" : `A spread of ${n}, fanned ${(C.SPREAD / PP.DEG).toFixed(1)} degrees apart (V)` });
    }
    const mx = px + 3, sx = mx + MW + 5, sw = spx - 5 - sx;
    boat(g, S, s, sx, y0, sw, ch - 18, now, btn);
    /* the one trigger: the gun when it is manned, else the bank's tubes; lit when the lamp says on target */
    const loaded = Sub.loaded(s, s.bank), est = W.est(S), sol = est && W.solve(S, est, s.bank), sv = s.salvo;
    const word = sv ? `Firing&hellip; ${sv.k} of ${sv.n} away` : !loaded ? "No tubes loaded" : `Fire ${Math.min(s.spread, loaded)} ${s.bank === "F" ? "forward" : "aft"}`;
    btn("fire", word, sx, y0 + ch - 16, sw, 16, { act: "fire", cls: "danger" + (sv ? " on" : loaded && sol && sol.ok ? " ready" : ""), dim: !loaded && !sv,
      title: `Fire the ${s.bank === "F" ? "forward" : "after"} tubes, a spread of ${s.spread} (Space)` });
    /* her battery and her fuel, side by side: each a bar filling from the foot, its name over it, its reading on
     * drums under it */
    const ch0 = Sub.charge(s), cw = Math.floor(MW / 2);
    for (const [i, id, word, v, col, low] of [[0, "bat", ch0.rate > 0 ? "Charging" : "Battery", s.bat, GREEN, 0.2], [1, "fuel", "Fuel", s.fuel, AMBER, 0.15]]) {
      const cxm = mx + i * cw + Math.round(cw / 2), lowNow = v < low;
      lab(id + "C", word, cxm, y0 + 4, "dl sm" + (id === "bat" && ch0.rate > 0 ? " green" : ""), "cm");
      vmeter(g, cxm - 4, y0 + 10, 8, ch - 27, v, lowNow ? HOT : col);
      odo(id, v * 100, 3, 0, cxm, y0 + ch - 8, "%", 0, lowNow ? "red" : "");
    }
    /* the radar warning and silent running, along the foot */
    const metox = e.metox && s.metoxT !== undefined && S.t - s.metoxT < 6, fy = bt.y + bt.h - 13;
    btn("metox", metox ? "RADAR!" : "Metox", bt.x + bt.w - 226, fy, 46, 12, { cls: metox ? "alarm" : "", dim: !e.metox, title: e.metox ? "The radar warning: it lights when an escort's radar sweeps your boat" : "Not fitted until Year III" });
    btn("silent", "Silent", bt.x + bt.w - 178, fy, 46, 12, { act: "silent", on: s.silent, title: "Silent running: quiet, a third at most" });
    /* her name, and her hull, along the foot */
    lab("name", `<b>${PP.esc(s.name)}</b> <span class="c">${PP.esc(k.name)} · ${PP.esc(s.capt || "")}</span>`, bt.x + 8, bt.y + bt.h - 7, "dl", "lm");
    lab("hull", `<span class="c">Hull</span><b>${Math.round(s.hull * 100)}%</b>`, bt.x + bt.w - 8, bt.y + bt.h - 7, "dl" + (s.hull < 0.5 ? " red" : ""), "rm");
    btn("next", "Next boat <kbd>N</kbd>", bt.x + bt.w - 128, bt.y + bt.h - 13, 72, 12, { act: "boatNext", dim: S.subs.filter(q => !q.lost).length < 2, title: "Take command of the next boat in the pack (N)" });
  }

  /* a reading as a bar, filled from the left */
  function vmeter(g, x, y, w, h, v, col) { well(g, x, y, w, h); const n = Math.round(PP.clamp(v, 0, 1) * h); K.rect(g, x, y + h - n, w, n, col); for (let i = 1; i < 10; i++) K.rect(g, x, y + Math.round(h * i / 10), w, 1, INK); }

  /* the dive bubble: her rate up or down, the bubble riding in a tube, the middle level; the rate ordered by hand an
   * amber mark. A click (or a drag) on the tube orders that rate and holds it, wherever it takes her: past test
   * depth, onto the bottom (the captain's call); about the middle, she holds her depth. Over it the emergency blow,
   * every tank blown, straight up and no diving for minutes after; under it the crash dive, down to a safe depth */
  function bubble(g, S, s, x, y, w, h, btn) {
    const R = C.DIVE, locked = s.noDive > S.t, surf = Sub.surfaced(s);
    /* each takes a second click to order (main.js): the first arms it, and it asks until the moment passes */
    const arm = PP.game.ui.arm, armed = k => !!arm && arm.k === k && performance.now() - arm.t < ARM_MS;
    btn("eblow", armed("eblow") ? "Blow?" : "Blow", x, y, w, 13, { act: "eblow?", cls: "danger" + (s.eblow ? " on" : "") + (armed("eblow") ? " armed" : ""), dim: surf, label: "Emergency blow",
      title: surf ? "Emergency blow: already on the surface" : `Emergency blow: every tank blown, straight up. You cannot dive again for ${Math.round(R.lock / 60)} minutes: a surface fight. Click twice to order it` });
    btn("crash", armed("crash") ? "Crash?" : "Crash", x, y + h - 13, w, 13, { act: "crash?", cls: "danger" + (armed("crash") ? " armed" : ""), dim: locked, label: "Crash dive",
      title: locked ? "The tanks are blown: no diving yet" : "Crash dive: down fast, to a safe depth. Click twice to order it (C at once)" });
    const t0 = y + 17, t1 = y + h - 17, mid = Math.round((t0 + t1) / 2), half = (t1 - t0) / 2 - 3, cx = x + Math.round(w / 2);
    const Y = v => Math.round(mid + PP.clamp(v / (v < 0 ? R.blow : R.crash), -1, 1) * half);
    well(g, cx - 5, t0, 10, t1 - t0);
    for (const f of [-1, -0.5, 0.5, 1]) K.rect(g, cx - 9, Math.round(mid + f * half), 3, 1, TICK);
    K.rect(g, cx - 10, mid, 20, 1, locked ? HOT : TICK);
    K.poly(g, [[cx - 8, t0 + 1], [cx - 11, t0 + 5], [cx - 5, t0 + 5]], DIM); K.poly(g, [[cx - 8, t1 - 1], [cx - 11, t1 - 5], [cx - 5, t1 - 5]], DIM);
    if (s.ordRate !== null && s.ordRate !== undefined) { const oy = Y(s.ordRate); K.poly(g, [[cx + 6, oy], [cx + 10, oy - 3], [cx + 10, oy + 3]], AMBER); }
    g.fillStyle = "rgba(220,236,240,.9)"; K.disc(g, cx, Y(s.vz), 3, 2.5);
    if (locked) lab("lockT", `${Math.floor((s.noDive - S.t) / 60)}:${String(Math.floor((s.noDive - S.t) % 60)).padStart(2, "0")}`, cx, t1 + 1, "dl sm red", "cm");
    const pv = s.ordRate === null || s.ordRate === undefined ? 50 : Math.round(50 + (s.ordRate < 0 ? s.ordRate / R.blow : s.ordRate / R.crash) * 50);
    const fps = v => `${Math.abs(v).toFixed(1)} feet a second ${v < 0 ? "up" : "down"}`;
    btn("rate", "", x, t0 - 2, w, t1 - t0 + 4, { cls: "slide", slide: { y0: t0, y1: t1, lo: 0, max: 100, step: 1, act: "rate", v: pv, text: s.ordRate ? fps(s.ordRate) : "holding depth" }, label: "Dive rate",
      title: `Rate of climb or dive: ${Math.abs(s.vz) < 0.1 ? "level" : fps(s.vz)}. Click or drag the tube to order a rate and hold it, past test depth; going down the boat levels off short of crush depth, and a second order takes it deeper. The middle holds the depth` });
  }

  /* a dial's rim, as a button: a click on it sets the dial to where it was clicked (hud.js works out the angle); the
   * middle is left to what is drawn and clicked there */
  function rim(btn, id, cx, cy, r, act, label, title) {
    btn(id, "", cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4, { act, rim: { inner: 0.45 }, cls: "rim", label, title });
  }

  /* a spread as it leaves her bow: its torpedoes' tracks fanning out ahead, to the right */
  const FANS = { 1: [0], 2: [-0.5, 0.5], 3: [0, -1, 1], 4: [-1.5, -0.5, 0.5, 1.5] };
  function spreadRow(g, x, y, h, n, lit) {
    const cy = Math.round(y + h / 2), x0 = x + 4, len = 24, dy = Math.max(2, h * 0.2);
    K.rect(g, x0 - 3, cy, 3, 1, "rgba(255,190,170,.3)");
    for (const o of FANS[n]) K.line(g, x0, cy, x0 + len, cy + o * dy, lit ? AMBER : "#c98a3c", 1);
  }

  /* her plan, bow to the right: the forward tubes in her bow and the after ones in her stern, two rows of them, a
   * tube green when it is ready to fire (it blinks out as it goes), flashing yellow while the crew reload it, empty
   * when it is; the reloads racked in the rooms behind them, set off from the tubes. On her deck the gun forward of the tower; the snorkel's and the radar's masts on the
   * tower, each with its name written down it for its button; the decoys' button aft; under her the two banks, the one picked lit */
  const tBlinks = new Map();
  let lastTubes = null;
  function boat(g, S, s, x, y, w, h, now, btn) {
    const k = C.SUBS[s.cls], e = C.era(C.monthOf(S.t)), RL = C.TORP.reload;
    if (lastTubes && lastTubes.id === s.id) for (const b of ["F", "A"]) s.tubes[b].forEach((v, i) => { if (v !== 0 && lastTubes[b][i] === 0) tBlinks.set(b + i, now); });
    lastTubes = { id: s.id, F: s.tubes.F.slice(), A: s.tubes.A.slice() };
    const yc = Math.round(y + h * 0.56), hb = PP.clamp(Math.round(h * 0.12), 5, 10), t = yc - hb, b = yc + hb;
    const xs = x + 3, xb = x + w - 3, Lw = xb - xs, X = u => Math.round(xs + Lw * u);
    /* the hull: blunt at the stern, fine at the bow; the tower on it */
    const pt = [[xs, yc - Math.round(hb * 0.5)], [X(0.1), t], [X(0.8), t], [xb, yc], [X(0.8), b], [X(0.1), b], [xs, yc + Math.round(hb * 0.5)]];
    K.poly(g, pt.map(([px, py]) => [px + Math.sign(px - (xs + xb) / 2), py + Math.sign(py - yc)]), "#6e4a3e");
    K.poly(g, pt, "#24140f");
    const tx0 = X(0.4), tx1 = tx0 + PP.clamp(Math.round(Lw * 0.13), 26, 44), tt = t - Math.max(hb + 2, 12);
    K.rect(g, tx0 - 1, tt - 1, tx1 - tx0 + 2, t - tt + 1, "#6e4a3e"); K.rect(g, tx0, tt, tx1 - tx0, t - tt, "#3a2620");
    /* the snorkel's mast (up when it is), the radar's, the gun on the deck forward */
    const snk = !!s.snork, tm = Math.round((tx0 + tx1) / 2), mx = Math.round((tx0 + tm) / 2), rx = Math.round((tm + tx1) / 2);
    if (e.snorkel) K.rect(g, mx, tt - (snk ? 8 : 3), 1, snk ? 8 : 3, snk ? AMBER : TICK);
    if (s.radar) { K.rect(g, rx, tt - 4, 1, 4, Sub.radarWorks(s) ? AMBER : TICK); K.rect(g, rx - 2, tt - 5, 5, 1, Sub.radarWorks(s) ? AMBER : TICK); }
    /* the deck gun forward of the tower: its pedestal, breech and barrel, run out toward the bow; amber when manned */
    const gxp = Math.max(X(0.6), tx1 + 6), gc = s.gun.on ? AMBER : TICK;
    K.rect(g, gxp, t - 3, 2, 3, gc); K.rect(g, gxp - 2, t - 5, 5, 2, gc); K.rect(g, gxp + 3, t - 5, 8, 1, gc);
    /* the tubes: two rows at each end, the forward ones' mouths at her bow, the after ones' at her stern */
    const slot = (bank, i, sx, sy) => {
      const v = s.tubes[bank][i], bl = tBlinks.get(bank + i), sel = bank === s.bank;
      if (bl !== undefined && now - bl < 700) { if (Math.floor((now - bl) / 110) % 2 === 0) K.rect(g, sx - 1, sy - 1, 6, 5, "#fff6e8"); return; }
      if (bl !== undefined) tBlinks.delete(bank + i);
      /* ready, green (brighter in the bank picked); being loaded, the whole tube flashing yellow, after it has stood
       * empty a few seconds while the crew ready the next torpedo (the reload's time is the same); empty, nothing */
      if (v === 0) K.rect(g, sx, sy, 4, 3, sel ? GREEN : "#4f8a5c");
      else if (v > 0 && RL - v > 3 && Math.floor(now / 380) % 2 === 0) K.rect(g, sx, sy, 4, 3, sel ? AMBER : "#c98a3c");
    };
    const tubes = (bank, xEdge, dir) => {
      const n = s.tubes[bank].length, cols = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) { const c = Math.floor(i / 2), sx = dir > 0 ? xEdge - 5 - c * 5 : xEdge + 1 + c * 5; slot(bank, i, sx, i % 2 ? yc + 1 : yc - 4); }
      return dir > 0 ? xEdge - 5 - (cols - 1) * 5 : xEdge + 1 + cols * 5;
    };
    const fIn = tubes("F", X(0.84), 1), aIn = s.tubes.A.length ? tubes("A", X(0.04), -1) : X(0.04);
    /* the reloads, racked in the rooms behind the tubes */
    const rack = (n, x0, dir) => { for (let i = 0; i < n; i++) K.rect(g, x0 + dir * (8 + Math.floor(i / 2) * 3), i % 2 ? yc + 2 : yc - 3, 2, 2, "#c98a3c"); };
    rack(s.store.F, fIn, -1); rack(s.store.A, aIn, 1);
    /* the decoys, released from her stern: their canisters racked on the deck over it, gone as each is let go */
    const dLeft = s.decoys || 0, dx0 = X(0.1);
    for (let i = 0; i < dLeft; i++) { const cx0 = dx0 + i * 5; K.rect(g, cx0, t - 6, 3, 6, "#c98a3c"); K.rect(g, cx0, t - 6, 3, 1, AMBER); }
    /* three buttons on her, all alike and none past her keel: the decoys' inside her forward of the after tubes; the
     * snorkel's and the radar's each its name written down from the foot of its mast, through the tower into her hull */
    const fl = Sub.loaded(s, "F"), al = Sub.loaded(s, "A"), rk = n => 8 + Math.ceil(Math.max(n, 1) / 2) * 3;
    const aEnd = s.tubes.A.length ? aIn + rk(s.store.A) + 1 : X(0.04), bh = Math.min(b - t - 2, 12);
    btn("decoy", `Decoy ${dLeft}`, aEnd + 5, yc - Math.floor(bh / 2), Math.min(40, tx0 - aEnd - 9), bh, { act: "decoy", cls: "inhull", dim: !(dLeft > 0), label: `Release a decoy, ${dLeft} left`,
      title: dLeft > 0 ? `Release a decoy: a cloud of bubbles their sonar takes for your boat; ${dLeft} left (K)` : "No decoys left" });
    const mastBtn = (id, word, mxx, o) => btn(id, word, mxx - 6, tt + 1, 12, b - tt - 3, Object.assign({ cls: "inhull vert" }, o));
    mastBtn("snorkel", "Snorkel", mx, { act: "snorkel", on: snk, dim: !e.snorkel, title: e.snorkel ? "Snorkel: runs the diesels at periscope depth, to charge and run, but loud" : "Not fitted until Year IV" });
    mastBtn("radar", "Radar", rx, { act: "radar", on: Sub.radarWorks(s), dim: !s.radar, title: s.radar ? "Radar: it sees them, and their warning gear hears it" : "No radar fitted" });
    /* the two banks: each end of her, its tubes and the reloads racked behind them, is the place to click to fire from
     * it; the bank picked in amber corners, its name and its loaded tubes under her */
    const bank = (id, word, x0, x1, n, tot, store) => {
      const on = s.bank === id[4], y0b = yc - 6, y1b = yc + 6, col = on ? AMBER : "rgba(255,190,170,.22)";
      for (const [px, py, dx, dy] of [[x0, y0b, 1, 1], [x1, y0b, -1, 1], [x0, y1b, 1, -1], [x1, y1b, -1, -1]]) { K.rect(g, Math.min(px, px + dx * 3), py, 4, 1, col); K.rect(g, px, Math.min(py, py + dy * 3), 1, 4, col); }
      lab(id + "C", `<span class="c">${word}</span><b>${n}/${tot}</b>`, Math.round((x0 + x1) / 2), b + 7, "dl sm" + (on ? " read" : ""), "cm");
      btn(id, "", x0 - 1, y0b - 1, x1 - x0 + 3, y1b - y0b + 3, { act: id, cls: "bank", on, label: `${word} tubes, ${n} of ${tot} loaded`,
        title: `${word === "Fwd" ? "Forward" : "After"} tubes: ${n} of ${tot} loaded, ${store} reloads. Click to fire from them` });
    };
    bank("bankF", "Fwd", fIn - rk(s.store.F) - 2, X(0.84) + 1, fl, k.tubesF, s.store.F);
    if (k.tubesA) bank("bankA", "Aft", X(0.04) - 1, aIn + rk(s.store.A) + 1, al, k.tubesA, s.store.A);
  }

  /* her target, beside the dials: who and where, and a lamp that says when to fire. NO TARGET, then OUT OF RANGE or
   * WRONG ANGLE (a ring round a point), ON TARGET (filled) */
  function subAttack(g, S, s, x, y, w, h) {
    well(g, x, y, w, h);
    const T = S.tdc, e = PP.Weapons.est(S), q = e && T.tgt !== null ? PP.Ships.byId(S, T.tgt) : null, sol = e && PP.Weapons.solve(S, e, s.bank);
    if (!e) {
      lab("ct", `<span class="c">Target</span><b>none</b>`, x + 4, y + 7, "dl", "lm");
      lab("ct0", "T: the nearest ship", x + 4, y + 17, "dl sm", "lm");
      lab("ct1", "H: swing to the target", x + 4, y + 25, "dl sm", "lm");
    } else {
      lab("ct", `<span class="c">Target</span><b>${q ? PP.esc(q.name) : "set"}</b>`, x + 4, y + 7, "dl", "lm");
      const rows = [["Bearing", PP.deg3(e.brg)], ["Range", PP.num(Math.round(e.rng / 50) * 50) + " yd"], ["Speed", Math.round(e.s) + " kn"], ["Angle", `${Math.round(Math.abs(e.aob) / PP.DEG)}° ${e.aob >= 0 ? "stbd" : "port"}`]];
      rows.forEach(([l, v], i) => lab("ct" + i, `<span class="c">${l}</span><b>${v}</b>`, x + 4, y + 18 + i * 9, "dl", "lm"));
    }
    const st = !e ? -1 : sol && sol.ok ? 2 : 1, ly = y + h - 9, lx = x + 9;
    K.ring(g, lx, ly, 4, st >= 0 ? AMBER : DIM);
    if (st === 1) K.disc(g, lx, ly, 1.5, 1.5, AMBER);
    if (st === 2) K.disc(g, lx, ly, 4, 4, AMBER);
    const word = st === 2 ? "ON TARGET" : st < 0 ? "NO TARGET" : sol && sol.why === "gyro" ? "WRONG ANGLE" : sol && sol.why === "range" ? "OUT OF RANGE" : "NO SOLUTION";
    lab("lamp", word, x + 17, ly, "dl lamp" + (st === 2 ? " lit" : st >= 0 ? " read" : ""), "lm");
  }

  /* an odometer under a dial: figures on drums, each rolling up to the next as the one to its right turns over
   * from 9 (HTML over the canvas, so the figures are sharp). n drums, dec of them after the point; wrap, the
   * reading that turns back to nought (a heading's 360), so nothing rolls toward it */
  function odo(id, v, n, dec, x, y, unit = "", wrap = 0, cls = "") {
    const t = Math.max(0, v) * Math.pow(10, dec), stop = wrap && t + 1 >= wrap * Math.pow(10, dec);
    let h = "";
    for (let i = n - 1; i >= 0; i--) {
      const p10 = Math.pow(10, i), roll = stop && i ? 0 : Math.max(0, t % p10 - (p10 - 1));
      const p = Math.round((Math.floor(t / p10) % 10 + roll) * 20) / 20;
      h += `<i${i < dec ? ' class="d"' : ""}><b style="transform:translateY(${(-p * 1.2).toFixed(2)}em)">01234567890</b></i>`;
      if (i === dec && dec) h += "<u>.</u>";
    }
    lab(id, `<span class="odo">${h}</span>${unit ? `<span class="c">${unit}</span>` : ""}`, x, y, "dl" + (cls ? " " + cls : ""), "cm");
  }

  /* the engine-order telegraph, big enough for its words, each word the place to click for it: the ordered
   * one lit and the handle on it, a white mark on the rim where her speed is on the same scale. bf, each bell's
   * fraction of her best speed; sp, her speed as one; kn her best, in knots; past maxBell (silent running) dimmed */
  function bigTelegraph(g, cx, cy, r, bells, bf, bell, sp, kn, maxBell, btn) {
    const n = bells.length;
    dial(g, cx, cy, r);
    K.ring(g, cx, cy, Math.round(r * 0.34), DIM);
    let made = 0;
    for (let i = 1; i < n; i++) if (sp >= bf[i - 1]) made = i - 1 + PP.clamp((sp - bf[i - 1]) / (bf[i] - bf[i - 1]), 0, 1);
    const w = Math.max(18, Math.round(r * 0.46)), h = 12;
    for (let i = 0; i < n; i++) {
      const a = sweep(i / (n - 1)), [x, y] = at(cx, cy, r * 0.64, a);
      tick(g, cx, cy, r - 7, r - 2, a, i === bell ? AMBER : TICK);
      btn("bell" + i, bells[i], x - w / 2, y - h / 2, w, h, { act: "bell" + i, cls: "tel", on: i === bell, dim: i > maxBell, title: i > maxBell ? `${bells[i]}: not while running silent` : `${bells[i]}: ${Math.round(Math.abs(bf[i]) * kn)} knots${bf[i] < 0 ? " astern" : ""}` });
    }
    needle(g, cx, cy, Math.round(r * 0.34), sweep(bell / (n - 1)), AMBER, 3);
    const [sx, sy] = at(cx, cy, r - 4, sweep(made / (n - 1)));
    K.disc(g, sx, sy, 2, 2, "#fff0e6");
  }

  /* the charges' box reads as the ship does, bow to the right: the patterns she lays astern on the left, her
   * launchers in the middle, the hedgehog's throw ahead on the right */

  /* a pattern as it lies astern, her track running to the right and the first rail on the left: a plan, not to
   * scale (a rail a few pixels on, a thrower's reach out to the side), so the three read apart at any size; a
   * doubled charge is two dots, the heavy one under it a shade darker */
  function patRow(g, x, y, h, P, lit) {
    const u = 5, a = Math.min(1, (h - 4) / 22) / 10, cy = Math.round(y + h / 2), x0 = x + 4;
    K.rect(g, x0 - 2, cy, (P.rails - 1) * u + 6, 1, "rgba(255,190,170,.16)");
    const pts = [];
    for (let i = 0; i < P.rails; i++) pts.push([i, 0]);
    for (const [after, out] of P.throws) for (const s of [-1, 1]) pts.push([after, out * s]);
    for (const [i, out] of pts) {
      const px = x0 + i * u, py = Math.round(cy + out * a);
      if (P.deep) K.rect(g, px, py, 2, 2, lit ? "#b8641a" : "#7a4428");
      K.rect(g, px - 1, py - 1, 2, 2, lit ? AMBER : "#c98a3c");
    }
  }

  /* the hedgehog's throw: her bow on the left, and ahead of it the ring its bombs come down in */
  function hhDiagram(g, x, y, w, h, lit) {
    const X = C.ESC_SIDE, cy = Math.round(y + (h - 10) / 2), bx = x + 8;
    const s = Math.min((w - 14) / (X.hhRange + X.hhRing), (h - 16) / (2 * X.hhRing + 8)), rx = bx + X.hhRange * s;
    K.poly(g, [[bx + 4, cy], [bx, cy - 2], [bx - 4, cy - 2], [bx - 4, cy + 2], [bx, cy + 2]], lit ? "#d9b9a6" : "#6e5a52");
    for (let xx = bx + 6; xx < rx - X.hhRing * s - 2; xx += 3) K.px(g, xx, cy, "rgba(255,190,170,.22)");
    for (let i = 0; i < 24; i++) {
      const an = i / 24 * PP.TAU;
      K.px(g, rx + Math.cos(an) * X.hhRing * s, cy + Math.sin(an) * X.hhRing * s, lit ? AMBER : "#8a6a4a");
    }
  }

  /* the depth the charges are set for: a slider from the surface (a line of sea, not a setting) down to the deepest,
   * a mark every 50 feet; drag it, or the arrows at its ends for a step */
  function depthSlider(g, f, x, y, w, h, btn) {
    const X = C.ESC_SIDE, lo = X.dcSet[0], hi = X.dcSet[1], cx = x + 9;
    btn("setU", "&#9650;", cx - 7, y, 14, 12, { act: "shallower", label: "Shallower", title: "Shallower (Q; Shift+Q 100 feet)" });
    btn("setD", "&#9660;", cx - 7, y + h - 12, 14, 12, { act: "deeper", label: "Deeper", title: "Deeper (E; Shift+E 100 feet)" });
    const y0 = y + 15, y1 = y + h - 15, Y = d => Math.round(y0 + d / hi * (y1 - y0));
    K.rect(g, cx - 1, y0, 3, y1 - y0 + 1, INK); K.rect(g, cx, y0, 1, y1 - y0 + 1, DIM);
    K.rect(g, cx - 5, y0, 11, 1, "#6fb2d6");
    for (let d = lo; d <= hi; d += 50) K.rect(g, cx + 3, Y(d), d % 100 ? 2 : 4, 1, TICK);
    const yy = Y(f.dcSet);
    K.rect(g, cx - 5, yy - 1, 11, 3, AMBER);
    lab("surf", "Surface", cx + 7, y0, "dl sm sea", "lm");
    lab("set", `<b>${f.dcSet}</b> <span class="c">ft</span>`, cx + 9, Math.max(yy, y0 + 8), "dl sm read", "lm");
    btn("depth", "", x, y0 - 3, w, y1 - y0 + 7, { cls: "slide", slide: { y0, y1, lo, max: hi, step: 25, act: "depth", v: f.dcSet }, label: "Charges' depth", title: `Charges set for ${f.dcSet} feet: drag for ${lo} to ${hi}` });
  }

  /* her plan, bow to the right: the throwers along each side (port above, starboard below, the aftmost first), a
   * charge in each one loaded, and the racks to her two rails at the stern, the next to go at the stern; a
   * launcher just emptied blinks out, the next one being loaded comes up as its crew work. What is below, in
   * reserve, beside her where there is room and under her where there is not; at the foot the one trigger */
  const blinks = new Map();
  let lastRacks = null;
  function ship(g, S, f, x, y, w, h, now) {
    const X = C.ESC_SIDE, d = f.dcr || { P: 0, S: 0, R: 0, tP: 0, tS: 0, tR: 0 }, res = Math.max(0, f.dcLeft - d.P - d.S - d.R);
    if (lastRacks && lastRacks.id === f.id) for (const k of ["P", "S", "R"]) for (let i = d[k]; i < lastRacks[k]; i++) blinks.set(k + i, now);
    lastRacks = { id: f.id, P: d.P, S: d.S, R: d.R };
    const slot = (k, i, sx, sy, load) => {
      const b = blinks.get(k + i);
      if (b !== undefined && now - b < 700) { if (Math.floor((now - b) / 110) % 2 === 0) K.rect(g, sx - 1, sy - 1, 5, 5, "#fff6e8"); return; }
      if (b !== undefined) blinks.delete(k + i);
      K.rect(g, sx, sy, 3, 3, i < d[k] ? AMBER : "#2a1410");
      if (i === d[k] && load > 0) K.rect(g, sx, sy, 3, 3, `rgba(255,198,90,${(0.12 + 0.55 * load).toFixed(2)})`);
    };
    /* where the reserve goes, and so how much of the box she has */
    const below = X.charges - X.throwers * 2 - X.rails, beside = w >= 140;
    const shipW = beside ? Math.min(w - 52, 160) : w, foot = y + h - 19;
    let band = foot - y, rx0, rtop, per;
    if (beside) { rx0 = x + shipW + 8; per = PP.clamp(Math.floor((x + w - rx0) / 4), 4, 11); rtop = y + 11; }
    else { rx0 = x + 2; per = PP.clamp(Math.floor((x + w - rx0) / 4), 4, 22); rtop = foot - 2 - Math.ceil(below / per) * 4; band = rtop - 11 - y; }
    lab("reserve", `<span class="c">Reserve</span><b>${res}</b>`, rx0, beside ? y + 4 : rtop - 5, "dl sm", "lm");
    for (let i = 0; i < below; i++) K.rect(g, rx0 + (i % per) * 4, rtop + Math.floor(i / per) * 4, 3, 3, i < res ? "#c98a3c" : "#2a1410");
    /* the hull, stern on the left, bow on the right */
    const yc = Math.round(y + band / 2), hb = PP.clamp(Math.round(band * 0.3), 6, 14), t = yc - Math.floor(hb / 2), b = t + hb;
    const xs = x + 4, xb = x + shipW - 2, pt = [[xs + 3, t], [xb - hb, t], [xb, yc], [xb - hb, b], [xs + 3, b], [xs, b - 3], [xs, t + 3]];
    K.poly(g, pt.map(([px, py]) => [px + Math.sign(px - (xs + xb) / 2), py + Math.sign(py - yc)]), "#6e4a3e");
    K.poly(g, pt, "#24140f");
    K.rect(g, Math.round(xs + (xb - xs) * 0.52), t + 2, Math.max(4, Math.round(hb * 0.9)), hb - 4, "#3a2620");
    /* the throwers, the aftmost first */
    const sp = PP.clamp(Math.floor((xb - xs) * 0.4 / (X.throwers - 1)), 4, 8);
    for (let i = 0; i < X.throwers; i++) {
      const sx = xs + 9 + i * sp;
      slot("P", i, sx, t - 5, d.tP / X.loadThrow);
      slot("S", i, sx, b + 2, d.tS / X.loadThrow);
    }
    /* the two rails, the charges on them rolling aft */
    const ra = yc - 3, rb = yc + 1;
    for (const ry of [ra, rb]) K.rect(g, xs + 1, ry + 1, 4 * (X.rails / 2) + 2, 1, DIM);
    for (let j = 0; j < X.rails; j++) slot("R", j, xs + 1 + Math.floor(j / 2) * 4, j % 2 ? rb : ra, d.tR / X.loadRail);
  }

  /* the attack, beside the dials: what the contact is and where, and a lamp that says when to fire. RUN IN (an
   * empty ring), STAND BY (a ring round a point), OVER HER or, for the hedgehog, IN RANGE (filled): it reads by its
   * word and its shape as well as its light */
  function attackPanel(g, f, sol, x, y, w, h) {
    well(g, x, y, w, h);
    const c = sol.contact;
    if (!c) {
      lab("ct", `<span class="c">Contact</span><b>none</b>`, x + 4, y + 7, "dl", "lm");
      lab("ct0", "Under 15 kn to listen", x + 4, y + 17, "dl sm", "lm");
      lab("ct1", "X pings, and they hear it", x + 4, y + 25, "dl sm", "lm");
    } else {
      lab("ct", `<span class="c">${c.how === "sonar" ? "Sonar" : c.how === "ear" ? "Heard" : "Sighted"}</span><b>${c.age < 60 ? "now" : Math.round(c.age / 60) + " min ago"}</b>`, x + 4, y + 7, "dl", "lm");
      const rows = [["Bearing", PP.deg3(c.brg)], ["Range", PP.num(Math.round(c.rng / 25) * 25) + " yd"], ["Depth", c.surf ? "surface" : "about " + Math.round(c.dz / 25) * 25 + " ft"]];
      rows.forEach(([l, v], i) => lab("ct" + i, `<span class="c">${l}</span><b>${v}</b>`, x + 4, y + 18 + i * 9, "dl", "lm"));
      if (!c.surf && !sol.hh && Math.abs(f.dcSet - c.dz) > 50) lab("ctw", `Charges set ${f.dcSet} ft`, x + 4, y + 45, "dl sm amber", "lm");
    }
    const st = c ? (c.over ? 2 : c.near ? 1 : 0) : -1, ly = y + h - 9, lx = x + 9;
    K.ring(g, lx, ly, 4, st >= 0 ? AMBER : DIM);
    if (st === 1) K.disc(g, lx, ly, 1.5, 1.5, AMBER);
    if (st === 2) K.disc(g, lx, ly, 4, 4, AMBER);
    lab("lamp", st === 2 ? (sol.hh ? "IN RANGE" : "OVER HER") : st === 1 ? "STAND BY" : st === 0 ? "RUN IN" : "NO CONTACT", x + 17, ly, "dl lamp" + (st === 2 ? " lit" : st >= 0 ? " read" : ""), "lm");
  }

  function escGauges(g, S, ui, now, bt, btn) {
    const f = PP.Escort.flag(S); if (!f) return;
    const k = C.SHIPS[f.cls], X = C.ESC_SIDE, sol = PP.Escort.solution(S, f), c = sol.contact;
    /* three dials across the top, the telegraph, the compass and the sonar, one size, each with its reading under it;
     * the charges under them. The charges' panel keeps its height (about two fifths of the band) whatever the screen's
     * shape, and the dials take what is left, as wide as the room clear of the buttons on the right allows */
    const PH = PP.clamp(Math.round(bt.h * 0.42), 62, 96);
    const r = Math.max(14, Math.min(Math.floor((bt.h - 6 - 18 - PH - 16) / 2), Math.floor((bt.w - 154) / 6)));
    const top = bt.y + 6, gy = top + r, oy = top + 2 * r + 9;
    /* the contact's panel: beside the dials where the band is wide enough (the charges then run its whole width),
     * down the right of the band where it is not */
    const dialsEnd = bt.x + 10 + 6 * r + 36, cpw = bt.x + bt.w - 6 - (dialsEnd + 12), wide = cpw >= 96;
    let gx = bt.x + 10 + r;
    rim(btn, "rimTel", gx, gy, r, "rim:tel", "Telegraph", "Ring it: a word, or the rim (W, S)");
    bigTelegraph(g, gx, gy, r, C.ESC_BELLS, C.ESC_BELL_F, f.bell, f.spd / k.kn, k.kn, 6, btn);
    odo("tele", Math.abs(f.spd), 3, 1, gx, oy, "kn");
    /* the compass and the helm */
    gx += r * 2 + 18;
    rim(btn, "rimHdg", gx, gy, r, "rim:hdg", "Compass", "Steer for a heading: click it on the rim (A, D)");
    compass(g, gx, gy, r, f.hdg, f.ordHdg);
    odo("hdg", ((f.hdg / PP.DEG) % 360 + 360) % 360, 3, 0, gx, oy, "", 360);
    btn("helmL", "&#9664;", gx - r - 8, gy + r - 10, 14, 12, { hold: "hL", label: "Helm to port", title: "Helm to port (A)" });
    btn("helmR", "&#9654;", gx + r - 6, gy + r - 10, 14, 12, { hold: "hR", label: "Helm to starboard", title: "Helm to starboard (D)" });
    /* the sonar scope and its P / A switch; close on a fresh contact it reaches 2,000 yards, not 6,000 */
    gx += r * 2 + 18;
    const reach = c && c.age < 120 && c.rng < 1600 ? 2000 : 6000;
    sonarScope(g, gx, gy, r, S, f, now, reach, c && { rng: c.aimRng, brg: PP.angTo(f.x, f.y, c.aim.x, c.aim.y), over: c.over });
    lab("reach", PP.num(reach) + " yd", gx, gy + Math.round(r * 0.78), "dl sm", "cm");
    btn("pa", f.ping ? "A · active" : "P · passive", gx - 26, oy - 6, 52, 12, { act: "silent", on: !!f.ping, label: f.ping ? "Sonar active, pinging" : "Sonar passive, listening", title: "Passive: listen (slow, under 15 knots). Active: ping, which they hear too (X)" });
    if (f.spd > C.DET.hydFastKn) lab("deaf", "too fast to hear", gx, gy - Math.round(r * 0.45), "dl sm amber", "cm");
    /* the charges, laid out as she is, bow to the right: the patterns stacked on the left (astern), the depth they
     * are set for, her plan with its launchers and reserve and the trigger under it, and the hedgehog on the right
     * (ahead) */
    const px = bt.x + 6, py = oy + 10, pw = bt.w - (wide ? 12 : 104), ph = Math.max(PH, bt.y + bt.h - 16 - py), SL = 38;
    well(g, px, py, pw, ph);
    const ch = ph - 6, y0 = py + 3, sel = f.patK || 0;
    const PW = PP.clamp(Math.round(pw * 0.26), 62, 120), HW = PP.clamp(Math.round(pw * 0.16), 40, 80), rh = Math.floor((ch - 4) / 3);
    C.ESC_PATTERNS.forEach((P, i) => {
      const y = y0 + i * (rh + 2), n = C.patCount(P);
      patRow(g, px + 3, y, rh, P, i === sel);
      btn("pat" + i, PW >= 60 ? `${P.name} ${n}` : String(n), px + 3, y, PW, rh, { act: "pat" + i, cls: "pick row", on: i === sel, dim: f.dcLeft < n,
        label: `${P.name} pattern, ${n} charges`, title: `${P.name} pattern: ${n} charges${P.deep ? ", in two layers" : ""}${f.dcLeft < n ? `; only ${f.dcLeft} aboard` : ""} (V)` });
    });
    const x2 = px + 3 + PW + 3, hx = px + pw - 3 - HW;
    depthSlider(g, f, x2, y0, SL, ch, btn);
    const sx = x2 + SL + 4, sw = hx - 5 - sx;
    ship(g, S, f, sx, y0, sw, ch, now);
    /* the hedgehog: its ring ahead of her, a fourth choice for the one trigger */
    const hh = C.monthOf(S.t) >= X.hedgehogFrom, hn = f.hhLeft || 0;
    hhDiagram(g, hx, y0, HW, ch, hh && hn > 0);
    btn("hedgehog", HW >= 44 ? `Hedgehog ${hn}` : String(hn), hx, y0, HW, ch, { act: "pat" + C.ESC_PATTERNS.length, cls: "pick", on: sol.hh, dim: !hh || hn <= 0,
      label: hh ? `Hedgehog, ${hn} salvoes left` : "Hedgehog, not fitted", title: hh ? `Hedgehog: a ring of 24 bombs ${X.hhRange} yards ahead, that go off only on a hull; ${hn} left (V, or F to fire it at once)` : "Not fitted until Year III" });
    /* the one trigger: what it fires, whether it is ready, and lit when the lamp says over her */
    const none = sol.hh ? hn <= 0 : f.dcLeft <= 0, P = C.ESC_PATTERNS[sel];
    const word = f.pat ? "Laying&hellip;" : none ? (sol.hh ? "Hedgehog empty" : "No charges") : sol.hh ? "Fire hedgehog" : sol.ready < sol.need ? `Lay ${sol.ready} of ${sol.need}` : "Lay charges";
    btn("pattern", word, sx, y0 + ch - 16, sw, 16, { act: "fire", cls: "danger" + (f.pat ? " on" : "") + (c && c.over && !none ? " ready" : ""), dim: none,
      title: sol.hh ? "Fire the hedgehog (Space)" : `Lay the ${P.name.toLowerCase()} pattern, ${sol.need} charges${sol.ready < sol.need ? `; ${sol.ready} loaded, the crews are reloading` : ""} (Space)` });
    if (wide) attackPanel(g, f, sol, dialsEnd + 12, top, Math.min(cpw, 170), oy + 7 - top);
    else attackPanel(g, f, sol, bt.x + bt.w - 94, top, 88, bt.y + bt.h - 16 - top);
    /* her name, and her hull, along the foot */
    const hull = Math.max(0, 1 - f.dmg / k.hp);
    lab("name", `<b>${PP.esc(f.name)}</b> <span class="c">${PP.esc(k.name)} · PDF</span>`, bt.x + 8, bt.y + bt.h - 7, "dl", "lm");
    lab("hull", `<span class="c">Hull</span><b>${Math.round(hull * 100)}%</b>`, bt.x + bt.w - 8, bt.y + bt.h - 7, "dl" + (hull < 0.5 ? " red" : ""), "rm");
  }

  /* ---- the Status screen: the vessel you are aboard, as the 1990 game's showed it ---- */
  D.status = (g, S, ui, now, Wd, Ht) => { K.rect(g, 0, 0, Wd, Ht, "#0d0504"); R.dash = { status: true, buttons: [] }; };
  D.statusHTML = S => {
    const esc = PP.esc;
    if (S.side === "escorts") {
      const f = PP.Escort.flag(S); if (!f) return "";
      const k = C.SHIPS[f.cls], hull = Math.max(0, 1 - f.dmg / k.hp);
      return `<div class="ht-name">${esc(f.name)}</div><div class="ht-cls">${esc(k.name)} of the Pumacity Defense Fleet · ${f.auto ? "AUTO, following orders" : "USER CONTROL"}</div>
        <table class="aids">${[["Speed", `${f.spd.toFixed(1)} kn, ${C.ESC_BELLS[f.bell]}`], ["Course", PP.deg3(f.hdg)], ["Hull", Math.round(hull * 100) + "%" + (f.fire > 0.1 ? ", on fire" : "")],
          ["Sonar", f.ping ? "Active: pinging" : "Passive: listening"], ["Depth charges", `${f.dcLeft} left, set for ${f.dcSet} ft`], ["Hedgehog", C.monthOf(S.t) >= C.ESC_SIDE.hedgehogFrom ? `${f.hhLeft} salvoes` : "not fitted"],
          ["Order", (C.ESC_ORDERS.find(o => o[0] === f.ord) || C.ESC_ORDERS[0])[1]]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>`;
    }
    const s = S.sub, k = C.SUBS[s.cls], e = C.era(C.monthOf(S.t)), hurt = Sub.SYS.filter(([q]) => s.sys[q] > 0.001).map(([q, n]) => `${n} ${s.sys[q] >= 0.5 ? "out" : "damaged"}`);
    return `<div class="ht-name">${esc(s.name)}</div><div class="ht-cls">${esc(k.name)} class of the Wolf Empire · Captain ${esc(s.capt || "")} · ${s.auto ? "AUTO, following orders" : "USER CONTROL"}</div>
      <table class="aids">${[["Depth", Sub.surfaced(s) ? "on the surface" : Math.round(s.depth) + " ft" + (Sub.snorkeling(s) ? ", snorkelling" : "")], ["Speed", `${s.spd.toFixed(1)} kn, ${C.BELLS[s.bell]}`], ["Course", PP.deg3(s.hdg)],
        ["Battery", Math.round(s.bat * 100) + "%"], ["Fuel", Math.round(s.fuel * 100) + "%"], ["Torpedoes", `${Sub.torpsLeft(s)} (forward ${Sub.loaded(s, "F")} loaded, aft ${Sub.loaded(s, "A")})`], ["Noisemakers", s.decoys || 0],
        ["Hull", Math.round(s.hull * 100) + "%" + (s.water > 0.05 ? `, ${Math.round(s.water * 100)}% water` : "")], ["Damage", hurt.length ? hurt.join(", ") : "none"],
        ["Snorkel", e.snorkel ? (s.snork ? "up" : "down") : "not fitted"], ["Radar warning", e.metox ? (s.metoxT !== undefined && S.t - s.metoxT < 6 ? "an escort's radar on the boat" : "quiet") : "not fitted"],
        ["Order", PP.Orders.name(s.orders)]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>`;
  };
})();
