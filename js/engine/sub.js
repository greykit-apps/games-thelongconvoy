/* PumaPack -- our boat: the helm, the telegraph, the diving planes and
 * the ballast, the diesels and the battery, the periscope, and the damage.
 *
 * The helm steers to an ordered course, the telegraph to an ordered speed,
 * the planes to an ordered depth: the orders are yours, the boat takes its
 * time getting there. On the surface the diesels drive her and charge the
 * battery, and burn fuel; under the water the battery does everything, and
 * runs down the faster she goes. Every system can be hurt: the crew repair
 * one thing at a time, worst first. */
"use strict";
(() => {
  const C = PP.C, Sea = PP.Sea, Sub = PP.Sub = {};
  Sub.SYS = [
    ["planes", "Diving planes", 900], ["pumps", "Pumps", 700], ["motors", "Motors", 1500], ["engines", "Diesels", 2400],
    ["battery", "Battery", 3600], ["tubesF", "Forward tubes", 1200], ["tubesA", "After tubes", 1200], ["scope", "Periscope", 1800],
    ["radar", "Radar", 1500], ["sonar", "Hydrophones", 900], ["gun", "Deck gun", 1100],
  ];
  /* what only a yard can mend, when the reality says so */
  Sub.PORT_ONLY = ["battery", "scope"];

  Sub.make = (cls, name, mi) => {
    const k = C.SUBS[cls], e = C.era(mi);
    const tube = n => Array.from({ length: n }, () => 0);
    return {
      cls, name, x: 0, y: 0, hdg: 0, ordHdg: 0, spd: 0, bell: 1, depth: 0, ordDepth: 0, vz: 0, crashing: false,
      scope: { up: false, h: 0, brg: 0, hi: false }, radarOn: false, radar: e.subRadar, silent: false,
      bat: 1, fuel: 1, water: 0, hull: 1, sys: Object.fromEntries(Sub.SYS.map(([s]) => [s, 0])), fixing: null,
      tubes: { F: tube(k.tubesF), A: tube(k.tubesA) }, mark: e.torp,
      store: { F: Math.round((k.torps - k.tubesF - k.tubesA) * (k.tubesA ? 0.62 : 1)), A: 0 },
      shells: k.shells, gun: { man: 0, on: false, brg: 0, rng: 2500, reload: 0 },
      bank: "F", spread: 3, creakT: 0, bottomed: false, aground: false,
    };
  };
  Sub.init = s => { const k = C.SUBS[s.cls]; s.store.A = Math.max(0, k.torps - k.tubesF - k.tubesA - s.store.F); return s; };

  /* ---- what she can do now ---- */
  Sub.surfaced = s => s.depth <= 2;
  Sub.scopeReady = s => s.scope.up && s.scope.h >= 1 && s.depth <= C.PD + 4 && s.sys.scope < 0.5;
  /* feet of periscope (or tower) above the sea, for being seen */
  Sub.exposed = s => Sub.surfaced(s) ? 14 : s.scope.up && s.scope.h > 0.2 ? Math.max(0, C.PD + 7 - s.depth) * s.scope.h : 0;
  Sub.radarWorks = s => s.radar && s.radarOn && s.depth <= C.RADAR_DEPTH && s.sys.radar < 0.5;
  Sub.maxKn = s => {
    const k = C.SUBS[s.cls];
    if (Sub.surfaced(s)) return k.surf * (1 - s.sys.engines * 0.85);
    return s.bat <= 0.002 ? 0.6 : k.sub * (1 - s.sys.motors * 0.8);
  };
  Sub.bellMax = s => s.silent ? 2 : 6;
  Sub.testDepth = s => C.SUBS[s.cls].test;
  Sub.crushDepth = s => C.SUBS[s.cls].crush * (0.6 + 0.4 * s.hull);
  Sub.batCap = s => 1 - s.sys.battery * 0.8;
  /* the diesels charge the battery: surfaced, with fuel, the diesels sound enough, no faster than
   * chargeKn + 4, and room in the cells; fastest stopped. why, when surfaced and not charging */
  Sub.charge = s => {
    if (!Sub.surfaced(s)) return { rate: 0, why: "down" };
    const top = C.BAT.chargeKn + 4, cap = Sub.batCap(s);
    const why = s.bat >= cap ? (cap < 0.995 ? "cap" : "full") : s.fuel <= 0 ? "fuel" : s.sys.engines >= 0.6 ? "engines" : Math.abs(s.spd) > top ? "fast" : null;
    return { rate: why ? 0 : C.BAT.charge * PP.clamp(1 - Math.abs(s.spd) / top, 0.15, 1), why };
  };
  /* how loud she is: the escorts' hydrophones hear this */
  Sub.noise = s => {
    const N = C.NOISE;
    let n = N.base + Math.pow(s.spd / 9, 2);
    if (!Sub.surfaced(s) && s.depth < N.cavDepth && s.spd > N.cavKn) n += N.cav;
    if (Sub.surfaced(s)) n += N.diesel;
    for (const [k] of Sub.SYS) n += s.sys[k] * 0.06;
    if (s.bottomed && s.spd < 0.5) n *= 0.4;
    return s.silent ? n * N.silent : n;
  };
  /* the reload store each bank draws on */
  Sub.loaded = (s, bank) => s.tubes[bank].filter(v => v === 0).length;
  Sub.torpsLeft = s => Sub.loaded(s, "F") + Sub.loaded(s, "A") + s.tubes.F.filter(v => v > 0).length + s.tubes.A.filter(v => v > 0).length + s.store.F + s.store.A;

  /* ---- orders ---- */
  Sub.order = (S, a, ev) => {
    const s = S.sub, test = Sub.testDepth(s), bot = Sea.depthAt(s.x, s.y);
    switch (a.a) {
      case "bell":
        /* silent running holds her at a third: say so, or the telegraph just seems stuck */
        if (a.d > 0 && s.silent && s.bell >= Sub.bellMax(s)) { ev.push({ t: "bellCapped" }); break; }
        s.bell = PP.clamp(s.bell + a.d, 0, Sub.bellMax(s)); ev.push({ t: "ordered", what: "bell" }); break;
      case "setBell": s.bell = PP.clamp(a.v, 0, Sub.bellMax(s)); break;
      case "hdg": s.ordHdg = PP.normAng(a.v); break;
      case "depth": {
        const step = a.d > 0 ? 25 : -25, base = s.ordDepth <= 0 && a.d > 0 ? 0 : s.ordDepth;
        let d = PP.clamp(Math.round((base + step) / 5) * 5, 0, test + 100);
        if (base < C.PD && d > 0 && a.d > 0) d = C.PD;
        if (s.ordDepth > C.PD && d < C.PD && a.d < 0) d = C.PD;
        if (s.ordDepth === C.PD && a.d < 0) d = 0;
        s.ordDepth = d; s.crashing = false;
        if (d > 0 && Sub.surfaced(s)) { ev.push({ t: "diveAlarm" }); s.radarOn = s.radarOn && false; }
        ev.push({ t: "ordered", what: "depth" });
        break;
      }
      case "setDepth": s.ordDepth = PP.clamp(Math.round(a.v / 5) * 5, 0, test + 100); s.crashing = false; break;
      case "surface": s.ordDepth = 0; s.crashing = false; ev.push({ t: "ordered", what: "surface" }); break;
      case "pd": s.ordDepth = C.PD; s.crashing = false; if (Sub.surfaced(s)) ev.push({ t: "diveAlarm" }); ev.push({ t: "ordered", what: "pd" }); break;
      case "dive": s.ordDepth = Math.max(C.PD, s.ordDepth); s.crashing = false; if (Sub.surfaced(s)) ev.push({ t: "diveAlarm" }); break;
      case "crash": {
        s.ordDepth = PP.clamp(Math.min(Math.round(test * 0.6 / 10) * 10, Math.floor((bot - 25) / 5) * 5), C.PD, test);
        s.crashing = true; s.bell = Math.max(s.bell, 5); s.scope.up = false; s.gun.on = false;
        ev.push({ t: "diveAlarm", crash: true });
        break;
      }
      case "scope": {
        const up = a.v === undefined ? !s.scope.up : a.v;
        if (up && s.sys.scope >= 0.5) { ev.push({ t: "scopeBroken" }); break; }
        if (up && s.depth > C.PD + 4) { ev.push({ t: "tooDeep" }); break; }
        if (up !== s.scope.up) { s.scope.up = up; ev.push({ t: up ? "scopeUp" : "scopeDown" }); }
        break;
      }
      case "train": s.scope.brg = PP.normAng(s.scope.brg + a.d); break;
      case "setTrain": s.scope.brg = PP.normAng(a.v); break;
      case "zoom": s.scope.hi = !s.scope.hi; break;
      case "radar": if (!s.radar) ev.push({ t: "noRadar" }); else { s.radarOn = !s.radarOn; ev.push({ t: "radar", on: s.radarOn }); } break;
      case "silent": s.silent = !s.silent; if (s.silent) s.bell = Math.min(s.bell, 2); ev.push({ t: "silent", on: s.silent }); break;
      case "bank": s.bank = a.v || (s.bank === "F" ? "A" : "F"); ev.push({ t: "bank", bank: s.bank }); break;
      case "spread": s.spread = a.v || (s.spread % 4) + 1; ev.push({ t: "spread", n: s.spread }); break;
    }
  };

  /* ---- a step of the boat ---- */
  Sub.step = (S, dt, ev) => {
    const s = S.sub, k = C.SUBS[s.cls];
    const surf = Sub.surfaced(s);
    /* the telegraph and the speed through the water */
    s.bell = Math.min(s.bell, Sub.bellMax(s));
    const target = C.BELL_F[s.bell] * Sub.maxKn(s);
    s.spd += (target - s.spd) * (1 - Math.exp(-dt / C.ACCEL));
    /* the helm: to the ordered course, as fast as the speed lets the rudder bite */
    const rate = C.TURN * PP.clamp(Math.abs(s.spd) / 6, 0.12, 1) * dt, dh = PP.angDiff(s.hdg, s.ordHdg);
    s.hdg = PP.normAng(s.hdg + PP.clamp(dh, -rate, rate));
    /* the planes and the ballast, to the ordered depth */
    const bot = Sea.depthAt(s.x, s.y), planesF = PP.clamp(Math.abs(s.spd) / C.DIVE.planesKn, 0.35, 1) * (1 - s.sys.planes * 0.8);
    const want = s.ordDepth - s.depth;
    let vzT = want > 0 ? Math.min(want / 7, (s.crashing ? C.DIVE.crash : C.DIVE.rate) * planesF) : Math.max(want / 7, -C.DIVE.blow * (s.ordDepth === 0 ? 1 : planesF));
    if (s.sys.planes >= 0.92 && s.ordDepth > 0) vzT = 0;
    /* water in her makes her heavy: she sinks unless she is blowing for the surface */
    if (s.water > C.WATER.heavy) vzT += C.WATER.sinkRate * (s.water - C.WATER.heavy) / (1 - C.WATER.heavy) * (s.ordDepth === 0 ? 0.5 : 1);
    s.vz += (vzT - s.vz) * (1 - Math.exp(-dt / 5));
    const wasSurf = surf;
    s.depth += s.vz * dt;
    if (s.depth <= 0) { s.depth = 0; s.vz = Math.max(0, s.vz); }
    if (s.crashing && s.depth >= s.ordDepth - 5) s.crashing = false;
    /* the bottom */
    s.bottomed = false;
    if (bot > 0 && s.depth > bot - 3 && s.depth > 0) {
      if (s.vz > 1.2) { Sub.hurt(S, Math.min(0.3, s.vz * 0.05), "bottom", ev); ev.push({ t: "bottomHit" }); }
      s.depth = Math.max(0, bot - 3); s.vz = Math.min(0, s.vz); s.bottomed = true;
    }
    if (!wasSurf && Sub.surfaced(s)) { ev.push({ t: "surfaced" }); s.scope.up = false; }
    if (wasSurf && !Sub.surfaced(s)) { ev.push({ t: "submerged" }); s.gun.on = false; s.gun.man = 0; s.radarOn = s.radarOn && s.depth <= C.RADAR_DEPTH; }
    if (s.ordDepth > 0 && Math.abs(s.depth - s.ordDepth) < 2 && !s.atDepth) { s.atDepth = true; ev.push({ t: "atDepth", d: s.ordDepth }); }
    if (Math.abs(s.depth - s.ordDepth) > 6) s.atDepth = false;
    /* moving: into shallows she runs aground */
    const nx = s.x + PP.hx(s.hdg) * s.spd * PP.KN * dt, ny = s.y + PP.hy(s.hdg) * s.spd * PP.KN * dt;
    const nb = Sea.depthAt(nx, ny);
    if (nb < 16 || !Sea.inside(nx, ny)) {
      if (!s.aground) { ev.push({ t: "aground" }); if (s.spd > 4) Sub.hurt(S, 0.08, "bottom", ev); }
      s.aground = true; s.spd = Math.min(s.spd, 0) * 0.5;
    } else { s.x = nx; s.y = ny; s.aground = false; }
    /* the periscope going up and down */
    if (s.scope.up && s.depth > C.PD + 6) { s.scope.up = false; ev.push({ t: "scopeDown", forced: true }); }
    s.scope.h = PP.clamp(s.scope.h + (s.scope.up ? dt / 3.5 : -dt / 2.5), 0, 1);
    if (Sub.surfaced(s)) s.scope.h = 0;
    /* power */
    const cap = Sub.batCap(s);
    if (Sub.surfaced(s)) {
      const f = C.FUEL.c * (0.3 + 0.7 * Math.pow(Math.abs(s.spd) / 10, 3)) / k.fuel;
      let burn = f;
      const ch = Sub.charge(s);
      if (ch.rate > 0) { s.bat = Math.min(cap, s.bat + ch.rate * dt); burn += C.FUEL.charging; }
      s.fuel = Math.max(0, s.fuel - burn * dt);
      if (s.fuel <= 0 && !s.outFuel) { s.outFuel = true; ev.push({ t: "fuelOut" }); }
    } else {
      const was = s.bat;
      s.bat = Math.max(0, s.bat - (C.BAT.a + C.BAT.b * Math.pow(Math.abs(s.spd), 3)) / k.bat * dt);
      if (was > 0.2 && s.bat <= 0.2) ev.push({ t: "batLow" });
      if (was > 0.002 && s.bat <= 0.002) ev.push({ t: "batFlat" });
    }
    s.bat = Math.min(s.bat, cap);
    if (s.fuel > 0) s.outFuel = false;
    const wasFuel = s.fuel + 1e-9;
    if (wasFuel > 0.15 && s.fuel <= 0.15 && !s.fuelWarned) { s.fuelWarned = true; ev.push({ t: "fuelLow" }); }
    /* water: what the hull lets in, what the pumps send out (not when running silent) */
    const leak = Math.pow(1 - s.hull, 1.6) / 1100 * (1 + s.depth / 400);
    const pump = s.silent ? 0 : C.WATER.pump * (1 - s.sys.pumps);
    const wasW = s.water;
    s.water = PP.clamp(s.water + (leak - pump) * dt, 0, 1);
    if (wasW < 0.25 && s.water >= 0.25) ev.push({ t: "flooding" });
    /* depth and the hull */
    const test = Sub.testDepth(s), crush = Sub.crushDepth(s);
    S.stats.maxDepth = Math.max(S.stats.maxDepth, s.depth);
    if (s.depth > test) {
      s.creakT -= dt;
      if (s.creakT <= 0) { s.creakT = 6 + 20 * (1 - (s.depth - test) / Math.max(1, crush - test)); ev.push({ t: "creak", d: s.depth }); }
      if (s.depth > test + (crush - test) * 0.5) s.hull = Math.max(0, s.hull - dt * (s.depth - test) / (crush - test) / 900);
    }
    if (s.depth >= crush) return Sub.lost(S, "crushed", ev);
    if (s.water >= C.WATER.lost) return Sub.lost(S, "flooded", ev);
    Sub.repair(S, dt, ev);
  };

  /* ---- damage ---- */
  /* sev 0..1; where: "fore", "aft", "mid", "bottom", "deck" */
  Sub.hurt = (S, sev, where, ev, s = S.sub) => {
    if (!s || s.lost) return;
    if (S.konami) sev *= 0.15;
    s.hull = Math.max(0, s.hull - sev * (where === "deck" ? 0.5 : 0.7));
    const pool = { fore: ["tubesF", "planes", "sonar", "battery", "pumps"], aft: ["tubesA", "motors", "engines", "planes", "pumps"],
      mid: ["scope", "radar", "battery", "pumps", "engines", "gun", "sonar"], bottom: ["planes", "pumps", "sonar", "battery"],
      deck: ["gun", "scope", "radar", "engines"] }[where] || Sub.SYS.map(([k]) => k);
    const n = sev > 0.5 ? 3 : sev > 0.2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const k = PP.pick(() => PP.rand(S), pool), was = s.sys[k];
      s.sys[k] = PP.clamp(was + sev * (0.5 + PP.rand(S)), 0, 1);
      if (s.sys[k] > 0.12 && was <= 0.12) ev.push({ t: "sysHit", sys: k, sev: s.sys[k], by: s.id });
    }
    S.stats.dmg += sev;
    ev.push({ t: "hullHit", sev, hull: s.hull, by: s.id });
  };
  Sub.portOnly = (S, k) => S.real.portOnly && Sub.PORT_ONLY.includes(k);
  Sub.repair = (S, dt, ev) => {
    const s = S.sub;
    if (s.fixing === null || s.sys[s.fixing] <= 0 || Sub.portOnly(S, s.fixing)) {
      let best = null, bv = 0.001;
      for (const [k] of Sub.SYS) { if (Sub.portOnly(S, k)) continue; const v = s.sys[k] * (k === "planes" || k === "pumps" ? 2 : k === "motors" ? 1.5 : 1); if (v > bv) { bv = v; best = k; } }
      if (best === null && !S.real.portOnly && s.hull < 1) best = "hull";
      s.fixing = best;
    }
    if (!s.fixing) return;
    if (s.fixing === "hull") {
      if (S.real.portOnly) { s.fixing = null; return; }
      s.hull = Math.min(1, s.hull + dt / 7200);
      if (s.hull >= 1) { s.fixing = null; ev.push({ t: "repaired", sys: "hull" }); }
      return;
    }
    const T = (Sub.SYS.find(q => q[0] === s.fixing) || [0, 0, 1200])[2];
    s.sys[s.fixing] = Math.max(0, s.sys[s.fixing] - dt / T);
    if (s.sys[s.fixing] <= 0) { ev.push({ t: "repaired", sys: s.fixing }); s.fixing = null; }
  };
  Sub.repairAll = s => { for (const [k] of Sub.SYS) s.sys[k] = 0; s.hull = 1; s.water = 0; s.fixing = null; };
  /* a boat lost: the action ends when the last of the pack goes (the engine passes command on) */
  Sub.lost = (S, why, ev, s = S.sub) => {
    if (S.phase === "over" || !s || s.lost) return;
    s.lost = why; s.spd = 0; s.scope.up = false; s.gun.on = false; s.lostT = S.t;
    ev.push({ t: "subLost", why, by: s.id, name: s.name });
    if (!S.subs.some(q => !q.lost)) { S.phase = "over"; S.end = { why, t: S.t }; }
  };
})();
