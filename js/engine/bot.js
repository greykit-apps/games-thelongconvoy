/* PumaPack -- a captain who sails the boat by himself, for
 * tools/sim-check.js and the title's backdrop.
 *
 * He is a test pilot, not the enemy's brain, and he cheats a little: he
 * picks the biggest ship by the truth, reads the angle on the bow off the
 * truth (with a bit of error) when the reality asks for it by eye, and on
 * patrol he knows roughly where the convoys are, as radio intelligence
 * would tell him. Everything else he does through the same orders a
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
      const out = left === 0 || (S.mode === "patrol" && (s.fuel < 0.35 || S.patrol.dueSaid));
      /* ---- the hunt is on: deep, quiet, across their line ---- */
      if (th.hunted || (m.st === "evade" && m.evadeT < 420)) {
        if (m.st !== "evade") { m.st = "evade"; m.evadeT = 0; }
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
      /* ---- out of torpedoes or fuel: home, or (in an action) away ---- */
      if (out) {
        m.st = "home";
        if (S.mode === "patrol") {
          const p = Sea.portsOpen(C.monthOf(S.t)).reduce((a, b) => PP.dist(s.x, s.y, a.x, a.y) < PP.dist(s.x, s.y, b.x, b.y) ? a : b);
          setDepth(S, th.near < 9000 ? C.PD : 0); setBell(S, PP.dist(s.x, s.y, p.x, p.y) < 12000 ? 2 : 4); helm(S, steerAround(s, p.x, p.y));
        } else {
          const t = pickTarget(S);
          setDepth(S, C.PD); setBell(S, 3);
          if (t) helm(S, PP.angTo(t.x, t.y, s.x, s.y));
        }
        return { acts: act.slice() };
      }
      let t = m.tgt !== null ? Sh.byId(S, m.tgt) : null;
      if (!t || !Sh.alive(t) || S.t - m.pickT > 900) { t = pickTarget(S); m.tgt = t ? t.id : null; m.pickT = S.t; }
      if (!t) {
        /* nothing in reach: on patrol, find a convoy (radio intelligence), else wait */
        if (S.mode === "patrol") {
          let best = null, bd = 1e12;
          for (const cv of S.convoys) { if (cv.arrived) continue; const d = PP.dist(s.x, s.y, cv.x, cv.y); if (d < bd && d < 250 * PP.YD_NM) { bd = d; best = cv; } }
          const z = Sea.zones.find(q => q.id === S.patrol.zone);
          const [gx, gy] = best ? [best.x + PP.hx(best.base) * 30000, best.y + PP.hy(best.base) * 30000] : [z.x, z.y];
          const dive = Det.light(S) > 0.5 && PP.Escort.airCover(S) > 0.8 && s.bat > 0.6;
          setDepth(S, dive ? C.PD : 0); setBell(S, dive ? 3 : 4); helm(S, steerAround(s, gx, gy));
        } else { setDepth(S, C.PD); setBell(S, 2); }
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
})();
