/* The Long Convoy -- the tracer: ships built once in three dimensions and drawn
 * from them, so a freighter seen through the periscope shows the angle on
 * the bow it truly has.
 *
 * A model is a list of parts: boxes, cylinders along an axis, spheres, and
 * prisms (a convex outline in plan, stood up between two heights: a hull
 * tapering to its bow and stern). Each part has a material, and may have a
 * texture that picks the material where it is hit, or makes a hole. The
 * tracer casts a ray for every pixel, finds the nearest part, and shades it
 * from the material's five-step ramp by the light on it, dithered, as
 * hand-made pixel art is. It runs once per view and size, and is kept.
 * (The tracer is The Puma Express's, with the prism added.)
 *
 * Coordinates are metres: z along the ship (bow positive), x across it
 * (starboard positive), y up from the waterline. */
"use strict";
(() => {
  const K = PP.K, M = K.M, Mo = PP.Model = {};

  /* ---- intersections: each returns { t, n } or null ---- */
  function box(p, o, d) {
    let tmin = -Infinity, tmax = Infinity, n = null;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < p.a[i] || o[i] > p.b[i]) return null; continue; }
      let t0 = (p.a[i] - o[i]) / d[i], t1 = (p.b[i] - o[i]) / d[i], s = -1;
      if (t0 > t1) { const q = t0; t0 = t1; t1 = q; s = 1; }
      if (t0 > tmin) { tmin = t0; n = [0, 0, 0]; n[i] = s; }
      if (t1 < tmax) tmax = t1;
      if (tmin > tmax) return null;
    }
    if (tmin <= 1e-4 || !n) return null;
    return { t: tmin, n };
  }
  const AX = { x: [0, 1, 2], y: [1, 0, 2], z: [2, 0, 1] };
  function cyl(p, o, d) {
    const [ai, i1, i2] = AX[p.ax], ox = o[i1] - p.c[0], oy = o[i2] - p.c[1], dx = d[i1], dy = d[i2];
    let best = null;
    const a = dx * dx + dy * dy;
    if (a > 1e-12) {
      const b = 2 * (ox * dx + oy * dy), c = ox * ox + oy * oy - p.r * p.r, disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const sq = Math.sqrt(disc);
        for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
          if (t <= 1e-4) continue;
          const l = o[ai] + t * d[ai];
          if (l < p.l[0] || l > p.l[1]) continue;
          const n = [0, 0, 0]; n[i1] = (ox + t * dx) / p.r; n[i2] = (oy + t * dy) / p.r;
          best = { t, n }; break;
        }
      }
    }
    if (p.cap !== false && Math.abs(d[ai]) > 1e-9) for (const [l, s] of [[p.l[0], -1], [p.l[1], 1]]) {
      const t = (l - o[ai]) / d[ai]; if (t <= 1e-4 || (best && t >= best.t)) continue;
      const u = o[i1] + t * d[i1] - p.c[0], v = o[i2] + t * d[i2] - p.c[1];
      if (u * u + v * v > p.r * p.r) continue;
      const n = [0, 0, 0]; n[ai] = s; best = { t, n, cap: s };
    }
    return best;
  }
  function sph(p, o, d) {
    const ox = o[0] - p.c[0], oy = o[1] - p.c[1], oz = o[2] - p.c[2];
    const a = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], b = 2 * (ox * d[0] + oy * d[1] + oz * d[2]), c = ox * ox + oy * oy + oz * oz - p.r * p.r, disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
      if (t <= 1e-4) continue;
      const y = o[1] + t * d[1]; if (p.ymin !== undefined && y < p.ymin) continue;
      return { t, n: [(ox + t * d[0]) / p.r, (oy + t * d[1]) / p.r, (oz + t * d[2]) / p.r] };
    }
    return null;
  }
  /* a convex plan outline [[x, z] ...] (either winding), from y0 to y1: clipped against each face's half-space */
  function prism(p, o, d) {
    let tmin = -Infinity, tmax = Infinity, n = null;
    const planes = p.planes;
    for (let i = 0; i < planes.length; i++) {
      const [nx, ny, nz, c] = planes[i], den = nx * d[0] + ny * d[1] + nz * d[2], num = c - (nx * o[0] + ny * o[1] + nz * o[2]);
      if (Math.abs(den) < 1e-9) { if (num < 0) return null; continue; }
      const t = num / den;
      if (den < 0) { if (t > tmin) { tmin = t; n = [nx, ny, nz]; } }
      else if (t < tmax) tmax = t;
      if (tmin > tmax) return null;
    }
    if (tmin <= 1e-4 || !n) return null;
    return { t: tmin, n };
  }
  const HIT = { box, cyl, sph, prism };
  /* the prism's faces as planes n . p <= c, outward normals */
  function prep(p) {
    if (p.k !== "prism" || p.planes) return p;
    const pts = p.pts, n = pts.length;
    let area = 0; for (let i = 0; i < n; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n]; area += x0 * z1 - x1 * z0; }
    const sgn = area > 0 ? 1 : -1, planes = [[0, 1, 0, p.y[1]], [0, -1, 0, -p.y[0]]];
    for (let i = 0; i < n; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n], ex = x1 - x0, ez = z1 - z0, l = Math.hypot(ex, ez) || 1;
      const nx = ez / l * sgn, nz = -ex / l * sgn;
      planes.push([nx, 0, nz, nx * x0 + nz * z0]);
    }
    p.planes = planes;
    return p;
  }
  /* each part's bounds, for a quick miss */
  function bounds(p) {
    if (p.k === "box") return [p.a, p.b];
    if (p.k === "sph") return [[p.c[0] - p.r, p.c[1] - p.r, p.c[2] - p.r], [p.c[0] + p.r, p.c[1] + p.r, p.c[2] + p.r]];
    if (p.k === "prism") { const xs = p.pts.map(q => q[0]), zs = p.pts.map(q => q[1]); return [[Math.min(...xs), p.y[0], Math.min(...zs)], [Math.max(...xs), p.y[1], Math.max(...zs)]]; }
    const [ai, i1, i2] = AX[p.ax], lo = [0, 0, 0], hi = [0, 0, 0];
    lo[ai] = p.l[0]; hi[ai] = p.l[1]; lo[i1] = p.c[0] - p.r; hi[i1] = p.c[0] + p.r; lo[i2] = p.c[1] - p.r; hi[i2] = p.c[1] + p.r;
    return [lo, hi];
  }
  Mo.bounds = parts => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of parts) { const [a, b] = bounds(prep(p)); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a[i]); hi[i] = Math.max(hi[i], b[i]); } }
    return [lo, hi];
  };
  function aabb(bb, o, d) {
    let tmin = -Infinity, tmax = Infinity;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < bb[0][i] - 1e-6 || o[i] > bb[1][i] + 1e-6) return false; continue; }
      let t0 = (bb[0][i] - o[i]) / d[i], t1 = (bb[1][i] - o[i]) / d[i];
      if (t0 > t1) { const q = t0; t0 = t1; t1 = q; }
      if (t0 > tmin) tmin = t0; if (t1 < tmax) tmax = t1;
      if (tmin > tmax) return false;
    }
    return tmax > 0;
  }

  /* ---- the materials: a ramp each, light to dark ---- */
  const RAMP = {
    steel: M.steel, iron: M.iron, wood: M.wood, brass: M.brass, canvas: M.canvas, cream: M.cream,
    red: ["#ff8a6a", "#d8402a", "#a52c1a", "#6e1a0e", "#3e0e08"], black: ["#5a5e66", "#3c4048", "#26292f", "#17191d", "#0c0d10"],
    chalk: ["#ffffff", "#eeeae0", "#d8d2c4", "#b0aa9c", "#888274"], glass: ["#e8f0ff", "#9ab4d0", "#56708c", "#33465a", "#1e2a38"],
    /* Pumacity's ships: the PDF's warship grey, merchant black and rust, red lead below the waterline, white and buff topsides */
    grey: ["#c2c8d0", "#959da8", "#6c7480", "#4a515c", "#2d323a"],
    greyDk: ["#9aa1ab", "#737b86", "#535a65", "#383e47", "#22262d"],
    hull: ["#727780", "#50545c", "#373a41", "#24262b", "#141518"],
    rust: ["#b48060", "#8c5c40", "#68412b", "#47291b", "#2b180f"],
    redlead: ["#d26a50", "#aa4632", "#7e3022", "#541e15", "#32120c"],
    white: ["#f6f2e8", "#dcd6c8", "#b6af9f", "#898274", "#5c564c"],
    buff: ["#ecd29a", "#cbac6c", "#9f824c", "#6f5932", "#43351e"],
    wolfRed: M.wolfRed, livery: M.tawny, deck: ["#b89a74", "#93774f", "#6f5636", "#4d3a23", "#2f2315"],
    /* ours: a black-grey hull, a teak deck */
    sub: ["#7c848e", "#58606a", "#3e454e", "#292e35", "#17191e"],
    plane: ["#a8b4c4", "#7c8898", "#5a6474", "#3e4652", "#262c36"], under: ["#c8d0d8", "#a2acb6", "#7e8892", "#5a636c", "#3a4048"],
  };
  const RGB = Object.fromEntries(Object.entries(RAMP).map(([k, v]) => [k, v.map(K.rgb)]));
  Mo.RAMP = RAMP;

  /* ---- the tracer ----
     cam: { ray(px, py) -> [o, d] }, light: { dir (toward the light), amb, sun (colour multipliers), lamps: [{ p, col, r }] } */
  Mo.trace = (parts, W, H, cam, light, off = { x: 0, y: 0 }) => {
    parts.forEach(prep);
    const c = K.mk(W, H), g = c.getContext("2d"), img = g.createImageData(W, H), data = img.data;
    const bbs = parts.map(bounds), L0 = light.dir, ln = Math.hypot(...L0), Ld = L0.map(v => v / ln);
    const amb = light.amb || [0.3, 0.33, 0.45], sun = light.sun || [0.75, 0.78, 0.9], lamps = light.lamps || [];
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const [o, d] = cam.ray(px + off.x + 0.5, py + off.y + 0.5);
      let best = null, bm = null;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!aabb(bbs[i], o, d)) continue;
        const h = HIT[p.k](p, o, d);
        if (!h || (best && h.t >= best.t)) continue;
        const hp = [o[0] + d[0] * h.t, o[1] + d[1] * h.t, o[2] + d[2] * h.t];
        const m = p.tex ? p.tex(hp, h.n, h) : p.m;
        if (!m) continue;
        h.p = hp; best = h; bm = m;
      }
      if (!best) continue;
      const o4 = (py * W + px) * 4;
      if (bm === "glowing" || bm === "lamp") {
        const q = light.key === "day" ? [190, 186, 160] : bm === "lamp" ? [255, 246, 210] : [255, 170, 80];
        data[o4] = q[0]; data[o4 + 1] = q[1]; data[o4 + 2] = q[2]; data[o4 + 3] = 255; continue;
      }
      const n = best.n, ndl = Math.max(0, n[0] * Ld[0] + n[1] * Ld[1] + n[2] * Ld[2]);
      const shiny = bm === "brass" || bm === "steel" || bm === "glass";
      const hx = Ld[0] - d[0], hy = Ld[1] - d[1], hz = Ld[2] - d[2], hl = Math.hypot(hx, hy, hz) || 1;
      const spec = Math.pow(Math.max(0, (n[0] * hx + n[1] * hy + n[2] * hz) / hl), shiny ? 18 : 40) * (shiny ? 1 : 0.3);
      const v = 0.16 + ndl * 0.84 + spec * 0.7 + K.bayer(px, py) * 0.14;
      const ramp = RGB[bm] || RGB.iron, q = ramp[Math.max(0, Math.min(4, Math.round(4.1 - v * 3.7)))];
      let r = q[0] * (amb[0] + ndl * sun[0]), gg = q[1] * (amb[1] + ndl * sun[1]), b = q[2] * (amb[2] + ndl * sun[2]);
      for (const lp of lamps) {
        const lx = lp.p[0] - best.p[0], ly = lp.p[1] - best.p[1], lz = lp.p[2] - best.p[2], dd = Math.hypot(lx, ly, lz), f = Math.max(0, 1 - dd / lp.r);
        if (f <= 0) continue;
        const nl = Math.max(0, (n[0] * lx + n[1] * ly + n[2] * lz) / dd) * f * f;
        r += q[0] * lp.col[0] * nl; gg += q[1] * lp.col[1] * nl; b += q[2] * lp.col[2] * nl;
      }
      data[o4] = Math.min(255, r + spec * 50); data[o4 + 1] = Math.min(255, gg + spec * 50); data[o4 + 2] = Math.min(255, b + spec * 55); data[o4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };

  /* ---- vectors and an orthographic camera from any direction ---- */
  Mo.norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  Mo.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  Mo.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  /* v: the direction from the model toward the eye; s pixels a metre; the picture's centre on the model's point c */
  Mo.ortho = (v, s, W, H, c = [0, 0, 0], cx = W / 2, cy = H / 2) => {
    v = Mo.norm(v);
    let ref = [0, 1, 0]; if (Math.abs(v[1]) > 0.96) ref = [0, 0, 1];
    const U = Mo.norm([ref[0] - v[0] * Mo.dot(ref, v), ref[1] - v[1] * Mo.dot(ref, v), ref[2] - v[2] * Mo.dot(ref, v)]);
    const Rt = Mo.cross(v, U), f = [-v[0], -v[1], -v[2]];
    return {
      U, R: Rt, v,
      ray: (px, py) => { const a = (px - cx) / s, b = (cy - py) / s; return [[c[0] + Rt[0] * a + U[0] * b + v[0] * 400, c[1] + Rt[1] * a + U[1] * b + v[1] * 400, c[2] + Rt[2] * a + U[2] * b + v[2] * 400], f]; },
      proj: p => { const q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return { x: cx + Mo.dot(q, Rt) * s, y: cy - Mo.dot(q, U) * s }; },
    };
  };
  /* a perspective eye at e, looking along unit f with up u, focal length fl pixels */
  Mo.persp = (e, f, u, fl, cx, cy) => {
    const R = Mo.cross(f, u);
    return { ray: (px, py) => { const a = (px - cx) / fl, b = (cy - py) / fl; return [e, [f[0] + R[0] * a + u[0] * b, f[1] + R[1] * a + u[1] * b, f[2] + R[2] * a + u[2] * b]]; } };
  };

  /* ---- part makers ---- */
  Mo.B = (a, b, m, tex) => ({ k: "box", a, b, m, tex });
  Mo.Cy = (ax, c, r, l, m, tex, cap) => ({ k: "cyl", ax, c, r, l, m, tex, cap });
  Mo.Sp = (c, r, m, ymin) => ({ k: "sph", c, r, m, ymin });
  Mo.Pr = (pts, y0, y1, m, tex) => ({ k: "prism", pts, y: [y0, y1], m, tex });
  Mo.LIGHTS = {
    day: { key: "day", dir: [0.5, 0.8, 0.35], amb: [0.5, 0.53, 0.6], sun: [0.62, 0.6, 0.55] },
    dusk: { key: "dusk", dir: [0.7, 0.35, 0.5], amb: [0.36, 0.3, 0.42], sun: [0.85, 0.55, 0.42] },
    night: { key: "night", dir: [0.4, 0.75, 0.4], amb: [0.16, 0.19, 0.3], sun: [0.3, 0.34, 0.46] },
  };
})();
