/* PumaPack -- boot, title, the loop, and everything between.
 *
 * The greykit.games boot (the canon @gk-title block, STANDARD.md §3) while
 * the sea is charted and the first ships are traced, then the game's own
 * title: a convoy at dusk behind it, the name, the menu (§6's items and
 * keys, read by the block's own key lookup), the credit. Then an action, a
 * practice or a mission. The engine runs at fifty steps a second (or forty,
 * or sixty: Settings), whatever the screen's rate; time compression makes
 * each step longer, never more of them. */
"use strict";
(() => {
  const E = PP.Engine, C = PP.C, K = PP.K, UI = PP.UI, R = PP.Render, HUD = PP.HUD, SFX = PP.SFX, I = PP.Input, Sub = PP.Sub, W = PP.Weapons, esc = PP.esc, $ = id => document.getElementById(id);
  const game = PP.game = { mode: "boot", S: null, car: null, demo: null, ui: { station: "chart", look: 0, bino: false, chartZoom: 2, chartAt: null, aids: {}, track: [] }, step: 20, acc: 0, last: 0, warned: {}, lastCustom: null };

  /* ---- sound on and off (STANDARD.md §8) ---- */
  const readMuted = () => { try { return globalThis.localStorage.getItem(PP.KEY_MUTED) === "1"; } catch (e) { return false; } };
  SFX.muted = readMuted();
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    try { globalThis.localStorage.setItem("pumapack_muted_v1", SFX.muted ? "1" : "0"); } catch (e) { /* no storage */ }
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); if (game.mode === "title" && !SMALL.matches) SFX.startTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } }
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");
  game.applySpeed = () => { game.step = 1000 / (PP.SPEEDS[PP.prefs.speed] || PP.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!PP.prefs.scanlines); };
  game.syncAids = () => { for (const [k] of PP.AID_LIST) game.ui.aids[k] = PP.aid(k); };

  /* ---- the title ---- */
  function titleCfg() {
    const saved = PP.loadGame(), f = PP.fame(), fresh = !saved && !Object.keys(f.actions).length;
    return {
      name: "PumaPack",
      primary: saved ? "resume" : fresh ? "practice" : "action",
      /* the board's head: the boats of the game in hand, dated from it (else from the plot behind) */
      msg: { to: (saved && saved.S.subs.length > 1 ? saved.S.subs.map(q => q.name).join(", ") : saved && saved.S.sub.name) || "The whole pack", dtg: C.dtgStr(saved ? saved.S.t : game.demo.t), prec: saved ? "Priority" : "Routine" },
      items: [
        saved && { act: "resume", label: "Resume game", key: "R", meta: saved.S.scnName || "" },
        { act: "action", label: "Missions", key: "C", meta: "" },
        { act: "practice", label: "Target practice", key: "T", meta: fresh ? "start here" : "" },
        { act: "record", label: "Service record", key: "O", meta: "" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
    };
  }
  /* the menu is a naval message pinned over the sea: a printed blank, its head and its lines typed in
   * (css .ps-msg); each typed run carries its order and its length, for the typing on the reveal */
  function titleHTML(cfg) {
    const items = cfg.items.filter(Boolean), gap = items.indexOf("gap");
    const main = items.slice(0, gap), util = items.slice(gap + 1), m = cfg.msg;
    let i = 0;
    const ty = (s, cls = "") => `<span class="ty${cls}" style="--i:${i++};--n:${s.length}">${esc(s)}</span>`;
    const btn = (it, big) => `<button data-act="${it.act}" class="pr${it.act === cfg.primary ? " dflt" : ""}">${UI.TICK}<kbd>${esc(it.key)}</kbd>${ty(it.label, " lbl")}` +
      (big && it.meta ? ty(it.meta, " meta") : "") + "</button>";
    const field = (k, v, cls = "") => `<div${cls ? ` class="${cls}"` : ""}><dt>${k}</dt><dd>${ty(v)}</dd></div>`;
    return `<div class="ps-title">
      <canvas class="ps-scene" aria-hidden="true"></canvas><div class="ps-shade" aria-hidden="true"></div>
      <main>
        <h1 class="ps-mark" aria-label="${esc(cfg.name)}"><span class="puma">Puma</span><span class="svc">Pack</span></h1>
        <nav class="ps-menu ps-msg paper" aria-label="Main menu">
          <header class="msg-hd"><span>The pack board</span><span>${esc(m.prec)}</span></header>
          <dl class="msg-f">${field("Boats", m.to)}${field("Date-time group", m.dtg)}${field("Contact", "PDF convoy steering west. Attack at will", "w")}</dl>
          <p class="msg-l" aria-hidden="true">Orders</p>
          <div class="msg-t">${main.map(it => btn(it, true)).join("")}</div>
          <div class="util">${util.map(it => btn(it, false)).join("")}</div>
        </nav>
      </main>
      <footer class="ps-foot"><span class="gk-credit">${UI.CREDIT}</span></footer>
    </div>`;
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    if (!game.demo) newDemo();
    el.innerHTML = titleHTML(titleCfg());
    el.hidden = false;
    $("game").hidden = true;
    document.body.classList.add("on-title");
    PP.Render.scopeT0 = null;
    sizeScene();
  }
  function sizeScene() {
    const cv = document.querySelector("#title .ps-scene");
    if (!cv) return;
    const k = Math.max(2, Math.round(innerHeight / 360));
    cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k);
  }
  /* a convoy at dusk, behind the menu; never saved */
  /* behind the menu, the plot: a pack of four closing on a night convoy, played for real under its own
   * captains (the boat "in command" too: the bot sails her); never saved. When it ends, another */
  function newDemo() {
    game.demo = E.newAction("custom", { seed: 1 + Math.floor(Math.random() * 1e6), real: C.REAL_NONE, custom: { mi: 20, cls: "caracal", pack: "4", size: "large", escorts: "light", time: "night", wx: "clear" } });
    game.demoBot = PP.Bot.make();
  }
  function pinDemo() {}
  function revealTitle(print = true) {
    const t = document.querySelector("#title .ps-title");
    if (!t) return;
    if (print && !matchMedia("(prefers-reduced-motion: reduce)").matches) { t.classList.add("ps-print"); game.typeSnd = SFX.play("type"); }
    const b = t.querySelector(".ps-menu .dflt") || t.querySelector(".ps-menu button");
    if (b) b.focus({ preventScroll: true });
  }
  /* any key or click while the signal types finishes it at once (and still does its work) */
  const typedOut = () => {
    const t = document.querySelector("#title .ps-print");
    if (t) t.classList.replace("ps-print", "ps-typed");
    if (game.typeSnd) { game.typeSnd.disconnect(); game.typeSnd = null; }
  };
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null;
    SFX.stopLoops();
    I.clear(); HUD.clear(); PP.FX.clear();
    openTitle(); revealTitle();
    if (!SMALL.matches) SFX.startTune();
  };
  async function titleAct(a) {
    SFX.unlock();
    if (a === "resume") return resume();
    if (a === "action") return UI.actions();
    if (a === "practice") return UI.practice();
    if (a === "record") return UI.record();
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    typedOut();
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .ps-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
    const row = (k === "ArrowLeft" || k === "ArrowRight") && document.activeElement && document.activeElement.closest(".ps-menu .util");
    if (row) {
      const bs = [...row.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      ev.preventDefault(); bs[(i + (k === "ArrowRight" ? 1 : -1) + bs.length) % bs.length].focus(); return;
    }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a game ---- */
  const seed = () => 1 + Math.floor(Math.random() * 2 ** 30);
  game.startAction = (id, real, custom, side = "pack") => { PP.clearGame(); game.lastCustom = custom || null; startPlay(E.newAction(id, { seed: seed(), real, custom, side }), true); };
  game.startPractice = kind => { PP.clearGame(); startPlay(E.newPractice({ seed: seed(), real: PP.prefs.real, kind }), true); };
  function startPlay(S, fresh) {
    UI.close(true);
    game.S = S; game.mode = "play"; game.warned = {};
    if (S.mode === "practice" && fresh) game.coach = PP.prefs.learned ? "done" : null;
    SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    I.clear(); HUD.clear(); PP.FX.clear(); PP.Chart.reset(); R.report = null;
    const u = game.ui;
    u.track = []; u.trackT = 0; u.chartAt = null; u.bino = false;
    u.station = "view";
    u.look = PP.Chart.me(S).hdg; u.chartZoom = 3;
    u.sel = null;
    /* a mission opens on the map, where the pack is run */
    if (fresh) u.station = "chart";
    game.syncAids(); fit();
    R.init($("screen"));
    game.acc = 0;
    if (fresh) {
      HUD.toast(S.scnName, "", 3200);
    } else HUD.toast("Back on station", "", 2000);
    hints();
  }
  function resume() {
    const g = PP.loadGame();
    if (!g) return;
    startPlay(g.S, false);
    game.pause();
  }
  game.pause = () => { if (game.mode !== "play" || UI.sheet) return; I.clear(); checkpoint(); UI.pause(); };
  game.unpause = () => { game.acc = 0; game.last = performance.now(); };
  game.leave = () => { checkpoint(true); game.toTitle(); };
  game.endAction = () => { const S = game.S; if (!S) return; S.phase = "over"; S.end = { why: "ended", t: S.t }; finish(); };
  function checkpoint(force) {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over") return;
    if (PP.prefs.resume || force) PP.saveGame(S);
  }
  function finish() {
    const S = game.S;
    SFX.stopLoops();
    PP.clearGame();
    game.mode = "over";
    HUD.end(null);
    UI.actionOver(S);
  }


  /* ---- what happened this step: sounds, and the crew's word ---- */
  const toast = (t, tone, ms) => HUD.toast(t, tone, ms);
  const cls = id => { const s = PP.Ships.byId(game.S, id); return s ? C.SHIPS[s.cls].name.toLowerCase() : "ship"; };
  const brgW = b => PP.deg3(b);
  /* a key in the crew's words, drawn as a cap: the pad's button when the pad was touched last */
  const kc = (k, p) => `<kbd>${onPad() && p ? p : k}</kbd>`;
  /* the crew's last report of a bearing, marked on the periscope's and the bridge's ring */
  const report = (e, S) => { R.report = { brg: e.brg, t: S.t, id: e.id }; };
  function slow() { if (game.ui.aids.autoSlow && game.S.tcReq > 0) game.S.tcReq = 0; }
  /* the rest of the pack's news, in her name: what she fires, sinks, sees first, and what happens to her */
  const boatOf = (S, id) => S.subs.find(q => q.id === id);
  function packNews(S, e) {
    const q = boatOf(S, e.by), n = q ? q.name : "A boat";
    switch (e.t) {
      case "fired": if (S.t - (game.warned["f" + e.by] || -1e9) > 20) { game.warned["f" + e.by] = S.t; toast(`${n} is firing`, "", 1800); } break;
      case "sighted": if (e.first) toast(`${n} reports ${e.role === "escort" ? "an escort" : "a ship"}: a ${C.SHIPS[e.cls].name.toLowerCase()}`, e.role === "escort" ? "amber" : "", 2600); break;
      case "escortContact": if (S.t - (game.warned["c" + e.by] || -1e9) > 120) { game.warned["c" + e.by] = S.t; toast(`${n} is being hunted`, "amber", 2600); } break;
      case "chargesAway": SFX.play("splashes", 0.3); if (S.t - (game.warned["d" + e.by] || -1e9) > 90) { game.warned["d" + e.by] = S.t; toast(`Depth charges on ${n}`, "amber", 2200); } break;
      case "rammed": toast(`${n} has been rammed`, "red", 3000); break;
      case "subLost": SFX.play("bigHit", 0.6); toast(`${n} is lost`, "red", 4200); break;
      case "torpHitUs": toast(`${n} was hit by her own torpedo`, "red", 3000); break;
    }
  }
  /* the escorts' side's news: what the escorts find and do, what happens to the convoy and to the pack */
  function escEvents(S, evs) {
    const f = PP.Escort.flag(S);
    for (const e of evs) {
      switch (e.t) {
        case "command": SFX.play("menu"); toast(`Aboard ${e.name}`, "", 2000); game.ui.track = []; break;
        case "ordered": if (e.what === "bell") SFX.play("bell"); break;
        case "eorders": toast(`${e.name}: ${(C.ESC_ORDERS.find(o => o[0] === e.v) || C.ESC_ORDERS[0])[1].toLowerCase()}${f && e.id === f.id ? ", when you leave her" : ""}`, "", 2000); break;
        case "dcSet": toast(`Charges set for ${e.v} feet`, "", 1200); break;
        case "ping": toast(e.on ? "Sonar pinging: it finds them ahead, and they hear it" : "Sonar off: listening", "", 2000); break;
        case "patternAway": SFX.play("splashes", 0.8); toast("Pattern away!", "amber", 1600); break;
        case "noCharges": toast("No depth charges left", "red", 2000); break;
        case "hedgehogAway": SFX.play("splashes", 0.5); toast("Hedgehog away", "amber", 1600); break;
        case "noHedgehog": toast(e.empty ? "The hedgehog is empty" : "No hedgehog fitted yet", "amber", 1800); break;
        case "noGunTarget": toast("No boat in sight on the surface", "amber", 1600); break;
        case "escortGun": SFX.play("gun", 0.6); break;
        case "eGunHit": SFX.play("shellHit", 0.7); toast("A hit on her!", "green", 1400); break;
        case "eGunMiss": SFX.play("splash", 0.5); break;
        case "dcBoom": { const d = f ? PP.dist(e.x, e.y, f.x, f.y) : 9999; SFX.play(e.hh ? "dcNear" : "dc", PP.clamp(1.2 - d / 3000, 0.15, 1)); if (e.hh) toast("A hedgehog has hit something!", "green", 2400); break; }
        case "escortContact": if (S.t - (game.warned.contact || -1e9) > 30) { game.warned.contact = S.t; const q = S.ships.find(o => o.id === e.id); SFX.play(e.how === "sonar" ? "pingNear" : "sighted"); toast(`${q ? q.name : "An escort"}: ${e.how === "sonar" ? "sonar contact" : e.how === "eye" ? "a boat sighted" : e.how === "radar" ? "radar contact" : "contact"}`, "amber", 2400); } break;
        case "subLost": SFX.play("sunk"); toast(`A boat is sunk${e.why === "crushed" ? ": crushed" : ": she flooded"}`, "green", 3600); break;
        case "rammed": if (e.ours) { SFX.play("bigHit"); toast("Rammed her!", "green", 2400); } break;
        case "fired": if (S.t - (game.warned.fired || -1e9) > 20) { game.warned.fired = S.t; } break;
        case "torpHit": SFX.play("bigHit", 0.7); toast(`Torpedo hit: the ${cls(e.ship)}`, "red", 2400); break;
        case "shipSinking": SFX.play("breakup", 0.5); break;
        case "shipSunk": SFX.play("over", 0.6); toast(`${C.SHIPS[e.cls].name} ${e.name} sunk`, "red", 3000); break;
        case "wakeSeen": toast("Torpedo wake!", "red", 1800); break;
        case "convoyTurns": toast("The convoy turns away", "", 2000); break;
        case "actionOver": SFX.play(e.why === "fleetLost" || e.why === "allSunk" ? "over" : "won"); HUD.end(e.why === "fleetLost" ? "The escorts are gone" : e.why === "allSunk" ? "The convoy is lost" : e.why === "time" ? "Time" : "The pack has drawn off", "", e.why === "fleetLost" || e.why === "allSunk" ? "danger" : "ok"); break;
      }
    }
  }
  function events(S, evs) {
    R.events(S, evs);
    if (S.side === "escorts") return escEvents(S, evs);
    const s = S.sub;
    for (const e of evs) {
      /* the boat you are on is news; another boat's only when it matters */
      /* a boat with her radio out sends no news */
      if (e.by !== undefined && e.by !== s.id && e.t !== "command" && e.t !== "orders" && e.t !== "wp") { const q = boatOf(S, e.by); if (!q || q.sys.radio < 0.5 || e.t === "subLost") packNews(S, e); continue; }
      switch (e.t) {
        case "command": SFX.play("menu"); toast(`In command of ${e.name}`, "", 2200); game.ui.track = []; break;
        case "orders": toast(e.why === "lastWp" ? `${e.name} is at her last waypoint, holding` : `${e.name}: ${PP.Orders.name(e.v).toLowerCase()}${e.id === s.id ? ", when you leave her" : ""}`, "", 2200); break;
        case "wp": break;
        case "decoyAway": SFX.play("launch", 0.4); toast(`Noisemaker away: ${e.left} left`, "", 1800); break;
        case "decoyNo": toast(e.why === "surfaced" ? "Dive first: a noisemaker works under the water" : "No noisemakers left", "amber", 1800); break;
        case "noRadio": toast(`${e.name}'s radio is out: she cannot take a new order`, "amber", 2600); break;
        case "ordered": if (e.what === "bell") SFX.play("bell"); break;
        case "diveAlarm": SFX.play(e.crash ? "crash" : "klaxon"); toast(e.crash ? "Crash dive! All ahead full" : "Dive, dive", e.crash ? "amber" : "", 1800); break;
        case "surfaced": SFX.play("blow"); toast("Surfaced", "", 1400); break;
        case "submerged": break;
        case "atDepth": toast(e.d === C.PD ? "At periscope depth" : `Level at ${e.d} feet`, "", 1600); break;
        case "scopeUp": SFX.play("menu"); break;
        case "scopeDown": if (e.forced) toast("Periscope down: too deep for it", "", 1600); break;
        case "scopeBroken": toast("The periscope is out of action", "red"); break;
        case "tooDeep": toast(`Too deep for the periscope: ${C.PD} feet. ${kc("P", "pad:R-click")} periscope depth`, "amber"); break;
        case "aground": toast("Aground!", "red", 2000); SFX.play("shellHit"); break;
        case "bottomHit": toast("She hit the bottom", "amber"); break;
        case "batLow": toast("Battery low", "amber", 3000); break;
        case "batFlat": toast("The battery is flat: surface to charge", "red", 3600); break;
        case "fuelLow": toast("Fuel low: time to head for a base", "amber", 3600); break;
        case "fuelOut": toast("Out of fuel", "red", 3600); break;
        case "flooding": SFX.play("warn"); toast("Flooding!", "red", 3000); break;
        case "creak": SFX.play("creak", 0.6 + Math.min(0.4, (s.depth - Sub.testDepth(s)) / 200)); if (!game.warned.deep) { game.warned.deep = true; toast("Below test depth: the hull is groaning", "red", 3000); } break;
        case "sighted": SFX.play("sighted"); report(e, S); toast(`${e.role === "escort" ? "Escort" : "Ship"} sighted, bearing ${brgW(e.brg)}: a ${C.SHIPS[e.cls].name.toLowerCase()}`, e.role === "escort" ? "amber" : "", 3000); slow(); break;
        case "radarContact": SFX.play("sighted"); report(e, S); toast(`Radar contact, bearing ${brgW(e.brg)}, ${PP.num(Math.round(e.rng / 100) * 100)} yards`, "", 3000); slow(); break;
        case "smoke": report(e, S); toast(`Smoke on the horizon, bearing ${brgW(e.brg)}`, "", 3200); slow(); break;
        case "screws": report(e, S); toast(`Screws on the hydrophones, bearing ${brgW(e.brg)}${e.fast ? ": fast, an escort" : ""}`, e.fast ? "amber" : "", 3000); slow(); break;
        case "locked": SFX.play("menu"); toast(`Selected: the ${cls(e.id)} ${e.name}`, "", 1800); break;
        case "lostLock": toast("Lost the target", "amber"); break;
        case "noRange": toast("Nothing in sight to range on", "amber", 1600); break;
        case "ranged": toast(`Range ${PP.num(Math.round(e.rng / 50) * 50)} yards`, "", 1400); break;
        case "fired": SFX.play("launch"); toast(`Tube ${e.tube.slice(1)} ${e.tube[0] === "F" ? "forward" : "aft"}: fired${e.solved ? `, ${Math.round(e.run)} yards` : ", no solution"}`, "", 1800); break;
        case "cantFire": toast({ damaged: "Those tubes are damaged", deep: "Too deep to fire", none: "No tubes there", empty: (e.bank === "F" ? "Forward" : "After") + ` tubes empty: ${kc("F", "pad:dL")} switches`,
          angle: `Wrong angle: fire the ${e.bank === "F" ? "after" : "forward"} tubes (${kc("F", "pad:dL")}), or turn toward her`, range: "Out of range: let her close" }[e.why] || "Can't fire", "amber"); break;
        case "noTarget": toast("No vessel in range", "amber", 1600); break;
        case "noSolution": break;
        case "reloaded": SFX.play("reloaded"); break;
        case "torpHit": SFX.play("hit"); toast(`Hit! The ${cls(e.ship)}`, "green", 2400); slow(); if (S.mode === "practice" && game.coach !== "done") { game.coach = "done"; PP.prefs.learned = true; PP.savePrefs(); toast("That's the attack. Escorts next: try a convoy action", "green", 4200); } break;
        case "torpDud": SFX.play("dud"); toast(e.why === "unarmed" ? "It hit before it armed" : "A dud: it hit, and did nothing", "amber", 2600); break;
        case "torpPremature": SFX.play("hit", 0.6); toast("A torpedo went off early", "amber", 2400); break;
        case "torpUnder": toast("It ran under her: too deep", "amber", 2400); break;
        case "torpMiss": toast("A miss: the torpedo ran out", "", 1600); break;
        case "torpHitUs": SFX.play("bigHit"); toast("Our own torpedo came round and hit us!", "red", 3600); break;
        case "wakeSeen": toast("They've seen a torpedo's wake", "amber", 2000); break;
        case "shipExplodes": SFX.play("bigHit"); toast("She blew up!", "green", 2600); break;
        case "shipSinking": SFX.play("breakup", 0.7); break;
        case "shipSunk": SFX.play("sunk"); toast(e.role === "escort" ? `${C.SHIPS[e.cls].name} ${e.name} sunk` : `${C.SHIPS[e.cls].name} ${e.name} sunk: ${PP.num(e.tons)} tons`, "green", 3200); break;
        case "convoyTurns": toast("The convoy is turning away", "", 2200); break;
        case "scatter": toast("The convoy is scattering!", "amber", 2400); break;
        case "spotted": if (S.t - (game.warned.spot || -1e9) > 120) { game.warned.spot = S.t; toast(e.how === "eye" ? "They've seen us" : e.how === "radar" ? "Their radar has us" : "They've heard us", "red", 2600); } break;
        case "escortContact": SFX.play(e.how === "sonar" ? "pingNear" : "warn"); if (S.t - (game.warned.contact || -1e9) > 60) { game.warned.contact = S.t; toast(e.how === "sonar" ? "Pinging: an escort has us on sonar. Deep, slow and quiet" : "An escort has us. Deep, slow and quiet", "red", 3000); } slow(); break;
        case "escortRun": toast("Escort turning toward, at speed!", "red", 2400); break;
        case "chargesAway": SFX.play("splashes", 0.7); toast("Depth charges!", "red", 2000); break;
        case "dcBoom": { const d = Math.hypot((e.x - s.x) * 3, (e.y - s.y) * 3, e.z - s.depth); SFX.play(d < 160 ? "dcNear" : "dc", PP.clamp(1.4 - d / 900, 0.15, 1)); break; }
        case "escortGivesUp": if (game.warned.contact && S.t - game.warned.contact < 3600 && !S.ships.some(q => q.role === "escort" && !q.sinking && ["alert", "search", "attack", "drop", "open", "guns", "hold"].includes(q.ai.st))) { game.warned.contact = 0; SFX.play("relief"); toast("The escorts have lost us", "green", 3200); } break;
        case "escortGun": SFX.play("gun", 0.5); break;
        case "shellNear": SFX.play("shellNear", 0.7); break;
        case "shellHit": SFX.play("shellHit"); toast("Hit by gunfire!", "red", 1800); break;
        case "rammed": SFX.play("bigHit"); toast("Rammed!", "red", 3000); break;
        case "hullHit": HUD.flash(); break;
        case "sysHit": toast(`${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} damaged`, "red", 2400); break;
        case "repaired": SFX.play("reloaded"); toast(e.sys === "hull" ? "The hull is patched" : `${(Sub.SYS.find(q => q[0] === e.sys) || [0, e.sys])[1]} repaired`, "green", 2000); break;
        case "plane": SFX.play("plane"); toast(`Aircraft, bearing ${brgW(e.brg)}! Dive! ${kc("C", "pad:L-click")}`, "red", 3200); slow(); break;
        case "planeAttack": break;
        case "bombs": SFX.play("bombs"); toast(s.depth > 50 ? "Bombs, close aboard" : "Bombs!", "red", 2200); break;
        case "gunManned": toast("Gun crew on deck", "", 1400); break;
        case "gunSecured": toast("Gun secured", "", 1400); break;
        case "gunFire": SFX.play("gun"); break;
        case "gunHit": SFX.play("shellHit", 0.7); toast("A hit", "green", 1000); break;
        case "gunSplash": SFX.play("splash", 0.5); break;
        case "gunNo": toast({ submerged: "Surface to man the gun", damaged: "The gun is damaged", manning: "The gun is not manned yet", shells: "No shells left" }[e.why], "amber"); break;
        case "radar": toast(e.on ? "Radar on" : "Radar off", "", 1200); break;
        case "noRadar": toast("This boat has no radar yet", "amber"); break;
        case "silent": toast(e.on ? `Silent running: pumps stopped, 1/3 at most. ${kc("X", "pad:Back+B")} to run normally` : "Silent running off: all speeds", "", 2600); break;
        case "bellCapped": toast(`Running silent: 1/3 is the most. ${kc("X", "pad:Back+B")} to run normally`, "amber", 2600); break;
        case "bank": toast(e.bank === "F" ? "Forward tubes" : "After tubes", "", 1000); break;
        case "spread": toast(e.n === 1 ? "Single shots" : `A spread of ${e.n}: fire ${e.n}, one press each, and they fan out`, "", 2200); break;
        case "tcDropped": break;
        case "weather": toast(`The weather: ${C.WX[e.k].name.toLowerCase()}`, "", 2400); break;
        case "atPort": toast(`${e.name} in reach: surface, slow, and ${kc("O", "pad:Y")} to tie up`, "green", 3600); break;
        case "warOver": toast("Word from command: the war is over. Come home.", "green", 5000); break;
        case "subLost": SFX.play("over"); HUD.end(e.why === "crushed" ? "The hull gave way" : "She is flooding", S.subs.length > 1 ? "The last of the pack, lost" : "Lost with all hands", "danger"); break;
        case "towed": toast("Out of fuel and battery: a tug is sent", "amber", 3000); break;
        case "actionOver": SFX.play(e.why === "allSunk" || e.why === "slipped" ? "won" : "over"); HUD.end(e.why === "allSunk" ? (S.goal === "escort" ? "The hunter is sunk" : "The convoy is destroyed") : e.why === "slipped" ? "The pack has slipped away" : "The convoy got away", `${PP.num(S.stats.tons)} tons`, e.why === "allSunk" || e.why === "slipped" ? "ok" : ""); break;
      }
    }
  }
  /* the sounds that go on */
  function loops(S) {
    if (SFX.muted || !SFX.ctx) return;
    if (S.side === "escorts") { const f = PP.Escort.flag(S), v = f ? f.spd / 30 : 0; SFX.loop("diesel", 0.3 + v * 0.6, v); SFX.loop("sea", 0.5 + S.wx.sea * 0.1, S.wx.sea / 6); SFX.loop("motor", 0, 0); SFX.loop("screws", 0, 0); return; }
    const s = S.sub, surf = Sub.surfaced(s), f = Math.abs(s.spd) / 20;
    SFX.loop("diesel", surf && s.fuel > 0 ? 0.4 + f : 0, f);
    SFX.loop("sea", surf ? 0.5 + S.wx.sea * 0.1 : 0, S.wx.sea / 6);
    SFX.loop("motor", !surf ? 0.3 + Math.abs(s.spd) / 9 : 0, Math.abs(s.spd) / 9);
    let sc = 0;
    if (!surf) for (const sh of S.ships) if (PP.Ships.alive(sh)) sc = Math.max(sc, 1 - PP.dist(s.x, s.y, sh.x, sh.y) / 9000);
    SFX.loop("screws", sc, sc);
  }
  /* ---- the key strip along the foot (a Field aid): what the station in front of you needs now, five keys at
   * most, in the keys of whatever you last touched; when you are hunted, how to get away. And the coach: the
   * first torpedo practice's lesson, step by step, whatever the aids, until the first hit ---- */
  const SEP = ' <span class="sep"></span> ';
  const KY = (k, p, w, pw) => ({ k, p, w, pw: pw || w });
  const KEY = {
    tele: KY(["W", "S"], ["pad:L-stick"], "telegraph", "flick: telegraph"),
    helm: KY(["A", "D"], ["pad:L-stick"], "helm"),
    depth: KY(["Q", "E"], ["pad:dU", "pad:dD"], "depth"),
    deeper: KY(["E"], ["pad:dD"], "deeper"),
    pd: KY(["P"], ["pad:R-click"], "periscope depth"),
    surface: KY(["U"], ["pad:R-click"], "surface"),
    crash: KY(["C"], ["pad:L-click"], "crash dive"),
    train: KY(["left", "right"], ["pad:R-stick"], "train"),
    raise: KY(["up"], ["pad:B"], "raise the periscope"),
    power: KY(["Z"], ["pad:Y"], "power"),
    lock: KY(["T"], ["pad:X"], "select a ship"),
    onHer: KY(["H"], ["pad:Back+R-click"], "swing onto her"),
    ahead: KY(["B"], ["pad:Back+RT"], "bow, stern"),
    next: KY(["T"], ["pad:X"], "next ship"),
    fire: KY(["Space"], ["pad:A"], "fire"),
    look: KY(["left", "right"], ["pad:R-stick"], "look"),
    glasses: KY(["up", "down"], ["pad:Y"], "glasses"),
    gun: KY(["G"], ["pad:dR"], "man the gun"),
    secure: KY(["G"], ["pad:dR"], "secure the gun"),
    gunTrain: KY(["left", "right"], ["pad:R-stick"], "train the gun"),
    gunRange: KY(["up", "down"], ["pad:dU", "pad:dD"], "range"),
    time: KY(["+", "−"], ["pad:LT", "pad:RT"], "time"),
    zoom: KY(["Z"], ["pad:Y"], "zoom"),
    silent: KY(["X"], ["pad:Back+B"], "silent running"),
    slower: KY(["S"], ["pad:L-stick"], "slower", "flick down: slower"),
    turn: KY(["A", "D"], ["pad:L-stick"], "turn across his line"),
    chart: KY(["1"], ["pad:Back"], "the map"),
    scope: KY(["2"], ["pad:LB", "pad:RB"], "the view", "to the view"),
    click: KY([], null, "click a boat to select her"),
    pan: KY([], null, "drag to look round"),
    keys: KY(["?"], ["pad:Back+Start"], "all keys"),
  };
  const onPad = () => I.device === "pad";
  /* one key and its words; [name, words] gives other words */
  const chip = (n, w) => { const it = KEY[n], ks = onPad() ? it.p : it.k; return ks ? (ks.map(I.cap).join("") + " " + (w || (onPad() ? it.pw : it.w))).trim() : ""; };
  function coach(S) {
    if (S.mode !== "practice" || S.scn !== "torpedo" || game.coach === "done") return null;
    const s = S.sub, st = R.stationOf(S, game.ui);
    if (S.stats.hits) { game.coach = "done"; return null; }
    if (S.stats.fired && S.torps.length) return `Watch it run: ${chip("chart")}${SEP}${chip("scope")}`;
    if (S.stats.fired) return `A miss. Shoot from ahead of her, 1,000 to 2,000 yards off her track, near 90° on the bow${SEP}${chip("lock")}${SEP}${chip("fire")}`;
    if (st !== "scope" && st !== "bridge") return `The attack is made at the periscope: ${chip("scope", " ")}`;
    if (st === "scope" && s.depth > C.PD + 4) return chip("pd");
    if (st === "scope" && !s.scope.up) return chip("raise");
    if (S.tdc.tgt === null) {
      const L = R.last, seen = L && L.view && L.view.drawn.some(d => PP.Detect.known(S, PP.Ships.byId(S, d.id)) && d.haze < 0.9);
      if (seen) return s.scope.hi ? `${chip("lock", "locks the ship nearest the crosshair")}${SEP}${chip("power", "back to low power")}` : `${chip("power", "high power, for a closer look")}${SEP}${chip("lock", "locks the ship nearest the crosshair")}`;
      const near = S.ships.filter(q => PP.Detect.known(S, q) && PP.Ships.alive(q)).sort((a, b) => PP.dist(s.x, s.y, a.x, a.y) - PP.dist(s.x, s.y, b.x, b.y))[0];
      return near ? `${chip("onHer")}, or ${chip(st === "scope" ? "train" : "look", st === "scope" ? "train the periscope onto her" : "look round to her")}: she bears ${PP.deg3(PP.angTo(s.x, s.y, near.x, near.y))}, the hollow mark on the ring` : "Watch for the targets";
    }
    const e = W.est(S), sol = e && W.solve(S, e, s.bank), eye = S.real.aob ? `${SEP}set her angle and speed: <kbd>[</kbd><kbd>]</kbd> <kbd>,</kbd><kbd>.</kbd>` : "";
    if (sol && sol.ok) return `On target: ${chip("fire", "fires")}${e.rng > 3000 ? `${SEP}closer is surer: under 3,000 yards` : ""}${eye}`;
    if (sol && sol.why === "gyro") return `Wrong angle: ${chip("helm", "turn the boat toward her")}, or the other tubes${eye}`;
    if (sol && sol.why === "range") return `Out of range: let her close${SEP}${chip("helm", "steer for her track")}${eye}`;
    return `When the lamp says On target, ${chip("fire", "fires")}${eye}`;
  }
  function escStrip(S) {
    const st = R.stationOf(S, game.ui), m = PP.Escort.mine(S), fresh = m.some(q => q.ai.contact && S.t - q.ai.contact < 60);
    const C2 = (k, w) => k.map(I.cap).join("") + " " + w;
    if (fresh) return ["danger", "Contact", [C2(["W", "S"], "speed"), C2(["A", "D"], "helm"), C2(["Q", "E"], "charges' depth"), C2(["Space"], "pattern"), C2(["F"], "hedgehog")]];
    return ["", "", st === "chart" ? [C2(["Z"], "zoom"), C2(["W", "S"], "speed"), C2(["A", "D"], "helm"), C2(["X"], "sonar"), C2(["O"], "her orders")] : [C2(["left", "right"], "look"), C2(["up", "down"], "glasses"), C2(["G"], "guns"), C2(["Space"], "pattern"), C2(["X"], "sonar")]];
  }
  function strip(S) {
    const s = S.sub, st = R.stationOf(S, game.ui), surf = Sub.surfaced(s), locked = S.tdc.tgt !== null;
    if (surf && S.planes.some(p => p.seen)) return ["danger", "Aircraft", ["crash"]];
    if (S.charges.length || S.ships.some(q => q.role === "escort" && !q.sinking && q.ai.contact && S.t - q.ai.contact < 60)) return ["danger", "Hunted", surf ? ["crash", "tele", "helm"] : ["deeper", "silent", "slower", "turn"]];
    const by = {
      scope: s.depth > C.PD + 4 ? ["pd", "depth", "tele", "helm"] : !s.scope.up ? ["raise", "depth", "tele", "helm"] : locked ? ["train", "power", "fire", "next", "helm"] : ["train", "onHer", "power", "lock", "helm"],
      bridge: s.gun.on ? ["gunTrain", "onHer", "gunRange", "fire", "secure"] : locked ? ["look", "glasses", "fire", "gun", "crash"] : ["look", "onHer", "glasses", "lock", "gun"],
      panel: surf ? ["tele", "helm", ["pd", "dive to periscope depth"], "crash", "time"] : ["tele", "helm", "depth", "pd", "surface"],
      chart: ["zoom", "tele", "helm", "time", "click", "pan"],
      damage: surf ? ["tele", "helm", "time", "pd"] : ["tele", "helm", "depth", "silent"],
    };
    return ["", "", by[st] || []];
  }
  /* each key with its words is one piece, so a narrow strip wraps between them, never inside */
  const pieces = html => html.split(SEP).map(x => `<span class="seg">${x}</span>`).join(SEP);
  function hints() {
    const S = game.S;
    if (!S) { HUD.hint(null); return; }
    const c = S.side === "escorts" ? null : coach(S);
    if (c) { HUD.hint(pieces(`<b class="hl">Practice</b>${SEP}${c}`), "coach"); return; }
    if (!game.ui.aids.hints) { HUD.hint(null); return; }
    const [tone, lead, list] = S.side === "escorts" ? escStrip(S) : strip(S);
    const parts = S.side === "escorts" ? list : list.map(n => Array.isArray(n) ? chip(n[0], n[1]) : chip(n)).filter(Boolean);
    HUD.hint(pieces((lead ? `<b class="hl">${lead}</b>${SEP}` : "") + parts.join(SEP) + `${SEP}<span class="more">${chip("keys")}</span>`), tone);
  }
  /* the boat selected on the map (her orders, her waypoints): the one in command until another is clicked */
  game.selIdx = () => { const S = game.S, i = S.subs.findIndex(q => q.id === game.ui.sel); return i >= 0 && !S.subs[i].lost ? i : S.cmd; };
  game.setStation = st => {
    const S = game.S; if (!S) return;
    if (st === "log") { UI.log(S, () => game.unpause()); return; }
    if (st === "bridge" || st === "scope") st = "view";
    if (st === "view" && game.ui.station !== "view") game.ui.look = PP.Chart.me(S).hdg;
    if (st !== game.ui.station) game.ui.chartAt = null;
    game.ui.station = st; SFX.play("menu"); hints();
  };
  /* lock the ship nearest the crosshair (or the next one, pressed again) */
  function lockNearest() {
    const S = game.S, L = R.last;
    let cands = [];
    if (L && L.view) cands = L.view.drawn.filter(d => PP.Detect.known(S, PP.Ships.byId(S, d.id)) && d.haze < 0.9).map(d => ({ id: d.id, v: Math.abs(d.x - L.cx) }));
    else cands = S.ships.filter(sh => PP.Detect.known(S, sh) && PP.Ships.alive(sh)).map(sh => ({ id: sh.id, v: PP.dist(S.sub.x, S.sub.y, sh.x, sh.y) }));
    cands.sort((a, b) => a.v - b.v);
    if (!cands.length) { const st = R.stationOf(S, game.ui), how = onPad() ? "the right stick" : "the arrows"; HUD.toast(st === "scope" ? `Nothing in sight to lock: train the periscope with ${how}, or ${kc("H", "pad:Back+R-click")} swings to the nearest` : st === "bridge" ? `Nothing in sight to lock: look round with ${how}, or ${kc("H", "pad:Back+R-click")} swings to the nearest` : "Nothing in sight to lock", "amber", 2400); return; }
    const i = cands.findIndex(c => c.id === S.tdc.tgt);
    const pick = i >= 0 && L && L.view && cands[i].v < 4 ? cands[(i + 1) % cands.length] : cands[0];
    if (pick.id === S.tdc.tgt && cands.length > 1) I.push({ a: "lock", id: cands[(i + 1) % cands.length].id });
    else I.push({ a: "lock", id: pick.id });
  }

  /* the swings: the periscope, the glasses or the gun onto her (the locked target, else the nearest in sight,
   * else the crew's last report), or round to the bow, and again to the stern. From another station, to the
   * periscope, or the bridge on the surface. */
  function swing(a) {
    const S = game.S, s = S.sub, u = game.ui;
    let st = R.stationOf(S, u);
    if (st !== "scope" && st !== "bridge") { game.setStation(Sub.surfaced(s) ? "bridge" : "scope"); st = u.station; }
    if (a === "ahead") {
      const now = st === "scope" ? s.scope.brg : PP.angDiff(s.hdg, s.gun.on ? s.gun.brg : u.look), rel = Math.abs(now) < 5 * PP.DEG ? Math.PI : 0;
      I.swing(S => S.sub.hdg + rel);
      return;
    }
    const seen = q => q && PP.Ships.alive(q) && PP.Detect.known(S, q);
    let her = S.tdc.tgt !== null ? PP.Ships.byId(S, S.tdc.tgt) : null;
    if (!seen(her)) her = S.ships.filter(seen).sort((p, q) => PP.dist(s.x, s.y, p.x, p.y) - PP.dist(s.x, s.y, q.x, q.y))[0];
    if (her) {
      const id = her.id;
      I.swing(S => { const q = PP.Ships.byId(S, id); return q && PP.Ships.alive(q) ? PP.angTo(S.sub.x, S.sub.y, q.x, q.y) : null; });
    } else if (R.report && S.t - R.report.t < 600) { const b = R.report.brg; I.swing(() => b); }
    else toast("Nothing in sight, and no report to swing to", "amber", 1800);
  }

  /* ---- the loop ---- */
  function step() {
    const S = game.S;
    const cmd = I.cmd(S, game.ui, game.step);
    const evs = E.tick(S, cmd, game.ui.aids);
    events(S, evs);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - game.last); game.last = now;
    if (game.mode === "title" || game.mode === "play" || game.mode === "over") {
      const fresh = I.pollPad();
      if (UI.sheet || game.mode !== "play" || document.querySelector(".ps-ask")) menuPad(fresh);
      else for (const a of fresh) { konamiStep("pad", a); padAct(a); }
    }
    if (game.mode === "title") { titleFrame(dt, now); return; }
    if (!game.S || (game.mode !== "play" && game.mode !== "over")) return;
    const S = game.S;
    if (game.mode === "play") {
      if (!UI.sheet && S.phase === "sea") {
        game.acc += dt;
        let n = 0;
        while (game.acc >= game.step && n++ < 6) { game.acc -= game.step; step(); if (S.phase !== "sea") break; }
        if (n >= 6) game.acc = 0;
        PP.ShipArt.budget = 2;
      }
      if (S.phase === "over" && game.mode === "play") { game.mode = "over"; setTimeout(finish, S.end && (S.end.why === "crushed" || S.end.why === "flooded" || S.end.why === "allSunk" || S.end.why === "escaped" || S.end.why === "slipped") ? 2600 : 50); }
      loops(S);
    }
    R.draw(S, game.ui, now, dt / 1000);
    HUD.draw(S, game.ui);
    if (game.mode === "play" && (now - (game.hintAt || 0)) > 500) { game.hintAt = now; hints(); }
  }
  let titleAcc = 0;
  function titleFrame(dt, now) {
    const cv = document.querySelector("#title .ps-scene");
    if (!cv || UI.sheet && UI.sheet.el.classList.contains("full")) return;
    const D = game.demo;
    titleAcc += dt;
    let n = 0;
    while (titleAcc >= 20 && n++ < 3) { titleAcc -= 20; const c = game.demoBot.cmd(D); c.acts = c.acts.filter(a => a.a !== "tc").concat([{ a: "tc", v: 4 }]); E.tick(D, c); }
    if (n >= 3) titleAcc = 0;
    PP.ShipArt.budget = 3;
    if (D.phase !== "sea") newDemo();
    R.title(cv, D, now);
  }

  /* ---- the Konami code: up up down down left right left right B A ---- */
  const KONAMI = { keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"],
    pad: ["shallower", "shallower", "deeper", "deeper", "bank", "gun", "bank", "gun", "scope", "fire"] };
  const konamiAt = { keys: 0, pad: 0 };
  function konamiStep(src, x) {
    const seq = KONAMI[src], i = konamiAt[src];
    konamiAt[src] = x === seq[i] ? i + 1 : x === seq[0] ? (i === 2 ? 2 : 1) : 0;
    if (konamiAt[src] < seq.length) return;
    konamiAt.keys = konamiAt.pad = 0;
    if (!game.S || !E.konami(game.S)) return;
    SFX.play("won");
    toast("Konami code: tubes loaded, repairs done, and the torpedoes run true", "green", 4000);
  }

  /* ---- the orders the keys give ---- */
  /* ---- the escorts' side's keys: the escort you are aboard, and the others from the map ---- */
  const escSel = S => { const m = PP.Escort.mine(S); return m.find(q => q.id === game.ui.sel) || PP.Escort.flag(S); };
  function escAct(a, ev) {
    const S = game.S, u = game.ui, st = R.stationOf(S, u), shift = ev && ev.shiftKey, f = PP.Escort.flag(S);
    if (!f) return;
    const onMap = st === "chart";
    switch (a) {
      case "tU": I.push({ a: "bell", d: 1 }); break;
      case "tD": I.push({ a: "bell", d: -1 }); break;
      case "hL": case "hR": if (!ev || !ev.repeat) I.tapHelm(a === "hL" ? -1 : 1); break;
      case "aL": case "aR": if (onMap && (!ev || !ev.repeat)) I.tapHelm(a === "aL" ? -1 : 1); break;
      case "aU": case "aD": if (onMap) I.push({ a: "bell", d: a === "aU" ? 1 : -1 }); else u.bino = a === "aU"; break;
      case "shallower": I.push({ a: "dcSet", d: -25 }); break;
      case "deeper": I.push({ a: "dcSet", d: 25 }); break;
      case "fire": I.push({ a: "pattern" }); break;
      case "bank": I.push({ a: "hedgehog" }); break;
      case "gun": I.push({ a: "egun" }); break;
      case "silent": I.push({ a: "ping" }); break;
      case "zoom": if (onMap) { u.chartZoom = (u.chartZoom + (shift ? PP.Chart.ZOOMS.length - 1 : 1)) % PP.Chart.ZOOMS.length; u.chartAt = null; SFX.play("menu"); } else u.bino = !u.bino; break;
      case "tcU": I.push({ a: "tc", d: 1 }); break;
      case "tcD": I.push({ a: "tc", d: -1 }); break;
      case "tc1": I.push({ a: "tc", v: 0 }); break;
      case "st1": case "st3": case "st4": game.setStation("chart"); break;
      case "st2": game.setStation("view"); break;
      case "st6": game.setStation("log"); break;
      case "stNext": case "stPrev": game.setStation(st === "chart" ? "view" : "chart"); break;
      case "boatNext": { const m = PP.Escort.mine(S), i = m.indexOf(f); if (m.length > 1) I.push({ a: "commandEsc", id: m[(i + (shift ? m.length - 1 : 1)) % m.length].id }); else toast("No other escort afloat", "amber", 1600); break; }
      case "orders": { const q = escSel(S), L = C.ESC_ORDERS.map(o => o[0]), j = L.indexOf(q.ord || "screen"); I.push({ a: "eorders", id: q.id, v: L[(j + (shift ? L.length - 1 : 1)) % L.length] }); break; }
      case "takeCmd": { const q = escSel(S); if (onMap && q !== f) I.push({ a: "commandEsc", id: q.id }); break; }
      case "pause": game.pause(); break;
      case "aids": PP.flipAids(); game.syncAids(); hints(); break;
      case "help": UI.help(1, () => game.unpause()); break;
    }
  }
  function act(a, ev) {
    if (game.S && game.S.side === "escorts") return escAct(a, ev);
    const S = game.S, s = S.sub, u = game.ui, st = R.stationOf(S, u), shift = ev && ev.shiftKey;
    const helmSt = st === "chart" || st === "damage";
    switch (a) {
      case "tU": I.push({ a: "bell", d: 1 }); break;
      case "tD": I.push({ a: "bell", d: -1 }); break;
      case "hL": case "hR": if (!ev || !ev.repeat) I.tapHelm(a === "hL" ? -1 : 1); break;
      case "aL": case "aR": if (helmSt && (!ev || !ev.repeat)) I.tapHelm(a === "aL" ? -1 : 1); break;
      case "aU": case "aD":
        if (helmSt) I.push({ a: "bell", d: a === "aU" ? 1 : -1 });
        else if (st === "scope") I.push({ a: "scope", v: a === "aU" });
        else if (st === "bridge") { if (s.gun.on) I.push({ a: "gunRange", d: (a === "aU" ? 1 : -1) * (shift ? 500 : 100) }); else { u.bino = a === "aU"; } }
        break;
      case "shallower": I.push({ a: "depth", d: -1 }); break;
      case "deeper": I.push({ a: "depth", d: 1 }); break;
      case "surface": I.push({ a: "surface" }); break;
      case "pd": I.push({ a: "pd" }); break;
      case "crash": I.push({ a: "crash" }); break;
      case "zoom": if (st === "chart") { u.chartZoom = (u.chartZoom + (shift ? PP.Chart.ZOOMS.length - 1 : 1)) % PP.Chart.ZOOMS.length; u.chartAt = null; SFX.play("menu"); } else if (st === "bridge") u.bino = !u.bino; else I.push({ a: "zoom" }); break;
      case "lock": lockNearest(); break;
      case "onHer": case "ahead": swing(a); break;
      case "aobL": case "aobR": I.push({ a: "dial", what: "aob", d: (a === "aobR" ? 1 : -1) * (shift ? 1 : 5) * PP.DEG }); break;
      case "spdD": case "spdU": I.push({ a: "dial", what: "spd", d: (a === "spdU" ? 1 : -1) * (shift ? 0.5 : 1) }); break;
      case "fire": if (st === "bridge" && s.gun.on) I.push({ a: "gunFire" }); else I.push({ a: "fire" }); break;
      case "bank": I.push({ a: "bank" }); break;
      case "spread": I.push({ a: "spread" }); break;
      case "gun": if (st !== "bridge" && Sub.surfaced(s)) game.setStation("bridge"); I.push({ a: "gun" }); break;
      case "silent": I.push({ a: "silent" }); break;
      case "radar": I.push({ a: "radar" }); break;
      case "decoy": I.push({ a: "decoy" }); break;
      case "tcU": I.push({ a: "tc", d: 1 }); break;
      case "tcD": I.push({ a: "tc", d: -1 }); break;
      case "tc1": I.push({ a: "tc", v: 0 }); break;
      case "st1": game.setStation("chart"); break;
      case "st2": game.setStation("view"); break;
      case "st3": game.setStation("damage"); break;
      case "st4": game.setStation("chart"); break;
      case "st6": game.setStation("log"); break;
      case "stNext": case "stPrev": { const L = HUD.STATIONS.map(q => q[0]), i = L.indexOf(st === "bridge" || st === "scope" ? "view" : st); game.setStation(L[(i + (a === "stPrev" || shift ? L.length - 1 : 1)) % L.length]); break; }
      case "pause": game.pause(); break;
      case "aids": PP.flipAids(); game.syncAids(); HUD.toast(PP.prefs.aids === "field" ? `Field aids, and the key hints. ${kc("L", "pad:Back+RB")} for Classic` : `Classic: no aids, no key hints. ${kc("L", "pad:Back+RB")} for Field`, "", 2600); hints(); break;
      case "scope": I.push({ a: "scope" }); break;
      case "level": I.push({ a: Sub.surfaced(s) || s.depth > C.PD + 6 ? "pd" : "surface" }); break;
      case "help": UI.help(6, () => game.unpause()); break;
      /* the pack: the next boat afloat (Shift, the one before) */
      case "boatNext": {
        const n = S.subs.length, d = shift ? n - 1 : 1;
        for (let k = 1, i = (S.cmd + d) % n; k < n; k++, i = (i + d) % n) if (!S.subs[i].lost) { I.push({ a: "command", i }); break; }
        if (E.afloat(S).length < 2) toast(S.subs.length > 1 ? "No other boat afloat" : "A boat alone: no pack to command", "amber", 1800);
        break;
      }
      /* the map's orders: O the next order for the boat selected there (Shift, the one before); Enter takes command of her */
      case "orders": {
        const i = game.selIdx(), q = S.subs[i], L = PP.Orders.LIST.map(o => o[0]), j = L.indexOf(q.orders || "attack");
        I.push({ a: "orders", i, v: L[(j + (shift ? L.length - 1 : 1)) % L.length] });
        break;
      }
      case "takeCmd": if (st === "chart" && game.selIdx() !== S.cmd) I.push({ a: "command", i: game.selIdx() }); break;
    }
  }
  /* a pad's button means what the moment needs: Y ties up at a base, the d-pad lays the gun when it is manned */
  function padAct(a) {
    const S = game.S, st = R.stationOf(S, game.ui);
    if (a === "scope" && st !== "scope") return;
    if ((a === "shallower" || a === "deeper") && st === "bridge" && S.sub.gun.on) a = a === "shallower" ? "aU" : "aD";
    act(a, null);
  }
  /* in a menu, a pad works it as the keys do: the d-pad (or a flick of the stick) moves, A chooses, B goes
   * back, the bumpers turn Help's pages, Start resumes */
  function menuPad(fresh) {
    const send = key => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
    for (const b of I.padBtns) {
      if (b === 0) { const f = document.activeElement; if (f && f !== document.body && f.click) f.click(); }
      else if (b === 1 || (b === 9 && UI.sheet && game.mode === "play")) send("Escape");
      else if (b >= 12 && b <= 15) send(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"][b - 12]);
      else if ((b === 4 || b === 5) && UI.sheet && UI.sheet.tabs) UI.sheet.tabs(UI.sheet.tabAt() + (b === 5 ? 1 : -1));
    }
    for (const a of fresh) if (a === "tU" || a === "tD") send(a === "tU" ? "ArrowUp" : "ArrowDown");
  }

  /* ---- keys ---- */
  document.addEventListener("keydown", ev => {
    SFX.unlock();
    if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune();
    if (ev.key === "Shift") I.held.add("shift");
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    let a = I.actionFor(ev.code);
    if (!a && (ev.key === "+" || ev.key === "=")) a = "tcU";
    if (!a && ev.key === "?") { UI.help(game.S && game.S.side === "escorts" ? 1 : 5, () => game.unpause()); return; }
    if (ev.code === "F5" || ev.code === "F12") return;
    if (a || /^F\d+$/.test(ev.code)) ev.preventDefault();
    if (!ev.repeat) konamiStep("keys", ev.code);
    if (!a) return;
    I.down(ev, a);
    const rep = ["tU", "tD", "shallower", "deeper", "aobL", "aobR", "spdD", "spdU", "tcU", "tcD", "aU", "aD"];
    if (ev.repeat && !rep.includes(a)) return;
    act(a, ev);
  });
  document.addEventListener("keyup", ev => { if (ev.key === "Shift") I.held.delete("shift"); I.up(ev); });
  addEventListener("blur", () => { I.clear(); if (game.mode === "play") game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play") game.pause(); } });
  addEventListener("pagehide", () => checkpoint());
  document.addEventListener("pointerdown", () => { SFX.unlock(); if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune(); }, true);
  document.addEventListener("pointerover", ev => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest && ev.target.closest("button:not(:disabled), summary");
    if (!b || b === document.activeElement || !b.closest(".ps-sheet, #title") || b.closest(".sh-head")) return;
    const a = document.activeElement;
    if (a && a.matches("input")) return;
    if (document.querySelector(".ps-ask")) return;
    b.focus({ preventScroll: true });
  });
  $("title").addEventListener("pointerdown", typedOut);
  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());
  /* on the map, a right click adds a waypoint for the boat selected there and sets her to patrol; Shift clears hers first */
  $("screen").addEventListener("contextmenu", ev => {
    ev.preventDefault();
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet || R.stationOf(S, game.ui) !== "chart") return;
    const cv = $("screen"), r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    const p = PP.Chart.toSea(S, game.ui, px, py, cv.width, cv.height);
    if (S.side === "escorts") {
      const q = escSel(S); if (!q || q.id === S.flag) return;
      I.push({ a: "ewp", id: q.id, x: p.x, y: p.y, clear: ev.shiftKey }); if (q.ord !== "patrol") I.push({ a: "eorders", id: q.id, v: "patrol" }); SFX.play("menu"); return;
    }
    const i = game.selIdx();
    I.push({ a: "wp", i, x: p.x, y: p.y, clear: ev.shiftKey });
    if (S.subs[i].orders !== "patrol") I.push({ a: "orders", i, v: "patrol" });
    SFX.play("menu");
  });
  /* the orders panel on the map: a click on an order gives it to the boat selected there */
  $("hud").addEventListener("click", ev => {
    const b = ev.target.closest("[data-order], [data-eorder], [data-take]"), S = game.S; if (!b || !S || game.mode !== "play") return;
    if (b.dataset.eorder) { const q = escSel(S); if (q) I.push({ a: "eorders", id: q.id, v: b.dataset.eorder }); return; }
    if (b.dataset.order) I.push({ a: "orders", i: game.selIdx(), v: b.dataset.order });
    else if (game.selIdx() !== S.cmd) I.push({ a: "command", i: game.selIdx() });
  });
  /* the chart: a click on a ship locks it; in Modern, a click on the sea steers for it */
  let panned = false;
  $("screen").addEventListener("click", ev => {
    if (panned) { panned = false; return; }
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet) return;
    const cv = $("screen"), r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    const st = R.stationOf(S, game.ui);
    if (st === "chart") {
      const p = PP.Chart.toSea(S, game.ui, px, py, cv.width, cv.height), z = PP.Chart.view(S, game.ui, cv.width, cv.height).z;
      const hit = S.ships.filter(sh => PP.Detect.known(S, sh) && PP.Ships.alive(sh)).map(sh => ({ sh, d: PP.dist(sh.x, sh.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
      if (hit && hit.d < 10 * z) { I.push({ a: "lock", id: hit.sh.id }); return; }
      /* the escorts' side: an escort selects her, a second click takes command */
      if (S.side === "escorts") {
        const m = PP.Escort.mine(S).map(q => ({ q, d: PP.dist(q.x, q.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
        if (m && m.d < 10 * z) { if (game.ui.sel === m.q.id && m.q.id !== S.flag) I.push({ a: "commandEsc", id: m.q.id }); else { game.ui.sel = m.q.id; SFX.play("menu"); } }
        return;
      }
      /* a boat of the pack: select her, for her orders; a second click on her (or Enter) takes command */
      const mate = S.subs.map((q, i) => ({ q, i, d: PP.dist(q.x, q.y, p.x, p.y) })).filter(m => !m.q.lost).sort((a, b) => a.d - b.d)[0];
      if (mate && mate.d < 10 * z) { if (game.selIdx() === mate.i && mate.i !== S.cmd) I.push({ a: "command", i: mate.i }); else { game.ui.sel = mate.q.id; SFX.play("menu"); } return; }
      if (PP.modern()) I.push({ a: "hdg", v: PP.angTo(S.sub.x, S.sub.y, p.x, p.y) });
    } else if ((st === "scope" || st === "bridge") && R.last && R.last.view) {
      const d = R.last.view.drawn.filter(q => PP.Detect.known(S, PP.Ships.byId(S, q.id))).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (d && Math.abs(d.x - px) < Math.max(12, d.px * 0.6)) I.push({ a: "lock", id: d.id });
    }
  });
  /* Modern: drag through the periscope to train it. Either way, drag the chart to look round it (not the whole sea: it all shows) */
  let drag = null, pan = null;
  $("screen").addEventListener("pointerdown", ev => {
    panned = false;
    if (!game.S || game.mode !== "play" || UI.sheet) return;
    const st = R.stationOf(game.S, game.ui);
    if (PP.modern() && st === "scope") drag = ev.clientX;
    if (st === "chart" && PP.Chart.ZOOMS[game.ui.chartZoom] && ev.button === 0) pan = { x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, moved: false };
  });
  addEventListener("pointerup", () => { drag = null; if (pan && pan.moved) panned = true; pan = null; $("screen").style.cursor = ""; });
  addEventListener("pointermove", ev => {
    if (!pan || !game.S || R.stationOf(game.S, game.ui) !== "chart") { pan = null; return; }
    if (!pan.moved && Math.hypot(ev.clientX - pan.x0, ev.clientY - pan.y0) < 5) return;
    pan.moved = true; $("screen").style.cursor = "grabbing";
    const cv = $("screen"), r = cv.getBoundingClientRect(), k = cv.width / r.width, v = PP.Chart.view(game.S, game.ui, cv.width, cv.height);
    game.ui.chartAt = PP.Chart.panTo(v.cx - (ev.clientX - pan.x) * k * v.z, v.cy - (ev.clientY - pan.y) * k * v.z);
    pan.x = ev.clientX; pan.y = ev.clientY;
  });
  addEventListener("pointermove", ev => { if (drag === null || !game.S) return; const cv = $("screen"), r = cv.getBoundingClientRect(), dx = (ev.clientX - drag) / r.width * cv.width; drag = ev.clientX; I.push({ a: "train", d: -dx / (cv.height * 0.44) * (game.S.sub.scope.hi ? 4 : 16) * PP.DEG }); });

  /* ---- the stage: the whole window, about 360 pixels high, square pixels ---- */
  /* whole numbers, rounded down from 2x up so every station keeps its full 360 rows (a 900-pixel window is 2x, 450 rows, not 3x and 300) */
  const scaleK = () => { const kk = innerHeight / 360; return kk >= 2 ? Math.floor(kk) : kk >= 1.5 ? 2 : Math.max(1, kk); };
  function fit() {
    const k = scaleK();
    K.VW = Math.ceil(innerWidth / k); K.VH = Math.ceil(innerHeight / k);
    const cv = $("screen");
    cv.width = K.VW; cv.height = K.VH;
    const st = $("stage");
    st.style.width = K.VW * k + "px"; st.style.height = K.VH * k + "px";
    if (R.g) R.init(cv);
    PP.Chart.reset();
  }
  addEventListener("resize", () => { fit(); sizeScene(); });

  /* ---- boot ---- */
  function boot() {
    game.applySpeed(); game.applyLook(); game.syncAids(); syncSound();
    injectTitleCSS();     /* the boot's; the title and the sheets are css/pumapack.css */
    fit();
    const q = new URLSearchParams(location.search);
    const run = SMALL.matches || q.has("play") ? { finish: async () => {}, cancel() {} } : runBoot({ lines: [bootReloadLine(), "flooding tubes one through six"] });
    /* the boot is on screen: now the slow part, charting the sea and tracing the first ships */
    setTimeout(() => {
      PP.Sea.build();
      R.init($("screen"));
      HUD.build();
      for (const cls of ["freighter", "destroyer", "liner"]) for (const b of [4, 8, 12]) PP.ShipArt.sprite(cls, b, 46, "dusk");
      if (q.has("play")) {
        /* debug: ?play=<action id>|practice|gun&seed=<n>&side=<pack|escorts>&run=<steps>&station=<view|chart|damage>&hour=<h>&wx=<k>&pause=1 */
        const p = q.get("play"), sd = +(q.get("seed") || 1);
        const S = p === "practice" || p === "gun" ? E.newPractice({ seed: sd, real: PP.prefs.real, kind: p === "gun" ? "gun" : "torpedo" }) : E.newAction(E.ACTIONS.some(a => a.id === p) ? p : "easy", { seed: sd, real: PP.prefs.real, side: q.get("side") || "pack" });
        /* &run=<steps>: the test pilot plays that many steps first, so the picture is mid-battle */
        if (q.has("run")) { const bot = S.side === "escorts" ? PP.Bot.escort() : PP.Bot.make(); for (let i = 0, n = +q.get("run"); i < n && S.phase === "sea"; i++) E.tick(S, bot.cmd(S)); S.tcReq = 0; }
        if (q.has("hour")) S.t = Math.floor(S.t / C.DAY) * C.DAY + (+q.get("hour")) * 3600;
        if (q.has("wx")) E.setWx(S, q.get("wx"));
        /* &near=<yd>: the boat abeam the biggest merchant at that range; &depth=<ft>: at that depth, the periscope up; &aim=1 the scope or glasses on it; &hi=1 high power; &bino=1 the glasses */
        const big = S.ships.filter(sh => sh.role === "merchant").sort((a, b) => C.SHIPS[b.cls].tons - C.SHIPS[a.cls].tons)[0];
        if (q.has("near") && big) { const r = +q.get("near"); Object.assign(S.sub, { x: big.x + Math.cos(big.hdg) * r + PP.hx(big.hdg) * r * 0.6, y: big.y + Math.sin(big.hdg) * r + PP.hy(big.hdg) * r * 0.6 }); }
        if (q.has("depth")) { const d = +q.get("depth"); Object.assign(S.sub, { depth: d, ordDepth: d }); if (d <= C.PD) Object.assign(S.sub.scope, { up: true, h: 1 }); }
        if (q.has("hi")) S.sub.scope.hi = true;
        startPlay(S, true);
        if (q.has("station")) game.ui.station = q.get("station");
        if (q.has("aim") && big) { const b = PP.angTo(S.sub.x, S.sub.y, big.x, big.y); S.sub.scope.brg = PP.angDiff(S.sub.hdg, b); game.ui.look = b; }
        if (q.has("bino")) game.ui.bino = true;
        if (q.has("still")) S.tcReq = 0;
        if (q.has("pause")) game.pause();
      } else {
        openTitle();
        const saved = PP.loadGame();
        run.finish(["the convoy is sighted", saved ? "a game in progress" : "tubes loaded"]).then(() => {
          revealTitle(!q.has("shot"));
          const sheet = q.get("sheet");
          if (sheet && UI[sheet]) UI[sheet]();
        });
      }
      game.last = performance.now();
      requestAnimationFrame(frame);
    }, 60);
  }
  boot();
})();
