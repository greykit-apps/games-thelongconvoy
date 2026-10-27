/* PumaPack -- the chart: from a few thousand yards across (the attack)
 * to the whole archipelago (the patrol).
 *
 * Depth in bands of blue, the shoals pale, the land dun with a dark coast.
 * The Empire's sea lanes, our patrol zone, the bases, the names. Our boat,
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
  const INK = "#081018", COL = { merchant: "#e8c27a", escort: "#ff9a80", ghost: "#9aa3ad", ear: "#7fe0a8", sub: "#f6f2e8", pack: "#c9e3f2", packDown: "#86b8d6", tdc: "#e6bd6a", torp: "#cfe8ff", plane: "#ff9a80", lane: "rgba(230,189,106,.28)", zone: "rgba(127,224,168,.5)" };
  const depthCol = d => d <= 0 ? (d < -800 ? "#6e7254" : "#5f6a4a") : d < 30 ? "#4f8e94" : d < 120 ? "#3a7488" : d < 400 ? "#285a78" : d < 2000 ? "#1b4566" : d < 6000 ? "#133652" : "#0e2b44";

  /* the whole sea, a pixel a cell, painted once */
  let WHOLE = null;
  const whole = () => WHOLE || (WHOLE = (() => {
    const c = K.mk(Sea.NX, Sea.NY), g = c.getContext("2d"), img = g.createImageData(Sea.NX, Sea.NY), D = Sea.depth;
    for (let j = 0; j < Sea.NY; j++) for (let i = 0; i < Sea.NX; i++) {
      const d = D[j * Sea.NX + i], o = (j * Sea.NX + i) * 4;
      let q = K.rgb(depthCol(d));
      const land = d <= 0, coast = land && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const ii = i + a, jj = j + b; return ii >= 0 && jj >= 0 && ii < Sea.NX && jj < Sea.NY && D[jj * Sea.NX + ii] > 0; });
      if (coast) q = [44, 50, 38];
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
      if (d <= 0 && Sea.depthAt(x + z * 2, y) > 0 || d <= 0 && Sea.depthAt(x - z * 2, y) > 0 || d <= 0 && Sea.depthAt(x, y + z * 2) > 0 || d <= 0 && Sea.depthAt(x, y - z * 2) > 0) qq = [44, 50, 38];
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
  CH.view = (S, ui, Wd, Ht) => {
    const sf = PP.Render.safe || { t: 28, b: 12 }, top = sf.t, bot = Ht - Math.max(sf.b, 60), my = (top + bot) / 2;
    let z = CH.ZOOMS[ui.chartZoom], cx, cy;
    if (!z) { z = Math.max(CH.seaW() / (Wd - 16), CH.seaH() / Math.max(40, bot - top - 8)); cx = CH.seaW() / 2; cy = CH.seaH() / 2; }
    else { cx = ui.chartAt ? ui.chartAt.x : S.sub.x; cy = ui.chartAt ? ui.chartAt.y : S.sub.y; }
    return { z, cx, cy, my, top, bot, sf };
  };
  /* the middle of a dragged chart, kept on the sea */
  CH.panTo = (x, y) => ({ x: PP.clamp(x, 0, CH.seaW()), y: PP.clamp(y, 0, CH.seaH()) });

  /* what lies off the chart's edge, an arrow at the edge pointing to it and its name and distance:
   * our boat when the chart is dragged off her; on patrol, the zone and the nearest base */
  function pointers(g, S, ui, X, Y, v, Wd) {
    const s = S.sub, sf = v.sf, out = [], put = [];
    const L = 8, R = Wd - 8, T = Math.max(v.top, sf.tr || v.top) + 8, B = Math.min(v.bot, sf.br || v.bot) - 8;
    if (ui.chartAt) out.push({ x: s.x, y: s.y, n: "Our boat", col: Sub.surfaced(s) ? COL.sub : "#a9d8f0" });
    if (S.mode === "patrol") {
      const zn = Sea.zones.find(q => q.id === S.patrol.zone);
      if (zn) out.push({ x: zn.x, y: zn.y, n: zn.name, col: "#a8ecc4", d: Math.max(0, PP.dist(s.x, s.y, zn.x, zn.y) - zn.r) });
      const base = Sea.portsOpen(C.monthOf(S.t)).map(p => ({ p, d: PP.dist(s.x, s.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
      if (base) out.push({ x: base.p.x, y: base.p.y, n: base.p.name, col: "#7fe0a8", d: base.d });
    }
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
  CH.draw = (g, S, ui, aids, now) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub, v = CH.view(S, ui, Wd, Ht);
    const z = v.z, cx = v.cx, cy = v.cy, sf = v.sf, my = v.my;
    const X = x => Wd / 2 + (x - cx) / z, Y = y => my + (y - cy) / z;
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#0e2b44"; g.fillRect(0, 0, Wd, Ht);
    if (z >= 400) {
      const wsrc = whole(), k = Sea.CELL / z;
      g.drawImage(wsrc, Math.round(X(0)), Math.round(Y(0)), Math.round(Sea.NX * k), Math.round(Sea.NY * k));
    } else {
      const L = local(cx, cy, z, Wd, Ht);
      g.drawImage(L.c, Math.round(X(L.ox)), Math.round(Y(L.oy)));
    }
    /* a grid: every 10 nm on the sea chart, every 1,000 yd close in */
    const gs = z >= 400 ? 50 * PP.YD_NM : z >= 60 ? 5000 : 1000;
    g.fillStyle = "rgba(200,220,236,.07)";
    for (let gx = Math.floor((cx - Wd / 2 * z) / gs) * gs; gx < cx + Wd / 2 * z; gx += gs) g.fillRect(Math.round(X(gx)), 0, 1, Ht);
    for (let gy = Math.floor((cy - Ht / 2 * z) / gs) * gs; gy < cy + Ht / 2 * z; gy += gs) g.fillRect(0, Math.round(Y(gy)), Wd, 1);
    /* the lanes, the zones, the bases, the names */
    for (const L of Sea.lanes) for (let i = 1; i < L.pts.length; i++) dash(g, X(L.pts[i - 1][0]), Y(L.pts[i - 1][1]), X(L.pts[i][0]), Y(L.pts[i][1]), COL.lane, 4, 4);
    if (S.mode === "patrol") {
      const zn = Sea.zones.find(q => q.id === S.patrol.zone);
      if (zn) { ringPx(g, X(zn.x), Y(zn.y), zn.r / z, COL.zone, 3); if (z >= 150) K.text5(g, zn.name, Math.round(X(zn.x) - K.text5w(zn.name) / 2), Math.round(Y(zn.y) - zn.r / z - 10), "#a8ecc4", INK); }
      for (const p of Sea.portsOpen(C.monthOf(S.t))) { const px = X(p.x), py = Y(p.y); K.rect(g, px - 3, py - 3, 7, 7, INK); K.rect(g, px - 2, py - 2, 5, 5, "#7fe0a8"); if (z >= 60) K.text5(g, p.name, Math.round(px + 6), Math.round(py - 3), "#d6f5e2", INK); }
    }
    if (z >= 400) {
      for (const I of Sea.isles) K.text5(g, I.n, Math.round(X(I.x) - K.text5w(I.n) / 2), Math.round(Y(I.y) - 3), I.side === "wolf" ? "#f0c0b0" : "#e9e4d8", INK);
      for (const l of Sea.labels) K.text5(g, l.n, Math.round(X(l.x) - K.text5w(l.n) / 2), Math.round(Y(l.y)), "rgba(180,206,226,.7)");
    }
    /* our track */
    const tr = ui.track || [];
    g.fillStyle = "rgba(246,242,232,.35)";
    for (let i = 0; i < tr.length; i += 1) g.fillRect(Math.round(X(tr[i][0])), Math.round(Y(tr[i][1])), 1, 1);
    /* range rings, close in */
    if (z < 400) for (const r of z <= 25 ? [1000, 2000, 4000] : z <= 60 ? [2000, 5000, 10000] : [5000, 10000, 20000]) { ringPx(g, X(s.x), Y(s.y), r / z, "rgba(230,224,210,.18)", 2); K.text5(g, PP.num(r) + " YD", Math.round(X(s.x) + r / z * 0.7 + 3), Math.round(Y(s.y) - r / z * 0.7 - 3), "rgba(230,224,210,.55)"); }
    /* the escorts' ears (a Field aid): how far each could hear us now */
    if (aids.rings) for (const sh of S.ships) {
      if (sh.role !== "escort" || !PP.Ships.alive(sh) || !(Det.known(S, sh) || !S.real.vis)) continue;
      const Rh = C.DET.hyd * Sub.noise(s) * C.era(C.monthOf(S.t)).asw * C.SHIPS[sh.cls].sonar * (sh.spd > C.DET.hydFastKn ? C.DET.hydFast : 1);
      if (!Sub.surfaced(s)) ringPx(g, X(sh.x), Y(sh.y), Rh / z, "rgba(255,154,128,.45)", 2);
    }
    /* the ships as we know them; their ranges (a Field aid) in the HUD's type, the nearest first, none crowding another */
    const free = !S.real.vis, rngAt = [];
    for (const sh of S.ships) {
      if (sh.sunk) continue;
      const know = Det.known(S, sh), was = sh.kn.t >= 0 && S.t - sh.kn.t < 1800, near = PP.dist(s.x, s.y, sh.x, sh.y) < 26000;
      const r = Math.max(2, Math.min(5, Math.round(C.SHIPS[sh.cls].len / z / 2) + 2));
      if (know || (free && near)) {
        const x = X(sh.x), y = Y(sh.y);
        if (sh.sinking) cross(g, x, y, r, "#c8ccd2");
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
    for (const c of S.charges) { const x = X(c.x), y = Y(c.y); ringPx(g, x, y, Math.max(2, 30 / z), "#ffd7cc", 1); }
    for (const p of S.planes) if (p.seen) { const x = Math.round(X(p.x)), y = Math.round(Y(p.y)); K.rect(g, x - 4, y, 9, 1, COL.plane); K.rect(g, x, y - 4, 1, 9, COL.plane); }
    /* the TDC's target and solution (a Field aid) */
    const e = W.est(S);
    if (e && aids.solution) {
      const sol = W.solve(S, e, s.bank);
      ringPx(g, X(e.x), Y(e.y), 4, COL.tdc, 1);
      if (sol && sol.ok) {
        const ix = e.x + PP.hx(e.c) * e.s * PP.KN * sol.time, iy = e.y + PP.hy(e.c) * e.s * PP.KN * sol.time;
        dash(g, X(s.x), Y(s.y), X(ix), Y(iy), "rgba(230,189,106,.85)", 3, 2);
        dash(g, X(e.x), Y(e.y), X(ix), Y(iy), "rgba(230,189,106,.5)", 1, 2);
        K.rect(g, X(ix) - 1, Y(iy) - 1, 3, 3, COL.tdc);
      }
    }
    /* the rest of the pack: the same triangle, dimmer, her name beside her; a boat lost, a cross where she went down */
    for (const q of S.subs) {
      if (q === s) continue;
      const qx = X(q.x), qy = Y(q.y);
      if (q.lost) { cross(g, qx, qy, 4, COL.ghost); continue; }
      tri(g, qx, qy, 4, q.hdg, Sub.surfaced(q) ? COL.pack : COL.packDown);
      K.text5(g, q.name.toUpperCase() + (q.orders === "hold" ? " (HOLD)" : ""), Math.round(qx + 7), Math.round(qy - 3), COL.packDown, INK);
    }
    /* our boat, on top: a pale triangle, her ordered course a tick */
    const sx = X(s.x), sy = Y(s.y);
    dash(g, sx, sy, sx + PP.hx(s.ordHdg) * 22, sy + PP.hy(s.ordHdg) * 22, "rgba(230,189,106,.9)", 2, 2);
    tri(g, sx, sy, 5, s.hdg, Sub.surfaced(s) ? COL.sub : "#a9d8f0");
    pointers(g, S, ui, X, Y, v, Wd);
    /* the scale */
    const bar = z >= 400 ? 100 * PP.YD_NM : z >= 60 ? 10000 : 2000, bl = bar / z;
    const sy0 = sf.t + 10;
    K.rect(g, 12, sy0 + 4, bl, 2, "rgba(236,231,220,.8)"); K.rect(g, 12, sy0, 1, 6, "rgba(236,231,220,.8)"); K.rect(g, 12 + bl, sy0, 1, 6, "rgba(236,231,220,.8)");
    K.text5(g, z >= 400 ? "100 NM" : PP.num(bar) + " YD", 16 + bl, sy0 - 1, "rgba(236,231,220,.85)", INK);
    return { X, Y, z, cx, cy };
  };
  /* a point on the chart (canvas pixels) to the sea */
  CH.toSea = (S, ui, px, py, Wd, Ht) => { const v = CH.view(S, ui, Wd, Ht); return { x: v.cx + (px - Wd / 2) * v.z, y: v.cy + (py - v.my) * v.z }; };
})();
