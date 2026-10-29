/* The Long Convoy -- what happens for a moment: the column of water a torpedo
 * throws up, the flash, smoke from a burning ship, a depth charge in the
 * air and its splash, the fountain and the white boil where it went off,
 * a shell's splash; and what a hurt boat sends up, oil and wreckage.
 *
 * These live in the world (yards, and feet above the water), not on the
 * screen: the periscope projects each one where it is, so turning the
 * scope away and back finds the column still standing. Not part of the
 * game: Math.random is fine here. */
"use strict";
(() => {
  const FX = PP.FX = { items: [] };
  const rnd = (a, b) => a + Math.random() * (b - a);
  FX.clear = () => { FX.items = []; };
  /* p.delay: seconds before it shows (a splash waits for what was thrown to come down) */
  FX.add = p => { if (FX.items.length > 400) FX.items.shift(); p.t = -(p.delay || 0); FX.items.push(p); return p; };
  /* a torpedo hit: a tall column, a flash, then smoke */
  FX.hit = (x, y, big = 1) => {
    FX.add({ k: "column", x, y, h: 140 * big, w: 40 * big, life: 3.2 });
    FX.add({ k: "flash", x, y, h: 30, r: 60 * big, life: 0.35 });
    for (let i = 0; i < 6 * big; i++) FX.add({ k: "smoke", x: x + rnd(-30, 30), y: y + rnd(-30, 30), z: rnd(10, 60), r: rnd(20, 40), grow: rnd(10, 22), vz: rnd(8, 16), life: rnd(8, 16), dark: 0.8 });
  };
  FX.shell = (x, y, hit, delay = 0) => {
    if (hit) { FX.add({ k: "flash", x, y, h: 20, r: 25, life: 0.2, delay }); FX.add({ k: "smoke", x, y, z: 20, r: 12, grow: 8, vz: 6, life: 6, dark: 0.7, delay }); }
    else FX.add({ k: "column", x, y, h: 45, w: 10, life: 1.8, delay });
  };
  /* something thrown: from (x, y), z feet up, to (tx, ty) on the water, peaking hp feet higher, dur seconds in the
   * air, sz feet across; then its splash, big times a charge's */
  FX.toss = (x, y, z, tx, ty, hp, dur, sz, big = 1) => {
    FX.add({ k: "arc", x, y, z, tx, ty, hp, sz, life: dur });
    FX.splash(tx, ty, big, dur);
  };
  FX.splash = (x, y, big = 1, delay = 0) => {
    FX.add({ k: "column", x, y, h: 24 * big, w: 7 * big, life: 1.1, delay });
    FX.add({ k: "boil", x, y, r: 4 * big, life: 4, delay, seed: Math.floor(Math.random() * 1e4) });
  };
  /* a charge going off at z feet: the sea boils white over it; set shallow, a dome heaves up first and bursts
   * into a fountain, the shallower the taller (well over a hundred feet from the shallowest setting) */
  FX.charge = (x, y, z) => {
    const k = PP.clamp(1 - z / 260, 0, 1);
    FX.add({ k: "boil", x, y, r: 12 + 14 * k, life: 7 + 4 * k, seed: Math.floor(Math.random() * 1e4) });
    if (k > 0) FX.add({ k: "fountain", x, y, h: 30 + 170 * k * k, w: 14 + 30 * k, life: 2.6 + 2 * k, seed: Math.floor(Math.random() * 1e4) });
  };
  /* what comes up from a boat hurt at z feet, after the time it takes to rise: oil spreading into a slick and,
   * hurt badly, wreckage floating in it (k: 0 a weep of oil, 1 a bad hit, 2 the boat lost) */
  FX.oil = (x, y, z, k) => {
    const delay = PP.clamp(z / 45, 0.5, 9) + Math.random(), seed = () => Math.floor(Math.random() * 1e4);
    const r = [6, 16, 45][k], life = [40, 90, 240][k];
    FX.add({ k: "oil", x: x + rnd(-8, 8), y: y + rnd(-8, 8), r0: r * 0.2, r, life, grow: life * 0.35, seed: seed(), delay });
    const n = [0, 6, 26][k];
    if (n) FX.add({ k: "debris", x, y, n, r: r * 0.7, life: life * 0.8, seed: seed(), delay: delay + 1.5 });
    if (k === 2) FX.add({ k: "boil", x, y, r: 10, life: 9, seed: seed(), delay });
  };
  FX.smoke = (x, y, z, o = {}) => FX.add(Object.assign({ k: "smoke", x, y, z, r: 14, grow: 10, vz: 7, life: 10, dark: 0.75 }, o));
  FX.step = dt => {
    for (const p of FX.items) { p.t += dt; if (p.k === "smoke" && p.t > 0) { p.z += p.vz * dt; p.r += p.grow * dt; p.x += 3 * dt; } }
    FX.items = FX.items.filter(p => p.t < p.life);
  };
})();
