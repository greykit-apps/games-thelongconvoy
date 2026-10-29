/* The Long Convoy -- the namespace and the small helpers everything shares.
 *
 * DOM-free: tools/sim-check.js loads this file, and the engine, under node.
 * Nothing here may read the clock or Math.random: the engine's dice are
 * PP.rand(S), so a patrol is the same patrol every time it is sailed from
 * the same seed and the same orders.
 *
 * The sea is one plane in yards: x east, y south (down the chart), headings
 * in radians from north, growing clockwise. Depths are feet, speeds knots,
 * time game seconds. */
"use strict";
var PP = globalThis.PP || {};
globalThis.PP = PP;

/* mulberry32, stepping the state it is handed: S.rs in a game */
PP.rand = o => {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* a private stream, for the map and the art's noise */
PP.mulberry = seed => { const o = { rs: seed | 0 }; return () => PP.rand(o); };
PP.ri = (r, n) => Math.floor(r() * n);
PP.pick = (r, a) => a[Math.floor(r() * a.length)];
/* a normal-ish number, mean 0, about 1 wide: three dice summed */
PP.gauss = r => (r() + r() + r() - 1.5) * 2;

PP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
PP.lerp = (a, b, t) => a + (b - a) * t;

/* ---- units ---- */
PP.YD_NM = 2025.37;                 /* yards in a nautical mile */
PP.KN = PP.YD_NM / 3600;            /* yards a second at one knot */
PP.DEG = Math.PI / 180;

/* ---- headings: 0 is north, up the chart, growing clockwise ---- */
PP.TAU = Math.PI * 2;
PP.hx = a => Math.sin(a);
PP.hy = a => -Math.cos(a);
PP.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
PP.angTo = (ax, ay, bx, by) => PP.normAng(Math.atan2(bx - ax, -(by - ay)));
PP.angDiff = (a, b) => { let d = (b - a) % PP.TAU; if (d > Math.PI) d -= PP.TAU; else if (d < -Math.PI) d += PP.TAU; return d; };
PP.normAng = a => ((a % PP.TAU) + PP.TAU) % PP.TAU;
PP.turnToward = (a, b, rate) => { const d = PP.angDiff(a, b); return PP.normAng(a + PP.clamp(d, -rate, rate)); };
/* a heading as one of n frames */
PP.frame = (a, n = 32) => ((Math.round(PP.normAng(a) / PP.TAU * n) % n) + n) % n;
/* a heading or bearing in whole degrees, 000 to 359 */
PP.deg3 = a => String(Math.round(PP.normAng(a) / PP.DEG) % 360).padStart(3, "0");

PP.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
PP.num = n => Number(Math.round(n)).toLocaleString("en-US");

/* localStorage, tolerant of a private window or none at all */
PP.store = {
  get(k, d = null) { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { globalThis.localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};
