/* The Long Convoy -- the damage report: the boat cut away side on, in the
 * panel's steel. Her seven compartments under the casing and the conning
 * tower; the water in her, rising from the bilges; a compartment with a
 * hurt system hatched (amber damaged, red out), sparking while it is bad,
 * so a state is never read by colour alone. Under her, the depth she is at
 * against her test and crush depths, which damage brings up. The figures
 * and the repairs are the HUD's (hud.js): the hull and the water on the
 * left, what the crew are mending on the right. */
"use strict";
(() => {
  const K = PP.K, M = K.M, C = PP.C, Sub = PP.Sub, D = PP.DamageArt = {};
  const INK = "#07090d", BG = "#0a0f16";
  /* the compartments, bow to stern, the systems in each, and the share of her length each takes */
  const ROOMS = [["FWD TORP", ["tubesF", "planes"], 1.15], ["FWD BATT", ["battery"], 0.9], ["CONTROL", ["scope", "radar", "sonar", "pumps"], 1], ["AFT BATT", ["battery"], 0.9],
    ["ENGINES", ["engines"], 1.25], ["MOTORS", ["motors"], 0.85], ["AFT TORP", ["tubesA", "planes"], 1]];
  const SUM = ROOMS.reduce((a, r) => a + r[2], 0);

  /* the blueprint the boat lies on: a faint grid, painted once for the size */
  const ground = (Wd, Ht) => K.get(`dmg:${Wd}x${Ht}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d");
    g.fillStyle = BG; g.fillRect(0, 0, Wd, Ht);
    for (let x = 0; x < Wd; x += 16) for (let y = 0; y < Ht; y++) if ((y & 1) === 0) { g.fillStyle = x % 64 === 0 ? "rgba(127,170,200,.07)" : "rgba(127,170,200,.035)"; g.fillRect(x, y, 1, 1); }
    for (let y = 0; y < Ht; y += 16) for (let x = 0; x < Wd; x++) if ((x & 1) === 0) { g.fillStyle = y % 64 === 0 ? "rgba(127,170,200,.07)" : "rgba(127,170,200,.035)"; g.fillRect(x, y, 1, 1); }
    return c;
  });

  D.draw = (g, S, ui, now) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub, calm = PP.calm(), lab = PP.Render.lab;
    g.drawImage(ground(Wd, Ht), 0, 0);
    /* the boat across the top of the screen, clear of the HUD's two panels below */
    const sf = PP.Render.safe || { t: 28, b: 12 }, L = Math.min(Wd - 56, 600), x0 = Math.round(Wd / 2 - L / 2), R = Math.round(L * 0.07);
    const yC = Math.round(sf.t + 62 + R);
    /* her section: full amidships, tapering to the bow (left) and the stern */
    const half = x => { const t = (x - x0) / L; return R * (t < 0.14 ? Math.sqrt(Math.max(0, t / 0.14)) : t > 0.8 ? Math.sqrt(Math.max(0, (1 - t) / 0.2)) : 1); };
    /* the casing and the deck above her, the conning tower amidships, the periscopes */
    const cx = Math.round(x0 + L * 0.43);
    for (let x = Math.round(x0 + L * 0.05); x < x0 + L * 0.93; x++) { const top = Math.round(yC - Math.max(half(x), R * 0.55) - 5); g.fillStyle = M.iron[2]; g.fillRect(x, top, 1, 5); g.fillStyle = M.iron[0]; g.fillRect(x, top, 1, 1); }
    const tw = Math.round(L * 0.11), th = Math.round(R * 0.9);
    for (let y = 0; y < th; y++) { const k = y / th; g.fillStyle = K.ramp(M.iron, 0.2 + k * 0.6); g.fillRect(cx - tw / 2 + Math.round(y * 0.25), yC - R - 5 - th + y, tw - Math.round(y * 0.25), 1); }
    K.rect(g, cx - tw / 2 + 1, yC - R - 5 - th, tw - 2, 1, M.iron[0]);
    K.rect(g, cx - 4, yC - R - 5 - th - 18, 2, 18, M.steel[1]); K.rect(g, cx + 6, yC - R - 5 - th - 13, 2, 13, M.steel[1]);
    /* the pressure hull, lit from above, dithered between the steel's shades; the plating a band round the cutaway */
    for (let x = x0; x <= x0 + L; x++) {
      const h = half(x); if (h < 1) continue;
      for (let y = Math.round(yC - h); y < Math.round(yC + h); y++) {
        const v = (y - (yC - h)) / (2 * h), edge = Math.abs(y - yC) > h - 3 || x - x0 < 3 || x0 + L - x < 3;
        const t = edge ? 0.15 + v * 0.75 : 0.62 + v * 0.3, i = t * 4, j = Math.floor(i);
        g.fillStyle = edge ? M.steel[Math.min(4, j + (K.bayer(x, y) + 0.5 < i - j ? 1 : 0))] : M.iron[Math.min(4, j + (K.bayer(x, y) + 0.5 < i - j ? 1 : 0))];
        g.fillRect(x, y, 1, 1);
      }
    }
    /* the water in her, from the bilges up, its surface moving */
    if (s.water > 0.004) {
      const wy = yC + R - s.water * R * 2;
      for (let x = x0 + 3; x <= x0 + L - 3; x++) {
        const h = half(x) - 3; if (h < 1) continue;
        const sl = calm ? 0 : Math.sin(x / 11 + now / 420) * 1.2, top = Math.max(wy + sl, yC - h), bot = yC + h;
        for (let y = Math.round(top); y < bot; y++) { const v = (y - top) / Math.max(1, bot - top); g.fillStyle = K.ramp([M.water[1], M.water[2], M.water[3], M.water[4]], v + (K.bayer(x, y) * 0.25)); g.fillRect(x, y, 1, 1); }
        if (top > yC - h && top < bot) { g.fillStyle = M.water[0]; g.fillRect(x, Math.round(top), 1, 1); }
      }
    }
    /* the bulkheads, each with its door; each room hatched by its worst system, and sparking while it is bad */
    let rx = x0;
    ROOMS.forEach(([name, sys, share], i) => {
      const w = L * share / SUM, worst = Math.max(...sys.map(q => s.sys[q])), mid = rx + w / 2;
      if (i > 0) { const h = half(rx) - 2; K.rect(g, rx, yC - h, 2, h * 2, M.steel[3]); K.rect(g, rx, yC - h, 1, h * 2, M.steel[1]); K.rect(g, rx, yC - 4, 2, 9, M.iron[4]); }
      if (worst > 0.05) {
        const col = worst >= 0.5 ? "rgba(232,87,58,.75)" : "rgba(240,164,60,.6)", gap = worst >= 0.5 ? 3 : 4;
        for (let x = Math.round(rx + 3); x < rx + w - 2; x++) { const h = half(x) - 3; for (let y = Math.round(yC - h); y < yC + h; y++) if ((x + y) % gap === 0) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
        if (!calm) for (let k = 0; k < (worst >= 0.5 ? 6 : 3); k++) { const hh = K.hash(i, k, Math.floor(now / 90)); if (hh < 0.45) continue; K.px(g, mid + (K.hash(i, k, 7 + Math.floor(now / 90)) - 0.5) * w * 0.6, yC + (hh - 0.7) * R * 1.4, "#ffe08a"); }
      }
      const tone = worst >= 0.5 ? "#ff9a80" : worst > 0.05 ? "#f0a43c" : "#8d949d";
      K.text5(g, name, Math.round(mid - K.text5w(name) / 2), Math.round(yC + R + 7), tone, INK);
      if (worst > 0.05) K.rect(g, Math.round(mid - K.text5w(name) / 2), Math.round(yC + R + 15), K.text5w(name), 1, tone);
      rx += w;
    });
    /* the outline round her, last */
    for (let x = x0; x <= x0 + L; x++) { const h = half(x); if (h < 1) continue; K.px(g, x, Math.round(yC - h) - 1, INK); K.px(g, x, Math.round(yC + h), INK); }
    /* ---- the depth she is at, against her test and crush depths ---- */
    const k = C.SUBS[s.cls], test = Sub.testDepth(s), crush = Sub.crushDepth(s), maxD = Math.ceil((k.crush + 60) / 50) * 50;
    const by = Math.round(yC + R + 34), bx = x0, bw = L, X = d => Math.round(bx + PP.clamp(d / maxD, 0, 1) * bw);
    K.rect(g, bx - 1, by - 1, bw + 2, 8, INK);
    for (let x = bx; x < bx + bw; x++) {
      const d = (x - bx) / bw * maxD, col = d >= crush ? "#7a1a10" : d >= test ? RED_D : "#1d2a3a";
      for (let y = by; y < by + 6; y++) { g.fillStyle = d >= test && d < crush && (x + y) % 3 === 0 ? "#3a1a12" : col; g.fillRect(x, y, 1, 1); }
    }
    if (crush < k.crush - 1) for (let x = X(crush); x < X(k.crush); x++) if (x % 2) K.px(g, x, by + 7, "#ff9a80");
    const dx = X(s.depth);
    K.poly(g, [[dx, by + 7], [dx - 4, by + 13], [dx + 4, by + 13]], "#ece7dc");
    if (Math.abs(s.ordDepth - s.depth) > 3) { const ox = X(s.ordDepth); K.poly(g, [[ox, by - 2], [ox - 3, by - 7], [ox + 3, by - 7]], "#e6bd6a"); }
    label3(g, "DEPTH", bx, by - 10);
    lab("d:now", `<b>${Sub.surfaced(s) ? "Surfaced" : Math.round(s.depth) + " ft"}</b>`, dx, by + 15, "rd" + (s.depth > test ? " danger" : ""), "ct");
    /* test and crush over the bar: drawn apart when damage has brought the crush depth up near the test */
    const near = Math.abs(X(crush) - X(test)) < 70;
    lab("d:test", `Test ${test}`, X(test), by - 3, "cap amber", near && crush > test ? "rb" : near ? "lb" : "cb");
    lab("d:crush", `Crush ${Math.round(crush)}`, X(crush), by - 3, "cap danger", near && crush > test ? "lb" : near ? "rb" : "cb");
  };
  const RED_D = "#5a2216";
  const label3 = (g, t, x, y) => K.text5(g, t, x, y, "#8d949d", INK);
})();
