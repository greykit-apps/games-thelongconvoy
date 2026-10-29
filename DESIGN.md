---
name: The Long Convoy
description: The Wolf Empire's wolfpack against Pumacity's convoys and the PDF that escorts them; a boat rigged for red light, the map first, the world outside in its own colours.
colors:
  page: "#090404"
  panel: "rgba(20,8,7,.96)"
  hud-panel: "rgba(16,6,5,.88)"
  raise: "#2c1210"
  raise-hover: "#3a1815"
  hairline: "rgba(255,120,90,.12)"
  line: "rgba(255,120,90,.24)"
  text: "#ffd0bd"
  muted: "#e7957c"
  faint: "#c27662"
  amber-readout: "#ffc65a"
  amber-hi: "#ffe08f"
  green-lamp: "#8fe3a1"
  warning: "#ff9f3a"
  danger: "#ff3d24"
  danger-text: "#ff7a5e"
  tawny: "#e9a86a"
  ink: "#160807"
  board: "#1a0907"
  board-print: "#e7957c"
  board-rule: "rgba(255,120,90,.3)"
  board-ink: "#ffd0bd"
  board-pencil: "#ffc65a"
  map-shoal: "#5c2b22"
  map-deep: "#130908"
  map-land: "#6b5846"
  map-coast: "#c98c5c"
  merchant: "#ffc65a"
  escort: "#ff5a3c"
  pack: "#ffd2bf"
typography:
  wordmark:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "clamp(56px, min(8.6vw, 14vh), 124px)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.02em"
  body:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  reading:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.2
  typed:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  square: "0"
  panel: "6px"
  board: "2px"
spacing:
  gutter: "16px"
  panel-pad: "10px 14px 12px"
---

# Design System: The Long Convoy

## Overview

**Creative North Star: "Rigged for Red"**

The Long Convoy is a desktop naval game in the shape of the 1990 *Wolfpack*: the battle is run from the map, one vessel at a time is yours, and the rest sail under the orders you give them. Past the shared greykit boot, everything is seen from inside a vessel at night with the lights rigged for red: black panels, red-orange light, amber readouts. The world outside the hull (the sea, the sky, the ships seen from the bridge or through the periscope) keeps its own colours, so a look out is a look out.

Two sides share one look. As the Wolf Empire's wolfpack you are aboard a submarine; as the Pumacity Defense Fleet (the PDF) you are aboard an escort. The panels change what they say, not how they look.

**Key Characteristics:**
- Red light inside, the world's own colours outside.
- The map first: a plot under red light, the depth in ten hard bands as the 1990 sea maps had them.
- Colour as role: amber = a reading, chosen, ready; green = a good lamp; orange = a warning; hot red = danger. Nothing is told by colour alone: on the map merchants are diamonds, escorts and boats triangles, a sinking ship a cross.
- Barlow Semi Condensed for every printed word and reading, tabular figures for numbers; Courier Prime for what is typed on a board; Pixelify Sans for the wordmark and the clock.
- Pixel art drawn in code: five-step ramps, a 4x4 ordered dither, a dark outline; ships traced from 3D models at their true angle on the bow.

## Colors

A near-black ground warmed toward red, one family of red-orange light for every word and line, amber for readings and choices.

### The panels (the HUD in play)
- **hud-panel** over **page**: every panel in play, edged in **hairline**.
- **text** for readings, **muted** for labels, **faint** for the least of them. Measured against the panel: text 14.3:1, muted 8.6:1, faint 5.8:1, amber 12.8:1, danger text 7.8:1, green 13.0:1.

### The boards (every screen of words)
The title's menu (the pack board), the pause, the sheets, the questions and the debrief are **boards**: a dark ground (**board**), its printed labels in **board-print**, what is typed in **board-ink** (Courier Prime), the focus in **board-pencil** amber.

### The map
- Ten depth bands from **map-shoal** to **map-deep**; land **map-land** with a bright **map-coast** line.
- **merchant** diamonds, **escort** triangles pointing their way, **pack** triangles for the boats; a contact on the PDF's side is an amber ring that fades as it ages.

### Named Rules
**The Red Light Rule.** Nothing inside the hull is blue or white. The cool colours belong to the world outside.

**The One Accent Rule.** Amber is the only accent: a reading, a choice, a ready lamp. It is never decoration.

## Typography

- **Wordmark:** Pixelify Sans 700, block letters with a stepped shadow in four darkening reds, after the 1990 title. The title only, and the share card.
- **Readings:** Barlow Semi Condensed 600 at 19px, tabular figures.
- **Labels:** Barlow Semi Condensed 600 at 12px, tracked 0.14em, upper case.
- **Typed:** Courier Prime on the boards: the boats, the date-time group, the contact.

## Layout

The play screen is the **dashboard** of the vessel you are aboard, as the 1990 game had one per kind of vessel, drawn on one canvas at about 640 by 360 and scaled up whole (`js/art/dash.js`): the view out in the big window top right, the strip of its controls under it; the small map top left, then timing, AUTO / USER CONTROL, the screens and the message window down the left; the gauges along the foot, the vessel's own (a submarine's telegraph, compass, depth, battery and fuel, tubes, snorkel and Metox; an escort's telegraph, compass, sonar scope and P / A switch, charges and racks, hedgehog). Every reading is a HUD label and every control a real button over the canvas, each with its key. The Map, Damage and Status screens are full screens, with the old panels and a way back.

## Elevation & Depth

Flat. A panel is set apart by its edge and a soft shadow, never by a gradient or a glow; the only glow is the faint red cast inside a board and the wordmark's.

## Components

### HUD panels
Square-ish (6px), **hud-panel** ground, hairline edge. A row is a label, a reading and an order beside it in amber when the order differs from the reading.

### The pack row and the orders panel
Each boat (or escort) a small square-cornered tag; the one you are aboard edged in amber. On the map the orders panel shows the selected vessel's class, captain, depth and order, and a grid of the orders, the current one edged in amber.

### Boards
Dark ground, 2px corners, a red cast inside, the print and the typed entries as above. The focus is the amber pencil tick and an underline, not a ring.

### The debrief
A board: the winner in green (your side) or red (theirs), the score and the rating, the two sides at the start and lost, every vessel of the pack, every weapon of both sides.

### Pixel-art stations (js/art/)
The view out (bridge, glasses, periscope) and the damage report are drawn from the world's own ramps; the map is drawn in the red light's.

## Do's and Don'ts

- Do keep the world outside in its own colours; don't tint the periscope red.
- Do tell every kind of mark by its shape as well as its colour.
- Don't add a second accent colour; don't use blue or white inside the hull.
- Don't make it look like a mobile game, or like it is running in an emulator.
