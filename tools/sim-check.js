#!/usr/bin/env node
/*
 * The Long Convoy, played headless by the bot (js/engine/bot.js).
 *
 *   node tools/sim-check.js [--seeds N] [--jobs N] [--verbose]
 *
 * Fails if the sea is broken (a base on land or cut off, a lane through
 * land), if the firing solution misses a target on a steady course, if a
 * step throws or leaves a number that is not one, if the bot cannot sink a
 * ship in every convoy action with the reality off, if the hunters never
 * drop a charge, if a game played twice from the same seed and orders comes
 * out different, or if a game saved and loaded half way differs from one
 * that was not.
 *
 * The games are played on a pool of worker threads, one per core unless
 * --jobs says otherwise (--jobs 1 plays them one at a time). Each worker loads
 * its own engine, so a game shares nothing with the ones before it; the
 * output is printed in the same order whichever game finishes first, and
 * the verdicts are drawn from it in that order.
 */
"use strict";
const { Worker, isMainThread, parentPort } = require("worker_threads");
const os = require("os");
const { load } = require("./lib.js");

/* ---- one game, or one check, on a worker: what it says comes back as [kind, text] lines ---- */
if (!isMainThread) {
  const PP = load(), C = PP.C, E = PP.Engine, W = PP.Weapons;
  const finite = (o, path = "S", depth = 0) => {
    if (depth > 6 || o == null) return null;
    if (typeof o === "number") return Number.isFinite(o) ? null : path;
    if (typeof o !== "object") return null;
    for (const k of Object.keys(o)) { const r = finite(o[k], path + "." + k, depth + 1); if (r) return r; }
    return null;
  };
  const hash = S => { const s = JSON.stringify(S); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };
  const AIDS = { autoRange: true };
  const PILOTS = { pack: () => PP.Bot.make(), escort: () => PP.Bot.escort() };
  function play(make, maxSteps, rec, resumeAt, pilot = PILOTS.pack) {
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
  const real = rn => rn === "full" ? C.REAL_ALL : C.REAL_NONE;

  /* the firing solution: against targets on a steady course, with the truth on the dials, every shot hits */
  function tdc(verbose) {
    const log = [];
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
      else if (verbose) log.push(["say", `     miss: range ${Math.round(rng)}, target ${Math.round(t.spd)} kn`]);
    }
    if (hits < shots * 0.97) log.push(["bad", `TDC: ${hits} of ${shots} solved shots hit`]); else log.push(["ok", `TDC: ${hits} of ${shots} solved shots hit (${solved} of 160 geometries solvable)`]);
    return { log };
  }

  /* a convoy action, the bot aboard the first boat */
  function pack({ id, rn, seed, keep }) {
    const A = E.ACTIONS.find(a => a.id === id);
    let r;
    /* a big pack is dear to step: four boats or more play the first hour or so, which is where the attack is */
    try { r = play(() => E.newAction(A.id, { seed, real: real(rn) }), A.boats.length >= 7 ? 40000 : A.boats.length >= 4 ? 70000 : 150000); } catch (e) { return { log: [["bad", `${A.id} ${rn} seed ${seed}: ${e.stack}`]], failed: true }; }
    const S = r.S, ships = S.stats.sunk.length, mins = ((S.t - E.newAction(A.id, { seed, real: real(rn) }).t) / 60).toFixed(0);
    const line = `${A.id} ${rn} seed ${seed}: ${S.phase === "over" ? S.end.why : "still at it"} after ${mins} game min, ${ships} sunk (${PP.num(S.stats.tons)} of ${PP.num(S.potential)} t), ${S.stats.fired} fired, ${S.stats.hits} hits, ${S.stats.duds} duds, ${S.stats.charges} charges, pack ${S.subs.filter(q => !q.lost).length} of ${S.subs.length} afloat${S.subs.length > 1 ? `, fired by ${S.subs.map(q => q.fired || 0).join("/")}` : ""}`;
    return { log: [["say", (ships ? "ok   " : "     ") + line]], ships, charges: r.charges, packFired: S.subs.slice(1).some(q => q.fired), steps: r.steps, hash: hash(S), cmds: keep ? r.cmds : null };
  }

  /* the escorts' side, the test pilot aboard the escort you would be in */
  function escorts({ id, seed, keep }) {
    const A = E.ACTIONS.find(a => a.id === id);
    let r;
    const make = () => E.newAction(A.id, { seed, real: C.REAL_NONE, side: "escorts" });
    try { r = play(make, A.boats.length >= 7 ? 40000 : 70000, null, 0, PILOTS.escort); } catch (e) { return { log: [["bad", `escorts ${A.id} seed ${seed}: ${e.stack}`]], failed: true }; }
    const S = r.S, lost = S.subs.filter(q => q.lost).length, D = E.debrief(S);
    return { log: [["say", `${lost ? "ok   " : "     "}escorts ${A.id} seed ${seed}: ${S.phase === "over" ? S.end.why : "still at it"}, ${S.stats.charges} charges, ${S.stats.hedgehogs || 0} hedgehogs, ${lost} of ${S.subs.length} boats sunk, ${S.stats.sunk.length} ships lost, score ${D.score} (${D.rating})`]],
      pats: S.stats.charges, lost, steps: r.steps, hash: hash(S), cmds: keep ? r.cmds : null };
  }

  /* the same game again from its recorded orders, straight through or saved and loaded at step `at` */
  function replay({ side, id, rn, seed, cmds, at }) {
    const make = side === "escorts" ? () => E.newAction(id, { seed, real: C.REAL_NONE, side: "escorts" }) : () => E.newAction(id, { seed, real: real(rn) });
    return { hash: hash(play(make, cmds.length, cmds, at, side === "escorts" ? PILOTS.escort : PILOTS.pack).S) };
  }

  const JOBS = { tdc: j => tdc(j.verbose), pack, escorts, replay };
  parentPort.on("message", ({ n, job }) => {
    let res;
    try { res = JOBS[job.k](job); } catch (e) { res = { error: e.stack }; }
    parentPort.postMessage({ n, res });
  });
  parentPort.postMessage({ ready: true });
  return;
}

/* ---- the pool: started first, so the workers build their seas while this thread builds its own. A worker takes
 * its first job once its sea is built, by when every job is queued, so the queue's order holds from the start ---- */
const args = process.argv.slice(2);
const opt = (name, dflt) => +(args.includes(name) && args[args.indexOf(name) + 1]) || dflt;
const seeds = opt("--seeds", 2);
const jobs = opt("--jobs", (os.availableParallelism || (() => os.cpus().length))());
const verbose = args.includes("--verbose");
const pool = (() => {
  const queue = [], waiting = new Map(), idle = [];
  let n = 0;
  const next = w => { const t = queue.shift(); if (!t) { idle.push(w); return; } waiting.set(t.n, t); w.postMessage({ n: t.n, job: t.job }); };
  const workers = Array.from({ length: Math.max(1, jobs) }, () => {
    const w = new Worker(__filename);
    w.on("message", ({ ready, n, res }) => {
      if (ready) return next(w);
      const t = waiting.get(n); waiting.delete(n); next(w);
      if (res.error) t.no(new Error(res.error)); else t.yes(res);
    });
    w.on("error", e => { console.log(`FAIL a worker died: ${e.stack}`); process.exit(1); });
    return w;
  });
  return {
    /* first: ahead of what is queued, for the games whose replays wait on them and for the replays themselves */
    run(job, first) {
      return new Promise((yes, no) => {
        const t = { n: n++, job, yes, no };
        if (first) queue.unshift(t); else queue.push(t);
        if (idle.length) next(idle.pop());
      });
    },
    close: () => workers.forEach(w => w.terminate()),
  };
})();

const PP = load(), C = PP.C, E = PP.Engine, Sea = PP.Sea;
let fail = 0;
const bad = msg => { console.log("FAIL " + msg); fail++; };
const ok = msg => console.log("ok   " + msg);
const say = log => { for (const [k, text] of log) (k === "bad" ? bad : k === "ok" ? ok : console.log)(text); };

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

/* ---- everything else is queued at once and printed in this order, each part as soon as it and those before it are done.
 * A part is a promise of [kind, text] lines and of the numbers the verdicts at the end are drawn from ---- */
const parts = [];
/* a part that fails is reported when its turn to print comes, not as an unhandled rejection the moment it fails */
const show = x => { const p = Promise.resolve(x); p.catch(() => {}); parts.push(p); };
const replays = (side, id, rn, seed, label) => game => game.failed ? { log: [] } : Promise.all([
  pool.run({ k: "replay", side, id, rn, seed, cmds: game.cmds, at: 0 }, true),
  pool.run({ k: "replay", side, id, rn, seed, cmds: game.cmds, at: Math.floor(game.steps / 2) }, true),
]).then(([again, saved]) => ({ log: [
  ...(again.hash !== game.hash ? [["bad", `${label}: the replay came out different`]] : []),
  ...(saved.hash !== game.hash ? [["bad", `${label}: a game saved and loaded at step ${Math.floor(game.steps / 2)} came out different`]] : []),
] }));

show(pool.run({ k: "tdc", verbose }));

/* ---- the actions ---- */
const tally = { dropped: 0, easyRuns: 0, easyWins: 0, packFired: 0 };
for (const A of E.ACTIONS.filter(a => (a.sides || ["pack"]).includes("pack"))) for (const rn of ["easy", "full"]) {
  const games = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const keep = seed === 1 && rn === "full";
    const game = pool.run({ k: "pack", id: A.id, rn, seed, keep }, keep).then(g => {
      if (!g.failed) {
        tally.dropped += g.charges;
        if (g.packFired) tally.packFired++;
        if (rn === "easy") { tally.easyRuns++; if (g.ships) tally.easyWins++; }
      }
      return g;
    });
    games.push(game);
    show(game);
    if (keep) show(game.then(replays("pack", A.id, rn, seed, A.id)));
  }
  show(Promise.all(games).then(gs => {
    const sankAny = gs.filter(g => g.ships).length;
    if (rn === "easy" && !sankAny) return { log: [["bad", `${A.id} easy: the bot never sank a ship in ${seeds} games`]] };
    if (rn === "full" && !sankAny && A.id === "easy") return { log: [["bad", `${A.id} full: the bot never sank a ship in ${seeds} games`]] };
    return { log: [] };
  }));
}
/* the totals wait on every game above, so they are drawn after all of them have been counted */
const packTotals = Promise.all(parts).then(() => {
  const { dropped, easyRuns, easyWins, packFired } = tally, log = [];
  if (easyWins < easyRuns * 0.6) log.push(["bad", `the bot sank a ship in only ${easyWins} of ${easyRuns} actions with the reality off`]);
  else log.push(["ok", `the bot sank a ship in ${easyWins} of ${easyRuns} actions with the reality off`]);
  /* the pack: the boats the bot is not on hunt under their own captains, so some of them fire */
  if (!packFired) log.push(["bad", "no boat but the first fired a torpedo in any mission: the pack's captains are not hunting"]);
  else log.push(["ok", `the rest of the pack fired in ${packFired} games`]);
  if (!dropped) log.push(["bad", "no escort dropped a single depth charge in any action"]);
  else log.push(["ok", `${dropped} depth-charge patterns dropped across the actions; replays and saves match`]);
  return { log };
});
show(packTotals);

/* ---- the escorts' side: the test pilot sails the escort you would be aboard; the pack is under its own captains.
 * Every mission with the side is played: patterns are laid, some boat is sunk in one of them, and one game
 * replays step for step and survives a save and load half way ---- */
{
  const games = [];
  for (const A of E.ACTIONS.filter(a => (a.sides || []).includes("escorts"))) for (let seed = 1; seed <= seeds; seed++) {
    const keep = seed === 1 && A.id === "pinned";
    const game = pool.run({ k: "escorts", id: A.id, seed, keep }, keep);
    games.push(game);
    show(game);
    if (keep) show(game.then(replays("escorts", A.id, null, seed, `escorts ${A.id}`)));
  }
  show(Promise.all(games).then(gs => {
    const done = gs.filter(g => !g.failed), played = done.length, pats = done.reduce((a, g) => a + g.pats, 0), kills = done.reduce((a, g) => a + g.lost, 0);
    if (!played) return { log: [["bad", "no mission has the escorts' side"]] };
    if (!pats) return { log: [["bad", "the escorts' side never laid a charge"]] };
    if (!kills) return { log: [["bad", `the escorts' side never sank a boat in ${played} games`]] };
    return { log: [["ok", `the escorts' side sank ${kills} boats in ${played} games, ${pats} charges laid; the replay and the save match`]] };
  }));
}

(async () => {
  for (const p of parts) try { say((await p).log); } catch (e) { bad(e.message); }
  pool.close();
  if (fail) { console.log(`sim-check: FAILED (${fail})`); process.exitCode = 1; return; }
  console.log("sim-check: every check passed");
})();
