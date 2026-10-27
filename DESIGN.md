---
name: PumaPack
description: A fleet submarine against the Wolf Empire's convoys; dark instrument panels over a pixel-art sea for the play, and every screen of words typed on pale signal paper.
colors:
  page: "#070b12"
  hud-panel: "rgba(10,15,23,.86)"
  raise: "#1b2330"
  raise-hover: "#263142"
  hairline: "rgba(233,228,216,.10)"
  line: "rgba(233,228,216,.18)"
  text: "#ece7dc"
  muted: "#aab0b8"
  faint: "#8d949d"
  brass: "#e6bd6a"
  brass-hi: "#f6d590"
  sonar-green: "#7fe0a8"
  amber: "#f0a43c"
  danger: "#e8573a"
  danger-text: "#ff9a80"
  danger-fill: "rgba(140,36,18,.9)"
  danger-on-fill: "#ffd7cc"
  tawny: "#e2ad6a"
  ink-dark: "#121821"
  paper: "#d9dcc6"
  print: "#2f5a52"
  paper-rule: "rgba(47,90,82,.36)"
  paper-hair: "rgba(47,90,82,.2)"
  typed-ink: "#1d2a2a"
  typed-ink-2: "#4b5b58"
  paper-muted: "#3a4845"
  paper-faint: "#52605c"
  paper-line: "rgba(29,42,42,.32)"
  paper-raise: "rgba(255,255,255,.3)"
  paper-raise-hover: "rgba(255,255,255,.55)"
  paper-input: "rgba(255,255,255,.42)"
  paper-good: "#286340"
  paper-warning: "#7a4f0c"
  paper-red: "#9b2c1c"
  red-pencil: "#c2452f"
  pin: "#8a2c22"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(56px, min(8.1vw, 13vh), 116px)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "0.01em"
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
    fontFeature: "\"tnum\""
  keycap:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.03em"
  station-reading:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.15
    fontFeature: "\"tnum\""
  station-figure:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.15
    fontFeature: "\"tnum\""
  clock:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1
  paper-print:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.24em"
  paper-tab:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.2em"
  paper-field:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.2em"
  typed-title:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.1
  typed-name:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.15
  typed:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1
  typed-entry:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.3
  typed-cell:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  square: "0px"
  paper: "1px"
  cap: "3px"
  control: "4px"
  card: "6px"
  round: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  hud-button:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  hud-button-focus:
    backgroundColor: "{colors.raise-hover}"
    textColor: "{colors.text}"
  hud-panel:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  key-cap:
    textColor: "{colors.text}"
    typography: "{typography.keycap}"
    rounded: "{rounded.cap}"
    padding: "3px 5px 2px"
  paper-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.typed-ink}"
    rounded: "{rounded.paper}"
    width: "min(820px, 100%)"
  paper-button:
    backgroundColor: "{colors.paper-raise}"
    textColor: "{colors.typed-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "8px 16px"
  paper-button-primary:
    backgroundColor: "{colors.typed-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "8px 16px"
  paper-button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.paper-red}"
    rounded: "{rounded.square}"
  paper-button-danger-focus:
    backgroundColor: "{colors.paper-red}"
    textColor: "{colors.paper}"
  paper-input:
    backgroundColor: "{colors.paper-input}"
    textColor: "{colors.typed-ink}"
    rounded: "{rounded.square}"
    padding: "8px 10px"
    width: "220px"
  signal-blank:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.typed-ink}"
    rounded: "{rounded.paper}"
    width: "min(560px, 100%)"
  signal-line:
    backgroundColor: "transparent"
    textColor: "{colors.typed-ink}"
    typography: "{typography.typed}"
    rounded: "{rounded.square}"
    height: "clamp(34px, 5vh, 46px)"
---

# Design System: PumaPack

## Overview

**Creative North Star: "The Boat's Own Instruments, and the Signal from Base"**

PumaPack is a desktop submarine game in two materials. The play is the inside of a fleet boat at night: flat dark panels laid over the sea, hairline edges, warm off-white words in a condensed sans, and colour that only ever means something (brass for what is ready and chosen, sonar green for good news, amber for a warning, red-orange for danger). The play screen itself is modern hi-bit pixel art at about 640 by 360, scaled by whole numbers; the words around it, and every reading on it, are crisp vector type, never pixel type, so the readings stay readable and the game never looks like it is running in an emulator. Only short, fixed legends are painted into the art in its own pixel letters (see the Painted Legend Rule).

Every screen of words is **signal paper**: naval message blanks. The title's menu, the pause, every sheet (the actions, target practice, a new command, the port between patrols, the service record, the captain's log, settings, help, about, the reports, the loss) and the yes/no question are pale sea-green paper with faint printed rules and labels in tracked Barlow caps, titles, names and entered values typed in Courier Prime, ink for what is chosen, and a red-pencil tick and underline as the only mark of focus. On the title the blank hangs by a pin over the live dusk convoy, tilted a little, and its text types itself in on reveal; the pause is the same blank as a plain slip, and a sheet is a full page of it over the dimmed sea. Only the in-play HUD (station strip, readouts, clock, TDC, toasts, hints) and the pixel-art stations stay in the dark-panel world.

Density is that of an instrument panel: compact, aligned, tabular figures, small tracked labels over large readings. Motion is short and functional (120ms state changes, a 160ms pencil stroke, a fast stepped type-out), and every animation stops under reduced motion.

**Key Characteristics:**
- In play: flat dark panels with hairline warm-white edges over the pixel-art sea.
- Every screen of words: signal paper, pale blank, sea-green print, typed ink, red pencil.
- Barlow Semi Condensed for every printed word, key cap and reading; tabular figures for numbers.
- Courier Prime for what is typed on paper; Pixelify Sans for the clock only.
- Colour as role: in the dark, brass = ready/chosen, green = good, amber = warning, red-orange = danger; on paper the same jobs in ink, deep green, deep amber and deep red.
- Focus: an off-white ring in the dark; on paper the red pencil only.
- Pixel-art stations drawn from five-step ramps with a 4x4 ordered dither and a dark outline.

## Colors

A night-dark, cool-neutral base with warm off-white type, a single brass accent and three signal hues for the play; a pale paper palette, its print, its ink and one red pencil for every screen of words.

### Primary
- **Ship's Brass** (`brass`): ready and chosen in the dark. The current station, the set TDC values and ordered readings, the chosen torpedo bank. **Brass Highlight** (`brass-hi`) is the brass under focus. On paper, the brass role is taken by Typed Ink.
- **Red Pencil** (`red-pencil`, `--p-pencil`): focus on paper, and nothing else.

### Secondary
- **Sonar Green** (`sonar-green`): good news only. A loaded tube, a firing solution lamp, a ship sunk. On paper good news is **Paper Green** (`paper-good`).
- **Warning Amber** (`amber`): a warning. A held time compression, a low reading, a tube loading. On paper, **Paper Amber** (`paper-warning`).
- **Danger Red-Orange** (`danger`): danger as a fill or an edge on the HUD (critical bars, the hunted flag). As words in the dark, danger is always **Danger Text** (`danger-text`), 7.4:1 on the panel. A surface that is danger itself (the hunted flag, a red toast, the hunted key strip) is **Danger Fill** (`danger-fill`, 90%; the key strip's 110,28,14 at 90%) with its words in **Danger on Fill** (`danger-on-fill`). On paper danger is **Deep Red** (`paper-red`, `--p-red`) for words, edges (at 60%) and fills alike.

### Tertiary
- **Puma Tawny** (`tawny`): the puma. The "Puma" half of the wordmark and the captain; not a UI accent.
- **Map Pin** (`pin`): the flat pin the title's blank hangs by.

### Neutral (the dark world: HUD and stations)
- **Night Page** (`page`): the page behind everything.
- **HUD Glass** (`hud-panel`): the panel for HUD readouts.
- **Control at Rest** (`raise`) and **Control Under the Cursor** (`raise-hover`): the two steps of a dark button.
- **Hairline** (`hairline`) and **Line** (`line`): warm-white at 10% and 18%; dividers inside a panel and the edges of panels and controls.
- **Warm Off-White** (`text`, 14.6:1), **Muted** (`muted`, 7.9:1), **Faint** (`faint`, 5.6:1): the three text steps. Faint is the floor.
- **Dark Ink** (`ink-dark`): text set on brass or on a red fill.

### Neutral (signal paper)
- **Message Blank** (`paper`, `--p-paper`): the paper, carried with a faint fractal-noise grain.
- **Sea-Green Print** (`print`, `--p-print`): the printed form, its heavy 2px rules, its tracked labels, section heads, table heads and links. **Paper Rule** and **Paper Hair** (`--p-rule`, `--p-hair`) are the lighter ruled lines between fields and typed lines.
- **Typed Ink** (`typed-ink`, `--p-ink`): everything typed, the body text, and what is chosen. **Typed Ink, Second** (`--p-ink2`) is typed detail at the right of a line.
- **Paper Muted** and **Paper Faint** (`paper-muted`, `paper-faint`): the paper's second and third text steps.
- **Paper Line** (`paper-line`): the inked outline of a control at rest.
- **Paper Raise** and **Paper Raise, Hover** (`paper-raise`, `paper-raise-hover`): a control's white wash on the blank; **Paper Field** (`paper-input`) is an input's.

Inside a paper box the dark world's `--ps-*` role names are remapped to these paper values, so every sheet rule reads right on it: text to ink, yellow (chosen/primary) to ink, ps-ink (words on a fill) to paper, good/warning/danger to the deep paper hues. The paper's own tokens are `--p-*`; the greykit.games canon palette (css/gk-tokens.css) loads first for the shared boot screen, and the game never gives a canon name another value.

### Named Rules
**The Colour Has a Job Rule.** In the dark, brass means ready or chosen, green good, amber warning, red-orange danger; on paper the jobs keep their meaning, not their colours: ink for chosen and for the one action Enter takes, deep green good, deep amber warning, deep red danger. No hue is decoration, and nothing essential is carried by colour alone.

**The Danger Words Rule.** In the dark, danger as text is always `danger-text`; the raw `danger` red is for fills and edges only. On paper, deep red serves both.

**The Red Pencil Rule.** On signal paper the red pencil is the only focus mark, and it marks only two ways: a tick (the one hand-drawn path, a 160ms stroke) and a 2px underline. Signal lines: the tick beside the line and the label underlined. Sheet controls: the same tick at the control's top-left corner and its words underlined. Cards: the typed name underlined and the corner tick. Tabs: the pencil underline only. Inputs: a pencil bottom border. Links and disclosures: a pencil underline. A scrolling body: a 2px pencil line at its top edge. No rings, no washes, no brass.

## Typography

**UI Font:** Barlow Semi Condensed 500/600/700 (with Bahnschrift SemiCondensed, Arial Narrow, system-ui)
**Typed Font:** Courier Prime 400/700, signal paper only (with Courier New, ui-monospace)
**Clock Font:** Pixelify Sans (with ui-monospace)

All three are bundled in fonts/; nothing is fetched at play time.

**Character:** A condensed engineering sans prints the form and does all the instrument work, so labels, key caps and readings share one voice and one set of figures; the typewriter face is what has been typed onto the paper; the pixel face is kept to the clock as a single nod to the screen's pixel art.

### Hierarchy
- **Display** (700, `clamp(56px, min(8.1vw, 13vh), 116px)`, 0.86, uppercase): the PUMAPACK wordmark on the title, "Service" tracked wider (0.06em), "Puma" in tawny.
- **Typed title** (Courier Prime 700, 26px, 1.1): a sheet's title in its head; 30px/1 on the pause slip.
- **Typed name** (Courier Prime 700, 24px, 1.15; 40px/1.05 for the big result): a mission, result or captain's name inside a sheet, inked by outcome (paper green, deep red, paper muted).
- **Typed values** (Courier Prime): scenario names on choice cards (700 16px) and their date/class lines (14px); service-record and tally cells (15px); switch values (700); rank, placed and honour lines.
- **Body** (Barlow 500, 16px, 1.45; lede 18px; max 62ch): sheet prose stays printed, not typed; Help's prose pages set it in two columns across the wide sheet. HUD prose is 500 at 15px, toasts 600 at 17px, and a key named in a toast is a key cap like anywhere else.
- **Paper labels** (Barlow, tracked caps, sea-green): tabs 600 14px 0.2em; section heads and table heads 600 12px; the blank's head 700 14px 0.24em and field labels 600 12px 0.2em.
- **Label** (600, 12px, 0.14em, uppercase, muted): the HUD's reading labels.
- **Reading** (600, 17-19px, tabular figures): every number on the HUD.
- **Key cap** (600, 13px, 0.03em; pad caps 12px): keys, wherever they are written.
- **Clock** (Pixelify Sans 400, 24px, 1): the HUD clock's time, and nothing else.
- **Typed lines** (Courier Prime 700, 21px on the title, 19px on the pause, 17px in the title's footer boxes; 400 16px uppercase for field entries, 400 15px for line detail).

### Named Rules
**The Printed and the Typed Rule.** On paper, what the form prints (labels, tabs, section and table heads, the blank's head) is tracked Barlow caps in sea-green; what has been entered (titles, names, values, cells, the signal lines) is typed in Courier Prime; prose stays Barlow.

**The Key Caps Never Pixel Rule.** Key caps and letters are never set in the pixel face, which merges T with the up arrow, S with 5, O with 0 and Z with 2. Caps are always the UI sans; arrow keys are drawn as SVG arrows inside the cap. Every `<kbd>` in the game's words goes through the one cap renderer.

**The One Pixel Word Rule.** Pixelify Sans sets the clock's time only. Not headings, not labels, not menus.

**The Tabular Readings Rule.** Every number that changes on the HUD is tabular (`font-variant-numeric: tabular-nums`) in the UI sans, so readings never jitter.

**The Painted Legend Rule.** The stations' pixel art carries its own legends in its 5-by-7 and 3-by-5 pixel letters: the figures round a dial, the names on it (DEPTH, COURSE, SPEED, TELEGRAPH, the bells), the compartment names on the damage report, the chart's places and range rings. Those are short and fixed. Anything that changes (a reading, a range, a count, a state, a bearing figure that moves with the glass) and every key is the HUD's type, set over the canvas where the station puts it (the label layer, below). A painted legend never says a key.

**Alpha washes are their colour's.** A wash or edge at some opacity is its role colour's own value at that opacity (brass at 10%, 14% or 60% is `rgba(230,189,106,…)`, black lifts are `rgba(0,0,0,…)`); no near-miss hue stands in for one.

## Layout

The play screen is a canvas about 360 pixels high scaled up by whole numbers, as wide as the window allows, every station drawn about its middle. The scale is the window's height over 360 rounded down from 2x up (720 is 2x, 900 is 2x and 450 rows, 1080 is 3x), so a station always has its full 360 rows and its 640 by 360 layout is never squeezed under its own painted legends. The HUD frames it in fixed corners, 16px (12px at the top) from the window's edge: the station strip centred at the top, the clock top right, the boat's readings bottom left (300px), the TDC bottom right (270px), toasts and the key strip centred at the foot between them. Below 1240px the side panels narrow (270px and 240px); below 1180px the pause and sound buttons move to the top left; below 960px the stations follow them there.

Sheets are pages of paper centred over the dimmed scene (a plain 66% dim, no blur; 60% behind a question) at up to 820px wide (1080px wide variant, 600px tall when tabbed), with 32px around them. A sheet's head pads 16px 20px 14px 24px over a 2px print rule; its body 22px 24px 26px. The question box is 520px. The pause and the title's menu stand at the left, over a left-to-right shade, so the target and the TDC on the right stay clear to study.

The title: the convoy full-bleed; the wordmark and the 560px signal blank in a left column inset `clamp(32px, 7vw, 120px)`, vertically centred; the credit bottom left.

The rhythm is a 4px base (4, 8, 12, 16, 24, 32), with odd optical values in heads and rows. A desktop game: below 760px wide or 480px tall the game is replaced by a note.

## Elevation & Depth

Mostly flat with tonal layering: HUD panels are separated from the sea by opacity and a hairline edge, and paper rests just off the scene on a soft two-part shadow. Shadows are soft and ambient, never hard or offset, and serve only to lift a surface off the moving scene.

### Shadow Vocabulary
- **Paper lift** (`box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 22px 60px rgba(0,0,0,.5)`): every paper surface: the blank, the slip, a sheet, a question.
- **HUD lift** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 8px 22px rgba(0,0,0,.28)`): a HUD panel over the play screen.
- **Pin** (`box-shadow: 1px 4px 5px rgba(0,0,0,.45)`): the flat pin's soft cast.
- **Solution glow** (`box-shadow: 0 0 8px rgba(127,224,168,.6)`): the TDC lamp when the solution is good; the only glow.

### Named Rules
**The Lift Not Weight Rule.** A shadow lifts a panel or a page off the moving sea; it never suggests a raised, pressable slab.

## Shapes

Two form languages. In the dark, soft but tight corners that step with size: 3px for a key cap, 4px for a control, 6px for a HUD panel and the corner buttons, fully round for a gamepad face button and the TDC lamp; edges are single warm-white hairlines. On paper, a printed form: the box near-square (1px) and borderless, and every control, input, card and typed line square (0), ruled with 2px print lines between its parts and 1px rules between fields. Key caps keep their own 3px corners on paper. The title's blank tilts -0.6deg from its top centre; nothing else tilts.

## Components

### HUD buttons (the dark world)
Quiet dark keys that light only under focus; the pointer moves the focus, so the focused control is the only lit one.
- **Shape:** gently rounded (`{rounded.control}`), 1px `line` edge, 600 16px, 120ms colour transitions.
- **Default:** `raise`, warm off-white words. **Focus:** `raise-hover`, off-white edge and a 1px off-white ring.
- **Corner buttons** (pause, sound): 36px square, 6px, HUD glass; keyboard focus is a 2px brass outline (they are never chosen).
- **Disabled:** 45% opacity.

### Paper buttons
Square, an inked outline at rest on a white wash; the pencil for focus.
- **Shape:** square (`{rounded.square}`), 1px `paper-line` edge, `paper-raise` wash, ink words.
- **Primary** (the one action Enter takes): ink-filled with paper words; stays ink-filled in focus.
- **Danger:** outlined in deep red at 60% with deep-red words; filled deep red with paper words in focus.
- **Focus:** no ring and no wash change; the red-pencil tick draws in at the top-left corner (offset -10px, -11px; 160ms) and the words take a 2px pencil underline (offset 4px). On the ink-filled primary the pencil would be 2.95:1 on the ink, so its tick stands off the corner on the paper (-15px, -15px; 3.6:1) and the underline under its words is drawn in the paper's colour.
- **Question box:** the pointer does not take the focus here (Enter stays on Cancel), so hover lifts the wash under it.

### Chips (toggle pills, on paper)
- **Style:** square, muted ink words, a 10px square check before the label.
- **State:** on = ink edge, a 6% ink tint, an ink-filled check. Focus is the corner tick and underline, whether on or off. Switch values are typed (Courier Prime 700).

### Cards (scenario and difficulty choices, on paper)
- **Corner Style:** square. Name typed 700 16px with a 12px check; date/class line typed 14px; description Barlow 15px muted.
- **Chosen:** ink edge, a 5% ink tint, inset 1px ink line, ink-filled check; it stays chosen when the focus moves on.
- **Focus:** the typed name underlined in pencil plus the corner tick; the wash and edge do not change. "The last one flown" is only a small muted tag.

### Inputs / Fields (on paper)
- **Style:** square, `paper-input` wash, a 36% ink edge, ink caret.
- **Focus:** a 2px red-pencil bottom border; nothing else.

### Navigation
- **Sheet head:** the typed title over a 2px print rule; Back is borderless sea-green print, ink in focus with the tick and underline.
- **Sheet tabs:** borderless sea-green tracked caps (14px 0.2em) over a 1px paper rule; selected = ink words with an ink underline; focus = a 2px pencil underline only, no tick.
- **Scrolling body:** keyboard focus draws a 2px pencil line at its top edge.
- **Links and disclosures:** sea-green print; focus is a 2px pencil underline.
- **Station strip (HUD):** each station a 34px borderless button with its key cap; current = brass-tinted fill with a 2px brass inset underline and a brass-edged cap; unavailable = faint, dashed cap.

### Key caps
The sans at 600 13px, a 1px edge with a 2px bottom edge, 3px corners; arrows drawn as SVG inside the cap. In the dark: off-white on a 7% warm-white fill with a warm-white edge; gamepad caps 12px in brass-hi with a brass edge; face buttons round. On paper: ink on a 22% white fill with a 40% ink edge.

### HUD panels
HUD glass, 6px, a faint 8% edge, the HUD lift; tracked 12px labels over 19px tabular readings, rows divided by hairlines. Segment bars are 10px squares (off-white, amber at warning, red at critical); torpedo tubes are 9 by 14 outlines, filled green when loaded, filling amber while loading. Panels thin to 30% when out of use.

### Signal blank (signature component: title menu and pause)
A naval message blank, the title's menu and the pause slip.
- **Form:** a printed head (from whom, precedence) in 14px 0.24em sea-green caps over a 2px print rule; a field grid (FROM, TO, DATE-TIME GROUP, SUBJECT on the title; POSITION, DATE-TIME GROUP, SUNK on the pause) with 12px tracked labels and typed uppercase entries; a TEXT label; then the typed lines.
- **Typed lines:** full-width, borderless, transparent; on the title a 64px margin column holds the key cap, a 1px rule runs down it, the label is typed at 21px and the detail at 15px in the second ink, right-aligned. Lines are divided by paper hair. Settings, Help and About sit in footer boxes under a 2px print rule.
- **Focus:** the red-pencil tick draws in beside the line (160ms stroke) and a 2px red-pencil underline appears under the label. Nothing else changes.
- **Title only:** a flat dark-red pin at 66% across the top edge, a -0.6deg tilt, and the reveal: every typed run comes out one character at a time in reading order (9ms a character, 32ms between runs) to a typewriter sound; any key or click completes it at once and still does its work. Off under reduced motion.
- **Pause:** a 440px slip with a typed 30px head, two-column fields, 44px lines, and the key legend in sea-green print under a 2px rule. No pin, no tilt, no typing.

### Paper sheet
A full page of the same paper over the dimmed sea: every sheet and the question box. Borderless, 1px corners, the paper lift, the grain. Head, tabs and body as above; sections headed in printed sea-green caps; names, values and table cells typed. The angle-on-bow figure in Help is annotated in sea-green print (brass where it would sit in the dark).

### Station readings: the label layer (render.js `R.lab`, hud.js)
A station lays out its live figures as it draws, in canvas pixels with an anchor; the HUD sets them each frame in a layer over the canvas, in its own type, and drops what the station no longer asks for.
- **Type:** Barlow 600 with tabular figures: readings 17px (19px for a gauge's main figure, 14px for a small one), bearing-ring figures 12px, tracked 11px caps for a reading's name and for test and crush. A one-pixel dark shadow stands them off the sea or the steel.
- **Tones:** off-white; brass for what is ordered or chosen (TRUE, the chosen tube bank, the gun's range); amber, danger-text and green as the HUD's; a range is off-white on a 60% night chip, above a ship's masts and just right of her middle, the nearest winning a crowded spot.
- **The periscope's ring** reads true, like the crew's reports; TRUE at its left is where the glass looks; under it, REL that bearing off the bow and beside REL the bow dial: the boat from above, bow up, a brass line where the glass looks and a brass wash its field of view; the power under them. On the bridge, the glasses and the gun the ring is the same, LOOKING, GLASSES or GUN at its left, with REL and the dial under it: the swing off the bow always reads on the left, wherever you are. Under every ring, BOW, STBD, STERN and PORT where they fall on it, in the pixel face. A figure every ten degrees, every two in high power, so there is always one. The locked target is a solid brass mark on the ring, the crew's last report a hollow amber one, and either is an arrow at the ring's end when it is off it.
- **Instruments:** the depth gauge large on the left, the gyro, the telegraph and the speed log across the top, the battery, the fuel and the tube board below; seams run between the dials, never through them; the bottom right stays clear for the HUD's TDC, which is shown here as everywhere; the clock is the HUD's.

### Damage report
The boat cut away side on in the steel and iron ramps, the casing and the conning tower over her, seven compartments between bulkheads with doors. Water rises from the bilges in the water ramp, its surface moving (still under reduced motion). A compartment with a hurt system is hatched, amber damaged and red out, sparking while it is bad, and its painted name takes its colour and an underline. Under her, her depth against her test and crush depths, the crush mark moving up as the hull is hurt and the lost depth dotted. Two HUD panels below: the boat (hull and water as segment bars, the pumps, the crush depth and what it was) and the repairs (only what is hurt, the one being mended first with its minutes, each with a bar of how far along it is; "Every system sound" when nothing is).

### Pixel-art stations (js/art/)
Every station is drawn into the 640 by 360 canvas: five-step material ramps (brass, copper, steel, iron, paint, puma, wolf, water and more) joined by a 4x4 ordered dither, a dark outline (`#0c0f17`) round what stands in front, sky graded through night, low-sun and day ramps, everything dimmed toward the night page by the light. Gauges are cream faces with dark ink, a red danger band and brass bezels. Ships are traced from 3D models at their true angle on the bow.

## Do's and Don'ts

### Do:
- **Do** set every printed word, key cap and reading in Barlow Semi Condensed, numbers on the HUD in tabular figures.
- **Do** build every new screen of words (a sheet, a report, a question, a menu) on signal paper: pale blank, sea-green print in tracked Barlow caps for labels, Courier Prime for titles, names and entered values, Barlow for prose, ink for chosen and for the one action Enter takes.
- **Do** mark focus on paper with the red pencil only: the one tick path and a 2px underline, placed as the Red Pencil Rule sets out.
- **Do** keep paper controls, inputs and cards square, and the paper box at 1px.
- **Do** keep the in-play HUD and the station overlays as flat dark panels with a hairline edge, using `hud-panel`, with brass for ready and chosen, green for good, amber for warning, red-orange for danger, and danger as words in `danger-text`.
- **Do** show focus in the dark as an off-white ring wherever a control can also be chosen; brass marks only what is chosen.
- **Do** write keys through the one key-cap renderer, with arrows drawn, never typed as characters.
- **Do** stop every animation (type-out, pencil stroke, hurt pulse, flash, panel fades) under reduced motion.
- **Do** draw the stations in five-step ramps with ordered dither and a dark outline, scaled by whole numbers.

### Don't:
- **Don't** set a key cap, a letter or a label in Pixelify Sans; it is the clock's face only.
- **Don't** put a ring, a wash or brass on anything on paper, and don't use the red pencil for anything but focus.
- **Don't** carry paper, Courier Prime or the red pencil into the in-play HUD or the stations, and don't build a new sheet as a dark panel.
- **Don't** use brass as a focus colour on a control that can also be chosen; that is how a focused choice and a chosen one become indistinguishable.
- **Don't** give a canon greykit token (css/gk-tokens.css) another value in the game's own stylesheet; paper tokens are `--p-*`.
- **Don't** blur the scene behind a sheet; it is a plain dim.
- **Don't** set the UI's words in pixel type or render the play screen with smoothing; the game must not look like an emulator, nor like a mobile game.
- **Don't** use colour as the only carrier of a state; pair it with a word, a fill pattern or a mark.
