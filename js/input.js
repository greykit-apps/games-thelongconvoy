/* The Long Convoy -- keys and pads, turned into orders for the next step.
 *
 * W and S are the telegraph, A and D the helm, wherever you are. The arrows
 * mean what the station in front of you needs, as a 1985 joystick did: at
 * the periscope they train it and raise it; on the bridge they look round
 * (and lay the gun); on the chart and the instruments they are the helm and
 * the telegraph again. Holding the helm swings the ordered course, at the
 * same speed in real time whatever the time compression: so a held key
 * never turns the boat further than you meant. */
"use strict";
(() => {
  const I = PP.Input = { held: new Set(), queue: [], pad: new Set(), padPrev: new Set(), stick: null, rstick: null, device: "keys", heldT: {}, tapD: 0 };
  const BIND = {
    KeyW: "tU", KeyS: "tD", KeyA: "hL", KeyD: "hR",
    ArrowUp: "aU", ArrowDown: "aD", ArrowLeft: "aL", ArrowRight: "aR",
    PageUp: "shallower", KeyQ: "shallower", PageDown: "deeper", KeyE: "deeper",
    KeyU: "surface", KeyP: "pd", KeyC: "crash",
    KeyZ: "zoom", KeyT: "lock",
    Space: "fire", KeyF: "bank", KeyV: "spread", KeyG: "gun", KeyX: "silent", KeyY: "radar",
    Equal: "tcU", NumpadAdd: "tcU", Minus: "tcD", NumpadSubtract: "tcD", Backspace: "tc1",
    Digit1: "st1", Digit2: "st2", Digit3: "st7", Digit4: "st3", Digit5: "st6",
    F2: "st1", F3: "st2", F4: "st7", F5: "st3", F6: "st6", Tab: "stNext",
    Escape: "pause", KeyL: "aids", KeyH: "onHer", KeyB: "ahead",
    KeyN: "boatNext", KeyO: "orders", Enter: "takeCmd", KeyK: "decoy", KeyJ: "auto", KeyI: "snorkel",
  };
  I.BIND = BIND;
  I.actionFor = code => BIND[code] || null;
  I.clear = () => { I.held.clear(); I.pad.clear(); I.queue.length = 0; I.stick = null; I.rstick = null; I.heldT = {}; I.slew = null; };

  /* ---- the key caps: one face for every key, the arrows drawn, the letters as this keyboard has them ----
   * The keys are bound where they sit (ev.code), so on an AZERTY keyboard the telegraph is Z, not W: where the
   * browser will say, a cap shows the letter printed on that key. */
  const CODE = { "[": "BracketLeft", "]": "BracketRight", ",": "Comma", ".": "Period" };
  const layout = new Map();
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { m.forEach((v, k) => layout.set(k, v)); }).catch(() => {});
  const ARROW = { up: 0, right: 90, down: 180, left: 270 };
  const arrow = (d, word) => `<svg class="kb-ar" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"${ARROW[d] ? ` style="transform:rotate(${ARROW[d]}deg)"` : ""}><path d="M5 9V1.8M1.8 5L5 1.8 8.2 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square"/></svg><span class="sr">${word}</span>`;
  const GLYPH = { "←": "left", "→": "right", "↑": "up", "↓": "down" };
  const PADNAME = { dU: ["D-pad", "up"], dD: ["D-pad", "down"], dL: ["D-pad", "left"], dR: ["D-pad", "right"] };
  /* one cap: "W", "Space", "left", "pad:A", "pad:dU"; "pad:Back+B" is two held together */
  I.cap = name => {
    if (name.startsWith("pad:")) return name.slice(4).split("+").map(p => {
      const d = PADNAME[p];
      return d ? `<kbd class="pad">${d[0]} ${arrow(d[1], d[1])}</kbd>` : `<kbd class="pad${p.length === 1 ? " face" : ""}">${p}</kbd>`;
    }).join('<span class="kb-plus">+</span>');
    const d = GLYPH[name] || (ARROW[name] !== undefined ? name : null);
    if (d) return `<kbd class="ar">${arrow(d, d + " arrow")}</kbd>`;
    const code = /^[A-Z]$/.test(name) ? "Key" + name : CODE[name], here = code && layout.get(code);
    return `<kbd class="k">${here && here.length === 1 ? here.toUpperCase() : name}</kbd>`;
  };
  /* every <kbd>x</kbd> written anywhere in the game's words, through the same cap */
  I.caps = html => html.replace(/<kbd>([^<]{1,16})<\/kbd>/g, (m, k) => I.cap(k));
  I.push = a => I.queue.push(a);
  I.down = (ev, a) => { I.device = "keys"; I.held.add(a); if (!ev.repeat) I.heldT[a] = performance.now(); };
  I.up = ev => { const a = BIND[ev.code]; if (a) { I.held.delete(a); delete I.heldT[a]; } };
  const on = a => I.held.has(a) || I.pad.has(a);
  /* how long a key has been held, ms (0 if not) */
  const heldFor = a => I.heldT[a] ? performance.now() - I.heldT[a] : 0;

  /* the continuous part of the orders, for one step of stepMs real milliseconds */
  I.cmd = (S, ui, stepMs) => {
    const c = { dHdg: 0, dTrain: 0, acts: I.queue.splice(0) };
    /* the screen as drawn (the view is the periscope or the bridge), not as chosen */
    const sec = stepMs / 1000, fast = I.held.has("shift") ? 3 : 1, st0 = S ? PP.Render.stationOf(S, ui) : ui.station;
    /* on the dashboard the arrows are the view's: the periscope's or the bridge's (an escort's bridge as a boat's) */
    let st = st0 === "dash" && S ? PP.Render.innerOf(S) : st0;
    if (st === "ebridge") st = "bridge";
    /* the helm: A and D everywhere; the arrows on the chart and the instruments */
    let h = 0;
    if (on("hL") || ((st === "chart" || st === "damage") && on("aL"))) h -= 1;
    if (on("hR") || ((st === "chart" || st === "damage") && on("aR"))) h += 1;
    if (I.stick && Math.abs(I.stick.x) > 0.3) h += I.stick.x;
    /* held, the helm puts the rudder over that way (the stick as far as it is pushed); let go, she steadies */
    if (h) c.rudder = PP.clamp(h, -1, 1);
    c.dHdg += I.tapD; I.tapD = 0;
    /* the periscope, or the bridge's glasses, or the gun: a held arrow gathers speed, to four times in a second */
    let tr = 0;
    if ((st === "scope" || st === "bridge") && on("aL")) tr -= 1;
    if ((st === "scope" || st === "bridge") && on("aR")) tr += 1;
    const trKey = ["aL", "aR"].find(k => I.held.has(k)), gather = trKey ? 1 + 3 * PP.clamp((heldFor(trKey) - 350) / 900, 0, 1) : 1;
    if (I.rstick && Math.abs(I.rstick.x) > 0.25) tr += I.rstick.x;
    const hi = S && S.sub.scope.hi, view = st === "scope" || st === "bridge";
    const turn = d => {
      if (st === "bridge") ui.look = PP.normAng(ui.look + d);
      else c.dTrain = d;
    };
    if (tr) {
      I.slew = null;
      turn((st === "scope" ? (hi ? 6 : 20) : ui.bino ? 8 : 30) * PP.DEG * sec * Math.max(fast, gather) * tr);
    } else if (I.slew && view && S) {
      /* a swing (H, B): fast, the shortest way round, and done when it is there */
      const s = S.sub, want = I.slew(S);
      if (want === null) I.slew = null;
      else {
        const now = st === "scope" ? s.hdg + s.scope.brg : ui.look, d = PP.angDiff(now, want), max = 400 * PP.DEG * sec;
        turn(PP.clamp(d, -max, max));
        if (Math.abs(d) <= max) I.slew = null;
      }
    } else if (!view) I.slew = null;
    return c;
  };
  /* swing the view to a true bearing worked out each step (so it keeps up with a ship), null to give up */
  I.slew = null;
  I.swing = f => { I.slew = f; };
  /* a tap of the helm: five degrees at once, before the hold takes over */
  I.tapHelm = d => { I.tapD += d * 5 * PP.DEG; };

  /* ---- gamepads (the standard mapping) ----
   * A fire, B the periscope, X lock, Y power (and tie up, at a base), the bumpers the stations, the triggers
   * time, the d-pad depth (the gun's range, when it is manned) and the tubes and the gun, the stick clicks a
   * crash dive and up a level. Back held is a second layer: the spread, silent running, the boat's next order, the
   * radar, the next boat and taking command, the log, the aids, back to 1x, the swings (onto her, ahead and
   * astern), Help; Back tapped alone is the map. */
  const PAD = ["fire", "scope", "lock", "zoom", "stPrev", "stNext", "tcD", "tcU", null, "pause", "crash", "level", "shallower", "deeper", "bank", "gun"];
  const PAD_MOD = { 0: "spread", 1: "silent", 2: "orders", 3: "radar", 4: "st6", 5: "aids", 6: "tc1", 7: "ahead", 9: "help", 11: "onHer", 12: "boatNext", 13: "takeCmd" };
  I.rawPrev = new Set(); I.padBtns = []; I.modUsed = false;
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const raw = new Set();
    let sx = 0, sy = 0, rx = 0, ry = 0;
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b && b.pressed) raw.add(i); });
      sx = p.axes[0] || 0; sy = p.axes[1] || 0; rx = p.axes[2] || 0; ry = p.axes[3] || 0;
    }
    const mod = raw.has(8), now = new Set();
    for (const i of raw) { const a = mod ? PAD_MOD[i] : PAD[i]; if (a) { now.add(a); if (mod) I.modUsed = true; } }
    if (I.rawPrev.has(8) && !mod) { if (!I.modUsed) now.add("st4"); I.modUsed = false; }
    I.stick = Math.hypot(sx, sy) > 0.3 ? { x: sx, y: sy } : null;
    I.rstick = Math.hypot(rx, ry) > 0.25 ? { x: rx, y: ry } : null;
    /* the left stick flicked up or down: the telegraph, a bell at a time */
    const flick = sy < -0.75 ? "tU" : sy > 0.75 ? "tD" : null;
    if (flick && !mod) now.add(flick);
    I.padBtns = [...raw].filter(i => !I.rawPrev.has(i));
    I.rawPrev = raw;
    const fresh = [...now].filter(a => !I.padPrev.has(a));
    if (fresh.length || raw.size || I.stick || I.rstick) I.device = "pad";
    I.padPrev = now;
    return fresh;
  };
})();
