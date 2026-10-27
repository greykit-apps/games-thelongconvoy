/* PumaPack -- the settings, a game left to come back to, the service
 * record of each mission's best, and nothing else. Every key begins pumapack_
 * (greykit.games STANDARD.md §5), so Settings can forget them by that
 * prefix and leave the rest of greykit.com alone (§2). */
"use strict";
(() => {
  const KEY_PREFS = "pumapack_prefs_v1", KEY_GAME = "pumapack_game_v1", KEY_FAME = "pumapack_fame_v1", KEY_NAME = "pumapack_name_v1";
  PP.KEY_MUTED = "pumapack_muted_v1";
  PP.KEY_LAST = "pumapack_last_v1";

  /* ---- the aids: Classic is the instruments and your eyes, Field a modern helping hand. None of them changes the war: the reality does that ---- */
  PP.AID_LIST = [
    ["solution", "Solution line", "Where the boat's fire control says the target will be when a torpedo meets her, on the map and in the periscope."],
    ["tracks", "Torpedo tracks", "Your torpedoes' runs, drawn on the chart."],
    ["labels", "Range labels", "Each ship's range beside it, through the periscope and on the chart."],
    ["autoSlow", "Slow for news", "Time compression drops back to one when a ship is sighted, a plane is seen or a torpedo hits."],
    ["rings", "Danger rings", "How far the escorts could hear the boat you are on, on the map."],
    ["hints", "Key hints", "The keys for the screen you are on, along the bottom."],
  ];
  PP.AIDS = { field: {}, classic: {} };
  for (const [k] of PP.AID_LIST) { PP.AIDS.field[k] = true; PP.AIDS.classic[k] = false; }

  const CALM = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  PP.calm = () => CALM.matches;
  PP.STEER = { classic: "Keys", modern: "Keys and mouse" };
  PP.SPEEDS = { classic: ["Normal", 50], relaxed: ["Relaxed", 40], brisk: ["Brisk", 60] };
  PP.prefs = Object.assign({ aids: "field", over: {}, steer: "classic", speed: "classic", scanlines: false, shake: !CALM.matches, learned: false, resume: true,
    real: Object.assign({}, PP.C.REAL_NONE, { zig: true, duds: true }) }, PP.store.get(KEY_PREFS, {}));
  if (!PP.AIDS[PP.prefs.aids]) PP.prefs.aids = "field";
  if (!PP.STEER[PP.prefs.steer]) PP.prefs.steer = "classic";
  PP.modern = () => PP.prefs.steer === "modern";
  PP.savePrefs = () => PP.store.set(KEY_PREFS, PP.prefs);
  PP.aid = name => { const o = PP.prefs.over[name]; return o === undefined ? !!PP.AIDS[PP.prefs.aids][name] : !!o; };
  PP.setAids = set => { PP.prefs.aids = set; PP.prefs.over = {}; PP.savePrefs(); };
  /* L at sea: the other set, and the aids you set on your own kept as you set them */
  PP.flipAids = () => { PP.prefs.aids = PP.prefs.aids === "field" ? "classic" : "field"; PP.savePrefs(); };
  PP.setAid = (name, on) => { if (on === !!PP.AIDS[PP.prefs.aids][name]) delete PP.prefs.over[name]; else PP.prefs.over[name] = on; PP.savePrefs(); };
  PP.aidsLabel = () => (PP.prefs.aids === "field" ? "Field" : "Classic") + (Object.keys(PP.prefs.over).length ? ", adjusted" : "");

  /* ---- a game left in the middle: an action, a practice, or a patrol at sea ---- */
  PP.loadGame = () => { const g = PP.store.get(KEY_GAME, null); return g && g.S && g.S.v === 1 && g.S.subs ? (PP.Engine.link(g.S), g) : null; };
  PP.saveGame = S => PP.store.set(KEY_GAME, { S, at: Date.now() });
  PP.clearGame = () => PP.store.del(KEY_GAME);

  /* ---- the service record: each mission's best ---- */
  PP.fame = () => { const f = PP.store.get(KEY_FAME, null); return f && f.actions ? f : { actions: {} }; };
  PP.addAction = (id, rec) => {
    const f = PP.fame(), best = f.actions[id];
    if (!best || rec.pts > best.pts) { f.actions[id] = rec; PP.store.set(KEY_FAME, f); return true; }
    return false;
  };
  PP.lastName = () => PP.store.get(KEY_NAME, "");
  PP.setLastName = n => PP.store.set(KEY_NAME, n);

  /* ---- Forget everything (STANDARD.md §2): this game's keys, by prefix ---- */
  PP.forgetEverything = () => {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = globalThis[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("pumapack")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
    location.reload();
  };
})();
