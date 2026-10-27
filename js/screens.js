/* PumaPack -- the screens with words on them, boards in the boat's red
 * light (css/pumapack.css): the missions and a custom one, target practice,
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
  UI.actions = () => {
    const real = Object.assign({}, PP.prefs.real), f = PP.fame();
    /* the side you play: the pack, or the escorts (the 1990 game let you play either) */
    let side = PP.prefs.side === "escorts" ? "escorts" : "pack";
    const list = () => E.ACTIONS.filter(A => (A.sides || ["pack"]).includes(side));
    UI.open("Missions", { wide: true, back: () => PP.game.toTitle(),
      html: () => `<div class="row">${pill(side === "pack", "The Wolfpack", "side:pack")}${pill(side === "escorts", "The PDF", "side:escorts")}</div>
        <p class="lede">${side === "pack" ? "The Wolf Empire's wolfpack against Pumacity's shipping: one engagement, one night or day of the war." : "The Pumacity Defense Fleet, escorting the city's shipping against the wolfpack: you are aboard one escort, the others keep their stations under your orders."}</p>
        <div class="diffs acts">${list().map((A, i) => `<button data-a="${A.id}"><b><kbd>${i + 1}</kbd>${esc(side === "escorts" ? A.escName || A.name : A.name)}</b><span>${esc(side === "escorts" ? A.escNote || A.note : A.note)}</span><span class="meta">${esc(C.dateStr(C.monthStart(A.mi) + ((A.day || 10) - 1) * C.DAY))} · ${A.boats.length} boat${A.boats.length > 1 ? "s" : ""} · ${A.conv.n ? A.conv.n + " ships" : "no merchants"} · ${escorts(A)}${f.actions[A.id] ? ` · best ${num(f.actions[A.id].tons)} t` : ""}</span></button>`).join("")}
          ${side === "pack" ? `<button data-a="custom"><b><kbd>9</kbd>Custom mission</b><span>The year, the pack, the convoy, the time and the weather of your choosing.</span></button>` : ""}</div>
        ${realLine(real, "real")}`,
      onKey: ev => { const n = +ev.key, L = list(); if (n >= 1 && n <= L.length) { ev.preventDefault(); go(L[n - 1].id); return true; } if (ev.key === "9" && side === "pack") { ev.preventDefault(); go("custom"); return true; } return false; },
      onClick: (b, api) => {
        if (b.dataset.a) return go(b.dataset.a);
        const v = b.dataset.set; if (v && v.startsWith("real:")) { const k = v.slice(5); real[k] = !real[k]; PP.prefs.real = Object.assign({}, real); PP.savePrefs(); api.refresh(); }
        if (v && v.startsWith("side:")) { side = v.slice(5); PP.prefs.side = side; PP.savePrefs(); api.refresh(); }
      },
    });
    function go(id) { if (id === "custom") { UI.close(true); UI.custom(real); return; } UI.close(true); PP.game.startAction(id, real, null, side); }
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
      onClick: (b, api) => {
        const v = b.dataset.set;
        if (v) { const [, k, x] = v.split(":"); c[k] = k === "mi" ? +x : x; if (C.SUBS[c.cls].from > c.mi) c.cls = "caracal"; api.refresh(); }
        if (b.dataset.act === "go") { PP.store.set(PP.KEY_LAST, c); UI.close(true); PP.game.startAction("custom", real, c); }
      },
    });
  };
  /* ---- target practice ---- */
  UI.practice = () => UI.open("Target practice", { back: () => PP.game.toTitle(),
    html: () => `<p class="lede">Unescorted targets on a steady course, calm water, good torpedoes. Nothing counts.</p>
      <div class="diffs two"><button data-k="torpedo" autofocus><b><kbd>1</kbd>Torpedoes</b><span>Three ships crossing ahead of you at periscope depth. Select one with <kbd>T</kbd> and fire: the boat aims the shot.</span></button>
      <button data-k="gun"><b><kbd>2</kbd>The deck gun</b><span>An old coaster, a few thousand yards off, and you on the surface. <kbd>G</kbd> mans the gun.</span></button></div>`,
    onKey: ev => { if (ev.key === "1" || ev.key === "2") { ev.preventDefault(); UI.close(true); PP.game.startPractice(ev.key === "1" ? "torpedo" : "gun"); return true; } return false; },
    onClick: b => { if (b.dataset.k) { UI.close(true); PP.game.startPractice(b.dataset.k); } },
  });

  /* ---- the service record ---- */
  UI.record = after => {
    const f = PP.fame();
    UI.open("Service record", { wide: true, onClose: after,
      html: () => `<h3>Missions</h3><table class="scores">${E.ACTIONS.map(A => { const r = f.actions[A.id]; return `<tr><td>${esc(A.name)}</td><td class="num">${r ? num(r.tons) + " t" : "—"}</td><td>${r ? (r.score !== undefined ? `${r.score}% · ` : "") + esc(r.rating) + ` · reality ${r.pct}%` : ""}</td></tr>`; }).join("")}</table>`,
    });
  };

  /* ---- pause: a slip of the title's signal paper; where and when, the choices, and the keys that matter most ---- */
  const KEY_LEGEND = [["W S", "telegraph"], ["A D", "helm"], ["Q E", "depth"], ["C", "crash dive"], ["← →", "train, look"], ["T", "lock"], ["Space", "fire"], ["?", "all keys"]];
  const PAD_LEGEND = [["pad:L-stick", "helm, telegraph"], ["pad:dU pad:dD", "depth"], ["pad:L-click", "crash dive"], ["pad:R-stick", "train, look"], ["pad:X", "lock"], ["pad:A", "fire"], ["pad:LB pad:RB", "stations"], ["pad:Back+Start", "all keys"]];
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
        if (a === "leave") { if (PP.prefs.resume) { UI.close(true); PP.game.leave(); } else if (await UI.ask("End this action here? What you have sunk still counts.", "End the action")) { UI.close(true); PP.game.endAction(); } }
        if (a === "end" && await UI.ask("End this action here? What you have sunk still counts.", "End the action")) { UI.close(true); PP.game.endAction(); }
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
  const KIND = { dc: "depth charges", hedgehog: "the hedgehog", gun: "gunfire", ram: "rammed", air: "bombs", torpedo: "her own torpedo", ground: "aground" };
  const weaponTable = (head, rows) => `<table class="tally deb"><tr><th>${esc(head)}</th><th class="num">Fired</th><th class="num">Hits</th><th class="num">Kills</th></tr>${rows.filter(r => r[1] || r[3]).map(([n, f, h, k]) => `<tr><td>${esc(n)}</td><td class="num">${num(f)}</td><td class="num">${num(h)}</td><td class="num">${num(k)}</td></tr>`).join("") || `<tr><td colspan="4" class="note">None used.</td></tr>`}</table>`;
  const boatTable = (D, S) => `<table class="tally deb"><tr><th>Boat</th><th>Captain</th><th class="num">Fired</th><th class="num">Sunk</th><th class="num">Damage</th></tr>${D.boats.map(b => {
    const l = b.lost && (S.stats.lost || []).find(x => x.name === b.name);
    return `<tr${b.lost ? ' class="lost"' : ""}><td>${esc(b.name)} <span class="note">${esc(C.SUBS[b.cls].name)}${b.lost ? `, lost: ${esc(FATE[b.lost] || b.lost)}${l && KIND[l.kind] ? ` (${KIND[l.kind]})` : ""}` : ""}</span></td><td>${esc(b.capt)}</td><td class="num">${b.fired}</td><td class="num">${b.sank ? `${b.sank} · ${num(b.tons)} t` : "0"}</td><td class="num">${b.lost ? "—" : b.damage + "%"}</td></tr>`;
  }).join("")}</table>`;
  UI.actionOver = S => {
    const pct = C.realPct(S.real), D = E.debrief(S), rating = D.rating, lost = S.end && (S.end.why === "crushed" || S.end.why === "flooded");
    const rec = { tons: S.stats.tons, pts: Math.round(S.stats.tons * pct / 100), pct, rating, score: D.score, code: !!S.cheated, at: Date.now() };
    const best = S.mode === "action" && !lost && S.stats.tons > 0 ? PP.addAction(S.scn, rec) : false;
    const why = { allSunk: S.goal === "escort" ? "The hunter is on the bottom." : "Every merchant in the convoy is on the bottom.", escaped: "The rest of the convoy got away.", slipped: "The pack slipped away from the hunter.", crushed: "The last of the pack is lost.", flooded: "The last of the pack is lost.", ended: "You broke off the action.", time: "The time was up.", fleetLost: "Every escort is sunk." }[S.end ? S.end.why : "ended"] || "";
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
          ${D.side === "pack" && !S.stats.tons && !lost ? `<p class="lesson">${S.stats.fired ? (S.stats.hits ? "Hits, but nothing went down: a big ship can take more than one. Stay with her for the next shot." : "Every shot missed. Shoot from ahead of her and off her track, under 3,000 yards.") : "No torpedoes away. Put the pack ahead of the convoy, on Attack, and take command of the boat nearest it."}</p>` : ""}
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
      html: () => `<div class="report"><div><h3 class="mname big${lost ? " danger" : S.stats.tons ? " ok" : ""}">${num(S.stats.tons)} tons</h3>
        <p class="meta">${esc(why)} ${esc(S.scnName || "")}</p>
        ${!lost && S.stats.charges ? `<p class="honour">Survived ${S.stats.charges} depth charge${S.stats.charges > 1 ? "s" : ""}</p>` : ""}
        ${S.mode === "action" && !lost && !S.stats.tons ? `<p class="lesson">${S.stats.fired ? (S.stats.hits ? "Hits, but nothing went down: a big ship can take more than one. Stay with her for the next shot." : "Every shot missed. Shoot from ahead of her, 1,000 to 2,000 yards off her track, near 90° on the bow.") : "No torpedoes away. Get ahead of the convoy on the surface, then dive across its track."} The convoy is still out there.</p>` : ""}
        ${S.mode === "practice" ? `<p class="lesson">${S.scn === "gun" ? (S.stats.tons ? "That's the gun. Torpedoes next: the other practice." : "Lay the gun with the arrows and its range with up and down; <kbd>Space</kbd> fires when the sight reads READY.") : S.stats.hits ? "That's the attack. Escorts next: a convoy action, where they hunt back." : S.stats.fired ? "A miss teaches the angle: shoot from ahead of her and off her track, under 3,000 yards." : "Select a ship with <kbd>T</kbd>, and fire with <kbd>Space</kbd> when the lamp says On target."}</p>` : ""}
        ${S.mode === "practice" ? "" : `<p class="note">Reality ${pct}%.</p>`}</div>
        <div>${S.stats.sunk.length ? `<h3>Sunk</h3>${sunkTable(S.stats.sunk)}` : ""}<h3>The engagement</h3>${tally(S)}</div></div>
        <div class="row end"><button data-act="again" class="primary">${S.mode === "practice" ? "Again" : "Fight it again"}</button><button data-act="actions">${S.mode === "practice" ? "Practice" : "Convoy actions"}</button><button data-act="title">Main menu</button></div>`,
      onClick: b => {
        const a = b.dataset.act;
        if (a === "again") { UI.close(true); S.mode === "practice" ? PP.game.startPractice(S.scn) : PP.game.startAction(S.scn, S.real, PP.game.lastCustom); }
        if (a === "actions") { UI.close(true); S.mode === "practice" ? UI.practice() : UI.actions(); }
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
        <table class="aids">${line("Sound", "Diesels, motors, screws, pings, charges; the theme on the title. <kbd>M</kbd> switches it anywhere.", toggle("mute", !PP.SFX.muted, "Sound"))}</table>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PP.SPEEDS).map(([k, [n]]) => pill(PP.prefs.speed === k, n, "speed:" + k)).join("")}</div>
        <p class="note">Relaxed slows the whole game down, Brisk speeds it up. Time compression works on top of it.</p>
        <h3>This browser</h3>
        <table class="aids">${line("Resume a game", "Leave a mission in the middle and come back to it.", toggle("resume", PP.prefs.resume, "Resume a game"))}</table>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything PumaPack keeps in this browser: the career, the service record, a game in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything PumaPack has saved in this browser: the career, the service record, a game in progress, and your settings? This cannot be undone.", "Forget everything")) PP.forgetEverything();
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
        else if (k === "speed") { PP.prefs.speed = a; PP.savePrefs(); PP.game.applySpeed(); }
        PP.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  /* the angle on the bow, drawn: the target's course, the line of sight to you, the angle between */
  const keys = rows => `<table class="keys">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  UI.helpTabs = () => [
    ["The pack", `<div class="cols"><p><b>The dashboard</b> (<kbd>1</kbd>) is the boat you are aboard, every instrument at once, as the 1990 game had it: the view out in the big window (the periscope at periscope depth, the bridge on the surface), the map in the small one, the telegraph, the compass, the depth, the battery and fuel, the tubes, and the snorkel and the radar warning. Every control is a button, and every button has its key. <b>AUTO</b> hands her to her order while you watch (<kbd>J</kbd>); a touch of the helm or the telegraph takes her back to <b>USER CONTROL</b>.</p>
      <p><b>You lead the Wolf Empire's wolfpack against Pumacity's convoys, from the map</b> (<kbd>2</kbd>). The map (<kbd>1</kbd>) is where the battle is run: every boat of the pack, the convoy as the pack has seen it, the escorts. A click on a boat <b>selects</b> her: the panel on the left shows her class, her captain, her depth and her order, and gives her another.</p>
      <p>Every boat you are not aboard sails under <b>her order</b>: <b>Attack</b> (her captain finds the convoy and goes in), <b>Shadow</b> (keep it in reach, out of its sight, and never fire), <b>Patrol</b> (run her waypoints, then hold), <b>Evade</b>, <b>Drift</b>, <b>Charge</b>, <b>Periscope depth</b> and <b>Hold</b>. <kbd>O</kbd> gives the boat selected the next order; a right click on the map adds a waypoint for her.</p>
      <p><b>Take command</b> of the boat selected with <kbd>Enter</kbd>, or a second click on her; <kbd>N</kbd> takes you straight to the next boat afloat. Aboard her, everything is yours: the helm, the telegraph, the periscope, the torpedoes. Her order waits for you to leave her.</p>
      <p>The pack shares what it sees, and its news comes in its boats' names: who is firing, who is hunted, who is lost. When the boat you are on is lost, command passes to the next; the mission ends when the convoy is gone or the last boat is.</p></div>`],
    ["The PDF", `<div class="cols"><p><b>The other side: the Pumacity Defense Fleet.</b> Choose <b>The PDF</b> on the Missions page and you are aboard one of the escorts bringing Pumacity's shipping through; the Wolf Empire's pack is against you, every boat under her own captain. Keep the convoy, and sink what comes for it.</p>
      <p>Her dashboard has the telegraph (<kbd>W</kbd> <kbd>S</kbd>), the compass and helm (<kbd>A</kbd> <kbd>D</kbd>), the sonar scope with its <b>P / A</b> switch (<kbd>X</kbd>), the charges' depth, the racks and the hedgehog; <kbd>J</kbd> puts her on AUTO, under her order. Her hydrophones hear a boat that runs fast, but not over her own noise above 15 knots: <b>sprint, then slow and listen</b>. <kbd>X</kbd> turns her sonar on: it finds a boat ahead of her, and the boat hears it. Every escort's contact is on the map, a ring where she has it, fading as it ages; the panel gives the freshest, its bearing, range and depth.</p>
      <p>Run in over the contact and <kbd>Space</kbd> lays a <b>pattern</b>: two charges off the throwers and four off the rails along her track, set to the depth on the panel (<kbd>Q</kbd> <kbd>E</kbd> shallower and deeper). Later in the war the <b>hedgehog</b> (<kbd>F</kbd>) throws a ring of bombs ahead of her that go off only on a hull. <kbd>G</kbd> fires her guns at a boat up in sight; she will ram one she runs down.</p>
      <p>On the map a click on another escort selects her, and <kbd>O</kbd> gives her an order: <b>Screen</b> (her station on the convoy), <b>Hunt</b> (the freshest contact anywhere), <b>Patrol</b> (her waypoints, a right click) or <b>Hold</b>. <kbd>Enter</kbd>, a second click, or <kbd>N</kbd> for the next, takes you aboard her.</p></div>`],
    ["The boat", `<div class="cols"><p><b>Sink Pumacity's merchant ships, and live.</b> On the surface the diesels drive her and charge the battery; under the water the battery does everything, and runs down the faster you go.</p>
      <p>The <b>telegraph</b> (<kbd>W</kbd> <kbd>S</kbd>) orders her speed a bell at a time: Back, Stop, 1/3, 2/3, Standard, Full, Flank. The <b>helm</b> (<kbd>A</kbd> <kbd>D</kbd>) orders her course: a tap turns it five degrees, a hold swings it.</p>
      <p>From Year IV her <b>snorkel</b> (<kbd>I</kbd>) runs the diesels at periscope depth: she charges and makes half her surface speed under the water, but she is loud, and the mast can be seen and found by radar. From Year III her <b>Metox</b> lights when an escort's radar sweeps her: dive.</p>
      <p>Periscope depth is ${C.PD} feet (<kbd>P</kbd>); <kbd>Q</kbd> <kbd>E</kbd> take her up and down; <kbd>U</kbd> surfaces; <kbd>C</kbd> crash dives, at full speed. Below the <b>test depth</b> the hull groans; below the <b>crush depth</b> it fails. Damage lowers the crush depth.</p>
      <p>Time compression (<kbd>+</kbd> <kbd>−</kbd>) is held back when ships are near; the clock says why.</p>
      <p>The <b>battery</b> charges only on the surface, and slowly: fastest stopped or at a slow bell, slower as she speeds up, and not at all above ${C.BAT.chargeKn + 4} knots (Full or Flank in a fleet boat). A charge from flat takes most of a night stopped, so charge under time compression. Under the battery bar the boat's panel says when she is charging, or why not.</p></div>`],
    ["The attack", `<div class="cols"><p><b>From the view</b> (<kbd>2</kbd>): the periscope at periscope depth, the bridge and its glasses on the surface. <kbd>T</kbd> selects the ship nearest the crosshair (again, the next); a click on a ship selects her too.</p>
      <p><kbd>Space</kbd> fires at the ship selected, or, with none, at the nearest the pack has in sight within a torpedo's run. The boat's fire control aims it: the panel says <b>On target</b> when the shot will run, <b>Wrong angle</b> when the other tubes must take it (<kbd>F</kbd> forward or after), and <b>Out of range</b> when she must close. It will not waste a torpedo on a shot it cannot make.</p>
      <p>The best shot is from ahead of the target and off its track, under 3,000 yards. A spread (<kbd>V</kbd>) fans the next shots across her, a press of <kbd>Space</kbd> for each.</p>
      <p>Bearings are true, as the crew report them: the ring above the periscope glass reads true. A brass mark on the ring is the ship selected, a hollow amber one the crew's last report; an arrow at the ring's end means it is off to that side.</p></div>`],
    ["Escorts and the war", `<div class="cols"><p><b>Escorts</b> hear you when you are fast and see you when you show. When one has you, go deep (<kbd>E</kbd>), slow (<kbd>S</kbd>) and quiet (<kbd>X</kbd> runs silent), and turn across its line. They give up, in time.</p>
      <p>A <b>noisemaker</b> (<kbd>K</kbd>, under the water) sounds like a boat for five minutes: an escort that hears or pings you near it may take it for you. Each boat carries four.</p>
      <p>Orders go to the other boats by <b>radio</b>. A boat with her radio damaged cannot take a new one, and you will hear nothing from her, until her crew mend it. While they hunt you the key strip turns red, with the keys to get away.</p>
      <p><b>Aircraft</b> come by day near the Empire's islands. When the lookouts call one, dive (<kbd>C</kbd>).</p>
      <p>On the <b>damage report</b> (<kbd>3</kbd>) the boat is cut away: a hatched compartment has a system hurt, amber damaged, red out. Under her, the depth she is at against her test and crush depths; damage to the hull brings the crush depth up. The crew mend one thing at a time, the worst first.</p></div>`],
    ["Keys", keys([["Telegraph", "<kbd>W</kbd> <kbd>S</kbd>, a bell at a time"], ["Helm", "<kbd>A</kbd> <kbd>D</kbd>, a tap five degrees, a hold to swing"], ["Depth", "<kbd>Q</kbd> <kbd>E</kbd> or <kbd>PgUp</kbd> <kbd>PgDn</kbd>; <kbd>P</kbd> periscope depth, <kbd>U</kbd> surface, <kbd>C</kbd> crash dive"],
      ["Screens", "<kbd>1</kbd> the dashboard, <kbd>2</kbd> the map, <kbd>3</kbd> damage, <kbd>4</kbd> status, <kbd>5</kbd> the captain's log; <kbd>Tab</kbd> the next"],
      ["Control", "<kbd>J</kbd> AUTO or USER CONTROL, <kbd>I</kbd> the snorkel"],
      ["Periscope", "<kbd>←</kbd> <kbd>→</kbd> train (held, it gathers speed), <kbd>↑</kbd> <kbd>↓</kbd> raise and lower, <kbd>Z</kbd> high or low power"],
      ["Swing", "<kbd>H</kbd> the periscope, the glasses or the gun onto her: the locked target, else the nearest in sight; <kbd>B</kbd> round to the bow, again to the stern. From another station they take you to the periscope, or the bridge on the surface"],
      ["Bridge", "<kbd>←</kbd> <kbd>→</kbd> look, <kbd>↑</kbd> <kbd>↓</kbd> the glasses, <kbd>G</kbd> man the gun; manned, <kbd>←</kbd> <kbd>→</kbd> lay it and <kbd>↑</kbd> <kbd>↓</kbd> its range"],
      ["Map", "the arrows are the helm and the telegraph; <kbd>Z</kbd> zooms out, the last step the whole sea; a click on a boat selects her, <kbd>O</kbd> her next order, a right click a waypoint for her (<kbd>Shift</kbd>: her first, clearing the rest), <kbd>Enter</kbd> takes command of her"],
      ["Target", "<kbd>T</kbd> selects the ship nearest the crosshair (again: the next ship)"],
      ["Fire", "<kbd>Space</kbd>, a torpedo a press; <kbd>F</kbd> forward or after tubes, <kbd>V</kbd> a spread of one to four"],
      ["Time", "<kbd>+</kbd> <kbd>−</kbd> faster and slower, <kbd>Backspace</kbd> back to 1x"],
      ["Shift", "held: a faster helm and periscope, the gun's range by 500; <kbd>Shift</kbd> <kbd>Z</kbd> zooms the map in"],
      ["Mouse", "a click on a ship selects her, in the view or on the map; on the map a click on a boat selects her, again takes command, and a right click adds her a waypoint; drag the map to look round it"],
      ["The pack", "<kbd>N</kbd> command of the next boat, <kbd>Shift</kbd> <kbd>N</kbd> the one before"],
      ["Other", "<kbd>X</kbd> silent running, <kbd>K</kbd> a noisemaker, <kbd>Y</kbd> radar, <kbd>L</kbd> Classic or Field aids, <kbd>M</kbd> sound, <kbd>?</kbd> these keys, <kbd>Esc</kbd> pause"]]) +
      `<p class="note">The keys are where they sit on a US keyboard; where the browser can tell, each shows the letter on your own.</p>`],
    ["Gamepad", keys([["Sticks", "<kbd>pad:L-stick</kbd> the helm, flicked up or down the telegraph; <kbd>pad:R-stick</kbd> trains the periscope, looks round, lays the gun"],
      ["Buttons", "<kbd>pad:A</kbd> fire, <kbd>pad:B</kbd> periscope up or down, <kbd>pad:X</kbd> select a ship, <kbd>pad:Y</kbd> power, the glasses, the chart's zoom, and at a base tie up"],
      ["D-pad", "<kbd>pad:dU</kbd> <kbd>pad:dD</kbd> depth (the gun's range, when it is manned), <kbd>pad:dL</kbd> the tubes, <kbd>pad:dR</kbd> man the gun"],
      ["Stick clicks", "<kbd>pad:L-click</kbd> crash dive, <kbd>pad:R-click</kbd> up a level: periscope depth, then the surface"],
      ["Shoulders", "<kbd>pad:LB</kbd> <kbd>pad:RB</kbd> screens, <kbd>pad:LT</kbd> <kbd>pad:RT</kbd> time"],
      ["Back, Start", "<kbd>pad:Back</kbd> alone the map, <kbd>pad:Start</kbd> pause and resume"],
      ["Back held", "<kbd>pad:A</kbd> spread, <kbd>pad:B</kbd> silent running, <kbd>pad:X</kbd> the selected boat's next order, <kbd>pad:dU</kbd> the next boat, <kbd>pad:dD</kbd> take command of the selected boat, <kbd>pad:Y</kbd> radar, <kbd>pad:LB</kbd> log, <kbd>pad:RB</kbd> aids, <kbd>pad:LT</kbd> back to 1x, <kbd>pad:R-click</kbd> swing onto her, <kbd>pad:RT</kbd> swing to the bow, again the stern, <kbd>pad:Start</kbd> this help"],
      ["Menus", "the d-pad moves, <kbd>pad:A</kbd> chooses, <kbd>pad:B</kbd> goes back, <kbd>pad:LB</kbd> <kbd>pad:RB</kbd> turn these pages"]]) + `<p class="gk-credit">${CREDIT}</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p>Lead the Wolf Empire's wolfpack against Pumacity's convoys, or sail with the Pumacity Defense Fleet and bring them through, in this homage to NovaLogic's <i>Wolfpack</i> (1990). Command any vessel of your side, give the others their orders, and fight it out from the map. With original graphics and modern conveniences.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
