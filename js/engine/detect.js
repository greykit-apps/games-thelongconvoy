/* The Long Convoy -- seeing and being seen.
 *
 * Both ways, from one model, so what the picture shows is what the engine
 * says is there. The light comes from the hour and the moon, the weather
 * thins it, and the horizon cuts it: from the bridge (thirty feet up) or a
 * periscope (three) a ship's masts show before her hull does.
 *
 * We see by eye (bridge or periscope), by radar once the boat has it, and
 * hear screws on the hydrophones when submerged: a bearing, no range. They
 * see us by eye when we show above the water, by radar late in the war,
 * hear us on their hydrophones (louder the faster we go, worse the faster
 * they go), and ping us with active sonar when they hunt: a cone ahead of
 * the escort, with a blind gap close under its bow. */
"use strict";
(() => {
  const C = PP.C, D = C.DET, Sub = PP.Sub, Sh = PP.Ships, Det = PP.Detect = {};
  const R = S => PP.rand(S);
  /* a chance a second, held for dt seconds */
  const roll = (S, p, dt) => p > 0 && R(S) < 1 - Math.pow(1 - Math.min(0.95, p), dt);

  /* the light, thinned by the weather: 0 black to 1 a clear noon */
  /* (asked for once a ship a boat a step: kept for the step it was worked out in, it is pure in the clock and the weather) */
  let lightAt = NaN, lightWx = "", lightV = 0;
  Det.light = S => { if (S.t !== lightAt || S.wx.k !== lightWx) { lightAt = S.t; lightWx = S.wx.k; lightV = C.light(S.t) * (1 - C.WX[S.wx.k].dark * 0.6); } return lightV; };
  Det.night = S => C.light(S.t) < 0.3;
  /* how far a ship of kind k is seen by eye now, before the horizon */
  Det.shipRange = (S, k) => PP.lerp(D.shipNight, D.shipDay, Math.pow(Det.light(S), 0.8)) * S.wx.vis * Math.sqrt(k.len / 130);
  /* how far our eye reaches to it, horizon and all */
  Det.eyeTo = (S, eyeH, k) => Math.min(Det.shipRange(S, k), C.horizon(eyeH, k.mast));
  Det.eyeH = s => Sub.surfaced(s) ? C.EYE.bridge : Sub.scopeReady(s) ? C.EYE.scope + Math.max(0, C.PD - s.depth) * 0.6 : null;

  /* an escort's active sonar, the same beam as Det.step's below, for what the page plays (main.js sonarSounds):
   * she pings while she hunts (or, yours, while it is switched on); a boat is in the beam ahead of her, past the
   * blind gap under her bow and within its reach. No chance in it: what is in the beam echoes */
  Det.pinging = sh => { const st = sh.ai && sh.ai.st; return st === "search" || st === "attack" || st === "hold" || (st === "user" && !!sh.ping); };
  Det.sonarReach = (S, sh) => C.era(C.monthOf(S.t)).sonar * C.SHIPS[sh.cls].sonar * (1 + (S.real.expert ? 0.15 : 0));
  Det.inBeam = (S, sh, x, y) => {
    const d = PP.dist(sh.x, sh.y, x, y), Rs = Det.sonarReach(S, sh), rel = Math.abs(PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, x, y)));
    return d > D.sonarMin && d < Rs && rel < D.sonarCone ? { d, Rs } : null;
  };

  Det.step = (S, dt, ev) => {
    const s = S.sub, e = C.era(C.monthOf(S.t)), eyeH = Det.eyeH(s), L = Det.light(S), expert = S.real.expert ? 1 : 0;
    const radar = Sub.radarWorks(s), sub = !Sub.surfaced(s), hydOk = sub && s.sys.sonar < 0.7;
    const out = { seen: 0, heard: 0, nearestSeen: 1e9, nearestEscort: 1e9, hunted: false };
    for (const sh of S.ships) {
      if (sh.sunk) continue;
      const k = C.SHIPS[sh.cls], d = PP.dist(s.x, s.y, sh.x, sh.y), brg = PP.angTo(s.x, s.y, sh.x, sh.y);
      if (sh.role === "escort" && !sh.sinking) out.nearestEscort = Math.min(out.nearestEscort, d);
      /* ---- ours ---- */
      let by = "";
      if (eyeH !== null && d < Det.eyeTo(S, eyeH, k)) by = "eye";
      else if (radar && d < D.radarSub) by = "radar";
      const was = sh.kn.t >= 0 && S.t - sh.kn.t < 300;
      if (by) {
        (sh.kn.seen = sh.kn.seen || {})[s.id] = S.t;
        sh.kn.t = S.t; sh.kn.x = sh.x; sh.kn.y = sh.y; sh.kn.by = by; sh.kn.brg = brg; sh.kn.hdg = sh.hdg; sh.kn.spd = sh.spd;
        if (by === "eye") sh.kn.id = true;
        if (!was) { ev.push({ t: by === "eye" ? "sighted" : "radarContact", id: sh.id, cls: sh.cls, role: sh.role, brg, rng: d, first: !sh.kn.logged }); sh.kn.logged = true; }
        out.seen++; out.nearestSeen = Math.min(out.nearestSeen, d);
      } else if (hydOk && d < D.ourHyd * (0.45 + sh.spd / 18) * (1 - s.sys.sonar)) {
        sh.kn.ear = S.t; sh.kn.earBrg = PP.normAng(brg + PP.gauss(() => R(S)) * (0.02 + s.sys.sonar * 0.1));
        if (S.t - (sh.kn.earT0 || -1e9) > 900) { sh.kn.earT0 = S.t; if (!was) ev.push({ t: "screws", id: sh.id, brg: sh.kn.earBrg, fast: sh.spd > 16 }); }
        out.heard++;
      } else if (eyeH !== null && sh.role === "merchant" && L > 0.5 && d < D.smokeDay * S.wx.vis && d > Det.eyeTo(S, eyeH, k)) {
        if (S.t - (sh.kn.smoke || -1e9) > 1200 && !was) ev.push({ t: "smoke", id: sh.id, brg });
        sh.kn.smoke = S.t; sh.kn.smokeBrg = brg;
      }
      if (sh.sinking) continue;
      /* ---- theirs ---- */
      const esc = sh.role === "escort", ai = sh.ai, ex = Sub.exposed(s);
      let how = "", p = 0;
      if (ex > 0) {
        let Rv = Sub.surfaced(s) ? PP.lerp(D.subNight, D.subDay, L) : PP.lerp(D.scopeNight, D.scopeDay, L) * (1 + s.spd / D.featherKn * 0.6) * (ex / 8);
        Rv *= S.wx.vis;
        if (esc && sh.lit && Det.night(S)) Rv = Math.max(Rv, Sub.surfaced(s) ? 4200 : 600);
        if (d < Rv) { p = D.look * Math.pow(1 - d / Rv, 2) * e.asw * (esc ? 1 + expert * 0.5 : 0.5); how = "eye"; }
      }
      if (esc && e.escortRadar && Sub.surfaced(s) && d < D.radarShipVsSub && p < 0.5) { p = 0.5; how = "radar"; }
      else if (esc && e.escortRadar && Sub.snorkeling(s) && d < D.radarShipVsSub * C.SNORKEL.radar && p < 0.3) { p = 0.3; how = "radar"; }
      /* Metox: her radar warning hears an escort's radar sweeping, while her antenna is above the water */
      if (esc && e.escortRadar && e.metox && (Sub.surfaced(s) || Sub.snorkeling(s) || Sub.exposed(s) > 0) && d < D.radarShipVsSub * C.METOX.reach) {
        s.metoxT = S.t;
        if (S.t - (s.metoxSaid === undefined ? -1e9 : s.metoxSaid) > C.METOX.repeat) { s.metoxSaid = S.t; ev.push({ t: "metox", by: s.id, brg: PP.angTo(s.x, s.y, sh.x, sh.y) }); }
      }
      if (esc && sub) {
        const Rh = D.hyd * Sub.noise(s) * e.asw * C.SHIPS[sh.cls].sonar * (sh.spd > D.hydFastKn ? D.hydFast : 1) * (1 - S.wx.sea * 0.06) * (1 + expert * 0.25);
        if (d < Rh) { const q = 0.22 * (1 - d / Rh); if (q > p) { p = q; how = "ear"; } }
        if (ai.st === "search" || ai.st === "attack" || ai.st === "hold" || (ai.st === "user" && sh.ping)) {
          const Rs = e.sonar * k.sonar * (1 + expert * 0.15), rel = Math.abs(PP.angDiff(sh.hdg, PP.angTo(sh.x, sh.y, s.x, s.y)));
          if (d > D.sonarMin && d < Rs && rel < D.sonarCone) { const q = D.ping * Math.sqrt(1 - d / Rs) * (1 - s.depth / 1400) * (s.bottomed ? 0.5 : 1) * (!expert && s.depth > 220 ? 0.55 : 1); if (q > p) { p = q; how = "sonar"; } }
          if (d < Rs * 1.3) out.pinged = true;
        }
      }
      if (how && roll(S, p, dt)) {
        /* a ping's fix is as good as its bearing: the nearer, the closer (posErr is at 1,050 yards) */
        const err = (how === "sonar" ? C.ESC.posErr[expert] * (0.3 + d / 1500) : how === "ear" ? 220 + d * 0.12 : 60) * (0.5 + R(S));
        const a = R(S) * PP.TAU;
        const dz = how === "sonar" ? s.depth + PP.gauss(() => R(S)) * C.ESC.depthErr[expert] : how === "ear" ? 150 + PP.gauss(() => R(S)) * 40 : 0;
        /* a boat seen on the surface or at her periscope is marked where she is: the escorts' side draws her */
        if (how === "eye" || how === "radar") s.seenT = S.t;
        if (esc) {
          const fresh = !ai.contact || S.t - ai.contact > 120;
          let nd = { x: s.x + Math.sin(a) * err, y: s.y + Math.cos(a) * err, t: S.t, vx: PP.hx(s.hdg) * s.spd * PP.KN, vy: PP.hy(s.hdg) * s.spd * PP.KN };
          /* a noisemaker near her, still sounding: the escort may take it for her */
          const dec = (how === "ear" || how === "sonar") && (S.decoys || []).find(q => S.t - q.t0 < C.DECOY.life && PP.dist(q.x, q.y, s.x, s.y) < C.DECOY.reach);
          if (dec && R(S) < C.DECOY.fool) { nd = { x: dec.x + (R(S) - 0.5) * 60, y: dec.y + (R(S) - 0.5) * 60, t: S.t, vx: 0, vy: 0, decoy: true }; }
          /* an escort keeps a plot: a fresh contact by the same means on the same boat, within half a minute, is
           * averaged into the last (run on to now), so her estimate settles the longer she holds it */
          if (ai.datum && !ai.datum.decoy && ai.how === how && ai.tgt === s.id && S.t - ai.contact < 30) {
            const age = S.t - ai.datum.t, px = ai.datum.x + (ai.datum.vx || 0) * age, py = ai.datum.y + (ai.datum.vy || 0) * age, w = 0.3;
            nd.x = px + (nd.x - px) * w; nd.y = py + (nd.y - py) * w; ai.dz = ai.dz + (Math.max(30, dz) - ai.dz) * w;
          } else ai.dz = Math.max(30, dz);
          ai.contact = S.t; ai.how = how; ai.tgt = s.id;
          ai.datum = nd;
          if (fresh && how !== "ear") ev.push({ t: "escortContact", id: sh.id, how });
        }
        const cv = Sh.convoy(S, sh.conv);
        if (cv && (!cv.alert || S.t - cv.alertT > 600)) { Sh.alarm(S, cv, s.x, s.y, ev); ev.push({ t: "spotted", id: sh.id, how }); }
      }
      if (esc && (ai.st === "attack" || ai.st === "drop") && d < 3000) out.hunted = true;
    }
    return out;
  };

  /* our knowledge of a ship: where we last had it, and how long ago */
  Det.known = (S, sh) => sh.kn.t >= 0 && S.t - sh.kn.t < 30;
  Det.everSeen = sh => sh.kn.t >= 0;
  /* whether boat s itself has the ship in sight or on radar this moment (the pack shares the chart, not the eyes) */
  Det.sees = (S, s, sh) => !!(sh.kn.seen && S.t - (sh.kn.seen[s.id] === undefined ? -1e9 : sh.kn.seen[s.id]) <= Math.max(0.5, PP.Engine.dt(S) * PP.Engine.LOOK_EVERY + 0.01));
})();
