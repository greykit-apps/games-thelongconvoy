# The Long Convoy: development

Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page, and the three typefaces are in `fonts/`. What the game is meant to be is in [PRODUCT.md](PRODUCT.md), and how it looks in [DESIGN.md](DESIGN.md). What the 1990 game's files hold, in our own words, is in [tools/ORIGINAL.md](tools/ORIGINAL.md).

The Long Convoy began as a copy of [The Silent Patrol](https://greykit.com/games/thesilentpatrol/) and shares its sea, its boats and its view out; the screens, the controls and the code are its own. Its sonar's waterfall follows Attack Puma's.

## What's in here

```
js/engine/   the war, DOM-free: the sea, the boats of the pack, the ships and convoys, seeing and being seen, the escorts,
             torpedoes and the fire control, the missions, a step of it all, the captain and the orders each boat sails under
js/art/      the pixel art: the kit, the tracer, the ship models, the view out, the map, the title's painting, the sonar's
             waterfall, the dashboard, the damage report
js/          rendering, the HUD, input, sound and the title theme, the screens, settings and the record, and the loop
tools/       sim-check (the captain plays every mission headless, the whole pack at once), asset stamps and checks, icons, the share card
```

## Checks

`node tools/sim-check.js` plays every mission headless: the fire control's solution hits, the pack sinks ships, the boats you are not on fire on their own, the escorts hunt, and a mission replays step for step and survives being saved and loaded half way. `node tools/stamp-assets.js` stamps every script and stylesheet with its hash after an edit. `tools/preview.html` is the ship sheet; `tools/og.html` draws the share card; `node tools/make-icons.js` the icons.

## Pictures

`?play=<mission>&side=<pack|escorts>&seed=<n>&run=<steps>&station=<chart|sonar|damage>&awake=1` on the page drops straight into a mission, for testing and for pictures; `main.js` lists the rest (`near`, `depth`, `aim`, `hi`, `hour`, `wx`, `pause`). The briefing still opens: `Space` begins. `awake` keeps it running without the focus, as a headless browser never has it.

The screenshots in `screenshots/` are 1280 × 720, taken headless:

| | |
|---|---|
| `map.png` | `?play=gather&seed=1&run=6000&station=chart&awake=1`, `Space` |
| `dashboard.png` | `?play=easy&seed=1&near=2200&depth=60&aim=1&hi=1&awake=1`, `Space`, `+` `+`, 15 s, `Backspace`, `T`, `H` |
| `pdf-dashboard.png` | `?play=hunters&side=escorts&seed=1&run=20000&awake=1`, `Space`, `S` `S` `S`, `+` `+` `+`, 100 s, `Backspace` |
| `sonar.png` | as `pdf-dashboard.png`, with `&station=sonar` |
| `escorts.png` | `?play=hunters&side=escorts&seed=1&run=20000&station=chart&awake=1`, `Space` |
| `briefing.png` | `?play=tankers&seed=1&awake=1` |

The waterfall fills a line a second of the game's clock, so the waits under time compression are what fill it; on an escort, slowing under 15 knots first keeps her own noise off it.

## Saves

Saves from when the game was PumaPack (`pumapack_`) move over to `thelongconvoy_` the first time it opens.
