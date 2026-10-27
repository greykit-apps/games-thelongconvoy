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
    const mui = { chartZoom: ui.mini.chartZoom, chartAt: null, track: ui.track, sel: ui.sel, title: true };
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
    if (!esc) subGauges(g, S, ui, now, bt, r, gx, gy, btn, P); else escGauges(g, S, ui, now, bt, r, gx, gy, btn, P);
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

  function escGauges(g, S, ui, now, bt, r, gx, gy, btn, P) {
    const f = PP.Escort.flag(S); if (!f) return;
    const k = C.SHIPS[f.cls], below = gy + r + 4, X = C.ESC_SIDE;
    telegraph(g, gx, gy, r, C.ESC_BELLS, f.bell, f.spd / k.kn);
    lab("tele", `<b>${C.ESC_BELLS[f.bell]}</b> <span class="c">${f.spd.toFixed(1)} kn</span>`, gx, below + 6, "dl", "cm");
    btn("bellU", "&#9650;", gx + r - 6, gy - r - 2, 14, 12, { act: "tU" }); btn("bellD", "&#9660;", gx + r - 6, gy - r + 12, 14, 12, { act: "tD" });
    gx += r * 2 + 18;
    compass(g, gx, gy, r, f.hdg, f.ordHdg);
    lab("hdg", `<b>${PP.deg3(f.hdg)}</b>${Math.abs(PP.angDiff(f.hdg, f.ordHdg)) > 0.02 ? `<span class="ord">${PP.deg3(f.ordHdg)}</span>` : ""}`, gx, below + 6, "dl", "cm");
    btn("helmL", "&#9664;", gx - r - 8, gy + r - 10, 14, 12, { hold: "hL" }); btn("helmR", "&#9654;", gx + r - 6, gy + r - 10, 14, 12, { hold: "hR" });
    /* the sonar scope and its P / A switch */
    gx += r * 2 + 18;
    sonarScope(g, gx, gy, r, S, f, now);
    btn("pa", f.ping ? "A · active" : "P · passive", gx - 26, below + 1, 52, 12, { act: "silent", on: !!f.ping, title: "Passive: listen (slow, under 15 knots). Active: ping, which they hear too" });
    if (f.spd > C.DET.hydFastKn) lab("deaf", "too fast to hear", gx, gy - r - 6, "dl sm amber", "cm");
    /* the charges: their depth, the racks, the pattern; the hedgehog; the guns */
    const tw = P.w, th = P.h, px = P.x, py = P.y;
    well(g, px, py, tw, th);
    lab("set", `<span class="c">Set</span><b>${f.dcSet} ft</b>`, px + 6, py + 10, "dl", "lm");
    btn("setU", "&#9650;", px + tw - 34, py + 4, 14, 12, { act: "shallower" }); btn("setD", "&#9660;", px + tw - 18, py + 4, 14, 12, { act: "deeper" });
    /* the racks: a lamp a charge */
    const per = Math.max(5, Math.floor((tw - 12) / 6));
    for (let i = 0; i < X.charges; i++) { const x = px + 6 + (i % per) * 6, y = py + 20 + Math.floor(i / per) * 6; K.rect(g, x, y, 4, 4, i < f.dcLeft ? AMBER : "#2a1410"); }
    btn("pattern", f.pat ? "Laying" : "PATTERN", px + 4, py + th - 18, 56, 14, { act: "fire", cls: "danger", on: !!f.pat });
    const hh = C.monthOf(S.t) >= X.hedgehogFrom;
    btn("hedgehog", `Hedgehog ${f.hhLeft || 0}`, px + 64, py + th - 18, Math.min(60, tw - 68), 14, { act: "bank", dim: !hh, title: hh ? "A ring of bombs ahead, that go off only on a hull" : "Not fitted until Year III" });
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
