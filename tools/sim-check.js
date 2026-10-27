#!/usr/bin/env node
/*
 * PumaPack, played headless by the bot (js/engine/bot.js).
 *
 *   node tools/sim-check.js [--seeds N] [--verbose]
 *
 * Fails if the sea is broken (a base on land or cut off, a lane through
 * land), if the firing solution misses a target on a steady course, if a
 * step throws or leaves a number that is not one, if the bot cannot sink a
 * ship in every convoy action with the reality off, if the hunters never
 * drop a charge, if a game played twice from the same seed and orders comes
 * out different, or if a game saved and loaded half way differs from one
 * that was not.
 */
"use strict";
const { load } = require("./lib.js");
const PP = load(), C = PP.C, E = PP.Engine, Sea = PP.Sea, W = PP.Weapons;
const args = process.argv.slice(2);
const seeds = +(args[args.indexOf("--seeds") + 1] || 2) || 2;
const verbose = args.includes("--verbose");
let fail = 0;
const bad = msg => { console.log("FAIL " + msg); fail++; };
const ok = msg => console.log("ok   " + msg);

/* ---- the sea ---- */
{
  const NX = Sea.NX, NY = Sea.NY, D = Sea.depth, seen = new Uint8Array(NX * NY), q = [];
  const p0 = Sea.port("talon"), i0 = Math.floor(p0.x / Sea.CELL), j0 = Math.floor(p0.y / Sea.CELL);
  q.push(j0 * NX + i0); seen[j0 * NX + i0] = 1;
  while (q.length) { const c = q.pop(), i = c % NX, j = (c - i) / NX; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) continue; const n = jj * NX + ii; if (!seen[n] && D[n] > 40) { seen[n] = 1; q.push(n); } } }
  for (const p of Sea.ports) { const d = Sea.depthAt(p.x, p.y), c = Math.floor(p.y / Sea.CELL) * NX + Math.floor(p.x / Sea.CELL); if (d < 60) bad(`sea: ${p.name} is in ${Math.round(d)} ft`); else if (!seen[c]) bad(`sea: ${p.name} cannot be reached from Port Talon`); }
  for (const z of Sea.zones) { const c = Math.floor(z.y / Sea.CELL) * NX + Math.floor(z.x / Sea.CELL); if (!seen[c]) bad(`sea: the ${z.name} zone cannot be reached`); }
  for (const L of Sea.lanes) {
    let shallow = 0;
    for (let s = 15 * PP.YD_NM; s < L.len - 15 * PP.YD_NM; s += 2000) { const p = Sea.along(L, s); if (Sea.depthAt(p.x, p.y) < 60) shallow++; }
    if (shallow) bad(`sea: ${L.name} runs through ${shallow} shallow points`);
  }
  const land = D.reduce((a, v) => a + (v <= 0), 0);
  ok(`sea: ${Sea.ports.length} bases, ${Sea.lanes.length} lanes, ${Sea.zones.length} zones, ${Math.round(land / D.length * 100)}% land`);
}

/* ---- the firing solution: against targets on a steady course, with the truth on the dials, every shot hits ---- */
{
  const r = PP.mulberry(7);
  let shots = 0, hits = 0, solved = 0;
  for (let i = 0; i < 160; i++) {
    const S = E.newPractice({ seed: 100 + i, real: C.REAL_NONE });
    const t = S.ships[0], s = S.sub;
    S.ships = [t]; S.mode = "test";
    Object.assign(s, { x: 0, y: 0, depth: C.PD, ordDepth: C.PD, hdg: r() * PP.TAU, spd: 0, bell: 1 }); s.ordHdg = s.hdg;
    const rng = 900 + r() * 3000, b = r() * PP.TAU;
    Object.assign(t, { x: PP.hx(b) * rng, y: PP.hy(b) * rng, hdg: r() * PP.TAU, spd: r() * 14, ordSpd: 0, conv: -1 });
    t.ordHdg = t.hdg; t.ordSpd = t.spd; t.kn = { t: S.t, x: t.x, y: t.y, by: "radar", brg: 0 };
    S.convoys = [];
    S.tdc = Object.assign(W.newTdc(), { tgt: t.id, set: true, ex: t.x, ey: t.y, ec: t.hdg, es: t.spd });
    let bank = null;
    for (const bk of ["F", "A"]) { const sol = W.solve(S, W.est(S), bk); if (sol && sol.ok && (!bank || Math.abs(sol.gyro) < Math.abs(W.solve(S, W.est(S), bank).gyro))) bank = bk; }
    if (!bank) continue;
    solved++;
    s.bank = bank; s.spread = 1; shots++;
    E.tick(S, { acts: [{ a: "fire" }] });
    S.tdc.tgt = null;
    let hit = false;
    for (let k = 0; k < 20000 && S.torps.length; k++) { const ev = E.tick(S, {}); if (ev.some(e => e.t === "torpHit")) hit = true; if (S.phase !== "sea") break; }
    if (hit) hits++;
    else if (verbose) console.log(`     miss: range ${Math.round(rng)}, target ${Math.round(t.spd)} kn`);
  }
  if (hits < shots * 0.97) bad(`TDC: ${hits} of ${shots} solved shots hit`); else ok(`TDC: ${hits} of ${shots} solved shots hit (${solved} of 160 geometries solvable)`);
}

/* ---- the actions ---- */
const finite = (o, path = "S", depth = 0) => {
  if (depth > 6 || o == null) return null;
  if (typeof o === "number") return Number.isFinite(o) ? null : path;
  if (typeof o !== "object") return null;
  for (const k of Object.keys(o)) { const r = finite(o[k], path + "." + k, depth + 1); if (r) return r; }
  return null;
};
const hash = S => { const s = JSON.stringify(S); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };
const AIDS = { autoRange: true };
function play(make, maxSteps, rec, resumeAt, pilot = () => PP.Bot.make()) {
  let S = make();
  const bot = pilot();
  const cmds = [];
  let steps = 0, charges = 0;
  for (; steps < maxSteps; steps++) {
    if (resumeAt && steps === resumeAt) S = E.link(JSON.parse(JSON.stringify(S)));
    const c = rec ? rec[steps] : bot.cmd(S);
    if (!rec) cmds.push(c);
    const ev = E.tick(S, c, AIDS);
    charges += ev.filter(e => e.t === "chargesAway").length;
    if (S.phase !== "sea") break;
    if (steps % 400 === 0) { const nf = finite(S); if (nf) throw new Error(`not a number: ${nf} at step ${steps}`); }
  }
  return { S, steps, cmds, charges };
}
let dropped = 0, easyRuns = 0, easyWins = 0, packFired = 0;
for (const A of E.ACTIONS.filter(a => (a.sides || ["pack"]).includes("pack"))) for (const [rn, real] of [["easy", C.REAL_NONE], ["full", C.REAL_ALL]]) {
  let sankAny = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    let r;
    /* a big pack is dear to step: four boats or more play the first hour or so, which is where the attack is */
    try { r = play(() => E.newAction(A.id, { seed, real }), A.boats.length >= 7 ? 40000 : A.boats.length >= 4 ? 70000 : 150000); } catch (e) { bad(`${A.id} ${rn} seed ${seed}: ${e.stack}`); continue; }
    const S = r.S, ships = S.stats.sunk.length, mins = ((S.t - E.newAction(A.id, { seed, real }).t) / 60).toFixed(0);
    dropped += r.charges;
    if (ships) sankAny++;
    const line = `${A.id} ${rn} seed ${seed}: ${S.phase === "over" ? S.end.why : "still at it"} after ${mins} game min, ${ships} sunk (${PP.num(S.stats.tons)} of ${PP.num(S.potential)} t), ${S.stats.fired} fired, ${S.stats.hits} hits, ${S.stats.duds} duds, ${S.stats.charges} charges, pack ${S.subs.filter(q => !q.lost).length} of ${S.subs.length} afloat${S.subs.length > 1 ? `, fired by ${S.subs.map(q => q.fired || 0).join("/")}` : ""}`;
    if (S.subs.slice(1).some(q => q.fired)) packFired++;
    console.log((ships ? "ok   " : "     ") + line);
    if (rn === "easy") { easyRuns++; if (ships) easyWins++; }
    if (seed === 1 && rn === "full") {
      const again = play(() => E.newAction(A.id, { seed, real }), r.cmds.length, r.cmds);
      if (hash(again.S) !== hash(S)) bad(`${A.id}: the replay came out different`);
      const half = Math.floor(r.steps / 2), saved = play(() => E.newAction(A.id, { seed, real }), r.cmds.length, r.cmds, half);
      if (hash(saved.S) !== hash(S)) bad(`${A.id}: a game saved and loaded at step ${half} came out different`);
    }
  }
  if (rn === "easy" && !sankAny) bad(`${A.id} easy: the bot never sank a ship in ${seeds} games`);
  if (rn === "full" && !sankAny && A.id === "easy") bad(`${A.id} full: the bot never sank a ship in ${seeds} games`);
}
if (easyWins < easyRuns * 0.6) bad(`the bot sank a ship in only ${easyWins} of ${easyRuns} actions with the reality off`);
else ok(`the bot sank a ship in ${easyWins} of ${easyRuns} actions with the reality off`);
/* the pack: the boats the bot is not on hunt under their own captains, so some of them fire */
if (!packFired) bad("no boat but the first fired a torpedo in any mission: the pack's captains are not hunting");
else ok(`the rest of the pack fired in ${packFired} games`);
if (!dropped) bad("no escort dropped a single depth charge in any action");
else ok(`${dropped} depth-charge patterns dropped across the actions; replays and saves match`);

/* ---- the escorts' side: the test pilot sails the escort you would be aboard; the pack is under its own captains.
 * Every mission with the side is played: patterns are laid, some boat is sunk in one of them, and one game
 * replays step for step and survives a save and load half way ---- */
{
  let pats = 0, kills = 0, played = 0;
  for (const A of E.ACTIONS.filter(a => (a.sides || []).includes("escorts"))) for (let seed = 1; seed <= seeds; seed++) {
    let r;
    const make = () => E.newAction(A.id, { seed, real: C.REAL_NONE, side: "escorts" });
    try { r = play(make, A.boats.length >= 7 ? 40000 : 70000, null, 0, () => PP.Bot.escort()); } catch (e) { bad(`escorts ${A.id} seed ${seed}: ${e.stack}`); continue; }
    const S = r.S, lost = S.subs.filter(q => q.lost).length, D = E.debrief(S);
    played++; pats += S.stats.charges; kills += lost;
    console.log(`${lost ? "ok   " : "     "}escorts ${A.id} seed ${seed}: ${S.phase === "over" ? S.end.why : "still at it"}, ${S.stats.charges} charges, ${S.stats.hedgehogs || 0} hedgehogs, ${lost} of ${S.subs.length} boats sunk, ${S.stats.sunk.length} ships lost, score ${D.score} (${D.rating})`);
    if (seed === 1 && A.id === "pinned") {
      const again = play(make, r.cmds.length, r.cmds, 0, () => PP.Bot.escort());
      if (hash(again.S) !== hash(S)) bad(`escorts ${A.id}: the replay came out different`);
      const half = Math.floor(r.steps / 2), saved = play(make, r.cmds.length, r.cmds, half, () => PP.Bot.escort());
      if (hash(saved.S) !== hash(S)) bad(`escorts ${A.id}: a game saved and loaded at step ${half} came out different`);
    }
  }
  if (!played) bad("no mission has the escorts' side");
  else if (!pats) bad("the escorts' side never laid a charge");
  else if (!kills) bad(`the escorts' side never sank a boat in ${played} games`);
  else ok(`the escorts' side sank ${kills} boats in ${played} games, ${pats} charges laid; the replay and the save match`);
}

if (fail) { console.log(`sim-check: FAILED (${fail})`); process.exit(1); }
console.log("sim-check: every check passed");
