/* PumaPack -- what there is to play: target practice, the convoy
 * actions (single engagements, each its own night or day of the war), a
 * custom action, and the war itself: patrols out of port into the Empire's
 * waters, and a career across them.
 *
 * On patrol the Empire's convoys run their lanes whether we are near or
 * not, more of them early in the war, fewer and better guarded later. */
"use strict";
(() => {
  const C = PP.C, Sea = PP.Sea, Sh = PP.Ships, Sub = PP.Sub, E = PP.Engine = PP.Engine || {};
  const NM = PP.YD_NM, R = S => PP.rand(S);
  const H = h => h * 3600;

  /* ---- the missions: after the 1990 game's, on our sea (tools/ORIGINAL.md has theirs) ----
   * when: month of the war and hour; at: the convoy's position (nm), heading (deg); spd: the convoy's knots
   * (else its slowest ship's, less one). boats: the pack, the first the one you start in, each
   * [class, ahead, to starboard (yd) of the convoy, depth (ft; 0 on the surface), "with" to sail with the
   * convoy rather than toward it]. hunt: the escorts start the mission hunting the pack. side: whose
   * missions they are; the escorts' side comes in a later milestone */
  const PD = 60;
  E.ACTIONS = [
    { id: "easy", name: "Easy Pickings", note: "Five ships forming up for a convoy, no escort yet, in daylight. Two boats: try the attack from each.", mi: 50, hour: 10, day: 6, wx: "clear",
      at: [700, 330], hdg: 260, spd: 3, conv: { kinds: ["freighter", "freighter", "freighter", "tanker", "tanker"], n: 5, escorts: 0, fixed: true },
      boats: [["catamount", 6500, 3200, 0], ["caracal", 5500, -3800, PD]] },
    { id: "pinned", name: "Pinned Down", note: "One destroyer has two of the pack held down. Sink it, or slip it: deep, slow and quiet.", mi: 50, hour: 14, day: 9, wx: "clear",
      at: [342, 380], hdg: 2, spd: 0, hunt: true, conv: { kinds: [], n: 0, escorts: 0, esc: ["destroyer"], fixed: true },
      boats: [["caracal", 2600, 900, PD], ["caracal", 1800, -1600, 220]] },
    { id: "inside", name: "Inside the Convoy", note: "Night, the first year: two boats on the surface in among eighteen ships and eight escorts. Down to periscope depth, and help yourselves.", mi: 2, hour: 1, day: 2, wx: "clear",
      at: [450, 560], hdg: 270, conv: { kinds: ["freighter", "freighter", "freighter", "liner", "tanker", "coaster"], n: 18, escorts: 8 },
      boats: [["caracal", 300, 450, 0, "with"], ["caracal", -700, -450, 0, "with"]] },
    { id: "gather", name: "Gather the Pack", note: "A big convoy at night, already under attack. Four boats closing from all round it: bring them in together.", mi: 16, hour: 23, day: 20, wx: "overcast",
      at: [400, 200], hdg: 315, conv: { kinds: ["freighter", "liner", "tanker", "coaster"], n: 18, escorts: 8 },
      boats: [["caracal", 12000, 5000, PD], ["caracal", 9000, -7000, 0], ["cougar", -6000, 9000, 0], ["caracal", 16000, -1000, PD]] },
    { id: "strait", name: "The Kessrin Strait", note: "A supply convoy about to clear the strait for open water. Six boats strung across its way out; stop it in the narrows.", mi: 17, hour: 2, day: 6, wx: "clear",
      at: [520, 330], hdg: 300, conv: { kinds: ["freighter", "tanker", "liner", "troopship"], n: 18, escorts: 8 },
      boats: [["cougar", 9000, 0, PD], ["caracal", 8500, 4000, PD], ["caracal", 8500, -4000, PD], ["caracal", 13000, 2500, 0], ["caracal", 13000, -2500, 0], ["caracal", 6000, 7000, PD]] },
  ];
  E.CUSTOM = {
    when: [[2, "Year I"], [14, "Year II"], [26, "Year III"], [38, "Year IV"]],
    pack: [["1", "One boat"], ["2", "Two"], ["3", "Three"], ["4", "Four"]],
    size: [["small", "Small", 3], ["medium", "Medium", 6], ["large", "Large", 9]],
    escorts: [["none", "None", 0], ["light", "Light", 1], ["heavy", "Heavy", 2]],
    time: [["day", "Day", 11], ["dusk", "Dusk", 18.4], ["night", "Night", 0.5]],
    wx: [["clear", "Clear"], ["overcast", "Overcast"], ["squall", "Squalls"], ["fog", "Fog"]],
  };

  /* ---- a fresh state ---- */
  E.base = ({ seed, mode, mi = 0, hour = 12, day = 1, real, cls, name = "Talus" }) => {
    const S = {
      v: 1, seed, rs: seed | 0, mode, phase: "sea", t: C.monthStart(mi) + (day - 1) * C.DAY + H(hour), tcReq: 0, tcCap: C.TC_MAX_IDX, nextId: 1,
      /* the 1990 game had no angle on the bow to judge: the boat's fire control solves every shot */
      real: Object.assign({}, real, { aob: false }), wx: { k: "clear", vis: 1, sea: 2, until: 0 }, subs: [], cmd: 0, ships: [], convoys: [], torps: [], charges: [], shells: [], planes: [],
      log: [], stats: { tons: 0, sunk: [], fired: 0, hits: 0, duds: 0, charges: 0, dcNear: 0, dmg: 0, maxDepth: 0, shells: 0 },
      konami: false, cheated: false, end: null, nameI: 0, potential: 0, msg: null,
    };
    E.link(S);
    E.addBoat(S, cls, name);
    return S;
  };
  /* the pack: every boat is in S.subs; S.sub and S.tdc are the one in command (and, while the
   * engine runs another, that one). They are not saved: E.link puts them back after a load */
  E.link = S => {
    Object.defineProperty(S, "sub", { get() { return this.subs[this.cmd] || null; }, set(v) { this.subs[this.cmd] = v; }, enumerable: false, configurable: true });
    Object.defineProperty(S, "tdc", { get() { const s = this.subs[this.cmd]; return s ? s.tdc : PP.Weapons.newTdc(); }, set(v) { this.subs[this.cmd].tdc = v; }, enumerable: false, configurable: true });
    return S;
  };
  E.addBoat = (S, cls, name) => {
    const s = Sub.init(Sub.make(cls, name, C.monthOf(S.t)));
    s.id = S.nextId++; s.tdc = PP.Weapons.newTdc(); s.lost = null; s.bot = null; s.orders = "attack"; s.wps = [];
    s.capt = C.CAPTAINS[(S.seed + S.subs.length * 7) % C.CAPTAINS.length];
    S.subs.push(s);
    return s;
  };
  /* the boats still afloat */
  E.afloat = S => S.subs.filter(s => !s.lost);
  /* run f with boat i in command, and put the one in command back */
  E.as = (S, i, f) => { const was = S.cmd; S.cmd = i; try { return f(S.subs[i]); } finally { S.cmd = was; } };
  E.setWx = (S, k) => { const w = C.WX[k]; S.wx = { k, vis: w.vis, sea: Math.round(PP.lerp(w.sea[0], w.sea[1], R(S))), until: S.t + H(PP.lerp(C.WX_HOURS[0], C.WX_HOURS[1], R(S))) }; };
  /* where the boat sits relative to a convoy: ahead and to starboard of its course */
  const offset = (x, y, hdg, ahead, star) => [x + PP.hx(hdg) * ahead + Math.cos(hdg) * star, y + PP.hy(hdg) * ahead + Math.sin(hdg) * star];

  E.newAction = (id, { seed, real, custom }) => {
    let A = E.ACTIONS.find(a => a.id === id);
    if (id === "custom") {
      const c = custom, n = E.CUSTOM.size.find(x => x[0] === c.size)[2], mi = c.mi;
      const e = C.era(mi), escN = Math.round([0, 1.2, 2.2][E.CUSTOM.escorts.findIndex(x => x[0] === c.escorts)] * e.escorts * (0.6 + n / 5));
      const np = +(c.pack || 2), spots = [[9000, 4000], [10000, -5000], [16000, 1000], [6000, 9000], [7000, -10000], [20000, -3000]];
      A = { id: "custom", name: "Custom mission", mi, hour: E.CUSTOM.time.find(x => x[0] === c.time)[2], day: 14, wx: c.wx,
        at: [560, 345], hdg: 280, conv: { kinds: C.MERCHANTS, n, escorts: escN }, boats: spots.slice(0, np).map(([a, b]) => [c.cls, a, b, PD]) };
    }
    const S = E.base({ seed, mode: "action", mi: A.mi, hour: A.hour, day: A.day || 10, real, cls: A.boats[0][0], name: PP.pick(PP.mulberry(seed), C.BOAT_NAMES) });
    S.scn = A.id; S.scnName = A.name;
    E.setWx(S, A.wx);
    const hdg = A.hdg * PP.DEG, x = A.at[0] * NM, y = A.at[1] * NM;
    let comp;
    if (A.conv.fixed) {
      comp = A.conv.kinds.map(cls => ({ cls, name: Sh.name(S, "merchant"), dmg: 0 }));
      for (const cls of A.conv.esc || []) comp.push({ cls, name: Sh.name(S, "escort"), dmg: 0 });
    } else {
      comp = Sh.makeComp(S, { kinds: A.conv.kinds, n: A.conv.n, escorts: A.conv.esc ? 0 : A.conv.escorts, mi: A.mi });
      for (const cls of A.conv.esc || []) comp.push({ cls, name: Sh.name(S, "escort"), dmg: 0 });
    }
    /* the tonnage on offer: the merchants, or (a mission with none) the escorts, and then they are the goal */
    const goal = comp.some(c => C.SHIPS[c.cls].role === "merchant") ? "merchant" : "escort";
    S.goal = goal;
    S.potential = comp.filter(c => C.SHIPS[c.cls].role === goal).reduce((s, c) => s + C.SHIPS[c.cls].tons, 0);
    const cv = Sh.makeConvoy(S, { x, y, hdg, comp, spd: A.spd });
    /* the pack: names drawn without repeats, each boat put where the mission says */
    const names = PP.mulberry(seed + 7), used = new Set([S.sub.name]);
    for (const [cls] of A.boats.slice(1)) {
      let n = PP.pick(names, C.BOAT_NAMES);
      for (let k = 0; used.has(n) && k < 40; k++) n = PP.pick(names, C.BOAT_NAMES);
      used.add(n); E.addBoat(S, cls, n);
    }
    S.subs.forEach((b, i) => {
      const [, ahead, star, depth = 0, how, ord] = A.boats[i];
      if (ord) b.orders = ord;
      const [sx, sy] = offset(x, y, hdg, ahead, star), h = how === "with" ? hdg : PP.angTo(sx, sy, x, y);
      Object.assign(b, { x: sx, y: sy, hdg: h, ordHdg: h, bell: how === "with" ? 2 : 3, spd: how === "with" ? 5 : 6, depth, ordDepth: depth });
      if (Sea.depthAt(b.x, b.y) < Math.max(80, depth + 40)) { b.x = x + PP.hx(hdg) * (6000 + i * 1500); b.y = y + PP.hy(hdg) * (6000 + i * 1500); }
    });
    Sh.spawn(S, cv);
    S.start = { merch: S.ships.filter(q => q.role === "merchant").length, esc: S.ships.filter(q => q.role === "escort").length, boats: S.subs.length };
    /* an escort already hunting: it has a contact on the nearest boat */
    if (A.hunt) for (const sh of S.ships) if (sh.role === "escort") {
      const q = S.subs.reduce((a, b) => PP.dist(sh.x, sh.y, b.x, b.y) < PP.dist(sh.x, sh.y, a.x, a.y) ? b : a);
      Object.assign(sh.ai, { st: "search", t: 0, contact: S.t, how: "ear", tgt: q.id, datum: { x: q.x + 300, y: q.y - 200, t: S.t }, dz: Math.max(60, q.depth) });
    }
    E.log(S, `${A.name}. ${C.dateStr(S.t)}, ${C.timeStr(S.t)}.`);
    return S;
  };

  E.newPractice = ({ seed, real, kind = "torpedo" }) => {
    const r = Object.assign({}, real, { duds: false, expert: false });
    const S = E.base({ seed, mode: "practice", mi: 26, hour: 10, day: 12, real: r, cls: "caracal", name: "Training" });
    S.scn = kind; S.scnName = kind === "gun" ? "Gunnery practice" : "Torpedo practice";
    E.setWx(S, "clear"); S.wx.sea = 1;
    const x = 1000 * NM, y = 260 * NM, hdg = 270 * PP.DEG;
    const comp = kind === "gun" ? [{ cls: "coaster", name: "Hulk", dmg: 0 }] : [{ cls: "freighter", name: "Able", dmg: 0 }, { cls: "liner", name: "Baker", dmg: 0 }, { cls: "coaster", name: "Charlie", dmg: 0 }];
    const cv = Sh.makeConvoy(S, { x, y, hdg, comp, spd: kind === "gun" ? 5 : 8 });
    S.real.zig = false;
    /* close enough that the first look through the glass shows ships, not specks: about 2,500 yards */
    const [sx, sy] = offset(x, y, hdg, kind === "gun" ? 2500 : 2200, kind === "gun" ? 1800 : 1500);
    Object.assign(S.sub, { x: sx, y: sy, hdg: hdg + Math.PI, ordHdg: hdg + Math.PI, bell: kind === "gun" ? 2 : 2, spd: 4, depth: kind === "gun" ? 0 : C.PD, ordDepth: kind === "gun" ? 0 : C.PD });
    if (kind !== "gun") { S.sub.scope.up = true; S.sub.scope.h = 1; }
    S.potential = comp.reduce((s, c) => s + C.SHIPS[c.cls].tons, 0);
    Sh.spawn(S, cv);
    /* the periscope trained on the nearest target: the first thing a newcomer sees is a ship to lock */
    if (kind !== "gun") {
      const sub = S.sub, near = S.ships.slice().sort((a, b) => PP.dist(sub.x, sub.y, a.x, a.y) - PP.dist(sub.x, sub.y, b.x, b.y))[0];
      if (near) sub.scope.brg = PP.angDiff(sub.hdg, PP.angTo(sub.x, sub.y, near.x, near.y));
    }
    E.log(S, `${S.scnName}. Targets on a steady course, no escorts.`);
    return S;
  };

  /* ---- the war: a career and its patrols ---- */
  const Career = PP.Career = {};
  Career.make = ({ name, mi, real, seed }) => {
    const r = PP.mulberry(seed);
    const cls = mi >= 20 ? "catamount" : mi >= 6 ? "cougar" : "caracal";
    return { v: 1, name: name || "Puma", t: C.monthStart(mi) + C.DAY * 3 + H(8), start: mi, real: Object.assign({}, real), seed, cls, boat: PP.pick(r, C.BOAT_NAMES),
      pts: 0, tons: 0, ships: 0, patrols: [], medals: [], rank: C.RANKS[0][1], alive: true, over: null, base: "talon", n: 0, cheated: false };
  };
  Career.basesOpen = car => Sea.portsOpen(C.monthOf(car.t));
  /* the boats command will give you now: what has come into service, by rank */
  Career.boatsOffered = car => {
    const mi = C.monthOf(car.t), ri = C.RANKS.findIndex(([, n]) => n === car.rank);
    return C.SUB_ORDER.filter(k => C.SUBS[k].from <= mi && (k !== "catamount" || ri >= 1 || mi >= 30) && k !== "ocelot");
  };
  /* where command sends you: zones with the traffic, by the month */
  Career.orders = (car, seed) => {
    const r = PP.mulberry(seed + car.n * 977), mi = C.monthOf(car.t);
    const zs = Sea.zones.filter(z => !(mi < 6 && (z.id === "approaches" || z.id === "vargrin")));
    return PP.pick(r, zs).id;
  };

  E.newPatrol = (car, seed) => {
    const S = E.base({ seed, mode: "patrol", mi: 0, real: car.real, cls: car.cls, name: car.boat });
    S.t = car.t;
    S.subs = []; E.addBoat(S, car.cls, car.boat);
    S.cap = { name: car.name, rank: car.rank };
    S.phase = "port";
    S.patrol = { n: car.n + 1, zone: Career.orders(car, seed), base: car.base, out: 0, due: 0, tons0: 0, sunk0: 0, intercepts: [], towed: false, cheated: false };
    E.setWx(S, "clear");
    const p = Sea.port(car.base) || Sea.ports[0];
    Object.assign(S.sub, { x: p.x, y: p.y, hdg: 270 * PP.DEG, ordHdg: 270 * PP.DEG });
    E.seedLanes(S);
    E.log(S, `Patrol ${S.patrol.n}: orders for ${Sea.ZONES.find(z => z.id === S.patrol.zone).name}.`);
    return S;
  };
  E.depart = (S, ev = []) => {
    const p = Sea.port(S.patrol.base) || Sea.ports[0];
    S.phase = "sea";
    S.patrol.out = S.t; S.patrol.leaving = true; S.patrol.due = S.t + C.PATROL_DAYS * C.DAY; S.patrol.tons0 = S.stats.tons; S.patrol.sunk0 = S.stats.sunk.length;
    const z = Sea.zones.find(q => q.id === S.patrol.zone), h = PP.angTo(p.x, p.y, z.x, z.y);
    Object.assign(S.sub, { x: p.x + PP.hx(h) * 4000, y: p.y + PP.hy(h) * 4000, hdg: h, ordHdg: h, bell: 4, spd: 12, depth: 0, ordDepth: 0 });
    E.log(S, `Underway from ${p.name}, ${C.dateStr(S.t)}.`);
    ev.push({ t: "departed" });
    return ev;
  };
  /* the lanes, already busy when the patrol begins */
  E.seedLanes = S => {
    const mi = C.monthOf(S.t), e = C.era(mi);
    for (const L of Sea.lanes) for (const dir of [1, -1]) {
      const n = Math.round(L.len / (16 * 3600 * 9 * PP.KN) * L.w * e.traffic);
      for (let i = 0; i < n; i++) E.newConvoyOn(S, L, dir, L.len * R(S));
    }
  };
  E.newConvoyOn = (S, L, dir, s) => {
    const mi = C.monthOf(S.t), e = C.era(mi);
    const lone = R(S) < (mi < 18 ? 0.35 : 0.2);
    const n = lone ? 1 : 2 + Math.floor(R(S) * (3 + 4 * e.traffic));
    const comp = Sh.makeComp(S, { kinds: L.kinds, n, mi });
    const p = Sea.along(L, dir > 0 ? s : s), hdg = dir > 0 ? p.hdg : PP.normAng(p.hdg + Math.PI);
    return Sh.makeConvoy(S, { x: p.x, y: p.y, hdg, comp, lane: L.id, dir });
  };
  /* new convoys putting out from the ends of the lanes */
  E.traffic = (S, dt) => {
    if (S.mode !== "patrol") return;
    const e = C.era(C.monthOf(S.t));
    for (const L of Sea.lanes) for (const dir of [1, -1]) {
      if (R(S) < L.w * e.traffic * dt / H(16)) E.newConvoyOn(S, L, dir, dir > 0 ? 0 : L.len);
    }
  };
  /* in reach of a base, on the surface, slow: she can tie up */
  E.nearPort = S => {
    if (S.mode !== "patrol" || S.phase !== "sea") return null;
    const s = S.sub;
    return Sea.portsOpen(C.monthOf(S.t)).find(p => PP.dist(s.x, s.y, p.x, p.y) < 9000) || null;
  };
  E.canDock = S => { const p = E.nearPort(S); return p && Sub.surfaced(S.sub) && S.sub.spd < 9 ? p : null; };
  /* the patrol's report, written into the career */
  E.enterPort = (S, car, port, towed = false) => {
    const sunk = S.stats.sunk.slice(S.patrol.sunk0), tons = sunk.reduce((a, x) => a + x.tons, 0), pct = C.realPct(S.real);
    const pts = Math.round(tons * pct / 100), days = Math.round((S.t - S.patrol.out) / C.DAY);
    const medal = towed ? null : C.MEDALS.slice().reverse().find(([at]) => pts >= at);
    const rankWas = car.rank;
    car.pts += pts; car.tons += tons; car.ships += sunk.length; car.n = S.patrol.n;
    car.rank = C.rankFor(car.pts);
    if (medal) car.medals.push({ name: medal[1], n: S.patrol.n, t: S.t });
    if (S.cheated) car.cheated = true;
    const zone = Sea.ZONES.find(z => z.id === S.patrol.zone);
    const rep = { n: S.patrol.n, zone: zone ? zone.name : "", out: S.patrol.out, back: S.t, days, tons, pts, ships: sunk, medal: medal ? medal[1] : null, rankUp: car.rank !== rankWas ? car.rank : null, towed, fired: S.stats.fired, charges: S.stats.charges, cls: S.sub.cls, boat: S.sub.name };
    car.patrols.push(rep);
    car.base = port.id;
    /* the refit: two to three weeks in the yard */
    const refit = C.REFIT_DAYS[0] + Math.floor(R(S) * (C.REFIT_DAYS[1] - C.REFIT_DAYS[0]));
    car.t = S.t + refit * C.DAY;
    if (car.t >= C.WAR_END) car.over = "war";
    S.phase = "port"; S.report = rep;
    return rep;
  };
  Career.lost = (car, S) => {
    car.alive = false; car.over = "lost";
    const sunk = S.stats.sunk.slice(S.patrol ? S.patrol.sunk0 : 0), tons = sunk.reduce((a, x) => a + x.tons, 0);
    car.pts += Math.round(tons * C.realPct(S.real) / 100); car.tons += tons; car.ships += sunk.length;
    car.patrols.push({ n: S.patrol ? S.patrol.n : car.n + 1, lost: true, why: S.end && S.end.why, back: S.t, tons, ships: sunk, days: Math.round((S.t - (S.patrol ? S.patrol.out : S.t)) / C.DAY), boat: S.sub.name, cls: S.sub.cls });
  };
})();
