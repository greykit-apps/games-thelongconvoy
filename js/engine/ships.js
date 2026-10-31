/* The Long Convoy -- the Wolf Empire's ships: convoys on their lanes, the
 * formation, the zig-zag, the turn away and the scatter, and sinking.
 *
 * A convoy far off is only a point on its lane and a list of ships: it is
 * put on the sea, ship by ship in its stations, when our boat comes within
 * C.CONVOY.spawn yards, and taken off again past C.CONVOY.despawn, its
 * survivors and their damage written back into the list. So a whole war of
 * convoys costs nothing until one is in reach. */
"use strict";
(() => {
  const C = PP.C, Sea = PP.Sea, Sh = PP.Ships = {};
  const R = S => PP.rand(S);

  /* ---- making them ---- */
  /* a name from the pool, none used twice in a game until the pool runs out */
  Sh.name = (S, role) => {
    const list = role === "escort" ? C.ESCORT_NAMES : C.SHIP_NAMES;
    S.nameI = (S.nameI || 0) + 1;
    const used = S.names || (S.names = []);
    let i = (Math.floor(R(S) * list.length) + S.nameI * 7) % list.length;
    for (let k = 0; k < list.length && used.includes(list[i]); k++) i = (i + 1) % list.length;
    used.push(list[i]);
    return list[i];
  };
  /* a convoy's ships: n merchants of the lane's kinds, and escorts by the year */
  Sh.makeComp = (S, { kinds = C.MERCHANTS, n = 4, escorts = null, mi = 0 } = {}) => {
    const e = C.era(mi), comp = [];
    for (let i = 0; i < n; i++) { const cls = PP.pick(() => R(S), kinds); comp.push({ cls, name: Sh.name(S, "merchant"), dmg: 0 }); }
    let ne = escorts;
    if (ne === null) ne = n <= 1 ? (R(S) < 0.25 * e.escorts ? 1 : 0) : Math.max(0, Math.round(e.escorts * (0.6 + n / 4) + PP.gauss(() => R(S)) * 0.6));
    for (let i = 0; i < ne; i++) {
      const cls = mi < 12 ? (R(S) < 0.6 ? "destroyer" : "chaser") : PP.pick(() => R(S), ["destroyer", "destroyer", "frigate", "frigate", "chaser"]);
      comp.push({ cls, name: Sh.name(S, "escort"), dmg: 0 });
    }
    return comp;
  };
  Sh.makeConvoy = (S, o) => {
    const comp = o.comp, slow = Math.min(...comp.filter(c => C.SHIPS[c.cls].role === "merchant").map(c => C.SHIPS[c.cls].kn).concat([30]));
    const cv = {
      id: S.nextId++, lane: o.lane || null, dir: o.dir || 1, wp: 0, x: o.x, y: o.y, base: o.hdg || 0, spd: o.spd !== undefined ? o.spd : Math.max(6, slow - 1),
      zig: { plan: Math.floor(R(S) * C.CONVOY.zig.length), leg: Math.floor(R(S) * 3), legT: R(S) * 300 }, zigOff: 0,
      alert: false, alertT: -1, scatterT: -1, datum: null, comp, spawned: false, arrived: false, seenT: -1, name: o.name || "",
    };
    if (cv.lane) {
      const L = Sea.lane(cv.lane), n = L.pts.length;
      const near = Sea.nearOnLane(L, cv.x, cv.y);
      /* the next waypoint along the way it is going */
      let i = 1; while (i < n - 1 && L.cum[i] < near.s) i++;
      cv.wp = cv.dir > 0 ? i : i - 1;
    }
    S.convoys.push(cv);
    return cv;
  };
  /* stations: merchants in columns across the base course, escorts round them */
  function slots(cv) {
    const ms = cv.comp.filter(c => C.SHIPS[c.cls].role === "merchant"), es = cv.comp.filter(c => C.SHIPS[c.cls].role === "escort");
    const cols = ms.length <= 2 ? ms.length : ms.length <= 6 ? 2 : 3, rows = Math.ceil(ms.length / Math.max(1, cols)), sp = C.CONVOY.spacing;
    const out = new Map();
    ms.forEach((c, i) => { const col = i % cols, row = Math.floor(i / cols); out.set(c, { dx: (col - (cols - 1) / 2) * sp, dy: ((rows - 1) / 2 - row) * sp * 0.8 }); });
    const halfW = (cols - 1) / 2 * sp, halfL = (rows - 1) / 2 * sp * 0.8, ring = C.CONVOY.escortRing;
    const ST = [[0, 1], [-0.75, 0.7], [0.75, 0.7], [-1, -0.1], [1, -0.1], [0, -1], [-0.7, -0.8], [0.7, -0.8]];
    es.forEach((c, i) => { const [a, b] = ST[i % ST.length], r = PP.lerp(ring[0], ring[1], (i % 3) / 2); out.set(c, { dx: a * (halfW + r * 0.8), dy: b * (halfL + r) }); });
    return out;
  }
  const fwd = h => [PP.hx(h), PP.hy(h)], right = h => [Math.cos(h), Math.sin(h)];
  Sh.slotPos = (cv, sl) => { const f = fwd(cv.base), r = right(cv.base); return [cv.x + r[0] * sl.dx + f[0] * sl.dy, cv.y + r[1] * sl.dx + f[1] * sl.dy]; };

  Sh.spawn = (S, cv) => {
    if (cv.spawned) return;
    const sl = slots(cv), hdg = PP.normAng(cv.base + cv.zigOff);
    cv.ships = [];
    for (const c of cv.comp) {
      const k = C.SHIPS[c.cls], p = sl.get(c), [x, y] = Sh.slotPos(cv, p);
      const sh = {
        id: S.nextId++, cls: c.cls, name: c.name, role: k.role, conv: cv.id, slot: p, x, y, hdg, spd: cv.spd, ordHdg: hdg, ordSpd: cv.spd,
        dmg: c.dmg || 0, sinking: 0, sunk: false, fire: 0, list: 0, lit: false,
        ai: { st: "screen", t: 0, datum: null, dz: 150, ping: 0, mate: -1, run: null, drops: 0 },
        kn: { t: -1, x, y, by: "", brg: 0 }, scatterHdg: null,
      };
      S.ships.push(sh); cv.ships.push(sh.id);
    }
    cv.comp = [];
    cv.spawned = true;
  };
  Sh.despawn = (S, cv) => {
    if (!cv.spawned) return;
    cv.comp = S.ships.filter(s => s.conv === cv.id && !s.sunk && !s.sinking).map(s => ({ cls: s.cls, name: s.name, dmg: s.dmg }));
    S.ships = S.ships.filter(s => s.conv !== cv.id);
    cv.spawned = false; cv.ships = [];
    for (const q of S.subs) if (q.tdc.tgt !== null && !S.ships.some(s => s.id === q.tdc.tgt)) q.tdc.tgt = null;
  };
  Sh.byId = (S, id) => S.ships.find(s => s.id === id) || null;
  Sh.convoy = (S, id) => S.convoys.find(c => c.id === id) || null;
  Sh.alive = s => !s.sunk && !s.sinking;

  /* ---- the convoy's alarm: a hit, a sighting, a hunt ---- */
  Sh.alarm = (S, cv, x, y, ev, hard = false) => {
    if (!cv) return;
    const first = !cv.alert;
    cv.alert = true; cv.alertT = S.t; cv.datum = { x, y, t: S.t };
    if (first && S.ships.some(s => s.conv === cv.id && s.role === "merchant")) {
      /* an emergency turn, away from where the trouble came from (escorts alone hold their station) */
      const away = PP.angTo(x, y, cv.x, cv.y), d = PP.angDiff(cv.base, away);
      cv.base = PP.normAng(cv.base + PP.clamp(d, -70 * PP.DEG, 70 * PP.DEG));
      cv.spd = Math.min(cv.spd + 1.5, Math.min(...S.ships.filter(s => s.conv === cv.id && s.role === "merchant").map(s => C.SHIPS[s.cls].kn).concat([30])));
      ev.push({ t: "convoyTurns", id: cv.id });
    }
    if (hard && cv.scatterT < 0 && S.ships.filter(s => s.conv === cv.id && s.role === "merchant").length > 1) {
      cv.scatterT = S.t + C.CONVOY.scatterT;
      for (const s of S.ships) if (s.conv === cv.id && s.role === "merchant") s.scatterHdg = PP.normAng(PP.angTo(x, y, s.x, s.y) + (R(S) - 0.5) * 1.2);
      ev.push({ t: "scatter", id: cv.id });
    }
    for (const s of S.ships) if (s.conv === cv.id && s.role === "escort" && s.ai.st === "screen") { s.ai.st = "alert"; s.ai.datum = { x, y, t: S.t }; s.ai.t = 0; }
  };

  /* ---- a step ---- */
  Sh.step = (S, dt, ev) => {
    const pack = PP.Engine.afloat(S), near = (x, y) => pack.reduce((m, q) => Math.min(m, PP.dist(x, y, q.x, q.y)), 1e12);
    for (const cv of S.convoys) {
      /* the zig-zag: legs of the plan, each an offset from the base course for so long */
      if (S.real.zig && cv.comp.length + (cv.ships ? cv.ships.length : 0) > 0) {
        const plan = C.CONVOY.zig[cv.zig.plan];
        cv.zig.legT += dt * (cv.alert ? 1.5 : 1);
        while (cv.zig.legT > plan[cv.zig.leg % plan.length][1]) { cv.zig.legT -= plan[cv.zig.leg % plan.length][1]; cv.zig.leg++; }
        cv.zigOff = plan[cv.zig.leg % plan.length][0] * PP.DEG;
      } else cv.zigOff = 0;
      /* the base course: along the lane, waypoint to waypoint */
      if (cv.lane && !cv.arrived) {
        const L = Sea.lane(cv.lane), p = L.pts[cv.wp];
        if (PP.dist(cv.x, cv.y, p[0], p[1]) < 3500) {
          cv.wp += cv.dir;
          if (cv.wp < 0 || cv.wp >= L.pts.length) { cv.arrived = true; cv.arrivedT = S.t; cv.wp = PP.clamp(cv.wp, 0, L.pts.length - 1); }
        }
        const q = L.pts[cv.wp];
        if (!cv.arrived && !(cv.alert && S.t - cv.alertT < 1800)) cv.base = PP.turnToward(cv.base, PP.angTo(cv.x, cv.y, q[0], q[1]), 0.02 * dt);
      }
      /* after an alarm, back to the lane in time */
      if (cv.alert && S.t - cv.alertT > 3600) cv.alert = false;
      if (cv.scatterT > 0 && S.t > cv.scatterT) { cv.scatterT = -1; for (const s of S.ships) if (s.conv === cv.id) s.scatterHdg = null; }
      /* in harbour: she stops at the lane's end */
      if (cv.arrived) cv.spd = Math.max(0, cv.spd - dt * 0.01);
      const h = PP.normAng(cv.base + cv.zigOff), v = cv.spd * PP.KN * dt;
      cv.x += PP.hx(h) * v; cv.y += PP.hy(h) * v;
      /* ships on the sea, or off it */
      const d = near(cv.x, cv.y);
      if (!cv.spawned && d < C.CONVOY.spawn && cv.comp.length) Sh.spawn(S, cv);
      else if (cv.spawned && d > C.CONVOY.despawn && !S.ships.some(s => s.conv === cv.id && near(s.x, s.y) < C.CONVOY.spawn)) Sh.despawn(S, cv);
    }
    /* a convoy that has arrived, out of reach, or with nobody left, is gone */
    /* a convoy in harbour and out of our sight for an hour goes off the sea */
    for (const cv of S.convoys) if (cv.arrived && cv.spawned && S.t - cv.arrivedT > 3600 && !S.ships.some(s => s.conv === cv.id && s.kn.t > S.t - 900)) { Sh.despawn(S, cv); }
    S.convoys = S.convoys.filter(cv => !((cv.arrived && !cv.spawned) || (!cv.spawned && !cv.comp.length) || (cv.spawned && !S.ships.some(s => s.conv === cv.id))));

    for (const s of S.ships) {
      const k = C.SHIPS[s.cls], cv = Sh.convoy(S, s.conv);
      if (s.sinking) {
        s.sinking += dt; s.ordSpd = 0; s.list = Math.min(1, s.list + dt / s.sinkT);
        if (s.sinking >= s.sinkT && !s.sunk) Sh.sunk(S, s, ev);
      } else if (s.role === "merchant" || s.ai.st === "screen") {
        /* keep station: steer for the slot, a little ahead of it; or run, scattered */
        if (s.scatterHdg !== null && s.role === "merchant") { s.ordHdg = s.scatterHdg; s.ordSpd = k.kn; }
        else if (cv) {
          const [px, py] = Sh.slotPos(cv, s.slot), h = PP.normAng(cv.base + cv.zigOff), lead = 900;
          const tx = px + PP.hx(h) * lead, ty = py + PP.hy(h) * lead;
          s.ordHdg = PP.angTo(s.x, s.y, tx, ty);
          const along = (px - s.x) * PP.hx(h) + (py - s.y) * PP.hy(h);
          s.ordSpd = PP.clamp(cv.spd + along / 160, cv.spd * 0.5, k.kn * (1 - Math.min(0.6, s.dmg / k.hp * 0.6)));
          if (s.role === "escort" && !cv.alert) s.ordHdg = PP.normAng(s.ordHdg + Math.sin(S.t / 140 + s.id) * 0.35);
        } else s.ordSpd = Math.min(s.ordSpd, k.kn);
      }
      /* the ship's own helm and engines */
      const turn = (s.role === "escort" ? 3.2 : 1.1) * PP.DEG * dt * PP.clamp(s.spd / 6, 0.2, 1);
      s.hdg = PP.turnToward(s.hdg, s.ordHdg, turn);
      s.spd += (s.ordSpd - s.spd) * (1 - Math.exp(-dt / (s.role === "escort" ? 30 : 90)));
      const nx = s.x + PP.hx(s.hdg) * s.spd * PP.KN * dt, ny = s.y + PP.hy(s.hdg) * s.spd * PP.KN * dt;
      if (Sea.depthAt(nx, ny) > k.draft + 4) { s.x = nx; s.y = ny; }
      else { s.ordHdg = PP.normAng(s.hdg + Math.PI * 0.5); s.spd *= 0.5; }
      if (s.fire > 0) s.fire = Math.max(0, s.fire - dt / 900);
    }
    /* the sunk go after a while, when their last bubbles are gone */
    S.ships = S.ships.filter(s => !(s.sunk && S.t - s.sunkT > 120));
    for (const q of S.subs) if (q.tdc.tgt !== null) { const t = Sh.byId(S, q.tdc.tgt); if (!t || t.sunk) q.tdc.tgt = null; }
  };

  /* a ship gone under: the tonnage to whoever sank her */
  Sh.sunk = (S, s, ev) => {
    const k = C.SHIPS[s.cls];
    s.sunk = true; s.sunkT = S.t;
    ev.push({ t: "shipSunk", id: s.id, name: s.name, cls: s.cls, tons: k.tons, x: s.x, y: s.y, role: s.role });
    if (s.byUs) {
      S.stats.tons += k.tons; S.stats.sunk.push({ name: s.name, cls: s.cls, tons: k.tons, t: S.t, role: s.role, kind: s.lastKind || "torp", boat: s.lastBy });
      const q = S.subs.find(b => b.id === s.lastBy); if (q) { q.sank = (q.sank || 0) + 1; q.tons = (q.tons || 0) + k.tons; }
    }
  };
  /* the action over: every ship still going down is counted sunk, so nobody waits out her last minutes */
  Sh.settle = (S, ev) => { for (const s of S.ships) if (s.sinking && !s.sunk) Sh.sunk(S, s, ev); };

  /* ---- a hit: a torpedo, a shell ---- */
  /* kind: torp, shell or ram; by: the boat of the pack that did it, for the debrief */
  Sh.hit = (S, s, dmg, where, ev, byUs = true, kind = "torp", by) => {
    if (!Sh.alive(s)) return;
    const k = C.SHIPS[s.cls];
    s.lastKind = kind; if (by !== undefined) s.lastBy = by;
    s.dmg += dmg; if (byUs) s.byUs = true;
    s.fire = Math.min(1, s.fire + (kind === "torp" ? 0.6 : 0.15));
    ev.push({ t: "shipHit", id: s.id, kind, where, x: s.x, y: s.y });
    if (kind === "torp" && k.burns && where === "mid" && R(S) < 0.35) { s.dmg = k.hp * 2; ev.push({ t: "shipExplodes", id: s.id, x: s.x, y: s.y }); }
    if (s.dmg >= k.hp) {
      s.sinking = 0.001;
      s.sinkT = s.dmg >= k.hp * 2 ? 40 : 90 + k.tons / 50 * (0.7 + R(S) * 0.6);
      s.sinkBy = where;
      ev.push({ t: "shipSinking", id: s.id, name: s.name, x: s.x, y: s.y });
    }
  };
})();
