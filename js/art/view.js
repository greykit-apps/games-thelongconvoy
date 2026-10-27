/* PumaPack -- looking out: the sea from a periscope, the bridge, or
 * the title's lookout.
 *
 * The sky by the sun's height and the weather, the sun or the moon on the
 * water, the stars; the islands standing up off the horizon, hazed by their
 * distance; then the ships, far to near, each traced at the angle on the bow
 * it truly shows, as long on the screen as its length over its range, sat
 * on the water by the eye's height, and cut off by the curve of the earth
 * when it is beyond the horizon (masts and funnels first, then the hull).
 * What the engine says can be seen (PP.Detect) is what is drawn.
 *
 * Bearings are true, in radians; the view is centred on o.brg. */
"use strict";
(() => {
  const K = PP.K, C = PP.C, Sea = PP.Sea, Det = PP.Detect, A = PP.ShipArt, FX = PP.FX, V = PP.View = {};
  const RE = 8.3e6;                                   /* the earth's radius, yards, refraction allowed */
  const tmp = { c: null };
  const lightKey = L => L > 0.55 ? "day" : L > 0.22 ? "dusk" : "night";
  V.lightKey = lightKey;
  /* where the sun and the moon are: azimuth (true) and elevation, radians */
  V.sunPos = t => { const h = (t / 3600) % 24; return { az: PP.normAng((90 + (h - 6) / 12 * 180) * PP.DEG), el: C.sun(t) * 1.15 }; };
  V.moonPos = t => { const s = V.sunPos(t), ph = C.moon(t); return { az: PP.normAng(s.az + Math.PI + (ph - 0.5) * 1.2), el: -s.el * 0.85 + 0.1, ph }; };

  /* the sky, cached by its colours and size */
  const skyImg = (H, cols) => K.get(`sky:${H}:${cols.join("")}`, () => { const c = K.mk(4, H); K.vgrad(c.getContext("2d"), 0, 0, 4, H, cols, 3); return c; });

  /* the swell: crests catching the sky, wider toward us. Each is a point fixed on the water for a moment,
   * so as the boat moves they stream past the way the sea truly would: toward you looking ahead, away
   * looking astern, across looking abeam, and between on the quarters; still when she is stopped. */
  const CR = { list: [], x: 0, y: 0 };
  function crests(g, S, o, f, hz, x0, x1, y1, eyeYd, tt) {
    const rows = y1 - hz - 1;
    if (rows < 2) return;
    /* a new sea (the title's, or a jump in the eye) takes none of the old crests with it */
    if (PP.dist(CR.x, CR.y, o.x, o.y) > 500) CR.list.length = 0;
    CR.x = o.x; CR.y = o.y;
    const at = c => {
      const d = PP.dist(o.x, o.y, c.x, c.y), off = PP.angDiff(o.brg, PP.angTo(o.x, o.y, c.x, c.y));
      if (d < 0.05 || Math.abs(off) > o.fov / 2) return null;
      const y = Math.round(hz + f * eyeYd / d);
      if (y <= hz || y >= y1) return null;
      const w = Math.max(1, Math.round(c.len * f / d));
      return { x: Math.round(o.cx + Math.tan(off) * f - w / 2), y, w, k: (y - hz) / (y1 - hz) };
    };
    /* the old go when their time is up or the view has left them; new ones come down where we look, thicker toward us */
    CR.list = CR.list.filter(c => c.end > tt && c.end - tt < 3 && at(c));
    const want = Math.round(rows * 0.45 * (5.5 + S.wx.sea));
    for (let tries = 0; CR.list.length < want && tries < want * 4; tries++) {
      const y = hz + 1 + Math.floor(Math.random() * rows), k = (y - hz) / (y1 - hz);
      if (Math.random() * (9 + S.wx.sea) > 2 + 7 * k + S.wx.sea) continue;
      const x = x0 + Math.random() * (x1 - x0), d = f * eyeYd / (y - hz), b = o.brg + Math.atan((x - o.cx) / f);
      CR.list.push({ x: o.x + PP.hx(b) * d, y: o.y + PP.hy(b) * d, len: (2 + k * 16 * (1.05 + Math.random() * 0.45)) * d / f, end: tt + 0.5 + Math.random() * 1.5 });
    }
    for (const c of CR.list) {
      const p = at(c); if (!p) continue;
      g.fillStyle = `rgba(200,220,236,${(0.05 + 0.08 * p.k + S.wx.sea * 0.012).toFixed(3)})`; g.fillRect(p.x, p.y, p.w, 1);
    }
  }

  /* o: { x, y (the eye), eyeH (ft), brg, fov (radians across 2r), cx, cy, r, W, H, now, aids, hi, mask, sea (state), ships: filter } */
  V.draw = (g, S, o) => {
    const t = S.t, L = Det.light(S), sun = C.sun(t), wx = C.WX[S.wx.k], cols = K.sky(Math.round(L * 40) / 40, Math.round(sun * 40) / 40, wx.dark);
    const f = o.r / Math.tan(o.fov / 2), hBob = o.calm ? 0 : Math.sin(o.now / 1300) * S.wx.sea * 0.5 * (o.mask === "scope" ? 1.4 : 0.8);
    const hz = Math.round(o.cy + hBob - (o.eyeH > 10 ? 0 : 0)), x0 = Math.round(o.cx - o.r), x1 = Math.round(o.cx + o.r), y0 = Math.round(o.cy - o.r), y1 = Math.round(o.cy + o.r);
    const toX = b => o.cx + Math.tan(PP.angDiff(o.brg, b)) * f;
    const inView = b => Math.abs(PP.angDiff(o.brg, b)) < o.fov / 2 + 0.15;
    const eyeYd = o.eyeH / 3, dip = Math.sqrt(2 * eyeYd / RE), dh = Math.sqrt(2 * eyeYd * RE);
    const vis = Det.shipRange(S, { len: 130 });
    const horizonCol = cols[4];
    g.save();
    g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    /* ---- the sky ---- */
    const sky = skyImg(Math.max(8, Math.round((hz - y0) / 4) * 4), cols);
    g.imageSmoothingEnabled = false;
    g.save(); g.translate(0, y0); g.fillStyle = g.createPattern(sky, "repeat-x"); g.fillRect(x0, 0, x1 - x0, hz - y0); g.restore();
    /* stars, by night: fixed to the sky's bearings */
    if (L < 0.3) {
      const n = 220, a = (0.3 - L) / 0.3 * (1 - wx.dark * 2);
      for (let i = 0; i < n; i++) {
        const b = K.hash(i, 1, 77) * PP.TAU, el = K.hash(i, 2, 77) * 0.5 + 0.02;
        if (!inView(b)) continue;
        const x = toX(b), y = hz - el * f; if (y < y0 || y > hz - 2) continue;
        g.fillStyle = `rgba(230,236,255,${(a * (0.3 + K.hash(i, 3, 77) * 0.7)).toFixed(2)})`; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    /* the sun or the moon */
    const sp = V.sunPos(t), mp = V.moonPos(t);
    const disc = (p, rad, col, glow) => { if (p.el < -0.05 || !inView(p.az)) return; const x = toX(p.az), y = hz - p.el * f; g.fillStyle = glow; K.disc(g, x, y, rad * 2.2, rad * 2.2); g.fillStyle = col; K.disc(g, x, y, rad, rad); };
    if (wx.dark < 0.3) {
      disc(sp, Math.max(2, f * 0.0046), sun > 0.25 ? "#fff6dc" : "#ffcf8a", sun > 0.25 ? "rgba(255,246,220,.18)" : "rgba(255,170,90,.22)");
      if (L < 0.45) disc(mp, Math.max(2, f * 0.0042), "#f2f0e2", "rgba(220,226,240,.12)");
    }
    /* ---- the islands: for each column, the first land along the bearing, and how high it stands ---- */
    const step = 2;
    for (let x = x0; x < x1; x += step) {
      const b = PP.normAng(o.brg + Math.atan((x - o.cx) / f));
      let best = 0, bd = 0;
      for (let d = 1500; d < 90000; d *= 1.09) {
        const px = o.x + PP.hx(b) * d, py = o.y + PP.hy(b) * d, dep = Sea.depthAt(px, py);
        if (dep < 0) {
          const ht = -dep / 3, hidden = d > dh ? (d - dh) * (d - dh) / (2 * RE) : 0, a = (ht - hidden) / d;
          if (a > best) { best = a; bd = d; }
          if (best > 0 && d > bd * 1.6) break;
        }
      }
      if (best <= 0) continue;
      const hpx = Math.max(1, Math.round(best * f)), haze = PP.clamp(bd / (vis * 2.2), 0.15, 0.95);
      const land = K.dim(K.mix("#3c4a3a", "#56604a", K.hash(x >> 3, 1, 5)), L, 0);
      g.fillStyle = K.mix(land, horizonCol, haze);
      g.fillRect(x, hz - hpx, step, hpx);
    }
    /* ---- the sea, row by row ---- */
    const seaFar = K.mix(K.dim("#3e6c8c", L, 0.04), horizonCol, 0.5), seaNear = K.dim("#14324a", L, 0.02);
    const glit = wx.dark < 0.35 && (sun > -0.05 ? sp : L < 0.4 && mp.ph > 0.25 ? mp : null);
    const gx = glit && inView(glit.az) ? toX(glit.az) : null;
    const tt = o.now / 1000;
    for (let y = hz; y < y1; y++) {
      const k = PP.clamp((y - hz) / Math.max(1, y1 - hz), 0, 1);
      g.fillStyle = K.mix(seaFar, seaNear, Math.pow(k, 0.55)); g.fillRect(x0, y, x1 - x0, 1);
      if (gx !== null) {
        const sw = 4 + k * 70, nn = 2 + Math.round(k * 6);
        for (let i = 0; i < nn; i++) { const hsh = K.hash(y, i + Math.floor(tt * 3), 9); if (hsh < 0.5) continue; const xx = gx + (K.hash(y, i, 10) - 0.5) * sw * 2, w = 1 + Math.round(hsh * 3 * (1 + k * 2)); g.fillStyle = glit === sp && sun > 0.2 ? `rgba(255,250,230,${(0.25 + hsh * 0.35).toFixed(2)})` : `rgba(255,214,160,${(0.2 + hsh * 0.3).toFixed(2)})`; g.fillRect(Math.round(xx), y, w, 1); }
      }
    }
    crests(g, S, o, f, hz, x0, x1, y1, eyeYd, tt);
    /* ---- the ships, far to near ---- */
    const drawn = [];
    /* the boats of the pack on the surface, as ships to the eye (the one looking is under 30 yards, and left out) */
    const boats = (S.subs || []).filter(q => !q.lost && q.depth <= 2).map(q => ({ id: "b" + q.id, boat: true, cls: "sub", x: q.x, y: q.y, hdg: q.hdg, spd: q.spd, sinking: 0, fire: 0, lit: false }));
    const list = S.ships.concat(boats).filter(sh => sh.id !== o.self && !(sh.sunk && S.t - sh.sunkT > 60)).map(sh => ({ sh, d: PP.dist(o.x, o.y, sh.x, sh.y), b: PP.angTo(o.x, o.y, sh.x, sh.y) })).filter(q => q.d > 30 && inView(q.b)).sort((a, b) => b.d - a.d);
    const lk = lightKey(L);
    for (const q of list) {
      const sh = q.sh, k = C.SHIPS[sh.cls];
      const reach = Det.eyeTo(S, o.eyeH, k);
      if (q.d > reach * 1.08) continue;
      const aob = PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, o.x, o.y));
      const px = k.len * f / q.d;
      if (px < 3) continue;
      const sp2 = A.get(sh.cls, aob, px, lk), spr = sp2.c, kk = sp2.k;
      const x = toX(q.b);
      let wl, clipY;
      if (q.d < dh) { wl = hz + f * (eyeYd / q.d + q.d / (2 * RE) - dip); clipY = wl + 1; }
      else { const hid = (q.d - dh) * (q.d - dh) / (2 * RE); wl = hz + f * hid / q.d; clipY = hz; }
      const sinkDown = sh.sinking ? Math.min(1, sh.sinking / sh.sinkT) : 0;
      const haze = PP.clamp(Math.pow(q.d / reach, 2) * 0.85 + (1 - S.wx.vis) * 0.35 * (q.d / reach), 0, 0.92);
      /* the picture, hazed toward the horizon's colour, on a scratch canvas */
      const w = Math.ceil(spr.width * kk), h = Math.ceil(spr.height * kk);
      if (!tmp.c || tmp.c.width < w || tmp.c.height < h) tmp.c = K.mk(Math.max(w, tmp.c ? tmp.c.width : 0), Math.max(h, tmp.c ? tmp.c.height : 0));
      const tg = tmp.c.getContext("2d");
      tg.clearRect(0, 0, w + 1, h + 1); tg.imageSmoothingEnabled = false;
      tg.globalCompositeOperation = "source-over"; tg.drawImage(spr, 0, 0, w, h);
      if (haze > 0.03) { tg.globalCompositeOperation = "source-atop"; tg.globalAlpha = haze; tg.fillStyle = horizonCol; tg.fillRect(0, 0, w, h); tg.globalAlpha = 1; tg.globalCompositeOperation = "source-over"; }
      g.save();
      g.beginPath(); g.rect(x0, y0, x1 - x0, Math.max(0, clipY - y0)); g.clip();
      g.translate(Math.round(x), Math.round(wl + sinkDown * h * 0.85));
      if (sh.sinking) g.rotate((sh.sinkBy === "fore" ? -1 : sh.sinkBy === "aft" ? 1 : 0.4) * sinkDown * 0.35 * Math.sign(aob || 1));
      g.drawImage(tmp.c, 0, 0, w, h, -Math.round(spr.ox * kk), -Math.round(spr.oy * kk), w, h);
      g.restore();
      /* a bow wave, a wake */
      if (!sh.sinking && sh.spd > 3 && q.d < dh && px > 10 && L > 0.15) {
        const bowX = x + Math.sin(aob) * px * 0.5 * Math.sign(1), ww = Math.max(1, Math.round(px * 0.04));
        g.fillStyle = `rgba(230,240,246,${(0.55 * (1 - haze)).toFixed(2)})`; g.fillRect(Math.round(bowX - ww), Math.round(wl), ww * 2, 1);
      }
      /* a searchlight, sweeping toward us */
      if (sh.lit && L < 0.35 && !sh.sinking) {
        const lx = x, ly = wl - k.mast / 3 * f / q.d * 0.45, sw = Math.sin(o.now / 900 + sh.id) * 0.25;
        K.poly(g, [[lx, ly], [o.cx + (lx - o.cx) * 0.2 + sw * 200 - 30, y1], [o.cx + (lx - o.cx) * 0.2 + sw * 200 + 30, y1]], "rgba(255,250,215,.06)");
        g.fillStyle = "rgba(255,250,215,.8)"; K.disc(g, lx, ly, 1.5, 1.5);
      }
      if (sh.fire > 0.05 && Math.random() < sh.fire * 0.25) FX.smoke(sh.x + (Math.random() - 0.5) * k.len * 0.5, sh.y + (Math.random() - 0.5) * 20, 20, { r: 10 + k.len * 0.1, dark: 0.85 });
      if (!sh.boat) drawn.push({ id: sh.id, x, y: wl - spr.top * kk * 0.5, top: wl - spr.top * kk, wl, d: q.d, px, haze });
    }
    /* ---- our torpedoes' wakes, by day ---- */
    if (L > 0.35) for (const tp of S.torps) {
      if (!tp.wake) continue;
      for (let j = 0; j < 12; j++) {
        const bx = tp.x - PP.hx(tp.hdg) * j * 18, by = tp.y - PP.hy(tp.hdg) * j * 18, d = PP.dist(o.x, o.y, bx, by), b = PP.angTo(o.x, o.y, bx, by);
        if (d < 40 || d > dh || !inView(b)) continue;
        const y = hz + f * (eyeYd / d + d / (2 * RE) - dip);
        g.fillStyle = `rgba(236,244,248,${(0.7 - j * 0.05).toFixed(2)})`; g.fillRect(Math.round(toX(b)), Math.round(y), Math.max(1, Math.round(3 * f / d * 8)), 1);
      }
    }
    /* ---- what flies and splashes (o.late: what is in the air waits for the caller, over its own deck) ---- */
    const shade = PP.clamp(L + 0.25, 0.3, 1), white = a => `rgba(${Math.round(224 * shade)},${Math.round(236 * shade)},${Math.round(244 * shade)},${a.toFixed(2)})`;
    const fxDraw = air => { for (const p of FX.items) {
      if (p.t < 0 || (p.k === "arc") !== air) continue;
      /* a charge or a bomb in the air: along its arc, a dark speck against the sky */
      if (p.k === "arc") {
        const u = PP.clamp(p.t / p.life, 0, 1), ax = PP.lerp(p.x, p.tx, u), ay = PP.lerp(p.y, p.ty, u), az = p.z * (1 - u) + 4 * p.hp * u * (1 - u);
        const d = PP.dist(o.x, o.y, ax, ay), b = PP.angTo(o.x, o.y, ax, ay);
        if (d < 3 || !inView(b)) continue;
        const s = f / d / 3, base = d < dh ? hz + f * (eyeYd / d + d / (2 * RE) - dip) : hz, w = Math.max(1, Math.round(p.sz * s));
        g.fillStyle = K.dim("#1c1f24", Math.max(L, 0.35));
        if (w < 3) g.fillRect(Math.round(toX(b) - w / 2), Math.round(base - az * s - w / 2), w, w); else K.disc(g, toX(b), base - az * s, w / 2, w * 0.4);
        continue;
      }
      const d = PP.dist(o.x, o.y, p.x, p.y), b = PP.angTo(o.x, o.y, p.x, p.y);
      if (d < 3 || (d < 30 && p.k === "flash") || !inView(b)) continue;
      const x = toX(b), base = d < dh ? hz + f * (eyeYd / d + d / (2 * RE) - dip) : hz, s = f / d / 3, a = 1 - p.t / p.life;
      if (p.k === "column") {
        const grow = Math.sin(Math.min(1, p.t / p.life * 2.2) * Math.PI / 2), hh = p.h * s * grow * (1 - Math.max(0, p.t / p.life - 0.5) * 1.6), ww = Math.max(1, p.w * s);
        g.fillStyle = white(0.9 * a); g.fillRect(Math.round(x - ww / 2), Math.round(base - hh), Math.round(ww), Math.round(hh));
        K.disc(g, x, base - hh, ww * 0.7, ww * 0.45);
      } else if (p.k === "fountain") {
        /* the dome heaves, bursts up into a column with a crown, hangs, and falls back as spray, wider as it falls */
        const u = p.t / p.life, rise = 1 - Math.pow(1 - Math.min(1, u / 0.22), 3), fall = Math.max(0, (u - 0.45) / 0.55);
        const hh = p.h * s * rise * (1 - fall * 0.8), ww = Math.max(1, p.w * s * (1 + fall * 0.9)), al = 0.92 * (1 - fall * fall);
        g.fillStyle = white(al * 0.8); K.disc(g, x, base, ww * (1.1 + 0.6 * rise), Math.max(1, ww * 0.22));
        const n = Math.max(1, Math.round(hh / 2));
        g.fillStyle = white(al);
        /* the body: rows of water, ragged at the edges, thinner toward the top */
        for (let i = 0; i < n; i++) {
          const v = i / n, w = Math.max(1, ww * (0.45 + 0.85 * v * v) * (0.85 + 0.3 * K.hash(p.seed, i, 63))), jx = (K.hash(p.seed, i, 64) - 0.5) * ww * 0.15;
          g.fillStyle = white(al * (1 - 0.35 * v) * (0.8 + 0.2 * K.hash(p.seed, i, 65)));
          g.fillRect(Math.round(x + jx - w / 2), Math.round(base - v * hh - 2), Math.round(w), 2);
        }
        g.fillStyle = white(al * 0.7);
        if (hh >= 1) K.disc(g, x, base - hh, ww * 0.7, Math.max(1, ww * 0.3));
        /* the spray: drops thrown out of the crown, coming down as it falls */
        const dw = Math.max(1, Math.round(s * 2.5));
        for (let i = 0; i < 26; i++) {
          const hx = K.hash(p.seed, i, 61), hy = K.hash(p.seed, i, 62);
          const sx = x + (hx - 0.5) * ww * (1.5 + 2.5 * fall) * (0.6 + hy), sy = base - hh * (0.7 + 0.45 * hy) + fall * hh * (0.3 + hy);
          if (sy < base) { g.fillStyle = white(al * (0.5 + 0.5 * hy)); g.fillRect(Math.round(sx), Math.round(sy), dw, dw); }
        }
      } else if (p.k === "flash") {
        g.fillStyle = `rgba(255,214,140,${(0.9 * a).toFixed(2)})`; K.disc(g, x, base - p.h * s, p.r * s * (0.6 + p.t / p.life), p.r * s * 0.6 * (0.6 + p.t / p.life));
      } else if (p.k === "smoke") {
        const c = Math.round(PP.lerp(40, 120, 1 - p.dark) * PP.clamp(L + 0.25, 0.3, 1));
        g.fillStyle = `rgba(${c},${c},${c + 4},${(0.6 * a).toFixed(2)})`; K.disc(g, x, base - p.z * s, p.r * s, p.r * s * 0.8);
      } else if (p.k === "boil") {
        /* white water welling up in patches, spreading and going grey as it settles */
        const grow = 0.6 + 0.4 * Math.min(1, p.t / 2), sd = p.seed || 0;
        for (let i = 0; i < 7; i++) {
          const ox = (K.hash(sd, i, 66) - 0.5) * p.r * 1.6 * grow, oy = (K.hash(sd, i, 67) - 0.5) * p.r * 1.2 * grow, rr = p.r * (0.35 + 0.35 * K.hash(sd, i, 68)) * grow;
          const dd = Math.max(3, d + oy), bs = dd < dh ? hz + f * (eyeYd / dd + dd / (2 * RE) - dip) : hz;
          g.fillStyle = white((0.3 + 0.25 * K.hash(sd, i, 69)) * a);
          K.disc(g, x + ox * f / d, bs, rr * f / d, Math.max(1, rr * f / dd * eyeYd / dd));
        }
      }
    } };
    fxDraw(false);
    if (!o.late) fxDraw(true);
    /* ---- aircraft, when seen ---- */
    for (const p of S.planes) {
      if (!p.seen) continue;
      const d = PP.dist(o.x, o.y, p.x, p.y), b = PP.angTo(o.x, o.y, p.x, p.y);
      if (!inView(b) || d > 25000) continue;
      const x = toX(b), y = hz - 1500 / 3 * f / d - 4, w = Math.max(2, 30 * f / d);
      g.fillStyle = "#1a1e26"; g.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), Math.max(1, Math.round(w / 10)));
      g.fillRect(Math.round(x - w / 12), Math.round(y - w / 8), Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(w / 4)));
    }
    /* fog over everything, the thicker the further; and the dark */
    if (S.wx.vis < 0.5) { g.fillStyle = K.mix(horizonCol, "#8a929a", 0.3); g.globalAlpha = (0.5 - S.wx.vis) * 0.7; g.fillRect(x0, y0, x1 - x0, hz - y0 + 8); g.globalAlpha = 1; }
    g.restore();
    const late = () => { g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); fxDraw(true); g.restore(); };
    return { f, hz, drawn, toX, x0, x1, y0, y1, late };
  };
})();
