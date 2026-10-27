# PumaPack

**A pack of puma submarines against the Wolf Empire's convoys.** A remake of *Wolfpack* (NovaLogic, 1990, DOS): command a pack of boats one at a time while the rest hunt under their own captains, and bring them in on the convoy together, in modern hi-bit pixel art, in a boat rigged for red light.

## Play

[greykit.com/games/pumapack](https://greykit.com/games/pumapack/)

No install required. Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page; the two typefaces ship with it.

## How it plays

The Empire's convoys carry its oil, its ore and its troops between its islands, and its escorts ring them round. You have a pack.

- **The map runs the battle**, as in 1990: the depth in hard bands, every boat of the pack, the convoy as the pack has seen it. Click a boat to select her: her class, captain, depth and order, and the orders to give her.
- **Every boat sails under her order:** Attack (her captain finds the convoy and goes in), Shadow, Patrol (her waypoints: a right click on the map), Evade, Drift, Charge, Periscope depth, Hold.
- **Take command of one boat at a time** (`Enter`, a second click, or `N` for the next): then the view out of her is yours, the periscope at periscope depth and the bridge on the surface, with her helm, telegraph and tubes.
- **Select and fire.** `T` or a click selects a ship; `Space` fires at her, or at the nearest in range. The boat's fire control aims the shot, and says so when the angle is wrong for those tubes or the range too long. Ships are traced from 3D models at their true angle on the bow; escorts hear, see and ping, and lay depth charges.
- **The pack shares what it sees**, and its news comes in its boats' names: who is firing, who is hunted, who is lost. When the boat you are on goes down, command passes to the next.

Five missions after the 1990 game's, set in the Wolf War, from two boats against five unescorted ships to six boats strung across a strait, and a custom mission of your own making. The original let you play either side; the escorts' side, with the destroyers under your command, is the next milestone.

## Reality, and Classic and Field

**Reality** is the war itself, set before a mission: limited visibility, convoy zig-zags, expert escorts, torpedo failures and port-only repairs. **Aids** never change the war: **Classic** is the instruments and your eyes; **Field**, the default, adds a solution line, torpedo tracks, range labels and key hints. `L` switches the set at sea.

## Keys

| | |
|---|---|
| `1` / `2` / `3` | the map / the view (bridge or periscope) / damage |
| Click, `O`, right click | on the map: select a boat, give her the next order, add her a waypoint |
| `Enter` / `N` | take command of the boat selected / of the next boat |
| `W` `S` | telegraph |
| `A` `D` | helm |
| `Q` `E` / `PgUp` `PgDn` | depth; `P` periscope depth, `U` surface, `C` crash dive |
| Arrows | in the view: train and raise the periscope, look round; on the map: the helm and telegraph |
| `T` | select the ship nearest the crosshair |
| `Space` | fire at her, or the nearest in range; `F` forward or after tubes, `V` a spread |
| `X` / `Y` / `G` | silent running / radar / man the deck gun |
| `+` `−` / `Backspace` | time compression / back to 1x |
| `Esc` / `L` / `M` / `?` | pause / Classic or Field / sound / every key |

A gamepad works too; Help has its map.

## Code

```
js/engine/   the war, DOM-free: the sea, the boats of the pack, the ships and convoys, seeing and being seen, the escorts,
             torpedoes and the fire control, the missions, a step of it all, the captain and the orders each boat sails under
js/art/      the pixel art: the kit, the tracer, the ship models, the view out, the map, the damage report
js/          rendering, the HUD, input, sound, the screens, settings and the record, and the loop
tools/       sim-check (the captain plays every mission headless, the whole pack at once), asset stamps and checks, icons, the share card
```

`node tools/sim-check.js` plays every mission headless: the fire control's solution hits, the pack sinks ships, the boats you are not on fire on their own, the escorts hunt, and a mission replays step for step and survives being saved and loaded half way. `node tools/stamp-assets.js` stamps every script and stylesheet with its hash after an edit. `tools/ORIGINAL.md` is what the 1990 game's files hold, in our own words.

PumaPack began as a copy of [Puma Service](https://greykit.com/games/pumaservice/) and shares its sea, its boats and its view out; the screens, the controls and the code are its own.

## Credits

The original *Wolfpack* was made by NovaLogic, 1990. This remake is not affiliated with NovaLogic; no code, art or audio from it is used. The boats, the ships, the islands and the war are our own.

By Matthew "Shan" Romanek, with Claude. Built by [greykit.com](https://greykit.com/).

Made for my own play. Nothing here is offered: no support, no updates, no licence.
