/* PumaPack -- what there is to play: target practice, the convoy
 * actions (single engagements, each its own night or day of the war), a
 * custom action. (Puma Service's war patrols and career are gone: the 1990
 * game had missions, and so does this one.) */
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
    { id: "anchor", name: "The Anchorage at Night", sides: ["escorts"], limit: 5, note: "Eleven ships at anchor waiting to sail, two escorts to guard them, and a pack of three coming in silent in the dark. Find them by ear: sprint, then stop and listen.", mi: 2, hour: 22, day: 4, wx: "clear",
      at: [342, 380], hdg: 2, spd: 0, conv: { kinds: ["freighter", "freighter", "freighter", "freighter", "freighter", "freighter", "freighter", "tanker", "tanker", "tanker", "tanker"], n: 11, escorts: 0, esc: ["destroyer", "destroyer"], fixed: true },
      boats: [["caracal", 12000, 6000, PD], ["caracal", 9000, -10000, PD], ["cougar", -11000, 4000, PD]] },
    { id: "easy", name: "Easy Pickings", note: "Five ships forming up for a convoy, no escort yet, in daylight. Two boats: try the attack from each.", mi: 50, hour: 10, day: 6, wx: "clear",
      at: [700, 330], hdg: 260, spd: 3, conv: { kinds: ["freighter", "freighter", "freighter", "tanker", "tanker"], n: 5, escorts: 0, fixed: true },
      boats: [["catamount", 6500, 3200, 0], ["caracal", 5500, -3800, PD]] },
    { id: "pinned", name: "Pinned Down", sides: ["pack", "escorts"], escName: "Hold Them Down", escOrders: ["evade", "evade"], escNote: "Two boats are down in the bay, scared and quiet. Find them with your ears, sprint and drift, and lay your charges on them.", limit: 3, note: "One destroyer has two of the pack held down. Sink it, or slip it: deep, slow and quiet.", mi: 50, hour: 14, day: 9, wx: "clear",
      at: [342, 380], hdg: 2, spd: 0, hunt: true, conv: { kinds: [], n: 0, escorts: 0, esc: ["destroyer"], fixed: true },
      boats: [["caracal", 2600, 900, PD], ["caracal", 1800, -1600, 220]] },
    { id: "inside", name: "Inside the Convoy", sides: ["pack", "escorts"], limit: 6, note: "Night, the first year: two boats on the surface in among eighteen ships and eight escorts. Down to periscope depth, and help yourselves.", mi: 2, hour: 1, day: 2, wx: "clear",
      at: [450, 560], hdg: 270, conv: { kinds: ["freighter", "freighter", "freighter", "liner", "tanker", "coaster"], n: 18, escorts: 8 },
      boats: [["caracal", 300, 450, 0, "with"], ["caracal", -700, -450, 0, "with"]] },
    { id: "gather", name: "Gather the Pack", sides: ["pack", "escorts"], limit: 6, note: "A big convoy at night, already under attack. Four boats closing from all round it: bring them in together.", mi: 16, hour: 23, day: 20, wx: "overcast",
      at: [400, 200], hdg: 315, conv: { kinds: ["freighter", "liner", "tanker", "coaster"], n: 18, escorts: 8 },
      boats: [["caracal", 12000, 5000, PD], ["caracal", 9000, -7000, 0], ["cougar", -6000, 9000, 0], ["caracal", 16000, -1000, PD]] },
    { id: "strait", name: "The Kessrin Strait", sides: ["pack", "escorts"], limit: 6, note: "A supply convoy about to clear the strait for open water. Six boats strung across its way out; stop it in the narrows.", mi: 17, hour: 2, day: 6, wx: "clear",
      at: [520, 330], hdg: 300, conv: { kinds: ["freighter", "tanker", "liner", "troopship"], n: 18, escorts: 8 },
      boats: [["cougar", 9000, 0, PD], ["caracal", 8500, 4000, PD], ["caracal", 8500, -4000, PD], ["caracal", 13000, 2500, 0], ["caracal", 13000, -2500, 0], ["caracal", 6000, 7000, PD]] },
    { id: "decisive", name: "The Decisive Battle", sides: ["pack", "escorts"], limit: 6, note: "Late in the war, a huge convoy south of the islands, its escorts with radar and the hedgehog. Eight boats: the battle that decides the sea lanes.", escNote: "Eight boats are gathering on a huge convoy. Your escorts have radar and the hedgehog now: this is where the sea lanes are won or lost.", mi: 40, hour: 0, day: 5, wx: "overcast",
      at: [342, 380], hdg: 2, conv: { kinds: ["freighter", "liner", "tanker", "troopship", "coaster"], n: 18, escorts: 8 },
      boats: [["catamount", 8000, 4500, PD], ["catamount", 8000, -4500, PD], ["cougar", 6000, 8000, PD], ["cougar", 6000, -8000, PD], ["cougar", 11000, 0, PD], ["caracal", 2000, 8500, 0], ["caracal", 2000, -8500, 0], ["caracal", 12000, 3500, 0]] },
    { id: "tankers", name: "The Fuel Tankers", sides: ["pack", "escorts"], limit: 6, note: "Pumacity's biggest convoy of the year, its fuel in six tankers in the middle columns. Five boats: the tankers first.", escNote: "Six tankers of fuel for Pumacity in the middle of the convoy, and five boats who know it. Keep them off the tankers.", mi: 16, hour: 1, day: 11, wx: "clear",
      at: [450, 560], hdg: 300, conv: { kinds: ["tanker", "tanker", "tanker", "tanker", "tanker", "tanker", "freighter", "freighter", "freighter", "freighter", "liner", "liner", "coaster", "coaster"], n: 14, escorts: 0, esc: ["destroyer", "destroyer", "destroyer", "frigate", "frigate", "chaser"], fixed: true },
      boats: [["cougar", 12000, 4000, PD], ["caracal", 12000, -4000, PD], ["caracal", 7000, 9000, 0], ["caracal", 7000, -9000, 0], ["cougar", 17000, 0, PD]] },
    { id: "hunters", name: "Hunter-Killers", sides: ["pack", "escorts"], limit: 5, escOrd: ["screen", "screen", "screen", "screen", "hunt", "hunt", "hunt", "hunt"], note: "A convoy of tanks bound east, four escorts round it and a hunter-killer group of four more ranging out ahead. Four boats.", escNote: "Your convoy has four escorts round it, and four more as a hunter-killer group: send them after every contact. Four boats are out there.", mi: 42, hour: 13, day: 18, wx: "haze",
      at: [520, 330], hdg: 120, conv: { kinds: ["freighter", "freighter", "freighter", "troopship", "troopship", "freighter", "tanker", "tanker"], n: 8, escorts: 0, esc: ["destroyer", "destroyer", "frigate", "frigate", "destroyer", "destroyer", "destroyer", "frigate"], fixed: true },
      boats: [["catamount", 13000, 5000, PD], ["catamount", 13000, -5000, PD], ["cougar", 19000, 2000, PD], ["cougar", 8000, 11000, PD]] },
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
      real: Object.assign({}, real, { aob: false }), wx: { k: "clear", vis: 1, sea: 2, until: 0 }, subs: [], cmd: 0, ships: [], convoys: [], torps: [], charges: [], shells: [], planes: [], decoys: [],
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

  E.newAction = (id, { seed, real, custom, side = "pack" }) => {
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
    /* the escorts' side: you are aboard the first escort, the others keep their stations under their orders */
    if (side === "escorts" && (A.sides || ["pack"]).includes("escorts")) {
      S.side = "escorts";
      for (const sh of S.ships) if (sh.role === "escort") { sh.ord = "screen"; sh.wps = []; }
      const first = S.ships.find(q => q.role === "escort");
      if (first) PP.Escort.take(S, first);
      S.scnName = A.escName || A.name;
      (A.escOrders || []).forEach((o, i) => { if (S.subs[i]) S.subs[i].orders = o; });
    }
    if (A.limit) S.endT = S.t + A.limit * 3600;
    /* the escorts' own orders, in the order of the convoy's list: a hunter-killer group hunts from the start */
    if (A.escOrd) S.ships.filter(q => q.role === "escort").forEach((q, i) => { if (A.escOrd[i] && q.id !== S.flag) { q.ord = A.escOrd[i]; q.wps = q.wps || []; } });
    /* an escort already hunting: it has a contact on the nearest boat */
    if (A.hunt) for (const sh of S.ships) if (sh.role === "escort") {
      const q = S.subs.reduce((a, b) => PP.dist(sh.x, sh.y, b.x, b.y) < PP.dist(sh.x, sh.y, a.x, a.y) ? b : a);
      Object.assign(sh.ai, { st: sh.ai.st === "user" ? "user" : "search", t: 0, contact: S.t, how: "ear", tgt: q.id, datum: { x: q.x + 300, y: q.y - 200, t: S.t }, dz: Math.max(60, q.depth) });
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

})();
