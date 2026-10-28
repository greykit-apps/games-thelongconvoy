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
  D.layout = (Wd, Ht) => {
    /* on a squarer screen the view gives up some height, for the gauges' band to stack in */
    const m = 6, lw = Math.round(Wd * 0.25), vx = m + lw + m, vw = Wd - vx - m, vh = Math.round(Ht * (Wd / Ht < 1.55 ? 0.46 : 0.55)), strip = 16;
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

  function telegraph(g, cx, cy, r, bells, ordered, spdF) {
    dial(g, cx, cy, r);
    for (let i = 0; i < bells.length; i++) tick(g, cx, cy, r - 8, r - 2, sweep(i / (bells.length - 1)), i === ordered ? AMBER : TICK);
    needle(g, cx, cy, r - 6, sweep(ordered / (bells.length - 1)), AMBER, 2);
    needle(g, cx, cy, r - 14, sweep(spdF), TICK, 1);
  }
  function compass(g, cx, cy, r, hdg, ord) {
    dial(g, cx, cy, r);
    for (let d = 0; d < 360; d += 30) tick(g, cx, cy, r - (d % 90 ? 6 : 9), r - 2, d * PP.DEG, d === 0 ? AMBER : TICK);
    const [ox, oy] = at(cx, cy, r - 2, ord); K.disc(g, ox, oy, 2, 2, AMBER);
    needle(g, cx, cy, r - 7, hdg, AMBER, 2);
  }
  function depthGauge(g, cx, cy, r, s) {
    dial(g, cx, cy, r);
    const top = Math.max(Sub.crushDepth(s), 100) * 1.1, test = Sub.testDepth(s), crush = Sub.crushDepth(s);
    for (let d = 0; d <= top; d += 50) tick(g, cx, cy, r - (d % 100 ? 5 : 8), r - 2, sweep(d / top), d >= crush ? HOT : d >= test ? "#ff9f3a" : TICK);
    tick(g, cx, cy, r - 12, r - 2, sweep(C.PD / top), GREEN);
    const [ox, oy] = at(cx, cy, r - 2, sweep(s.ordDepth / top)); K.disc(g, ox, oy, 2, 2, AMBER);
    needle(g, cx, cy, r - 7, sweep(s.depth / top), s.depth > test ? HOT : AMBER, 2);
  }
  function vbar(g, x, y, w, h, v, col) { well(g, x, y, w, h); const n = Math.round(PP.clamp(v, 0, 1) * (h - 2)); K.rect(g, x + 1, y + h - 1 - n, w - 2, n, col); for (let k = 1; k < 10; k++) K.rect(g, x + 1, y + Math.round(h * k / 10), w - 2, 1, INK); }
  function sonarScope(g, cx, cy, r, S, f, now) {
    dial(g, cx, cy, r); K.ring(g, cx, cy, Math.round(r * 0.5), DIM);
    const reach = 6000, hd = f.hdg;
    tick(g, cx, cy, 0, r - 3, hd, DIM);
    if (f.ping) { const a = (now / 900) % PP.TAU; tick(g, cx, cy, 0, r - 3, a, "rgba(143,227,161,.5)"); }
    for (const q of PP.Escort.mine(S)) {
      const ai = q.ai; if (!ai.datum || !ai.contact || S.t - ai.contact > 900) continue;
      const b = PP.angTo(f.x, f.y, ai.datum.x, ai.datum.y), d = PP.dist(f.x, f.y, ai.datum.x, ai.datum.y), age = S.t - ai.contact;
      const [x, y] = at(cx, cy, Math.min(r - 4, (r - 4) * d / reach), b);
      K.disc(g, x, y, 2, 2, age < 60 ? AMBER : age < 300 ? "#c98a3c" : DIM);
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
    const L = D.layout(Wd, Ht), esc = S.side === "escorts", B = [];
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
    if (!esc) {
      btn("select", "Select <kbd>T</kbd>", st.x + st.w - bw - 70, st.y + 2, 64, st.h - 4, { act: "lock" });
      btn("swing", "On her <kbd>H</kbd>", st.x + st.w - bw - 138, st.y + 2, 64, st.h - 4, { act: "onHer" });
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
    btn("auto", auto ? "AUTO" : "USER CONTROL", lf.x + 4, y, lf.w - 8, 16, { act: "auto", on: !auto, cls: auto ? "auto" : "user", title: auto ? "She sails under her order: J, or a touch of the helm, takes her back" : "You are sailing her: J hands her to her order" });
    y += 20;
    const scr = esc ? [["Map", "st2"], ["Status", "st4"], ["Log", "st6"]] : [["Map", "st2"], ["Damage", "st3"], ["Status", "st4"], ["Log", "st6"]];
    const sw = Math.floor((lf.w - 8 - (scr.length - 1) * 3) / scr.length);
    scr.forEach(([n, a], i) => btn("scr" + n, n, lf.x + 4 + i * (sw + 3), y, sw, 14, { act: a }));
    y += 18;
    D.msgRect = { x: lf.x + 4, y, w: lf.w - 8, h: lf.y + lf.h - y - 4 };
    well(g, D.msgRect.x, D.msgRect.y, D.msgRect.w, D.msgRect.h);
    /* the gauges */
    const bt = L.bottom; plate(g, bt.x, bt.y, bt.w, bt.h);
    /* the dials as big as the band allows, leaving the panel beside them (the tubes, or the charges) and the button column their room */
    const r = Math.max(14, Math.min(Math.round(bt.h * 0.36), Math.round(bt.w * 0.075))), gy = bt.y + 8 + r;
    const gx = bt.x + 10 + r, g3 = gx + 2 * (2 * r + 18), ph = esc ? 58 : 72;
    /* the panel beside the dials (the tubes, or the charges); on a screen too narrow for it, under them */
    let P = { x: g3 + r + (esc ? 14 : 48), y: gy - r, w: 0, h: Math.max(2 * r, ph) };
    const roomBeside = bt.x + bt.w - P.x - 98;
    if (roomBeside >= (esc ? 90 : 56)) P.w = Math.min(150, roomBeside);
    else P = { x: bt.x + 10, y: gy + r + 30, w: Math.min(170, bt.w - 116), h: Math.max(40, Math.min(ph, bt.y + bt.h - (gy + r + 30) - 14)) };
    if (!esc) subGauges(g, S, ui, now, bt, r, gx, gy, btn, P); else escGauges(g, S, ui, now, bt, btn);
    R.dash = { L, buttons: B, msg: D.msgRect, inner };
  };

  function subGauges(g, S, ui, now, bt, r, gx, gy, btn, P) {
    const s = S.sub, k = C.SUBS[s.cls], below = gy + r + 4;
    /* the telegraph */
    telegraph(g, gx, gy, r, C.BELLS, s.bell, Math.abs(s.spd) / Math.max(1, Sub.maxKn(s)));
    lab("tele", `<b>${C.BELLS[s.bell]}</b> <span class="c">${s.spd.toFixed(1)} kn</span>`, gx, below + 6, "dl", "cm");
    btn("bellU", "&#9650;", gx + r - 6, gy - r - 2, 14, 12, { act: "tU" }); btn("bellD", "&#9660;", gx + r - 6, gy - r + 12, 14, 12, { act: "tD" });
    /* the compass and the helm */
    gx += r * 2 + 18;
    compass(g, gx, gy, r, s.hdg, s.ordHdg);
    lab("hdg", `<b>${PP.deg3(s.hdg)}</b>${Math.abs(PP.angDiff(s.hdg, s.ordHdg)) > 0.02 ? `<span class="ord">${PP.deg3(s.ordHdg)}</span>` : ""}`, gx, below + 6, "dl", "cm");
    btn("helmL", "&#9664;", gx - r - 8, gy + r - 10, 14, 12, { hold: "hL" }); btn("helmR", "&#9654;", gx + r - 6, gy + r - 10, 14, 12, { hold: "hR" });
    /* the depth */
    gx += r * 2 + 18;
    depthGauge(g, gx, gy, r, s);
    lab("depth", `<b>${Sub.surfaced(s) ? "Surfaced" : Math.round(s.depth) + " ft"}</b>${Math.abs(s.ordDepth - s.depth) > 3 ? `<span class="ord">${s.ordDepth === 0 ? "surface" : s.ordDepth + " ft"}</span>` : ""}`, gx, below + 6, "dl", "cm");
    btn("up", "&#9650;", gx + r - 6, gy - r - 2, 14, 12, { act: "shallower" }); btn("down", "&#9660;", gx + r - 6, gy - r + 12, 14, 12, { act: "deeper" });
    const dy = below + 14;
    btn("pd", "PD", gx - 28, dy, 18, 12, { act: "pd" }); btn("surf", "Surf", gx - 8, dy, 22, 12, { act: "surface" }); btn("crash", "Crash", gx + 16, dy, 26, 12, { act: "crash", cls: "danger" });
    /* the battery and the fuel */
    gx += r + 14;
    const bh = r * 2;
    vbar(g, gx, gy - r, 8, bh, s.bat, s.bat < 0.2 ? HOT : GREEN); vbar(g, gx + 14, gy - r, 8, bh, s.fuel, s.fuel < 0.15 ? HOT : AMBER);
    lab("bat", `<span class="c">Bat</span>${Math.round(s.bat * 100)}`, gx + 4, below + 6, "dl sm", "cm");
    lab("fuel", `<span class="c">Fuel</span>${Math.round(s.fuel * 100)}`, gx + 18, below + 16, "dl sm", "cm");
    const ch = Sub.charge(s);
    if (ch.rate > 0) lab("chg", "charging", gx + 11, gy - r - 6, "dl sm green", "cm");
    /* the tubes */
    const tw = P.w, sp = Math.max(6, Math.min(11, Math.floor((tw - 28) / Math.max(1, s.tubes.F.length))));
    well(g, P.x, P.y, tw, P.h);
    const row = (bank, y0) => { s.tubes[bank].forEach((v, i) => { const x = P.x + 24 + i * sp; K.rect(g, x, y0, sp - 2, 10, INK); K.rect(g, x + 1, y0 + 1, sp - 4, 8, v === 0 ? GREEN : v > 0 ? "#6e5a2a" : "#2a1410"); if (v > 0) K.rect(g, x + 1, y0 + 9 - Math.round(8 * (1 - v / C.TORP.reload)), sp - 4, Math.round(8 * (1 - v / C.TORP.reload)), AMBER); }); };
    row("F", P.y + 6); row("A", P.y + 22);
    btn("bankF", "Fwd", P.x + 2, P.y + 5, 20, 12, { act: "bankF", on: s.bank === "F" });
    btn("bankA", "Aft", P.x + 2, P.y + 21, 20, 12, { act: "bankA", on: s.bank === "A" });
    btn("spread", `Spread ${s.spread}`, P.x + 2, P.y + 37, 40, 12, { act: "spread" });
    lab("store", `<span class="c">Reloads</span>${s.store.F + s.store.A}`, P.x + 46, P.y + 43, "dl sm", "lm");
    btn("fire", "FIRE", P.x + 2, P.y + P.h - 20, tw - 4, 18, { act: "fire", cls: "danger" });
    /* the snorkel, the radar warning, and the rest */
    const cx = bt.x + bt.w - 90, e = C.era(C.monthOf(S.t)), metox = e.metox && s.metoxT !== undefined && S.t - s.metoxT < 6;
    let yy = bt.y + 6;
    btn("snorkel", "Snorkel", cx, yy, 84, 13, { act: "snorkel", on: !!s.snork, dim: !e.snorkel, title: e.snorkel ? "Her diesels at periscope depth: charge and run, loud" : "Not fitted until Year IV" }); yy += 15;
    btn("metox", metox ? "METOX: RADAR!" : "Metox", cx, yy, 84, 13, { cls: metox ? "alarm" : "", dim: !e.metox, title: e.metox ? "The radar warning: it lights when an escort's radar sweeps her" : "Not fitted until Year III" }); yy += 15;
    btn("radar", "Radar", cx, yy, 41, 13, { act: "radar", on: Sub.radarWorks(s), dim: !s.radar }); btn("silent", "Silent", cx + 43, yy, 41, 13, { act: "silent", on: s.silent }); yy += 15;
    btn("decoy", `Decoy ${s.decoys || 0}`, cx, yy, 41, 13, { act: "decoy" }); btn("gun", "Gun", cx + 43, yy, 41, 13, { act: "gun", on: s.gun.on, dim: !Sub.surfaced(s) }); yy += 15;
    btn("next", "Next boat <kbd>N</kbd>", cx, yy, 84, 13, { act: "boatNext", dim: S.subs.filter(q => !q.lost).length < 2 });
    lab("name", `<b>${PP.esc(s.name)}</b> <span class="c">${PP.esc(k.name)} · ${PP.esc(s.capt || "")}</span>`, bt.x + 8, bt.y + bt.h - 7, "dl", "lm");
  }

  /* an odometer under a dial: figures on drums, each rolling up to the next as the one to its right turns over
   * from 9 (HTML over the canvas, so the figures are sharp). n drums, dec of them after the point; wrap, the
   * reading that turns back to nought (a heading's 360), so nothing rolls toward it */
  function odo(id, v, n, dec, x, y, unit = "", wrap = 0) {
    const t = Math.max(0, v) * Math.pow(10, dec), stop = wrap && t + 1 >= wrap * Math.pow(10, dec);
    let h = "";
    for (let i = n - 1; i >= 0; i--) {
      const p10 = Math.pow(10, i), roll = stop && i ? 0 : Math.max(0, t % p10 - (p10 - 1));
      const p = Math.round((Math.floor(t / p10) % 10 + roll) * 20) / 20;
      h += `<i${i < dec ? ' class="d"' : ""}><b style="transform:translateY(${(-p * 1.2).toFixed(2)}em)">01234567890</b></i>`;
      if (i === dec && dec) h += "<u>.</u>";
    }
    lab(id, `<span class="odo">${h}</span>${unit ? `<span class="c">${unit}</span>` : ""}`, x, y, "dl", "cm");
  }

  /* the engine-order telegraph, big enough for its words, each word the place to click for it: the ordered
   * one lit and the handle on it, a white mark on the rim where her speed is on the same scale */
  function bigTelegraph(g, cx, cy, r, f, k, btn) {
    const bells = C.ESC_BELLS, bf = C.ESC_BELL_F, n = bells.length;
    dial(g, cx, cy, r);
    K.ring(g, cx, cy, Math.round(r * 0.34), DIM);
    const sp = f.spd / k.kn;
    let made = 0;
    for (let i = 1; i < n; i++) if (sp >= bf[i - 1]) made = i - 1 + PP.clamp((sp - bf[i - 1]) / (bf[i] - bf[i - 1]), 0, 1);
    const w = Math.max(18, Math.round(r * 0.5)), h = 9;
    for (let i = 0; i < n; i++) {
      const a = sweep(i / (n - 1)), [x, y] = at(cx, cy, r * 0.64, a);
      tick(g, cx, cy, r - 7, r - 2, a, i === f.bell ? AMBER : TICK);
      btn("bell" + i, bells[i], x - w / 2, y - h / 2, w, h, { act: "bell" + i, cls: "tel", on: i === f.bell, title: `${bells[i]}: ${Math.round(Math.abs(bf[i]) * k.kn)} knots${bf[i] < 0 ? " astern" : ""}` });
    }
    needle(g, cx, cy, Math.round(r * 0.34), sweep(f.bell / (n - 1)), AMBER, 3);
    const [sx, sy] = at(cx, cy, r - 4, sweep(made / (n - 1)));
    K.disc(g, sx, sy, 2, 2, "#fff0e6");
  }

  /* a pattern as it lies on the sea from above, her track up the middle and the first rail at the foot; all at
   * one scale, so the wide one looks wide. Each charge's reach is a faint disc, the charge a dot, a doubled one two */
  function patDiagram(g, x, y, w, h, P, sc, lit) {
    const cx = Math.round(x + w / 2), sp = C.DC.spacing, len = (P.rails - 1) * sp, y0 = Math.round(y + (h - 10) / 2 + len * sc / 2);
    K.rect(g, cx, y + 3, 1, h - 13, "rgba(255,190,170,.14)");
    const pts = [];
    for (let i = 0; i < P.rails; i++) pts.push([0, i * sp]);
    for (const [after, out] of P.throws) for (const s of [-1, 1]) pts.push([out * s, after * sp]);
    const reach = Math.max(2, C.DC.hurt / 3 * sc), d = sc > 0.18 ? 3 : 2;
    for (const [ax, al] of pts) K.disc(g, cx + ax * sc, y0 - al * sc, reach, reach, lit ? "rgba(255,176,0,.09)" : "rgba(255,150,110,.05)");
    for (const [ax, al] of pts) {
      const px = Math.round(cx + ax * sc), py = Math.round(y0 - al * sc);
      /* a doubled charge: the heavy one under it, a shade darker, set off down and to the right */
      if (P.deep) K.rect(g, px - 1 + d, py - 1 + d, d, d, lit ? "#b8641a" : "#7a4428");
      K.rect(g, px - 1, py - 1, d, d, lit ? AMBER : "#c98a3c");
    }
  }

  /* the hedgehog's throw from above: her bow at the foot, and ahead of it the ring its bombs come down in,
   * each bomb's reach (it goes off only on a hull) a faint disc; at the patterns' scale where it fits */
  function hhDiagram(g, x, y, w, h, sc, lit) {
    const X = C.ESC_SIDE, s = Math.min(sc, (h - 16) / (X.hhRange + X.hhRing + 20)), cx = Math.round(x + w / 2);
    const by = Math.round(y + (h - 10) / 2 + (X.hhRange + X.hhRing) * s / 2), ry = by - X.hhRange * s;
    K.poly(g, [[cx, by - 4], [cx + 2, by], [cx + 2, by + 4], [cx - 2, by + 4], [cx - 2, by]], lit ? "#d9b9a6" : "#6e5a52");
    for (let yy = by - 6; yy > ry + X.hhRing * s + 2; yy -= 3) K.px(g, cx, yy, "rgba(255,190,170,.22)");
    const reach = Math.max(1, X.hhHit * s);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * PP.TAU, px = cx + Math.cos(a) * X.hhRing * s, py = ry + Math.sin(a) * X.hhRing * s;
      K.disc(g, px, py, reach, reach, lit ? "rgba(255,176,0,.07)" : "rgba(255,150,110,.04)");
      K.px(g, px, py, lit ? AMBER : "#8a6a4a");
    }
  }

  /* the depth the charges are set for: a slider from the surface (a line of sea, not a setting) down to the deepest,
   * a mark every 50 feet; drag it, or the arrows at its ends for a step */
  function depthSlider(g, f, x, y, w, h, btn) {
    const X = C.ESC_SIDE, lo = X.dcSet[0], hi = X.dcSet[1], cx = x + 9;
    btn("setU", "&#9650;", cx - 7, y, 14, 10, { act: "shallower", title: "Shallower (Q)" });
    btn("setD", "&#9660;", cx - 7, y + h - 10, 14, 10, { act: "deeper", title: "Deeper (E)" });
    const y0 = y + 13, y1 = y + h - 13, Y = d => Math.round(y0 + d / hi * (y1 - y0));
    K.rect(g, cx - 1, y0, 3, y1 - y0 + 1, INK); K.rect(g, cx, y0, 1, y1 - y0 + 1, DIM);
    K.rect(g, cx - 5, y0, 11, 1, "#6fb2d6");
    for (let d = lo; d <= hi; d += 50) K.rect(g, cx + 3, Y(d), d % 100 ? 2 : 4, 1, TICK);
    const yy = Y(f.dcSet);
    K.rect(g, cx - 5, yy - 1, 11, 3, AMBER);
    lab("surf", "Surface", cx + 7, y0, "dl sm sea", "lm");
    lab("set", `<b>${f.dcSet}</b> <span class="c">ft</span>`, cx + 9, Math.max(yy, y0 + 8), "dl sm amber", "lm");
    btn("depth", "", x, y0 - 3, w, y1 - y0 + 7, { cls: "slide", slide: { y0, y1, lo, max: hi, step: 25, act: "depth", v: f.dcSet }, title: `Charges set for ${f.dcSet} feet: drag for ${lo} to ${hi}` });
  }

  /* her stern from above: the throwers down each side, a charge in each one loaded, and the racks down to her two
   * rails; a launcher just emptied blinks out, the next one being loaded comes up as its crew work. Beside her what
   * is below, in reserve; under her the button that lays the pattern */
  const blinks = new Map();
  let lastRacks = null;
  function stern(g, S, f, x, y, w, h, now, btn, sel) {
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
    /* the hull, her stern at the foot */
    const top = y + 2, yb = y + h - 22, scx = x + 21, hw = 7;
    K.poly(g, [[scx - hw - 1, top], [scx + hw + 1, top], [scx + hw + 1, yb - 4], [scx + 4, yb + 1], [scx - 4, yb + 1], [scx - hw - 1, yb - 4]], "#6e4a3e");
    K.poly(g, [[scx - hw, top], [scx + hw, top], [scx + hw, yb - 4], [scx + 4, yb], [scx - 4, yb], [scx - hw, yb - 4]], "#24140f");
    /* the throwers, port to the left and starboard to the right, the aftmost first */
    const sp = Math.max(4, Math.min(8, Math.floor((yb - top - 22) / (X.throwers - 1))));
    for (let i = 0; i < X.throwers; i++) {
      const sy = yb - 22 - i * sp;
      slot("P", i, scx - hw - 5, sy, d.tP / X.loadThrow);
      slot("S", i, scx + hw + 2, sy, d.tS / X.loadThrow);
    }
    /* the two rails, the charges on them rolling aft, the next to go at the foot */
    for (const rx of [scx - 3, scx + 1]) K.rect(g, rx + 1, yb - 4 - 4 * (X.rails / 2), 1, 4 * (X.rails / 2) + 3, DIM);
    for (let j = 0; j < X.rails; j++) slot("R", j, j % 2 ? scx + 1 : scx - 3, yb - 5 - Math.floor(j / 2) * 4, d.tR / X.loadRail);
    /* below, in reserve */
    const rx0 = x + 40, per = Math.max(4, Math.floor((x + w - rx0) / 4)), below = X.charges - X.throwers * 2 - X.rails;
    lab("reserve", `<span class="c">Reserve</span><b>${res}</b>`, rx0, top + 4, "dl sm", "lm");
    for (let i = 0; i < below; i++) K.rect(g, rx0 + (i % per) * 4, top + 11 + Math.floor(i / per) * 4, 3, 3, i < res ? "#c98a3c" : "#2a1410");
    const P = C.ESC_PATTERNS[sel];
    btn("pattern", f.pat ? "Laying&hellip;" : "Lay charges", x, y + h - 17, w, 16, { act: "fire", cls: "danger", on: !!f.pat, title: `Lay the ${P.name.toLowerCase()} pattern, ${C.patCount(P)} charges (Space)` });
  }

  function escGauges(g, S, ui, now, bt, btn) {
    const f = PP.Escort.flag(S); if (!f) return;
    const k = C.SHIPS[f.cls], X = C.ESC_SIDE;
    /* three dials across the top, the telegraph, the compass and the sonar, one size, as big as the band's height
     * and its width (clear of the buttons on the right) allow, each with its reading under it; the charges under them */
    const r = Math.max(14, Math.min(Math.round(Math.min(bt.w * 0.075, (bt.h - 84) / 2.8) * 1.4), Math.floor((bt.w - 154) / 6)));
    const top = bt.y + 6, gy = top + r, oy = top + 2 * r + 9;
    let gx = bt.x + 10 + r;
    bigTelegraph(g, gx, gy, r, f, k, btn);
    odo("tele", Math.abs(f.spd), 3, 1, gx, oy, "kn");
    /* the compass and the helm */
    gx += r * 2 + 18;
    compass(g, gx, gy, r, f.hdg, f.ordHdg);
    odo("hdg", ((f.hdg / PP.DEG) % 360 + 360) % 360, 3, 0, gx, oy, "", 360);
    btn("helmL", "&#9664;", gx - r - 8, gy + r - 10, 14, 12, { hold: "hL" }); btn("helmR", "&#9654;", gx + r - 6, gy + r - 10, 14, 12, { hold: "hR" });
    /* the sonar scope and its P / A switch */
    gx += r * 2 + 18;
    sonarScope(g, gx, gy, r, S, f, now);
    btn("pa", f.ping ? "A · active" : "P · passive", gx - 26, oy - 6, 52, 12, { act: "silent", on: !!f.ping, title: "Passive: listen (slow, under 15 knots). Active: ping, which they hear too" });
    if (f.spd > C.DET.hydFastKn) lab("deaf", "too fast to hear", gx, gy + Math.round(r * 0.6), "dl sm amber", "cm");
    /* the charges: the patterns to pick from, the depth they are set for, her launchers and what is below, and the
     * hedgehog; the patterns and the hedgehog drawn as they lie on the sea, at one scale */
    const px = bt.x + 6, py = oy + 10, pw = bt.w - 108, ph = Math.max(40, bt.y + bt.h - 16 - py), SL = 38, SW = 84;
    well(g, px, py, pw, ph);
    const ch = ph - 6, cw = Math.max(26, Math.min(Math.round(ch * 1.15), Math.floor((pw - SL - SW - 14) / 4) - 3)), sel = f.patK || 0;
    const sc = Math.min((cw - 4) / 310, (ch - 14) / 230);
    C.ESC_PATTERNS.forEach((P, i) => {
      const x = px + 3 + i * (cw + 3), y = py + 3;
      patDiagram(g, x, y, cw, ch, P, sc, i === sel);
      btn("pat" + i, cw >= 44 ? `${P.name} ${C.patCount(P)}` : String(C.patCount(P)), x, y, cw, ch, { act: "pat" + i, cls: "pick", on: i === sel, title: `${P.name} pattern: ${C.patCount(P)} charges${P.deep ? ", in two layers" : ""}` });
    });
    /* the depth, then her stern with its launchers, between the patterns and the hedgehog */
    const x2 = px + 3 + 3 * (cw + 3) + 1, hx = px + pw - 3 - cw;
    depthSlider(g, f, x2, py + 3, SL, ch, btn);
    stern(g, S, f, x2 + SL + 4, py + 3, hx - 5 - (x2 + SL + 4), ch, now, btn, sel);
    /* the hedgehog: its ring ahead of her, the cell its trigger */
    const hh = C.monthOf(S.t) >= X.hedgehogFrom, hn = f.hhLeft || 0;
    hhDiagram(g, hx, py + 3, cw, ch, sc, hh && hn > 0);
    btn("hedgehog", cw >= 44 ? `Hedgehog ${hn}` : String(hn), hx, py + 3, cw, ch, { act: "bank", cls: "pick", dim: !hh, title: hh ? `Hedgehog: a ring of 24 bombs ${X.hhRange} yards ahead, that go off only on a hull (${hn} left)` : "Not fitted until Year III" });
    const cx = bt.x + bt.w - 90;
    let yy = bt.y + 6;
    btn("guns", "Guns", cx, yy, 84, 13, { act: "gun" }); yy += 15;
    btn("next", "Next escort <kbd>N</kbd>", cx, yy, 84, 13, { act: "boatNext", dim: PP.Escort.mine(S).length < 2 }); yy += 15;
    const hull = Math.max(0, 1 - f.dmg / k.hp);
    lab("hull", `<span class="c">Hull</span><b>${Math.round(hull * 100)}%</b>`, cx + 2, yy + 8, "dl" + (hull < 0.5 ? " red" : ""), "lm");
    lab("name", `<b>${PP.esc(f.name)}</b> <span class="c">${PP.esc(k.name)} · PDF</span>`, bt.x + 8, bt.y + bt.h - 7, "dl", "lm");
  }

  /* ---- the Status screen: the vessel you are aboard, as the 1990 game's showed it ---- */
  D.status = (g, S, ui, now, Wd, Ht) => { K.rect(g, 0, 0, Wd, Ht, "#0d0504"); R.dash = { status: true, buttons: [] }; };
  D.statusHTML = S => {
    const esc = PP.esc;
    if (S.side === "escorts") {
      const f = PP.Escort.flag(S); if (!f) return "";
      const k = C.SHIPS[f.cls], hull = Math.max(0, 1 - f.dmg / k.hp);
      return `<div class="ht-name">${esc(f.name)}</div><div class="ht-cls">${esc(k.name)} of the Pumacity Defense Fleet · ${f.auto ? "AUTO: under her order" : "USER CONTROL"}</div>
        <table class="aids">${[["Speed", `${f.spd.toFixed(1)} kn, ${C.ESC_BELLS[f.bell]}`], ["Course", PP.deg3(f.hdg)], ["Hull", Math.round(hull * 100) + "%" + (f.fire > 0.1 ? ", on fire" : "")],
          ["Sonar", f.ping ? "Active: pinging" : "Passive: listening"], ["Depth charges", `${f.dcLeft} left, set for ${f.dcSet} ft`], ["Hedgehog", C.monthOf(S.t) >= C.ESC_SIDE.hedgehogFrom ? `${f.hhLeft} salvoes` : "not fitted"],
          ["Her order", (C.ESC_ORDERS.find(o => o[0] === f.ord) || C.ESC_ORDERS[0])[1]]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>`;
    }
    const s = S.sub, k = C.SUBS[s.cls], e = C.era(C.monthOf(S.t)), hurt = Sub.SYS.filter(([q]) => s.sys[q] > 0.001).map(([q, n]) => `${n} ${s.sys[q] >= 0.5 ? "out" : "damaged"}`);
    return `<div class="ht-name">${esc(s.name)}</div><div class="ht-cls">${esc(k.name)} class of the Wolf Empire · Captain ${esc(s.capt || "")} · ${s.auto ? "AUTO: under her order" : "USER CONTROL"}</div>
      <table class="aids">${[["Depth", Sub.surfaced(s) ? "on the surface" : Math.round(s.depth) + " ft" + (Sub.snorkeling(s) ? ", snorkelling" : "")], ["Speed", `${s.spd.toFixed(1)} kn, ${C.BELLS[s.bell]}`], ["Course", PP.deg3(s.hdg)],
        ["Battery", Math.round(s.bat * 100) + "%"], ["Fuel", Math.round(s.fuel * 100) + "%"], ["Torpedoes", `${Sub.torpsLeft(s)} (forward ${Sub.loaded(s, "F")} loaded, aft ${Sub.loaded(s, "A")})`], ["Noisemakers", s.decoys || 0],
        ["Hull", Math.round(s.hull * 100) + "%" + (s.water > 0.05 ? `, ${Math.round(s.water * 100)}% water` : "")], ["Damage", hurt.length ? hurt.join(", ") : "none"],
        ["Snorkel", e.snorkel ? (s.snork ? "up" : "down") : "not fitted"], ["Radar warning", e.metox ? (s.metoxT !== undefined && S.t - s.metoxT < 6 ? "an escort's radar on her" : "quiet") : "not fitted"],
        ["Her order", PP.Orders.name(s.orders)]].map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>`;
  };
})();
