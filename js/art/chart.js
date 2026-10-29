/* The Long Convoy -- the chart: from a few thousand yards across (the attack)
 * to the whole archipelago.
 *
 * Depth in ten hard bands under red light, the shoals lightest, the land dun with a bright coast.
 * The sea lanes and the names. Our boat,
 * her ordered course and her track. The ships as we know them: what is in
 * sight where it is, what was seen where it was last (a hollow mark, aging),
 * what is only heard as a line of bearing; merchants a diamond, escorts a
 * triangle pointing their way, the sinking a cross. Nothing is told by
 * colour alone. Field aids add torpedo tracks, the TDC's solution and the
 * escorts' hearing. What lies off the edge (the patrol zone, the nearest
 * base, the boat when the chart is dragged off her) an arrow points to. */
"use strict";
(() => {
  const K = PP.K, C = PP.C, Sea = PP.Sea, Det = PP.Detect, W = PP.Weapons, Sub = PP.Sub, CH = PP.Chart = {};
  CH.ZOOMS = [10, 25, 60, 150, 400, 1100, 3200, 0];       /* yards a pixel; 0, the whole sea fitted to the window */
  const INK = "#0b0504", COL = { merchant: "#ffc65a", escort: "#ff5a3c", ghost: "#a07466", ear: "#8fe3a1", sub: "#fff0e6", pack: "#ffd2bf", packDown: "#e09a80", tdc: "#ffc65a", torp: "#ffe6d6", plane: "#ff5a3c", lane: "rgba(255,198,90,.22)", zone: "rgba(127,224,168,.5)" };
  /* the depth in ten hard bands, as the 1990 game's sea maps have them, under the boat's red light: the shoals
   * lightest, the deep near black; the land a dun the red light warms, its coast a bright line */
  const BANDS = [[30, "#5c2b22"], [60, "#4f251e"], [120, "#45201a"], [200, "#3b1b17"], [400, "#331714"], [800, "#2b1411"], [1600, "#24110f"], [3000, "#1e0e0c"], [6000, "#180b0a"]];
  const depthCol = d => { if (d <= 0) return d < -800 ? "#5e4c3c" : "#6b5846"; for (const [b, c] of BANDS) if (d < b) return c; return "#130908"; };

  /* the whole sea, a pixel a cell, painted once */
  let WHOLE = null;
  const whole = () => WHOLE || (WHOLE = (() => {
    const c = K.mk(Sea.NX, Sea.NY), g = c.getContext("2d"), img = g.createImageData(Sea.NX, Sea.NY), D = Sea.depth;
    for (let j = 0; j < Sea.NY; j++) for (let i = 0; i < Sea.NX; i++) {
      const d = D[j * Sea.NX + i], o = (j * Sea.NX + i) * 4;
      let q = K.rgb(depthCol(d));
      const land = d <= 0, coast = land && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const ii = i + a, jj = j + b; return ii >= 0 && jj >= 0 && ii < Sea.NX && jj < Sea.NY && D[jj * Sea.NX + ii] > 0; });
      if (coast) q = [201, 140, 92];
      else if (land) q = q.map(v => v + (K.hash(i, j, 3) - 0.5) * 10);
      img.data[o] = q[0]; img.data[o + 1] = q[1]; img.data[o + 2] = q[2]; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  })());
  /* a close chart, painted for this view and kept until the view moves */
  let LOCAL = null;
  function local(cx, cy, z, Wd, Ht) {
    const q = 64 * z, kx = Math.round(cx / q), ky = Math.round(cy / q), key = `${kx}:${ky}:${z}:${Wd}x${Ht}`;
    if (LOCAL && LOCAL.key === key) return LOCAL;
    const pad = 64, cw = Wd + pad * 2, chh = Ht + pad * 2, c = K.mk(cw, chh), g = c.getContext("2d"), img = g.createImageData(cw, chh);
    const ox = kx * q - cw / 2 * z, oy = ky * q - chh / 2 * z, step = z >= 60 ? 2 : 1;
    for (let j = 0; j < chh; j += step) for (let i = 0; i < cw; i += step) {
      const x = ox + i * z, y = oy + j * z, d = Sea.depthAt(x, y);
      let qq = K.rgb(depthCol(d));
      if (d > 0 && d < 400) { const n = Math.sin(d / 25) ; if (Math.abs(n) < 0.08) qq = qq.map(v => v + 14); }
      if (d <= 0 && Sea.depthAt(x + z * 2, y) > 0 || d <= 0 && Sea.depthAt(x - z * 2, y) > 0 || d <= 0 && Sea.depthAt(x, y + z * 2) > 0 || d <= 0 && Sea.depthAt(x, y - z * 2) > 0) qq = [201, 140, 92];
      for (let b = 0; b < step; b++) for (let a = 0; a < step; a++) { const o = ((j + b) * cw + i + a) * 4; if (o >= img.data.length) continue; img.data[o] = qq[0]; img.data[o + 1] = qq[1]; img.data[o + 2] = qq[2]; img.data[o + 3] = 255; }
    }
    g.putImageData(img, 0, 0);
    LOCAL = { key, c, ox, oy };
    return LOCAL;
  }
  CH.reset = () => { LOCAL = null; };

  /* marks, centred on x, y */
  function diamond(g, x, y, r, col, hollow) { x = Math.round(x); y = Math.round(y); for (let i = -r - 1; i <= r + 1; i++) { const w = r + 1 - Math.abs(i); g.fillStyle = INK; g.fillRect(x - w - 1, y + i, w * 2 + 3, 1); } for (let i = -r; i <= r; i++) { const w = r - Math.abs(i); g.fillStyle = col; g.fillRect(x - w, y + i, w * 2 + 1, 1); if (hollow && w > 0 && Math.abs(i) < r) { g.fillStyle = INK; g.fillRect(x - w + 1, y + i, w * 2 - 1, 1); } } }
  function tri(g, x, y, r, hdg, col, hollow) {
    const p = a => [x + PP.hx(hdg + a) * r * (a ? 0.9 : 1.4), y + PP.hy(hdg + a) * r * (a ? 0.9 : 1.4)];
    const pts = [p(0), p(2.4), p(-2.4)];
    K.poly(g, pts.map(([a, b]) => [a + Math.sign(a - x), b + Math.sign(b - y)]), INK);
    K.poly(g, pts, col);
    if (hollow) K.poly(g, pts.map(([a, b]) => [x + (a - x) * 0.45, y + (b - y) * 0.45]), INK);
  }
  function cross(g, x, y, r, col) { x = Math.round(x); y = Math.round(y); g.fillStyle = col; for (let i = -r; i <= r; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + i, y - i, 1, 1); } }
  function dash(g, x0, y0, x1, y1, col, on = 3, off = 3) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); g.fillStyle = col; for (let k = 0; k <= n; k++) if (k % (on + off) < on) g.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1); }
  function ringPx(g, cx, cy, r, col, gap = 2) { const n = Math.max(12, Math.round(r * 2)); g.fillStyle = col; for (let k = 0; k < n; k++) if (k % (gap * 2) < gap) { const a = k / n * PP.TAU; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } }
  CH.mark = { diamond, tri, cross };

  /* what the chart shows: its scale, the point at its middle, and the band between the strips it lies in.
   * Centred on the boat unless dragged (chartAt); the whole sea at the last scale. */
  CH.seaW = () => Sea.NX * Sea.CELL;
  CH.seaH = () => Sea.NY * Sea.CELL;
  /* the vessel the chart is about: the boat you are on, or on the escorts' side the escort you are aboard */
  const ESCS = S => S.side === "escorts";
  CH.me = S => (ESCS(S) && PP.Escort.flag(S)) || S.sub;
  const surf = s => !s.subs && s.depth === undefined ? true : Sub.surfaced(s);
  CH.view = (S, ui, Wd, Ht) => {
    /* (the dashboard's small map keeps only its row of buttons along the foot, so she sits in its middle) */
    const sf = PP.Render.safe || { t: 28, b: 12 }, top = sf.t, bot = Ht - (ui.mini ? 16 : Math.max(sf.b, 60)), my = (top + bot) / 2;
    let z = CH.ZOOMS[ui.chartZoom], cx, cy;
    if (!z) { z = Math.max(CH.seaW() / (Wd - 16), CH.seaH() / Math.max(40, bot - top - 8)); cx = CH.seaW() / 2; cy = CH.seaH() / 2; }
    else { const me = CH.me(S); cx = ui.chartAt ? ui.chartAt.x : me.x; cy = ui.chartAt ? ui.chartAt.y : me.y; }
    return { z, cx, cy, my, top, bot, sf };
  };
  /* the middle of a dragged chart, kept on the sea */
  CH.panTo = (x, y) => ({ x: PP.clamp(x, 0, CH.seaW()), y: PP.clamp(y, 0, CH.seaH()) });

  /* what lies off the chart's edge, an arrow at the edge pointing to it and its name and distance:
   * our boat when the chart is dragged off her */
  function pointers(g, S, ui, X, Y, v, Wd) {
    const s = CH.me(S), sf = v.sf, out = [], put = [];
    const L = 8, R = Wd - 8, T = Math.max(v.top, sf.tr || v.top) + 8, B = Math.min(v.bot, sf.br || v.bot) - 8;
    if (ui.chartAt) out.push({ x: s.x, y: s.y, n: ESCS(S) ? "Our escort" : "Our boat", col: surf(s) ? COL.sub : "#e09a80" });
    const ox = Wd / 2, oy = v.my;
    for (const q of out) {
      const px = X(q.x), py = Y(q.y);
      if (px >= 0 && px <= Wd && py >= v.top && py <= v.bot) continue;
      const h = PP.angTo(ox, oy, px, py), ux = PP.hx(h), uy = PP.hy(h);
      const t = Math.min(ux > 0 ? (R - ox) / ux : ux < 0 ? (L - ox) / ux : Infinity, uy > 0 ? (B - oy) / uy : uy < 0 ? (T - oy) / uy : Infinity);
      const ex = ox + ux * t, ey = oy + uy * t;
      tri(g, ex - ux * 6, ey - uy * 6, 4, h, q.col);
      const txt = q.n + (q.d === undefined ? "" : " " + PP.num(Math.round(q.d / PP.YD_NM)) + " NM"), w = K.text5w(txt);
      let lx = Math.round(PP.clamp(ex - ux * (14 + w / 2) - w / 2, L, R - w)), ly = Math.round(PP.clamp(ey - uy * 16 - 3, T, B - 7));
      for (let k = 0; k < 4 && put.some(b => Math.abs(b.y - ly) < 9 && lx < b.x + b.w + 4 && b.x < lx + w + 4); k++) ly += ly > oy ? -9 : 9;
      put.push({ x: lx, y: ly, w });
      K.text5(g, txt, lx, ly, q.col, INK);
    }
  }

  /* ui: { chartZoom, chartAt: {x,y}|null }, aids */
  /* what the mouse can hit on the chart last drawn, in its own pixels: each vessel's name tag and its order
   * (a click on the name is a click on her, on the order her orders menu); main.js tests these first */
  CH.hits = [];
  CH.draw = (g, S, ui, aids, now) => {
    CH.hits = [];
    const Wd = g.canvas.width, Ht = g.canvas.height, s = CH.me(S), esc = ESCS(S), v = CH.view(S, ui, Wd, Ht);
    const z = v.z, cx = v.cx, cy = v.cy, sf = v.sf, my = v.my;
    const X = x => Wd / 2 + (x - cx) / z, Y = y => my + (y - cy) / z;
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#130908"; g.fillRect(0, 0, Wd, Ht);
    if (z >= 400) {
      const wsrc = whole(), k = Sea.CELL / z;
      g.drawImage(wsrc, Math.round(X(0)), Math.round(Y(0)), Math.round(Sea.NX * k), Math.round(Sea.NY * k));
    } else {
      const L = local(cx, cy, z, Wd, Ht);
      g.drawImage(L.c, Math.round(X(L.ox)), Math.round(Y(L.oy)));
    }
    /* a grid: every 10 nm on the sea chart, every 1,000 yd close in */
    const gs = z >= 400 ? 50 * PP.YD_NM : z >= 60 ? 5000 : 1000;
    g.fillStyle = "rgba(255,140,110,.07)";
    for (let gx = Math.floor((cx - Wd / 2 * z) / gs) * gs; gx < cx + Wd / 2 * z; gx += gs) g.fillRect(Math.round(X(gx)), 0, 1, Ht);
    for (let gy = Math.floor((cy - Ht / 2 * z) / gs) * gs; gy < cy + Ht / 2 * z; gy += gs) g.fillRect(0, Math.round(Y(gy)), Wd, 1);
    /* the lanes, the zones, the bases, the names */
    for (const L of Sea.lanes) for (let i = 1; i < L.pts.length; i++) dash(g, X(L.pts[i - 1][0]), Y(L.pts[i - 1][1]), X(L.pts[i][0]), Y(L.pts[i][1]), COL.lane, 4, 4);
    if (z >= 400) {
      for (const I of Sea.isles) K.text5(g, I.n, Math.round(X(I.x) - K.text5w(I.n) / 2), Math.round(Y(I.y) - 3), I.side === "wolf" ? "#ff9f86" : "#f2d6c0", INK);
      for (const l of Sea.labels) K.text5(g, l.n, Math.round(X(l.x) - K.text5w(l.n) / 2), Math.round(Y(l.y)), "rgba(240,170,150,.6)");
    }
    /* our track */
    const tr = ui.track || [];
    g.fillStyle = "rgba(255,210,190,.35)";
    for (let i = 0; i < tr.length; i += 1) g.fillRect(Math.round(X(tr[i][0])), Math.round(Y(tr[i][1])), 1, 1);
    /* range rings, close in */
    if (z < 400 && !ui.title) for (const r of z <= 25 ? [1000, 2000, 4000] : z <= 60 ? [2000, 5000, 10000] : [5000, 10000, 20000]) { ringPx(g, X(s.x), Y(s.y), r / z, "rgba(255,150,120,.16)", 2); K.text5(g, PP.num(r) + " YD", Math.round(X(s.x) + r / z * 0.7 + 3), Math.round(Y(s.y) - r / z * 0.7 - 3), "rgba(255,190,170,.5)"); }
    /* the escorts' ears (a Field aid): how far each could hear us now */
    if (aids.rings && !esc) for (const sh of S.ships) {
      if (sh.role !== "escort" || !PP.Ships.alive(sh) || !(Det.known(S, sh) || !S.real.vis)) continue;
      const Rh = C.DET.hyd * Sub.noise(s) * C.era(C.monthOf(S.t)).asw * C.SHIPS[sh.cls].sonar * (sh.spd > C.DET.hydFastKn ? C.DET.hydFast : 1);
      if (!Sub.surfaced(s)) ringPx(g, X(sh.x), Y(sh.y), Rh / z, "rgba(255,90,60,.45)", 2);
    }
    /* the ships as we know them; their ranges (a Field aid) in the HUD's type, the nearest first, none crowding another */
    const free = !S.real.vis, rngAt = [];
    for (const sh of S.ships) {
      if (sh.sunk) continue;
      /* on the escorts' side the convoy and its escorts are ours: always on the chart */
      const know = esc || Det.known(S, sh), was = sh.kn.t >= 0 && S.t - sh.kn.t < 1800, near = PP.dist(s.x, s.y, sh.x, sh.y) < 26000;
      if (esc && sh === s) continue;
      const r = Math.max(2, Math.min(5, Math.round(C.SHIPS[sh.cls].len / z / 2) + 2));
      if (know || (free && near)) {
        const x = X(sh.x), y = Y(sh.y);
        if (sh.sinking) cross(g, x, y, r, "#b88a7c");
        else if (sh.role === "escort") tri(g, x, y, r + 1, sh.hdg, COL.escort);
        else diamond(g, x, y, r, COL.merchant);
        if (aids.labels && z <= 60) rngAt.push({ id: sh.id, x: x + r + 4, y, d: PP.dist(s.x, s.y, sh.x, sh.y) });
        if (S.tdc.tgt === sh.id) { ringPx(g, x, y, r + 5, COL.tdc, 1); }
      } else if (was) {
        const x = X(sh.kn.x), y = Y(sh.kn.y);
        if (sh.role === "escort") tri(g, x, y, r + 1, sh.kn.hdg || 0, COL.ghost, true); else diamond(g, x, y, r, COL.ghost, true);
      }
      /* heard, not seen: a line of bearing */
      if (!know && sh.kn.ear && S.t - sh.kn.ear < 20) { const b = sh.kn.earBrg, L2 = Math.min(Wd, Ht) * 0.45; dash(g, X(s.x), Y(s.y), X(s.x) + PP.hx(b) * L2, Y(s.y) + PP.hy(b) * L2, "rgba(127,224,168,.7)", 2, 3); }
      if (!know && sh.kn.smoke && S.t - sh.kn.smoke < 60) { const b = sh.kn.smokeBrg, L2 = Math.min(Wd, Ht) * 0.45; dash(g, X(s.x), Y(s.y), X(s.x) + PP.hx(b) * L2, Y(s.y) + PP.hy(b) * L2, "rgba(232,194,122,.6)", 1, 4); }
    }
    const put = [];
    for (const q of rngAt.sort((a, b) => a.d - b.d)) {
      if (put.some(p => Math.abs(p.y - q.y) < 7 && q.x < p.x + 30 && p.x < q.x + 30)) continue;
      put.push(q); PP.Render.lab("c:" + q.id, PP.num(Math.round(q.d / 100) * 100), q.x, q.y, "rng", "lm");
    }
    /* our torpedoes, the charges, aircraft */
    if (aids.tracks) for (const tp of S.torps) { const x = X(tp.x), y = Y(tp.y); dash(g, x, y, x - PP.hx(tp.hdg) * 160 / z * 6, y - PP.hy(tp.hdg) * 160 / z * 6, COL.torp, 2, 2); K.rect(g, x - 1, y - 1, 2, 2, "#ffffff"); }
    for (const c of S.charges) { const x = X(c.x), y = Y(c.y); ringPx(g, x, y, Math.max(2, 30 / z), "#ffc0a8", 1); }
    /* the pack's noisemakers, still sounding (the pack knows where it dropped them) */
    if (!esc) for (const q of S.decoys || []) { const x = X(q.x), y = Y(q.y); ringPx(g, x, y, 3, "#8fe3a1", 1); if (z <= 60) K.text5(g, "DECOY", Math.round(x + 5), Math.round(y - 3), "rgba(143,227,161,.8)", INK); }
    for (const p of S.planes) if (p.seen) { const x = Math.round(X(p.x)), y = Math.round(Y(p.y)); K.rect(g, x - 4, y, 9, 1, COL.plane); K.rect(g, x, y - 4, 1, 9, COL.plane); }
    /* the TDC's target and solution (a Field aid) */
    const e = esc ? null : W.est(S);
    if (e && aids.solution) {
      const sol = W.solve(S, e, s.bank);
      ringPx(g, X(e.x), Y(e.y), 4, COL.tdc, 1);
      if (sol && sol.ok) {
        const ix = e.x + PP.hx(e.c) * e.s * PP.KN * sol.time, iy = e.y + PP.hy(e.c) * e.s * PP.KN * sol.time;
        dash(g, X(s.x), Y(s.y), X(ix), Y(iy), "rgba(255,198,90,.85)", 3, 2);
        dash(g, X(e.x), Y(e.y), X(ix), Y(iy), "rgba(255,198,90,.5)", 1, 2);
        K.rect(g, X(ix) - 1, Y(iy) - 1, 3, 3, COL.tdc);
      }
    }
    /* the escorts' side: the pack as the escorts know it. Each escort's contact a ring where she has it, fading
     * as it ages (a sonar contact tight, one heard wider); a boat seen on the surface or at her periscope, a
     * mark where she is; a boat sunk, a cross */
    if (esc) {
      for (const q of S.ships) {
        const a = q.ai; if (q.role !== "escort" || !PP.Ships.alive(q) || !a || !a.datum || !a.contact) continue;
        const age = S.t - a.contact; if (age > 900) continue;
        const x = X(a.datum.x), y = Y(a.datum.y), r = Math.max(4, (a.how === "sonar" ? 90 : a.how === "ear" ? 300 : 60) / z);
        ringPx(g, x, y, r, age < 60 ? "#ffc65a" : age < 300 ? "rgba(255,198,90,.6)" : "rgba(255,198,90,.3)", age < 60 ? 2 : 3);
        if (z <= 150) {
          /* its words beside it, on the left of it near the right edge */
          const t = (a.how === "sonar" ? "SONAR" : a.how === "ear" ? "HEARD" : "SEEN") + " " + (age < 60 ? "NOW" : Math.round(age / 60) + "M"), tw = K.text5w(t);
          K.text5(g, t, Math.round(x + r + 3 + tw > Wd - 2 ? x - r - 3 - tw : x + r + 3), Math.round(y - 3), "rgba(255,198,90,.85)", INK);
        }
      }
      for (const q of S.subs) {
        if (q.lost) { cross(g, X(q.x), Y(q.y), 4, COL.ghost); continue; }
        if ((q.seenT !== undefined && S.t - q.seenT < 30) || !S.real.vis && PP.dist(s.x, s.y, q.x, q.y) < 4000) tri(g, X(q.x), Y(q.y), 4, q.hdg, COL.escort, !Sub.surfaced(q));
      }
    }
    /* a name beside a mark, unless it would sit on one already written (the nearer to the middle written first) */
    const named = [];
    const nameAt = (txt, x, y, col, ref) => {
      /* a name that would run off the right edge goes on the other side of her */
      const w = K.text5w(txt), b = { x: Math.round(x + w > Wd - 2 ? x - 16 - w : x), y: Math.round(y), w };
      if (named.some(o => Math.abs(o.y - b.y) < 8 && b.x < o.x + o.w + 4 && o.x < b.x + w + 4)) return;
      named.push(b); K.text5(g, txt, b.x, b.y, col, INK);
      if (ref) {
        const nw = K.text5w(ref.name);
        CH.hits.push({ kind: "name", side: ref.side, id: ref.id, x: b.x - 2, y: b.y - 2, w: nw + 4, h: 11 });
        if (w > nw + 4) CH.hits.push({ kind: "order", side: ref.side, id: ref.id, x: b.x + nw + 2, y: b.y - 2, w: w - nw, h: 11 });
      }
    };
    /* the rest of the pack: the same triangle, dimmer, her name beside her; a boat lost, a cross where she went down */
    if (!esc) for (const q of [s].concat(S.subs.filter(o => o !== s))) {
      const qx = X(q.x), qy = Y(q.y);
      if (q.lost) { cross(g, qx, qy, 4, COL.ghost); continue; }
      if (q !== s) tri(g, qx, qy, 4, q.hdg, Sub.surfaced(q) ? COL.pack : COL.packDown);
      /* the boat you are aboard is named too: her order is the one she sails under when you leave her */
      if (q === s && ui.title) continue;
      nameAt(q.name.toUpperCase() + (ui.title ? "" : " - " + PP.Orders.name(q.orders).toUpperCase()), qx + (q === s ? 8 : 7), qy - 3, q === s ? COL.sub : COL.packDown, ui.title ? null : { side: "pack", id: q.id, name: q.name.toUpperCase() });
    }
    /* the boat selected for orders: a ring, and her waypoints joined up from her */
    const si = S.subs.findIndex(q => q.id === ui.sel && !q.lost);
    const sel = esc ? (S.ships.find(q => q.id === ui.sel && q.role === "escort" && PP.Ships.alive(q)) || s) : S.subs[si >= 0 ? si : S.cmd];
    if (sel && !sel.lost && !ui.title) {
      ringPx(g, X(sel.x), Y(sel.y), 8, COL.tdc, 1);
      let px = X(sel.x), py = Y(sel.y);
      (sel.wps || []).forEach((w, k) => { const wx = X(w.x), wy = Y(w.y); dash(g, px, py, wx, wy, "rgba(255,198,90,.7)", 3, 3); K.rect(g, wx - 2, wy - 2, 5, 5, COL.tdc); K.text5(g, String(k + 1), Math.round(wx + 5), Math.round(wy - 3), COL.tdc, INK); px = wx; py = wy; });
    }
    /* our boat, on top: a pale triangle, her ordered course a tick */
    const sx = X(s.x), sy = Y(s.y);
    dash(g, sx, sy, sx + PP.hx(s.ordHdg) * 22, sy + PP.hy(s.ordHdg) * 22, "rgba(255,198,90,.9)", 2, 2);
    tri(g, sx, sy, 5, s.hdg, surf(s) ? COL.sub : "#e09a80");
    /* on the escorts' side, each escort's name and order beside her */
    if (esc && !ui.title && z <= 150) for (const q of [s].concat(S.ships.filter(o => o !== s && o.role === "escort" && PP.Ships.alive(o)))) nameAt(q.name.toUpperCase() + " - " + ((C.ESC_ORDERS.find(o => o[0] === q.ord) || C.ESC_ORDERS[0])[1]).toUpperCase(), X(q.x) + 8, Y(q.y) - 3, q === s ? COL.sub : "rgba(255,170,150,.85)", { side: "escorts", id: q.id, name: q.name.toUpperCase() });
    pointers(g, S, ui, X, Y, v, Wd);
    /* the scale */
    const bar = z >= 400 ? 100 * PP.YD_NM : z >= 60 ? 10000 : 2000, bl = bar / z;
    const sy0 = sf.t + 10;
    K.rect(g, 12, sy0 + 4, bl, 2, "rgba(255,200,180,.75)"); K.rect(g, 12, sy0, 1, 6, "rgba(255,200,180,.75)"); K.rect(g, 12 + bl, sy0, 1, 6, "rgba(255,200,180,.75)");
    /* its words after it, or under it on a small chart */
    const bt = z >= 400 ? "100 NM" : PP.num(bar) + " YD", under = 16 + bl + K.text5w(bt) > Wd - 4;
    K.text5(g, bt, under ? 12 : 16 + bl, under ? sy0 + 9 : sy0 - 1, "rgba(255,200,180,.85)", INK);
    return { X, Y, z, cx, cy };
  };
  /* a point on the chart (canvas pixels) to the sea */
  CH.toSea = (S, ui, px, py, Wd, Ht) => { const v = CH.view(S, ui, Wd, Ht); return { x: v.cx + (px - Wd / 2) * v.z, y: v.cy + (py - v.my) * v.z }; };
})();
