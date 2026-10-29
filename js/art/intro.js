/* PumaPack — the title's painting: a cut through the sea at the end of the day. Over the water a blue sky going
 * to dusk, the sun low and the clouds lit from under; on the surface a Pumacity Defense Fleet destroyer steaming
 * right; under it, in the dark red water, one of the Wolf Empire's boats running left. Painted a pixel at a time
 * into one buffer, after the 16-bit games: a few colours a ramp, dithered between in a 4x4 Bayer pattern.
 *
 * The eye keeps pace with the destroyer, so she holds her place in the clear right of the screen while the sea,
 * the clouds and the bottom slide away behind her; the boat, running the other way, crosses under her. With the
 * motion turned down (PP.calm) it is a still, the boat just under her. */
(() => {
  "use strict";
  const T = PP.Intro = {};
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const pk = c => (0xff000000 | c[2] << 16 | c[1] << 8 | c[0]) >>> 0;
  const ramp = cs => cs.map(c => pk(hex(c)));
  /* a colour off a ramp at t (0 to 1), dithered between its two nearest stops */
  const at = (R, t, x, y) => { const p = Math.max(0, Math.min(0.9999, t)) * (R.length - 1), i = p | 0; return p - i > bay(x, y) ? R[i + 1] : R[i]; };
  /* lighten (or darken) a packed colour by so much a channel */
  const add = (c, dr, dg, db) => {
    const r = Math.max(0, Math.min(255, (c & 255) + dr)), g = Math.max(0, Math.min(255, (c >> 8 & 255) + dg)), b = Math.max(0, Math.min(255, (c >> 16 & 255) + db));
    return (0xff000000 | b << 16 | g << 8 | r) >>> 0;
  };
  const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ---- the palette ---- */
  const SKY = ramp(["#132a58", "#1c3c78", "#2a5594", "#3e70ae", "#6390c4", "#9db2cc", "#d6bea4", "#f0a874", "#f4905e"]);
  const FAR = ramp(["#f09a68", "#a87c7c", "#5a5a7e", "#3a4068", "#2a2e52"]);
  const SEA = ramp(["#6c1c14", "#561410", "#430e0d", "#33090a", "#250608", "#190406", "#100204"]);
  const CLOUD = ramp(["#4c5684", "#6a6e98", "#8c86a6", "#c8988e", "#f2b080", "#ffd2a0"]);
  const STEEL = ramp(["#9aa0b4", "#7c8298", "#62687e", "#4c5266", "#3a3e50"]);
  const UNDER = ramp(["#5a3634", "#44221f", "#331618", "#240c0e"]);
  const BOAT = ramp(["#b0705c", "#86483e", "#5e2c2a", "#3e1a1c", "#240c0e", "#16060a"]);
  const C = {
    rim: pk(hex("#ffc890")), rim2: pk(hex("#e8a070")), ink: pk(hex("#1a1c28")), cap: pk(hex("#14141c")), glass: pk(hex("#ffd8a0")),
    boot: pk(hex("#2a1a20")), port: pk(hex("#2a2c3a")), foam: pk(hex("#f4e2cc")), foam2: pk(hex("#d8b8a8")), lip: pk(hex("#ffd8b0")),
    under: pk(hex("#b8442e")), bed: pk(hex("#0c0205")), bedRim: pk(hex("#3c0e0c")), bed2: pk(hex("#1c0508")), kelp: pk(hex("#160407")), kelp2: pk(hex("#2e0a0a")),
    snow: pk(hex("#7a3426")), bub: pk(hex("#e88a6a")), bub2: pk(hex("#b85a46")), smoke: ramp(["#3c3848", "#55506a", "#7a7088", "#b8968c"]),
    sun: pk(hex("#fff4d6")), sun2: pk(hex("#ffdc96")), ping: pk(hex("#c85a40")), boatRim: pk(hex("#e09a7a")), boatInk: pk(hex("#0c0306")),
    flagR: pk(hex("#d8a03c")), flagB: pk(hex("#2a3a6a")), slot: pk(hex("#14060a")),
  };

  /* ---- sprites: a pixel buffer, polygons filled a scanline at a time (no smoothing), lines a pixel wide ---- */
  const sprite = (w, h) => ({ w, h, px: new Uint32Array(w * h) });
  function poly(sp, pts, shade) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(sp.h - 1, Math.ceil(y1)); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(sp.w - 1, Math.floor(xs[k + 1] - 0.5)); x++) { const c = shade(x, y); if (c) sp.px[y * sp.w + x] = c; }
    }
  }
  function line(sp, x0, y0, x1, y1, c, wd = 1) {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      for (let d = 0; d < wd; d++) dot(sp, x, y + d, c);
    }
  }
  const dot = (sp, x, y, c) => { if (x >= 0 && y >= 0 && x < sp.w && y < sp.h) sp.px[y * sp.w + x] = c; };
  const get = (sp, x, y) => x >= 0 && y >= 0 && x < sp.w && y < sp.h ? sp.px[y * sp.w + x] : 0;
  /* a rim of light along each edge that faces up or toward the sun (to the right), and a dark line under */
  function rims(sp, c, cd) {
    const o = sp.px.slice();
    for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
      const v = o[y * sp.w + x];
      if (!v) continue;
      const up = y === 0 || !o[(y - 1) * sp.w + x], right = x === sp.w - 1 || !o[y * sp.w + x + 1];
      if (up || right) sp.px[y * sp.w + x] = c;
      else if (cd && (y === sp.h - 1 || !o[(y + 1) * sp.w + x])) sp.px[y * sp.w + x] = cd;
    }
  }

  /* ---- the destroyer, bow to the right: drawn 260 units long, the waterline at y 0, up negative. Her
   * hull under the water is drawn too, darker and redder, for the cut through the sea ---- */
  function destroyer(s) {
    const W = Math.ceil(266 * s), top = Math.ceil(70 * s), H = top + Math.ceil(16 * s), sp = sprite(W, H);
    const P = pts => pts.map(([x, y]) => [x * s + 2, y * s + top]);
    const steel = (y0, y1) => (x, y) => at(STEEL, ((y - top) / s - y0) / (y1 - y0), x, y);
    const shadeU = (x, y) => at(UNDER, ((y - top) / s) / 11, x, y);
    /* under the water: the hull to the keel, her rudder and screw */
    poly(sp, P([[1, 0], [250, 0], [246, 6], [236, 10], [40, 11], [18, 9], [6, 5]]), shadeU);
    poly(sp, P([[5, 4], [11, 4], [11, 13], [6, 12]]), shadeU);
    sp.screw = [14 * s + 2, 10 * s + top];
    /* above it: the hull, her sheer rising to the forecastle and the raked stem */
    const hull = new Set();
    poly(sp, P([[1, 0], [0, -8], [150, -9], [150, -13], [230, -15], [261, -17], [250, 0]]), (x, y) => { hull.add(y * W + x); return at(STEEL, 0.15 + ((y - top) / s + 16) / 16 * 0.75, x, y); });
    /* the superstructure: the gun houses, the bridge and its director, the funnels, the deckhouses */
    const blocks = [
      [[40, -9], [64, -9], [64, -13], [40, -13]],                            /* the after deckhouse */
      [[60, -9], [150, -9], [150, -13], [60, -13]],                          /* the long one amidships */
      [[16, -9], [30, -9], [28, -15], [18, -15]],                            /* Y gun */
      [[42, -13], [56, -13], [54, -19], [44, -19]],                          /* X gun */
      [[99, -13], [113, -13], [111, -31], [97, -31]],                        /* the after funnel, raked */
      [[127, -13], [141, -13], [139, -33], [125, -33]],                      /* the fore funnel */
      [[114, -13], [125, -13], [125, -16], [114, -16]],                      /* the tubes */
      [[86, -13], [94, -13], [94, -18], [86, -18]],                          /* the searchlight's tower */
      [[158, -13], [190, -14], [190, -26], [186, -30], [166, -30], [161, -26]], /* the bridge */
      [[170, -30], [181, -30], [180, -35], [172, -35]],                     /* the director */
      [[190, -14], [203, -15], [203, -19], [190, -19]],                      /* B gun's deck */
      [[189, -19], [204, -19], [202, -25], [192, -25]],                      /* B gun */
      [[205, -15], [221, -16], [219, -21], [208, -21]],                      /* A gun */
      [[144, -13], [152, -13], [152, -15], [144, -15]],                      /* the whaler */
    ];
    for (const b of blocks) poly(sp, P(b), (x, y) => hull.has(y * W + x) ? 0 : steel(-36, -9)(x, y));
    rims(sp, C.rim2, 0);
    /* the funnels' caps, the bridge's windows, the scuttles along her side, the boot-topping */
    const R = (x, y, w, h, c) => { for (let j = 0; j < Math.max(1, Math.round(h * s)); j++) for (let i = 0; i < Math.max(1, Math.round(w * s)); i++) dot(sp, Math.round(x * s + 2) + i, Math.round(y * s + top) + j, c); };
    R(97, -31, 14, 3, C.cap); R(125, -33, 14, 3, C.cap);
    for (let x = 165; x < 188; x += 3) R(x, -28, 2, 1, C.glass);
    for (let x = 160; x < 226; x += 7) R(x, -10, 1, 1, C.port);
    for (let x = 20; x < 146; x += 8) R(x, -5, 1, 1, C.port);
    R(237, -12, 2, 2, C.ink);
    for (let x = 1; x < 250; x++) R(x, -1, 1, 1, C.boot);
    R(146, -15, 5, 1, C.foam2);
    /* the guns' barrels, the masts and the yards, the radar */
    const L = (x0, y0, x1, y1, c, w = 1) => line(sp, x0 * s + 2, y0 * s + top, x1 * s + 2, y1 * s + top, c, Math.max(1, Math.round(w * s)));
    L(220, -18, 237, -19, C.ink); L(203, -22, 219, -23, C.ink); L(43, -16, 27, -17, C.ink); L(17, -12, 3, -13, C.ink);
    L(176, -35, 175, -66, C.ink); L(170, -30, 175, -52, C.ink); L(168, -58, 183, -58, C.ink); L(80, -13, 80, -42, C.ink); L(76, -37, 85, -37, C.ink);
    L(116, -15, 123, -15, C.ink);
    R(172, -63, 7, 2, C.ink); R(174, -67, 2, 1, C.rim);
    L(3, -9, 3, -21, C.ink);
    /* the depth charges racked at her stern */
    for (let x = 4; x < 14; x += 3) R(x, -11, 2, 2, C.ink);
    sp.oy = top; sp.flag = [3 * s + 2, -21 * s + top]; sp.funnels = [[104 * s + 2, -31 * s + top], [132 * s + 2, -33 * s + top]];
    sp.bow = 252 * s + 2; sp.stern = 2; sp.dome = [222 * s + 2, 9 * s + top];
    return sp;
  }

  /* ---- the boat, bow to the left: 170 units long, her axis at y 0. Lit from over her, the light the red sea
   * lets down; her belly in the dark ---- */
  function uboat(s) {
    const W = Math.ceil(176 * s), top = Math.ceil(34 * s), H = top + Math.ceil(12 * s), sp = sprite(W, H);
    const P = pts => pts.map(([x, y]) => [x * s + 2, y * s + top]);
    const sh = (y0, y1) => (x, y) => at(BOAT, ((y - top) / s - y0) / (y1 - y0), x, y);
    poly(sp, P([[0, -1], [6, -5], [20, -7], [120, -7], [150, -5], [168, -2], [170, 0], [166, 2], [150, 5], [110, 7], [30, 7], [10, 5], [2, 2]]), sh(-8, 8));
    poly(sp, P([[58, -7], [92, -7], [100, -8], [98, -14], [92, -14], [94, -18], [86, -22], [64, -22], [60, -18]]), sh(-24, 0));
    poly(sp, P([[8, 3], [17, 3], [15, 6], [8, 6]]), sh(-8, 8));
    poly(sp, P([[150, 3], [161, 3], [161, 6], [153, 6]]), sh(-8, 8));
    poly(sp, P([[164, -5], [169, -4], [169, 6], [165, 6]]), sh(-8, 8));
    rims(sp, C.boatRim, BOAT[5]);
    const R = (x, y, w, h, c) => { for (let j = 0; j < Math.max(1, Math.round(h * s)); j++) for (let i = 0; i < Math.max(1, Math.round(w * s)); i++) dot(sp, Math.round(x * s + 2) + i, Math.round(y * s + top) + j, c); };
    const L = (x0, y0, x1, y1, c) => line(sp, x0 * s + 2, y0 * s + top, x1 * s + 2, y1 * s + top, c, 1);
    /* the free-flooding holes along her casing, the seam of her saddle tanks */
    for (let x = 22; x < 140; x += 5) R(x, -4, 2, 1, C.slot);
    for (let x = 34; x < 122; x++) if (x % 3) R(x, 3, 1, 1, BOAT[4]);
    /* her deck gun forward of the tower, the periscopes, the net cutter and its wire to the tower */
    R(43, -10, 2, 3, BOAT[2]); R(39, -12, 9, 2, BOAT[1]); L(39, -11, 25, -12, C.boatInk);
    L(72, -22, 72, -33, C.boatInk); L(78, -22, 78, -29, C.boatInk); R(71, -34, 2, 1, C.boatRim);
    L(3, -3, 6, -8, C.boatInk); L(6, -8, 62, -24, BOAT[3]);
    R(64, -21, 20, 1, C.boatRim);
    sp.oy = top; sp.screw = [170 * s + 2, top];
    return sp;
  }

  /* ---- a cloud: lumps on a flat base, its top in the blue's shade and its underside lit by the low sun ---- */
  function cloud(seed, s) {
    const w = Math.round((60 + hash(seed, 1) * 90) * s), h = Math.round((10 + hash(seed, 2) * 10) * s), sp = sprite(w, h + 2);
    const lumps = [];
    for (let i = 0; i < 6; i++) lumps.push([hash(seed, 10 + i) * w, h * (0.35 + hash(seed, 20 + i) * 0.5), w * (0.12 + hash(seed, 30 + i) * 0.18)]);
    for (let y = 0; y < h + 2; y++) for (let x = 0; x < w; x++) {
      let inside = false;
      for (const [cx, cy, r] of lumps) { const dx = (x - cx) / r, dy = (y - cy) / (r * 0.45); if (dx * dx + dy * dy < 1) { inside = true; break; } }
      if (!inside || y > h) continue;
      const edge = Math.min(x, w - 1 - x) / (w * 0.5);
      if (edge < 0.25 && bay(x, y) > edge * 4) continue;
      sp.px[y * w + x] = at(CLOUD, Math.pow(y / h, 1.4) * 0.95 + 0.04, x, y);
    }
    return sp;
  }

  /* ---- drawing into the frame ---- */
  function blit(F, sp, x0, y0, tint) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    for (let y = 0; y < sp.h; y++) {
      const fy = y0 + y;
      if (fy < 0 || fy >= F.h) continue;
      for (let x = 0; x < sp.w; x++) {
        const fx = x0 + x, c = sp.px[y * sp.w + x];
        if (c && fx >= 0 && fx < F.w) F.px[fy * F.w + fx] = tint ? tint(c, fx, fy) : c;
      }
    }
  }
  const put = (F, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < F.w && y < F.h) F.px[y * F.w + x] = c; };
  const putIf = (F, x, y, c, ok) => { if (ok(Math.round(y))) put(F, x, y, c); };
  /* a puff or a bubble: a disc, its edge thinned in the dither */
  function disc(F, cx, cy, r, c, soft = 0.5) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1) continue;
      if (d > soft && bay(x, y) < (d - soft) / (1 - soft)) continue;
      put(F, x, y, typeof c === "function" ? c(x - cx, y - cy, d, x, y) : c);
    }
  }

  /* the still part: the sky with the sun and its glow, and the deep of the sea */
  function backdrop(W, H, L) {
    const F = sprite(W, H);
    const sx = L.sunX, sy = L.sunY, glow = 70 * L.s;
    for (let y = 0; y < L.yH; y++) for (let x = 0; x < W; x++) {
      let t = Math.pow(y / L.yH, 1.35);
      const d = Math.hypot((x - sx) * 0.6, y - sy);
      if (d < glow) t = Math.min(1, t + (1 - d / glow) * (1 - d / glow) * 0.55);
      F.px[y * W + x] = at(SKY, t, x, y);
    }
    for (let y = L.yH; y < H; y++) { const t = (y - L.yW) / (H - L.yW); for (let x = 0; x < W; x++) F.px[y * W + x] = at(SEA, Math.pow(Math.max(0, t), 0.8), x, y); }
    disc(F, sx, sy, 11 * L.s, C.sun2, 0.6);
    disc(F, sx, sy, 8 * L.s, C.sun, 0.85);
    return F;
  }

  let cache = null;
  function layout(W, H) {
    const s = Math.max(0.75, Math.min(1.4, H / 360));
    const L = { W, H, s, yH: Math.round(H * 0.36) };
    L.yW = L.yH + Math.round(8 * s); L.sunX = Math.round(W * 0.8); L.sunY = L.yH - Math.round(13 * s);
    L.yS = Math.round(L.yW + (H - L.yW) * 0.5); L.bed = Math.round(H * 0.88);
    L.vc = 7 * s; L.vs = 3 * s;
    const ship = destroyer(s), boat = uboat(s);
    const clouds = [];
    for (let i = 0; i < 7; i++) clouds.push({ sp: cloud(i + 1, s), x: hash(i, 3) * W * 1.4, y: Math.round(H * (0.04 + hash(i, 4) * 0.22)), k: 0.08 + hash(i, 5) * 0.1 });
    clouds.sort((a, b) => a.k - b.k);
    const snow = [];
    for (let i = 0; i < 70; i++) snow.push([hash(i, 40) * W * 2, L.yW + hash(i, 41) * (L.bed - L.yW), 0.6 + hash(i, 42) * 0.8]);
    return { L, ship, boat, clouds, snow, bg: backdrop(W, H, L), F: null, img: null, puffs: [], bubbles: [], t0: null, last: 0 };
  }

  T.draw = (cv, now) => {
    const W = cv.width, H = cv.height, g = cv.getContext("2d");
    if (!cache || cache.L.W !== W || cache.L.H !== H) cache = layout(W, H);
    const Z = cache, L = Z.L, s = L.s, calm = PP.calm();
    if (Z.t0 === null) Z.t0 = now;
    /* the time; in a still, a moment with the boat under her */
    const t = calm ? 40 : (now - Z.t0) / 1000 + 31, dt = Math.min(0.1, Math.max(0, (now - (Z.last || now)) / 1000)); Z.last = now;
    if (!Z.img) { Z.img = g.createImageData(W, H); Z.F = { w: W, h: H, px: new Uint32Array(Z.img.data.buffer) }; }
    const F = Z.F, px = F.px, cam = t * L.vc;
    px.set(Z.bg.px);

    /* the clouds, far off: slow across */
    for (const c of Z.clouds) { const span = W + c.sp.w + 40, x = ((c.x - cam * c.k) % span + span) % span - c.sp.w; blit(F, c.sp, x, c.y); }

    /* the far sea to the horizon: its colour from the sky's glow down to the cut, the sun's track glittering on it */
    const ship = Z.ship, dx = Math.round(W * 0.7 - ship.w * 0.55 + Math.sin(t / 9) * 3 * s), bob = calm ? 0 : Math.round(Math.sin(t * 1.3) * 0.6);
    const wave = x => { const xw = x + cam; return L.yW + Math.round(s * (1.1 * Math.sin(xw * 0.07 + t * 1.6) + 0.7 * Math.sin(xw * 0.19 - t * 2.3))); };
    const waves = new Int16Array(W);
    for (let x = 0; x < W; x++) {
      const yw = waves[x] = wave(x);
      for (let y = L.yH; y < yw; y++) {
        let c = at(FAR, (y - L.yH) / (L.yW - L.yH + 2), x, y);
        const gx = Math.abs(x - L.sunX), gl = hash(Math.round((x + cam * 0.3) / 3), y * 7 + Math.floor(t * 5));
        if (gx < 26 * s * (1 + (y - L.yH) / 6) && gl > 0.55 + gx / (40 * s)) c = gl > 0.85 ? C.sun : C.sun2;
        px[y * W + x] = c;
      }
      px[yw * W + x] = hash(Math.round(x + cam), 9) > 0.7 ? C.lip : add(px[yw * W + x], 60, 30, 10);
      if (yw + 1 < H) px[(yw + 1) * W + x] = C.under;
    }

    /* the light down through the water: shafts from the sun's side, slanting away from it, swaying */
    for (let i = 0; i < 6; i++) {
      const span = W + 160 * s, bx = ((hash(i, 60) * span - cam * 0.35 + Math.sin(t * 0.3 + i) * 6 * s) % span + span) % span - 40 * s;
      const bw = (8 + hash(i, 61) * 16) * s, len = (L.bed - L.yW) * (0.7 + hash(i, 62) * 0.3), str = 0.35 + 0.2 * Math.sin(t * 0.5 + i * 2);
      for (let y = L.yW + 2; y < L.yW + len; y++) {
        const f = (y - L.yW) / len, x0 = bx - (y - L.yW) * 0.42, a = str * (1 - f);
        for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, Math.round(x0 + bw)); x++) {
          const e = Math.min(x - x0, x0 + bw - x) / (bw * 0.5);
          if (a * Math.min(1, e * 1.5) > bay(x, y)) px[y * W + x] = add(px[y * W + x], 30, 9, 5);
        }
      }
    }
    /* the light's play just under the surface */
    for (let i = 0; i < W / 3; i++) {
      const x = Math.floor(hash(i, Math.floor(t * 4)) * W), y = waves[x] + 2 + Math.floor(hash(i, 71) * 9 * s);
      if (y < H) px[y * W + x] = add(px[y * W + x], 50, 18, 8);
    }

    /* the bottom: a far ridge in the murk, then the near one, kelp along it */
    for (let x = 0; x < W; x++) {
      const xf = x + cam * 0.55, hf = Math.round(L.bed - 10 * s + s * (7 * Math.sin(xf * 0.008) + 4 * Math.sin(xf * 0.023 + 2)));
      for (let y = hf; y < H; y++) px[y * W + x] = C.bed2;
      const xw = x + cam, hb = Math.round(L.bed + s * (6 * Math.sin(xw * 0.011) + 3 * Math.sin(xw * 0.037 + 1) + 1.5 * Math.sin(xw * 0.13)));
      for (let y = hb; y < H; y++) px[y * W + x] = y === hb ? C.bedRim : C.bed;
    }
    for (let k = Math.floor(cam / (23 * s)) - 1; k < (cam + W) / (23 * s) + 1; k++) {
      if (hash(k, 80) < 0.55) continue;
      const xw = k * 23 * s + hash(k, 81) * 14 * s, x0 = xw - cam, hb = L.bed + s * (6 * Math.sin(xw * 0.011) + 3 * Math.sin(xw * 0.037 + 1) + 1.5 * Math.sin(xw * 0.13));
      const tall = (18 + hash(k, 82) * 40) * s;
      for (let j = 0; j < tall; j++) {
        const sw = Math.sin(t * 0.9 + k + j * 0.08) * j / tall * 6 * s;
        put(F, x0 + sw, hb - j, C.kelp); put(F, x0 + sw + 1, hb - j, j % 5 === 2 ? C.kelp2 : C.kelp);
        /* a frond off it every few pixels, to one side then the other */
        if (j % 6 === 3) for (let f = 1; f < 4 * s; f++) put(F, x0 + sw + (j % 12 === 3 ? -f : 1 + f), hb - j - f * 0.6, f > 2 * s ? C.kelp2 : C.kelp);
      }
    }
    /* the snow of the sea, drifting down */
    for (const p of Z.snow) {
      const span = W + 20, x = ((p[0] - cam * 0.8 * p[2]) % span + span) % span - 10, y = L.yW + 4 + ((p[1] - L.yW + t * 3 * p[2]) % (L.bed - L.yW));
      if (bay(Math.round(x), Math.round(y)) < 0.6) put(F, x, y, C.snow);
    }

    /* the boat, running left under the destroyer, her screw's bubbles streaming back and up */
    /* (at t 40 her middle is under the destroyer's; off the left, she comes round again from the right) */
    const boat = Z.boat, lo = -boat.w - 30 * s, span = W + 30 * s - lo, b0 = W * 0.68 - boat.w / 2 - (t - 40) * (L.vs + L.vc);
    const bxx = ((b0 - lo) % span + span) % span + lo, by = L.yS + Math.sin(t * 0.4) * 3 * s - boat.oy;
    blit(F, boat, bxx, by);
    /* the sonar's pings from the destroyer: a ring going out and down through the water, on the title theme's
     * pings while it plays (PP.SFX.pings), else on its beat from the painting's own clock */
    const SX = PP.SFX, every = (SX && SX.PING_EVERY || 8.57) * 1000, heard = SX && SX.tune && SX.pings ? SX.pings.filter(p => p <= now).pop() : undefined;
    const p0 = heard !== undefined && now - heard < every ? heard : Z.t0 + Math.floor((now - Z.t0) / every) * every;
    const pingT = (now - p0) / 5500, pr = pingT * 260 * s, pcx = dx + ship.dome[0], pcy = L.yW + ship.dome[1] - ship.oy;
    if (!calm && pingT < 0.9) for (let a = 0.12; a < Math.PI - 0.12; a += 0.6 / Math.max(20, pr)) {
      const x = pcx + Math.cos(a) * pr, y = pcy + Math.sin(a) * pr * 0.8;
      if (y > L.yW + 3 && y < L.bed && bay(Math.round(x), Math.round(y)) < 0.4 * (1 - pingT)) put(F, x, y, add(px[Math.round(y) * W + Math.round(x)] || 0, 40, 14, 8));
    }

    /* bubbles: from the boat's screw, and under the destroyer's stern */
    if (!calm) {
      if (Math.random() < dt * 14) Z.bubbles.push({ x: bxx + boat.screw[0] + cam, y: by + boat.screw[1] + (Math.random() - 0.5) * 3 * s, r: (0.6 + Math.random() * 1.2) * s, age: 0 });
      if (Math.random() < dt * 18) Z.bubbles.push({ x: dx + ship.screw[0] + cam - Math.random() * 10 * s, y: L.yW + ship.screw[1] - ship.oy, r: (0.5 + Math.random()) * s, age: 0 });
    } else if (!Z.bubbles.length) for (let i = 0; i < 26; i++) Z.bubbles.push({ x: bxx + boat.screw[0] + cam + i * 5 * s, y: by + boat.screw[1] - i * 1.6 * s, r: (0.6 + hash(i, 90)) * s, age: i * 0.2 });
    Z.bubbles = Z.bubbles.filter(b => b.age < 4 && b.y > L.yW + 3);
    for (const b of Z.bubbles) {
      b.age += dt; b.y -= dt * (2.5 + b.r * 2.5) * s; b.x += dt * L.vc * 0.15;
      const x = b.x - cam + Math.sin(b.age * 4 + b.r * 9) * 1.2 * s;
      if (b.r < 1.2) put(F, x, b.y, b.age < 2 ? C.bub : C.bub2); else disc(F, x, b.y, b.r, (ox, oy) => oy < 0 && ox > 0 ? C.bub : C.bub2, 0.9);
    }

    /* the destroyer: her flag streaming, her funnels' smoke, her bow wave and her wake */
    blit(F, ship, dx, L.yW - ship.oy + bob);
    for (let j = 0; j < 4 * s; j++) for (let i = 0; i < 7 * s; i++) {
      const fy = ship.flag[1] + j + Math.round(Math.sin(t * 6 - i * 0.7) * 0.8 * s * i / (7 * s));
      put(F, dx + ship.flag[0] - i - 1, L.yW - ship.oy + bob + fy, j < 2 * s ? C.flagR : C.flagB);
    }
    if (!calm && Math.random() < dt * 9) for (const f of ship.funnels) Z.puffs.push({ x: dx + f[0] + cam, y: L.yW - ship.oy + f[1], r: 2 * s, age: 0, k: Math.random() });
    if (calm && !Z.puffs.length) for (let i = 0; i < 24; i++) for (const f of ship.funnels) Z.puffs.push({ x: dx + f[0] + cam - i * 5 * s, y: L.yW - ship.oy + f[1] - i * 1.6 * s, r: (2 + i * 0.35) * s, age: i * 0.4, k: hash(i, 95) });
    Z.puffs = Z.puffs.filter(p => p.age < 9);
    for (const p of Z.puffs) {
      p.age += calm ? 0 : dt; p.y -= dt * 4 * s; p.r += dt * 1.1 * s; p.x -= dt * 1.5 * s;
      const fade = p.age / 9;
      disc(F, p.x - cam, p.y, p.r, (ox, oy, d, x, y) => at(C.smoke, Math.min(1, Math.max(0, 0.15 + (ox > 0 ? 0.35 : 0) - oy / p.r * 0.25 + p.k * 0.2)), x, y), 0.45 - fade * 0.4);
    }
    const yw0 = L.yW + bob;
    /* the bow wave, piled up and curling off her stem */
    for (let i = 0; i < 26 * s; i++) {
      const h = Math.max(0, (8 - i / (2.6 * s)) * s * (0.8 + 0.2 * Math.sin(t * 5 + i))), x = dx + ship.bow - i;
      for (let j = 0; j < h; j++) if (hash(Math.round(x + cam * 0.3), j + Math.floor(t * 8)) > 0.25) put(F, x + j * 0.4, yw0 - j, j > h - 2 ? C.foam : C.foam2);
    }
    for (let i = 0; i < 6; i++) { const a = (t * 1.7 + i / 6) % 1; put(F, dx + ship.bow + 3 * s + a * 10 * s, yw0 - 6 * s * a * (1 - a) * 4, C.foam); }
    /* the wake: the water her screws churned, falling away astern and settling */
    for (let i = 0; i < 160 * s; i++) {
      const x = dx + ship.stern + 18 * s - i, dens = 1 - i / (160 * s), y0 = waves[Math.max(0, Math.min(W - 1, Math.round(x)))] || yw0;
      for (let j = -2; j < 3 * s * dens + 1; j++) if (hash(Math.round(x + cam), j * 31 + Math.floor(t * 6)) < dens * (j < 0 ? 0.35 : 0.7)) put(F, x, y0 + j, j < 1 ? C.foam : C.foam2);
    }
    g.putImageData(Z.img, 0, 0);
  };
})();
