/** Score & day/night: rate ~Chrome's, milestone flash fires, night palette flips. */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot();
  await new Promise((r) => setTimeout(r, 5));

  // Autopilot keeps the dino alive so we can measure a long stretch.
  g.key("KeyA");

  // 1) score rate: ~10 pts/sec at base speed -> ~100 pts per 600 frames
  const s0 = g.state.GAME.score;
  g.pump(600);
  const gained = g.state.GAME.score - s0;
  if (gained < 60 || gained > 140) throw new Error(`score rate off: ${gained.toFixed(1)} pts/600f`);

  // 2) milestone flash triggers when crossing 100
  let flashed = false;
  for (let i = 0; i < 300 && !flashed; i++) { g.pump(1); if (g.state.GAME.flash > 0) flashed = true; }
  if (!flashed) throw new Error("no milestone flash after crossing 100");

  // 3) night mode: jump to deep-night phase, palette ink must be light
  g.state.GAME.score = 780;                     // 780 % 1200 -> night window
  g.pump(2);
  const ink = g.state.PAL.ink;
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  if (r + gg + b < 400) throw new Error(`night ink too dark: ${ink}`);

  console.log(`PASS  score    (${gained.toFixed(0)} pts/600f, flash OK, night ink ${ink})`);
})().catch((e) => { console.error("FAIL  score:", e.message); process.exit(1); });
