/* PumaPack -- the art kit: what every picture on the play screen
 * shares. The play screen is about 360 pixels high, scaled up by whole
 * numbers, as wide as the window lets it be; every station is drawn about
 * its middle and reaches out to the edges.
 *
 * Shading is in five-step ramps with a 4x4 ordered dither between them, and
 * a dark outline goes round what stands in front. */
"use strict";
(() => {
  const K = PP.K = { VW: 640, VH: 360 };
  K.OUT = "#0c0f17";

  K.mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const cache = new Map();
  K.get = (key, make) => { let c = cache.get(key); if (!c) { c = make(); cache.set(key, c); } return c; };
  K.cache = cache;

  K.hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 974634721)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  /* smooth value noise, 0..1 */
  K.noise = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return PP.lerp(K.hash(i, 0, s), K.hash(i + 1, 0, s), u); };
  K.fbm = (x, s = 0) => K.noise(x, s) * 0.6 + K.noise(x * 2.3, s + 7) * 0.28 + K.noise(x * 5.1, s + 13) * 0.12;
  /* a 4x4 ordered dither, -0.5..0.5 */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  K.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
  K.rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  K.hex = ([r, g, b]) => "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  K.mix = (a, b, t) => { const A = K.rgb(a), B = K.rgb(b); return K.hex(A.map((v, i) => v + (B[i] - v) * t)); };
  /* a colour along a list of stops, t 0..1 */
  K.ramp = (cols, t) => { t = PP.clamp(t, 0, 1) * (cols.length - 1); const i = Math.min(cols.length - 2, Math.floor(t)); return K.mix(cols[i], cols[i + 1], t - i); };

  /* drawing, always on whole pixels */
  K.rect = (g, x, y, w, h, c) => { if (c) g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  K.px = (g, x, y, c) => { if (c) g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  K.disc = (g, cx, cy, rx, ry, c) => {
    if (c) g.fillStyle = c;
    if (ry === undefined) ry = rx;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / ((ry + 0.5) * (ry + 0.5));
      if (t < 0) continue;
      const w = Math.round(rx * Math.sqrt(t));
      g.fillRect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1);
    }
  };
  K.ring = (g, cx, cy, r, c, th = 1) => {
    g.fillStyle = c;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d <= r + 0.5 && d > r - th + 0.5) g.fillRect(Math.round(cx) + x, Math.round(cy) + y, 1, 1); }
  };
  K.line = (g, x0, y0, x1, y1, c, w = 1) => {
    if (c) g.fillStyle = c;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / n - (w - 1) / 2), Math.round(y0 + (y1 - y0) * k / n - (w - 1) / 2), w, w);
  };
  K.poly = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))); g.closePath(); g.fill(); };
  /* a vertical band of colour stops, dithered between them */
  K.vgrad = (g, x, y, w, h, cols, seed = 0) => {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (h <= 0 || w <= 0) return;
    const n = cols.length - 1;
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i;
      /* the band, with a dithered edge into the next */
      g.fillStyle = cols[i]; g.fillRect(x, y + j, w, 1);
      if (f > 0.05) {
        g.fillStyle = cols[i + 1];
        for (let xx = 0; xx < w; xx++) if (K.bayer(x + xx, y + j + seed) + 0.5 < f) g.fillRect(x + xx, y + j, 1, 1);
      }
    }
  };
  /* a one-pixel ring round whatever is drawn on c */
  K.outline = (c, col = K.OUT) => {
    const g = c.getContext("2d"), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data, a = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 60;
    g.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1))) g.fillRect(x, y, 1, 1);
    return c;
  };
  K.silhouette = (c, col = "#000") => {
    const s = K.mk(c.width, c.height), g = s.getContext("2d");
    g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, s.width, s.height);
    return s;
  };
  K.flip = c => { const o = K.mk(c.width, c.height), g = o.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  /* a picture from a letter map: one character a pixel, a key of letters to colours ("." is empty) */
  K.map = (rows, key, scale = 1) => {
    const H = rows.length, W = Math.max(...rows.map(r => r.length)), c = K.mk(W * scale, H * scale), g = c.getContext("2d");
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = key[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); } } });
    return c;
  };


  /* ---- painting pixel by pixel: 2D value noise, and light baked into a finished picture ---- */
  K.vnoise = (x, y, s = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = K.hash(xi, yi, s), b = K.hash(xi + 1, yi, s), c = K.hash(xi, yi + 1, s), d = K.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  K.fbm2 = (x, y, s = 0) => K.vnoise(x, y, s) * 0.55 + K.vnoise(x * 2.1, y * 2.1, s + 5) * 0.28 + K.vnoise(x * 4.3, y * 4.3, s + 9) * 0.17;
  /* every pixel of c lit: ambient [r, g, b] (1 is as drawn) plus each light's colour, falling off over its radius */
  K.relight = (c, ambient, lights) => {
    const g = c.getContext("2d"), W = c.width, H = c.height, img = g.getImageData(0, 0, W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; if (!d[o + 3]) continue;
      let r = ambient[0], gg = ambient[1], b = ambient[2];
      for (const L of lights) {
        const dx = (x - L.x) / (L.rx || L.r), dy = (y - L.y) / (L.ry || L.r), q = 1 - (dx * dx + dy * dy);
        if (q <= 0) continue;
        const f = q * q * L.k;
        r += L.col[0] * f; gg += L.col[1] * f; b += L.col[2] * f;
      }
      d[o] = d[o] * r; d[o + 1] = d[o + 1] * gg; d[o + 2] = d[o + 2] * b;
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  K.copy = c => { const o = K.mk(c.width, c.height); o.getContext("2d").drawImage(c, 0, 0); return o; };
  /* a rivet: a lit dome and its shadow */
  K.rivet = (g, x, y, lit = "#8a8f99", dk = "#15171c") => { K.px(g, x, y, lit); K.px(g, x + 1, y + 1, dk); K.px(g, x + 1, y, K.mix(lit, dk, 0.5)); K.px(g, x, y + 1, K.mix(lit, dk, 0.5)); };

  /* ---- the materials: five shades each, lit to dark ---- */
  K.M = {
    brass: ["#ffe9a6", "#e8bd5c", "#b98a35", "#7f5a20", "#4c3412"],
    copper: ["#ffc394", "#e08a52", "#b0602f", "#7a3d1b", "#47220d"],
    steel: ["#aab2bc", "#7f8893", "#5b636e", "#3c434d", "#242931"],
    iron: ["#6c7380", "#4c535f", "#353b45", "#23282f", "#14171c"],
    paint: ["#4f6f5a", "#3a5545", "#2a3f33", "#1c2b23", "#111b16"],     /* the engine's green, near black at night */
    tawny: ["#ffdca6", "#f2b76c", "#d58e40", "#a26428", "#6c4018"],
    puma: ["#fde6bd", "#ebb877", "#c98b49", "#9b6531", "#5f3b1b"],
    wolf: ["#d3cfca", "#aaa49e", "#817b76", "#5a5551", "#3a3735"],
    wolfDk: ["#8f8984", "#6c6763", "#4f4b48", "#373432", "#242221"],
    wolfRed: ["#ff9a82", "#e64c34", "#b52c1b", "#7d1c11", "#4c100a"],
    field: ["#5e6c49", "#47533a", "#33402e", "#232e22", "#151d17"],
    stone: ["#c9c2b4", "#a39b8d", "#7c7568", "#565049", "#36322d"],
    slate: ["#7a8494", "#5b6474", "#434b59", "#2f3540", "#1e222a"],
    wood: ["#c39a6b", "#9a744b", "#755533", "#523a22", "#332314"],
    cream: ["#fff7e2", "#f2e6c4", "#d9c99f", "#b3a27a", "#857656"],
    fire: ["#fffbe0", "#ffe08a", "#ffad3c", "#e8661c", "#9c2d0c"],
    water: ["#9fd0e6", "#5f9fbf", "#3c7393", "#26506b", "#173447"],
    coal: ["#6a6f7a", "#41454e", "#2a2d33", "#1a1c20", "#0e0f12"],
    canvas: ["#c9b98f", "#a69670", "#807353", "#5a5039", "#3a3324"],
    olive: ["#9aa06a", "#7a7f52", "#5c603d", "#40432b", "#282a1b"],
  };
  K.shade = (m, k) => K.M[m][PP.clamp(Math.round(k), 0, 4)];

  /* ---- a pixel face, 5 by 7 capitals and figures, for signs and dials ---- */
  const F5 = {
    A: "01110100011000111111100011000110001", B: "11110100011000111110100011000111110", C: "01110100011000010000100001000101110", D: "11110100011000110001100011000111110",
    E: "11111100001000011110100001000011111", F: "11111100001000011110100001000010000", G: "01110100011000010111100011000101111", H: "10001100011000111111100011000110001",
    I: "01110001000010000100001000010001110", J: "00111000100001000010000101001001100", K: "10001100101010011000101001001010001", L: "10000100001000010000100001000011111",
    M: "10001110111010110101100011000110001", N: "10001100011100110101100111000110001", O: "01110100011000110001100011000101110", P: "11110100011000111110100001000010000",
    Q: "01110100011000110001101011001001101", R: "11110100011000111110101001001010001", S: "01111100001000001110000010000111110", T: "11111001000010000100001000010000100",
    U: "10001100011000110001100011000101110", V: "10001100011000110001100010101000100", W: "10001100011000110101101011010101010", X: "10001100010101000100010101000110001",
    Y: "10001100010101000100001000010000100", Z: "11111000010001000100010001000011111",
    "0": "01110100011001110101110011000101110", "1": "00100011000010000100001000010001110", "2": "01110100010000100010001000100011111", "3": "11111000100010000010000011000101110",
    "4": "00010001100101010010111110001000010", "5": "11111100001111000001000011000101110", "6": "00110010001000011110100011000101110", "7": "11111000010001000100010000100001000",
    "8": "01110100011000101110100011000101110", "9": "01110100011000101111000010001001100",
    "-": "00000000000000011111000000000000000", ".": "00000000000000000000000000110001100", "'": "00100001000100000000000000000000000", ":": "00000011000110000000011000110000000",
    "/": "00001000010001000100010001000010000", "%": "11001110010001000100010001001110011", "!": "00100001000010000100001000000000100",
  };
  const FOLD = { "É": "E", "È": "E", "Ê": "E", "À": "A", "Ç": "C", "Ô": "O", "Î": "I" };
  K.text5 = (g, s, x, y, col, shadow = null) => {
    s = String(s).toUpperCase();
    const draw = (ox, oy, c) => {
      g.fillStyle = c;
      let cx = x + ox;
      for (const ch0 of s) {
        const ch = FOLD[ch0] || ch0, f = F5[ch];
        if (f) for (let k = 0; k < 35; k++) if (f[k] === "1") g.fillRect(cx + (k % 5), y + oy + Math.floor(k / 5), 1, 1);
        cx += ch === " " ? 4 : 6;
      }
    };
    if (shadow) draw(1, 1, shadow);
    draw(0, 0, col);
  };
  K.text5w = s => { let w = 0; for (const ch of String(s)) w += ch === " " ? 4 : 6; return Math.max(0, w - 1); };
  /* a tiny face for dial figures: 3 wide, 5 high */
  const F3 = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111", "+": "000010111010000", "-": "000000111000000", ":": "000010000010000", x: "000101010101000" };
  K.text3 = (g, s, x, y, col, shadow = null) => {
    s = String(s);
    const draw = (ox, oy, c) => { g.fillStyle = c; for (let i = 0; i < s.length; i++) { const f = F3[s[i]]; if (!f) continue; for (let k = 0; k < 15; k++) if (f[k] === "1") g.fillRect(x + ox + i * 4 + (k % 3), y + oy + Math.floor(k / 3), 1, 1); } };
    if (shadow) draw(1, 1, shadow);
    draw(0, 0, col);
  };
  K.text3w = s => String(s).length * 4 - 1;

  /* ---- the sky for the light: 0 black night to 1 noon, warm when the sun is low ---- */
  const NIGHT = ["#03050d", "#060a18", "#0a1228", "#111c3a", "#1a2a4c"];
  const LOW = ["#141a3a", "#2c2a58", "#5a3a66", "#b0566a", "#f09a62"];
  const DAY = ["#3d6fae", "#5a8cc4", "#82acd8", "#b4cfe6", "#e2ecf0"];
  /* sun: -1..1 (C.sun), dark: the weather's gloom 0..0.4 */
  K.sky = (light, sun, dark = 0) => {
    const low = PP.clamp(1 - Math.abs(sun) / 0.25, 0, 1) * (sun > -0.2 ? 1 : 0);
    let c = NIGHT.map((n, i) => K.mix(n, DAY[i], PP.clamp((light - 0.1) / 0.8, 0, 1)));
    if (low > 0) c = c.map((x, i) => K.mix(x, LOW[i], low * 0.75));
    if (dark > 0) c = c.map(x => K.mix(x, "#5a626e", dark * 1.6 * PP.clamp(light, 0.2, 1)));
    return c;
  };
  /* how dark a lit colour goes at this light */
  K.dim = (col, l, glow = 0) => K.mix(col, "#05070f", PP.clamp(0.8 - l * 0.8 - glow, 0, 0.92));
})();
