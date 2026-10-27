/* PumaPack -- the boat's crest, a puma's head on a brass medallion, on
 * the port's papers and the patrol report. */
"use strict";
(() => {
  const K = PP.K, M = K.M, P = PP.Puma = {};
  const INK = "#1a120c";
  /* the crest: a puma's head on a brass medallion, 24 square */
  const HEAD = [
    "..KK........KK..",
    ".KdtK......KtdK.",
    ".KttdK....KdttK.",
    ".KtTtdKKKKdtTtK.",
    "..KtTTTTTTTTtK..",
    "..KTTTTTTTTTTK..",
    ".KtTeeTTTTeeTtK.",
    ".KtTKeTTTTeKTtK.",
    ".KttTTTwwTTTttK.",
    "..KtTTwnnwTTtK..",
    "..KdtTwwwwTtdK..",
    "...KdtwKKwtdK...",
    "....KdtwwtdK....",
    ".....KKddKK.....",
  ];
  P.crest = (size = 24) => K.get("crest:" + size, () => {
    const c = K.mk(24, 24), g = c.getContext("2d"), B = M.brass;
    K.disc(g, 12, 12, 11.5, 11.5, INK); K.disc(g, 12, 12, 10.5, 10.5, B[2]); K.disc(g, 11.5, 11.5, 10, 10, B[1]); K.disc(g, 12, 12, 9, 9, "#16213a");
    for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) if (Math.hypot(x - 12, y - 12) < 9 && K.bayer(x, y) > 0.82) K.px(g, x, y, "#1f2c48");
    const head = K.map(HEAD, { K: INK, d: M.puma[3], t: M.puma[2], T: M.puma[1], w: M.puma[0], e: "#d8c05a", n: "#c9877a" });
    g.drawImage(head, 4, 6);
    if (size === 24) return c;
    const o = K.mk(size, size), og = o.getContext("2d"); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, size, size); return o;
  });
  /* the crest as a picture for the page's sheets */
  P.crestURL = (size = 48) => { const k = "crestURL:" + size; return P[k] || (P[k] = P.crest(size).toDataURL()); };
})();
