/* The Long Convoy -- the screens with words on them, boards in the boat's red
 * light (css/thelongconvoy.css): the missions and a custom one, target practice,
 * the service record, the pause, the debrief, the captain's log, and
 * Settings, Help and About from the title. */
"use strict";
(() => {
  const esc = PP.esc, C = PP.C, E = PP.Engine, Sea = PP.Sea, num = PP.num;
  const UI = PP.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  /* the red-pencil tick beside the chosen line of a signal (the title, the pause) */
  UI.TICK = '<svg class="tick" viewBox="0 0 24 20" width="22" height="18" aria-hidden="true"><path d="M2.4 10.8 C4.6 12.2 6.6 14.4 8.4 17.4 C11.6 10.6 16.2 5.6 22.2 1.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';
  const ICON_X ='<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';

  /* ---- the sheet: a panel of its own over whatever was showing; popup, a window to one side ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "ps-sheet " + (popup ? "ps-pop" : "full") + (wide ? " wide" : "") + (tabs ? " tabbed" : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    const draw = () => {
      el.innerHTML = '<div class="' + (popup ? "ps-win paper" : "sh-box paper") + '"><header class="sh-head">' + (back ? '<button data-back title="Back (Esc)">' + ICON_BACK + "Back</button>" : "") + "<h2>" + esc(title) + "</h2>" +
        (closable && !back && !popup ? '<button data-x title="Close (Esc)">' + ICON_X + "Close</button>" : "") + "</header>" +
        (tabs ? '<div class="sh-tabs" role="tablist" aria-label="' + esc(title) + '">' + tabs.map(([t], i) => '<button role="tab" id="tab-' + i + '" data-tab="' + i + '" aria-selected="' + (i === tab) + '" aria-controls="tabpanel" tabindex="' + (i === tab ? 0 : -1) + '">' + esc(t) + "</button>").join("") + "</div>" : "") +
        '<div class="sh-body"' + (tabs ? ' id="tabpanel" role="tabpanel" aria-labelledby="tab-' + tab + '" tabindex="0"' : "") + '><div class="sh-in">' + PP.Input.caps(tabs ? tabs[tab][1] : html()) + "</div></div></div>";
    };
    draw();
    const api = { refresh: () => { const b = el.querySelector(".sh-body"), y = b.scrollTop, f = document.activeElement && document.activeElement.dataset; draw(); el.querySelector(".sh-body").scrollTop = y; if (f) for (const k of ["set", "act", "d", "start"]) if (f[k]) { const n = el.querySelector(`[data-${k}="${f[k]}"]`); if (n) n.focus({ preventScroll: true }); } }, close: () => UI.close(), el };
    const setTab = i => { tab = (i + tabs.length) % tabs.length; draw(); el.querySelector('[data-tab="' + tab + '"]').focus(); };
    el.addEventListener("click", ev => {
      if (popup && ev.target === el && closable) return UI.close();
      const b = ev.target.closest("button"); if (!b) return;
      PP.SFX.play("menu");
      if (b.hasAttribute("data-x")) return UI.close();
      if (b.hasAttribute("data-back")) return goBack();
      if (b.dataset.tab !== undefined) return setTab(+b.dataset.tab);
      if (onClick) onClick(b, api, ev);
    });
    el.addEventListener("toggle", ev => { if (ev.target.classList && ev.target.classList.contains("aid-list")) { if (ev.target.classList.contains("real")) UI.realOpen = ev.target.open; else UI.aidOpen = ev.target.open; } }, true);
    function goBack() { UI.close(true); back(); }
    document.body.appendChild(el);
    UI.sheet = { el, onClose, onKey, closable, back: back ? goBack : null, tabs: tabs ? setTab : null, tabAt: () => tab };
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = true; }
    (el.querySelector("[autofocus]") || el.querySelector(".sh-body .primary") || el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector(".sh-body button") || el.querySelector("button")).focus({ preventScroll: true });
    return api;
  };
  UI.close = quiet => {
    if (!UI.sheet) return;
    const s = UI.sheet; UI.sheet = null;
    s.el.remove();
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = false; }
    if (s.onClose && !quiet) s.onClose();
    if (!quiet && PP.game.mode === "title") PP.game.refreshTitle();
  };
  /* the arrows walk the buttons by where they sit on the screen */
  UI.walk = (root, key) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key], a = document.activeElement;
    if (!d || !a || !root.contains(a)) return false;
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, o = box(a);
    let best = null, bestS = Infinity;
    for (const n of root.querySelectorAll("button:not(:disabled), summary, input")) {
      if (n === a || n.offsetParent === null || n.getAttribute("role") === "tab" || n.closest(".sh-head")) continue;
      const b = box(n), dx = b.x - o.x, dy = b.y - o.y, along = dx * d[0] + dy * d[1];
      if (along <= (d[0] ? o.r.width : o.r.height) / 4) continue;
      const s = along + Math.abs(d[0] ? dy : dx) * 3;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest" });
    return true;
  };
  UI.key = ev => {
    const s = UI.sheet;
    if (s.onKey && s.onKey(ev)) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (s.back) s.back(); else if (s.closable) UI.close(); return; }
    if (s.tabs && document.activeElement && document.activeElement.getAttribute("role") === "tab" && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) { ev.preventDefault(); s.tabs(s.tabAt() + (ev.key === "ArrowRight" ? 1 : -1)); return; }
    const inInput = ev.target.closest && ev.target.closest("input");
    if (ev.key.startsWith("Arrow") && !(inInput && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) && UI.walk(s.el, ev.key)) { ev.preventDefault(); return; }
    if (ev.key === "Tab") {
      const f = [...s.el.querySelectorAll('button:not(:disabled), input, summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement), d = ev.shiftKey ? -1 : 1;
      f[i < 0 ? 0 : (i + d + f.length) % f.length].focus();
    }
  };
  /* a question before something that cannot be undone: Cancel has the focus */
  UI.ask = (question, yes, title = yes + "?") => new Promise(resolve => {
    const back = document.activeElement, el = document.createElement("div");
    el.className = "ps-ask";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="ps-win paper"><header class="sh-head"><h2>' + esc(title) + '</h2></header><div class="sh-body"><p>' + esc(question) +
      '</p><div class="row end"><button data-no class="primary">Cancel</button><button data-yes class="danger">' + esc(yes) + "</button></div></div></div>";
    const done = v => { document.removeEventListener("keydown", onKey, true); el.remove(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); resolve(v); };
    const onKey = ev => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
      if (ev.key === "Tab" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const bs = [...el.querySelectorAll("button")], i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey || ev.key === "ArrowLeft" ? -1 : 1) + bs.length) % bs.length].focus(); }
      ev.stopPropagation();
    };
    el.addEventListener("click", ev => { if (ev.target === el) return done(false); const b = ev.target.closest("button"); if (b) done(b.hasAttribute("data-yes")); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(el);
    el.querySelector("[data-no]").focus();
  });

  const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
  const toggle = (act, on, n) => `<button data-set="${act}" role="switch" aria-checked="${on}" aria-label="${esc(n)}" class="pill switch${on ? " on" : ""}">${on ? "On" : "Off"}</button>`;
  const line = (n, note, ctl) => `<tr><td><b>${esc(n)}</b><br><span class="note">${note}</span></td><td class="act">${ctl}</td></tr>`;
  /* the reality switches, as a table, for a new game or the defaults */
  const realTable = (real, pre = "real") => `<table class="aids">${C.REAL.map(([k, n, note, v]) => line(n, `${esc(note)} <span class="num">+${v}%</span>`, toggle(pre + ":" + k, !!real[k], n))).join("")}</table>
    <p class="note">Reality <b class="num">${C.realPct(real)}%</b>: tonnage sunk counts for this much toward rank and the record.</p>`;
  const realOnly = real => C.REAL.filter(([k]) => real[k]).map(([, n]) => n.toLowerCase()).join(", ") || "none";
  /* the reality as one line, the switches behind it */
  const realLine = (real, pre) => `<details class="aid-list real"${UI.realOpen ? " open" : ""}><summary>Reality <b class="num">${C.realPct(real)}%</b>: ${esc(realOnly(real))}. Change</summary>${realTable(real, pre)}</details>`;

  /* ---- the convoy actions, in the order of the war ---- */
  const escorts = A => { const n = A.conv.esc ? A.conv.esc.length : A.conv.escorts; return n ? `${n} escort${n > 1 ? "s" : ""}` : "unescorted"; };
  /* a mission's best on the side shown, as its card's last word */
  const bestOf = (f, A, side) => { const r = f.actions[PP.recKey(A, side)]; return !r ? "" : side === "escorts" ? ` · best ${r.score}%` : ` · best ${num(r.tons)} t`; };
  UI.actions = () => {
    const real = Object.assign({}, PP.prefs.real), f = PP.fame();
    /* the side you play: the pack, or the escorts (the 1990 game let you play either) */
    let side = PP.prefs.side === "escorts" ? "escorts" : "pack";
    const list = () => E.ACTIONS.filter(A => (A.sides || ["pack"]).includes(side));
    UI.open("Missions", { wide: true, back: () => PP.game.toTitle(),
      html: () => `<div class="row">${pill(side === "pack", "The Wolfpack", "side:pack")}${pill(side === "escorts", "The PDF", "side:escorts")}</div>
        <p class="lede">${side === "pack" ? "The Wolf Empire's wolfpack against Pumacity's shipping: one engagement, one night or day of the war." : "The Pumacity Defense Fleet, escorting the city's shipping against the wolfpack: you are aboard one escort, the others keep their stations under your orders."}</p>
        <div class="diffs acts">${list().map((A, i) => `<button data-a="${A.id}"><b><kbd>${i + 1}</kbd>${esc(side === "escorts" ? A.escName || A.name : A.name)}</b><span>${esc(side === "escorts" ? A.escNote || A.note : A.note)}</span><span class="meta">${esc(C.dateStr(C.monthStart(A.mi) + ((A.day || 10) - 1) * C.DAY))} · ${A.boats.length} boat${A.boats.length > 1 ? "s" : ""} · ${A.conv.n ? A.conv.n + " ships" : "no merchants"} · ${escorts(A)}${bestOf(f, A, side)}</span></button>`).join("")}
          ${side === "pack" ? `<button data-a="custom"><b><kbd>9</kbd>Custom mission</b><span>The year, the pack, the convoy, the time and the weather of your choosing.</span></button>` : ""}</div>
        ${realLine(real, "real")}`,
      onKey: ev => { const n = +ev.key, L = list(); if (n >= 1 && n <= L.length) { ev.preventDefault(); go(L[n - 1].id); return true; } if (ev.key === "9" && side === "pack") { ev.preventDefault(); go("custom"); return true; } return false; },
      onClick: (b, api) => {
        if (b.dataset.a) return go(b.dataset.a);
        const v = b.dataset.set; if (v && v.startsWith("real:")) { const k = v.slice(5); real[k] = !real[k]; PP.prefs.real = Object.assign({}, real); PP.savePrefs(); api.refresh(); }
        if (v && v.startsWith("side:")) { side = v.slice(5); PP.prefs.side = side; PP.savePrefs(); api.refresh(); }
      },
    });
    async function go(id) { if (id === "custom") { UI.close(true); UI.custom(real); return; } if (!await PP.game.keepSaved()) return; UI.close(true); PP.game.startAction(id, real, null, side); }
  };
  UI.custom = real => {
    const last = PP.store.get(PP.KEY_LAST, null) || {};
    const c = Object.assign({ mi: 14, cls: "cougar", pack: "2", size: "medium", escorts: "light", time: "night", wx: "clear" }, last);
    const opts = (k, list) => `<div class="row">${list.map(([v, n]) => pill(String(c[k]) === String(v), n, "c:" + k + ":" + v)).join("")}</div>`;
    UI.open("Custom mission", { wide: true, back: () => UI.actions(),
      html: () => `<h3>When</h3>${opts("mi", PP.Engine.CUSTOM.when)}
        <h3>Boat</h3>${opts("cls", PP.C.SUB_ORDER.filter(k => C.SUBS[k].from <= c.mi).map(k => [k, C.SUBS[k].name]))}
        <h3>The pack</h3>${opts("pack", E.CUSTOM.pack)}
        <h3>Convoy</h3>${opts("size", E.CUSTOM.size)}
        <h3>Escorts</h3>${opts("escorts", E.CUSTOM.escorts)}
        <h3>Time</h3>${opts("time", E.CUSTOM.time)}
        <h3>Weather</h3>${opts("wx", E.CUSTOM.wx)}
        <div class="row end"><button data-act="go" class="primary">Into action</button></div>`,
      onClick: async (b, api) => {
        const v = b.dataset.set;
        if (v) { const [, k, x] = v.split(":"); c[k] = k === "mi" ? +x : x; if (C.SUBS[c.cls].from > c.mi) c.cls = "caracal"; api.refresh(); }
        if (b.dataset.act === "go") { if (!await PP.game.keepSaved()) return; PP.store.set(PP.KEY_LAST, c); UI.close(true); PP.game.startAction("custom", real, c); }
      },
    });
  };
  /* ---- target practice ---- */

  /* ---- the service record ---- */
  UI.record = after => {
    const f = PP.fame();
    /* each side's missions, its best result in each; one not yet fought says so, and an empty record says where to start */
    const side = (sd, head, sub) => {
      const L = E.ACTIONS.filter(A => (A.sides || ["pack"]).includes(sd));
      return `<h3>${head}</h3><p class="note">${sub}</p><table class="scores">${L.map(A => { const r = f.actions[PP.recKey(A, sd)];
        return `<tr><td>${esc(sd === "escorts" ? A.escName || A.name : A.name)}</td><td class="num">${r ? (sd === "escorts" ? `${r.score}%` : num(r.tons) + " t") : '<span class="note">not yet fought</span>'}</td><td>${r ? (sd === "escorts" ? "" : r.score !== undefined ? `${r.score}% · ` : "") + esc(r.rating) + ` · reality ${r.pct}%` : ""}</td></tr>`; }).join("")}</table>`;
    };
    const none = !Object.keys(f.actions).length;
    UI.open("Service record", { wide: true, onClose: after,
      html: () => `${none ? `<p class="lesson">Your best result in each mission is kept here, in this browser. Nothing yet: fight one from <b>Missions</b> (<kbd>C</kbd> on the title).</p>` : ""}
        ${side("pack", "The Wolfpack", "The most tonnage sunk")}${side("escorts", "The PDF", "The best score: the convoy's tonnage saved, and the boats sunk")}`,
    });
  };

  /* ---- the briefing: a mission's orders on the paper before the clock starts. What the card said, who is on
   * your side and which of them you are aboard, what counts, and the first moves. Begin (Space, or Esc) starts it;
   * the clock is still while any sheet is up ---- */
  UI.briefing = (S, done) => {
    const esc_ = S.side === "escorts", f = esc_ ? PP.Escort.flag(S) : S.sub, mine = esc_ ? PP.Escort.mine(S) : S.subs;
    const d = C.date(S.t), when = `${C.dateStr(S.t)}, ${String(d.h).padStart(2, "0")}${String(d.min).padStart(2, "0")}${S.wx ? ", " + C.WX[S.wx.k].name.toLowerCase() : ""}`;
    const merch = S.ships.filter(q => q.role === "merchant").length, escs = S.ships.filter(q => q.role === "escort").length;
    const side = esc_ ? `${mine.length} escort${mine.length > 1 ? "s" : ""} of the PDF${merch ? `, round ${merch} ships` : ""}, against ${S.subs.length} boat${S.subs.length > 1 ? "s" : ""}. You are aboard <b>${esc(f.name)}</b>${mine.length > 1 ? "; the others keep station under the orders you give them" : ""}.`
      : `${mine.length} boat${mine.length > 1 ? "s" : ""} of the pack, against ${merch ? `${merch} ships` : "no merchants"} and ${escs} escort${escs === 1 ? "" : "s"}. You are aboard <b>${esc(f.name)}</b>${mine.length > 1 ? "; the others hunt under their own captains, on the orders you give them" : ""}.`;
    const goal = esc_ ? (merch ? "Bring the convoy through: the score is the tonnage saved, and the boats sunk." : "Find the boats and sink them.")
      : S.goal === "escort" ? "Sink the escort, or slip away from her: deep, slow and quiet." : "Sink what you can of the convoy, and bring the pack home: the score counts both.";
    /* with others of your side to command, the second move is how: select one on the map, give her an order */
    const orders = mine.length < 2 ? [] : esc_ ? ["Click an escort on the map, then <kbd>O</kbd> for her orders; <kbd>Enter</kbd> goes aboard her."]
      : ["Click a boat on the map, then <kbd>O</kbd> for her orders; <kbd>Enter</kbd> takes command of her. Bring them in from two sides."];
    const first = esc_ ? ["<kbd>2</kbd> the map: your escorts, the convoy, every contact.", ...orders, "Under 15 knots to hear them; <kbd>X</kbd> pings, and they hear that too.", "Run in over a contact and lay the pattern: <kbd>Space</kbd>."]
      : ["<kbd>2</kbd> the map: the pack and the convoy. Get ahead of it.", ...orders, "Periscope depth (<kbd>P</kbd>) as it comes on; <kbd>T</kbd> selects a ship.", "<kbd>Space</kbd> fires when the lamp says On target. Then deep (<kbd>E</kbd>) and quiet (<kbd>X</kbd>)."];
    const go = () => { if (!UI.sheet) return; UI.close(true); done(); };
    UI.open(S.scnName || "Orders", { wide: true, closable: false,
      html: () => `<div class="report"><div><p class="meta">${esc(when)}</p>${S.scnNote ? `<p class="lesson">${esc(S.scnNote)}</p>` : ""}<p>${side}</p><p class="lesson"><b>${goal}</b></p></div>
        <div><h3>First moves</h3><ol class="brief">${first.map(x => `<li>${x}</li>`).join("")}</ol><p class="note"><kbd>?</kbd> has every key; <kbd>Esc</kbd> pauses.</p></div></div>
        <div class="row end"><button data-act="go" class="primary">Begin <kbd>Space</kbd></button></div>`,
      onClick: b => { if (b.dataset.act === "go") go(); },
      onKey: ev => { if (ev.key === "Escape" || ev.key === " " && !(document.activeElement && document.activeElement.tagName === "BUTTON")) { ev.preventDefault(); go(); return true; } return false; } });
  };

  /* ---- pause: a slip of the title's signal paper; where and when, the choices, and the keys that matter most ---- */
  const KEY_LEGEND = [["W S", "telegraph"], ["A D", "helm"], ["Q E", "depth"], ["C", "crash dive"], ["← →", "train, look"], ["T", "select a ship"], ["Space", "fire"], ["?", "all keys"]];
  const PAD_LEGEND = [["pad:L-stick", "helm, telegraph"], ["pad:dU pad:dD", "depth"], ["pad:L-click", "crash dive"], ["pad:R-stick", "train, look"], ["pad:X", "select a ship"], ["pad:A", "fire"], ["pad:LB pad:RB", "stations"], ["pad:Back+Start", "all keys"]];
  UI.pause = () => {
    const S = PP.game.S, n = S.stats.sunk.length;
    const btn = (act, words, cls = "") => `<button data-act="${act}"${cls ? ` class="${cls}"` : ""}>${UI.TICK}<span class="lbl">${words}</span></button>`;
    UI.open("Paused", { popup: true,
      html: () => `<dl class="msg-f"><div class="w"><dt>Position</dt><dd>${esc(S.scnName || "Mission")}</dd></div>
        <div><dt>Date-time group</dt><dd>${C.dtgStr(S.t)}</dd></div><div><dt>Sunk</dt><dd>${n} ship${n === 1 ? "" : "s"}, ${num(S.stats.tons)} tons</dd></div></dl>
        <div class="col">${btn("resume", "Resume", "primary")}${btn("log", "Captain's log")}${btn("settings", "Settings")}${btn("help", "Help")}
        ${btn("leave", PP.prefs.resume ? "Main menu: resume it later" : "End the mission")}
        ${PP.prefs.resume ? btn("end", "End the mission") : ""}</div>
        <div class="note keys legend">${(PP.Input.device === "pad" ? PAD_LEGEND : KEY_LEGEND).map(([k, w]) => `<span class="k">${k.split(" ").map(x => `<kbd>${x}</kbd>`).join(" ")}</span><span>${w}</span>`).join("")}</div>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "log") { UI.close(true); UI.log(S, () => UI.pause()); }
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "leave") { if (PP.prefs.resume) { UI.close(true); PP.game.leave(); } else if (await UI.ask("End this mission here? What you have sunk still counts.", "End the mission")) { UI.close(true); PP.game.endAction(); } }
        if (a === "end" && await UI.ask("End this mission here? What you have sunk still counts.", "End the mission")) { UI.close(true); PP.game.endAction(); }
      },
      onClose: () => PP.game.unpause(),
    });
  };

  /* ---- the captain's log ---- */
  UI.log = (S, after) => UI.open("Captain's log", { onClose: after,
    html: () => S.log.length ? `<table class="tally log">${S.log.slice().reverse().slice(0, 120).map(l => `<tr><td class="num">${esc(C.timeStr(l.t))}</td><td>${esc(l.text)}</td><td class="note">${esc(C.dateStr(l.t))}</td></tr>`).join("")}</table>` : `<p class="note">Nothing written yet.</p>`,
  });

  /* ---- the end of an action ---- */
  const sunkTable = list => list.length ? `<table class="tally">${list.map(x => `<tr><td>${esc(C.SHIPS[x.cls].name)} ${esc(x.name)}</td><td class="num">${num(x.tons)} t</td></tr>`).join("")}</table>` : `<p class="note">Nothing sunk.</p>`;
  /* what the boat did, sunk or not: the shots, the hits, what she came through */
  const tally = S => { const t = S.stats, rows = [["Torpedoes fired", t.fired], ["Hits", t.hits + (t.duds ? `, ${t.duds} dud${t.duds > 1 ? "s" : ""}` : "")]].concat(t.shells ? [["Shells fired", t.shells]] : [], [["Depth charges survived", t.charges], ["Deepest", Math.round(t.maxDepth) + " ft"]]);
    return `<table class="tally">${rows.map(([a, b]) => `<tr><td>${a}</td><td class="num">${b}</td></tr>`).join("")}</table>`; };
  /* ---- the debrief: who won, the score and its rating, both sides' vessels, every weapon, every boat ---- */
  const FATE = { crushed: "crushed", flooded: "flooded" };
  const KIND = { dc: "depth charges", hedgehog: "the hedgehog", gun: "gunfire", ram: "rammed", air: "bombs", torpedo: "its own torpedo", ground: "aground" };
  const weaponTable = (head, rows) => `<table class="tally deb"><tr><th>${esc(head)}</th><th class="num">Fired</th><th class="num">Hits</th><th class="num">Kills</th></tr>${rows.filter(r => r[1] || r[3]).map(([n, f, h, k]) => `<tr><td>${esc(n)}</td><td class="num">${num(f)}</td><td class="num">${num(h)}</td><td class="num">${num(k)}</td></tr>`).join("") || `<tr><td colspan="4" class="note">None used.</td></tr>`}</table>`;
  const boatTable = (D, S) => `<table class="tally deb"><tr><th>Boat</th><th>Captain</th><th class="num">Fired</th><th class="num">Sunk</th><th class="num">Damage</th></tr>${D.boats.map(b => {
    const l = b.lost && (S.stats.lost || []).find(x => x.name === b.name);
    return `<tr${b.lost ? ' class="lost"' : ""}><td>${esc(b.name)} <span class="note">${esc(C.SUBS[b.cls].name)}${b.lost ? `, lost: ${esc(FATE[b.lost] || b.lost)}${l && KIND[l.kind] ? ` (${KIND[l.kind]})` : ""}` : ""}</span></td><td>${esc(b.capt)}</td><td class="num">${b.fired}</td><td class="num">${b.sank ? `${b.sank} · ${num(b.tons)} t` : "0"}</td><td class="num">${b.lost ? "—" : b.damage + "%"}</td></tr>`;
  }).join("")}</table>`;
  UI.actionOver = S => {
    const pct = C.realPct(S.real), D = E.debrief(S), rating = D.rating, lost = S.end && (S.end.why === "crushed" || S.end.why === "flooded");
    /* kept by side: the pack's best is the most sunk; the PDF's, its score (a convoy brought through untouched sinks
     * nothing, and is the best of all) */
    const pdf = S.side === "escorts", A0 = E.ACTIONS.find(a => a.id === S.scn);
    const rec = { tons: S.stats.tons, pts: Math.round((pdf ? D.score * 100 : S.stats.tons) * pct / 100), pct, rating, score: D.score, side: pdf ? "escorts" : "pack", code: !!S.cheated, at: Date.now() };
    const best = S.mode === "action" && A0 && (pdf || (!lost && S.stats.tons > 0)) ? PP.addAction(PP.recKey(A0, S.side), rec) : false;
    const why = { allSunk: S.goal === "escort" ? "The hunter is on the bottom." : "Every merchant in the convoy is on the bottom.", escaped: "The rest of the convoy got away.", slipped: "The pack slipped away from the hunter.", crushed: "The last of the pack is lost.", flooded: "The last of the pack is lost.", ended: "You ended it here.", time: "The time was up.", fleetLost: "Every escort is sunk." }[S.end ? S.end.why : "ended"] || "";
    if (S.mode === "action") {
      const sd = D.sides;
      UI.open("Debrief", { wide: true, closable: false,
        html: () => `<div class="report"><div><h3 class="mname big${D.winner === D.side ? " ok" : " danger"}">${D.winner === "pack" ? "The wolfpack wins" : "The PDF wins"}</h3>
          <p class="meta">${esc(S.scnName || "")}. ${esc(why)}</p>
          <p class="rank">Score <b>${D.score}%</b>: <b>${esc(rating)}</b>${best ? ", your best here" : ""}.</p>
          <p>${D.side === "escorts" ? `The convoy lost ${num(S.stats.tons)} of ${num(S.potential)} tons; ${sd.pack.lost} of the pack's ${sd.pack.start} boats sunk.` : `${num(S.stats.tons)} of ${num(S.potential)} tons sunk${D.escSunk && S.goal !== "escort" ? `, and ${D.escSunk} escort${D.escSunk > 1 ? "s" : ""}` : ""}.`}</p>
          <table class="tally deb"><tr><th></th><th class="num">At the start</th><th class="num">Lost</th></tr>
            <tr><td>The wolfpack</td><td class="num">${sd.pack.start} boat${sd.pack.start > 1 ? "s" : ""}</td><td class="num">${sd.pack.lost}</td></tr>
            <tr><td>The convoy</td><td class="num">${sd.fleet.merch ? `${sd.fleet.merch} ships, ` : ""}${sd.fleet.esc} escort${sd.fleet.esc === 1 ? "" : "s"}</td><td class="num">${sd.fleet.lost}</td></tr></table>
          ${D.side === "pack" && !S.stats.tons && !lost ? `<p class="lesson">${S.stats.fired ? (S.stats.hits ? "Hits, but nothing went down: a big ship can take more than one. Stay with her for the next shot." : "Every shot missed. Shoot from ahead of the target and off its track, under 3,000 yards.") : "No torpedoes away. Put the pack ahead of the convoy, on Attack, and take command of the boat nearest it."}</p>` : ""}
          ${D.side === "escorts" && !sd.pack.lost ? `<p class="lesson">No boat sunk. Sprint, then slow under 15 knots to hear them; run in over a fresh contact and lay the pattern at its depth.</p>` : ""}
          <p class="note">Reality ${pct}%. ${D.side === "escorts" ? "The score is the share of the convoy's tonnage saved, and of the pack sunk." : "The score is the share of the tonnage sunk, and of the pack brought home."}</p></div>
          <div><h3>The wolfpack</h3>${boatTable(D, S)}<h3>Weapons</h3>${weaponTable("The wolfpack's", D.pack)}${weaponTable("The PDF's", D.fleet)}
          ${S.stats.sunk.length ? `<h3>Sunk</h3>${sunkTable(S.stats.sunk)}` : ""}</div></div>
          <div class="row end"><button data-act="again" class="primary">Fight it again</button><button data-act="actions">Missions</button><button data-act="title">Main menu</button></div>`,
        onClick: b => {
          const a = b.dataset.act;
          if (a === "again") { UI.close(true); PP.game.startAction(S.scn, S.real, PP.game.lastCustom, S.side || "pack"); }
          if (a === "actions") { UI.close(true); UI.actions(); }
          if (a === "title") { UI.close(true); PP.game.toTitle(); }
        },
      });
      return;
    }
    UI.open(lost ? "Lost with all hands" : "Practice over", { wide: true, closable: false,
      /* the headline: the tonnage sunk; in the practice, with nothing sunk, the hits (a hit is the lesson learnt) */
      html: () => `<div class="report"><div><h3 class="mname big${lost ? " danger" : S.stats.tons || (S.mode === "practice" && S.stats.hits) ? " ok" : ""}">${S.mode === "practice" && !S.stats.tons && !lost ? (S.stats.hits ? `${S.stats.hits} hit${S.stats.hits > 1 ? "s" : ""}` : S.stats.fired ? "No hits yet" : "No shots yet") : `${num(S.stats.tons)} tons`}</h3>
        <p class="meta">${esc(S.scnName || "")}. ${esc(why)}</p>
        ${!lost && S.stats.charges ? `<p class="honour">Survived ${S.stats.charges} depth charge${S.stats.charges > 1 ? "s" : ""}</p>` : ""}
        ${S.mode === "action" && !lost && !S.stats.tons ? `<p class="lesson">${S.stats.fired ? (S.stats.hits ? "Hits, but nothing went down: a big ship can take more than one. Stay with her for the next shot." : "Every shot missed. Shoot from ahead of the target, 1,000 to 2,000 yards off its track, near 90° on the bow.") : "No torpedoes away. Get ahead of the convoy on the surface, then dive across its track."} The convoy is still out there.</p>` : ""}
        ${S.mode === "practice" ? `<p class="lesson">${S.stats.hits ? "That's the attack. Next, a mission with escorts: they hunt back." : S.stats.fired ? "A miss teaches the angle: shoot from ahead of the target and off its track, under 3,000 yards." : "Select a ship with <kbd>T</kbd>, and fire with <kbd>Space</kbd> when the lamp says On target."}</p>` : ""}
        ${S.mode === "practice" ? "" : `<p class="note">Reality ${pct}%.</p>`}</div>
        <div>${S.stats.sunk.length ? `<h3>Sunk</h3>${sunkTable(S.stats.sunk)}` : ""}<h3>The engagement</h3>${tally(S)}</div></div>
        <div class="row end"><button data-act="again" class="primary">${S.mode === "practice" ? "Again" : "Fight it again"}</button><button data-act="actions">Missions</button><button data-act="title">Main menu</button></div>`,
      onClick: b => {
        const a = b.dataset.act;
        if (a === "again") { UI.close(true); S.mode === "practice" ? PP.game.startPractice() : PP.game.startAction(S.scn, S.real, PP.game.lastCustom); }
        if (a === "actions") { UI.close(true); UI.actions(); }
        if (a === "title") { UI.close(true); PP.game.toTitle(); }
      },
    });
  };
  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const sw = (k, n) => toggle("aidt:" + k, PP.aid(k), n);
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(PP.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Aids</h3>
        <div class="row">${pill(PP.prefs.aids === "classic", "Classic" + (PP.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(PP.prefs.aids === "field", "Field" + (PP.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic is the instruments and your eyes. Field adds the helps below. <kbd>L</kbd> switches between them at sea and keeps the aids you set on your own. Aids never change the war: the reality does that.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${PP.AID_LIST.map(([k, n, note]) => line(n, esc(note), sw(k, n))).join("")}</table></details>
        <h3>Reality for new games</h3>${realLine(PP.prefs.real, "dreal")}
        <h3>Controls</h3>
        <div class="row">${Object.entries(PP.STEER).map(([k, n]) => pill(PP.prefs.steer === k, n, "steer:" + k)).join("")}</div>
        <p class="note">${PP.modern() ? "The keys, and the mouse too: click the chart to steer for a point, drag through the periscope to train it." : "<kbd>W</kbd> <kbd>S</kbd> the telegraph, <kbd>A</kbd> <kbd>D</kbd> the helm; the arrows work the station in front of you, and a click on a ship locks it. A gamepad works too."}</p>
        <h3>Look</h3>
        <table class="aids">${line("Scanlines", "Fine dark lines over the screen, like an old television.", toggle("scan", PP.prefs.scanlines, "Scanlines"))}
        ${line("Screen shake", "The boat jolts when depth charges go off close." + (PP.calm() ? " Off to begin with, as this computer asks for less motion." : ""), toggle("shake", PP.prefs.shake, "Screen shake"))}</table>
        <h3>Sound</h3>
        <table class="aids">${line("Sound", "Diesels, motors, screws, pings, charges; the theme on the title. <kbd>M</kbd> switches it anywhere.", toggle("mute", !PP.SFX.muted, "Sound"))}
        ${line("Music", "The theme on the title. Off, the boats and the sea still sound." + (PP.SFX.muted ? " Silent while Sound is off." : ""), toggle("music", PP.SFX.musicOn, "Music"))}</table>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PP.SPEEDS).map(([k, [n]]) => pill(PP.prefs.speed === k, n, "speed:" + k)).join("")}</div>
        <p class="note">Relaxed slows the whole game down, Brisk speeds it up. Time compression works on top of it.</p>
        <h3>This browser</h3>
        <table class="aids">${line("Resume a game", "Leave a mission in the middle and come back to it.", toggle("resume", PP.prefs.resume, "Resume a game"))}</table>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything The Long Convoy keeps in this browser: the career, the service record, a game in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything The Long Convoy has saved in this browser: the career, the service record, a game in progress, and your settings? This cannot be undone.", "Forget everything")) PP.forgetEverything();
          return;
        }
        const [k, a] = v.split(":");
        if (k === "aids") PP.setAids(a);
        else if (k === "aidt") PP.setAid(a, !PP.aid(a));
        else if (k === "dreal") { PP.prefs.real[a] = !PP.prefs.real[a]; PP.savePrefs(); }
        else if (k === "steer") { PP.prefs.steer = a; PP.savePrefs(); }
        else if (k === "scan") { PP.prefs.scanlines = !PP.prefs.scanlines; PP.savePrefs(); PP.game.applyLook(); }
        else if (k === "shake") { PP.prefs.shake = !PP.prefs.shake; PP.savePrefs(); }
        else if (k === "resume") { PP.prefs.resume = !PP.prefs.resume; PP.savePrefs(); }
        else if (k === "mute") PP.game.toggleMute();
        else if (k === "music") PP.game.setMusic(!PP.SFX.musicOn);
        else if (k === "speed") { PP.prefs.speed = a; PP.savePrefs(); PP.game.applySpeed(); }
        PP.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  /* Help: short cards, not paragraphs. Each card a few rows, the keys (or the thing to click) first and a few
   * words after; a line of advice under some. Start here is the whole game in a minute */
  const keys = rows => `<table class="keys">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  const kb = (...ks) => ks.map(k => `<kbd>${k}</kbd>`).join(" ");
  const card = (title, rows, tip) => `<section class="hcard"><h3>${title}</h3><dl class="hk">${rows.map(([k, d]) => `<dt>${k}</dt><dd>${d}</dd>`).join("")}</dl>${tip ? `<p class="tip">${tip}</p>` : ""}</section>`;
  const grid = (...cards) => `<div class="hgrid">${cards.join("")}</div>`;
  const HELP_TABS = ["Start here", "U-boat", "Escort", "Keys", "Gamepad"];
  UI.helpTab = name => Math.max(0, HELP_TABS.indexOf(name));
  UI.helpTabs = () => [
    ["Start here", `<p class="lede">Sink the convoy as the Wolf Empire's U-boats, or bring it home as the Pumacity Defense Fleet's escorts. New to it? <b>Target Practice</b> (<kbd>T</kbd> on the title) is one boat and a few ships, no escorts: the attack below, in safety. Then pick a side on the <b>Missions</b> page.</p>
      ${grid(
        `<section class="hcard"><h3>Your first attack, in a U-boat</h3><ol class="steps">
          <li>Open the <b>map</b> (${kb("2")}) and get ahead of the convoy. On the surface you are fastest.</li>
          <li>Dive to <b>periscope depth</b> (${kb("P")}) as it comes on.</li>
          <li><b>Select a ship</b>: ${kb("T")}, or click it.</li>
          <li>Wait for the lamp to say <b>On target</b>, then <b>fire</b> (${kb("Space")}).</li>
          <li>Then go <b>deep</b> (${kb("E")}), <b>slow</b> (${kb("S")}) and <b>quiet</b> (${kb("X")}).</li>
        </ol><p class="tip">The best shot is from ahead of the ship, side-on to it, 1,000 to 3,000 yards off.</p></section>`,
        card("The screens", [[kb("1"), "Dashboard: the view out and every control"], [kb("2"), "Map: the whole battle, and your other vessels"], [kb("3"), "Sonar: what you hear, as a waterfall"], [kb("4"), "Damage (a U-boat's)"], [kb("5"), "Captain's log, over the screen"], [kb("Tab"), "The next screen"]],
          "On the dashboard every control is a button. Point at one to see what it does and its key."),
        card("Bring the pack in", [["Click a boat", "Select her, on the map or in its list"], [kb("O"), "Her next order; on the map, click her order for all of them"], ["Right click", "A waypoint for her"], [kb("Enter"), "Take command of her"], [kb("N"), "The next boat"]],
          "Send two boats at the convoy from two sides: its escorts can hunt only so many at once."),
        card("Any time", [[kb("Esc"), "Pause"], [kb("+", "−"), "Time faster, slower; " + kb("Backspace") + " back to 1x"], [kb("?"), "This help"], [kb("M"), "Sound on or off"], [kb("L"), "Field or Classic aids"]],
          "Time speeds up only while nothing is close; the clock says what is holding it back."))}`],
    ["U-boat", grid(
      card("Drive", [[kb("W", "S"), "Speed, a bell at a time"], [kb("A", "D"), "Rudder, while held"], ["Compass rim", "Click to steer for that heading"], [kb("Q", "E"), "Shallower, deeper"],
        [kb("P") + " " + kb("U"), "Periscope depth, surface"], [kb("C"), "Crash dive"]]),
      card("The dive bubble", [["Tube", "Click a rate to hold it. Going down, she stops short of crush depth"], ["Blow", "Straight to the surface. No diving for 4 minutes. Click twice"], ["Crash", "Down fast to a safe depth. Click twice"]]),
      card("Attack", [[kb("T"), "Select a ship (again: the next)"], [kb("Space"), "Fire the spread"], [kb("V"), "Spread: one to four torpedoes"], [kb("F"), "Forward or after tubes"], [kb("H"), "Swing the view onto the target"]],
        "The lamp says <b>On target</b>, <b>Wrong angle</b> (try the other tubes) or <b>Out of range</b>."),
      card("Deck gun", [[kb("G"), "Man the gun, on the surface"], [kb("G"), "Fire: the crew aim it"], [kb("Shift", "G"), "Secure it"]], "It cannot fire past the tower. A dive waits while the crew stow it."),
      card("Stay alive", [[kb("X"), "Silent running"], [kb("K"), "Noisemaker: escorts may chase it (four aboard)"], ["Metox", "Lights when radar sweeps you: dive"], ["Aircraft", "Crash dive"]],
        "Hunted? Go deep, slow and quiet, and turn across the escort's line."),
      card("Battery and fuel", [["Surface", "The diesels drive and charge the battery"], ["Below", "The battery runs everything, faster at speed"], [kb("I"), "Snorkel: diesels at periscope depth, from Year IV. Loud"], [kb("Y"), "Radar, when fitted"]],
        "Charge stopped or at a slow bell; nothing charges above " + (C.BAT.chargeKn + 4) + " knots."),
      card("The pack", [["The map", "Lists the pack, a row a boat: order, depth, battery, tubes, hull"], ["Click a boat", "Select it (a row, or on the map)"], [kb("O"), "Its next order"], ["Right click", "Add a waypoint"], [kb("Enter"), "Take command (or click it again)"], [kb("N"), "Command of the next boat"], [kb("J"), "AUTO: your boat follows its order"]],
        "Orders: " + PP.Orders.LIST.map(o => `<b>${o[1]}</b>`).join(", ") + "."),
      card("Hydrophones", [[kb("3"), "The Sonar screen; the dashboard has a small one"], ["A band", "A ship's screws at that bearing: brighter is louder"], ["A bright point", "An escort's ping striking your hull"], ["A line across", "A depth charge going off"]],
        "Newest at the top, a line a second. Slow down to hear: your own noise drowns it. Astern you hear little."),
      card("Depth and damage", [["Test depth", "The hull groans below it"], ["Crush depth", "The hull fails below it. Damage brings it up"], [kb("4"), "Damage: amber hurt, red out"]],
        "The crew mend the worst first. A boat with her radio out takes no orders."))],
    ["Escort", grid(
      card("Find the boat", [["Hydrophones", "Hear a boat that runs fast"], ["Over 15 knots", "Your own noise drowns them"], [kb("X"), "Sonar: pings ahead, but the boat hears it"]],
        "Sprint, then slow down and listen. Every escort's contacts are on the map, fading as they age."),
      card("Depth charges", [["The lamp", "<b>Run in</b>, <b>Stand by</b>, then <b>Over the contact</b>"], [kb("Space"), "Lay the pattern"], [kb("V"), "Pick the pattern"], [kb("Q", "E"), "Charges' depth (" + kb("Shift") + ": 100 ft)"], [kb("F"), "Fire the hedgehog at once, later in the war"]]),
      card("Patterns", [["Diamond", "5 charges"], ["Double", "10: a diamond in two layers"], ["Wide", "14: when you are unsure where it is"], ["Hedgehog", "Bombs thrown ahead; they burst only on a hull"]],
        "Throwers reload in 6 seconds, rails in 3. Full racks hold a double or two diamonds."),
      card("Sonar", [[kb("3"), "The Sonar screen; the dashboard has a small one"], ["A band", "Something heard at that bearing: brighter is louder"], ["A bright point", "An echo off a hull, when pinging"], ["A line across", "A depth charge going off"]],
        "A U-boat's motors are faint; a noisemaker is loud. Over 15 knots the whole of it goes bright: you are deaf."),
      card("Guns", [[kb("G"), "Fire every gun that bears"], [kb("T"), "Next target (" + kb("Shift") + ": back), or click it"]],
        "Guns take a moment to swing round, and each has its arc. Run a boat down and you ram it."),
      card("Drive", [[kb("W", "S"), "Speed, a bell at a time"], [kb("A", "D"), "Rudder, while held"], ["Compass rim", "Click to steer for that heading"], [kb("J"), "AUTO: she follows her order"]]),
      card("Your escort group", [["The map", "Lists the group, a row each: order, sonar, contact, charges, hull"], ["Click an escort", "Select it (a row, or on the map)"], [kb("O"), "Its order: Screen, Hunt, Patrol, Hold"], ["Right click", "Add a waypoint"], [kb("Enter"), "Go aboard (or click it again)"], [kb("N"), "The next escort"]]))],
    ["Keys", grid(
      card("Handling", [[kb("W", "S"), "Speed"], [kb("A", "D"), "Rudder"], [kb("Q", "E"), "Shallower, deeper (escort: charges' depth)"], [kb("P", "U", "C"), "Periscope depth, surface, crash dive"], [kb("J"), "AUTO or your control"]]),
      card("Weapons", [[kb("Space"), "Fire, or lay the pattern"], [kb("T"), "Select a ship"], [kb("V"), "Spread or pattern"], [kb("F"), "Tubes, or the hedgehog"], [kb("G"), "Gun"], [kb("K"), "Noisemaker"]]),
      card("Looking", [[kb("←", "→"), "Train the periscope, look round"], [kb("↑", "↓"), "Periscope up and down, the glasses"], [kb("Z"), "Power, or zoom the map"], [kb("H"), "Onto the target"], [kb("B"), "To the bow, again the stern"]]),
      card("Screens and time", [[kb("1") + "–" + kb("5"), "Dashboard, map, sonar, damage; the log"], [kb("Tab"), "Next screen"], [kb("+", "−"), "Time faster, slower"], [kb("Backspace"), "Back to 1x"]]),
      card("Your side", [[kb("N"), "Next vessel (" + kb("Shift") + ": back)"], [kb("O"), "Next order"], [kb("Enter"), "Take command"]]),
      card("Systems", [[kb("X"), "Silent running, or sonar"], [kb("I"), "Snorkel"], [kb("Y"), "Radar"], [kb("L"), "Aids"], [kb("M"), "Sound"], [kb("Esc"), "Pause"]])) +
      `<p class="note">Keys are shown where they sit on a US keyboard; where the browser can tell, each shows your own keyboard's letter.</p>`],
    ["Gamepad", keys([["Sticks", "<kbd>pad:L-stick</kbd> the helm, flicked up or down the telegraph; <kbd>pad:R-stick</kbd> trains the periscope, looks round"],
      ["Buttons", "<kbd>pad:A</kbd> fire, <kbd>pad:B</kbd> periscope up or down, <kbd>pad:X</kbd> select a ship, <kbd>pad:Y</kbd> power, the glasses, the map's zoom"],
      ["D-pad", "<kbd>pad:dU</kbd> <kbd>pad:dD</kbd> depth, <kbd>pad:dL</kbd> the tubes, <kbd>pad:dR</kbd> the gun"],
      ["Stick clicks", "<kbd>pad:L-click</kbd> crash dive, <kbd>pad:R-click</kbd> up a level: periscope depth, then the surface"],
      ["Shoulders", "<kbd>pad:LB</kbd> <kbd>pad:RB</kbd> screens, <kbd>pad:LT</kbd> <kbd>pad:RT</kbd> time"],
      ["Back, Start", "<kbd>pad:Back</kbd> the map, <kbd>pad:Start</kbd> pause"],
      ["Back held", "<kbd>pad:A</kbd> spread, <kbd>pad:B</kbd> silent running, <kbd>pad:X</kbd> next order, <kbd>pad:dU</kbd> next boat, <kbd>pad:dD</kbd> take command, <kbd>pad:Y</kbd> radar, <kbd>pad:LB</kbd> log, <kbd>pad:RB</kbd> aids, <kbd>pad:LT</kbd> 1x, <kbd>pad:R-click</kbd> onto the target, <kbd>pad:RT</kbd> bow or stern, <kbd>pad:Start</kbd> this help"],
      ["Menus", "the d-pad moves, <kbd>pad:A</kbd> chooses, <kbd>pad:B</kbd> goes back, <kbd>pad:LB</kbd> <kbd>pad:RB</kbd> turn these pages"]]) + `<p class="gk-credit">${CREDIT}</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p>Lead the Wolf Empire's wolfpack against Pumacity's convoys, or sail with the Pumacity Defense Fleet and bring them through, in this homage to NovaLogic's <i>Wolfpack</i> (1990). Command any vessel of your side, give the others their orders, and fight it out from the map.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
