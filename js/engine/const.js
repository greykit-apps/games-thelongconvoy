/* PumaPack -- every number the war runs on.
 *
 * The 1985 manual gives the feel of these and history gives the rest, but
 * the numbers are ours, tuned against the bot (tools/sim-check.js) and still
 * owed real play: anything not taken from a source is marked UNCERTAIN.
 * The boats, the ships and the torpedoes are our own, after their kind.
 *
 * The story (owner's, 2026-10-27): the Wolf Empire's wolfpack of submarines
 * against Pumacity's shipping and the Pumacity Defense Fleet (the PDF) that
 * escorts it. You can command either side.
 *
 * The calendar is the war's own: Year I to Year V of the Wolf War, twelve
 * months of the usual lengths, the clock counting game seconds from
 * midnight on 1 January, Year I. */
"use strict";
(() => {
  const C = PP.C = {};

  /* ---- the clock ---- */
  C.HZ = 50;                         /* engine steps a real second at Normal speed */
  C.DT = 1 / C.HZ;                   /* game seconds a step at 1x */
  /* time compression: game seconds per real second. UNCERTAIN: the top end is ours */
  C.TC = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  C.TC_MAX_IDX = C.TC.length - 1;
  /* what holds the clock back (an index into C.TC): the engine's own cap, so a replay is exact */
  C.TC_CAP = {
    charges: 0,                      /* depth charges in the water, a bomb run, a torpedo running at you */
    hunted: 1,                       /* an escort pinging you, or within 2,500 yd */
    torps: 3,                        /* our torpedoes running */
    close: 3,                        /* a ship in sight within 8,000 yd, or an escort within 10,000 */
    contact: 5,                      /* any ship seen or heard */
    near: 8,                         /* a convoy on the chart within 40,000 yd */
  };

  const MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  C.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  C.YEARS = ["I", "II", "III", "IV", "V"];
  C.DAY = 86400;
  /* the war ends at the close of August, Year V */
  C.WAR_MONTHS = 56;
  C.monthStart = mi => { let d = 0; for (let i = 0; i < mi; i++) d += MONTH[i % 12]; return d * C.DAY; };
  C.WAR_END = C.monthStart(C.WAR_MONTHS);
  /* t in game seconds -> the date and the hour */
  C.date = t => {
    let days = Math.floor(t / C.DAY), mi = 0;
    while (days >= MONTH[mi % 12]) { days -= MONTH[mi % 12]; mi++; }
    const s = t - Math.floor(t / C.DAY) * C.DAY;
    return { mi, y: Math.floor(mi / 12), m: mi % 12, d: days + 1, h: Math.floor(s / 3600), min: Math.floor(s / 60) % 60, hour: s / 3600 };
  };
  C.dateStr = t => { const d = C.date(t); return `${d.d} ${C.MONTHS[d.m]}, Year ${C.YEARS[Math.min(4, d.y)]}`; };
  C.timeStr = t => { const d = C.date(t); return String(d.h).padStart(2, "0") + String(d.min).padStart(2, "0"); };
  /* a signal's date-time group: the day, hour and minute run together, then the month and the year of the war */
  C.dtgStr = t => { const d = C.date(t); return String(d.d).padStart(2, "0") + C.timeStr(t) + ` ${C.MONTHS[d.m]} Yr ${C.YEARS[Math.min(4, d.y)]}`; };
  /* the war's month, 0 for January of Year I */
  C.monthOf = t => C.date(t).mi;

  /* ---- light: the sun by the hour, the moon by the day (UNCERTAIN: low latitudes, no seasons) ---- */
  /* the sun's height, -1 (midnight) to 1 (noon); day is above 0 */
  C.sun = t => Math.sin(((t / 3600) % 24 - 6) / 24 * PP.TAU);
  C.moon = t => 0.5 - 0.5 * Math.cos((t / C.DAY) / 29.53 * PP.TAU + 1.3);   /* phase, 0 new to 1 full */
  /* the light on the water, 0.05 a black night to 1 a clear noon */
  C.light = t => {
    const s = C.sun(t);
    if (s > 0.12) return PP.clamp(0.75 + s * 0.3, 0, 1);
    if (s > -0.12) return PP.lerp(0.12 + C.moon(t) * 0.12, 0.75, (s + 0.12) / 0.24);
    return 0.05 + C.moon(t) * 0.16;
  };

  /* ---- the weather (UNCERTAIN) ---- */
  C.WX = {
    clear: { name: "Clear", vis: 1.0, sea: [1, 3], dark: 0, w: 5 },
    haze: { name: "Haze", vis: 0.65, sea: [1, 2], dark: 0.05, w: 2 },
    overcast: { name: "Overcast", vis: 0.8, sea: [2, 4], dark: 0.2, w: 3 },
    squall: { name: "Squalls", vis: 0.35, sea: [4, 6], dark: 0.35, w: 1.2 },
    fog: { name: "Fog", vis: 0.16, sea: [0, 2], dark: 0.15, w: 0.8 },
  };
  C.WX_HOURS = [4, 14];               /* a spell of weather lasts this long, in hours */

  /* ---- detection (UNCERTAIN) ---- */
  C.DET = {
    /* how far a ship is seen, by eye, in clear daylight, before the horizon cuts it */
    shipDay: 26000, shipNight: 4200, smokeDay: 38000,
    /* how far the boat is seen: surfaced, and a periscope raised (moving slowly) */
    subDay: 9000, subNight: 1500, scopeDay: 1100, scopeNight: 220, featherKn: 4,
    /* chance a second an enemy lookout sees what is inside its range, at point blank */
    look: 0.2,
    /* hydrophones: yards of range per unit of the boat's noise */
    hyd: 1500, hydFast: 0.25, hydFastKn: 15,
    /* active sonar: a cone ahead, its range by year, and the gap close under the hull */
    sonarCone: 55 * PP.DEG, sonarMin: 260, ping: 0.4,
    /* radar */
    radarSub: 14000, radarShipVsSub: 8000, radarPlane: 18000,
    /* our hydrophone hears screws to here */
    ourHyd: 16000,
    /* our lookouts see aircraft to here by day */
    planeDay: 13000, planeNight: 3000,
  };
  C.EYE = { bridge: 30, scope: 3 };   /* feet above the sea */
  /* the horizon, in yards, from h1 feet to something h2 feet tall */
  C.horizon = (h1, h2) => 1.17 * (Math.sqrt(Math.max(0, h1)) + Math.sqrt(Math.max(0, h2))) * PP.YD_NM;

  /* ---- our boats ---- */
  C.PD = 60;                           /* periscope depth, feet, to the keel */
  C.RADAR_DEPTH = 45;
  C.SUBS = {
    ocelot: {
      name: "Jackal", note: "An old coastal boat: short-legged, shallow, four tubes forward and one aft.",
      surf: 14, sub: 9, test: 200, crush: 300, tubesF: 4, tubesA: 1, torps: 12, shells: 60, gun: "3-inch",
      bat: 0.75, fuel: 0.55, dive: 50, len: 72, from: 0,
    },
    caracal: {
      name: "Timber", note: "The fleet boat the war began with: six tubes forward, four aft, legs for the long patrols.",
      surf: 20, sub: 8.8, test: 250, crush: 400, tubesF: 6, tubesA: 4, torps: 24, shells: 80, gun: "3-inch",
      bat: 1, fuel: 1, dive: 40, len: 100, from: 0,
    },
    cougar: {
      name: "Dire", note: "Bigger, quieter, deeper: the boat that carried the war.",
      surf: 21, sub: 9, test: 300, crush: 450, tubesF: 6, tubesA: 4, torps: 24, shells: 90, gun: "4-inch",
      bat: 1.05, fuel: 1.1, dive: 35, len: 104, from: 6,
    },
    catamount: {
      name: "Fenris", note: "A thick hull: four hundred feet and more, and a heavier gun.",
      surf: 20.5, sub: 9, test: 400, crush: 620, tubesF: 6, tubesA: 4, torps: 24, shells: 100, gun: "5-inch",
      bat: 1.05, fuel: 1.1, dive: 35, len: 104, from: 20,
    },
  };
  C.SUB_ORDER = ["ocelot", "caracal", "cougar", "catamount"];
  /* the telegraph: Back, Stop, one third, two thirds, Standard, Full, Flank */
  C.BELLS = ["Back", "Stop", "1/3", "2/3", "Std", "Full", "Flank"];
  C.BELL_F = [-0.3, 0, 0.3, 0.52, 0.72, 0.88, 1];
  C.ACCEL = 45;                        /* seconds to close most of the way to the ordered speed */
  C.TURN = 2.6 * PP.DEG;               /* the most a boat turns a second, at speed (UNCERTAIN) */
  C.DIVE = { rate: 1.6, crash: 2.6, blow: 2.2, planesKn: 3 };   /* feet a second */
  /* battery: drain a second submerged = a + b * knots^3 (2 kn lasts about two days, flank about an hour) */
  C.BAT = { a: 2.8e-6, b: 3.77e-7, charge: 3.6e-5, chargeKn: 12 };
  /* fuel: burn a second = c * (0.3 + 0.7 (knots/10)^3), about 10,000 nm at 10 kn */
  C.FUEL = { c: 2.78e-7, charging: 0.5e-7 };
  C.NOISE = { base: 0.18, cav: 0.6, cavKn: 6, cavDepth: 100, diesel: 1.4, silent: 0.6 };
  C.WATER = { pump: 1 / 1800, heavy: 0.45, sinkRate: 1.2, lost: 1 };
  /* the snorkel: the diesels run at periscope depth through a mast; slower than on the surface, slower to charge, loud (UNCERTAIN) */
  C.SNORKEL = { kn: 0.45, charge: 0.6, noise: 0.8, mast: 6, radar: 0.4 };
  /* Metox hears an escort's radar out to this many times the range it can find her at */
  C.METOX = { reach: 2.5, repeat: 180 };
  /* the noisemaker (the 1990 game's decoy): a boat carries a few; one in the water sounds like a boat for so
   * long, and an escort that hears or pings a boat near it may take it for her (UNCERTAIN) */
  C.DECOY = { n: 4, life: 300, reach: 1200, fool: 0.6, sink: 0.6 };

  /* ---- the Wolf Empire's ships (lengths and beams in yards, draft and mast in feet) ---- */
  C.SHIPS = {
    coaster: { name: "Coastal freighter", tons: 2100, len: 82, beam: 13, draft: 15, mast: 64, kn: 9, hp: 1, role: "merchant" },
    freighter: { name: "Freighter", tons: 5600, len: 132, beam: 18, draft: 24, mast: 88, kn: 11, hp: 1.5, role: "merchant" },
    liner: { name: "Cargo liner", tons: 8400, len: 158, beam: 20, draft: 27, mast: 96, kn: 13, hp: 1.9, role: "merchant" },
    tanker: { name: "Tanker", tons: 10200, len: 166, beam: 22, draft: 30, mast: 80, kn: 12, hp: 2.0, role: "merchant", burns: true },
    troopship: { name: "Troopship", tons: 7200, len: 150, beam: 19, draft: 25, mast: 92, kn: 14, hp: 1.7, role: "merchant" },
    destroyer: { name: "Destroyer", tons: 1700, len: 118, beam: 11, draft: 11, mast: 70, kn: 34, hp: 1, role: "escort", guns: 2, dc: 9, sonar: 1 },
    frigate: { name: "Frigate", tons: 950, len: 86, beam: 10, draft: 10, mast: 58, kn: 19, hp: 0.9, role: "escort", guns: 1, dc: 7, sonar: 1.15 },
    chaser: { name: "Sub-chaser", tons: 420, len: 55, beam: 7, draft: 7, mast: 40, kn: 18, hp: 0.6, role: "escort", guns: 1, dc: 5, sonar: 0.9 },
  };
  /* a boat of the pack as the view out draws her (ShipArt's "sub" model): never part of a convoy */
  C.SHIPS.sub = { name: "Submarine", tons: 1500, len: 100, beam: 9, draft: 15, mast: 22, kn: 20, hp: 1, role: "sub" };
  C.MERCHANTS = ["coaster", "freighter", "liner", "tanker", "troopship"];
  /* ---- the escorts' side: the escort you sail yourself ---- */
  C.ESC_BELLS = ["Back", "Stop", "1/3", "2/3", "Std", "Full", "Flank"];
  C.ESC_BELL_F = [-0.2, 0, 0.25, 0.45, 0.65, 0.85, 1];
  C.ESC_SIDE = { charges: 60, pattern: 6, dcSet: [50, 600], hedgehogFrom: 30, hedgehogs: 8, hhRange: 250, hhSink: 23, hhRing: 40, hhHit: 14, gunReload: 4 };
  /* the orders for an escort you are not aboard (the 1990 game's, for its side) */
  C.ESC_ORDERS = [["screen", "Screen", "Keep her station on the convoy and hunt what comes near it"], ["hunt", "Hunt", "Go after the freshest contact any escort has"],
    ["patrol", "Patrol", "Run her waypoints, hunting what she finds"], ["hold", "Hold", "Stop where she is and listen"]];
  C.ESCORTS = ["destroyer", "frigate", "chaser"];
  /* Pumacity names its merchant ships for its high desert and mountains (ours) */
  C.SHIP_NAMES = ["Talus", "Scree", "Mesa", "Arroyo", "Juniper", "Tamarack", "Ridgeline", "Sagebrush", "Cliffrunner", "Ponderosa", "Granite", "Canyon",
    "Sierra", "Chaparral", "Bitterroot", "Cascade", "Rimrock", "Highpass", "Saltcedar", "Manzanita", "Piñon", "Basin", "Cougar Peak", "Sandstone",
    "Red Butte", "Silver Sage", "Painted Rock", "Ochre Point", "Copper Hill", "Lantern Hill", "Prairie Wind", "Sunmesa", "Amber Coast", "Dune Runner",
    "Tawny Star", "Goldgrass", "Cliff Haven", "Sierra Dawn", "Arroyo Queen", "Canyon Light"];
  /* and the PDF its escorts for the hunt */
  C.ESCORT_NAMES = ["Talon", "Pounce", "Prowler", "Ambush", "Claw", "Whisker", "Tawny", "Panther", "Swiftpaw", "Stalker", "Highcrag", "Sentry", "Guardian", "Ridgeback"];

  /* ---- the convoy ---- */
  C.CONVOY = {
    spacing: 900, escortRing: [1800, 2900],
    zig: [
      [[30, 480], [0, 360], [-30, 480], [0, 360]],
      [[45, 600], [-20, 720], [10, 360]],
      [[-25, 420], [25, 420]],
      [[40, 540], [-40, 540], [0, 900]],
    ],
    scatterT: 1500,                  /* seconds before scattered ships re-form */
    spawn: 42000, despawn: 60000,    /* yards: ships are put on the sea within this of the boat, and taken off past that */
  };

  /* ---- escorts ---- */
  C.ESC = {
    searchKn: 10, attackKn: 24, listenKn: 12,
    lostT: 300, persist: [900, 2700],         /* seconds; expert keeps at it longer */
    blind: 260,                                 /* yards run on after contact is lost under the bow */
    gunRange: 6000, ramRange: 300,
    huntT: [1100, 2400], leash: [11000, 18000],      /* seconds and yards an escort will hunt away from its convoy */
    depthErr: [75, 28],                         /* feet, normal and expert */
    posErr: [90, 45],                           /* yards */
  };
  /* ft/s; yards; feet. kill and hurt UNCERTAIN: widened 2026-10-27 so a pattern over a fair contact can sink a boat; owed real play */
  C.DC = { sink: 9, spacing: 28, throw: 60, kill: 30, hurt: 135, sev: 0.7 };

  /* ---- aircraft (UNCERTAIN) ---- */
  C.AIR = { kn: 150, perHour: 0.1, searchT: 2400, bombR: 90, bombDepth: 60, eyes: 11000 };

  /* ---- torpedoes ---- */
  C.TORPS = {
    steam: { name: "Steam", kn: 46, range: 4500, wake: true },
    electric: { name: "Electric", kn: 29, range: 4000, wake: false },
  };
  C.TORP = { arm: 450, turnR: 150, reach: 30, gyroMax: 95 * PP.DEG, runDepth: 10, reload: 600, hitSlop: 3 };
  C.SPREAD = 2.5 * PP.DEG;

  /* ---- the deck gun ---- */
  C.GUN = { range: 7000, reload: 6, man: 25, hit: 0.13, spread: 0.018 };

  /* ---- the war, month by month (UNCERTAIN: our timeline, after history's shape) ---- */
  const at = (mi, steps) => { let v = steps[0][1]; for (const [m, x] of steps) if (mi >= m) v = x; return v; };
  C.era = mi => ({
    mi,
    dud: at(mi, [[0, 0.55], [8, 0.45], [16, 0.32], [21, 0.1], [26, 0.04]]),
    premature: at(mi, [[0, 0.12], [15, 0.06], [21, 0.01]]),
    deep: at(mi, [[0, 11], [9, 6], [16, 0]]),
    circular: 0.006,
    torp: mi >= 36 ? "electric" : "steam",
    subRadar: mi >= 20,
    /* the 1990 game's boats: the radar warning (Metox) from Year III, the snorkel from Year IV (UNCERTAIN, after history's shape) */
    metox: mi >= 28,
    snorkel: mi >= 36,
    escortRadar: mi >= 38,
    planeRadar: mi >= 29,
    sonar: at(mi, [[0, 1600], [14, 2100], [28, 2600], [40, 3000]]),
    asw: at(mi, [[0, 0.8], [14, 1], [28, 1.25], [40, 1.5]]),
    traffic: at(mi, [[0, 1], [24, 0.8], [36, 0.5], [44, 0.3]]),
    escorts: at(mi, [[0, 0.6], [12, 1], [24, 1.4], [36, 1.7]]),
    air: at(mi, [[0, 0.5], [18, 1], [30, 1.6]]),
  });

  /* ---- reality: what makes it harder, and what it is worth ---- */
  C.REAL = [
    ["vis", "Limited visibility", "Only what you have seen or heard is on the chart.", 15],
    ["zig", "Convoy zig-zags", "Convoys turn together on a zig-zag plan.", 10],
    ["expert", "Expert escorts", "Escorts hunt in pairs, hold on longer and set their charges closer.", 20],
    ["duds", "Torpedo failures", "Duds, prematures and deep runners, as the year's torpedoes had them.", 15],
    ["portOnly", "Port repairs only", "The hull, the battery and the periscope can only be put right in port.", 10],
  ];
  C.REAL_BASE = 15;
  C.realPct = real => C.REAL_BASE + C.REAL.reduce((s, [k, , , v]) => s + (real[k] ? v : 0), 0);
  C.REAL_ALL = { vis: true, zig: true, expert: true, aob: true, duds: true, portOnly: true };
  C.REAL_NONE = { vis: false, zig: false, expert: false, aob: false, duds: false, portOnly: false };

  /* the Wolf Empire names its boats for winter, iron and old wolves (ours) */
  C.BOAT_NAMES = ["Hoarfrost", "Grimtooth", "Ironmaw", "Coldharbour", "Ashvane", "Snowfang", "Vargr", "Duskmane", "Frostgrave", "Blackpelt",
    "Wintermark", "Rimewood", "Greymaw", "Stonejaw", "Nightrun", "Ulfhild", "Hrimstead", "Fenmark", "Skoll", "Hati", "Gloomwater", "Iceholm",
    "Silverhowl", "Bitterwind", "Ravenmoor", "Cinderwolf", "Hollowtusk", "Grauholm", "Wolfsgate", "Ironhowl", "Bleakfell", "Coldmarch",
    "Thornpelt", "Shardjaw", "Mistfang", "Ulmar", "Varden", "Kaltberg"];
  /* the pack's captains (ours), one to a boat */
  C.CAPTAINS = ["Ulfric", "Varga", "Skaldi", "Hrolf", "Ysolde", "Grimmar", "Brann", "Kaelin", "Mordra", "Tyrr", "Askel", "Rurik", "Sigrun", "Halvard",
    "Ylva", "Fenna", "Isolf", "Rhagar", "Thorna", "Wulfa", "Lupa", "Ragna", "Ketil", "Orm"];
})();
