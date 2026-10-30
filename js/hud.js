/* The Long Convoy -- the HUD: flat dark panels over the station.
 *
 * Across the top, the stations and their keys. Top right, the clock and the
 * date, and the time compression (amber, with the reason, when the
 * situation is holding it back). Bottom left, the boat: depth and the
 * ordered depth, speed and the telegraph, course and the ordered course,
 * the battery, the fuel, every tube's lamp, and what she is doing (silent
 * running, radar, the gun). Bottom right, the TDC: the target, its range,
 * angle on the bow and speed as the computer has them, and the solution
 * lamp. Bottom centre, the crew's reports, over the key strip. Nothing here
 * is told by colour alone. Written to the page only when it has changed. */
"use strict";
(() => {
  const C = PP.C, Sub = PP.Sub, W = PP.Weapons, Sea = PP.Sea, esc = PP.esc;
  const HUD = PP.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };
  HUD.STATIONS = [["dash", "Dashboard", "1"], ["chart", "Map", "2"], ["sonar", "Sonar", "3"], ["damage", "Damage", "4"]];
  const WHY = { ships: "ships near", contact: "a contact", close: "ships close", torps: "torpedoes running", plane: "aircraft", hunted: "hunted", charges: "depth charges", danger: "danger" };

  HUD.build = (side = "pack") => {
    const el = HUD.el = $("hud");
    HUD.side = side;
    const tabs = side === "escorts" ? [["dash", "Dashboard", "1"], ["chart", "Map", "2"], ["sonar", "Sonar", "3"]] : HUD.STATIONS;
    el.innerHTML = `
      <div class="h-labels" aria-hidden="true"></div>
      <nav class="hp" id="h-tabs" aria-label="Stations">${tabs.map(([k, n, key]) => `<button data-st="${k}"><kbd>${key}</kbd>${n}</button>`).join("")}</nav>
      <div class="hp" id="h-clock"><div class="hc-time num">0000</div><div class="hc-date"></div><div class="hc-tc"><span class="why"></span><span class="lbl">Time</span> <b>1x</b></div></div>
      <div class="hp" id="h-boat">
        <div class="hb-who"></div>
        <div class="hb-pack" aria-label="The pack"></div>
        <div class="hb-row" data-r="depth"><span class="lbl">Depth</span><b class="v">0 ft</b><span class="ord"></span></div>
        <div class="hb-row" data-r="speed"><span class="lbl">Speed</span><b class="v">0 kn</b><span class="ord"></span></div>
        <div class="hb-row" data-r="course"><span class="lbl">Course</span><b class="v">000</b><span class="ord"></span></div>
        <div class="hb-row" data-r="bat"><span class="lbl">Battery</span><span class="hb-bar" data-bar="bat">${"<i></i>".repeat(10)}</span><span class="num pc"></span><span class="chg"></span></div>
        <div class="hb-row" data-r="fuel"><span class="lbl">Fuel</span><span class="hb-bar" data-bar="fuel">${"<i></i>".repeat(10)}</span><span class="num pc"></span></div>
        <div class="hb-row" data-r="tubes"><span class="lbl">Tubes</span><span class="hb-tubes"></span><span></span></div>
        <div class="hb-flags"></div>
      </div>
      <div class="hp" id="h-tdc"></div>
      <div class="hp" id="h-hull" hidden></div>
      <div class="hp" id="h-dmg" hidden></div>
      <div class="hp" id="h-port" hidden></div>
      <div class="hp" id="h-orders" hidden></div>
      <div class="h-low"><div class="h-toasts"></div><div class="hp h-hint" hidden></div></div>
      <div class="hp h-end" hidden></div>
      <div class="h-flash"></div>
      <div class="h-dash"></div>
      <div class="h-msgs" aria-hidden="true"></div>
`;
    /* the mouse over a row of the map's list: that vessel on the card at the lower left */
    el.addEventListener("pointerover", ev => { const tr = ev.target.closest && ev.target.closest("#h-orders tr[data-pick]"); HUD.hoverRow = tr ? +tr.dataset.pick : null; });
    el.addEventListener("pointerleave", () => { HUD.hoverRow = null; });
    el.querySelector("#h-tabs").addEventListener("click", ev => { const b = ev.target.closest("[data-st]"); if (b && PP.game.setStation) PP.game.setStation(b.dataset.st); });
    HUD.last = {};
    HUD.built = true;
  };

  /* the vessel of your side the mouse is over: a row of the map's list (HUD.hoverRow), or her name or mark on the map
   * (HUD.hoverMap, main.js); null when none, or she is lost */
  HUD.hoverRow = null; HUD.hoverMap = null;
  HUD.hovered = S => {
    const id = HUD.hoverRow !== null ? HUD.hoverRow : HUD.hoverMap;
    if (id === null || id === undefined || PP.Render.stationOf(S, PP.game.ui) !== "chart") return null;
    const q = S.side === "escorts" ? PP.Escort.mine(S).find(o => o.id === id) : S.subs.find(o => o.id === id);
    return q && !q.lost ? q : null;
  };

  HUD.toast = (text, tone = "", ms = 2800) => {
    const box = HUD.el && HUD.el.querySelector(".h-toasts");
    if (!box) return;
    if (HUD.toasts.some(t => t.text === text && t.until > performance.now())) return;
    const d = document.createElement("div");
    /* the words are plain text; a <kbd>key</kbd> in them is drawn as a key cap, like everywhere else */
    d.className = "hp h-toast " + tone; d.innerHTML = PP.Input.caps(esc(text).replace(/&lt;(\/?)kbd&gt;/g, "<$1kbd>"));
    box.appendChild(d);
    HUD.toasts.push({ text, d, until: performance.now() + ms });
    /* the dashboard's message window keeps the last of them */
    HUD.msgs = (HUD.msgs || []).concat([{ text: d.innerHTML, tone, t: PP.game && PP.game.S ? PP.C.timeStr(PP.game.S.t) : "" }]).slice(-12); HUD.msgsKey = "";
    while (HUD.toasts.length > 2) HUD.toasts.shift().d.remove();
    const live = $(tone === "red" ? "alert" : "live"); if (live) live.textContent = d.textContent;
  };
  HUD.flash = () => { const f = HUD.el && HUD.el.querySelector(".h-flash"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); };
  /* the key strip; tone "danger" when you are hunted, "coach" for the practice's lesson */
  HUD.hint = (html, tone = "") => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; HUD.hintNow = ""; return; } if (HUD.hintNow !== tone + html) { HUD.hintNow = tone + html; h.innerHTML = PP.Input.caps(html); h.className = "hp h-hint" + (tone ? " " + tone : ""); } h.hidden = false; };
  HUD.end = (title, sub, tone) => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>`; e.hidden = false; };
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; if (HUD.el) { HUD.end(null); HUD.hint(null); HUD.clearLabels(); } HUD.last = {}; };

  /* the station's live readings, set in the HUD's own type over the canvas where the station puts them
   * (PP.Render.labels: canvas pixels, an anchor, a tone); painted legends stay on the canvas */
  const labs = new Map();
  const ANCHOR = { l: "0", c: "-50%", r: "-100%", t: "0", m: "-50%", b: "-100%" };
  function labels(list) {
    const box = HUD.el.querySelector(".h-labels"), cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, seen = new Set();
    /* the dashboard's readings grow with the canvas, as its buttons do (drawn for two screen pixels to one) */
    const dk = PP.clamp(k / 2, 0.8, 2).toFixed(2); if (box.style.getPropertyValue("--dk") !== dk) box.style.setProperty("--dk", dk);
    for (const L of list) {
      let n = labs.get(L.id);
      if (!n) { n = document.createElement("div"); box.appendChild(n); labs.set(L.id, n); }
      seen.add(L.id);
      if (n.dataset.h !== L.html) { n.dataset.h = L.html; n.innerHTML = PP.Input.caps(L.html); }
      const cls = "hl " + (L.cls || ""); if (n.className !== cls) n.className = cls;
      const a = L.at || "cm", tr = `translate(${Math.round(L.x * k)}px,${Math.round(L.y * k)}px) translate(${ANCHOR[a[0]]},${ANCHOR[a[1]]})`;
      if (n.style.transform !== tr) n.style.transform = tr;
    }
    for (const [id, n] of labs) if (!seen.has(id)) { n.remove(); labs.delete(id); }
  }
  HUD.clearLabels = () => { for (const n of labs.values()) n.remove(); labs.clear(); for (const n of dbs.values()) n.remove(); dbs.clear(); HUD.msgs = []; HUD.msgsKey = ""; };
  /* the pause and sound buttons: on the dashboard, in the top right of the view, over its sky and clear of
   * the bearing tape and the small map; on the other screens, just left of the clock (in the top right where
   * there is none), so they never lie over a screen's own words; below 960 pixels, where the stylesheet puts them */
  function corner(L) {
    const n = $("corner"), cv = $("screen");
    let top = "", right = "";
    if (L) { const r = cv.getBoundingClientRect(), k = r.width / cv.width || 1; top = Math.round(r.top + (L.view.y + 4) * k) + "px"; right = Math.round(innerWidth - r.left - (L.view.x + L.view.w - 4) * k) + "px"; }
    else if (innerWidth >= 960) {
      const ck = HUD.el.querySelector("#h-clock"), c = ck && !ck.hidden ? ck.getBoundingClientRect() : null;
      top = "12px"; right = c && c.width ? Math.round(innerWidth - c.left + 8) : 16;
      /* a long date widens the clock: crowded against the stations, they go to the top left instead */
      const tb = HUD.el.querySelector("#h-tabs").getBoundingClientRect();
      if (tb.width && innerWidth - right - n.offsetWidth < tb.right + 8) { if (n.style.left !== "16px") { n.style.left = "16px"; n.style.right = "auto"; n.style.top = top; } return; }
      right += "px";
    }
    if (n.style.top !== top || n.style.right !== right) { n.style.top = top; n.style.right = right; n.style.left = L ? "auto" : ""; }
  }

  /* a slider's value where the pointer is along it (y0 to y1 its length, in the canvas's pixels, 0 to max),
   * sent as "<act>:<value>" when it moves to another step */
  function slideTo(n, ev) {
    const b = n._b, s = b.slide, r = n.getBoundingClientRect(), k = r.height / b.h || 1;
    const f = (ev.clientY - r.top - (s.y0 - b.y) * k) / ((s.y1 - s.y0) * k);
    const v = PP.clamp(Math.round(f * s.max / s.step) * s.step, s.lo, s.max);
    if (v !== n._last && v !== s.v && PP.game.dashAct) { n._last = v; PP.game.dashAct(s.act + ":" + v); }
  }

  /* the dashboard's buttons, set over the canvas where the dashboard puts them; a held one holds its key */
  const dbs = new Map();
  function dashButtons(list) {
    const box = HUD.el.querySelector(".h-dash"), cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, seen = new Set();
    for (const B of list) {
      let n = dbs.get(B.id);
      if (!n) {
        n = document.createElement("button"); n.type = "button"; box.appendChild(n); dbs.set(B.id, n);
        n.addEventListener("pointerdown", ev => { const b = n._b; if (!b || b.dim) return; if (b.hold) { PP.Input.held.add(b.hold); PP.Input.heldT[b.hold] = performance.now() - 300; } ev.preventDefault(); });
        const up = () => { const b = n._b; if (b && b.hold) { PP.Input.held.delete(b.hold); delete PP.Input.heldT[b.hold]; } };
        n.addEventListener("pointerup", up); n.addEventListener("pointerleave", up);
        n.addEventListener("click", ev => {
          const b = n._b; if (!b || !b.act || b.dim || !PP.game.dashAct) return;
          /* a dial's rim: where on it, as a bearing in degrees from its top, clockwise; the middle is not the rim's */
          if (b.rim) {
            const q = n.getBoundingClientRect(), dx = ev.clientX - (q.left + q.width / 2), dy = ev.clientY - (q.top + q.height / 2);
            if (Math.hypot(dx, dy) < q.width / 2 * b.rim.inner) return;
            PP.game.dashAct(`${b.act}:${Math.round((Math.atan2(dx, -dy) / PP.DEG + 360) % 360)}`);
            return;
          }
          PP.game.dashAct(b.act);
        });
        /* a slider follows the pointer while it is held */
        n.addEventListener("pointerdown", ev => { if (n._b && n._b.slide) { n._last = null; n.setPointerCapture(ev.pointerId); slideTo(n, ev); } });
        n.addEventListener("pointermove", ev => { if (n._b && n._b.slide && n.hasPointerCapture(ev.pointerId)) slideTo(n, ev); });
        /* a focused slider takes the arrows (up is shallower, toward the surface), Page Up / Down and Home / End */
        n.addEventListener("keydown", ev => {
          const s = n._b && n._b.slide; if (!s) return;
          const d = { ArrowUp: -s.step, ArrowLeft: -s.step, ArrowDown: s.step, ArrowRight: s.step, PageUp: -4 * s.step, PageDown: 4 * s.step, Home: -s.max, End: s.max }[ev.key];
          if (d === undefined) return;
          ev.preventDefault(); ev.stopPropagation();
          const v = PP.clamp(s.v + d, s.lo, s.max); if (v !== s.v && PP.game.dashAct) PP.game.dashAct(s.act + ":" + v);
        });
      }
      n._b = B; seen.add(B.id);
      if (n.dataset.h !== B.html) { n.dataset.h = B.html; n.innerHTML = PP.Input.caps(B.html); }
      const cls = "db" + (B.on ? " on" : "") + (B.dim ? " dim" : "") + (B.cls ? " " + B.cls : "");
      if (n.className !== cls) n.className = cls;
      /* its tip (HUD.tip shows it, themed; a screen reader hears it as the description) */
      if ((B.title || "") !== (n.dataset.tip || "")) {
        if (B.title) { n.dataset.tip = B.title; n.setAttribute("aria-description", B.title); } else { delete n.dataset.tip; n.removeAttribute("aria-description"); }
        HUD.tipChanged(n);
      }
      /* its name when its face is a glyph or a number; pressed only for a switch (one that has an on); a dimmed one
       * out of the tab order; a slider as a slider */
      if (B.label) { if (n.getAttribute("aria-label") !== B.label) n.setAttribute("aria-label", B.label); } else n.removeAttribute("aria-label");
      if (B.on !== undefined) n.setAttribute("aria-pressed", String(!!B.on)); else n.removeAttribute("aria-pressed");
      if (B.rim) n.tabIndex = -1;
      else if (B.dim) { n.setAttribute("aria-disabled", "true"); n.tabIndex = -1; } else if (n.hasAttribute("aria-disabled")) { n.removeAttribute("aria-disabled"); n.tabIndex = 0; }
      if (B.slide) {
        const s = B.slide;
        n.setAttribute("role", "slider"); n.setAttribute("aria-orientation", "vertical");
        n.setAttribute("aria-valuemin", s.lo); n.setAttribute("aria-valuemax", s.max); n.setAttribute("aria-valuenow", s.v); n.setAttribute("aria-valuetext", s.text || s.v + " feet");
      }
      const css = `left:${Math.round(B.x * k)}px;top:${Math.round(B.y * k)}px;width:${Math.round(B.w * k)}px;height:${Math.round(B.h * k)}px;font-size:${Math.max(10, Math.round(Math.min(B.h * k * 0.62, 6.2 * k)))}px` +
        (B.fill !== undefined ? `;--fill:${B.fill.toFixed(2)}` : "");
      if (n.dataset.css !== css) { n.dataset.css = css; n.style.cssText = css; }
    }
    for (const [id, n] of dbs) if (!seen.has(id)) { n.remove(); dbs.delete(id); }
  }
  /* the message window: the last few reports, newest at the foot */
  function msgWindow(r) {
    const box = HUD.el.querySelector(".h-msgs"), cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1;
    const css = `left:${Math.round(r.x * k)}px;top:${Math.round(r.y * k)}px;width:${Math.round(r.w * k)}px;height:${Math.round(r.h * k)}px`;
    if (box.dataset.css !== css) { box.dataset.css = css; box.style.cssText = css; }
    const key = (HUD.msgs || []).length + ":" + ((HUD.msgs || []).slice(-1)[0] || {}).text;
    if (HUD.msgsKey !== key) { HUD.msgsKey = key; box.innerHTML = (HUD.msgs || []).slice(-8).map(m => `<p class="${m.tone || ""}"><span class="t">${m.t}</span> ${m.text}</p>`).join(""); box.scrollTop = box.scrollHeight; }
  }

  /* the part of the play screen no panel covers, in the canvas's pixels: the stations lay out inside it.
   * t and b, the strip of stations and the key strip; tr, the foot of the clock and the buttons up on the
   * right; br, the head of the TDC down on the right (the canvas's height when it is not showing) */
  function safe() {
    const cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, R = PP.Render;
    const tabs = HUD.el.querySelector("#h-tabs").getBoundingClientRect(), hint = HUD.el.querySelector(".h-hint");
    const top = Math.ceil(tabs.bottom / k) + 2;
    let bot = 10;
    if (hint && !hint.hidden) { const r = hint.getBoundingClientRect(); if (r.height) bot = Math.ceil((innerHeight - r.top) / k) + 2; }
    const corner = $("corner").getBoundingClientRect(), tdc = HUD.el.querySelector("#h-tdc");
    const tr = Math.ceil(Math.max(HUD.el.querySelector("#h-clock").getBoundingClientRect().bottom, corner.bottom) / k) + 2;
    const br = tdc.hidden || !tdc.offsetParent ? cv.height : Math.floor(tdc.getBoundingClientRect().top / k) - 2;
    R.safe = { t: top, b: bot, tr, br };
  }
  /* what the station shows, in words, for a screen reader */
  function describe(S, ui, st) {
    if (S.side === "escorts") {
      const f = PP.Escort.flag(S); if (!f) return;
      const sol = PP.Escort.solution(S, f), c = sol.contact, P = C.ESC_PATTERNS[f.patK || 0];
      const t = `Aboard ${f.name}: ${Math.abs(f.spd).toFixed(0)} knots, heading ${PP.deg3(f.hdg)}, ${C.ESC_BELLS[f.bell]}. ` +
        `${sol.hh ? `Hedgehog chosen, ${f.hhLeft || 0} left` : `${P.name} pattern, ${sol.ready} of ${sol.need} loaded, ${f.dcLeft} charges aboard`}, set ${f.dcSet} feet. ` +
        (c ? `Contact bearing ${PP.deg3(c.brg)}, ${Math.round(c.rng / 50) * 50} yards, ${c.surf ? "on the surface" : "about " + Math.round(c.dz / 25) * 25 + " feet"}: ${c.over ? (sol.hh ? "in range" : "over the contact") : c.near ? "stand by" : "run in"}.` : "No contact.");
      if (HUD.desc !== t) { HUD.desc = t; $("screen").setAttribute("aria-label", "The Long Convoy: " + t); }
      return;
    }
    const s = S.sub, n = S.ships.filter(q => PP.Detect.known(S, q) && PP.Ships.alive(q)).length;
    const what = { scope: `Periscope, ${s.scope.up && s.scope.h >= 1 ? "up, bearing " + PP.deg3(s.hdg + s.scope.brg) + (s.scope.hi ? ", high power" : ", low power") : "down"}`, bridge: `Bridge, looking ${PP.deg3(ui.look)}`,
      panel: "Instruments", chart: "Chart", damage: `Damage report: hull ${Math.round(s.hull * 100)}%, ${Sub.SYS.filter(([k2]) => s.sys[k2] > 0.001).map(([, nm]) => nm.toLowerCase()).join(", ") || "nothing damaged"}` }[st] || st;
    const t = `${what}. ${n ? n + " ship" + (n > 1 ? "s" : "") + " in sight." : "No ships in sight."}`;
    if (HUD.desc !== t) { HUD.desc = t; $("screen").setAttribute("aria-label", "The Long Convoy: " + t); }
  }

  /* the stations' strip and the clock, either side, on every screen that shows them (the Sonar screen too) */
  function stations(S, st) {
    const el = HUD.el;
    set(el.querySelector("#h-tabs"), "tabs", st, e => { for (const b of e.querySelectorAll("button")) b.setAttribute("aria-current", String(b.dataset.st === st)); });
    set(el.querySelector(".hc-time"), "time", C.timeStr(S.t), (e, v) => { e.textContent = v; });
    set(el.querySelector(".hc-date"), "date", C.dateStr(S.t) + (S.wx ? " · " + C.WX[S.wx.k].name : ""), (e, v) => { e.textContent = v; });
    const tcReq = C.TC[S.tcReq], tcNow = PP.Engine.tcNow(S), held = tcNow < tcReq;
    set(el.querySelector(".hc-tc"), "tc", `${tcNow}:${tcReq}:${held ? S.tcWhy : ""}`, e => { e.classList.toggle("held", held); e.querySelector("b").textContent = tcNow + "x"; e.querySelector(".why").textContent = held ? `${WHY[S.tcWhy] || "held back"}, not ${tcReq}x` : ""; });
  }

  /* ---- the escorts' side: the escort you are aboard, her contact, and the map's orders for the others ---- */
  function drawEsc(S, ui, st) {
    const el = HUD.el, f = PP.Escort.flag(S); if (!f) return;
    const k = C.SHIPS[f.cls], X = C.ESC_SIDE;
    /* her panel */
    const mine = PP.Escort.mine(S), hh = C.monthOf(S.t) >= X.hedgehogFrom;
    /* the card at the lower left: the escort the mouse is over (in the map's list, or her name on the map), else yours */
    const b = HUD.hovered(S) || f;
    const key = [ui.sel, b.id, b === f, b.ord, b.spd.toFixed(1), b.bell, PP.deg3(b.hdg), PP.deg3(b.ordHdg), b.dcSet, b.dcLeft, b.hhLeft, b.ping, !!b.pat, Math.round(b.dmg * 20), PP.Input.device].join(":");
    set(el.querySelector("#h-boat"), "escBoat", key, x => {
      const kb = C.SHIPS[b.cls], hull = Math.max(0, 1 - b.dmg / kb.hp);
      x.innerHTML = PP.Input.caps(`<div class="hb-who"><b>${esc(b.name)}</b> <span class="c">${esc(kb.name)}</span> <i>${b === f ? "aboard" : (C.ESC_ORDERS.find(o => o[0] === b.ord) || C.ESC_ORDERS[0])[1]}</i></div>
        <div class="hb-row"><span class="lbl">Speed</span><b class="v">${b.spd.toFixed(1)} kn</b><span class="ord">${C.ESC_BELLS[b.bell] || ""}</span></div>
        <div class="hb-row"><span class="lbl">Course</span><b class="v">${PP.deg3(b.hdg)}</b><span class="ord">${Math.abs(PP.angDiff(b.hdg, b.ordHdg)) > 0.02 ? PP.deg3(b.ordHdg) : ""}</span></div>
        <div class="hb-row"><span class="lbl">Charges</span><b class="v">${b.dcLeft === undefined ? X.charges : b.dcLeft}</b><span class="ord">${b.pat ? "laying" : b.dcSet ? "set " + b.dcSet + " ft" : ""}</span></div>
        ${hh ? `<div class="hb-row"><span class="lbl">Hedgehog</span><b class="v">${b.hhLeft === undefined ? X.hedgehogs : b.hhLeft}</b><span></span></div>` : ""}
        <div class="hb-row${hull < 0.5 ? " crit" : hull < 0.8 ? " warn" : ""}"><span class="lbl">Hull</span><b class="v">${Math.round(hull * 100)}%</b><span></span></div>
        <div class="hb-flags">${b.ping ? '<span class="on">Sonar pinging</span>' : '<span>Sonar listening</span>'}${b.spd > C.DET.hydFastKn ? '<span title="Above 15 knots the ship&rsquo;s own noise deafens its hydrophones">Too fast to hear</span>' : ""}</div>`);
    });
    /* the freshest contact any escort has, from her */
    const sol = PP.Escort.solution(S, f), c = sol.contact;
    let ct = `<div class="ht-name">Contacts</div><p class="ht-none">None. Sprint, then slow under 15 knots and listen; <kbd>X</kbd> pings with the sonar, which they hear too.</p>`;
    if (c) {
      ct = `<div class="ht-name">${c.how === "sonar" ? "Sonar contact" : c.how === "ear" ? "Heard" : "Sighted"}</div><div class="ht-cls">${c.by === f ? "Yours" : "From " + esc(c.by.name)}, ${c.age < 60 ? "now" : Math.round(c.age / 60) + " min ago"}</div>
        <div class="ht-grid"><span class="lbl">Bearing</span><b>${PP.deg3(c.brg)}</b><span class="lbl">Range</span><b>${PP.num(Math.round(c.rng / 50) * 50)}</b>
        <span class="lbl">Depth, about</span><b>${c.surf ? "surface" : Math.round(c.dz / 25) * 25 + " ft"}</b><span class="lbl">Charges</span><b>${f.dcSet} ft</b></div>
        <div class="ht-sol ${c.over ? "ok" : "no"}"><span class="ht-lamp"></span><span>${c.over ? `Over the contact: <kbd>Space</kbd> ${sol.hh ? "the hedgehog" : "a pattern"}` : c.near ? "Stand by: hold steady" : "Run in on the contact"}</span></div>`;
    }
    set(el.querySelector("#h-tdc"), "tdc", ct + PP.Input.device, x => { x.innerHTML = PP.Input.caps(ct); });
    /* the map's panel: the escort group, a row each (an order in it a click to change) */
    const onMap = st === "chart", fleetE = onMap ? PP.Dash.fleetHTML(S) : "";
    set(el.querySelector("#h-orders"), "orders", onMap ? fleetE + PP.Input.device : "", x => {
      x.hidden = !onMap; if (!onMap) return;
      x.innerHTML = PP.Input.caps(`<div class="ht-name">The escort group</div>${fleetE}`);
    });
    el.querySelector("#h-hull").hidden = true; el.querySelector("#h-dmg").hidden = true; el.querySelector("#h-port").hidden = true;
  }

  /* ---- the damage report's panels: the hull and the water on the left, the repairs on the right ---- */
  const segs = (v, cls) => `<span class="hb-bar${cls}">${Array.from({ length: 10 }, (_, i) => `<i${i < Math.ceil(v * 10) ? ' class="on"' : ""}></i>`).join("")}</span>`;
  const mins = sec => sec < 90 ? "a minute" : Math.round(sec / 60) + " min";
  function damage(S) {
    const s = S.sub, crush = Sub.crushDepth(s), test = Sub.testDepth(s), k = C.SUBS[s.cls];
    const hull = `<div class="ht-name">The boat</div>
      <div class="hb-row${s.hull < 0.5 ? " crit" : s.hull < 0.8 ? " warn" : ""}"><span class="lbl">Hull</span>${segs(s.hull, s.hull < 0.5 ? " crit" : s.hull < 0.8 ? " warn" : "")}<span class="num pc">${Math.round(s.hull * 100)}%</span></div>
      <div class="hb-row${s.water > 0.25 ? " crit" : s.water > 0.05 ? " warn" : ""}"><span class="lbl">Water</span>${segs(s.water, s.water > 0.25 ? " crit" : " warn")}<span class="num pc">${Math.round(s.water * 100)}%</span></div>
      <div class="hb-row"><span class="lbl">Pumps</span><b class="v sm">${s.silent ? "Stopped: silent running" : s.sys.pumps > 0.5 ? "Failing" : s.sys.pumps > 0.001 ? "Damaged" : "Running"}</b><span></span></div>
      <div class="hb-row${s.depth > test ? " crit" : ""}"><span class="lbl">Crush</span><b class="v">${Math.round(crush)} ft</b><span class="ord dim">${crush < k.crush - 1 ? `was ${k.crush}` : `test ${test}`}</span></div>`;
    set(el0("#h-hull"), "hull", hull, (x, v) => { x.innerHTML = v; });
    const hurt = Sub.SYS.filter(([q]) => s.sys[q] > 0.001).sort((a, b) => (b[0] === s.fixing) - (a[0] === s.fixing) || s.sys[b[0]] - s.sys[a[0]]);
    const rows = hurt.map(([q, name, T]) => {
      const v = s.sys[q], port = Sub.portOnly(S, q), st = port ? "a yard's work" : s.fixing === q ? `repairing, ${mins(v * T)}` : "waiting its turn";
      return `<li class="${v >= 0.5 ? "out" : "hurt"}${s.fixing === q ? " fix" : ""}"><span class="nm">${esc(name)}</span><span class="st">${v >= 0.5 ? "Out" : "Damaged"} · ${st}</span><span class="rb"><i style="width:${Math.round((1 - v) * 100)}%"></i></span></li>`;
    }).join("");
    const fixHull = s.fixing === "hull" ? `<p class="ht-eye">The crew are patching the hull.</p>` : "";
    const list = `<div class="ht-name">Repairs</div>${hurt.length ? `<ul class="hd-list">${rows}</ul>` : `<p class="ht-none">Every system sound.</p>`}${fixHull}`;
    set(el0("#h-dmg"), "dmgList", list, (x, v) => { x.innerHTML = v; });
  }
  const el0 = q => HUD.el.querySelector(q);

  /* ---- every frame ---- */
  HUD.draw = (S, ui) => {
    const side = S.side === "escorts" ? "escorts" : "pack";
    if (!HUD.built || HUD.side !== side) HUD.build(side);
    const el = HUD.el, s = S.sub, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    const st = PP.Render.stationOf(S, ui);
    /* the instruments show the boat on their own gauges (the TDC stays); the damage report has its own two
     * panels; the gun has its own sight */
    const gunNow = st === "bridge" && s.gun.on, dmg = st === "damage";
    set(el, "onPanel", `${st}:${gunNow}`, e => { e.querySelector("#h-boat").hidden = st === "panel" || dmg; e.querySelector("#h-tdc").hidden = dmg || gunNow; e.querySelector("#h-hull").hidden = !dmg; e.querySelector("#h-dmg").hidden = !dmg; });
    if (now - (HUD.safeAt || 0) > 250) { HUD.safeAt = now; safe(); describe(S, ui, st); }
    labels(PP.Render.labels || []);
    /* the dashboard, and the Sonar screen (js/art/sonar.js): their own buttons; the old panels stand down */
    const dashOn = st === "dash", sonarOn = st === "sonar";
    set(el, "dashMode", st, e => { e.classList.toggle("dashmode", dashOn); e.classList.toggle("statusmode", sonarOn); });
    dashButtons((dashOn || sonarOn) && PP.Render.dash ? PP.Render.dash.buttons || [] : []);
    if (dashOn && PP.Render.dash && PP.Render.dash.msg) msgWindow(PP.Render.dash.msg);
    corner(dashOn && PP.Render.dash && PP.Render.dash.L);
    stations(S, st);
    if (dashOn || sonarOn) return;
    if (dmg) damage(S);
    if (side === "escorts") { drawEsc(S, ui, st); return; }
    /* the card at the lower left: the boat the mouse is over (in the map's list, or her name on the map), else the one
     * you are aboard; her name and what she is to you at its head */
    const b = HUD.hovered(S) || s;
    set(el.querySelector(".hb-who"), "who", `${b.id}:${b === s}:${b.id === ui.sel}:${b.orders}:${b.lost}`, e => {
      e.innerHTML = `<b>${esc(b.name)}</b> <span class="c">${esc(C.SUBS[b.cls].name)} · Captain ${esc(b.capt || "")}</span> <i>${b === s ? "aboard" : b.lost ? "lost" : PP.Orders.name(b.orders)}</i>`;
    });
    const packKey = S.subs.map(q => `${q.id}${q === s ? "*" : ""}${q.lost ? "x" : Sub.surfaced(q) ? "s" : "d"}${q.orders || ""}`).join(",") + PP.Input.device + ":" + ui.sel;
    set(el.querySelector(".hb-pack"), "pack", packKey, e => {
      e.hidden = true;
      /* each boat a button: a click selects her (for her orders on the map), a second takes command */
      e.innerHTML = S.subs.map(q => `<button type="button" data-pick="${q.id}" class="pk${q === s ? " on" : ""}${q.lost ? " lost" : ""}${q.id === ui.sel && q !== s ? " sel" : ""}"${q.lost ? " disabled" : ""} title="${esc(q.name)}: ${q.lost ? "lost" : (Sub.surfaced(q) ? "surfaced" : "submerged") + (q === s ? ", in command" : ", " + PP.Orders.name(q.orders).toLowerCase() + ". Click to select her; again to take command")}">${esc(q.name)}${q !== s && !q.lost ? ` <i>${esc(PP.Orders.name(q.orders).toLowerCase())}</i>` : ""}</button>`).join("")
        + (S.subs.length > 1 ? `<span class="pk-key">${PP.Input.cap("N")} next</span>` : "");
    });
    /* the boat */
    const row = r => el.querySelector(`[data-r="${r}"]`);
    const test = Sub.testDepth(b);
    set(row("depth"), "depth", `${Math.round(b.depth)}:${b.ordDepth}:${b.depth > test ? 2 : b.depth > test * 0.85 ? 1 : 0}`, e => {
      e.querySelector(".v").textContent = Sub.surfaced(b) ? "Surfaced" : Math.round(b.depth) + " ft";
      e.querySelector(".ord").textContent = Math.abs(b.ordDepth - b.depth) > 3 ? (b.ordDepth === 0 ? "surface" : b.ordDepth + " ft") : "";
      e.className = "hb-row" + (b.depth > test ? " crit" : b.depth > test * 0.85 ? " warn" : "");
    });
    set(row("speed"), "speed", `${b.spd.toFixed(1)}:${b.bell}:${b.silent}`, e => { e.querySelector(".v").textContent = b.spd.toFixed(1) + " kn"; e.querySelector(".ord").textContent = b.silent ? C.BELLS[b.bell] + ", silent" : C.BELLS[b.bell]; });
    set(row("course"), "course", `${PP.deg3(b.hdg)}:${PP.deg3(b.ordHdg)}`, e => { e.querySelector(".v").textContent = PP.deg3(b.hdg); e.querySelector(".ord").textContent = Math.abs(PP.angDiff(b.hdg, b.ordHdg)) > 0.02 ? PP.deg3(b.ordHdg) : ""; });
    const bar = (r, v, cap) => set(row(r), r, Math.round(v * 100) + ":" + Math.round(cap * 10), e => {
      const n = Math.ceil(v * 10), b = e.querySelector(".hb-bar");
      b.className = "hb-bar" + (v < 0.12 ? " crit" : v < 0.3 ? " warn" : "");
      [...b.children].forEach((i, k) => i.classList.toggle("on", k < n));
      e.querySelector(".pc").textContent = Math.round(v * 100) + "%";
    });
    bar("bat", b.bat, Sub.batCap(b)); bar("fuel", b.fuel, 1);
    /* under the battery, on the surface: charging (and when she will be full), or why not */
    const ch = Sub.charge(b), cap = Sub.batCap(b), left = ch.rate > 0 ? (cap - b.bat) / ch.rate : 0;
    /* a cap the crew's repairs lift a hair at a time reads as full, not as "full in 1 min" for good */
    if (ch.rate > 0 && cap - b.bat < 0.005) ch.why = cap < 0.995 ? "cap" : "full";
    const chg = ch.why === null ? ["green", "Charging · full in " + (left < 3600 ? Math.max(1, Math.ceil(left / 60)) + " min" : Math.round(left / 3600) + " h")]
      : { fast: ["amber", "Too fast to charge"], fuel: ["amber", "No fuel to charge"], engines: ["amber", "Diesels damaged: no charge"], full: ["", "Full"], cap: ["amber", `Damaged: holds ${Math.round(cap * 100)}%`] }[ch.why] || ["", ""];
    set(row("bat").querySelector(".chg"), "chg", chg.join(":"), e => { e.className = "chg " + chg[0]; e.textContent = chg[1]; });
    const tubesKey = b.tubes.F.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + b.tubes.A.map(v => v > 0 ? Math.ceil(v / 60) : v).join(",") + "|" + b.bank + b.store.F + "." + b.store.A + b.spread;
    set(row("tubes"), "tubes", tubesKey, e => {
      const lamp = v => `<i class="${v === 0 ? "on" : v > 0 ? "load" : "out"}"${v > 0 ? ` style="--p:${Math.round((1 - v / C.TORP.reload) * 100)}%"` : ""}></i>`;
      /* each bank's lamps, and its spares after them, as the instruments show them */
      e.querySelector(".hb-tubes").innerHTML = `<span class="bk${b.bank === "F" ? " sel" : ""}">F</span>${b.tubes.F.map(lamp).join("")}<span class="sp" title="spare torpedoes forward">${b.store.F}</span><span class="gap"></span><span class="bk${b.bank === "A" ? " sel" : ""}">A</span>${b.tubes.A.map(lamp).join("")}<span class="sp" title="spare torpedoes aft">${b.store.A}</span>`;
      e.querySelector(".hb-tubes").setAttribute("aria-label", `${Sub.loaded(s, "F")} forward and ${Sub.loaded(s, "A")} after tubes loaded, ${b.store.F + b.store.A} reloads`);
    });
    const hunted = S.ships.some(q => q.role === "escort" && !q.sinking && q.ai.contact && q.ai.tgt === b.id && S.t - q.ai.contact < 60);
    const flags = (hunted ? ['<span class="hunt">Hunted</span>'] : []).concat([[b.silent, "Silent"], [Sub.radarWorks(b), "Radar"], [b.gun.on, "Gun"], [b.scope.up, "Scope up"], [b === s && S.konami, "Code"]].filter(f => f[0]).map(f => `<span class="on">${f[1]}</span>`))
      .concat([`<span title="Noisemakers: K drops one under the water">Decoys ${b.decoys || 0}</span>`]).concat(b.sys.radio >= 0.5 ? ['<span class="bad">Radio out</span>'] : [])
      .concat(b.water > 0.2 ? ['<span class="bad">Flooding</span>'] : []).concat(b.bottomed ? ['<span class="on">On the bottom</span>'] : []).concat(b.spread > 1 ? [`<span title="Each press of fire sends the next torpedo of the fan">Spread of ${b.spread}</span>`] : []);
    set(el.querySelector(".hb-flags"), "flags", flags.join(""), (e, v) => { e.innerHTML = v; });
    /* the TDC */
    const e = W.est(S), t = S.tdc.tgt !== null ? PP.Ships.byId(S, S.tdc.tgt) : null;
    let tdc = "";
    if (e) {
      const sol = W.solve(S, e, s.bank), ok = sol && sol.ok;
      tdc = `<div class="ht-name">${t ? esc(t.name) : "Last known"}</div><div class="ht-cls">${t ? esc(C.SHIPS[t.cls].name) + (PP.Detect.known(S, t) ? "" : ", not in sight") : "the target is lost"}</div>
        <div class="ht-grid"><span class="lbl">Bearing</span><b>${PP.deg3(e.brg)}</b><span class="lbl">Range</span><b>${PP.num(Math.round(e.rng / 10) * 10)}</b>
        <span class="lbl">Target speed</span><b>${e.s.toFixed(1)} kn</b><span class="lbl" title="How far the torpedo runs to meet the target, in yards">Torpedo run</span><b>${ok ? PP.num(Math.round(sol.run / 10) * 10) : "--"}</b></div>
        <div class="ht-sol ${ok ? "ok" : "no"}"><span class="ht-lamp"></span><span>${ok ? "On target: fire " + (s.bank === "F" ? "forward" : "aft") : sol ? { gyro: `Wrong angle: fire the ${s.bank === "F" ? "after" : "forward"} tubes`, range: "Out of range", speed: "No shot" }[sol.why] || "No shot" : "No shot"}</span></div>`;
    } else tdc = `<div class="ht-name">Target</div><p class="ht-none">None selected. ${PP.Input.device === "pad" ? "<kbd>pad:X</kbd>" : "<kbd>T</kbd>"} selects the nearest ship in sight; ${PP.Input.device === "pad" ? "<kbd>pad:A</kbd>" : "<kbd>Space</kbd>"} fires at the nearest in range.</p>`;
    set(el.querySelector("#h-tdc"), "tdc", tdc, (x, v) => { x.innerHTML = PP.Input.caps(v); });
    /* nothing to aim at, nothing in sight: the TDC stands down, off the map, rather than a ghost of itself over it */
    const idle = !e && !S.ships.some(q => PP.Detect.known(S, q) && PP.Ships.alive(q));
    set(el.querySelector("#h-tdc"), "tdcIdle", idle, (x, v) => x.classList.toggle("idle", v));
    /* the map's panel: the pack, a row a boat (an order in it a click to change) */
    const onMap = st === "chart", fleetP = onMap ? PP.Dash.fleetHTML(S) : "";
    set(el.querySelector("#h-orders"), "orders", onMap ? fleetP + PP.Input.device : "", x => {
      x.hidden = !onMap; if (!onMap) return;
      x.innerHTML = PP.Input.caps(`<div class="ht-name">The pack</div>${fleetP}`);
    });
  };

  /* ---- the hover tips: what a control or a flag is for, on a small panel in the red light under it, not in the
   * browser's grey box. A title anywhere in the game is taken into data-tip (and aria-description, so a screen
   * reader still hears it) the first time it is pointed at or focused, which keeps the browser's own tip away; a
   * pointer that rests shows it, keyboard focus shows it at once, a press, Esc or scrolling puts it away. The
   * shared boot screen keeps its own. ---- */
  const tip = document.createElement("div");
  tip.id = "tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
  document.body.appendChild(tip);
  let tipOn = null, tipT = 0;
  const take = el => {
    const t = el.getAttribute("title");
    if (t !== null) { el.removeAttribute("title"); if (t) { el.dataset.tip = t; el.setAttribute("aria-description", t); } }
    return el.dataset.tip || "";
  };
  const tipOf = n => { const el = n && n.closest ? n.closest("[title],[data-tip]") : null; return el && !el.closest(".gk-boot") ? el : null; };
  const hideTip = () => { clearTimeout(tipT); tipT = 0; tipOn = null; tip.classList.remove("on"); tip.hidden = true; };
  const showTip = el => {
    const t = take(el); if (!t || !el.isConnected) return;
    tipOn = el; tip.textContent = t; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let y = r.bottom + 8; if (y + h > innerHeight - 8) y = r.top - h - 8;
    const x = PP.clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, innerWidth - w - 8));
    tip.style.transform = `translate(${Math.round(x)}px,${Math.round(Math.max(8, y))}px)`;
    tip.classList.add("on");
  };
  HUD.tipChanged = el => { if (el === tipOn) { if (el.dataset.tip) showTip(el); else hideTip(); } };
  document.addEventListener("pointerover", ev => {
    const el = tipOf(ev.target); if (el === tipOn && el) return;
    hideTip(); if (!el) return;
    take(el); tipOn = el; tipT = setTimeout(() => { if (tipOn === el) showTip(el); }, 450);
  });
  document.addEventListener("pointerdown", hideTip, true);
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") hideTip(); }, true);
  document.addEventListener("focusin", ev => { const el = tipOf(ev.target); if (el && el === ev.target && el.matches(":focus-visible")) { hideTip(); showTip(el); } });
  document.addEventListener("focusout", hideTip);
  addEventListener("scroll", hideTip, true);
  addEventListener("blur", hideTip);
})();
