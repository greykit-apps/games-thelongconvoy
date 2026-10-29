#!/usr/bin/env node
/*
 * The Long Convoy's icons, from one pixel drawing: the plot under the boat's red
 * light, the pack's three boats closing in a wedge on a convoy.
 *
 *   node tools/make-icons.js
 *
 * Writes icon.svg (crisp rects), favicon-16x16.png, favicon-32x32.png,
 * apple-touch-icon.png (180, also the GitLab project's avatar) and
 * favicon.ico (16, 32, 48, each a PNG inside). No dependencies: the drawing
 * is made here, cell by cell, and the PNG and ICO writers are below (Raid on
 * Puma Bay's). The share card is tools/og.html, rendered in a browser.
 */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");

/* ---- the drawing, 40 x 40 ---- */
const N = 40, R = 4;   /* the plate's corner radius, in cells */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 974634721)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/* a colour along stops, dithered between them */
const band = (stops, t, x, y) => { const f = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(f); return bayer(x, y) < f - i ? stops[i + 1] : stops[i]; };
/* the plot under the boat's red light: the depth in hard bands */
const DEEP = ["#6a3126", "#56291f", "#45201a", "#371915", "#2b1411", "#1e0e0c"];
const ART = [];
for (let y = 0; y < N; y++) {
  const row = [];
  for (let x = 0; x < N; x++) {
    /* shoal water toward the bottom left, the deep toward the top right, the bands ragged at their edges */
    const t = (x - y + N) / (2 * N) + (hash(x >> 2, y >> 2, 5) - 0.5) * 0.08;
    let c = DEEP[Math.max(0, Math.min(DEEP.length - 1, Math.floor(t * DEEP.length)))];
    row.push(c);
  }
  ART.push(row);
}
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) ART[y][x] = c; };
const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
/* a filled triangle, an outline of ink round it */
const inTri = (px, py, [a, b, c]) => { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); const d1 = s([px, py], a, b), d2 = s([px, py], b, c), d3 = s([px, py], c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const tri = (cx, cy, r, h, col) => {
  const p = k => [cx + Math.sin(h + k) * r * (k ? 1.0 : 1.35), cy - Math.cos(h + k) * r * (k ? 1.0 : 1.35)], T = [p(0), p(2.4), p(-2.4)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = x + 0.5, Y = y + 0.5; if (inTri(X, Y, T)) put(x, y, col); else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inTri(X + a, Y + b, T))) put(x, y, "#0b0504"); }
  return T;
};
const diamond = (cx, cy, r, col) => { for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) { const d = Math.abs(i) + Math.abs(j); if (d <= r) put(cx + i, cy + j, col); else if (d === r + 1) put(cx + i, cy + j, "#0b0504"); } };
/* the convoy, up and to the right, and the pack's tracks closing on it in dotted amber */
const H = Math.PI / 4;
/* each boat's wake astern of her, a dotted line of foam */
for (const [x0, y0, n] of [[12, 27, 9], [7, 18, 6], [21, 33, 6]]) for (let k = 5; k < 5 + n; k += 2) put(Math.round(x0 - k * 0.72), Math.round(y0 + k * 0.72), "#b4705c");
diamond(29, 8, 3, "#ffc65a"); diamond(35, 15, 2, "#ffc65a"); diamond(26, 15, 2, "#ffc65a");
/* the pack: three boats in a wedge, the lead the brightest */
tri(7, 18, 4, H, "#e09a80"); tri(21, 33, 4, H, "#e09a80");
tri(12, 27, 5.5, H, "#ffd2bf");

/* ---- icon.svg: one rect per run of a colour along a row ---- */
const rects = [];
ART.forEach((row, y) => {
  for (let x = 0; x < N;) {
    let e = x + 1;
    while (e < N && row[e] === row[x]) e++;
    rects.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${row[x]}"/>`);
    x = e;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="The Long Convoy">
<title>The Long Convoy</title>
<!-- The pack closing on a convoy, on the plot under red light. Written by tools/make-icons.js; edit the drawing there, not this file. -->
<clipPath id="p"><rect width="${N}" height="${N}" rx="${R}"/></clipPath>
<g clip-path="url(#p)">
${rects.join("\n")}
</g>
</svg>
`;
fs.writeFileSync(path.join(ROOT, "icon.svg"), svg);
const PAL = new Proxy({}, { get: (_, k) => k });
/* ---- rasters. Small ones average 4x4 samples of the drawing per pixel, so
 * 16 and 32 keep the ears as colour rather than losing them; big ones take the nearest cell, so the pixels stay pixels. ---- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cellAt = (gx, gy) => {
  const cx = Math.min(Math.max(gx, R), N - R), cy = Math.min(Math.max(gy, R), N - R);
  if (Math.hypot(gx - cx, gy - cy) > R) return null;
  return hex(PAL[ART[Math.min(N - 1, Math.floor(gy))][Math.min(N - 1, Math.floor(gx))]]);
};
function raster(size) {
  const px = Buffer.alloc(size * size * 4), S = size >= 2 * N ? 1 : 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = cellAt((x + (sx + 0.5) / S) / size * N, (y + (sy + 0.5) / S) / size * N);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (y * size + x) * 4;
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = 255 * a / (S * S); }
  }
  return png(size, size, px);
}

/* ---- a minimal PNG writer: RGBA, no filtering ---- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/* ---- ICO: a directory of PNGs ---- */
function ico(images) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let off = 6 + 16 * images.length;
  const dir = images.map(([size, data]) => {
    const e = Buffer.alloc(16);
    e[0] = size % 256; e[1] = size % 256; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(off, 12); off += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map(([, d]) => d)]);
}

fs.writeFileSync(path.join(ROOT, "favicon-16x16.png"), raster(16));
fs.writeFileSync(path.join(ROOT, "favicon-32x32.png"), raster(32));
fs.writeFileSync(path.join(ROOT, "apple-touch-icon.png"), raster(180));
fs.writeFileSync(path.join(ROOT, "favicon.ico"), ico([[16, raster(16)], [32, raster(32)], [48, raster(48)]]));
console.log("wrote icon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon.ico");
