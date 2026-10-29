/* The Long Convoy -- the control room: the instruments, painted on a steel
 * panel in brass bezels.
 *
 * The depth gauge, from the surface to below the crush depth, its red arc
 * from the test depth down, the ordered depth a brass pointer on its rim.
 * The gyro repeater, its card turning under the lubber line, the ordered
 * course marked. The speed log, the engine telegraph, the battery and the
 * fuel, the tube board with each tube's lamp and its reload. The TDC and
 * the clock are the HUD's, as on every station. The panel is painted once
 * for its size; the needles and lamps every frame, the live figures in the
 * HUD's own type. */
"use strict";
(() => {
  const K = PP.K, M = K.M, C = PP.C, Sub = PP.Sub, esc = PP.esc, P = PP.Panel = {};
  const INK = "#07090d", FACE = "#e9e2cf", FACE2 = "#d6cdb5", RED = "#c8402a", NEEDLE = "#11141a", BRASS = M.brass;

  /* laid out on a 640 by 360 frame: the depth gauge on the left, the gyro and the telegraph across the top, the
   * speed log, the battery and fuel and the tube board below; the bottom right left clear for the HUD's TDC.
   * Painted are the dials and their fixed legends; the live figures are the HUD's type (PP.Render.lab) */
  const L = { depth: [100, 130, 62], gyro: [262, 118, 52], tele: [440, 114, 40], log: [580, 118, 30], bars: [40, 244, 52], tubes: [204, 248], seams: [186, 344] };
  /* the steel plate with its seams (between the dials, never through them) and rivets */
  const plate = (Wd, Ht, sx) => K.get(`panel:${Wd}x${Ht}:${sx.join(",")}`, () => {
    const c = K.mk(Wd, Ht), g = c.getContext("2d");
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x += 1) {
      const v = K.vnoise(x / 40, y / 40, 3) * 0.5 + K.hash(x, y, 9) * 0.25 + K.bayer(x, y) * 0.3;
      g.fillStyle = M.slate[PP.clamp(Math.round(2.6 - v * 1.4), 1, 4)]; g.fillRect(x, y, 1, 1);
    }
    for (const x0 of sx) { K.rect(g, x0, 0, 1, Ht, INK); K.rect(g, x0 + 1, 0, 1, Ht, M.slate[0]); for (let y = 10; y < Ht; y += 24) { K.rivet(g, x0 - 6, y, M.slate[0], INK); K.rivet(g, x0 + 5, y, M.slate[0], INK); } }
    for (let x = 10; x < Wd; x += 24) { K.rivet(g, x, 6, M.slate[0], INK); K.rivet(g, x, Ht - 8, M.slate[0], INK); }
    return c;
  });
  const bezel = (g, x, y, r) => {
    K.disc(g, x, y + 2, r + 5, r + 5, "rgba(0,0,0,.45)");
    for (let i = 4; i >= 0; i--) { g.fillStyle = BRASS[PP.clamp(4 - i, 0, 4)]; K.disc(g, x - (i < 2 ? 1 : 0), y - (i < 2 ? 1 : 0), r + 1 + i * 0.8, r + 1 + i * 0.8); }
    g.fillStyle = BRASS[2]; K.disc(g, x, y, r + 1.5, r + 1.5);
    g.fillStyle = FACE; K.disc(g, x, y, r, r);
    g.fillStyle = FACE2; K.disc(g, x + 1, y + 2, r - 2, r - 3); g.fillStyle = FACE; K.disc(g, x, y, r - 3, r - 3);
  };
  /* a needle from the centre at angle a (screen radians, 0 east, clockwise) */
  const needle = (g, x, y, a, len, col = NEEDLE, w = 2) => { K.line(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, col, w); K.disc(g, x, y, 2.5, 2.5, BRASS[1]); K.px(g, x - 1, y - 1, BRASS[0]); };
  /* a painted legend: short, fixed words in the panel's own pixel letters */
  const label = (g, s, x, y, col = "#d9cfb6") => K.text5(g, s, Math.round(x - K.text5w(s) / 2), Math.round(y), col, INK);
  const fig = (g, s, x, y, col = NEEDLE) => K.text3(g, s, Math.round(x - K.text3w(s) / 2), Math.round(y - 2), col);

  P.draw = (g, S, ui) => {
    const Wd = g.canvas.width, Ht = g.canvas.height, s = S.sub, k = C.SUBS[s.cls], lab = PP.Render.lab;
    g.imageSmoothingEnabled = false;
    const sf = PP.Render.safe || { t: 28, b: 12 }, bandH = Ht - sf.t - sf.b + 30;
    const u = Math.min(Wd / 640, bandH / 360), ox = (Wd - 640 * u) / 2, oy = sf.t - 30 + (bandH - 360 * u) / 2, PX = v => Math.round(ox + v * u), PY = v => Math.round(oy + v * u);
    g.drawImage(plate(Wd, Ht, L.seams.map(PX)), 0, 0);
    /* ---- the depth gauge, the big one on the left ---- */
    {
      const x = PX(L.depth[0]), y = PY(L.depth[1]), r = Math.round(L.depth[2] * u), maxD = Math.ceil((k.crush + 60) / 50) * 50;
      bezel(g, x, y, r);
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5, ang = d => A0 + PP.clamp(d / maxD, 0, 1) * SW;
      const test = Sub.testDepth(s), crush = Sub.crushDepth(s);
      for (let d = test; d <= maxD; d += 2) { const a = ang(d); g.fillStyle = d >= crush ? "#7a1a10" : RED; g.fillRect(Math.round(x + Math.cos(a) * (r - 6)), Math.round(y + Math.sin(a) * (r - 6)), 2, 2); }
      for (let d = 0; d <= maxD; d += 25) {
        const a = ang(d), big = d % 100 === 0, r0 = r - (big ? 10 : 6);
        K.line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1);
        if (big) fig(g, String(d), x + Math.cos(a) * (r - 19), y + Math.sin(a) * (r - 19));
      }
      /* the ordered depth, on the rim */
      const ao = ang(s.ordDepth);
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.07) * (r + 8), y + Math.sin(ao - 0.07) * (r + 8)], [x + Math.cos(ao + 0.07) * (r + 8), y + Math.sin(ao + 0.07) * (r + 8)]], "#ffd36a");
      needle(g, x, y, ang(s.depth), r - 12, NEEDLE, 2);
      label(g, "DEPTH", x, y + r * 0.42); fig(g, "FT", x, y + r * 0.42 + 12);
      lab("p:depth", `<b>${Sub.surfaced(s) ? "Surfaced" : Math.round(s.depth) + " ft"}</b>`, x, y + r + 8, "rd big" + (s.depth > test ? " danger" : ""), "ct");
      lab("p:limits", `Test ${test} · crush ${Math.round(crush)}${crush < k.crush - 1 ? ", damaged" : ""}`, x, y + r + 23, "cap" + (crush < k.crush - 1 ? " danger" : ""), "ct");
    }
    /* ---- the gyro repeater: the card turns under the lubber line ---- */
    {
      const x = PX(L.gyro[0]), y = PY(L.gyro[1]), r = Math.round(L.gyro[2] * u);
      bezel(g, x, y, r);
      for (let dg = 0; dg < 360; dg += 5) {
        const a = (dg * PP.DEG - s.hdg) - Math.PI / 2, big = dg % 30 === 0, r0 = r - (big ? 9 : dg % 10 === 0 ? 6 : 4);
        K.line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1);
        if (big) { const t = { 0: "N", 90: "E", 180: "S", 270: "W" }[dg] || String(dg / 10); if (t.length === 1 && "NESW".includes(t)) K.text5(g, t, Math.round(x + Math.cos(a) * (r - 17) - 2), Math.round(y + Math.sin(a) * (r - 17) - 3), dg === 0 ? RED : NEEDLE); else fig(g, t, x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16)); }
      }
      /* the ordered course */
      const ao = (s.ordHdg - s.hdg) - Math.PI / 2;
      K.poly(g, [[x + Math.cos(ao) * (r + 1), y + Math.sin(ao) * (r + 1)], [x + Math.cos(ao - 0.08) * (r + 8), y + Math.sin(ao - 0.08) * (r + 8)], [x + Math.cos(ao + 0.08) * (r + 8), y + Math.sin(ao + 0.08) * (r + 8)]], "#ffd36a");
      /* the lubber line, and a little boat */
      K.poly(g, [[x, y - r + 1], [x - 4, y - r - 7], [x + 4, y - r - 7]], RED);
      K.poly(g, [[x, y - 14], [x - 4, y + 10], [x + 4, y + 10]], "rgba(17,20,26,.35)");
      const turning = Math.abs(PP.angDiff(s.hdg, s.ordHdg)) > 0.02;
      lab("p:course", `<b>${PP.deg3(s.hdg)}</b>${turning ? `<span class="ord">${PP.deg3(s.ordHdg)}</span>` : ""}`, x, y + r + 8, "rd big", "ct");
      label(g, "COURSE", x, y + r + 26, "#aab0b8");
    }
    /* ---- the speed log ---- */
    {
      const x = PX(L.log[0]), y = PY(L.log[1]), r = Math.round(L.log[2] * u), mx = 25;
      bezel(g, x, y, r);
      const A0 = Math.PI * 0.75, SW = Math.PI * 1.5, ang = v => A0 + PP.clamp(v / mx, 0, 1) * SW;
      for (let v = 0; v <= mx; v += 1) { const a = ang(v), big = v % 5 === 0; K.line(g, x + Math.cos(a) * (r - (big ? 7 : 4)), y + Math.sin(a) * (r - (big ? 7 : 4)), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), NEEDLE, 1); if (big) fig(g, String(v), x + Math.cos(a) * (r - 13), y + Math.sin(a) * (r - 13)); }
      needle(g, x, y, ang(Math.abs(s.spd)), r - 9);
      lab("p:speed", `<b>${s.spd.toFixed(1)} kn</b>`, x, y + r + 8, "rd", "ct");
      label(g, "SPEED", x, y + r + 24, "#aab0b8");
    }
    /* ---- the telegraph: a half-dial, the bells around it, the handle on the ordered one ---- */
    {
      const tx = PX(L.tele[0]), ty = PY(L.tele[1]), tr = Math.round(L.tele[2] * u);
      g.fillStyle = BRASS[3]; K.disc(g, tx, ty, tr + 4, tr + 4); g.fillStyle = "#1c2028"; K.disc(g, tx, ty, tr, tr);
      const bells = C.BELLS, n = bells.length, bang = i => Math.PI + (i / (n - 1)) * Math.PI;
      const BL = ["BACK", "STOP", "1/3", "2/3", "STD", "FULL", "FLANK"];
      bells.forEach((b, i) => { const a = bang(i), t = BL[i], w = K.text5w(t), lx = tx + Math.cos(a) * (tr + 9 + w / 2 * Math.abs(Math.cos(a))), ly = ty + Math.sin(a) * (tr + 9) - (Math.abs(Math.cos(a)) > 0.9 ? 6 : 0); K.text5(g, t, PP.clamp(Math.round(lx - w / 2), 2, Wd - w - 2), Math.round(ly - 3), i === s.bell ? "#ffd36a" : "#9aa3ad", INK); K.line(g, tx + Math.cos(a) * (tr - 8), ty + Math.sin(a) * (tr - 8), tx + Math.cos(a) * (tr - 2), ty + Math.sin(a) * (tr - 2), "#9aa3ad", 1); });
      needle(g, tx, ty, bang(s.bell), tr - 4, BRASS[1], 3);
      label(g, "TELEGRAPH", tx, ty + 10);
      lab("p:bell", s.silent ? `<b>${esc(C.BELLS[s.bell])}</b><span class="ord green">silent</span>` : `<b>${esc(C.BELLS[s.bell])}</b>`, tx, ty + tr + 8, "rd big", "ct");
    }
    /* ---- battery and fuel ---- */
    {
      const by = PY(L.bars[1]), bh = Math.round(L.bars[2] * u);
      const bar = (x, v, cap, name, id) => {
        K.rect(g, x - 1, by - 1, 18, bh + 2, INK); K.rect(g, x, by, 16, bh, "#1a1e26");
        const h = Math.round(bh * PP.clamp(v, 0, 1)), col = v < 0.12 ? "#e8573a" : v < 0.3 ? "#f0a43c" : "#7fe0a8";
        for (let y = 0; y < h; y++) { g.fillStyle = (y % 4 === 3) ? K.mix(col, "#000", 0.35) : col; g.fillRect(x + 2, by + bh - 1 - y, 12, 1); }
        if (cap < 1) { const cy2 = by + bh - Math.round(bh * cap); K.rect(g, x - 2, cy2, 20, 1, "#e8573a"); }
        label(g, name, x + 8, by + bh + 5);
        lab(id, `${Math.round(v * 100)}%`, x + 8, by + bh + 15, "rd" + (v < 0.12 ? " danger" : v < 0.3 ? " amber" : ""), "ct");
      };
      bar(PX(L.bars[0]), s.bat, Sub.batCap(s), "BATT", "p:bat");
      if (Sub.charge(s).rate > 0 && Sub.batCap(s) - s.bat >= 0.005) lab("p:chg", "Charging", PX(L.bars[0]) - 1, by + bh + 31, "rd sm green", "lt");
      bar(PX(L.bars[0] + 34), s.fuel, 1, "FUEL", "p:fuel");
    }
    /* ---- the tube board: each tube's lamp, the spares beside each bank, the chosen bank in brass ---- */
    {
      const x = PX(L.tubes[0]), y = PY(L.tubes[1]);
      label(g, "TUBES", x + 34, y - 12);
      const lamp = (lx, ly, v) => {
        K.rect(g, lx - 1, ly - 1, 10, 14, INK);
        if (v === 0) { K.rect(g, lx, ly, 8, 12, "#7fe0a8"); K.rect(g, lx + 1, ly + 1, 3, 4, "#d6f5e2"); }
        else if (v > 0) { K.rect(g, lx, ly, 8, 12, "#2a2418"); const h = Math.round(12 * (1 - v / C.TORP.reload)); K.rect(g, lx, ly + 12 - h, 8, h, "#f0a43c"); }
        else K.rect(g, lx, ly, 8, 12, "#1a1e26");
      };
      s.tubes.F.forEach((v, i) => lamp(x + i * 12, y, v));
      s.tubes.A.forEach((v, i) => lamp(x + i * 12, y + 22, v));
      const nF = Math.max(s.tubes.F.length, s.tubes.A.length) * 12 + 6;
      lab("p:fwd", `<span class="c">Fwd</span>${s.store.F} spare`, x + nF, y + 6, "rd sm" + (s.bank === "F" ? " brass" : ""), "lm");
      lab("p:aft", `<span class="c">Aft</span>${s.store.A} spare`, x + nF, y + 28, "rd sm" + (s.bank === "A" ? " brass" : ""), "lm");
      if (s.spread > 1) lab("p:spread", `Spread of ${s.spread}`, x, y + 42, "cap", "lt");
    }
  };
})();
