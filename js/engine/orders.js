/* PumaPack -- the orders a boat of the pack sails under while you are not
 * aboard her, as the 1990 game gave them (tools/ORIGINAL.md): every boat
 * runs her own order, and her own waypoints, until you change it or take
 * command of her.
 *
 *   attack     find the convoy and attack it: her captain's own way (PP.Bot)
 *   shadow     keep the convoy in reach, out of its sight, and never fire
 *   patrol     run her waypoints, then hold at the last
 *   evade      deep, slow and quiet, turning away from the nearest escort
 *   drift      stopped and silent, at the depth she has: listen
 *   charge     on the surface, slow, the diesels on the battery
 *   periscope  up to periscope depth and hold her course
 *   hold       the course, speed and depth you last gave her
 *
 * Every order works through the same orders a player gives (helm,
 * telegraph, depth, periscope), so a boat under orders is no different in
 * the water from the one you are on. */
"use strict";
(() => {
  const C = PP.C, Sub = PP.Sub, Sh = PP.Ships, Det = PP.Detect, Sea = PP.Sea, O = PP.Orders = {};

  O.LIST = [
    ["attack", "Attack", "Find the convoy and attack it, her captain's own way", "A"],
    ["shadow", "Shadow", "Keep the convoy in reach, out of its sight; never fire", "S"],
    ["patrol", "Patrol", "Run her waypoints (a right click on the map adds one), then hold", "P"],
    ["evade", "Evade", "Deep, slow and quiet, away from the nearest escort", "E"],
    ["drift", "Drift", "Stopped and silent where she is: listen", "D"],
    ["charge", "Charge", "On the surface, slow, charging the battery", "C"],
    ["periscope", "Periscope depth", "Up to periscope depth, holding her course", "U"],
    ["hold", "Hold", "The course, speed and depth you last gave her", "H"],
  ];
  O.name = k => (O.LIST.find(o => o[0] === k) || O.LIST[0])[1];
  O.DEFAULT = "attack";

  /* the orders for one step of boat s: a list of acts, as a player's */
  O.acts = (S, s, captain) => {
    const act = [], A = o => act.push(o);
    const depth = d => { if (Math.abs(s.ordDepth - d) > 1) A({ a: "setDepth", v: d }); };
    const bell = b => { if (s.bell !== b) A({ a: "setBell", v: b }); };
    const helm = h => { if (Math.abs(PP.angDiff(s.ordHdg, h)) > 0.01) A({ a: "hdg", v: PP.normAng(h) }); };
    const quiet = on => { if (s.silent !== on) A({ a: "silent" }); };
    const scope = up => { if (s.scope.up !== up && (!up || (s.depth <= C.PD + 4 && s.sys.scope < 0.5))) A({ a: "scope", v: up }); };
    const nearEscort = () => { let h = null, bd = 1e9; for (const sh of S.ships) if (sh.role === "escort" && Sh.alive(sh)) { const d = PP.dist(s.x, s.y, sh.x, sh.y); if (d < bd) { bd = d; h = sh; } } return [h, bd]; };
    switch (s.orders || O.DEFAULT) {
      case "attack": return (captain.cmd(S).acts || []).filter(a => a.a !== "tc");
      case "hold": return act;
      case "evade": {
        const bot = Sea.depthAt(s.x, s.y);
        if (Sub.surfaced(s) && s.ordDepth === 0) A({ a: "crash" });
        else depth(PP.clamp(Math.floor((bot - 40) / 5) * 5, C.PD, Sub.testDepth(s) - 30));
        quiet(true); bell(2); scope(false);
        const [h] = nearEscort();
        if (h) helm(PP.angTo(h.x, h.y, s.x, s.y) + (s.id % 2 ? 0.8 : -0.8));
        return act;
      }
      case "drift": quiet(true); bell(1); return act;
      case "charge": quiet(false); depth(0); bell(2); return act;
      case "periscope": quiet(false); depth(C.PD); if (s.bell < 2) bell(2); scope(true); return act;
      case "patrol": {
        const w = s.wps && s.wps[0];
        if (!w) { A({ a: "orders", v: "hold", why: "lastWp" }); return act; }
        if (PP.dist(s.x, s.y, w.x, w.y) < 900) { s.wps.shift(); return act; }
        helm(PP.angTo(s.x, s.y, w.x, w.y)); if (s.bell < 3) bell(Sub.surfaced(s) ? 5 : 3);
        return act;
      }
      case "shadow": {
        /* the convoy as the pack knows it: its nearest ship on the chart */
        const known = S.ships.filter(q => Sh.alive(q) && q.role === "merchant" && Det.everSeen(q) && S.t - q.kn.t < 1800);
        if (!known.length) { bell(2); return act; }
        const t = known.reduce((a, q) => PP.dist(s.x, s.y, q.kn.x, q.kn.y) < PP.dist(s.x, s.y, a.kn.x, a.kn.y) ? q : a);
        const cv = Sh.convoy(S, t.conv), base = cv ? cv.base : t.kn.hdg || 0;
        /* a station off its bow, on her own side of it, beyond what its escorts see */
        const side = ((s.x - t.kn.x) * Math.cos(base) + (s.y - t.kn.y) * Math.sin(base)) >= 0 ? 1 : -1;
        const off = Det.night(S) ? 7000 : 14000 * S.wx.vis + 2000;
        const gx = t.kn.x + PP.hx(base) * 6000 + Math.cos(base) * side * off, gy = t.kn.y + PP.hy(base) * 6000 + Math.sin(base) * side * off;
        const [, near] = nearEscort(), d = PP.dist(s.x, s.y, gx, gy);
        quiet(false); scope(false);
        depth(near > off * 0.8 ? 0 : C.PD);
        helm(d > 600 ? PP.angTo(s.x, s.y, gx, gy) : base);
        bell(d > 3000 ? (Sub.surfaced(s) ? 6 : 4) : 3);
        return act;
      }
    }
    return act;
  };
})();
