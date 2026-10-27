# PumaPack

**A pack of puma submarines against the Wolf Empire's convoys.** A remake of *Wolfpack* (NovaLogic, 1990, DOS): command a pack of boats one at a time while the rest hunt under their own captains, and bring them in on the convoy together, in modern hi-bit pixel art.

## Play

[greykit.com/games/pumapack](https://greykit.com/games/pumapack/)

No install required. Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page; the two typefaces ship with it.

## How it plays

The Empire's convoys carry its oil, its ore and its troops between its islands, and its escorts ring them round. You have a pack.

- **You are aboard one boat at a time.** The periscope, the bridge, the instruments, the chart and the damage report are hers. `N` takes you to the next boat; a click on a boat on the chart takes command of her.
- **The rest of the pack hunts on its own.** Each boat's captain finds the convoy, works ahead of it, attacks, and goes deep and quiet when the escorts are on him. `K` tells the boat you are leaving to hold the course, speed and depth you gave her instead.
- **The pack shares the chart.** A ship one boat has in sight is on every boat's chart; their news comes in their names: who is firing, who is hunted, who is lost. When the boat you are on goes down, command passes to the next.
- **The attack is Puma Service's:** a torpedo data computer that solves the shot from bearing, range, angle on the bow and speed; ships traced from 3D models at their true angle on the bow; escorts that hear, see and ping, and lay depth charges.

Five missions after the 1990 game's, set in the Wolf War, from two boats against five unescorted ships to six boats strung across a strait, and a custom mission of your own making. The original let you play either side; the escorts' side, with the destroyers under your command, is the next milestone.

## Reality, and Classic and Field

**Reality** is the war itself, set before a mission: limited visibility, convoy zig-zags, expert escorts, angle on bow by eye, torpedo failures and port-only repairs. **Aids** never change the war: **Classic** is the instruments and your eyes; **Field**, the default, adds a solution line, torpedo tracks, range labels and key hints. `L` switches the set at sea.

## Keys

| | |
|---|---|
| `N` / `Shift` `N` | the next boat of the pack / the one before |
| `K` | the boat you are on holds your orders when you leave her, or hunts on her own |
| `W` `S` | telegraph |
| `A` `D` | helm |
| `Q` `E` / `PgUp` `PgDn` | depth; `P` periscope depth, `U` surface, `C` crash dive |
| `1`–`5` / `Tab` | bridge, periscope, instruments, chart, damage |
| Arrows | the station in front of you: train and raise the periscope, look round, the helm and telegraph elsewhere |
| `T` / `R` | lock the ship nearest the crosshair / stadimeter range |
| `Space` | fire; `F` forward or after tubes, `V` a spread |
| `X` / `Y` / `G` | silent running / radar / man the deck gun |
| `+` `−` / `Backspace` | time compression / back to 1x |
| `Esc` / `L` / `M` / `?` | pause / Classic or Field / sound / every key |

A gamepad works too; Help has its map.

## Code

```
js/engine/   the war, DOM-free: the sea, the boats of the pack, the ships and convoys, seeing and being seen, the escorts,
             torpedoes and the TDC, the missions, a step of it all, and the captain who sails the boats you are not on
js/art/      the pixel art: the kit, the tracer, the ship models, the view out, the chart, the instruments, the damage report
js/          rendering, the HUD, input, sound, the screens, settings and the record, and the loop
tools/       sim-check (the captain plays every mission headless, the whole pack at once), asset stamps and checks, icons, the share card
```

`node tools/sim-check.js` plays every mission headless: the firing solution hits, the pack sinks ships, the boats you are not on fire on their own, the escorts hunt, and a mission replays step for step and survives being saved and loaded half way. `node tools/stamp-assets.js` stamps every script and stylesheet with its hash after an edit. `tools/ORIGINAL.md` is what the 1990 game's files hold, in our own words.

PumaPack began as a copy of [Puma Service](https://greykit.com/games/pumaservice/) and shares its sea and its boats; the code is its own.

## Credits

The original *Wolfpack* was made by NovaLogic, 1990. This remake is not affiliated with NovaLogic; no code, art or audio from it is used. The boats, the ships, the islands and the war are our own.

By Matthew "Shan" Romanek, with Claude. Built by [greykit.com](https://greykit.com/).

Made for my own play. Nothing here is offered: no support, no updates, no licence.
