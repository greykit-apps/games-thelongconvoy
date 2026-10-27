/* PumaPack -- a captain who sails the boat by himself: every boat of the
 * pack you are not aboard under the order Attack (PP.Orders), the title's
 * plot, and tools/sim-check.js.
 *
 * He cheats a little: he picks the biggest ship by the truth, and reads
 * the angle on the bow off the truth (with a bit of error) when the reality
 * asks for it by eye. Everything else he does through the same orders a
 * player gives: helm, telegraph, depth, periscope, lock, fire.
 *
 * His way: get ahead of the convoy (on the surface, out of sight, if he is
 * behind), dive, lie off its track with his bow toward it and let it come;
 * fire a spread of three at the biggest ship; go deep and quiet until the
 * hunt is over; and do it again. */
"use strict";
(() => {
  const C = PP.C, Sub = PP.Sub, Sh = PP.Ships, W = PP.Weapons, Det = PP.Detect, Sea = PP.Sea, E = PP.Engine;
  const Bot = PP.Bot = {};

  /* mem: a plain object to keep his state in (a boat of the pack keeps hers on the boat, and saves it) */
  Bot.make = ({ skill = 1 } = {}, mem = {}) => {
    const m = Object.assign(mem, Object.assign({ st: "approach", evadeT: 0, rangeT: -1e9, tgt: null, fireT: -1e9, pickT: -1e9 }, mem));
    const act = [];
    const A = o => act.push(o);
    const setDepth = (S, d) => { if (Math.abs(S.sub.ordDepth - d) > 1) A({ a: "setDepth", v: d }); };
    const setBell = (S, b) => { if (S.sub.bell !== b) A({ a: "setBell", v: b }); };
    const helm = (S, h) => { if (Math.abs(PP.angDiff(S.sub.ordHdg, h)) > 0.01) A({ a: "hdg", v: PP.normAng(h) }); };
    const quiet = (S, on) => { if (S.sub.silent !== on) A({ a: "silent" }); };
    function pickTarget(S) {
      let best = null, bv = -1;
      for (const sh of S.ships) {
        if (!Sh.alive(sh) || sh.role !== (S.goal || "merchant")) continue;
        const cvq = Sh.convoy(S, sh.conv); if (cvq && cvq.arrived) continue;
        const v = C.SHIPS[sh.cls].tons / (1 + PP.dist(S.sub.x, S.sub.y, sh.x, sh.y) / 6000);
        if (v > bv) { bv = v; best = sh; }
      }
      return best;
    }
    /* the escorts: the nearest, and whether one is after us now */
    function threat(S) {
      const s = S.sub; let near = 1e9, hunted = false;
      for (const sh of S.ships) {
        if (sh.role !== "escort" || !Sh.alive(sh)) continue;
        const d = PP.dist(s.x, s.y, sh.x, sh.y), st = sh.ai.st;
        near = Math.min(near, d);
        if ((st === "attack" || st === "drop" || st === "guns") && d < 4000) hunted = true;
        if ((st === "search" || st === "hold" || st === "open") && d < 1800) hunted = true;
      }
      if (S.charges.some(c => PP.dist(c.x, c.y, s.x, s.y) < 700)) hunted = true;
      return { near, hunted };
    }
    /* around an island: a few degrees at a time until the way is clear */
    function steerAround(s, x, y) {
      const h0 = PP.angTo(s.x, s.y, x, y), look = Math.min(PP.dist(s.x, s.y, x, y), 30000);
      for (let k = 0; k < 18; k++) for (const sg of [1, -1]) {
        const h = PP.normAng(h0 + sg * k * 0.17);
        if (Sea.clearLine(s.x, s.y, s.x + PP.hx(h) * look, s.y + PP.hy(h) * look, 40)) return h;
      }
      return h0;
    }
    m.cmd = S => {
      act.length = 0;
      const s = S.sub, dt = E.dt(S);
      A({ a: "tc", v: C.TC_MAX_IDX });
      const th = threat(S), left = Sub.torpsLeft(s), test = Sub.testDepth(s), bot = Sea.depthAt(s.x, s.y);
      const out = left === 0;
      /* ---- the hunt is on: deep, quiet, across their line ---- */
      if (th.hunted || (m.st === "evade" && m.evadeT < 420)) {
        /* hunted afresh: a noisemaker over the side as she goes deep */
        if (m.st !== "evade") { m.st = "evade"; m.evadeT = 0; if (th.hunted && s.decoys > 0 && !Sub.surfaced(s)) A({ a: "decoy" }); }
        if (th.hunted) m.evadeT = Math.min(m.evadeT, 120);
        m.evadeT += dt;
        if (Sub.surfaced(s) && s.ordDepth === 0) A({ a: "crash" });
        else setDepth(S, Math.max(C.PD, Math.min(test - 30, Math.floor((bot - 40) / 5) * 5)));
        quiet(S, true); setBell(S, 2);
        if (s.scope.up) A({ a: "scope", v: false });
        let h = null, bd = 1e9;
        for (const sh of S.ships) if (sh.role === "escort" && Sh.alive(sh)) { const d = PP.dist(s.x, s.y, sh.x, sh.y); if (d < bd) { bd = d; h = sh; } }
        if (h) helm(S, PP.angTo(h.x, h.y, s.x, s.y) + (h.id % 2 ? 0.8 : -0.8));
        return { acts: act.slice() };
      }
      if (m.st === "evade") m.st = "approach";
      quiet(S, false);
      /* ---- out of torpedoes: away from the convoy ---- */
      if (out) {
        m.st = "home";
        const t = pickTarget(S);
        setDepth(S, C.PD); setBell(S, 3);
        if (t) helm(S, PP.angTo(t.x, t.y, s.x, s.y));
        return { acts: act.slice() };
      }
      let t = m.tgt !== null ? Sh.byId(S, m.tgt) : null;
      if (!t || !Sh.alive(t) || S.t - m.pickT > 900) { t = pickTarget(S); m.tgt = t ? t.id : null; m.pickT = S.t; }
      if (!t) {
        /* nothing in reach: wait at periscope depth */
        setDepth(S, C.PD); setBell(S, 2);
        return { acts: act.slice() };
      }
      const cv = Sh.convoy(S, t.conv), base = cv ? PP.normAng(cv.base) : t.hdg;
      const d = PP.dist(s.x, s.y, t.x, t.y), night = Det.light(S) < 0.3;
      if (t.role === "escort") {
        /* a warship has no track to lie off: at periscope depth, bow on, slow, and let the TDC find the shot */
        m.st = "stalk";
        setDepth(S, C.PD);
        if (s.depth <= C.PD + 4 && !s.scope.up && s.sys.scope < 0.5) A({ a: "scope", v: true });
        helm(S, PP.angTo(s.x, s.y, t.x, t.y)); setBell(S, d > 3500 ? 3 : 2);
      } else {
      /* ---- where we are against the target's track ---- */
      const fx = PP.hx(base), fy = PP.hy(base), rx = Math.cos(base), ry = Math.sin(base);
      const dx = s.x - t.x, dy = s.y - t.y, along = dx * fx + dy * fy, lat = dx * rx + dy * ry, side = lat >= 0 ? 1 : -1;
      const safeR = Math.max(night ? 5500 : 12500 * S.wx.vis, C.era(C.monthOf(S.t)).escortRadar ? 9500 : 0);
      if (along < 2500 && d > 3800) {
        /* behind or abeam: an end-around, on the surface while out of their sight */
        m.st = "endaround";
        const off = night ? 6000 : 15000 * S.wx.vis + 2000, gx = t.x + fx * 18000 + rx * side * off, gy = t.y + fy * 18000 + ry * side * off;
        /* on the surface while no escort is near enough to see her; once up, she stays up until one is */
        const up = Sub.surfaced(s) && s.ordDepth === 0 ? th.near > safeR * 0.8 : th.near > safeR && (d > (night ? 3000 : 6500) || th.near > 5e8);
        if (up && s.fuel > 0.05) { setDepth(S, 0); setBell(S, 6); }
        else { setDepth(S, C.PD); setBell(S, s.bat > 0.35 ? 5 : 2); }
        helm(S, PP.angTo(s.x, s.y, gx, gy));
      } else {
        /* ahead: dive, lie off the track, bow toward it, and let it come */
        m.st = "lurk";
        setDepth(S, C.PD);
        /* the periscope up only for a look now and then while an escort is close, and for the attack */
        const look = th.near > 3000 || d < 3600 || (S.t % 80) < 18;
        if (s.depth <= C.PD + 4 && s.scope.up !== look && s.sys.scope < 0.5) A({ a: "scope", v: look });
        const slow = th.near < 7000 ? 3 : 4;
        const want = PP.clamp(Math.abs(lat), 0, 1e9);
        const toTrack = PP.normAng(base + (side > 0 ? -Math.PI / 2 : Math.PI / 2));
        if (want > 2000) { helm(S, PP.normAng(toTrack + (along > 4000 ? 0 : -side * 0.5))); setBell(S, along > 5000 ? slow : 3); }
        else if (want < 700 && along > 1500) { helm(S, PP.normAng(toTrack + Math.PI)); setBell(S, 3); }
        else { helm(S, d < 3500 ? PP.angTo(s.x, s.y, t.x, t.y) : toTrack); setBell(S, 1); }
      }
      }
      /* ---- the TDC ---- */
      if (Det.known(S, t) && S.tdc.tgt !== t.id) A({ a: "lock", id: t.id });
      if (S.tdc.tgt === t.id && S.real.aob) {
        const e = W.est(S);
        if (e) {
          const err = (PP.rand({ rs: Math.floor(S.t) | 0 }) - 0.5) * 0.12 / skill;
          const want = PP.angDiff(t.hdg, PP.normAng(e.brg + Math.PI)) + err;
          if (Math.abs(want - e.aob) > 0.02) A({ a: "dial", what: "aob", d: want - e.aob });
          if (Math.abs(t.spd - e.s) > 0.6) A({ a: "dial", what: "spd", d: Math.round((t.spd - e.s) * 2) / 2 });
        }
        if (S.t - m.rangeT > 30 && Det.known(S, t) && t.kn.by === "eye") { A({ a: "stadimeter" }); m.rangeT = S.t; }
      }
      /* fire: a good solution, the range short, the estimate close to the truth */
      if (S.tdc.tgt === t.id && d < 4600 && S.t - m.fireT > 40) {
        const e = W.est(S), errPos = e ? PP.dist(e.x, e.y, t.x, t.y) : 1e9;
        let bank = null, best = 9;
        for (const b of ["F", "A"]) { if (W.canFire(S, b)) continue; const sol = W.solve(S, e, b); if (sol && sol.ok && Math.abs(sol.gyro) < best) { best = Math.abs(sol.gyro); bank = b; } }
        /* against a zig-zag, only early in a leg: the shot must arrive before the next turn */
        let legLeft = 1e9;
        if (S.real.zig && cv) { const plan = C.CONVOY.zig[cv.zig.plan]; legLeft = (plan[cv.zig.leg % plan.length][1] - cv.zig.legT) / (cv.alert ? 1.5 : 1); }
        const sol = bank && W.solve(S, e, bank);
        if (bank && errPos < 150 + d * 0.05 && best < 1.3 && sol && sol.run < 4000 && sol.time + 15 < legLeft) {
          if (s.bank !== bank) A({ a: "bank", v: bank });
          if (s.spread !== 3) A({ a: "spread", v: 3 });
          const n = Math.min(3, Sub.loaded(s, bank));
          for (let i = 0; i < n; i++) A({ a: "fire" });
          m.fireT = S.t;
        }
      }
      return { acts: act.slice() };
    };
    return m;
  };

  /* ---- the escorts' side's test pilot: he sails the escort you would be aboard ----
   * Through the same orders a player gives: to the freshest contact any escort has, sonar on, slowing to
   * listen when he is close; over it, a pattern set to the depth the contact gave; the hedgehog when he
   * has one and the contact is ahead; the guns on a boat up in sight. With nothing to hunt, back to the
   * convoy's bow. */
  Bot.escort = () => {
    const m = { patT: -1e9, hhT: -1e9 }, act = [], A = o => act.push(o);
    m.cmd = S => {
      act.length = 0;
      A({ a: "tc", v: C.TC_MAX_IDX });
      const f = PP.Escort.flag(S); if (!f) return { acts: act.slice() };
      const all = PP.Escort.mine(S), best = all.filter(q => q.ai.datum && q.ai.contact).sort((a, b) => b.ai.contact - a.ai.contact)[0];
      const k = C.SHIPS[f.cls], bell = v => { if (f.bell !== v) A({ a: "setBell", v }); }, helm = h => { if (Math.abs(PP.angDiff(f.ordHdg, h)) > 0.02) A({ a: "hdg", v: h }); };
      if (!f.ping) A({ a: "ping", v: true });
      if (best && S.t - best.ai.contact > 45 && S.t - best.ai.contact < 900) {
        /* an old contact: to it at a listening speed, then round it, slow, pinging */
        const d = best.ai.datum, r = PP.dist(f.x, f.y, d.x, d.y);
        if (r > 1200) { helm(PP.angTo(f.x, f.y, d.x, d.y)); bell(r > 5000 ? 5 : 3); }
        else { helm(PP.normAng(PP.angTo(f.x, f.y, d.x, d.y) + Math.PI * 0.45)); bell(2); }
      } else if (best && S.t - best.ai.contact <= 45) {
        const d = best.ai.datum, age = S.t - d.t, x = d.x + (d.vx || 0) * age, y = d.y + (d.vy || 0) * age, r = PP.dist(f.x, f.y, x, y);
        helm(PP.angTo(f.x, f.y, x, y)); bell(r > 3000 ? 5 : r > 900 ? 3 : 4);
        const want = Math.round(PP.clamp(best.ai.dz || 150, 50, 600) / 25) * 25;
        if (Math.abs((f.dcSet || 150) - want) >= 25) A({ a: "dcSet", d: want - (f.dcSet || 150) });
        if (r < 70 && !f.pat && S.t - m.patT > 50 && f.dcLeft > 1) { A({ a: "pattern" }); m.patT = S.t; }
        if (f.hhLeft > 0 && r > 180 && r < 320 && Math.abs(PP.angDiff(f.hdg, PP.angTo(f.x, f.y, x, y))) < 0.2 && S.t - m.hhT > 40) { A({ a: "hedgehog" }); m.hhT = S.t; }
      } else {
        const cv = S.convoys[0];
        if (cv) { const x = cv.x + PP.hx(cv.base) * 3000, y = cv.y + PP.hy(cv.base) * 3000; helm(PP.angTo(f.x, f.y, x, y)); bell(PP.dist(f.x, f.y, x, y) > 1500 ? 4 : 2); }
      }
      if (PP.Engine.afloat(S).some(b => PP.Sub.surfaced(b) && b.seenT !== undefined && S.t - b.seenT < 10 && PP.dist(f.x, f.y, b.x, b.y) < C.ESC.gunRange)) A({ a: "egun" });
      return { acts: act.slice() };
    };
    return m;
  };
})();
