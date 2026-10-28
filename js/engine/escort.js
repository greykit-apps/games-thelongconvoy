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
  /* where the boat is thought to be; led, where she will be (ahead, extra seconds on: the charges' time to sink) */
  const predicted = (S, ai, lead, ahead = 0) => {
    const d = ai.datum, age = S.t - d.t + ahead;
    return lead ? [d.x + (d.vx || 0) * age, d.y + (d.vy || 0) * age] : [d.x, d.y];
  };
  Esc.sinkT = z => PP.clamp(z, 30, 700) / C.DC.sink;

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
      /* the escort you are aboard: your helm and telegraph, your charges (Esc.user) */
      if (ai.st === "user") { Esc.user(S, sh, dt, ev); continue; }
      /* the others, under your orders on the escorts' side */
      if (sh.ord === "hold" && !(ai.contact && S.t - ai.contact < 6)) { sh.ordSpd = 0; continue; }
      if (sh.ord === "hunt" && (ai.st === "screen" || ai.st === "lost")) {
        const best = escorts.filter(q => q.ai.datum && q.ai.contact).sort((a, b) => b.ai.contact - a.ai.contact)[0];
        if (best && S.t - best.ai.contact < 900) { ai.datum = Object.assign({}, best.ai.datum); ai.dz = best.ai.dz; ai.contact = best.ai.contact; ai.st = "alert"; ai.t = 0; }
      }
      if (sh.ord === "patrol" && (ai.st === "screen" || ai.st === "lost")) {
        const w = sh.wps && sh.wps[0];
        if (w) { steer(sh, w.x, w.y, C.ESC.listenKn + 4); if (PP.dist(sh.x, sh.y, w.x, w.y) < 600) sh.wps.push(sh.wps.shift()); ai.st = "lost"; ai.t = 0; continue; }
      }
      /* an escort cannot leave its convoy for ever: back to it after so long, or so far */
      if (ai.st === "screen" || ai.st === "lost") ai.huntT = 0; else ai.huntT = (ai.huntT || 0) + dt;
      const away = cv ? PP.dist(sh.x, sh.y, cv.x, cv.y) : 0, cap = C.ESC.huntT[expert] * (ai.st === "hold" ? 2 : 1);
      if (ai.st !== "screen" && ai.st !== "lost" && ai.st !== "guns" && sh.ord !== "hunt" && (ai.huntT > cap || away > C.ESC.leash[expert] * (ai.st === "hold" ? 2 : 1))) { ai.st = "lost"; ai.t = 0; ev.push({ t: "escortGivesUp", id: sh.id }); }
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
          /* in at speed, toward where the boat will be when the charges reach her depth */
          const [x, y] = predicted(S, ai, true, Esc.sinkT(ai.dz)), dd = PP.dist(sh.x, sh.y, x, y);
          if (!ai.run) { ai.run = { x, y }; ev.push({ t: "escortRun", id: sh.id }); }
          if (fresh) ai.run = { x, y };
          steer(sh, ai.run.x, ai.run.y, C.ESC.attackKn);
          const dr = PP.dist(sh.x, sh.y, ai.run.x, ai.run.y), n = k.dc + expert * 2 - 2;
          /* the rails start half a pattern short, so the pattern lies across the aim point; past it, at once */
          if (dr < (n - 1) * C.DC.spacing / 2 + 10 || (dr < C.ESC.blind && Math.abs(PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, ai.run.x, ai.run.y))) > 1.2)) {
            ai.st = "drop"; ai.t = 0; ai.drops = 0; ai.dropAt = null; ai.thrown = false;
            ai.set = PP.clamp(ai.dz + PP.gauss(() => R(S)) * C.ESC.depthErr[expert] * 0.5, 30, 700);
          }
          if (ai.t > 240 && dd > 4000) { ai.st = "search"; ai.t = 0; }
          break;
        }
        case "drop": {
          /* charges off the rails at intervals along the track; the throwers, either side, over the middle of it */
          sh.ordSpd = Math.min(C.ESC.attackKn * 0.8, k.kn);
          const n = k.dc + expert * 2 - 2;
          if ((!ai.dropAt || PP.dist(sh.x, sh.y, ai.dropAt.x, ai.dropAt.y) >= C.DC.spacing) && ai.drops < n) {
            Esc.charge(S, sh.x - PP.hx(sh.hdg) * 20, sh.y - PP.hy(sh.hdg) * 20, ai.set + (ai.drops % 2 ? 25 : -10) * (1 - expert * 0.5), sh.id);
            ai.dropAt = { x: sh.x, y: sh.y }; ai.drops++;
            if (!ai.thrown && ai.drops > n / 2) {
              ai.thrown = true;
              for (const side of [-1, 1]) Esc.charge(S, sh.x + Math.cos(sh.hdg) * C.DC.throw * side, sh.y + Math.sin(sh.hdg) * C.DC.throw * side, ai.set + PP.gauss(() => R(S)) * 15, sh.id);
              ev.push({ t: "chargesAway", id: sh.id, x: sh.x, y: sh.y, by: s.id });
            }
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
      c.z += (c.hh ? C.ESC_SIDE.hhSink : C.DC.sink) * dt;
      /* a hedgehog's bomb goes off only on a hull: it sinks past each boat's depth, and hits her if it is over her */
      if (c.hh) {
        for (const s of PP.Engine.afloat(S)) {
          if (Math.abs(c.z - s.depth) > C.DC.sink * dt + C.ESC_SIDE.hhSink * dt + 6) continue;
          const u = (c.x - s.x) * PP.hx(s.hdg) + (c.y - s.y) * PP.hy(s.hdg), v = (c.x - s.x) * Math.cos(s.hdg) + (c.y - s.y) * Math.sin(s.hdg);
          if (Math.abs(u) < C.SUBS[s.cls].len / 2 && Math.abs(v) < 5) {
            c.done = true; S.stats.hhHits = (S.stats.hhHits || 0) + 1;
            Sub.hurt(S, 0.75, "mid", ev, s, "hedgehog"); ev.push({ t: "dcBoom", x: c.x, y: c.y, z: c.z, d: 0, near: s.id, hh: true }); break;
          }
        }
        if (c.z > 800 || Sea.depthAt(c.x, c.y) < c.z) c.done = true;
        continue;
      }
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
      ev.push({ t: "dcBoom", id: c.id, x: c.x, y: c.y, z: c.z, d: dmin, near: nearBy });
    }
    S.charges = S.charges.filter(c => !c.done);

    /* ---- patrol planes ---- */
    Esc.air(S, dt, ev);
  };
  Esc.charge = (S, x, y, set, by) => { S.charges.push({ id: S.nextId++, x, y, z: 0, set: PP.clamp(set, 25, 750), by }); S.stats.charges++; };

  /* ---- the escort you sail yourself ----
   * Your orders (Esc.order) set her course and speed, her charges' depth, her sonar; the pattern you order
   * goes off the throwers at once and off the rails along her track; the hedgehog (later in the war)
   * throws a ring of contact bombs ahead that go off only on a hull; her guns fire on a boat in sight on
   * the surface; and she rams what she runs down. What she knows of the pack is her contacts (ai.datum),
   * from the same eyes, ears and sonar every escort has (PP.Detect). */
  const E_ = () => PP.Engine;
  Esc.flag = S => S.side === "escorts" ? S.ships.find(q => q.id === S.flag && Sh.alive(q)) || null : null;
  Esc.mine = S => S.ships.filter(q => q.role === "escort" && Sh.alive(q));
  Esc.order = (S, a, ev) => {
    const sh = Esc.flag(S); if (!sh) return;
    const k = C.SHIPS[sh.cls], X = C.ESC_SIDE;
    switch (a.a) {
      case "bell": sh.bell = PP.clamp((sh.bell === undefined ? 3 : sh.bell) + a.d, 0, 6); sh.ordSpd = C.ESC_BELL_F[sh.bell] * k.kn; ev.push({ t: "ordered", what: "bell" }); break;
      case "setBell": sh.bell = PP.clamp(a.v, 0, 6); sh.ordSpd = C.ESC_BELL_F[sh.bell] * k.kn; ev.push({ t: "ordered", what: "bell" }); break;
      case "hdg": sh.ordHdg = PP.normAng(a.v); break;
      case "dcSet": sh.dcSet = PP.clamp(a.v !== undefined ? a.v : (sh.dcSet || 150) + a.d, X.dcSet[0], X.dcSet[1]); ev.push({ t: "dcSet", v: sh.dcSet, slide: a.v !== undefined }); break;
      case "ping": sh.ping = a.v === undefined ? !sh.ping : !!a.v; ev.push({ t: "ping", on: sh.ping }); break;
      /* the weapon "Lay charges" fires: a pattern, or (the one after the patterns, once fitted) the hedgehog */
      case "patSel": {
        const v = PP.clamp(a.v | 0, 0, C.ESC_PATTERNS.length);
        if (v === C.ESC_PATTERNS.length && C.monthOf(S.t) < X.hedgehogFrom) { ev.push({ t: "noHedgehog" }); break; }
        sh.patK = v; ev.push({ t: "patSel", v });
        break;
      }
      case "pattern": {
        if ((sh.patK || 0) === C.ESC_PATTERNS.length) { hedgehog(S, sh, ev); break; }
        if (sh.pat) break;
        if ((sh.dcLeft || 0) < 1) { ev.push({ t: "noCharges" }); break; }
        /* the first rail goes now, the rest as she runs on (Esc.user) */
        sh.pat = { p: sh.patK || 0, at: null, k: 0 };
        lay(S, sh);
        ev.push({ t: "patternAway", id: sh.id });
        break;
      }
      case "hedgehog": hedgehog(S, sh, ev); break;
      /* the boat she means to shoot at: one of those up in sight, picked in the view or with T; none, the nearest */
      case "eTarget": {
        const b = a.id === null || a.id === undefined ? null : Esc.sighted(S, sh).find(o => o.b.id === a.id);
        sh.gunTgt = b ? b.b.id : null;
        ev.push({ t: "eTarget", id: sh.gunTgt, name: b ? b.b.name : "", d: b ? b.d : 0 });
        break;
      }
      /* her guns: every one that is on her target, in its reach and loaded fires; none, and she says why */
      case "egun": {
        const q = Esc.target(S, sh);
        if (!q) { ev.push({ t: "noGunTarget" }); break; }
        const G = Esc.guns(S, sh, q), go = G.filter(o => o.bears && o.load <= 0);
        if (!go.length) { ev.push({ t: "gunHold", why: G.some(o => o.bears) ? "loading" : G.some(o => o.inArc && o.inRange) ? "training" : G.some(o => o.inArc) ? "range" : "arc" }); break; }
        for (const o of go) {
          o.m.t = o.g.reload; S.stats.escShots = (S.stats.escShots || 0) + 1;
          const p = 0.5 * Math.pow(1 - q.d / o.g.range, 1.4) * (0.4 + Det.light(S) * 0.6);
          if (PP.rand(S) < p) { S.stats.escHits = (S.stats.escHits || 0) + 1; Sub.hurt(S, (0.06 + PP.rand(S) * 0.08) * o.g.dmg, "deck", ev, q.b, "gun"); ev.push({ t: "eGunHit", id: q.b.id, d: q.d, k: o.g.k }); }
          else ev.push({ t: "eGunMiss", x: q.b.x + (PP.rand(S) - 0.5) * 120, y: q.b.y + (PP.rand(S) - 0.5) * 120, d: q.d, k: o.g.k });
          ev.push({ t: "escortGun", id: sh.id, by: q.b.id, k: o.g.k });
        }
        break;
      }
      /* AUTO / USER CONTROL for the escort you are aboard: on AUTO her own captain sails her under her order */
      case "auto": {
        sh.auto = a.v === undefined ? !sh.auto : !!a.v;
        if (sh.auto) { sh.ai.st = "lost"; sh.ai.t = 0; sh.pat = null; } else { sh.ai.st = "user"; sh.ordHdg = sh.hdg; }
        ev.push({ t: "auto", on: sh.auto, name: sh.name });
        break;
      }
      case "commandEsc": { const q = S.ships.find(o => o.id === a.id && Sh.alive(o) && o.role === "escort"); if (q && q.id !== S.flag) Esc.take(S, q, ev); break; }
      case "eorders": { const q = S.ships.find(o => o.id === a.id && Sh.alive(o) && o.role === "escort"); if (q && C.ESC_ORDERS.some(o => o[0] === a.v)) { q.ord = a.v; ev.push({ t: "eorders", id: q.id, name: q.name, v: a.v }); } break; }
      case "ewp": { const q = S.ships.find(o => o.id === a.id && Sh.alive(o) && o.role === "escort"); if (q) { if (a.clear || !q.wps) q.wps = []; if (a.x !== undefined && q.wps.length < 12) q.wps.push({ x: a.x, y: a.y }); } break; }
    }
  };
  /* take command of escort q: the one you leave goes back to her order, under her own captain */
  Esc.take = (S, q, ev = []) => {
    const was = S.ships.find(o => o.id === S.flag);
    if (was && Sh.alive(was)) { was.ai.st = "lost"; was.ai.t = 0; was.pat = null; }
    S.flag = q.id; q.ai.st = "user"; q.auto = false; q.ord = q.ord || "screen";
    if (q.bell === undefined) q.bell = 4;
    q.ordSpd = C.ESC_BELL_F[q.bell] * C.SHIPS[q.cls].kn; q.ordHdg = q.hdg;
    if (q.dcSet === undefined) q.dcSet = 150;
    if (q.dcLeft === undefined) q.dcLeft = C.ESC_SIDE.charges;
    if (q.hhLeft === undefined) q.hhLeft = C.monthOf(S.t) >= C.ESC_SIDE.hedgehogFrom ? C.ESC_SIDE.hedgehogs : 0;
    ev.push({ t: "command", id: q.id, name: q.name });
  };
  /* the hedgehog: a ring of 24 bombs ahead of her, that go off only on a hull */
  function hedgehog(S, sh, ev) {
    const X = C.ESC_SIDE;
    if (C.monthOf(S.t) < X.hedgehogFrom) { ev.push({ t: "noHedgehog" }); return; }
    if ((sh.hhLeft || 0) <= 0) { ev.push({ t: "noHedgehog", empty: true }); return; }
    sh.hhLeft--;
    const cx = sh.x + PP.hx(sh.hdg) * X.hhRange, cy = sh.y + PP.hy(sh.hdg) * X.hhRange;
    for (let i = 0; i < 24; i++) { const an = i / 24 * PP.TAU; S.charges.push({ id: S.nextId++, x: cx + Math.cos(an) * X.hhRing, y: cy + Math.sin(an) * X.hhRing, z: 0, set: 900, by: sh.id, hh: true }); }
    S.stats.hedgehogs = (S.stats.hedgehogs || 0) + 1;
    ev.push({ t: "hedgehogAway", id: sh.id });
  }

  /* the attack as her bridge sees it (read only, for the dashboard and the map's panel): the freshest contact any
   * of ours holds, where it is now, where it will be when what she fires reaches its depth, and whether firing now
   * puts it there. over: the pattern laid now lies across that point (the hedgehog: the point is in its ring);
   * near: close enough to stand by. ready / need: the charges loaded for the pattern, and how many it takes */
  /* the boats up in sight: on the surface and seen in the last few seconds, the nearest first */
  Esc.sighted = (S, sh) => E_().afloat(S).filter(b => Sub.surfaced(b) && b.seenT !== undefined && S.t - b.seenT < 10)
    .map(b => ({ b, d: PP.dist(sh.x, sh.y, b.x, b.y) })).sort((p, r) => p.d - r.d);
  /* her target: the boat picked, while she is up in sight; else the nearest that is */
  Esc.target = (S, sh) => { const L = Esc.sighted(S, sh); return L.find(o => o.b.id === sh.gunTgt) || L[0] || null; };
  /* her guns as mounted (C.ESC_GUNS): each one's training, radians off where it stows (right ahead for a gun
   * forward, right astern for one aft), and the seconds left on its reload. Made when first wanted */
  Esc.mounts = sh => {
    const G = C.ESC_GUNS[sh.cls] || C.ESC_GUNS.frigate;
    if (!sh.gm || sh.gm.length !== G.length) sh.gm = G.map(() => ({ u: 0, t: 0 }));
    return sh.gm;
  };
  /* each gun against a boat: where to lay it (as far round as its arc lets it), whether she is in its arc and its
   * reach, whether it is on her (within a couple of degrees), its reload, and where it points now off her bow */
  Esc.guns = (S, sh, t = Esc.target(S, sh)) => {
    const G = C.ESC_GUNS[sh.cls] || C.ESC_GUNS.frigate, M = Esc.mounts(sh);
    const rel = t ? PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, t.b.x, t.b.y)) : 0;
    return G.map((g, i) => {
      const lim = (g.fwd ? g.arc : 180 - g.arc) * PP.DEG, want = t ? (g.fwd ? rel : PP.angDiff(Math.PI, rel)) : 0;
      const inArc = !!t && Math.abs(want) <= lim, inRange = !!t && t.d < g.range, aim = PP.clamp(want, -lim, lim);
      const on = inArc && Math.abs(M[i].u - aim) < 2 * PP.DEG;
      return { g, m: M[i], aim, rel: g.fwd ? M[i].u : Math.PI + M[i].u, inArc, inRange, bears: on && inRange, load: M[i].t };
    });
  };
  /* whether any gun of hers would fire on her target now */
  Esc.gunReady = (S, sh) => Esc.guns(S, sh).some(o => o.bears && o.load <= 0);
  Esc.solution = (S, f) => {
    const X = C.ESC_SIDE, best = Esc.mine(S).filter(q => q.ai.datum && q.ai.contact).sort((a, b) => b.ai.contact - a.ai.contact)[0];
    const k = f.patK || 0, hh = k === C.ESC_PATTERNS.length, P = C.ESC_PATTERNS[hh ? 0 : k];
    const d = f.dcr || { P: 0, S: 0, R: 0 }, two = P.deep ? 2 : 1, side = P.throws.length * two;
    const ready = hh ? Math.min(1, f.hhLeft || 0) : Math.min(P.rails * two, d.R) + Math.min(side, d.P) + Math.min(side, d.S), need = hh ? 1 : C.patCount(P);
    const out = { hh, ready, need, contact: null };
    if (!best || S.t - best.ai.contact > 900) return out;
    const c = best.ai.datum, age = S.t - best.ai.contact, since = S.t - (c.t !== undefined ? c.t : best.ai.contact);
    const surf = best.ai.how === "eye" || best.ai.how === "radar", dz = surf ? 0 : best.ai.dz || 150;
    const nx = c.x + (c.vx || 0) * since, ny = c.y + (c.vy || 0) * since;
    const lead = since + (surf ? 0 : hh ? dz / X.hhSink + 2.6 : Esc.sinkT(dz));
    const ax = c.x + (c.vx || 0) * lead, ay = c.y + (c.vy || 0) * lead, ra = PP.dist(f.x, f.y, ax, ay);
    const off = Math.abs(PP.angDiff(f.hdg, PP.angTo(f.x, f.y, ax, ay)));
    const over = age < 60 && (hh ? Math.abs(ra * Math.cos(off) - X.hhRange) < X.hhRing + 15 && ra * Math.sin(off) < X.hhRing + 15
      : ra < (P.rails - 1) * C.DC.spacing / 2 + 40);
    out.contact = { by: best, how: best.ai.how, age, surf, dz, brg: PP.angTo(f.x, f.y, nx, ny), rng: PP.dist(f.x, f.y, nx, ny),
      aim: { x: ax, y: ay }, aimRng: ra, over, near: !over && ra < (hh ? 700 : 600) };
    return out;
  };

  /* her launchers: P and S, the charges ready in the port and starboard throwers, R those in the racks down to the
   * rails; dcLeft counts every charge aboard, so what is not in a launcher is below, in reserve. Made when first
   * wanted, from what she has (an older save has none) */
  Esc.racks = sh => {
    if (!sh.dcr) {
      const X = C.ESC_SIDE, n = sh.dcLeft || 0, P = Math.min(X.throwers, n), St = Math.min(X.throwers, n - P);
      sh.dcr = { P, S: St, R: Math.min(X.rails, n - P - St), tP: 0, tS: 0, tR: 0 };
    }
    return sh.dcr;
  };
  Esc.reserve = sh => { const d = Esc.racks(sh); return Math.max(0, (sh.dcLeft || 0) - d.P - d.S - d.R); };
  /* the crews load the launchers from below, one charge at a time each (a thrower's crew six seconds a charge, the
   * racks three), and stand clear while a pattern is going: so a pattern drains them, and a big one takes a while
   * to come back from */
  function reload(sh, dt) {
    const X = C.ESC_SIDE, d = Esc.racks(sh);
    if (sh.pat) return;
    for (const [k, cap, t] of [["P", X.throwers, X.loadThrow], ["S", X.throwers, X.loadThrow], ["R", X.rails, X.loadRail]]) {
      if (d[k] >= cap || Esc.reserve(sh) <= 0) { d["t" + k] = 0; continue; }
      d["t" + k] += dt;
      if (d["t" + k] >= t) { d["t" + k] = 0; d[k]++; }
    }
  }
  /* the next rail of the pattern she is laying, and the throwers when it is their turn: each charge from its
   * launcher, so an empty one leaves its place in the pattern empty */
  function lay(S, sh) {
    const P = C.ESC_PATTERNS[sh.pat.p || 0], k = sh.pat.k, hx = PP.hx(sh.hdg), hy = PP.hy(sh.hdg), ax = Math.cos(sh.hdg), ay = Math.sin(sh.hdg), d = Esc.racks(sh);
    const one = (x, y, z, from) => { if (d[from] <= 0 || sh.dcLeft <= 0) return; d[from]--; sh.dcLeft--; Esc.charge(S, x, y, z, sh.id); };
    const two = (x, y, z, from) => { one(x, y, z, from); if (P.deep) one(x, y, z + P.deep, from); };
    const rx = sh.x - hx * 20, ry = sh.y - hy * 20;
    two(rx, ry, sh.dcSet + (k % 2 ? 25 : -10), "R");
    for (const [after, out] of P.throws) if (after === k) for (const side of [-1, 1]) two(rx + ax * out * side, ry + ay * out * side, sh.dcSet + PP.gauss(() => PP.rand(S)) * 10, side < 0 ? "P" : "S");
    sh.pat.at = { x: sh.x, y: sh.y }; sh.pat.k++;
  }
  Esc.user = (S, sh, dt, ev) => {
    sh.lit = false;
    /* her guns train round toward her target (back to where they stow with none), never across their own dead arc,
     * and reload */
    for (const o of Esc.guns(S, sh)) { const st = o.g.train * PP.DEG * dt; o.m.u += PP.clamp(o.aim - o.m.u, -st, st); if (o.m.t > 0) o.m.t = Math.max(0, o.m.t - dt); }
    reload(sh, dt);
    /* the rest of an ordered pattern, off the rails along her track */
    if (sh.pat) {
      if (!sh.pat.at || PP.dist(sh.x, sh.y, sh.pat.at.x, sh.pat.at.y) >= C.DC.spacing) lay(S, sh);
      if (sh.pat.k >= C.ESC_PATTERNS[sh.pat.p || 0].rails || sh.dcLeft <= 0 || sh.spd < 2) sh.pat = null;
    }
    /* running down a boat that is up, or nearly */
    for (const q of E_().afloat(S)) if (PP.dist(sh.x, sh.y, q.x, q.y) < 45 && q.depth < 20 && sh.spd > 6) {
      S.stats.rams = (S.stats.rams || 0) + 1;
      Sub.hurt(S, 0.9, "mid", ev, q, "ram"); Sh.hit(S, sh, 0.35, "fore", ev, false, "ram");
      ev.push({ t: "rammed", id: sh.id, by: q.id, ours: true });
    }
  };

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
    /* the patrol planes come only to a mission that asks for them (S.air); none does yet */
    if (S.air && S.phase === "sea" && (day || e.planeRadar)) {
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
