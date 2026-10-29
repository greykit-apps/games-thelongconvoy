# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desktop players of all kinds, new players first: people who never played *Wolfpack* should find a pack of submarines approachable, and fans of the 1990 original should recognise its pack, its convoys and its escorts. Keyboard or gamepad on a computer, in sessions of one mission; phone play is out of scope.

## Product Purpose

A remake of NovaLogic's *Wolfpack* (DOS, 1990): the Wolf Empire's wolfpack of submarines against Pumacity's shipping and the Pumacity Defense Fleet (the PDF) that escorts it (owner's story, 2026-10-27). As the wolfpack: a pack of boats against an escorted convoy, commanded one boat at a time while the others hunt under their own captains, attacked through the periscope with a torpedo data computer, hunted with sonar and depth charges. The original let you play either side, and so does The Long Convoy: the escorts' side puts you aboard one of the convoy's escorts against a pack under its own captains. Success is a player who brings two boats in on a convoy from two sides, sinks ships, and gets most of the pack home.

## Positioning

The 1990 game's design (the pack, switching command between boats, the convoy and its escorts, missions on both sides), rebuilt as its own game rather than an emulation, on Puma Service's sea, boats and periscope. Classic plays with the instruments and your eyes; Field adds modern aids; reality is set apart from the aids.

## Operating Context

Part of the greykit.games portfolio, served at greykit.com/games/thelongconvoy. It opens on the shared greykit boot screen; everything after the boot is the game's own. A mission in progress and the best results live in this browser only.

## Capabilities and Constraints

- Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page.
- The engine (`js/engine/`) is DOM-free and deterministic from a seed; `tools/sim-check.js` plays it headless.
- Every boat of the pack runs on the same engine as the one you are on: the boats you are not on are sailed by the same captain the sim check uses, through the orders a player gives.
- Ships are traced from 3D models at their true angle on the bow.
- Desktop only; small screens get a note instead of the game.
- Keyboard first, gamepad supported.
- games-meta STANDARD.md rules apply (credit, Forget everything, menu keys, Settings order, sound).

## Brand Commitments

- The name: The Long Convoy (owner, 2026-10-29), at greykit.com/games/thelongconvoy; it was The Long Convoy until then, and its saved keys are moved over once. The name keeps "Pumacity" out of the title; the story keeps Pumacity and the PDF. The submarines are the Wolf Empire's wolfpack; the convoys are Pumacity's, escorted by the Pumacity Defense Fleet (the PDF).
- The same fictional archipelago and Wolf War as Puma Service; every place and ship name our own.
- Modern hi-bit pixel art at about 640 by 360; past the boot, a boat rigged for red light (owner's decision, 2026-10-26): black panels, red-orange light, amber readouts; the view out keeps the world's own colours.
- The 1990 game's screens, not Puma Service's (owner's note, 2026-10-26): the map runs the battle, the view out of the boat you are on, the damage; orders for every boat; select and fire, no torpedo data computer.
- It must not look like a mobile game, and it must not look like it is running in an emulator.

## Evidence on Hand

No NovaLogic code, art, sound or text may be used; the reference files are gitignored. `tools/ORIGINAL.md` records, in our own words, what the 1990 game is made of. The numbers are ours (`js/engine/const.js`, marked UNCERTAIN) and still need real play to tune.

## Product Principles

1. The game first: graphics serve reading the sea, the convoy, the pack and the danger.
2. Faithful in play, free in look.
3. Inviting to newcomers without hiding the original's depth.

## Accessibility & Inclusion

Keyboard-complete play and menus; text contrast at WCAG AA; nothing essential conveyed by colour alone; respects reduced motion.
