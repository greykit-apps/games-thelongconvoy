/* PumaPack -- the hunters: escorts, their depth charges and guns, and
 * the Empire's patrol planes.
 *
 * An escort keeps its station on the convoy until something gives us away:
 * a sighting, a noise, a ship blowing up. Then it runs to where it thinks we
 * are (the datum), slows to listen and ping, and hunts in a widening circle.
 * A sonar contact sends it in at speed; close under its bow the sonar loses
 * us, and it runs on blind and lays a pattern: charges off the rails astern
 * and from the throwers either side, set to the depth it guesses. Then it
 * opens out, turns, and listens again, until it gets us or gives up. On
 * expert, escorts pass their contacts to each other, aim where we will be,
 * set their charges closer, and one stays behind to hold us down. */
"use strict";
(() => {
  const C = PP.C, Sub = PP.Sub, Sh = PP.Ships, Det = PP.Detect, Sea = PP.Sea, Esc = PP.Escort = {};
  const R = S => PP.rand(S);

  function steer(sh, x, y, kn) { sh.ordHdg = PP.angTo(sh.x, sh.y, x, y); sh.ordSpd = Math.min(kn, C.SHIPS[sh.cls].kn); }
  const predicted = (S, ai, lead) => {
    const d = ai.datum, age = S.t - d.t;
    return lead ? [d.x + (d.vx || 0) * age, d.y + (d.vy || 0) * age] : [d.x, d.y];
  };

  /* the boat an escort is after: the one it last had contact with, else the nearest of the pack */
  Esc.quarry = (S, sh) => {
    const pack = PP.Engine.afloat(S);
    return pack.find(q => q.id === sh.ai.tgt) || pack.reduce((a, q) => !a || PP.dist(sh.x, sh.y, q.x, q.y) < PP.dist(sh.x, sh.y, a.x, a.y) ? q : a, null);
  };
  Esc.step = (S, dt, ev) => {
    const expert = S.real.expert ? 1 : 0, e = C.era(C.monthOf(S.t)), pack = PP.Engine.afloat(S);
    if (!pack.length) return;
    const escorts = S.ships.filter(q => q.role === "escort" && Sh.alive(q));
    /* expert escorts share what they have */
    if (expert) for (const a of escorts) if (a.ai.contact && S.t - a.ai.contact < 8) for (const b of escorts) {
      if (b !== a && PP.dist(a.x, a.y, b.x, b.y) < 5000 && (!b.ai.contact || b.ai.contact < a.ai.contact - 4)) {
        b.ai.datum = Object.assign({}, a.ai.datum); b.ai.dz = a.ai.dz; b.ai.contact = a.ai.contact - 4; if (b.ai.st === "screen") b.ai.st = "alert";
      }
    }
    for (const sh of escorts) {
      const s = Esc.quarry(S, sh), ai = sh.ai, k = C.SHIPS[sh.cls], cv = Sh.convoy(S, sh.conv), d = PP.dist(sh.x, sh.y, s.x, s.y);
      ai.t += dt;
      /* an escort cannot leave its convoy for ever: back to it after so long, or so far */
      if (ai.st === "screen" || ai.st === "lost") ai.huntT = 0; else ai.huntT = (ai.huntT || 0) + dt;
      const away = cv ? PP.dist(sh.x, sh.y, cv.x, cv.y) : 0, cap = C.ESC.huntT[expert] * (ai.st === "hold" ? 2 : 1);
      if (ai.st !== "screen" && ai.st !== "lost" && ai.st !== "guns" && (ai.huntT > cap || away > C.ESC.leash[expert] * (ai.st === "hold" ? 2 : 1))) { ai.st = "lost"; ai.t = 0; ev.push({ t: "escortGivesUp", id: sh.id }); }
      const fresh = ai.contact && S.t - ai.contact < 6;
      sh.lit = Det.night(S) && ai.st !== "screen" && ai.st !== "lost" && (expert || e.mi > 20) && d < 5000;
      /* a boat on the surface, in sight: guns, and the bow */
      if (Sub.surfaced(s) && fresh && d < C.ESC.gunRange) {
        if (ai.st !== "guns") { ai.st = "guns"; ai.t = 0; }
      } else if (ai.st === "guns" && (!Sub.surfaced(s) || !fresh)) { ai.st = "search"; ai.t = 0; if (!ai.datum) ai.datum = { x: s.x, y: s.y, t: S.t }; }
      if (ai.st !== "screen" && !ai.datum) { ai.st = "lost"; ai.t = 0; }
      switch (ai.st) {
        case "screen":
          if (ai.datum) { ai.st = "alert"; ai.t = 0; }
          break;
        case "alert": {
          const [x, y] = predicted(S, ai, expert);
          steer(sh, x, y, C.ESC.attackKn);
          if (PP.dist(sh.x, sh.y, x, y) < 3000) { ai.st = "search"; ai.t = 0; }
          if (fresh && ai.how === "sonar") { ai.st = "attack"; ai.t = 0; }
          break;
        }
        case "search": case "hold": {
          /* slow to listen; circle the datum, wider as time goes on */
          const [x, y] = predicted(S, ai, expert), dd = PP.dist(sh.x, sh.y, x, y), r = 500 + Math.min(2500, ai.t * 3);
          if (dd > r + 400) steer(sh, x, y, C.ESC.listenKn);
          else { sh.ordHdg = PP.normAng(PP.angTo(sh.x, sh.y, x, y) + (sh.id % 2 ? 1 : -1) * Math.PI * 0.45); sh.ordSpd = Math.min(C.ESC.searchKn, k.kn); }
          if (fresh && (ai.how === "sonar" || ai.how === "eye" || ai.how === "radar")) { ai.st = "attack"; ai.t = 0; ai.run = null; break; }
          const since = S.t - (ai.contact || ai.datum.t), give = C.ESC.lostT * (1 + expert * 0.8) * e.asw;
          const far = cv ? PP.dist(sh.x, sh.y, cv.x, cv.y) : 0;
          if (since > give || (!expert && far > 14000) || (ai.st === "hold" && ai.t > C.ESC.persist[expert])) { ai.st = "lost"; ai.t = 0; ev.push({ t: "escortGivesUp", id: sh.id }); }
          break;
        }
        case "attack": {
          /* in at speed, toward where the boat will be */
          const [x, y] = predicted(S, ai, true), dd = PP.dist(sh.x, sh.y, x, y);
          if (!ai.run) { ai.run = { x, y }; ev.push({ t: "escortRun", id: sh.id }); }
          if (fresh) ai.run = { x, y };
          steer(sh, ai.run.x, ai.run.y, C.ESC.attackKn);
          const dr = PP.dist(sh.x, sh.y, ai.run.x, ai.run.y);
          if (dr < C.ESC.blind * 0.5 || (dr < C.ESC.blind && Math.abs(PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, ai.run.x, ai.run.y))) > 1.2)) {
            ai.st = "drop"; ai.t = 0; ai.drops = 0; ai.dropAt = { x: sh.x, y: sh.y };
            ai.set = PP.clamp(ai.dz + PP.gauss(() => R(S)) * C.ESC.depthErr[expert] * 0.5, 30, 700);
            /* the throwers, either side */
            for (const side of [-1, 1]) Esc.charge(S, sh.x + Math.cos(sh.hdg) * C.DC.throw * side, sh.y + Math.sin(sh.hdg) * C.DC.throw * side, ai.set + PP.gauss(() => R(S)) * 15, sh.id);
            ev.push({ t: "chargesAway", id: sh.id, x: sh.x, y: sh.y, by: s.id });
          }
          if (ai.t > 240 && dd > 4000) { ai.st = "search"; ai.t = 0; }
          break;
        }
        case "drop": {
          /* charges off the rails at intervals along the track */
          sh.ordSpd = Math.min(C.ESC.attackKn * 0.8, k.kn);
          const n = k.dc + expert * 2 - 2;
          if (PP.dist(sh.x, sh.y, ai.dropAt.x, ai.dropAt.y) >= C.DC.spacing && ai.drops < n) {
            Esc.charge(S, sh.x - PP.hx(sh.hdg) * 20, sh.y - PP.hy(sh.hdg) * 20, ai.set + (ai.drops % 2 ? 25 : -10) * (1 - expert * 0.5), sh.id);
            ai.dropAt = { x: sh.x, y: sh.y }; ai.drops++;
          }
          if (ai.drops >= n) { ai.st = "open"; ai.t = 0; ai.openAt = { x: sh.x, y: sh.y }; }
          break;
        }
        case "open":
          sh.ordSpd = Math.min(C.ESC.attackKn, k.kn);
          if (PP.dist(sh.x, sh.y, ai.openAt.x, ai.openAt.y) > 900 + R(S) * 300 || ai.t > 120) { ai.st = "search"; ai.t = 0; ai.datum.t = Math.max(ai.datum.t, S.t - 30); }
          break;
        case "guns": {
          /* close, firing; inside a few hundred yards, ram */
          steer(sh, s.x, s.y, k.kn);
          ai.gunT = (ai.gunT || 0) - dt;
          if (ai.gunT <= 0) {
            ai.gunT = 4.5 / (k.guns || 1) * (0.8 + R(S) * 0.4);
            const p = 0.55 * Math.pow(1 - d / C.ESC.gunRange, 1.6) * (0.4 + Det.light(S) * 0.6) * (1 + expert * 0.3);
            S.stats.escShots = (S.stats.escShots || 0) + 1;
            if (R(S) < p) { S.stats.escHits = (S.stats.escHits || 0) + 1; Sub.hurt(S, 0.05 + R(S) * 0.08, "deck", ev, s, "gun"); ev.push({ t: "shellHit", id: sh.id, by: s.id }); }
            else ev.push({ t: "shellNear", id: sh.id, x: s.x + (R(S) - 0.5) * 120, y: s.y + (R(S) - 0.5) * 120, by: s.id });
            ev.push({ t: "escortGun", id: sh.id, by: s.id });
          }
          if (d < 45 && s.depth < 20) {
            S.stats.rams = (S.stats.rams || 0) + 1;
            Sub.hurt(S, 0.9, "mid", ev, s, "ram"); Sh.hit(S, sh, 0.35, "fore", ev, false, "ram");
            ev.push({ t: "rammed", id: sh.id, by: s.id });
            ai.st = "open"; ai.t = 0; ai.openAt = { x: sh.x, y: sh.y };
          }
          break;
        }
        case "lost": {
          ai.datum = null; ai.contact = 0; ai.run = null;
          if (cv) {
            const [x, y] = Sh.slotPos(cv, sh.slot);
            steer(sh, x, y, Math.min(k.kn, cv.spd + 8));
            if (PP.dist(sh.x, sh.y, x, y) < 1500) { ai.st = "screen"; ai.t = 0; }
          } else { sh.ordSpd = Math.min(12, k.kn); if (ai.t > 1800) { ai.st = "screen"; } }
          break;
        }
      }
      /* the expert's hold-down: when the convoy draws off, one escort stays */
      if (expert && cv && (ai.st === "search") && PP.dist(sh.x, sh.y, cv.x, cv.y) > 9000 && !escorts.some(q => q !== sh && q.ai.st === "hold")) { ai.st = "hold"; ai.t = 0; }
    }

    /* ---- the charges, sinking to their depth ---- */
    for (const c of S.charges) {
      c.z += C.DC.sink * dt;
      if (c.z < c.set) continue;
      c.done = true;
      /* the boom is heard by the whole pack; it hurts the boats within reach of it */
      let dmin = 1e9, nearBy = null;
      for (const s of PP.Engine.afloat(S)) {
        const dx = (c.x - s.x) * 3, dy = (c.y - s.y) * 3, dz = c.z - s.depth, d3 = Math.hypot(dx, dy, dz);
        if (d3 < dmin) { dmin = d3; nearBy = s.id; }
        if (d3 < C.DC.hurt) {
          const along = (dx * PP.hx(s.hdg) + dy * PP.hy(s.hdg)) / 3, where = along > 25 ? "fore" : along < -25 ? "aft" : "mid";
          const sev = d3 < C.DC.kill ? 1.1 : Math.pow(1 - d3 / C.DC.hurt, 2) * C.DC.sev;
          Sub.hurt(S, sev, where, ev, s, "dc");
          S.stats.dcNear++;
        }
      }
      ev.push({ t: "dcBoom", x: c.x, y: c.y, z: c.z, d: dmin, near: nearBy });
    }
    S.charges = S.charges.filter(c => !c.done);

    /* ---- patrol planes ---- */
    Esc.air(S, dt, ev);
  };
  Esc.charge = (S, x, y, set, by) => { S.charges.push({ id: S.nextId++, x, y, z: 0, set: PP.clamp(set, 25, 750), by }); S.stats.charges++; };

  /* ---- the air: planes off the Empire's islands, by day (and by night once they carry radar) ---- */
  Esc.airCover = (S) => {
    const s = S.sub, z = Sea.zoneAt(s.x, s.y);
    if (z) return z.air;
    let best = Infinity;
    for (const I of Sea.isles) if (I.side === "wolf") best = Math.min(best, PP.dist(s.x, s.y, I.x, I.y));
    return best < 260 * PP.YD_NM ? 0.6 * (1 - best / (260 * PP.YD_NM)) : 0;
  };
  Esc.air = (S, dt, ev) => {
    const s = S.sub, e = C.era(C.monthOf(S.t)), L = Det.light(S), day = L > 0.45;
    if (S.mode === "patrol" && S.phase === "sea" && (day || e.planeRadar)) {
      const lam = C.AIR.perHour * Esc.airCover(S) * e.air * (day ? 1 : 0.4);
      if (lam > 0 && R(S) < lam * dt / 3600 && S.planes.length < 2) {
        const a = R(S) * PP.TAU, r = 30000;
        S.planes.push({ id: S.nextId++, x: s.x + Math.sin(a) * r, y: s.y - Math.cos(a) * r, tx: s.x + (R(S) - 0.5) * 12000, ty: s.y + (R(S) - 0.5) * 12000, hdg: 0, st: "search", t: 0, seen: false, radar: e.planeRadar });
      }
    }
    for (const p of S.planes) {
      p.t += dt;
      const d = PP.dist(p.x, p.y, s.x, s.y);
      if (p.st === "search") {
        const eye = C.AIR.eyes * Math.max(0.15, L) * S.wx.vis, ex = Sub.exposed(s);
        let q = 0;
        if (Sub.surfaced(s) && d < eye) q = 0.4 * (1 - d / eye);
        if (Sub.surfaced(s) && p.radar && d < C.DET.radarPlane) q = Math.max(q, 0.3);
        if (!Sub.surfaced(s) && ex > 0 && d < 1800 * L) q = 0.08;
        if (!Sub.surfaced(s) && s.depth < 45 && d < 1200 && L > 0.6 && S.wx.sea < 3) q = Math.max(q, 0.04);   /* a shape under clear water */
        if (q && R(S) < 1 - Math.pow(1 - q, dt)) { p.st = "attack"; ev.push({ t: "planeAttack", id: p.id }); }
        if (PP.dist(p.x, p.y, p.tx, p.ty) < 2000) { p.tx = s.x + (R(S) - 0.5) * 16000; p.ty = s.y + (R(S) - 0.5) * 16000; }
        if (p.t > C.AIR.searchT) p.st = "leave";
      }
      const [tx, ty] = p.st === "attack" ? [s.x, s.y] : p.st === "leave" ? [p.x + PP.hx(p.hdg) * 1e5, p.y + PP.hy(p.hdg) * 1e5] : [p.tx, p.ty];
      p.hdg = PP.turnToward(p.hdg, PP.angTo(p.x, p.y, tx, ty), 6 * PP.DEG * dt);
      p.x += PP.hx(p.hdg) * C.AIR.kn * PP.KN * dt; p.y += PP.hy(p.hdg) * C.AIR.kn * PP.KN * dt;
      if (p.st === "attack" && PP.dist(p.x, p.y, s.x, s.y) < 60 + C.AIR.kn * PP.KN * dt) {
        /* the bombs: where the boat was, or is; the deeper she is, the less they do */
        const err = R(S) * C.AIR.bombR * 1.6;
        ev.push({ t: "bombs", x: s.x, y: s.y, err });
        if (s.depth < C.AIR.bombDepth && err < C.AIR.bombR) Sub.hurt(S, 0.55 * (1 - s.depth / C.AIR.bombDepth) * (1 - err / C.AIR.bombR) + 0.05, "deck", ev, s, "air");
        p.st = "leave"; p.t = 0;
      }
      /* our lookouts, or our radar, see it coming */
      if (!p.seen) {
        const look = (L > 0.45 ? C.DET.planeDay : C.DET.planeNight) * S.wx.vis;
        if ((Sub.surfaced(s) && d < look) || (Sub.radarWorks(s) && d < C.DET.radarPlane) || (Sub.scopeReady(s) && d < look * 0.5)) {
          p.seen = true; ev.push({ t: "plane", id: p.id, brg: PP.angTo(s.x, s.y, p.x, p.y), rng: d, attacking: p.st === "attack" });
        }
      }
    }
    S.planes = S.planes.filter(p => !(p.st === "leave" && PP.dist(p.x, p.y, s.x, s.y) > 40000));
  };
})();
