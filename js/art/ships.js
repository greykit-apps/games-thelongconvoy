/* PumaPack -- the ships, as models, and their pictures.
 *
 * Every class is built from a hull (a prism tapering to the stem and the
 * stern, red lead below the boot-topping), raised forecastle and poop where
 * the class has them, deckhouses, funnels, masts and kingposts, hatches,
 * boats and guns. ShipArt.sprite traces one at the angle on the bow it is
 * seen from (seventeen bins from bow-on to stern-on; the other side is the
 * same picture mirrored), at a length in pixels, in a light, and keeps it.
 *
 * Merchants wear black or rust hulls and buff kingposts, the Empire's red
 * band on their funnels; its warships are grey. Our boat is long, low and
 * black, with her teak deck and the conning tower. */
"use strict";
(() => {
  const K = PP.K, Mo = PP.Model, A = PP.ShipArt = {};
  const { B, Cy, Pr } = Mo;

  /* a hull's outline in plan: the stem at +L/2, a transom stern at -L/2 */
  function plan(L, Bm, o = {}) {
    const h = Bm / 2, bow = o.bow || 0.3, stern = o.stern || 0.22, tr = o.transom === undefined ? 0.55 : o.transom, fine = o.fine || 0.5;
    const P = [[0, L / 2], [h * fine, L / 2 - L * bow * 0.3], [h * 0.92, L / 2 - L * bow * 0.75], [h, L / 2 - L * bow],
      [h, -L / 2 + L * stern], [h * 0.86, -L / 2 + L * stern * 0.4], [h * tr, -L / 2]];
    const Q = P.slice(1, tr > 0 ? P.length : P.length - 1).reverse().map(([x, z]) => [-x, z]);
    return P.concat(Q);
  }
  /* the part of a convex outline between z0 and z1 */
  function clipZ(pts, z0, z1) {
    const cut = (poly, zc, keepAbove) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], ia = keepAbove ? a[1] >= zc : a[1] <= zc, ib = keepAbove ? b[1] >= zc : b[1] <= zc;
        if (ia) out.push(a);
        if (ia !== ib) { const t = (zc - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, zc]); }
      }
      return out;
    };
    return cut(cut(pts, z0, true), z1, false);
  }
  const shrink = (pts, k) => pts.map(([x, z]) => [x * k, z]);

  /* the hull itself: red lead below the boot-topping, the hull colour above, a rubbing strake */
  function hull(P, L, Bm, F, hc, o = {}) {
    const pts = plan(L, Bm, o), D = o.draft || 2;
    P.push(Pr(pts, -D, F, hc, (p, n) => n[1] > 0.5 ? (o.deck || "deck") : p[1] < 0.35 ? "redlead" : Math.abs(p[1] - (F - 0.5)) < 0.12 && o.strake !== false ? (hc === "grey" ? "greyDk" : "rust") : hc));
    if (o.fc) P.push(Pr(clipZ(pts, L / 2 - L * o.fc, L), F, F + (o.fcH || 2.4), hc, (p, n) => n[1] > 0.5 ? (o.deck || "deck") : hc));
    if (o.poop) P.push(Pr(clipZ(pts, -L, -L / 2 + L * o.poop), F, F + (o.poopH || 2.2), hc, (p, n) => n[1] > 0.5 ? (o.deck || "deck") : hc));
    return pts;
  }
  /* a deckhouse: windows along its top deck, its roof darker */
  const house = (P, x, z0, z1, y0, y1, m, win = true, ws = 1.6) => P.push(B([-x, y0, z0], [x, y1, z1], m, (p, n) => {
    if (n[1] > 0.5) return m === "white" ? "cream" : m;
    if (win && Math.abs(n[1]) < 0.5 && p[1] > y1 - 1.1 && p[1] < y1 - 0.45) return (Math.abs(n[2]) > 0.5 ? (Math.abs(p[0]) % ws) < ws * 0.55 : (Math.abs(p[2]) % ws) < ws * 0.55) ? "glass" : m;
    return m;
  }));
  const funnel = (P, z, y0, h, r, band = true, m = "black") => P.push(Cy("y", [0, z], r, [y0, y0 + h], m, (p, n, hit) => hit && hit.cap ? "black" : band && p[1] > y0 + h * 0.62 && p[1] < y0 + h * 0.82 ? "wolfRed" : p[1] > y0 + h - 0.35 ? "black" : m));
  const mast = (P, z, y0, h, r = 0.18, m = "buff") => { P.push(Cy("y", [0, z], r, [y0, y0 + h], m)); P.push(B([-1.6, y0 + h * 0.62, z - 0.12], [1.6, y0 + h * 0.62 + 0.22, z + 0.12], m)); };
  const kingposts = (P, z, y0, h, w = 2.6) => { for (const x of [-w, w]) P.push(Cy("y", [x, z], 0.2, [y0, y0 + h], "buff")); P.push(B([-w, y0 + h - 0.4, z - 0.15], [w, y0 + h - 0.15, z + 0.15], "buff")); };
  const hatch = (P, z, y, w, l) => P.push(B([-w, y, z - l / 2], [w, y + 0.7, z + l / 2], "canvas"));
  const boats = (P, z0, z1, y, x) => { for (const s of [-1, 1]) P.push(Cy("z", [s * x, y + 0.6], 0.55, [z0, z1], "white")); };
  const gun = (P, z, y, dir = 1, big = 1) => { P.push(Cy("y", [0, z], 1.2 * big, [y, y + 1.1 * big], "grey")); P.push(B([-0.9 * big, y + 0.2, z - 1.1 * big], [0.9 * big, y + 1.6 * big, z + 0.9 * big], "grey")); P.push(Cy("z", [0, y + 1.0 * big], 0.16 * big, dir > 0 ? [z, z + 4.2 * big] : [z - 4.2 * big, z], "greyDk")); };
  const racks = (P, z, y, x) => { for (const s of [-1, 1]) P.push(B([s * x - 0.4, y, z - 3], [s * x + 0.4, y + 0.9, z], "black")); };

  /* ---- the classes (metres) ---- */
  const BUILD = {
    coaster: () => {
      const P = [], L = 75, Bm = 12, F = 3.2;
      hull(P, L, Bm, F, "rust", { fc: 0.14, poop: 0.3, poopH: 2.4, transom: 0.5 });
      house(P, 4.2, -L / 2 + 6, -L / 2 + 16, F + 2.4, F + 5.2, "white");
      house(P, 2.8, -L / 2 + 9, -L / 2 + 14, F + 5.2, F + 7.2, "white");
      funnel(P, -L / 2 + 6.5, F + 2.4, 6.5, 1.3);
      mast(P, 14, F + 2.4, 13); hatch(P, 4, F, 3.2, 8); hatch(P, 20, F, 3.2, 7);
      return P;
    },
    freighter: () => {
      const P = [], L = 120, Bm = 16.5, F = 4.5;
      hull(P, L, Bm, F, "hull", { fc: 0.13, poop: 0.12 });
      house(P, 6, -10, 8, F, F + 3, "white"); house(P, 5, -6, 5, F + 3, F + 5.8, "white"); house(P, 3.4, -1, 4, F + 5.8, F + 7.6, "white");
      funnel(P, -7.5, F + 3, 8, 1.9);
      boats(P, -9, -4, F + 3, 5.2);
      kingposts(P, 30, F, 11); mast(P, 44, F + 2.4, 17);
      kingposts(P, -24, F, 10); mast(P, -40, F + 2.2, 15);
      hatch(P, 22, F, 4, 9); hatch(P, 38, F, 4, 7); hatch(P, -18, F, 4, 9); hatch(P, -32, F, 4, 7);
      return P;
    },
    liner: () => {
      const P = [], L = 145, Bm = 19, F = 5.5;
      hull(P, L, Bm, F, "hull", { fc: 0.16, poop: 0.1, fine: 0.4 });
      house(P, 7.6, -22, 20, F, F + 2.8, "white"); house(P, 7, -18, 16, F + 2.8, F + 5.6, "white"); house(P, 4.5, 2, 12, F + 5.6, F + 8, "white");
      funnel(P, -3, F + 5.6, 8.5, 2.6);
      boats(P, -16, -10, F + 5.6, 6.2); boats(P, -8, -2, F + 5.6, 6.2);
      kingposts(P, 34, F, 10); mast(P, 52, F + 2.4, 19); mast(P, -44, F + 2.4, 17); kingposts(P, -30, F, 10);
      hatch(P, 30, F, 4.5, 8); hatch(P, 44, F, 4.5, 7); hatch(P, -34, F, 4.5, 8);
      return P;
    },
    tanker: () => {
      const P = [], L = 152, Bm = 20, F = 3.2;
      hull(P, L, Bm, F, "hull", { fc: 0.08, poop: 0.16, poopH: 2.6, transom: 0.6 });
      house(P, 6.5, 18, 30, F, F + 3.2, "white"); house(P, 5, 21, 28, F + 3.2, F + 6, "white");
      house(P, 8, -L / 2 + 4, -L / 2 + 22, F + 2.6, F + 5.4, "white");
      funnel(P, -L / 2 + 10, F + 5.4, 6.5, 2.2);
      boats(P, -L / 2 + 6, -L / 2 + 12, F + 5.4, 6.4);
      P.push(B([-0.5, F + 1.6, -L / 2 + 22], [0.5, F + 2, 18], "grey"));
      P.push(B([-0.5, F + 1.6, 30], [0.5, F + 2, L / 2 - 14], "grey"));
      mast(P, L / 2 - 16, F + 2.4, 14); mast(P, -10, F, 12);
      for (let z = -L / 2 + 26; z < L / 2 - 18; z += 9) P.push(B([-3.5, F, z], [3.5, F + 0.5, z + 1.2], "redlead"));
      return P;
    },
    troopship: () => {
      const P = [], L = 137, Bm = 18, F = 5.5;
      hull(P, L, Bm, F, "greyDk", { fc: 0.15, poop: 0.12, strake: false });
      house(P, 7.4, -30, 26, F, F + 2.8, "grey"); house(P, 7, -26, 22, F + 2.8, F + 5.6, "grey"); house(P, 6.4, -18, 16, F + 5.6, F + 8.2, "grey"); house(P, 4, 8, 15, F + 8.2, F + 10.2, "grey");
      funnel(P, -6, F + 8.2, 7, 2.1, true, "grey"); funnel(P, 4, F + 8.2, 7, 2.1, true, "grey");
      boats(P, -24, -18, F + 5.6, 6.6); boats(P, -14, -8, F + 5.6, 6.6); boats(P, 10, 16, F + 2.8, 7);
      mast(P, 46, F + 2.4, 18, 0.18, "grey"); mast(P, -42, F + 2.2, 16, 0.18, "grey");
      return P;
    },
    destroyer: () => {
      const P = [], L = 108, Bm = 10.5, F = 3.4;
      hull(P, L, Bm, F, "grey", { fc: 0.38, fcH: 1.8, bow: 0.34, fine: 0.35, transom: 0.6, deck: "greyDk", strake: false });
      house(P, 2.8, 10, 18, F + 1.8, F + 5.6, "grey", true, 1.2); house(P, 2, 12, 16, F + 5.6, F + 7.4, "grey", true, 1.0);
      funnel(P, 2, F + 1.8, 6, 1.3, false, "grey"); funnel(P, -8, F, 7, 1.3, false, "grey");
      P.push(Cy("y", [0, 2], 1.32, [F + 7.4, F + 7.8], "black")); P.push(Cy("y", [0, -8], 1.32, [F + 6.6, F + 7], "black"));
      mast(P, 8, F + 7.4, 10, 0.2, "grey");
      gun(P, 30, F + 1.8, 1); gun(P, 22, F + 1.8, 1, 0.9); gun(P, -28, F, -1); gun(P, -38, F, -1, 0.9);
      house(P, 1.6, -22, -14, F, F + 2, "grey", false);
      racks(P, -L / 2 + 4, F, 2.4);
      return P;
    },
    frigate: () => {
      const P = [], L = 79, Bm = 10, F = 3.4;
      hull(P, L, Bm, F, "grey", { fc: 0.45, fcH: 1.8, bow: 0.32, fine: 0.4, deck: "greyDk", strake: false });
      house(P, 3, 2, 12, F + 1.8, F + 5.4, "grey", true, 1.2); house(P, 2.2, 5, 10, F + 5.4, F + 7, "grey", true, 1.0);
      funnel(P, -4, F + 1.8, 5.5, 1.4, false, "grey"); P.push(Cy("y", [0, -4], 1.42, [F + 6.9, F + 7.3], "black"));
      mast(P, 4, F + 7, 11, 0.2, "grey");
      gun(P, 22, F + 1.8, 1); gun(P, -26, F, -1, 0.8);
      racks(P, -L / 2 + 3, F, 2.4);
      return P;
    },
    chaser: () => {
      const P = [], L = 50, Bm = 6.8, F = 2.6;
      hull(P, L, Bm, F, "grey", { bow: 0.35, fine: 0.4, transom: 0.7, deck: "greyDk", strake: false });
      house(P, 1.9, 4, 11, F, F + 2.6, "grey", true, 1.0); house(P, 1.4, 6, 10, F + 2.6, F + 3.8, "grey", true, 0.9);
      funnel(P, 1, F, 3, 0.8, false, "grey");
      mast(P, 8, F + 3.8, 7, 0.14, "grey");
      gun(P, 16, F, 1, 0.7); gun(P, -14, F, -1, 0.6);
      racks(P, -L / 2 + 2.5, F, 1.6);
      return P;
    },
    /* ours: a fleet boat, long and low, the conning tower amidships */
    sub: () => {
      const P = [], L = 95, Bm = 8, F = 1.5;
      hull(P, L, Bm, F, "sub", { bow: 0.3, fine: 0.25, stern: 0.3, transom: 0.12, deck: "deck", strake: false, draft: 1.5 });
      P.push(Pr([[0, 9.5], [1.5, 8], [1.7, 2], [1.4, -6], [0, -7.5], [-1.4, -6], [-1.7, 2], [-1.5, 8]], F, F + 4.2, "sub", (p, n) => n[1] > 0.5 ? "black" : p[1] > F + 3.6 ? "black" : "sub"));
      for (const z of [3.5, 1.2]) P.push(Cy("y", [0, z], 0.22, [F + 4.2, F + 9], "steel"));
      P.push(B([-0.35, F + 4.2, -3.5], [0.35, F + 8, -2.8], "steel"));
      P.push(Cy("y", [0, 14], 0.9, [F, F + 1.1], "sub")); P.push(Cy("z", [0, F + 1.5], 0.14, [14, 18.5], "black"));
      return P;
    },
  };
  /* where each class's parts are cached, and its size: length, and the masthead */
  const MODELS = {};
  A.model = cls => MODELS[cls] || (MODELS[cls] = (() => { const parts = BUILD[cls](), bb = Mo.bounds(parts); return { parts, bb, len: bb[1][2] - bb[0][2], top: bb[1][1] }; })());
  A.CLASSES = Object.keys(BUILD);

  /* ---- the pictures ---- */
  A.SIZES = [8, 10, 12, 15, 19, 24, 30, 37, 46, 58, 72, 90, 112, 140, 175, 219, 274, 342, 428];
  A.BINS = 16;                                   /* 17 bins, 0 bow-on to 16 stern-on */
  A.EL = 0.05;
  A.sizeFor = px => A.SIZES.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a);
  /* aob: radians, the angle off the target's bow at which we see it, + starboard; -> { bin, mirror } */
  A.binOf = aob => {
    let a = PP.angDiff(0, aob);
    const mirror = a < 0; a = Math.abs(a);
    return { bin: Math.round(a / Math.PI * A.BINS), mirror };
  };
  A.key = (cls, bin, size, light) => `ship:${cls}:${bin}:${size}:${light}`;
  A.has = (cls, bin, size, light) => K.cache.has(A.key(cls, bin, size, light));
  /* the traced picture: c.ox, c.oy is where the waterline amidships falls; c.top the masthead's height in pixels */
  A.sprite = (cls, bin, size, light = "day") => K.get(A.key(cls, bin, size, light), () => {
    const M = A.model(cls), s = size / M.len, th = bin / A.BINS * Math.PI;
    const v = [Math.cos(A.EL) * Math.sin(th), Math.sin(A.EL), Math.cos(A.EL) * Math.cos(th)];
    /* the picture's bounds, from the model's box projected */
    const cam0 = Mo.ortho(v, s, 0, 0, [0, 0, 0], 0, 0);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const X of [M.bb[0][0], M.bb[1][0]]) for (const Y of [M.bb[0][1], M.bb[1][1]]) for (const Z of [M.bb[0][2], M.bb[1][2]]) { const q = cam0.proj([X, Y, Z]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const W = Math.ceil(x1 - x0) + 4, H = Math.ceil(y1 - y0) + 4, cx = -x0 + 2, cy = -y0 + 2;
    const cam = Mo.ortho(v, s, W, H, [0, 0, 0], cx, cy);
    const c = Mo.trace(M.parts, W, H, cam, Mo.LIGHTS[light] || Mo.LIGHTS.day);
    if (size >= 30) K.outline(c, light === "night" ? "#05070c" : "#141a24");
    c.ox = cx; c.oy = cy; c.top = M.top * s; c.s = s;
    return c;
  });
  /* mirrored, for the other side */
  A.spriteM = (cls, bin, size, light = "day") => K.get(A.key(cls, bin, size, light) + ":m", () => {
    const o = A.sprite(cls, bin, size, light), m = K.flip(o);
    m.ox = o.width - o.ox; m.oy = o.oy; m.top = o.top; m.s = o.s;
    return m;
  });
  /* a picture at the size wanted, or the nearest one already traced while it is traced (budget: n a frame) */
  A.budget = 0;
  A.get = (cls, aob, px, light) => {
    const { bin, mirror } = A.binOf(aob), size = A.sizeFor(px);
    const f = mirror ? A.spriteM : A.sprite;
    if (A.has(cls, bin, size, light) || A.budget > 0) { if (!A.has(cls, bin, size, light)) A.budget--; return { c: f(cls, bin, size, light), k: px / size }; }
    /* the nearest size already made */
    let best = null;
    for (const z of A.SIZES) if (A.has(cls, bin, z, light) && (!best || Math.abs(z - size) < Math.abs(best - size))) best = z;
    if (best) return { c: f(cls, bin, best, light), k: px / best };
    A.budget--; return { c: f(cls, bin, Math.min(size, 46), light), k: px / Math.min(size, 46) };
  };
})();
