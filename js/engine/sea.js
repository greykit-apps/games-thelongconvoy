/* The Long Convoy -- the sea: the Wolf Empire's archipelago, 1,200 by 800
 * nautical miles of it, and its depths.
 *
 * Built once from a fixed seed, never saved: the same sea in every game and
 * every browser. The Empire's home islands lie in the north-west, Lupenmark
 * and Greyholm; its oil in the Ember Isles to the south-west; its mines on
 * the Kessrin islands in the middle. Its convoys run the lanes between them,
 * through the straits. Our boats sail from Port Talon in the far east, and
 * later from forward bases at Cairn Atoll and Southwind.
 *
 * One grid of depths, two nautical miles a cell, feet below the surface
 * (negative is land, and its height). Every place name is our own. */
"use strict";
(() => {
  const NM = PP.YD_NM, Sea = PP.Sea = {};
  Sea.W_NM = 1200; Sea.H_NM = 800; Sea.CELL_NM = 2;
  Sea.W = Sea.W_NM * NM; Sea.H = Sea.H_NM * NM;
  const NX = Sea.W_NM / Sea.CELL_NM, NY = Sea.H_NM / Sea.CELL_NM, CELL = Sea.CELL_NM * NM;
  Sea.NX = NX; Sea.NY = NY; Sea.CELL = CELL;

  /* ---- noise, for coasts and the bottom ---- */
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 974634721)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const vn = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, s) => vn(x, y, s) * 0.5 + vn(x * 2.1, y * 2.1, s + 3) * 0.3 + vn(x * 4.7, y * 4.7, s + 7) * 0.2;
  Sea.fbm = fbm;

  /* ---- the islands: centre and radius in nm, stretch and turn, hill height in feet, who holds it ---- */
  const ISLES = [
    /* the Empire's home islands, the north-west */
    { n: "Lupenmark", x: 175, y: 175, r: 105, e: 1.35, a: 0.5, h: 2600, side: "wolf", label: true },
    { n: "Greyholm", x: 340, y: 78, r: 50, e: 1.6, a: -0.3, h: 1900, side: "wolf", label: true },
    { x: 52, y: 330, r: 30, e: 1.2, a: 0.2, h: 900, side: "wolf" },
    { x: 290, y: 300, r: 16, e: 1.4, a: 1.1, h: 600, side: "wolf" },
    /* the Thornback Isles, a broken chain to the south */
    { n: "Thornback Isles", x: 210, y: 405, r: 30, e: 2.2, a: 0.9, h: 1100, side: "wolf", label: true },
    { x: 165, y: 455, r: 14, e: 1.3, a: 0.2, h: 500, side: "wolf" },
    { x: 262, y: 360, r: 12, e: 1.5, a: 0.6, h: 450, side: "wolf" },
    /* Marrow Isle, across the Greyfang Narrows from them */
    { n: "Marrow Isle", x: 420, y: 470, r: 34, e: 1.5, a: -0.6, h: 1400, side: "wolf", label: true },
    /* the Ember Isles: oil */
    { n: "Ember Isles", x: 170, y: 655, r: 42, e: 1.5, a: 0.35, h: 1200, side: "wolf", label: true },
    { x: 255, y: 712, r: 20, e: 1.3, a: 0.9, h: 600, side: "wolf" },
    { x: 92, y: 590, r: 18, e: 1.2, a: 0.1, h: 500, side: "wolf" },
    /* the Kessrin islands: mines, either side of the strait */
    { n: "North Kessrin", x: 548, y: 278, r: 38, e: 1.5, a: 0.4, h: 1700, side: "wolf", label: true },
    { n: "South Kessrin", x: 585, y: 418, r: 32, e: 1.4, a: -0.2, h: 1300, side: "wolf", label: true },
    /* Hollow Reach, the Empire's furthest outpost */
    { n: "Hollow Reach", x: 790, y: 300, r: 22, e: 1.3, a: 0.3, h: 800, side: "wolf", label: true },
    /* scattered islands, held by nobody worth the name */
    { x: 690, y: 120, r: 14, e: 1.2, a: 0.2, h: 300 }, { x: 860, y: 520, r: 12, e: 1.1, a: 0.9, h: 300 },
    { x: 470, y: 640, r: 16, e: 1.6, a: 0.4, h: 500 }, { x: 980, y: 210, r: 18, e: 1.3, a: -0.4, h: 700 },
    { x: 930, y: 700, r: 15, e: 1.4, a: 0.7, h: 400 }, { x: 360, y: 610, r: 9, e: 1.2, a: 0, h: 200 },
    { x: 740, y: 690, r: 10, e: 1.2, a: 0.5, h: 260 }, { x: 640, y: 560, r: 11, e: 1.5, a: 1.2, h: 340 },
    /* ours: Talon, the home base, in the far east */
    { n: "Talon Island", x: 1120, y: 430, r: 62, e: 1.6, a: 0.15, h: 2200, side: "puma", label: true },
    { x: 1150, y: 600, r: 24, e: 1.3, a: 0.5, h: 900, side: "puma" },
    /* Cairn Atoll and Southwind, later in the war */
    { n: "Cairn Atoll", x: 838, y: 455, r: 7, e: 1.0, a: 0, h: 40, side: "puma", label: true, atoll: true },
    { n: "Southwind", x: 668, y: 735, r: 20, e: 1.3, a: 0.4, h: 600, side: "puma", label: true },
  ];
  /* banks and shoals: centre, radius in nm, the shallowest feet */
  const SHOALS = [
    { n: "Ashen Shoals", x: 330, y: 560, r: 46, d: 28 },
    { n: "Moonrake Banks", x: 700, y: 205, r: 52, d: 40 },
    { x: 900, y: 360, r: 26, d: 70 },
    { x: 470, y: 160, r: 24, d: 55 },
  ];
  /* the bases: where a boat ties up (nm), and from which month of the war */
  Sea.PORTS = [
    { id: "talon", name: "Port Talon", x: 1006, y: 452, from: 0 },
    { id: "cairn", name: "Cairn Atoll", x: 838, y: 470, from: 30 },
    { id: "southwind", name: "Southwind", x: 668, y: 708, from: 44 },
  ];
  /* the Empire's sea lanes, nm: the convoys run them, both ways */
  Sea.LANES = [
    { id: "ember", name: "the Ember run", pts: [[214, 592], [262, 540], [318, 470], [340, 400], [340, 322], [332, 282], [318, 262]], w: 1.2, kinds: ["tanker", "tanker", "freighter", "liner"] },
    { id: "kessrin", name: "the Kessrin run", pts: [[560, 352], [500, 318], [440, 268], [400, 200], [366, 150], [330, 140]], w: 1, kinds: ["freighter", "coaster", "liner", "freighter"] },
    { id: "front", name: "the front supply", pts: [[300, 268], [400, 300], [490, 345], [560, 352], [640, 345], [720, 318], [768, 318]], w: 0.8, kinds: ["troopship", "freighter", "liner", "coaster"] },
    { id: "coast", name: "the coast road", pts: [[118, 540], [190, 505], [262, 488], [318, 470], [380, 540], [440, 560], [500, 590]], w: 0.6, kinds: ["coaster", "coaster", "freighter"] },
  ];
  /* patrol zones: where command sends us, by the traffic, the air cover and the hunters there */
  Sea.ZONES = [
    { id: "approaches", name: "Lupenmark Approaches", x: 300, y: 245, r: 55, air: 1.6, asw: 1.4 },
    { id: "vargrin", name: "Vargrin Sound", x: 385, y: 180, r: 45, air: 1.3, asw: 1.2 },
    { id: "greyfang", name: "Greyfang Narrows", x: 328, y: 440, r: 45, air: 1.0, asw: 1.1 },
    { id: "ember", name: "Ember Lanes", x: 240, y: 560, r: 60, air: 0.9, asw: 1.0 },
    { id: "kessrin", name: "Kessrin Strait", x: 560, y: 350, r: 45, air: 1.1, asw: 1.2 },
    { id: "duskwater", name: "Duskwater Passage", x: 680, y: 330, r: 55, air: 0.7, asw: 0.8 },
    { id: "coast", name: "Marrow Coast", x: 450, y: 570, r: 50, air: 0.6, asw: 0.7 },
  ];
  Sea.LABELS = [
    { n: "Vargrin Sound", x: 400, y: 190 }, { n: "Greyfang Narrows", x: 330, y: 438 }, { n: "Kessrin Strait", x: 560, y: 350 },
    { n: "Duskwater Passage", x: 690, y: 345 }, { n: "The Ember Sea", x: 300, y: 690 }, { n: "The Grey Deep", x: 900, y: 120 },
    { n: "The Long Water", x: 950, y: 620 },
  ].concat(SHOALS.filter(s => s.n).map(s => ({ n: s.n, x: s.x, y: s.y + 6, shoal: true })));

  /* ---- the grid ---- */
  function field(xn, yn) {
    /* how far inside the nearest coast: < 1 is land; and the hill height there */
    let q = 99, h = 0, wn = null;
    for (const I of ISLES) {
      const dx = xn - I.x, dy = yn - I.y;
      if (Math.abs(dx) > I.r * I.e * 1.6 + 40 || Math.abs(dy) > I.r * I.e * 1.6 + 40) continue;
      const ca = Math.cos(I.a), sa = Math.sin(I.a), u = (dx * ca + dy * sa) / I.e, v = -dx * sa + dy * ca;
      let d = Math.hypot(u, v) / I.r;
      /* a ragged coast: the noise bites more out of the bigger islands */
      d += (fbm(xn / 26, yn / 26, 11) - 0.5) * 0.55 + (fbm(xn / 7, yn / 7, 17) - 0.5) * 0.22;
      if (I.atoll && d < 0.55) d = 1.05 + (0.55 - d);
      if (d < q) { q = d; h = I.h; wn = I; }
    }
    return { q, h, isle: wn };
  }
  Sea.build = () => {
    if (Sea.depth) return Sea;
    const D = new Int16Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const xn = (i + 0.5) * Sea.CELL_NM, yn = (j + 0.5) * Sea.CELL_NM, f = field(xn, yn);
      let d;
      if (f.q < 1) d = -Math.round(20 + f.h * Math.pow(1 - f.q, 1.3) * (0.6 + fbm(xn / 9, yn / 9, 5) * 0.8));
      else {
        /* off the coast: a shelf, a slope, the deep; the radius in nm turns q into a distance */
        const r = f.isle ? f.isle.r * Math.min(1.4, f.isle.e) : 60, out = (f.q - 1) * r;
        if (out < 7) d = PP.lerp(12, 280, out / 7);
        else if (out < 34) d = PP.lerp(280, 9000, (out - 7) / 27);
        else d = 9000;
        d *= 0.75 + fbm(xn / 40, yn / 40, 23) * 0.5;
        d = Math.max(12, d);
      }
      for (const s of SHOALS) {
        const k = Math.hypot(xn - s.x, yn - s.y) / s.r;
        if (k < 1.6 && d > 0) d = Math.min(d, s.d + Math.pow(Math.max(0, k - 0.15), 2) * 900 + fbm(xn / 5, yn / 5, 31) * 60);
      }
      D[j * NX + i] = PP.clamp(Math.round(d), -9000, 14000);
    }
    Sea.depth = D;
    const Y = v => v * NM;
    Sea.ports = Sea.PORTS.map(p => Object.assign({}, p, { x: Y(p.x), y: Y(p.y) }));
    Sea.lanes = Sea.LANES.map(l => {
      const pts = l.pts.map(([x, y]) => [Y(x), Y(y)]);
      let len = 0; const cum = [0];
      for (let i = 1; i < pts.length; i++) { len += PP.dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); cum.push(len); }
      return Object.assign({}, l, { pts, cum, len });
    });
    Sea.zones = Sea.ZONES.map(z => Object.assign({}, z, { x: Y(z.x), y: Y(z.y), r: Y(z.r) }));
    Sea.labels = Sea.LABELS.map(l => Object.assign({}, l, { x: Y(l.x), y: Y(l.y) }));
    Sea.isles = ISLES.filter(I => I.label).map(I => ({ n: I.n, x: Y(I.x), y: Y(I.y), side: I.side }));
    return Sea;
  };

  /* ---- what is where ---- */
  const cellD = (i, j) => (i < 0 || j < 0 || i >= NX || j >= NY) ? 9000 : Sea.depth[j * NX + i];
  /* the depth at a point, feet, smoothed between cells; negative is land */
  Sea.depthAt = (x, y) => {
    const fx = x / CELL - 0.5, fy = y / CELL - 0.5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const a = cellD(i, j), b = cellD(i + 1, j), c = cellD(i, j + 1), d = cellD(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  Sea.isLand = (x, y) => Sea.depthAt(x, y) <= 0;
  Sea.inside = (x, y) => x >= 0 && y >= 0 && x <= Sea.W && y <= Sea.H;
  Sea.zoneAt = (x, y) => Sea.zones.find(z => PP.dist(x, y, z.x, z.y) < z.r) || null;
  Sea.port = id => Sea.ports.find(p => p.id === id);
  Sea.portsOpen = mi => Sea.ports.filter(p => mi >= p.from);
  Sea.lane = id => Sea.lanes.find(l => l.id === id);
  /* a point s yards along a lane, and the heading there */
  Sea.along = (L, s) => {
    s = PP.clamp(s, 0, L.len);
    let i = 1; while (i < L.pts.length - 1 && L.cum[i] < s) i++;
    const a = L.pts[i - 1], b = L.pts[i], seg = L.cum[i] - L.cum[i - 1], t = seg > 0 ? (s - L.cum[i - 1]) / seg : 0;
    return { x: PP.lerp(a[0], b[0], t), y: PP.lerp(a[1], b[1], t), hdg: PP.angTo(a[0], a[1], b[0], b[1]), seg: i };
  };
  /* the nearest point of a lane to x, y: how far along, and how far off */
  Sea.nearOnLane = (L, x, y) => {
    let best = { s: 0, d: Infinity };
    for (let i = 1; i < L.pts.length; i++) {
      const a = L.pts[i - 1], b = L.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], ll = dx * dx + dy * dy;
      const t = ll ? PP.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / ll, 0, 1) : 0, px = a[0] + dx * t, py = a[1] + dy * t, d = PP.dist(x, y, px, py);
      if (d < best.d) best = { s: L.cum[i - 1] + Math.sqrt(ll) * t, d };
    }
    return best;
  };
  /* is the straight line from a to b all water at least minD feet deep? */
  Sea.clearLine = (ax, ay, bx, by, minD = 20) => {
    const n = Math.ceil(PP.dist(ax, ay, bx, by) / (CELL * 0.5));
    for (let k = 0; k <= n; k++) if (Sea.depthAt(PP.lerp(ax, bx, k / Math.max(1, n)), PP.lerp(ay, by, k / Math.max(1, n))) < minD) return false;
    return true;
  };
})();
