/** Autopilot endurance: 6 simulated minutes, bot must run endlessly & recover. */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot();
  await new Promise((r) => setTimeout(r, 5));
  g.pump(3);
  g.key("KeyA");                 // enable autopilot (starts the run)

  let crashes = 0, prevOver = false, best = 0, stuckFrames = 0;
  for (let i = 0; i < 60 * 360; i++) {          // 6 minutes @60fps
    g.pump(1);
    const s = g.state;
    best = Math.max(best, s.GAME.score);
    if (s.GAME.over && !prevOver) crashes++;
    if (s.GAME.over) stuckFrames++;
    prevOver = s.GAME.over;
  }
  if (stuckFrames >= 600) throw new Error(`bot stuck (${stuckFrames} game-over frames)`);
  console.log(`PASS  auto     (crashes=${crashes} best=${Math.floor(best)} paused=${stuckFrames}f)`);
})().catch((e) => { console.error("FAIL  auto:", e.message); process.exit(1); });
