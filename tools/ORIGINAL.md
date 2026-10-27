# What the 1990 game is made of

Notes from reading *Wolfpack* (NovaLogic, 1990, DOS) for this remake, 2026-10-26.
They come from the game's own files, read from `reference/` (gitignored) with scripts kept outside the repo.
Everything here is our paraphrase: none of the original's text, art or code is used.
Not deployed (CI skips `tools/`).

Offsets are hex, little-endian. "Guess" means the reading fits the evidence but was not proven.

## The files
- **One compressor for everything.** The maps, the `.PAG` screens and the `WOLFDAT*` graphics are GIF-style LZW: codes read LSB first, 9 to 12 bits, 256 clears the table, 257 ends the stream, the code width grows when the next free code reaches 2^w. No header.
- **`WOLFPACK.EXE`:** packed with Microsoft EXEPACK (`RB` signature, "Packed file is corrupt" stub); unpacks to 140,688 bytes. Linked with Borland TLINK (Turbo C). The data segment starts at image offset `0xC20`, so a near pointer + `0xC20` is the string's offset in the unpacked image.
- **`WOLFPACK.EX_`** differs from `WOLFPACK.EXE` in one byte, file offset `0x1553D` (unpacked `0x1B2B5`): `74` (jump-if-equal) in `.EX_`, `EB` (jump always) in `.EXE`. It sits in the routine that asks for the "current cipher" from the manual, about 0x100 bytes after the code that prints that prompt. So `.EX_` is the original and `.EXE` has the copy-protection check bypassed.
- **`TITLE.PAG`, `PUBLISH.PAG`:** one 320×200 screen each, one byte per pixel (64,000 bytes unpacked). The title and the publisher's card.
- **`WOLFDATA.{CGA,EGA,TGA,VGA}`:** the main sprite bank, one per display adapter (`TGA` is Tandy). The VGA one opens with a table of 32-bit offsets.
- **`WOLFDATD/M/P/S.{CGA,EGA,VGA}`:** four more banks, no Tandy copy. D, M and S unpack to a byte-run-length screen each; P has an offset table like A. Guess from the letters: D destroyer panel, S submarine panel, M map/menu, P pictures. Not decoded, by choice.
- **`WOLFPACK.CFG`** (5 bytes): the setup choices as letters, here VGA, mouse, AdLib. **`DESKTOPD.CFG`**, **`INSTALL.PDM`**, **`INSTALH.DAT`**, **`INSTALL.BAT`:** hard-disk and Tandy DeskMate installers. `PLAY.BAT` just runs the game.

## Classes and the name pools
The EXE holds one pool of vessel names and one of captains. Every vessel in a mission takes a name from its class's pool, so a class can never field more vessels than its pool has names. The largest mission, BIGWAR, uses all 40.

| Code in `.MIS` | Class | Names in pool | Side |
|---|---|---|---|
| 2 | Freighter | 14 | Allied |
| 3 | Tanker | 4 | Allied |
| 4 | Destroyer | 8 | Allied |
| 5 | Type VII | 5 | German |
| 6 | Type IX | 5 | German |
| 7 | Type XXI | 3 | German |
| 8 | Milk cow (supply U-boat) | 1 | German |

- Code 0 marks an emptied slot (in CARIBE, a freighter already sunk when the mission opens).
- The EXE's own class index is the code minus 1, with 0 = "none left".
- Names are a mix of real US merchant and destroyer names and real U-boat numbers. The milk cow is the only one with a fixed identity.
- Captains: 50 surnames, 25 Allied (indexes 1–25, several are the developers' own names) and 25 German (26–50). Merchants all have the pseudo-captain "convoy".
- The editor refuses Type XXIs before 1945 and turns them into Type IXs.
- No table of class performance (speed, depth, weapon load) sits beside the names. It is either in code or in the per-unit record (below).

## Missions
Missions have no stored title: the 8-letter file name is the name. Each file carries two briefing slots, one for the U-boat side and one for the Allied side, and an empty slot means that side has no briefing.
- **Side** is the default commander's side from the settings block, S for U-boats, D for destroyers.
- **"Duel"** is a two-player hot-seat game with a turn time of 2 minutes.
- **Day** is bit 7 of the settings flags (see the layout below).
- Forces come from the unit records.
- Behaviour states are in quotes in the table below, as the EXE names them.

| File | Map | Year | Day/night | Side(s) | Briefing (paraphrase) | U-boats | Allied |
|---|---|---|---|---|---|---|---|
| EASYTOP | Scapa Flow | 1945 | day | both, default D | U-boat: one stubborn destroyer has you pinned in a shallow harbour. Torpedo it, or use decoys to open the range first. Allied: two scared U-boats are trapped in a bay, so practise sprint-and-drift and hedgehogs. | 2 VII (U-83 at 14 m, U-25 at 85 m) | 1 DD on "pursue sub", with an 8-point loop |
| EASYSUB | Scapa Flow | 1945 | day | both, default S | U-boat: an unescorted group of ships on its way to a convoy, an easy kill. Allied: sail out to join a convoy and watch for periscopes. | 1 XXI (surfaced) + 1 VII (14 m) | 3 freighters + 2 tankers, no escort, stopped |
| BAYDAY | Scapa Flow | 1943 | day | U-boat | Raid a Royal Navy anchorage with a pack of 3. Three destroyers guard it and may have active sonar. | 1 VII + 2 IX at periscope depth | 6 freighters + 4 tankers at anchor ("all stop"), 3 DD on "ocean patrol" |
| BAYNIGHT | Scapa Flow | 1939 | night | Allied | Guard merchants waiting to sail. A pack of 3 will attack silently at night, so find it by sprint-and-drift on the hydrophone. The briefing says 3 destroyers; the file has 2. | 2 VII + 1 IX on "chase contact" | 7 freighters + 4 tankers at anchor, 2 DD |
| HAPPY | Channel | 1939 | night | U-boat | Two boats on the surface amid a night convoy. Dive to periscope depth, avoid the destroyers, and sink merchants at will. Ships spot a periscope at about 100 m. When the torpedoes run out, the deck gun remains. | 2 VII (U-83, U-25), on the surface inside the convoy | 14 freighters + 4 tankers heading west, 8 DD (6 screening, 1 "attack sub", 1 "pursue sub") |
| CARIBE | Trinidad | 1944 | night | U-boat | Bring two boats to a rendezvous with the milk cow for torpedoes while a convoy battle rages to the south-east. | 5 VII + milk cow (stopped); the player's pair on patrol, one boat chasing, one evading at 80 m | 11 freighters + 4 tankers, 6 DD (one hunting). 16 torpedoes already running. |
| DEEP | Mid-Atlantic | 1941 | night | both | U-boat: a large outbound convoy east of Iceland is under attack; bring in the rest of the pack. Allied: drive off the attackers and avoid the rest. | 4 VII (3 already chasing) | 14 freighters + 4 tankers, 8 DD screening |
| DBLTRBL | Mid-Atlantic | 1943 | night | **duel**, both | A south-west convoy split into two groups. Both sides are told to watch the strategic map and work between the groups. Even odds. | 5 VII + 4 IX + milk cow, mid-battle (chasing or evading) | 14 freighters + 4 tankers, 8 DD (7 hunting) |
| ONS5 | Mid-Atlantic | 1943 | night | both | A huge convoy south of Iceland. The escorts now use radar and sonar; a decisive battle. The briefing says 10 boats; the file has 8. | 4 VII + 4 IX | 14 freighters + 4 tankers, 8 DD |
| JG76 | Channel | 1941 | night | both | U-boat: the biggest convoy from Iceland nears Britain, and every boat is yours; hit the aviation-fuel tankers first. Allied: the last, deadliest stretch into port. | 5 VII + 5 IX + milk cow | 14 freighters + 4 tankers, 8 DD |
| GIBRALT1 | Gibraltar | 1941 | night | both, default D | A supply convoy for Egypt is about to pass the strait; hit it before it reaches open water. | 5 VII + 1 IX on patrol | 14 freighters + 4 tankers, 8 DD (6 screening, 2 on patrol) |
| GIBRALT2 | Gibraltar | 1944 | night | both | U-boat: stop an eastbound convoy carrying tanks for Italy. Allied: you have the escorts plus a hunter-killer group. | 4 IX | 6 freighters + 2 tankers, 8 DD (4 screening, 4 on "ocean patrol" as the hunter-killers) |
| BIGWAR | Channel | 1945 | day | **duel**, no briefings | (none) | all 14: 5 VII, 5 IX, 3 XXI, milk cow | all 26: 14 freighters, 4 tankers, 8 DD |

**What sets the missions apart:**
- Convoys are always one "convoy lead" ship with the rest on "join convoy", holding fixed offsets from the leader in columns about one sea-map cell apart.
- Escorts on "convoy loop" hold their own offsets and run a loop defined relative to the convoy.
- Several missions open mid-battle: units already chasing, evading or deep, and in CARIBE torpedoes in the water and a sunk ship. A mission file is a saved game state, not a script.

## `.MIS` layout

| Offset | Size | Contents |
|---|---|---|
| `00` | 1 | 0 or 1. It is 1 only in BIGWAR and EASYTOP. Guess: the editor's "locked/original" mark. |
| `01` | 2 | `Pw`, the file tag. |
| `03` | 12 | Sea map file name, space-padded (`CHANNEL .SMP`). |
| `0F` | 12 | Ocean map file name (always `ATLANTIC.MMP`). |
| `1B` | 50 | One byte per captain, 1 = free, 0 = assigned. Allied captains 1–25 come first, then German 26–50. |
| `4D` | 40 | One byte per vessel name, in the EXE's pool order, 1 = free, 0 = used. |
| `75` | 1000 | U-boat briefing: upper case, CR line breaks, NUL-terminated. |
| `45D` | 1000 | Allied briefing, same form. |
| `845` | 137 | The settings block (below). |
| `8CE` | 300 × units | Unit records (below). |
| then | 41 × objects | Weapons in the water (below). |

**Proof of the flag run.** In 12 of 13 missions, the zeros in `1B` and `4D` are exactly the captains and names the unit records point at. They number the vessels plus one captain per warship, since merchants have none. In CARIBE, one extra name is marked used: the sunk freighter's.

**Settings block** (offsets from `845`):
- `+0`: `1` or `2`. It is `2` only in the two duels (BIGWAR, DBLTRBL).
- `+1`, `+2`: commander 1's side (`S` or `D`) and turn time in minutes (5 normally, 2 in duels).
- `+3`, `+4`: commander 2's side and turn time.
  - The editor's labels confirm these fields: commander 1/2, 1st/2nd turn time, submarine/surface/duel.
- `+5`: flags.
  - Bit 7 = day: BAYDAY has it, BAYNIGHT doesn't, and HAPPY's "night" briefing has it clear.
  - Bits 0–1 are set only in JG76, ONS5 (1) and GIBRALT2 (2). Guess: the editor's recon and aerial options.
- `+6`: 30, 15 or 0. Guess: the time limit in minutes, 0 = none. It is 0 exactly where `+5` bits 0–1 are set, so the two may be one field.
- `+7`: war year minus 1900, 39–45.
  - ONS5 = 43, matching the real convoy.
  - Only 1945 missions have Type XXIs.
- `+20..+26`: seven bytes, one per class (e.g. `02 02 01 21 21 11 11`). Meaning unknown. Guess: per-class skill.
- `+133`: u16, the number of unit records.
- `+135`: u16, the number of 41-byte objects (16 in CARIBE, 0 elsewhere).
- The rest are runtime words (timers, repeated 15000-type values), not decoded.

**Unit record** (300 bytes; the in-game vessel structure saved whole):

| Offset | Contents |
|---|---|
| `+0` | Class code (table above). |
| `+1`, `+5` | x, y: signed 32-bit, 24.8 fixed point, world units. y grows southward. |
| `+9` | Depth: 24.8 fixed, metres, negative down. Seen: 0 surface, about −6 awash, −14 periscope depth, down to −200. |
| `+13`, `+15` | Velocity x, y, signed 16-bit. Its length equals the speed. |
| `+21` | Heading: u16, 65536 = 360°, 0 = north, clockwise. It agrees with the velocity. |
| `+23` | Ordered heading. |
| `+25`, `+27` | Speed and ordered speed, raw units (below). |
| `+37` | 1, 2, 3, 4 or 6. 6 when stopped, 3 on the boats the briefing hands the player. Guess: an engine/telegraph setting. |
| `+72`, `+76`, `+79` | Constant per class: freighter 220/3000/50, tanker 50/3000/50, destroyer 180/4000/10, U-boats 50/3000/100, Type XXI 60 for `+72`. `+76` drops in a few units mid-battle. Guess: hull points or a sensor value. |
| `+92` | Behaviour state × 2, an index into a 16-entry table in the EXE (below). `+90`, `+93` hold state details (target, sub-mode); not decoded. |
| `+126..+132` | A copy of the vessel's pool entry: class code, captain index × 2, a per-vessel id byte, near pointer to the name, near pointer to the captain. Freighters share one id, tankers another; warships have unique ids, perhaps a picture index. |
| `+138` | Cursor into a wake history: 8 points of (u24 x, u24 y) at `+139`. |
| `+189` | Station offset from the convoy leader: two signed 24-bit (dx, dy). It agrees with the actual positions. |
| `+195` | A u16 of route state, then the byte 6. Not decoded. |
| `+198` | Up to about 15 waypoints of (u24 x, u24 y), zero-terminated, interpreted by the behaviour: the convoy leader's route west, an escort's loop relative to the convoy, a U-boat's patrol zigzag. |

**Evidence from comparison:**
- EASYTOP and EASYSUB differ only in units: 3 records against 7. In both, the code-4 record has the 8-point loop and destroyer-only bytes (`+57` = 4).
- BAYDAY and BAYNIGHT are the same size (16 units each) but differ:
  - year, day bit and default side;
  - forces: 3 DD + 3 U-boats, with everything stopped, against 2 DD + 3 U-boats already on "chase contact".
- HAPPY's briefing names U-25 and U-83, and its two U-boat records point at exactly those names. CARIBE's names U-596, U-552 and the milk cow U-753, and so do its records.

**Behaviour states** (the table `+92` indexes):
- circling
- all stop
- ocean patrol
- join convoy
- convoy loop
- convoy lead
- shadow
- chase contact
- pursue sub
- attack sub
- evade attack
- assist attack
- drift
- deep run
- charging (batteries)
- anchor

The orders menu offers more names than there are states (below), so some orders must be modifiers on a state.

**41-byte objects** (CARIBE only), guess: torpedoes in the water.
- Each has the same position, depth, velocity and heading layout as a unit.
- All 16 run at 14 m and speed 1000, in two salvos on opposite headings.
- A counter at `+27` rises along each salvo, likely the distance run.

**Speeds, raw:**
- convoy 75 (25 when slow);
- destroyer ordered 200–500 in steps of 100;
- U-boat 30, 50 or 100;
- torpedo 1000.

Neither the time step nor the world unit could be pinned down, so these are ratios only.

## `.SMP` and `.MMP` layout
**Sea map (`.SMP`)**, unpacked to 32,020 bytes:
- a 20-byte header: 10 signed 16-bit depths in metres, deepest first;
- then 320 × 200 cells, 4 bits each, high nibble first, row by row. A row width of 320 is the clear autocorrelation minimum on every map.
- **Cells 0–9** are water, indexing the depth table. **Cells 10–15** are land, as height or shading bands.

| Map | Depth table, m | Scale (world units per cell) | Place on the ocean map (cell) |
|---|---|---|---|
| SCPAFLOW | −300 … −30, steps of 30 | 640 | 223, 36 |
| DEEPWATR | −8000, −7000 … −1000, −900, −800 (only 3 levels used: open ocean) | 640 | 139, 49 |
| CHANNEL | −2000, −1000, −800, −400, −325, −250, −150, −100, −60, −20 | 360 | 208, 51 |
| GIBRALTR | as CHANNEL, but −90, −50, −20 at the shallow end | 344 | 214, 108 |
| TRINIDAD | as CHANNEL, but −120, −70, −20 at the shallow end | 940 | 86, 159 |

**Ocean map (`ATLANTIC.MMP`):**
- a count byte (5);
- then five 20-byte entries, each: u16 scale, the magic `34 12 67 45`, an 8-letter map name, u16 x, u8 y on the ocean map, then `09 00 08`;
- then its own 20-byte depth table (−400 … −30);
- then a 320 × 200 grid of 4-bit cells, the same encoding.
- It is the Atlantic from the Caribbean to Norway, with each sea map's spot marked; the editor picks a sea map by pointing at it here.

**Placing units:** cell = world coordinate ÷ the map's scale. Evidence:
- At 640, BAYDAY's 16 ships all fall in Scapa Flow's shallowest band, beside land: an anchorage.
- At 344, every GIBRALT2 unit is in the strait's water; at 640, most would be on land.
- Every unit and waypoint in all 13 missions lands in water under its map's scale.

## From `WOLFPACK.EXE`
**Weapons:**
- torpedoes from forward and aft tubes (if the angle is wrong, a message says to use the other end);
- the deck gun (surfaced only, with a no-fire arc over the conning tower);
- depth charges and hedgehogs (destroyers);
- the *Pillenwerfer*, a noisemaker decoy (U-boats; the briefings call them noisemakers);
- the debrief also counts "sub guns".

**Sensors:**
- periscope (up/down, damageable, periscope depth needed);
- binoculars (named in a briefing);
- hydrophone, used by sprint-and-drift: listen while slow;
- active sonar (an alarm when a boat is pinged; new in 1941–43 per the briefings);
- radar (F8 toggles the sweep display);
- a "high-speed screws" alarm for torpedoes.

**Propulsion:**
- diesels on the surface only (they are refused below it);
- electric motors below, on batteries that drain;
- "charging" is a behaviour;
- a crush depth: rivets pop below maximum depth, then the boat is crushed;
- grounding and collisions;
- the milk cow docks and reloads boats.

**Damage:**
- Surface ships: flooding fore and aft, bridge, rudders, fire, gun, radio, engine, hull, depth-charge rack, hedgehogs.
- U-boats: fire, rudders, flooding, radio, diesels, sonar, forward tubes, periscope, dive planes, deck gun, fuel leaks, batteries.

**Messages** report every event by vessel name:
- hits by weapon;
- sinking;
- range-bearing-mark on a contact;
- reaching the last waypoint;
- leaving the simulation area;
- the convoy arriving at its destination.

**Commanding several vessels** (from the strings and the records; the buttons themselves are graphics and were not read):
- Every vessel on your side runs its own behaviour (above) with its own waypoints.
- You pick one to command directly; it switches to "user control". Picking an enemy is refused.
- An info panel on the selected vessel shows mission, captain, depth and its current order.
- The orders menu: chase contact, pursue sub, attack sub, evade attack, assist attack, drift, deep run, charging, user control, circling, anchor, ocean patrol, join convoy, convoy patrol, convoy leader, shadow, destination, zigzag, hold position, periscope depth, max depth, none.
  - Confirmations include: shadowing convoy, following convoy, leading convoy, ocean patrol active, anchored, pursuing contact, ship loop defined.
- The strategic map is how you spread a pack between targets; DBLTRBL's briefing says so outright.
- Duel: two commanders alternate at one machine on the turn time, with a 30-second warning before players switch.

**Hot keys:**
- F1 pause;
- F2 sound;
- F3 diesel noise;
- F8 radar sweep;
- F9 land display;
- F10 "fizzle", the screen transition.

Setup letters choose:
- graphics: VGA, EGA, Tandy, CGA, Hercules;
- input: mouse, keyboard, joystick in two modes, Amstrad joystick;
- music: AdLib, CMS, Tandy, PC speaker.

No other keymap is in readable form.

**Scoring:**
- The debrief per side gives:
  - the winner (surface fleet or wolfpack);
  - score, tonnage and destroyers;
  - vessels at start and lost;
  - fired, hits, kills and kill rate for each weapon;
  - a per-vessel table of name, class, captain and total damage.
- A percentage picks one of 11 ratings for a U-boat commander and 11 for an escort commander, from disgrace to fame.
- No difficulty setting exists beyond the mission itself (and perhaps the per-class bytes).

**The construction set** (mission editor): place vessels by type, name and captain; give orders; define convoy loops; choose a sea map from the ocean map; set commander sides, turn times, time limit (minutes or hours, or none), war year, day/night, recon and aerial. It also saves, loads and changes directory. Its rules:
- each side needs at least one ship;
- the originals cannot be overwritten;
- a mission can be permanently locked;
- the editor itself can be locked.

## Not decoded
- **The world unit and the time step.** No stats table was found, so speeds, ranges and the map scale stay relative. 640 units per cell at Scapa Flow would make each world unit a fraction of a metre, if the map is to real scale (it may not be).
- **About half the unit record:** `+37`, `+57`–`+79` beyond the per-class constants, `+90`/`+93`, and the route word at `+195`. They hold weapon loads, damage, contacts and timers in some order, but no two missions differ cleanly enough to name them.
- **Settings `+8..+19`, `+20..+26` and `+27..+132`.** Neither pairs of missions nor editor labels pin them down.
- **File byte `00`, and settings `+5` bits 0–1 with `+6`.** There are too few examples.
- **The art in `WOLFDAT*`.** Identified only, by choice.
- **The menu and button layout.** It is drawn from graphics, so how a player picks a side for a one-player mission with both briefings was not traced. The default side is settings `+1`.
