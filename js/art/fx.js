/* PumaPack -- what happens for a moment: the column of water a torpedo
 * throws up, the flash, smoke from a burning ship, the white boil where a
 * depth charge went off, a shell's splash.
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
  FX.add = p => { if (FX.items.length > 400) FX.items.shift(); p.t = 0; FX.items.push(p); return p; };
  /* a torpedo hit: a tall column, a flash, then smoke */
  FX.hit = (x, y, big = 1) => {
    FX.add({ k: "column", x, y, h: 140 * big, w: 40 * big, life: 3.2 });
    FX.add({ k: "flash", x, y, h: 30, r: 60 * big, life: 0.35 });
    for (let i = 0; i < 6 * big; i++) FX.add({ k: "smoke", x: x + rnd(-30, 30), y: y + rnd(-30, 30), z: rnd(10, 60), r: rnd(20, 40), grow: rnd(10, 22), vz: rnd(8, 16), life: rnd(8, 16), dark: 0.8 });
  };
  FX.shell = (x, y, hit) => {
    if (hit) { FX.add({ k: "flash", x, y, h: 20, r: 25, life: 0.2 }); FX.add({ k: "smoke", x, y, z: 20, r: 12, grow: 8, vz: 6, life: 6, dark: 0.7 }); }
    else FX.add({ k: "column", x, y, h: 45, w: 10, life: 1.8 });
  };
  FX.charge = (x, y, z) => {
    const near = z < 120;
    FX.add({ k: "boil", x, y, r: near ? 45 : 28, life: 6 });
    if (near) FX.add({ k: "column", x, y, h: 90 - z * 0.5, w: 30, life: 2.4 });
  };
  FX.smoke = (x, y, z, o = {}) => FX.add(Object.assign({ k: "smoke", x, y, z, r: 14, grow: 10, vz: 7, life: 10, dark: 0.75 }, o));
  FX.step = dt => {
    for (const p of FX.items) { p.t += dt; if (p.k === "smoke") { p.z += p.vz * dt; p.r += p.grow * dt; p.x += 3 * dt; } }
    FX.items = FX.items.filter(p => p.t < p.life);
  };
})();
