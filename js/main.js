/* The Long Convoy -- boot, title, the loop, and everything between.
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

  /* ---- sound on and off (STANDARD.md §8), and the music on its own (§14) ---- */
  const readFlag = (k, d) => { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : v === "1"; } catch (e) { return d; } };
  const writeFlag = (k, on) => { try { globalThis.localStorage.setItem(k, on ? "1" : "0"); } catch (e) { /* no storage */ } };
  SFX.muted = readFlag(PP.KEY_MUTED, false);
  SFX.musicOn = readFlag(PP.KEY_MUSIC, true);
  const titleTune = () => { if (game.mode === "title" && !SMALL.matches) SFX.startTune(); };
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    writeFlag(PP.KEY_MUTED, SFX.muted);
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); titleTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  game.setMusic = on => {
    SFX.unlock();
    SFX.setMusic(on);
    writeFlag(PP.KEY_MUSIC, on);
    syncSound();
    if (on) titleTune();
  };
  /* the station's Sound, and the title's switches */
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } if (game.sw) game.sw.refresh(); }
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");
  game.applySpeed = () => { game.step = 1000 / (PP.SPEEDS[PP.prefs.speed] || PP.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!PP.prefs.scanlines); };
  game.syncAids = () => { for (const [k] of PP.AID_LIST) game.ui.aids[k] = PP.aid(k); };

  /* ---- the title ---- */
  function titleCfg() {
    const saved = PP.loadGame(), f = PP.fame(), fresh = !saved && !Object.keys(f.actions).length;
    return {
      name: "The Long Convoy",
      primary: saved ? "resume" : fresh ? "practice" : "action",
      /* each its words on the telegraph's face (a line apiece) and the fuller ones in its window */
      items: [
        saved && { act: "resume", face: ["Resume"], label: "Resume game", key: "R", meta: saved.S.scnName || "" },
        { act: "action", face: ["Missions"], label: "Missions", key: "C", meta: "" },
        { act: "practice", face: ["Target", "practice"], label: "Target practice", key: "T", meta: fresh ? "Start here" : "" },
        { act: "record", face: ["Service", "record"], label: "Service record", key: "O", meta: "" },
        { act: "settings", face: ["Settings"], label: "Settings", key: "S" },
        { act: "help", face: ["Help"], label: "Help", key: "?" },
        { act: "about", face: ["About"], label: "About", key: "A" },
      ],
    };
  }
  /* the menu is a ship's engine-room telegraph, brass round a face in the red light: the choices where its bells
   * would be, round from lower left to lower right as the dashboard's telegraph has them; its arm swings to the
   * one pointed at or keyed, and the window under the hub says it in full (css .ps-tel) */
  const TEL_ARC = 118;
  const telAngle = (i, n) => n < 2 ? 0 : -TEL_ARC + i * 2 * TEL_ARC / (n - 1);
  function telFace(n) {
    const rad = a => a * Math.PI / 180, P = (a, r) => `${(Math.sin(rad(a)) * r).toFixed(1)} ${(-Math.cos(rad(a)) * r).toFixed(1)}`;
    let lines = "";
    /* the face's divisions, between the choices and at the ends of the arc */
    for (let i = 0; i <= n; i++) { const a = i === 0 ? -TEL_ARC - 18 : i === n ? TEL_ARC + 18 : (telAngle(i - 1, n) + telAngle(i, n)) / 2; lines += `<path d="M${P(a, 74)}L${P(a, 170)}"/>`; }
    let bolts = "";
    for (let i = 0; i < 12; i++) bolts += `<circle cx="${(Math.sin(i * Math.PI / 6) * 191).toFixed(1)}" cy="${(-Math.cos(i * Math.PI / 6) * 191).toFixed(1)}" r="3.2"/>`;
    return `<svg class="tel-face" viewBox="-200 -200 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="telBrass" cx="34%" cy="28%" r="85%"><stop offset="0" stop-color="#f6d48e"/><stop offset=".42" stop-color="#c38c3e"/><stop offset=".8" stop-color="#7a4c1a"/><stop offset="1" stop-color="#4a2c0c"/></radialGradient>
        <radialGradient id="telFace" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#3c130c"/><stop offset=".7" stop-color="#220907"/><stop offset="1" stop-color="#120403"/></radialGradient>
      </defs>
      <circle r="199" fill="url(#telBrass)"/><circle r="185" fill="#2a1306"/><circle r="181" fill="url(#telFace)"/>
      <g class="bolts">${bolts}</g>
      <circle class="ring" r="172"/><circle class="ring" r="72"/>
      <g class="div">${lines}</g>
      <path class="arc" d="M${P(-TEL_ARC - 18, 64)}A64 64 0 1 1 ${P(TEL_ARC + 18, 64)}"/>
    </svg>`;
  }
  /* the arm: a pointer from the hub with a counterweight behind, turned whole about the dial's middle (CSS) */
  const TEL_ARM = `<svg viewBox="-200 -200 400 400" aria-hidden="true">
      <path d="M-9 34 L-6 0 L-5 -88 L0 -104 L5 -88 L6 0 L9 34 Z" fill="url(#telBrass)" stroke="#3a2208" stroke-width="2"/>
      <circle r="25" fill="url(#telBrass)" stroke="#3a2208" stroke-width="2"/><circle r="9" fill="#2a1306"/><path d="M-6 0H6" stroke="#c38c3e" stroke-width="2.5"/>
    </svg>`;
  function titleHTML(cfg) {
    const items = cfg.items.filter(Boolean), n = items.length;
    const btn = (it, i) => {
      const a = telAngle(i, n), r = 0.64, x = 50 + Math.sin(a * Math.PI / 180) * r * 50, y = 50 - Math.cos(a * Math.PI / 180) * r * 50;
      return `<button data-act="${it.act}" data-a="${a.toFixed(1)}" data-label="${esc(it.label)}" data-meta="${esc(it.meta || "")}" aria-label="${esc(it.label)}"` +
        ` class="pr${it.act === cfg.primary ? " dflt" : ""}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><kbd>${esc(it.key)}</kbd>` +
        it.face.map(w => `<span>${esc(w)}</span>`).join("") + "</button>";
    };
    const first = items.find(it => it.act === cfg.primary) || items[0];
    return `<div class="ps-title">
      <canvas class="ps-scene" aria-hidden="true"></canvas><div class="ps-shade" aria-hidden="true"></div>
      <main>
        <h1 class="ps-mark" aria-label="${esc(cfg.name)}"><span class="lead">The Long</span><span class="word">Convoy</span></h1>
        <nav class="ps-menu ps-tel" aria-label="Main menu" style="--a:${telAngle(items.indexOf(first), n)}deg">
          ${telFace(n)}
          ${items.map(btn).join("")}
          <div class="tel-arm">${TEL_ARM}</div>
          <div class="tel-win" aria-hidden="true"><b>${esc(first.label)}</b><span>${esc(first.meta || "")}</span></div>
        </nav>
      </main>
      <footer class="ps-foot"><span class="gk-credit">${UI.CREDIT}</span></footer>
    </div>`;
  }
  /* the integrated title's switches, top right (§14): Sound, the master, as M is, and Music alone. canon
   * gk-intro's gkToggles, adapted: this title is the game's own, so it takes the switches and nothing else of the block */
  const SW_ICON = {
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  };
  const SWITCHES = [
    ["music", "Music", "", () => SFX.musicOn, on => game.setMusic(on)],
    ["sound", "Sound", " (M)", () => !SFX.muted, on => { if (on === SFX.muted) game.toggleMute(); }],
  ];
  function titleSwitches(title) {
    const wrap = document.createElement("div");
    wrap.className = "gki-toggles";
    const made = SWITCHES.map(([k, label, keyHint, get, set]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "gki-tg";
      b.setAttribute("aria-label", label); b.title = label + keyHint;
      b.innerHTML = SW_ICON[k] + '<span class="gki-sw"></span>';
      b.addEventListener("click", ev => { ev.stopPropagation(); set(!get()); refresh(); });
      wrap.appendChild(b);
      return [b, k, get];
    });
    const refresh = () => {
      for (const [b, k, get] of made) {
        b.setAttribute("aria-pressed", String(get()));
        if (k === "music") b.classList.toggle("gki-held", SFX.muted);
      }
    };
    refresh();
    title.appendChild(wrap);
    return { refresh };
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(titleCfg());
    game.sw = titleSwitches(el.querySelector(".ps-title"));
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
  /* the telegraph's arm onto a choice, and its window saying it */
  function telTo(b) {
    const tel = b && b.closest(".ps-tel");
    if (!tel) return;
    tel.style.setProperty("--a", b.dataset.a + "deg");
    const w = tel.querySelector(".tel-win");
    w.querySelector("b").textContent = b.dataset.label; w.querySelector("span").textContent = b.dataset.meta;
  }
  /* on opening, the arm swings up from the far end of the dial onto the choice to make, and the bell rings it */
  function revealTitle(swing = true) {
    const t = document.querySelector("#title .ps-title");
    if (!t) return;
    const tel = t.querySelector(".ps-tel"), b = t.querySelector(".ps-menu .dflt") || t.querySelector(".ps-menu button");
    if (swing && tel && !PP.calm()) {
      const last = [...tel.querySelectorAll("button")].pop();
      tel.classList.add("still"); tel.style.setProperty("--a", (+last.dataset.a + 30) + "deg");
      void tel.offsetWidth;
      tel.classList.remove("still");
      setTimeout(() => SFX.play("bell", 0.7), 420);
    }
    if (b) { b.focus({ preventScroll: true }); telTo(b); }
  }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null;
    SFX.stopLoops();
    I.clear(); HUD.clear(); PP.FX.clear();
    openTitle(); revealTitle();
    titleTune();
  };
  async function titleAct(a) {
    SFX.unlock();
    SFX.play("bell", 0.6);
    if (a === "resume") return resume();
    if (a === "action") return UI.actions();
    /* target practice: straight to sea, three ships crossing ahead */
    if (a === "practice") return (await game.keepSaved()) && game.startPractice();
    if (a === "record") return UI.record();
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .ps-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); hit.focus({ preventScroll: true }); titleAct(hit.dataset.act); return; }
    /* the arrows step round the dial: right or down the way the bells go, left or up back */
    if (menu && (k === "ArrowLeft" || k === "ArrowRight")) {
      const bs = [...menu.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      ev.preventDefault(); bs[(i + (k === "ArrowRight" ? 1 : -1) + bs.length) % bs.length].focus(); return;
    }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a game ---- */
  const seed = () => 1 + Math.floor(Math.random() * 2 ** 30);
  /* a new mission takes the place of the one saved: ask first, by its name (a practice is not worth the question).
   * Asked before the page closes, so Cancel leaves you where you were */
  game.keepSaved = async () => {
    const g = PP.loadGame();
    if (!g || g.S.mode === "practice") return true;
    return UI.ask(`${g.S.scnName || "A mission"} is still being fought. Start a new one and its progress is lost.`, "Give it up", "A mission in progress");
  };
  game.startAction = (id, real, custom, side = "pack") => { PP.clearGame(); game.lastCustom = custom || null; startPlay(E.newAction(id, { seed: seed(), real, custom, side }), true); };
  game.startPractice = () => { PP.clearGame(); startPlay(E.newPractice({ seed: seed(), real: PP.prefs.real }), true); };
  function startPlay(S, fresh) {
    UI.close(true);
    game.S = S; game.mode = "play"; game.warned = {}; game.mine = new Set();
    if (S.mode === "practice" && fresh) game.coach = PP.prefs.learned ? "done" : null;
    SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    I.clear(); HUD.clear(); PP.FX.clear(); PP.Chart.reset(); R.report = null;
    const u = game.ui;
    u.track = []; u.trackT = 0; u.chartAt = null; u.bino = false;
    u.station = "dash";
    u.look = PP.Chart.me(S).hdg; u.chartZoom = 3; u.chartFit = false;
    u.sel = null;
    /* a mission opens on the dashboard of the vessel you are aboard */
    if (fresh) u.station = "dash";
    game.syncAids(); fit();
    R.init($("screen"));
    game.acc = 0;
    if (fresh) {
      if (S.mode !== "action") HUD.toast(S.scnName, "", 3200);
    } else HUD.toast("Back on station", "", 2000);
    hints();
    /* a mission (not the practice) opens on its briefing, the clock still until it is begun */
    if (fresh && S.mode === "action") UI.briefing(S, () => game.unpause());
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
  /* reports that come in a burst (eight sets of screws as a convoy comes into hearing, three ships at once over the
   * horizon) go out as one line: gathered for a moment, then one bearing as before, or the arc they lie across */
  const bursts = {};
  const burst = (kind, brg, flag, one, many) => {
    const b = bursts[kind] || (bursts[kind] = { brgs: [], flag: false, first: null });
    if (!b.brgs.length) setTimeout(() => {
      const L = b.brgs.slice(), f = b.flag, first = b.first; b.brgs = []; b.flag = false; b.first = null;
      if (L.length === 1) { first(); return; }
      /* the arc they lie across: from the end of the widest gap round to its start */
      const d = L.map(x => ((x / PP.DEG) % 360 + 360) % 360).sort((a, c) => a - c);
      let gi = d.length - 1, gap = d[0] + 360 - d[d.length - 1];
      for (let i = 0; i < d.length - 1; i++) if (d[i + 1] - d[i] > gap) { gap = d[i + 1] - d[i]; gi = i; }
      many(L.length, PP.deg3(d[(gi + 1) % d.length] * PP.DEG), PP.deg3(d[gi] * PP.DEG), f);
    }, 250);
    if (!b.first) b.first = one;
    b.brgs.push(brg); b.flag = b.flag || !!flag;
  };
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
        case "auto": toast(e.on ? `${e.name} on AUTO, following orders. J, or the helm, gives you control` : `${e.name}: USER CONTROL`, "", 2400); break;
        case "eorders": toast(`${e.name}: ${(C.ESC_ORDERS.find(o => o[0] === e.v) || C.ESC_ORDERS[0])[1].toLowerCase()}${f && e.id === f.id ? ", when you leave her" : ""}`, "", 2000); break;
        case "dcSet": break;
        case "ping": toast(e.on ? "Sonar pinging: it finds them ahead, and they hear it" : "Sonar off: listening", "", 2000); break;
        case "patternAway": SFX.play("splashes", 0.8); toast("Pattern away!", "amber", 1600); break;
        case "patSel": { const P = C.ESC_PATTERNS[e.v]; SFX.play("menu"); toast(P ? `${P.name} pattern: ${C.patCount(P)} charges` : "Hedgehog: Lay charges fires it", "", 1400); break; }
        case "noCharges": toast("No depth charges left", "red", 2000); break;
        case "hedgehogAway": SFX.play("splashes", 0.5); toast("Hedgehog away", "amber", 1600); break;
        case "noHedgehog": toast(e.empty ? "The hedgehog is empty" : "No hedgehog fitted yet", "amber", 1800); break;
        case "noGunTarget": toast("No boat in sight on the surface", "amber", 1600); break;
        case "gunHold": toast({ loading: "The guns are loading", training: "The guns are training round onto the target", range: "Out of range of the guns that bear: turn to bring the main guns on the target", arc: "None of the guns bear on the target: turn toward it" }[e.why], e.why === "loading" ? "" : "amber", e.why === "loading" ? 900 : 1800); break;
        case "eTarget": SFX.play("menu"); if (e.id !== null) toast(`Target: ${e.name}, ${PP.num(Math.round(e.d / 50) * 50)} yards${e.d >= C.ESC.gunRange ? ", out of the guns' range" : ""}`, "", 1600); break;
        /* her own gun loud; the others' by how far off they are */
        case "escortGun": {
          const q = S.ships.find(o => o.id === e.id);
          SFX.play("gun", f && e.id === f.id ? 1 : q && f ? PP.clamp(0.45 - PP.dist(q.x, q.y, f.x, f.y) / 12000, 0.06, 0.4) : 0.3);
          break;
        }
        /* her shell's fall, heard when it lands */
        case "eGunHit": setTimeout(() => { SFX.play("shellHit", 0.7); toast("A hit!", "green", 1400); }, e.d / C.SHELL_YPS * 1000); break;
        case "eGunMiss": setTimeout(() => SFX.play("splash", 0.4), e.d / C.SHELL_YPS * 1000); break;
        case "dcBoom": { PP.Sonar.boom(S, e.x, e.y); const d = f ? PP.dist(e.x, e.y, f.x, f.y) : 9999; SFX.play(e.hh ? "dcNear" : "dc", PP.clamp(1.2 - d / 3000, 0.15, 1)); if (e.hh) toast("A hedgehog has hit something!", "green", 2400); break; }
        case "escortContact": if (S.t - (game.warned.contact || -1e9) > 30) { game.warned.contact = S.t; const q = S.ships.find(o => o.id === e.id); if (e.how !== "sonar") SFX.play("sighted"); toast(`${q ? q.name : "An escort"}: ${e.how === "sonar" ? "sonar contact" : e.how === "eye" ? "a boat sighted" : e.how === "radar" ? "radar contact" : "contact"}`, "amber", 2400); } break;
        case "subLost": SFX.play("sunk"); toast(`A boat is sunk${e.why === "crushed" ? ": crushed" : ": she flooded"}`, "green", 3600); break;
        case "rammed": if (e.ours) { SFX.play("bigHit"); toast("Rammed the boat!", "green", 2400); } break;
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
        case "auto": toast(e.on ? `${e.name} on AUTO, following orders. J, or the helm, gives you control` : `${e.name}: USER CONTROL`, "", 2400); break;
        case "snorkel": toast(e.forced ? "Snorkel down: too deep for it" : e.on ? "Snorkel up: diesels running, charging" : "Snorkel down", e.forced ? "amber" : "", 2000); break;
        case "snorkelNo": toast({ none: "No snorkel fitted until Year IV", surfaced: "On the surface the diesels run anyway", deep: `Up to periscope depth first: ${C.PD} feet` }[e.why], "amber", 2200); break;
        case "metox": SFX.play("warn"); toast(`Metox! Radar on us, bearing ${PP.deg3(e.brg)}`, "red", 3000); slow(); break;
        case "decoyAway": SFX.play("launch", 0.4); toast(`Noisemaker away: ${e.left} left`, "", 1800); break;
        case "decoyNo": toast(e.why === "surfaced" ? "Dive first: a noisemaker works under the water" : "No noisemakers left", "amber", 1800); break;
        case "noRadio": toast(`${e.name}'s radio is out: she cannot take a new order`, "amber", 2600); break;
        case "ordered": if (e.what === "bell") SFX.play("bell"); break;
        case "diveAlarm": SFX.play(e.crash ? "crash" : "klaxon"); toast(e.crash ? "Crash dive! All ahead full" : "Dive, dive", e.crash ? "amber" : "", 1800); break;
        case "surfaced": SFX.play("blow"); toast("Surfaced", "", 1400); break;
        case "eblow": SFX.play("blow"); SFX.play("klaxon", 0.6); toast(`Emergency blow! Going up, and no diving for ${Math.round(e.lock / 60)} minutes`, "red", 3200); break;
        case "cantDive": toast(`The tanks are blown: no diving for ${Math.floor(e.left / 60)}:${String(Math.floor(e.left % 60)).padStart(2, "0")}`, "amber", 1800); break;
        case "submerged": break;
        case "atDepth": toast(e.d === C.PD ? "At periscope depth" : `Level at ${e.d} feet`, "", 1600); break;
        case "scopeUp": SFX.play("menu"); break;
        case "scopeDown": if (e.forced) toast("Periscope down: too deep for it", "", 1600); break;
        case "scopeBroken": toast("The periscope is out of action", "red"); break;
        case "tooDeep": toast(`Too deep for the periscope: ${C.PD} feet. ${kc("P", "pad:R-click")} periscope depth`, "amber"); break;
        case "aground": toast("Aground!", "red", 2000); SFX.play("shellHit"); break;
        case "bottomHit": toast("The boat hit the bottom", "amber"); break;
        case "batLow": toast("Battery low", "amber", 3000); break;
        case "batFlat": toast("The battery is flat: surface to charge", "red", 3600); break;
        case "fuelLow": toast("Fuel low: time to head for a base", "amber", 3600); break;
        case "fuelOut": toast("Out of fuel", "red", 3600); break;
        case "flooding": SFX.play("warn"); toast("Flooding!", "red", 3000); break;
        case "creak": SFX.play("creak", 0.6 + Math.min(0.4, (s.depth - Sub.testDepth(s)) / 200)); if (!game.warned.deep) { game.warned.deep = true; toast("Below test depth: the hull is groaning", "red", 3000); } break;
        case "sighted": SFX.play("sighted"); report(e, S); slow();
          burst("sighted", e.brg, e.role === "escort", () => toast(`${e.role === "escort" ? "Escort" : "Ship"} sighted, bearing ${brgW(e.brg)}: a ${C.SHIPS[e.cls].name.toLowerCase()}`, e.role === "escort" ? "amber" : "", 3000),
            (n, a, b, esc1) => toast(`${n} ships sighted, bearing ${a} to ${b}${esc1 ? ", an escort among them" : ""}`, esc1 ? "amber" : "", 3400)); break;
        case "radarContact": SFX.play("sighted"); report(e, S); toast(`Radar contact, bearing ${brgW(e.brg)}, ${PP.num(Math.round(e.rng / 100) * 100)} yards`, "", 3000); slow(); break;
        case "smoke": report(e, S); toast(`Smoke on the horizon, bearing ${brgW(e.brg)}`, "", 3200); slow(); break;
        case "screws": report(e, S); slow();
          burst("screws", e.brg, e.fast, () => toast(`Screws on the hydrophones, bearing ${brgW(e.brg)}${e.fast ? ": fast, an escort" : ""}`, e.fast ? "amber" : "", 3000),
            (n, a, b, fast) => toast(`Screws on the hydrophones: ${n}, bearing ${a} to ${b}${fast ? ", an escort among them" : ""}`, fast ? "amber" : "", 3400)); break;
        case "locked": SFX.play("menu"); toast(`Selected: the ${cls(e.id)} ${e.name}`, "", 1800); break;
        case "lostLock": toast("Lost the target", "amber"); break;
        case "noRange": toast("Nothing in sight to range on", "amber", 1600); break;
        case "ranged": toast(`Range ${PP.num(Math.round(e.rng / 50) * 50)} yards`, "", 1400); break;
        case "fired": SFX.play("launch"); (game.mine = game.mine || new Set()).add(e.id); if (e.solved && S.tdc.tgt !== null) follow(S.tdc.tgt); toast(`Tube ${e.tube.slice(1)} ${e.tube[0] === "F" ? "forward" : "aft"}: fired${e.n > 1 ? `, ${e.k + 1} of ${e.n}` : ""}${e.solved ? `, ${Math.round(e.run)} yards` : ", no solution"}`, "", 1800); break;
        case "salvoOn": toast("The spread is still going out", "", 1200); break;
        case "cantFire": toast({ damaged: "Those tubes are damaged", deep: "Too deep to fire", none: "No tubes there", empty: (e.bank === "F" ? "Forward" : "After") + ` tubes empty: ${kc("F", "pad:dL")} switches`,
          angle: `Wrong angle: fire the ${e.bank === "F" ? "after" : "forward"} tubes (${kc("F", "pad:dL")}), or turn toward the target`, range: "Out of range: let the target close" }[e.why] || "Can't fire", "amber"); break;
        case "noTarget": toast("No vessel in range", "amber", 1600); break;
        case "noSolution": break;
        case "reloaded": SFX.play("reloaded"); break;
        case "torpHit": SFX.play("hit"); toast(`Hit! The ${cls(e.ship)}`, "green", 2400); if (game.mine && game.mine.has(e.id)) { const q = PP.Ships.byId(S, e.ship); HUD.stamp("Hit", q ? `The ${cls(e.ship)} ${q.name}` : ""); } slow(); if (S.mode === "practice" && game.coach !== "done") { game.coach = "done"; PP.prefs.learned = true; PP.savePrefs(); toast("That's the attack. Next, a mission with escorts: they hunt back", "green", 4200); } break;
        case "torpDud": SFX.play("dud"); toast(e.why === "unarmed" ? "It hit before it armed" : "A dud: it hit, and did nothing", "amber", 2600); break;
        case "torpPremature": SFX.play("hit", 0.6); toast("A torpedo went off early", "amber", 2400); break;
        case "torpUnder": toast("It ran under the target: too deep", "amber", 2400); break;
        case "torpMiss": toast("A miss: the torpedo ran out", "", 1600); break;
        case "torpHitUs": SFX.play("bigHit"); toast("Our own torpedo came round and hit us!", "red", 3600); break;
        case "wakeSeen": toast("They've seen a torpedo's wake", "amber", 2000); break;
        case "shipExplodes": SFX.play("bigHit"); toast("The target blew up!", "green", 2600); break;
        case "shipSinking": SFX.play("breakup", 0.7); break;
        case "shipSunk": SFX.play("sunk"); toast(e.role === "escort" ? `${C.SHIPS[e.cls].name} ${e.name} sunk` : `${C.SHIPS[e.cls].name} ${e.name} sunk: ${PP.num(e.tons)} tons`, "green", 3200);
          HUD.stamp("Sunk", e.role === "escort" ? `${C.SHIPS[e.cls].name} ${e.name}` : `${e.name} · ${PP.num(e.tons)} tons`); break;
        case "convoyTurns": toast("The convoy is turning away", "", 2200); break;
        case "scatter": toast("The convoy is scattering!", "amber", 2400); break;
        case "spotted": if (S.t - (game.warned.spot || -1e9) > 120) { game.warned.spot = S.t; toast(e.how === "eye" ? "They've seen us" : e.how === "radar" ? "Their radar has us" : "They've heard us", "red", 2600); } break;
        case "escortContact": if (e.how !== "sonar") SFX.play("warn"); if (S.t - (game.warned.contact || -1e9) > 60) { game.warned.contact = S.t; toast(e.how === "sonar" ? "Pinging: an escort has us on sonar. Deep, slow and quiet" : "An escort has us. Deep, slow and quiet", "red", 3000); } slow(); break;
        case "escortRun": toast("Escort turning toward, at speed!", "red", 2400); break;
        case "chargesAway": SFX.play("splashes", 0.7); toast("Depth charges!", "red", 2000); break;
        case "dcBoom": { PP.Sonar.boom(S, e.x, e.y); const d = Math.hypot((e.x - s.x) * 3, (e.y - s.y) * 3, e.z - s.depth); SFX.play(d < 160 ? "dcNear" : "dc", PP.clamp(1.4 - d / 900, 0.15, 1)); break; }
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
        case "gunFire": SFX.play("gun"); R.shake = Math.max(R.shake, 3); break;
        case "rateStop": SFX.play("creak", 0.6); toast(`Levelling at ${e.d} feet: crush depth. Order a dive again to go deeper`, "red", 3000); break;
        case "gunStowing": SFX.play("klaxon", 0.5); toast(`Securing the gun: the dive waits until it is fore and aft${e.secs > 1 ? `, ${e.secs} seconds` : ""}`, "amber", 2200); break;
        case "gunHit": SFX.play("shellHit", 0.7); toast("A hit", "green", 1000); break;
        case "gunSplash": SFX.play("splash", 0.5); break;
        case "gunNo": toast({ submerged: "Surface to man the gun", damaged: "The gun is damaged", manning: "The gun is not manned yet", shells: "No shells left", loading: "The gun is loading", target: "No ship in the gun's reach", arc: "The target is behind the gun's arc: the tower is in the way. Turn the boat", training: "The gun is training round onto the target" }[e.why], e.why === "loading" ? "" : "amber", e.why === "loading" ? 900 : 1800); break;
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
        case "subLost": SFX.play("over"); HUD.end(e.why === "crushed" ? "The hull gave way" : "The boat is flooding", S.subs.length > 1 ? "The last of the pack, lost" : "Lost with all hands", "danger"); break;
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
  /* ---- the sonar, heard. An escort's active sonar pings every few seconds. Aboard her, you hear each ping go
   * out and, off every boat (and noisemaker) in its beam, the echo come back: later and fainter the farther it
   * is, as sound crosses the water. Aboard a boat, you hear each ping of an escort hunting you strike the hull,
   * loud in her beam, faint outside it. On the page's side only, on the game's clock, so a pause holds it and
   * the engine (and a replay) never knows; quiet past 4x ---- */
  const SONAR_EVERY = 4, SOUND_YPS = 1600, sonar = { S: null, next: {}, due: [] };
  function sonarSounds(S) {
    if (sonar.S !== S) { sonar.S = S; sonar.next = {}; sonar.due = []; }
    if (SFX.muted || !SFX.ctx || S.phase !== "sea" || E.tcNow(S) > 4) { sonar.due.length = 0; return; }
    const Det = PP.Detect, mine = S.side === "escorts" ? PP.Escort.flag(S) : S.sub;
    if (!mine) return;
    for (const sh of S.ships) {
      if (sh.role !== "escort" || !PP.Ships.alive(sh) || !Det.pinging(sh)) { delete sonar.next[sh.id]; continue; }
      /* each escort on her own beat, staggered so a group does not ping as one */
      if (sonar.next[sh.id] === undefined) sonar.next[sh.id] = S.t + ((sh.id * 7) % 10) / 10 * SONAR_EVERY;
      if (S.t < sonar.next[sh.id]) continue;
      sonar.next[sh.id] = S.t + SONAR_EVERY;
      if (S.side === "escorts") {
        if (sh !== mine) continue;
        SFX.play("sonarOut", 0.8);
        const back = (x, y, k) => { const r = Det.inBeam(S, sh, x, y); if (r) sonar.due.push({ at: S.t + 2 * r.d / SOUND_YPS, name: "echo", vol: k * (0.35 + 0.65 * (1 - r.d / r.Rs)), brg: PP.angTo(sh.x, sh.y, x, y) }); };
        for (const s of S.subs) if (!s.lost && !s.sinking) back(s.x, s.y, 1);
        for (const q of S.decoys || []) if (S.t - q.t0 < C.DECOY.life) back(q.x, q.y, 0.6);
      } else {
        const r = Det.inBeam(S, sh, mine.x, mine.y), d = PP.dist(sh.x, sh.y, mine.x, mine.y), Rs = Det.sonarReach(S, sh);
        const brg = PP.angTo(mine.x, mine.y, sh.x, sh.y);
        if (r) sonar.due.push({ at: S.t + d / SOUND_YPS, name: "pingNear", vol: 0.4 + 0.6 * (1 - d / Rs), brg });
        else if (d < Rs * 1.3) sonar.due.push({ at: S.t + d / SOUND_YPS, name: "ping", vol: 0.5 * (1 - d / (Rs * 1.3)), brg });
      }
    }
    /* each, as it arrives, struck on the waterfall too (js/art/sonar.js) */
    sonar.due = sonar.due.filter(e => { if (S.t < e.at) return true; SFX.play(e.name, e.vol); PP.Sonar.mark(e.brg, 0.6 + e.vol * 0.8); return false; });
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
    onHer: KY(["H"], ["pad:Back+R-click"], "swing to the target"),
    ahead: KY(["B"], ["pad:Back+RT"], "bow, stern"),
    next: KY(["T"], ["pad:X"], "next ship"),
    fire: KY(["Space"], ["pad:A"], "fire"),
    look: KY(["left", "right"], ["pad:R-stick"], "look"),
    glasses: KY(["up", "down"], ["pad:Y"], "glasses"),
    gun: KY(["G"], ["pad:dR"], "man the gun"),
    gunFire: KY(["G"], ["pad:dR"], "fire the gun"),
    time: KY(["+", "−"], ["pad:LT", "pad:RT"], "time"),
    zoom: KY(["Z"], ["pad:Y"], "zoom"),
    silent: KY(["X"], ["pad:Back+B"], "silent running"),
    slower: KY(["S"], ["pad:L-stick"], "slower", "flick down: slower"),
    turn: KY(["A", "D"], ["pad:L-stick"], "turn across his line"),
    chart: KY(["2"], ["pad:Back"], "the map"),
    scope: KY(["1"], ["pad:LB", "pad:RB"], "the dashboard", "to the dashboard"),
    click: KY([], null, "click a boat to select it"),
    order: KY(["O"], ["pad:Back+X"], "her next order"),
    waypoint: KY([], null, "right-click: her waypoint"),
    command: KY(["Enter"], ["pad:Back+dD"], "take command"),
    nextBoat: KY(["N"], ["pad:Back+dU"], "next boat"),
    pan: KY([], null, "drag to look round"),
    keys: KY(["?"], ["pad:Back+Start"], "all keys"),
  };
  const onPad = () => I.device === "pad";
  /* one key and its words; [name, words] gives other words */
  const chip = (n, w) => { const it = KEY[n], ks = onPad() ? it.p : it.k; return ks ? (ks.map(I.cap).join("") + " " + (w || (onPad() ? it.pw : it.w))).trim() : ""; };
  function coach(S) {
    if (S.mode !== "practice" || S.scn !== "torpedo" || game.coach === "done") return null;
    /* on the dashboard the lesson is the view's: its periscope, or the bridge on the surface */
    const s = S.sub, st0 = R.stationOf(S, game.ui), st = st0 === "dash" ? R.innerOf(S) : st0;
    if (S.stats.hits) { game.coach = "done"; return null; }
    if (S.stats.fired && S.torps.length) return st0 === "dash" ? `Watch it run${SEP}${chip("chart")}` : `Watch it run: ${chip("chart")}${SEP}${chip("scope")}`;
    if (S.stats.fired) return `A miss. Shoot from ahead of the target, 1,000 to 2,000 yards off its track, near 90° on the bow${SEP}${chip("lock")}${SEP}${chip("fire")}`;
    if (st !== "scope" && st !== "bridge") return `The attack is made at the periscope: ${chip("scope", " ")}`;
    if (st === "scope" && s.depth > C.PD + 4) return chip("pd");
    if (st === "scope" && !s.scope.up) return chip("raise");
    if (S.tdc.tgt === null) {
      const L = R.last, seen = L && L.view && L.view.drawn.some(d => PP.Detect.known(S, PP.Ships.byId(S, d.id)) && d.haze < 0.9);
      if (seen) return s.scope.hi ? `${chip("lock", "selects the ship nearest the crosshair")}${SEP}${chip("power", "back to low power")}` : `${chip("power", "high power, for a closer look")}${SEP}${chip("lock", "selects the ship nearest the crosshair")}`;
      const near = S.ships.filter(q => PP.Detect.known(S, q) && PP.Ships.alive(q)).sort((a, b) => PP.dist(s.x, s.y, a.x, a.y) - PP.dist(s.x, s.y, b.x, b.y))[0];
      return near ? `${chip("onHer")}, or ${chip(st === "scope" ? "train" : "look", st === "scope" ? "train the periscope onto it" : "look round to it")}: the nearest ship bears ${PP.deg3(PP.angTo(s.x, s.y, near.x, near.y))}, the hollow mark on the ring` : "Watch for the targets";
    }
    const e = W.est(S), sol = e && W.solve(S, e, s.bank), eye = S.real.aob ? `${SEP}set the target's angle and speed: <kbd>[</kbd><kbd>]</kbd> <kbd>,</kbd><kbd>.</kbd>` : "";
    if (sol && sol.ok) return `On target: ${chip("fire", "fires")}${e.rng > 3000 ? `${SEP}closer is surer: under 3,000 yards` : ""}${eye}`;
    if (sol && sol.why === "gyro") return `Wrong angle: ${chip("helm", "turn the boat toward the target")}, or the other tubes${eye}`;
    if (sol && sol.why === "range") return `Out of range: let the target close${SEP}${chip("helm", "steer for its track")}${eye}`;
    return `When the lamp says On target, ${chip("fire", "fires")}${eye}`;
  }
  function escStrip(S) {
    const st = R.stationOf(S, game.ui), m = PP.Escort.mine(S), fresh = m.some(q => q.ai.contact && S.t - q.ai.contact < 60);
    const C2 = (k, w) => k.map(I.cap).join("") + " " + w;
    if (fresh) return ["danger", "Contact", [C2(["W", "S"], "speed"), C2(["A", "D"], "helm"), C2(["Q", "E"], "charges' depth"), C2(["Space"], "pattern"), C2(["F"], "hedgehog")]];
    if (st === "sonar") return ["", "", [C2(["W", "S"], "speed"), C2(["A", "D"], "helm"), C2(["X"], "active or passive")]];
    return ["", "", st === "chart" ? [C2(["Z"], "zoom"), C2(["W", "S"], "speed"), C2(["A", "D"], "helm"), C2(["X"], "sonar"), C2(["O"], "orders")] : [C2(["left", "right"], "look"), C2(["up", "down"], "glasses"), C2(["T"], "target"), C2(["G"], "guns"), C2(["Space"], "pattern"), C2(["X"], "sonar")]];
  }
  function strip(S) {
    const s = S.sub, st = R.stationOf(S, game.ui), surf = Sub.surfaced(s), locked = S.tdc.tgt !== null;
    /* the map, with a pack to command: how to select a boat, and once one is selected (not the one aboard), her orders */
    const pack = S.subs.filter(q => !q.lost).length > 1, other = pack && game.selIdx() !== S.cmd;
    if (surf && S.planes.some(p => p.seen)) return ["danger", "Aircraft", ["crash"]];
    if (S.charges.length || S.ships.some(q => q.role === "escort" && !q.sinking && q.ai.contact && S.t - q.ai.contact < 60)) return ["danger", "Hunted", surf ? ["crash", "tele", "helm"] : ["deeper", "silent", "slower", "turn"]];
    const by = {
      scope: s.depth > C.PD + 4 ? ["pd", "depth", "tele", "helm"] : !s.scope.up ? ["raise", "depth", "tele", "helm"] : locked ? ["train", "power", "fire", "next", "helm"] : ["train", "onHer", "power", "lock", "helm"],
      bridge: s.gun.on ? ["look", "glasses", "lock", "gunFire", "fire"] : locked ? ["look", "glasses", "fire", "gun", "crash"] : ["look", "onHer", "glasses", "lock", "gun"],
      panel: surf ? ["tele", "helm", ["pd", "dive to periscope depth"], "crash", "time"] : ["tele", "helm", "depth", "pd", "surface"],
      chart: other ? ["order", "waypoint", "command", "nextBoat", "zoom"] : pack ? ["click", "nextBoat", "zoom", "tele", "helm"] : ["zoom", "tele", "helm", "time", "click", "pan"],
      damage: surf ? ["tele", "helm", "time", "pd"] : ["tele", "helm", "depth", "silent"],
      sonar: surf ? ["tele", "helm", "time"] : ["tele", "helm", "depth", "silent"],
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
    if (st === "bridge" || st === "scope" || st === "view") st = "dash";
    if (st === "dash" && game.ui.station !== "dash") game.ui.look = PP.Chart.me(S).hdg;
    if (st !== game.ui.station) game.ui.chartAt = null;
    /* the first look at the map in a mission: as close as shows the whole of your side and what you know of theirs */
    if (st === "chart" && !game.ui.chartFit) { game.ui.chartFit = true; game.ui.chartZoom = fitZoom(S); }
    game.ui.station = st; SFX.play("menu"); hints();
  };
  /* the closest of the map's scales (none closer than 25 yards a pixel, none wider than 1,100) at which every vessel
   * of your side, and every ship known within 30,000 yards, lies on the map round the one you are aboard */
  function fitZoom(S) {
    const me = PP.Chart.me(S), cv = $("screen"), hw = cv.width / 2 - 36, hh = cv.height * 0.36, pts = [];
    if (S.side === "escorts") for (const q of PP.Escort.mine(S)) pts.push(q);
    else for (const q of S.subs) if (!q.lost) pts.push(q);
    for (const q of S.ships) if (PP.Ships.alive(q) && (S.side === "escorts" || PP.Detect.known(S, q)) && PP.dist(me.x, me.y, q.x, q.y) < 30000) pts.push(q);
    const Z = PP.Chart.ZOOMS;
    for (let i = 1; i <= 5; i++) if (pts.every(q => Math.abs(q.x - me.x) <= hw * Z[i] && Math.abs(q.y - me.y) <= hh * Z[i])) return i;
    return 5;
  }
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
      const now = st === "scope" ? s.scope.brg : PP.angDiff(s.hdg, u.look), rel = Math.abs(now) < 5 * PP.DEG ? Math.PI : 0;
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

  /* after a spread with a solution, the view stays on her while it runs and twenty seconds after, to see it strike;
   * training it yourself, or another swing, lets go */
  function follow(id) {
    let last = game.S.t;
    I.swing(S => {
      if (S.torps.some(t => t.by === S.sub.id)) last = S.t;
      const q = PP.Ships.byId(S, id);
      return q && S.t - last < 20 ? PP.angTo(S.sub.x, S.sub.y, q.x, q.y) : null;
    }, true);
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
      sonarSounds(S);
      PP.Sonar.tick(S);
    }
    R.draw(S, game.ui, now, dt / 1000);
    HUD.draw(S, game.ui);
    if (game.mode === "play" && (now - (game.hintAt || 0)) > 500) { game.hintAt = now; hints(); }
  }
  function titleFrame(dt, now) {
    const cv = document.querySelector("#title .ps-scene");
    if (!cv || UI.sheet && UI.sheet.el.classList.contains("full")) return;
    /* behind the menu, the painting (js/art/intro.js) */
    PP.Intro.draw(cv, now);
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
  /* a vessel's next order (back: the one before), for O and a click on her order in the map's list: Patrol is passed
   * over while she has no waypoints, as she would only hold */
  const nextOrder = (S, q, back) => {
    const L = (S.side === "escorts" ? C.ESC_ORDERS : PP.Orders.LIST).map(o => o[0]).filter(k => k !== "patrol" || (q.wps || []).length);
    const cur = S.side === "escorts" ? q.ord || "screen" : q.orders || "attack", j = L.indexOf(cur);
    return L[((j < 0 ? 0 : j) + (back ? L.length - 1 : 1)) % L.length];
  };
  function escAct(a, ev) {
    const S = game.S, u = game.ui, st = R.stationOf(S, u), shift = ev && ev.shiftKey, f = PP.Escort.flag(S);
    if (!f) return;
    const onMap = st === "chart";
    switch (a) {
      case "tU": I.push({ a: "bell", d: 1 }); break;
      case "tD": I.push({ a: "bell", d: -1 }); break;
      /* the helm: held, the rudder over (PP.Input.cmd); nothing to do on the key's press itself */
      case "hL": case "hR": case "aL": case "aR": break;
      case "aU": case "aD": if (onMap) I.push({ a: "bell", d: a === "aU" ? 1 : -1 }); else u.bino = a === "aU"; break;
      case "shallower": I.push({ a: "dcSet", d: shift ? -100 : -25 }); break;
      case "deeper": I.push({ a: "dcSet", d: shift ? 100 : 25 }); break;
      case "fire": I.push({ a: "pattern" }); break;
      case "bank": I.push({ a: "hedgehog" }); break;
      /* V: the next weapon for Lay charges (the patterns, then the hedgehog once fitted); Shift+V the one before */
      case "spread": {
        const n = C.ESC_PATTERNS.length + (C.monthOf(S.t) >= C.ESC_SIDE.hedgehogFrom ? 1 : 0);
        I.push({ a: "patSel", v: ((f.patK || 0) + (shift ? n - 1 : 1)) % n });
        break;
      }
      case "gun": I.push({ a: "egun" }); break;
      /* T: the next boat up in sight for her target, Shift+T the one before (nearest first) */
      case "lock": {
        const L = PP.Escort.sighted(S, f), t = PP.Escort.target(S, f);
        if (!L.length) { toast("No boat in sight on the surface", "amber", 1600); break; }
        const i = t ? L.findIndex(o => o.b.id === t.b.id) : -1;
        I.push({ a: "eTarget", id: L[(i + (shift ? L.length - 1 : 1) + L.length) % L.length].b.id });
        break;
      }
      case "silent": I.push({ a: "ping" }); break;
      case "zoom": if (onMap) { u.chartZoom = (u.chartZoom + (shift ? PP.Chart.ZOOMS.length - 1 : 1)) % PP.Chart.ZOOMS.length; u.chartAt = null; SFX.play("menu"); } else u.bino = !u.bino; break;
      case "tcU": I.push({ a: "tc", d: 1 }); break;
      case "tcD": I.push({ a: "tc", d: -1 }); break;
      case "tc1": I.push({ a: "tc", v: 0 }); break;
      case "st1": game.setStation("dash"); break;
      case "st2": game.setStation("chart"); break;
      /* (an escort has no damage screen: 4 is a U-boat's) */
      case "auto": I.push({ a: "auto" }); break;
      case "miniIn": case "miniOut": u.mini = u.mini || { chartZoom: 3 }; u.mini.chartZoom = PP.clamp(u.mini.chartZoom + (a === "miniOut" ? 1 : -1), 0, PP.Chart.ZOOMS.length - 1); break;
      case "st6": game.setStation("log"); break;
      case "st7": game.setStation("sonar"); break;
      case "stNext": case "stPrev": { const L = ["dash", "chart", "sonar"], i = L.indexOf(st); game.setStation(L[(i + (a === "stPrev" || shift ? L.length - 1 : 1)) % L.length]); break; }
      case "boatNext": { const m = PP.Escort.mine(S), i = m.indexOf(f); if (m.length > 1) I.push({ a: "commandEsc", id: m[(i + (shift ? m.length - 1 : 1)) % m.length].id }); else toast("No other escort afloat", "amber", 1600); break; }
      case "orders": { const q = escSel(S); I.push({ a: "eorders", id: q.id, v: nextOrder(S, q, shift) }); break; }
      case "takeCmd": { const q = escSel(S); if (onMap && q !== f) I.push({ a: "commandEsc", id: q.id }); break; }
      case "pause": game.pause(); break;
      case "aids": PP.flipAids(); game.syncAids(); hints(); break;
      case "help": UI.help(UI.helpTab("Escort"), () => game.unpause()); break;
      /* the dashboard's telegraph and pattern picker: a position, a pattern, by its number */
      default: {
        const m = /^(bell|pat)(\d)$/.exec(a), dz = /^depth:(\d+)$/.exec(a), rm = /^rim:(tel|hdg):(\d+)$/.exec(a);
        if (m) I.push(m[1] === "bell" ? { a: "setBell", v: +m[2] } : { a: "patSel", v: +m[2] });
        else if (dz) I.push({ a: "dcSet", v: +dz[1] });
        else if (rm && rm[1] === "hdg") I.push({ a: "hdg", v: +rm[2] * PP.DEG });
        else if (rm && rimSweep(+rm[2]) !== null) I.push({ a: "setBell", v: Math.round(rimSweep(+rm[2]) * (C.ESC_BELLS.length - 1)) });
      }
    }
  }
  function act(a, ev) {
    if (game.S && game.S.side === "escorts") return escAct(a, ev);
    const S = game.S, s = S.sub, u = game.ui, st0 = R.stationOf(S, u), st = st0 === "dash" ? R.innerOf(S) : st0, shift = ev && ev.shiftKey;
    const helmSt = st === "chart" || st === "damage";
    switch (a) {
      case "tU": I.push({ a: "bell", d: 1 }); break;
      case "tD": I.push({ a: "bell", d: -1 }); break;
      /* the helm: held, the rudder over (PP.Input.cmd); nothing to do on the key's press itself */
      case "hL": case "hR": break;
      case "aL": case "aR": break;
      case "aU": case "aD":
        if (helmSt) I.push({ a: "bell", d: a === "aU" ? 1 : -1 });
        else if (st === "scope") I.push({ a: "scope", v: a === "aU" });
        else if (st === "bridge") u.bino = a === "aU";
        break;
      case "shallower": I.push({ a: "depth", d: -1 }); break;
      case "deeper": I.push({ a: "depth", d: 1 }); break;
      case "surface": I.push({ a: "surface" }); break;
      case "pd": I.push({ a: "pd" }); break;
      case "crash": I.push({ a: "crash" }); break;
      case "eblow": I.push({ a: "eblow" }); break;
      /* the dashboard's Blow and Crash: the first click arms the button, a second while it asks orders it */
      case "eblow?": case "crash?": {
        const k = a.slice(0, -1), now = performance.now();
        if (u.arm && u.arm.k === k && now - u.arm.t < PP.Dash.ARM_MS) { u.arm = null; act(k, ev); }
        else { u.arm = { k, t: now }; SFX.play("menu"); toast(k === "crash" ? "Crash dive? Click Crash again" : "Emergency blow? Click Blow again", "amber", PP.Dash.ARM_MS); }
        break;
      }
      case "zoom": if (st === "chart") { u.chartZoom = (u.chartZoom + (shift ? PP.Chart.ZOOMS.length - 1 : 1)) % PP.Chart.ZOOMS.length; u.chartAt = null; SFX.play("menu"); } else if (st === "bridge") u.bino = !u.bino; else I.push({ a: "zoom" }); break;
      case "lock": lockNearest(); break;
      case "onHer": case "ahead": swing(a); break;
      case "aobL": case "aobR": I.push({ a: "dial", what: "aob", d: (a === "aobR" ? 1 : -1) * (shift ? 1 : 5) * PP.DEG }); break;
      case "spdD": case "spdU": I.push({ a: "dial", what: "spd", d: (a === "spdU" ? 1 : -1) * (shift ? 0.5 : 1) }); break;
      case "fire": I.push({ a: "fire" }); break;
      case "bank": I.push({ a: "bank" }); break;
      case "spread": I.push({ a: "spread" }); break;
      /* G: man the gun, then fire it (it lays itself on the target); Shift+G secures it */
      case "gun": if (st !== "bridge" && st !== "dash" && Sub.surfaced(s)) game.setStation("dash"); I.push({ a: s.gun.on && !shift ? "gunFire" : "gun" }); break;
      case "silent": I.push({ a: "silent" }); break;
      case "radar": I.push({ a: "radar" }); break;
      case "decoy": I.push({ a: "decoy" }); break;
      case "tcU": I.push({ a: "tc", d: 1 }); break;
      case "tcD": I.push({ a: "tc", d: -1 }); break;
      case "tc1": I.push({ a: "tc", v: 0 }); break;
      case "st1": game.setStation("dash"); break;
      case "st2": game.setStation("chart"); break;
      case "st3": game.setStation("damage"); break;
      case "auto": I.push({ a: "auto" }); break;
      case "snorkel": I.push({ a: "snorkel" }); break;
      case "bankF": case "bankA": I.push({ a: "bank", v: a === "bankF" ? "F" : "A" }); break;
      case "miniIn": case "miniOut": u.mini = u.mini || { chartZoom: 3 }; u.mini.chartZoom = PP.clamp(u.mini.chartZoom + (a === "miniOut" ? 1 : -1), 0, PP.Chart.ZOOMS.length - 1); break;
      case "st6": game.setStation("log"); break;
      case "st7": game.setStation("sonar"); break;
      case "stNext": case "stPrev": { const L = HUD.STATIONS.map(q => q[0]), i = L.indexOf(st === "bridge" || st === "scope" ? "view" : st); game.setStation(L[(i + (a === "stPrev" || shift ? L.length - 1 : 1)) % L.length]); break; }
      case "pause": game.pause(); break;
      case "aids": PP.flipAids(); game.syncAids(); HUD.toast(PP.prefs.aids === "field" ? `Field aids, and the key hints. ${kc("L", "pad:Back+RB")} for Classic` : `Classic: no aids, no key hints. ${kc("L", "pad:Back+RB")} for Field`, "", 2600); hints(); break;
      case "scope": I.push({ a: "scope" }); break;
      case "level": I.push({ a: Sub.surfaced(s) || s.depth > C.PD + 6 ? "pd" : "surface" }); break;
      case "help": UI.help(UI.helpTab("Gamepad"), () => game.unpause()); break;
      /* the pack: the next boat afloat (Shift, the one before) */
      case "boatNext": {
        const n = S.subs.length, d = shift ? n - 1 : 1;
        for (let k = 1, i = (S.cmd + d) % n; k < n; k++, i = (i + d) % n) if (!S.subs[i].lost) { I.push({ a: "command", i }); break; }
        if (E.afloat(S).length < 2) toast(S.subs.length > 1 ? "No other boat afloat" : "A boat alone: no pack to command", "amber", 1800);
        break;
      }
      /* the map's orders: O the next order for the boat selected there (Shift, the one before); Enter takes command of her */
      case "orders": {
        const i = game.selIdx();
        I.push({ a: "orders", i, v: nextOrder(S, S.subs[i], shift) });
        break;
      }
      case "takeCmd": if (st === "chart" && game.selIdx() !== S.cmd) I.push({ a: "command", i: game.selIdx() }); break;
      /* the dashboard: a telegraph's word, a spread, and a dial set from its rim (rim:<dial>:<degrees from the top>) */
      default: {
        const m = /^(bell|spr)(\d)$/.exec(a), rm = /^rim:(tel|hdg|dep):(\d+)$/.exec(a), rt = /^rate:(\d+)$/.exec(a);
        if (m) I.push(m[1] === "bell" ? { a: "setBell", v: +m[2] } : { a: "spread", v: +m[2] });
        /* the dive bubble's tube, 0 (all the way up) to 100 (all the way down): a rate, or about the middle, hold her depth */
        else if (rt) {
          const f = (+rt[1] - 50) / 50;
          if (Math.abs(f) < 0.08) { if (!Sub.surfaced(s)) I.push({ a: "setDepth", v: Math.round(s.depth / 5) * 5 }); }
          else I.push({ a: "rate", v: f < 0 ? f * C.DIVE.blow : f * C.DIVE.crash });
        }
        else if (rm) {
          const deg = +rm[2], v = rimSweep(deg);
          if (rm[1] === "hdg") I.push({ a: "hdg", v: deg * PP.DEG });
          else if (v !== null && rm[1] === "tel") I.push({ a: "setBell", v: Math.round(v * (C.BELLS.length - 1)) });
          else if (v !== null) {
            const top = PP.Dash.depthTop(s), d = v * top;
            if (Math.abs(d - C.PD) <= PP.Dash.PD_SNAP * top) I.push({ a: "pd" });
            else if (d < 0.025 * top) I.push({ a: "surface" });
            else I.push({ a: "setDepth", v: Math.round(d / 25) * 25 });
          }
        }
      }
    }
  }
  /* where a click on a dial's rim falls on its sweep (-135 to +135 degrees, 0 to 1); in the gap at its foot, nowhere */
  function rimSweep(deg) { const a = deg > 180 ? deg - 360 : deg; return Math.abs(a) > 150 ? null : PP.clamp((a + 135) / 270, 0, 1); }
  /* a pad's button means what the moment needs: Y ties up at a base, the d-pad lays the gun when it is manned */
  function padAct(a) {
    const S = game.S, st = R.stationOf(S, game.ui);
    if (a === "scope" && st !== "scope") return;
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
    if (game.omenu && ev.key === "Escape") { ev.preventDefault(); closeOrderMenu(); return; }
    if (game.omenu) { omenuKey(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    let a = I.actionFor(ev.code);
    if (!a && (ev.key === "+" || ev.key === "=")) a = "tcU";
    if (!a && ev.key === "?") { UI.help(UI.helpTab(game.S && game.S.side === "escorts" ? "Escort" : "Keys"), () => game.unpause()); return; }
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
  /* (?awake=1, for pictures taken headless: the page never has the focus, and play goes on regardless) */
  addEventListener("blur", () => { I.clear(); if (game.mode === "play" && !game.awake) game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play" && !game.awake) game.pause(); } });
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
  /* whatever has the focus on the dial (pointed at, keyed or arrowed to), the arm goes to; a detent's click when
   * it moves by the keys */
  let telPtr = 0;
  $("title").addEventListener("pointerover", () => { telPtr = performance.now(); });
  $("title").addEventListener("focusin", ev => {
    const b = ev.target.closest && ev.target.closest(".ps-tel button");
    if (!b) return;
    telTo(b);
    if (performance.now() - telPtr > 120) SFX.play("menu", 0.35);
  });
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
  /* the mouse over the map: one of ours under it (her name tag, or her mark), for the card at the lower left */
  $("screen").addEventListener("pointermove", ev => {
    const S = game.S; HUD.hoverMap = null;
    if (!S || game.mode !== "play" || R.stationOf(S, game.ui) !== "chart") return;
    const cv = $("screen"), r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    const side = S.side === "escorts" ? "escorts" : "pack";
    const tag = PP.Chart.hits.find(h => h.side === side && px >= h.x && px < h.x + h.w && py >= h.y && py < h.y + h.h);
    if (tag) { HUD.hoverMap = tag.id; return; }
    const p = PP.Chart.toSea(S, game.ui, px, py, cv.width, cv.height), z = PP.Chart.view(S, game.ui, cv.width, cv.height).z;
    const mine = side === "escorts" ? PP.Escort.mine(S) : S.subs.filter(q => !q.lost);
    const near = mine.map(q => ({ q, d: PP.dist(q.x, q.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 10 * z) HUD.hoverMap = near.q.id;
  });
  $("screen").addEventListener("pointerleave", () => { HUD.hoverMap = null; });
  /* the map's list: a click on a vessel's order, or on her row */
  $("hud").addEventListener("click", ev => {
    const b = ev.target.closest("[data-cycle], [data-pick]"), S = game.S; if (!b || !S || game.mode !== "play") return;
    /* an order in the map's list: that vessel selected, and given her next order (Shift, the one before) */
    if (b.dataset.cycle) {
      const id = +b.dataset.cycle, back = ev.shiftKey;
      game.ui.sel = id; SFX.play("menu");
      if (S.side === "escorts") { const q = PP.Escort.mine(S).find(o => o.id === id); if (q) I.push({ a: "eorders", id, v: nextOrder(S, q, back) }); }
      else { const i = S.subs.findIndex(o => o.id === id); if (i >= 0) I.push({ a: "orders", i, v: nextOrder(S, S.subs[i], back) }); }
      return;
    }
    /* a name in the boat's panel: the same as her name on the map */
    if (b.dataset.pick) { mapPick(S, { kind: "name", side: S.side === "escorts" ? "escorts" : "pack", id: +b.dataset.pick }, 0, 0); return; }
  });
  /* the chart: a click on a ship locks it; in Modern, a click on the sea steers for it */
  let panned = false;
  /* a vessel picked on the map by her name tag: the first click selects her, the second takes command; her order
   * tag opens her orders menu where the mouse is */
  function mapPick(S, tag, cx, cy) {
    if (tag.side === "escorts") {
      const q = PP.Escort.mine(S).find(o => o.id === tag.id); if (!q) return;
      if (tag.kind === "order") { game.ui.sel = q.id; orderMenu(S, q, cx, cy); return; }
      if (game.ui.sel === q.id && q.id !== S.flag) I.push({ a: "commandEsc", id: q.id }); else { game.ui.sel = q.id; SFX.play("menu"); }
      return;
    }
    const i = S.subs.findIndex(o => o.id === tag.id); if (i < 0 || S.subs[i].lost) return;
    if (tag.kind === "order") { game.ui.sel = tag.id; orderMenu(S, S.subs[i], cx, cy); return; }
    if (game.selIdx() === i && i !== S.cmd) I.push({ a: "command", i }); else { game.ui.sel = tag.id; SFX.play("menu"); }
  }
  /* the orders menu: a small panel at the mouse, her orders and taking command of her */
  function orderMenu(S, q, cx, cy) {
    closeOrderMenu();
    const esc = S.side === "escorts", list = esc ? C.ESC_ORDERS.map(([k, n, note]) => [k, n, note]) : PP.Orders.LIST.map(([k, n, note]) => [k, n, note]);
    const cur = esc ? q.ord || "screen" : q.orders || "attack", aboard = esc ? q.id === S.flag : q === S.sub;
    const m = document.createElement("div");
    m.className = "hp omenu"; m.setAttribute("role", "menu");
    /* each order with its number (its key while the menu is open); what it does is written at the foot for the one
     * pointed at or focused, not in a tip that would lie over the orders under it */
    const noteOf = k => (list.find(o => o[0] === k) || [])[2] || "";
    m.innerHTML = `<div class="ht-name">${PP.esc(q.name)}</div>${aboard ? `<p class="om-note">Her order once you leave</p>` : ""}` + list.map(([k, n, note], j) => `<button role="menuitemradio" aria-checked="${k === cur}" aria-description="${PP.esc(note)}" data-ord="${k}" data-n="${j + 1}"${k === cur ? ' class="on"' : ""}>${I.cap(String(j + 1))}<span>${PP.esc(n)}</span></button>`).join("")
      + (aboard ? "" : `<button class="take" data-take="1">${I.cap("Enter")}<span>Take command</span></button>`)
      + `<p class="om-desc" aria-hidden="true">${PP.esc(noteOf(cur))}</p>`;
    const desc = m.querySelector(".om-desc"), say = b => { if (b) desc.textContent = b.dataset.ord ? noteOf(b.dataset.ord) : b.dataset.take ? "Go aboard her: she becomes the boat you sail" : ""; };
    m.addEventListener("pointerover", ev => say(ev.target.closest("button")));
    m.addEventListener("focusin", ev => say(ev.target.closest("button")));
    $("hud").appendChild(m);
    const hb = $("hud").getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.round(PP.clamp(cx - hb.left + 6, 4, hb.width - mw - 4)) + "px"; m.style.top = Math.round(PP.clamp(cy - hb.top + 6, 4, hb.height - mh - 4)) + "px";
    m.addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const S2 = game.S; if (!S2) return closeOrderMenu();
      if (b.dataset.ord) { if (esc) I.push({ a: "eorders", id: q.id, v: b.dataset.ord }); else I.push({ a: "orders", i: S2.subs.indexOf(q), v: b.dataset.ord }); }
      if (b.dataset.take) { if (esc) I.push({ a: "commandEsc", id: q.id }); else I.push({ a: "command", i: S2.subs.indexOf(q) }); }
      SFX.play("menu"); closeOrderMenu();
    });
    m.querySelector("button.on, button").focus({ preventScroll: true });
    game.omenu = m;
  }
  function closeOrderMenu() { if (game.omenu) { game.omenu.remove(); game.omenu = null; } }
  /* the keys while the orders menu is open are its own: an order's number picks it, the arrows move, Enter or Space
   * chooses the one focused (Enter is not "take command" here, nor 1-4 the stations) */
  function omenuKey(ev) {
    const bs = [...game.omenu.querySelectorAll("button")], i = bs.indexOf(document.activeElement), n = /^(?:Digit|Numpad)([1-9])$/.exec(ev.code);
    const pick = n && game.omenu.querySelector(`button[data-n="${n[1]}"]`);
    if (pick) { ev.preventDefault(); pick.click(); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); bs[(i + (ev.key === "ArrowDown" ? 1 : bs.length - 1) + bs.length) % bs.length].focus(); return; }
    if (ev.key === "Enter" || ev.key === " " || ev.key === "Tab") return;
    ev.preventDefault();
  }
  addEventListener("pointerdown", ev => { if (game.omenu && !game.omenu.contains(ev.target)) closeOrderMenu(); }, true);
  /* the wheel zooms the map about the point under the mouse; on the dashboard, the small map when it is over it */
  let wheelAcc = 0;
  $("screen").addEventListener("wheel", ev => {
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet) return;
    const cv = $("screen"), r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    const st = R.stationOf(S, game.ui), u = game.ui, Z = PP.Chart.ZOOMS;
    let onMini = false;
    if (st === "dash" && R.dash && R.dash.L) { const m = R.dash.L.map; onMini = px >= m.x && px < m.x + m.w && py >= m.y && py < m.y + m.h; if (!onMini) return; }
    else if (st !== "chart") return;
    ev.preventDefault();
    wheelAcc += ev.deltaMode === 1 ? ev.deltaY * 40 : ev.deltaY;
    if (Math.abs(wheelAcc) < 60) return;
    const d = wheelAcc > 0 ? 1 : -1; wheelAcc = 0;
    if (onMini) { u.mini = u.mini || { chartZoom: 3 }; u.mini.chartZoom = PP.clamp(u.mini.chartZoom + d, 0, Z.length - 2); return; }
    const nz = PP.clamp(u.chartZoom + d, 0, Z.length - 1);
    if (nz === u.chartZoom) return;
    const p = PP.Chart.toSea(S, u, px, py, cv.width, cv.height);
    u.chartZoom = nz;
    if (!Z[nz]) { u.chartAt = null; return; }
    const v = PP.Chart.view(S, u, cv.width, cv.height);
    u.chartAt = PP.Chart.panTo(p.x - (px - cv.width / 2) * Z[nz], p.y - (py - v.my) * Z[nz]);
  }, { passive: false });
  /* the dashboard's buttons, by name (hud.js), as their keys */
  game.dashAct = a => { if (game.mode === "play" && !UI.sheet) act(a, null); };
  $("screen").addEventListener("click", ev => {
    if (panned) { panned = false; return; }
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet) return;
    const cv = $("screen"), r = cv.getBoundingClientRect();
    let px = (ev.clientX - r.left) / r.width * cv.width, py = (ev.clientY - r.top) / r.height * cv.height;
    let st = R.stationOf(S, game.ui), cui = game.ui, cw = cv.width, chh = cv.height;
    /* on the dashboard, a click in the view's window is the view's, in the small map's the map's */
    if (st === "dash" && R.dash && R.dash.L) {
      const L = R.dash.L, inR = q => px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + q.h;
      if (inR(L.view)) { px -= L.view.x; py -= L.view.y; st = R.innerOf(S); }
      else if (inR(L.map)) { px -= L.map.x; py -= L.map.y; st = "chart"; cui = { chartZoom: (game.ui.mini || { chartZoom: 3 }).chartZoom, chartAt: null, mini: true }; cw = L.map.w; chh = L.map.h; }
      else return;
    }
    if (st === "chart") {
      /* a name tag first: the name is the vessel, the order her orders menu */
      const tag = PP.Chart.hits.find(h => px >= h.x && px < h.x + h.w && py >= h.y && py < h.y + h.h);
      if (tag) { mapPick(S, tag, ev.clientX, ev.clientY); return; }
      const was = R.safe; if (cui !== game.ui) R.safe = { t: 4, b: 4, tr: 0, br: chh };
      const p = PP.Chart.toSea(S, cui, px, py, cw, chh), z = PP.Chart.view(S, cui, cw, chh).z;
      R.safe = was;
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
    } else if (st === "ebridge" && R.last && R.last.view && R.last.view.boats) {
      /* a boat up in sight, clicked in the view: her target */
      const d = R.last.view.boats.filter(q => PP.Escort.flag(S) && PP.Escort.sighted(S, PP.Escort.flag(S)).some(o => o.b.id === q.id)).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (d && Math.abs(d.x - px) < Math.max(14, d.px * 0.6) && py > d.top - 24 && py < d.wl + 18) I.push({ a: "eTarget", id: d.id });
    } else if ((st === "scope" || st === "bridge" || st === "ebridge") && R.last && R.last.view && S.side !== "escorts") {
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
    injectTitleCSS();     /* the boot's; the title and the sheets are css/thelongconvoy.css */
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
        /* debug: ?play=<action id>|practice&seed=<n>&side=<pack|escorts>&run=<steps>&station=<chart|sonar|damage>&hour=<h>&wx=<k>&pause=1&awake=1 */
        game.awake = q.has("awake");
        const p = q.get("play"), sd = +(q.get("seed") || 1);
        const S = p === "practice" ? E.newPractice({ seed: sd, real: PP.prefs.real }) : E.newAction(E.ACTIONS.some(a => a.id === p) ? p : "easy", { seed: sd, real: PP.prefs.real, side: q.get("side") || "pack" });
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
