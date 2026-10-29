/* PumaPack -- torpedoes, the torpedo data computer, and the deck gun.
 *
 * The TDC holds an estimate of the target: where it is, its course and its
 * speed, run on by dead reckoning between looks. Each look through the
 * periscope (or from the bridge) puts the bearing right; a radar range, or a
 * stadimeter reading, puts the range right. Course and speed are the hard
 * part: in Classic you judge the angle on the bow by eye and set it, and the
 * speed with it; the Field aid works them out from watching. From the
 * estimate the TDC solves the shot: the gyro angle that sends a torpedo to
 * meet the target, allowing for its turn out of the tube.
 *
 * A torpedo leaves the tube along the boat's axis, turns onto its gyro
 * course, arms after 450 yards, and runs until it hits or its fuel is gone.
 * Early in the war the year's torpedoes ran deep (under a shallow escort),
 * went off early, or hit and did nothing; the reality setting keeps that. */
"use strict";
(() => {
  const C = PP.C, Sub = PP.Sub, Sh = PP.Ships, Det = PP.Detect, W = PP.Weapons = {};
  const R = S => PP.rand(S);

  /* ---- the TDC ---- */
  W.newTdc = () => ({ tgt: null, ex: 0, ey: 0, ec: 0, es: 0, rngT: -1, set: false, salvo: 0, salvoT: -1e9 });
  W.lock = (S, id, ev) => {
    const t = Sh.byId(S, id), s = S.sub;
    if (!t) return;
    const T = S.tdc, b = PP.angTo(s.x, s.y, t.kn.x, t.kn.y), rng = PP.dist(s.x, s.y, t.kn.x, t.kn.y);
    T.tgt = id; T.set = true;
    /* the first guess: range as it was seen, course across the line of sight, ten knots */
    const k = C.SHIPS[t.cls], guess = t.kn.by === "radar" ? 1 : 1 + PP.gauss(() => R(S)) * 0.15;
    T.ex = s.x + PP.hx(b) * rng * guess; T.ey = s.y + PP.hy(b) * rng * guess;
    T.ec = S.real.aob ? PP.normAng(b + Math.PI / 2) : t.hdg; T.es = S.real.aob ? 10 : t.spd * 0.8; T.rngT = S.t;
    T.cls = t.cls; T.k = k;
    ev.push({ t: "locked", id, name: t.name });
  };
  W.unlock = S => { S.tdc.tgt = null; S.tdc.set = false; };
  /* what the TDC thinks now */
  W.est = S => {
    const T = S.tdc, s = S.sub;
    if (!T.set) return null;
    const brg = PP.angTo(s.x, s.y, T.ex, T.ey), rng = PP.dist(s.x, s.y, T.ex, T.ey);
    const aob = PP.angDiff(T.ec, PP.normAng(brg + Math.PI));   /* + : we are on its starboard side */
    return { x: T.ex, y: T.ey, c: T.ec, s: T.es, brg, rng, aob };
  };
  /* the player's hand on the dials */
  W.dial = (S, a, ev) => {
    const T = S.tdc, s = S.sub, e = W.est(S); if (!e) return;
    if (a.what === "aob") { const aob = PP.clamp(e.aob + a.d, -Math.PI, Math.PI); T.ec = PP.normAng(e.brg + Math.PI - aob); }
    if (a.what === "spd") T.es = PP.clamp(Math.round((T.es + a.d) * 2) / 2, 0, 40);
    if (a.what === "rng") { const r = PP.clamp(e.rng + a.d, 200, 30000); T.ex = s.x + PP.hx(e.brg) * r; T.ey = s.y + PP.hy(e.brg) * r; }
  };
  /* a stadimeter reading: the masthead's height against the reticle, a few per cent out */
  W.stadimeter = (S, ev) => {
    const T = S.tdc, t = T.tgt !== null && Sh.byId(S, T.tgt), s = S.sub;
    if (!t || !Det.sees(S, s, t)) { ev.push({ t: "noRange" }); return; }
    const d = PP.dist(s.x, s.y, t.x, t.y) * (1 + PP.gauss(() => R(S)) * (S.sub.scope.hi ? 0.03 : 0.06)), b = PP.angTo(s.x, s.y, t.x, t.y);
    T.ex = s.x + PP.hx(b) * d; T.ey = s.y + PP.hy(b) * d; T.rngT = S.t;
    ev.push({ t: "ranged", rng: d });
  };
  /* each step: run the estimate on, and put it right by what can be seen */
  W.tdcStep = (S, dt, ev, aids) => {
    const T = S.tdc, s = S.sub;
    if (!T.set) return;
    T.ex += PP.hx(T.ec) * T.es * PP.KN * dt; T.ey += PP.hy(T.ec) * T.es * PP.KN * dt;
    const t = T.tgt !== null ? Sh.byId(S, T.tgt) : null;
    if (!t || t.sunk) { if (T.tgt !== null) { T.tgt = null; ev.push({ t: "lostLock" }); } return; }
    if (!Det.sees(S, s, t)) return;
    const b = PP.angTo(s.x, s.y, t.x, t.y), trueR = PP.dist(s.x, s.y, t.x, t.y);
    let r = PP.dist(s.x, s.y, T.ex, T.ey);
    /* the boat's fire control takes the range as it watches, by eye or by radar */
    r += (trueR - r) * (1 - Math.exp(-dt / 4)); T.rngT = S.t;
    T.ex = s.x + PP.hx(b) * r; T.ey = s.y + PP.hy(b) * r;
    if (!S.real.aob) {
      /* the Field TDC: it works out course and speed from watching, given time */
      const f = 1 - Math.exp(-dt / 22);
      T.ec = PP.normAng(T.ec + PP.angDiff(T.ec, t.hdg) * f); T.es += (t.spd - T.es) * f;
    }
  };

  /* ---- the firing solution ---- */
  /* tube axis a (radians), from point (sx, sy), against the estimate e; o: offset of aim in radians */
  W.solve = (S, e, bank, o = 0) => {
    const s = S.sub, tk = C.TORPS[s.mark], v = tk.kn * PP.KN, axis = PP.normAng(s.hdg + (bank === "A" ? Math.PI : 0)), r = C.TORP.turnR;
    if (!e) return null;
    const vx = PP.hx(e.c) * e.s * PP.KN, vy = PP.hy(e.c) * e.s * PP.KN;
    const ox = s.x + PP.hx(axis) * C.TORP.reach, oy = s.y + PP.hy(axis) * C.TORP.reach;
    let th = PP.angTo(ox, oy, e.x, e.y), tA = 0, ax = ox, ay = oy, t = 0;
    for (let it = 0; it < 5; it++) {
      /* the turn out of the tube: an arc of radius r through the gyro angle */
      const g = PP.angDiff(axis, th), side = g >= 0 ? 1 : -1, cx = ox + Math.cos(axis) * r * side, cy = oy + Math.sin(axis) * r * side;
      const a0 = Math.atan2(oy - cy, ox - cx), a1 = a0 + g;
      ax = cx + Math.cos(a1) * r; ay = cy + Math.sin(a1) * r; tA = Math.abs(g) * r / v;
      /* then straight, to meet the target: |D + V t| = v t */
      const Dx = e.x + vx * tA - ax, Dy = e.y + vy * tA - ay, A = vx * vx + vy * vy - v * v, B = 2 * (Dx * vx + Dy * vy), Cc = Dx * Dx + Dy * Dy;
      if (Math.abs(A) < 1e-9) t = -Cc / B;
      else { const disc = B * B - 4 * A * Cc; if (disc < 0) return { ok: false, why: "speed" }; const q = Math.sqrt(disc), t1 = (-B - q) / (2 * A), t2 = (-B + q) / (2 * A); t = Math.min(...[t1, t2].filter(x => x > 0)); }
      if (!isFinite(t) || t <= 0) return { ok: false, why: "speed" };
      th = PP.angTo(ax, ay, e.x + vx * (tA + t), e.y + vy * (tA + t));
    }
    th = PP.normAng(th + o);
    const gyro = PP.angDiff(axis, th), run = v * (tA + t) + C.TORP.reach;
    const track = Math.abs(PP.angDiff(th, e.c));   /* the angle the torpedo meets it at */
    const ok = Math.abs(gyro) <= C.TORP.gyroMax && run <= tk.range;
    return { ok, why: ok ? "" : Math.abs(gyro) > C.TORP.gyroMax ? "gyro" : "range", gyro, hdg: th, run, track, time: tA + t };
  };
  const SPREADS = { 1: [0], 2: [-0.5, 0.5], 3: [0, -1, 1], 4: [-1.5, -0.5, 0.5, 1.5] };

  W.canFire = (S, bank) => {
    const s = S.sub;
    if (s.sys[bank === "F" ? "tubesF" : "tubesA"] >= 0.5) return "damaged";
    if (s.depth > 120) return "deep";
    if (!s.tubes[bank].length) return "none";
    if (Sub.loaded(s, bank) === 0) return "empty";
    return "";
  };
  /* fire, as the 1990 game had it: at the ship selected, else the nearest the pack has in sight within a
   * torpedo's run; the fire control does the rest, and it will not waste a torpedo on a shot the tubes
   * cannot make ("wrong angle: fire the opposite tubes") or one out of range. One order sends the whole
   * spread: the first torpedo now, the rest a tube every C.TORP.gap seconds (W.salvoStep), each laid afresh
   * from the fire control's estimate as it goes */
  W.fire = (S, ev) => {
    const s = S.sub, T = S.tdc, bank = s.bank, why = W.canFire(S, bank);
    if (s.salvo) { ev.push({ t: "salvoOn" }); return; }
    if (why) { ev.push({ t: "cantFire", why, bank }); return; }
    if (!T.set || T.tgt === null) {
      const reach = C.TORPS[s.mark].range * 1.05;
      const t = S.ships.filter(q => Sh.alive(q) && Det.known(S, q)).map(q => ({ q, d: PP.dist(s.x, s.y, q.x, q.y) })).filter(o => o.d < reach).sort((a, b) => a.d - b.d)[0];
      if (!t) { ev.push({ t: "noTarget" }); return; }
      W.lock(S, t.q.id, ev);
    }
    {
      const e0 = W.est(S), sol0 = e0 && W.solve(S, e0, bank);
      if (sol0 && !sol0.ok) { ev.push({ t: "cantFire", why: sol0.why === "gyro" ? "angle" : "range", bank }); return; }
    }
    s.salvo = { bank, n: Math.min(s.spread, Sub.loaded(s, bank)), k: 0, next: S.t };
    W.salvoStep(S, ev);
  };
  /* the next torpedo of a spread under way, when its time comes; the spread ends when they are all away, or when
   * the bank cannot fire (damaged, too deep, empty) */
  W.salvoStep = (S, ev) => {
    const s = S.sub, v = s.salvo;
    if (!v || S.t < v.next) return;
    if (W.canFire(S, v.bank)) { s.salvo = null; return; }
    fireOne(S, ev, v.bank, v.k, v.n);
    v.k++; v.next = S.t + C.TORP.gap;
    if (v.k >= v.n) s.salvo = null;
  };
  /* one torpedo of a spread: the k-th of n, off the solution by its place in the spread's fan */
  function fireOne(S, ev, bank, k, n) {
    const s = S.sub, pat = SPREADS[s.spread] || [0], off = pat[k % pat.length] * C.SPREAD;
    const e = W.est(S);
    let hdg = PP.normAng(s.hdg + (bank === "A" ? Math.PI : 0) + off), sol = null;
    if (e) {
      sol = W.solve(S, e, bank, off);
      if (sol && sol.ok) hdg = sol.hdg;
      else if (sol) ev.push({ t: "noSolution", why: sol.why });
    }
    const i = s.tubes[bank].indexOf(0), store = bank === "F" ? "F" : "A";
    if (s.store[store] > 0) { s.tubes[bank][i] = C.TORP.reload; s.store[store]--; } else s.tubes[bank][i] = -1;
    const tk = C.TORPS[s.mark], era = C.era(C.monthOf(S.t)), axis = PP.normAng(s.hdg + (bank === "A" ? Math.PI : 0));
    const tp = { id: S.nextId++, x: s.x + PP.hx(axis) * C.TORP.reach, y: s.y + PP.hy(axis) * C.TORP.reach, hdg: axis, want: hdg, kn: tk.kn, run: 0, max: tk.range,
      mark: s.mark, by: s.id, fate: "ok", preAt: 0, depth: C.TORP.runDepth, tube: bank + (i + 1), wake: tk.wake };
    if (S.real.duds && !S.konami) {
      const r = R(S);
      if (r < era.circular) tp.fate = "circ";
      else if (r < era.circular + era.premature) { tp.fate = "pre"; tp.preAt = C.TORP.arm + R(S) * (tk.range - C.TORP.arm) * 0.8; }
      tp.depth += era.deep;
    }
    S.torps.push(tp);
    S.stats.fired++; s.fired = (s.fired || 0) + 1;
    ev.push({ t: "fired", tube: tp.tube, id: tp.id, solved: !!(sol && sol.ok), run: sol && sol.ok ? sol.run : 0, k, n });
  }

  /* reloading, and the torpedoes running */
  W.step = (S, dt, ev) => {
    const e = C.era(C.monthOf(S.t)), pack = PP.Engine.afloat(S);
    for (const s of pack) for (const bank of ["F", "A"]) {
      const slow = 1 - s.sys[bank === "F" ? "tubesF" : "tubesA"] * 0.7;
      s.tubes[bank].forEach((v, i) => { if (v > 0) { s.tubes[bank][i] = Math.max(0, v - dt * slow); if (s.tubes[bank][i] === 0) ev.push({ t: "reloaded", tube: bank + (i + 1), by: s.id }); } });
    }
    const L = Det.light(S);
    for (const tp of S.torps) {
      /* the boat that fired it: the alarm it raises points her way */
      const s = S.subs.find(q => q.id === tp.by) || S.sub;
      let left = dt;
      while (left > 0 && !tp.done) {
        const h = Math.min(0.5, left); left -= h;
        const v = tp.kn * PP.KN, w = v / C.TORP.turnR;
        if (tp.fate === "circ" && tp.run > 600) tp.want = PP.normAng(tp.hdg + 0.5);
        tp.hdg = PP.turnToward(tp.hdg, tp.want, w * h);
        const x0 = tp.x, y0 = tp.y;
        tp.x += PP.hx(tp.hdg) * v * h; tp.y += PP.hy(tp.hdg) * v * h; tp.run += v * h;
        if (tp.fate === "pre" && tp.run >= tp.preAt) {
          tp.done = true; S.stats.prematures = (S.stats.prematures || 0) + 1;
          ev.push({ t: "torpPremature", id: tp.id, x: tp.x, y: tp.y });
          alarmNear(S, tp.x, tp.y, ev, false, s);
          break;
        }
        /* against every ship: sampled along the step */
        const n = Math.max(1, Math.ceil(v * h / 5));
        for (let q = 1; q <= n && !tp.done; q++) {
          const px = PP.lerp(x0, tp.x, q / n), py = PP.lerp(y0, tp.y, q / n);
          for (const sh of S.ships) {
            if (sh.sunk || tp.done) continue;
            const k = C.SHIPS[sh.cls], dx = px - sh.x, dy = py - sh.y, u = dx * PP.hx(sh.hdg) + dy * PP.hy(sh.hdg), vv = dx * Math.cos(sh.hdg) + dy * Math.sin(sh.hdg);
            if (Math.abs(u) > k.len / 2 || Math.abs(vv) > k.beam / 2 + C.TORP.hitSlop) continue;
            if (tp.depth > k.draft + 3) { if (!tp.under) { tp.under = true; ev.push({ t: "torpUnder", id: tp.id, ship: sh.id }); } continue; }
            tp.done = true;
            const where = Math.abs(u) < k.len * 0.2 ? "mid" : u > 0 ? "fore" : "aft";
            const track = Math.abs(Math.sin(PP.angDiff(tp.hdg, sh.hdg)));
            const cv = Sh.convoy(S, sh.conv);
            if (tp.run < C.TORP.arm) { ev.push({ t: "torpDud", id: tp.id, ship: sh.id, why: "unarmed", x: px, y: py }); S.stats.duds++; if (cv) Sh.alarm(S, cv, s.x, s.y, ev); break; }
            if (S.real.duds && !S.konami && sh.sinking === 0 && R(S) < e.dud * (0.4 + 0.8 * track)) {
              ev.push({ t: "torpDud", id: tp.id, ship: sh.id, x: px, y: py }); S.stats.duds++;
              if (cv) Sh.alarm(S, cv, PP.lerp(sh.x, s.x, 0.6), PP.lerp(sh.y, s.y, 0.6), ev);
              break;
            }
            S.stats.hits++;
            ev.push({ t: "torpHit", id: tp.id, ship: sh.id, where, x: px, y: py });
            Sh.hit(S, sh, 0.9 + R(S) * 0.4 + (where === "mid" ? 0.15 : 0), where, ev, true, "torp", s.id);
            if (cv) Sh.alarm(S, cv, PP.lerp(sh.x, s.x, 0.5) + (R(S) - 0.5) * 1500, PP.lerp(sh.y, s.y, 0.5) + (R(S) - 0.5) * 1500, ev, true);
            break;
          }
        }
        /* a circular runner coming home */
        const own = !tp.done && tp.fate === "circ" && tp.run > 500 && pack.find(q => PP.dist(tp.x, tp.y, q.x, q.y) < 40 && q.depth < 30);
        if (own) { tp.done = true; ev.push({ t: "torpHitUs", by: own.id }); Sub.hurt(S, 1.0, "mid", ev, own, "torpedo"); break; }
        if (tp.run >= tp.max) { tp.done = true; ev.push({ t: "torpMiss", id: tp.id }); break; }
      }
      /* a steam torpedo's wake, seen by day: the convoy turns to comb it */
      if (!tp.done && tp.wake && L > 0.5 && !tp.seen) for (const sh of S.ships) {
        if (!Sh.alive(sh) || PP.dist(sh.x, sh.y, tp.x, tp.y) > 1300) continue;
        if (R(S) < 1 - Math.pow(0.92, dt)) { tp.seen = true; ev.push({ t: "wakeSeen", ship: sh.id }); const cv = Sh.convoy(S, sh.conv); if (cv) Sh.alarm(S, cv, s.x + (R(S) - 0.5) * 2500, s.y + (R(S) - 0.5) * 2500, ev); break; }
      }
    }
    S.torps = S.torps.filter(t => !t.done);
    W.gunStep(S, dt, ev);
  };
  function alarmNear(S, x, y, ev, hard, s = S.sub) {
    let best = null, bd = 9000;
    for (const sh of S.ships) { const d = PP.dist(sh.x, sh.y, x, y); if (d < bd) { bd = d; best = sh; } }
    if (best) Sh.alarm(S, Sh.convoy(S, best.conv), PP.lerp(x, s.x, 0.4), PP.lerp(y, s.y, 0.4), ev, hard);
  }

  /* ---- the deck gun: bearing, range, fire; shells take their time ---- */
  /* the deck gun's target, as an escort's: the ship locked, while she is known, afloat and inside its reach; else
   * the nearest that is */
  W.gunTarget = S => {
    const s = S.sub, ok = q => q && Sh.alive(q) && Det.known(S, q) && PP.dist(s.x, s.y, q.x, q.y) < C.GUN.range;
    const L = S.tdc.tgt !== null ? Sh.byId(S, S.tdc.tgt) : null;
    if (ok(L)) return L;
    let best = null, bd = 1e9;
    for (const q of S.ships) if (ok(q)) { const d = PP.dist(s.x, s.y, q.x, q.y); if (d < bd) { bd = d; best = q; } }
    return best;
  };
  /* where she lies off the bow; whether that is in the gun's arc (the tower is in the way aft); whether the gun is on
   * her (within a couple of degrees) */
  W.gunSight = (S, q) => {
    const s = S.sub, want = PP.angDiff(s.hdg, PP.angTo(s.x, s.y, q.x, q.y)), inArc = Math.abs(want) <= C.GUN.arc;
    return { want, inArc, lay: PP.clamp(want, -C.GUN.arc, C.GUN.arc), on: inArc && Math.abs((s.gun.rel || 0) - want) < 2 * PP.DEG };
  };
  W.gunOrder = (S, a, ev) => {
    const s = S.sub, g = s.gun;
    if (a.a === "gun") {
      if (!Sub.surfaced(s)) { ev.push({ t: "gunNo", why: "submerged" }); return; }
      if (s.sys.gun >= 0.5) { ev.push({ t: "gunNo", why: "damaged" }); return; }
      g.on = !g.on; if (!g.on) g.man = 0; else s.pendDive = null;
      ev.push({ t: g.on ? "gunManned" : "gunSecured" });
    }
    /* fire: at her, when the gun is manned, on her, loaded and has a shell; laid for where she will be when the shell
     * comes down, and spread by the sea */
    if (a.a === "gunFire") {
      if (!g.on || g.man < 1) { ev.push({ t: "gunNo", why: "manning" }); return; }
      if (g.reload > 0) { ev.push({ t: "gunNo", why: "loading" }); return; }
      if (s.shells <= 0) { ev.push({ t: "gunNo", why: "shells" }); return; }
      const q = W.gunTarget(S);
      if (!q) { ev.push({ t: "gunNo", why: "target" }); return; }
      const v = W.gunSight(S, q);
      if (!v.inArc) { ev.push({ t: "gunNo", why: "arc" }); return; }
      if (!v.on) { ev.push({ t: "gunNo", why: "training" }); return; }
      s.shells--; g.reload = C.GUN.reload; S.stats.shells = (S.stats.shells || 0) + 1;
      const fl = 1 + PP.dist(s.x, s.y, q.x, q.y) / 750, ax = q.x + PP.hx(q.hdg) * q.spd * PP.KN * fl, ay = q.y + PP.hy(q.hdg) * q.spd * PP.KN * fl;
      const sp = C.GUN.spread * (1 + S.wx.sea / 3), b = PP.normAng(PP.angTo(s.x, s.y, ax, ay) + PP.gauss(() => R(S)) * sp * 0.6), r = PP.dist(s.x, s.y, ax, ay) * (1 + PP.gauss(() => R(S)) * sp);
      g.rng = Math.round(r);
      S.shells.push({ id: S.nextId++, x: s.x + PP.hx(b) * r, y: s.y + PP.hy(b) * r, t: 1 + r / 750, by: s.id });
      ev.push({ t: "gunFire", brg: g.brg, id: q.id });
    }
  };
  W.gunStep = (S, dt, ev) => {
    for (const q of PP.Engine.afloat(S)) {
      const g = q.gun;
      if (g.on) g.man = Math.min(1, g.man + dt / C.GUN.man);
      if (g.reload > 0) g.reload = Math.max(0, g.reload - dt);
    }
    for (const sh of S.shells) {
      sh.t -= dt;
      if (sh.t > 0) continue;
      sh.done = true;
      let hit = null;
      for (const q of S.ships) {
        if (!Sh.alive(q)) continue;
        const k = C.SHIPS[q.cls], dx = sh.x - q.x, dy = sh.y - q.y, u = dx * PP.hx(q.hdg) + dy * PP.hy(q.hdg), v = dx * Math.cos(q.hdg) + dy * Math.sin(q.hdg);
        if (Math.abs(u) < k.len / 2 + 6 && Math.abs(v) < k.beam / 2 + 6) { hit = q; break; }
      }
      if (hit) { S.stats.gunHits = (S.stats.gunHits || 0) + 1; ev.push({ t: "gunHit", id: hit.id, x: sh.x, y: sh.y }); Sh.hit(S, hit, C.GUN.hit * (0.6 + R(S) * 0.8), "deck", ev, true, "shell", sh.by); }
      else ev.push({ t: "gunSplash", x: sh.x, y: sh.y });
      alarmNear(S, sh.x, sh.y, ev, false, S.subs.find(q => q.id === sh.by) || S.sub);
    }
    S.shells = S.shells.filter(x => !x.done);
  };
})();
