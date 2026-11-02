/** Smoke test: boot, play (jump/duck), crash, restart — no errors, loop alive. */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot();
  await new Promise((r) => setTimeout(r, 5));   // let the sprite Image "load"

  g.pump(30);                    // idle world
  g.key("Space"); g.key("Space", "keyup");   // start + jump
  g.pump(200);
  g.key("ArrowDown");            // duck
  g.pump(60);
  g.key("ArrowDown", "keyup");
  g.pump(400);                   // long run -> obstacles pass / collide
  g.key("Space");                // restart attempt
  g.pump(120);

  const s = g.state;
  if (!s) throw new Error("state hook missing");
  console.log(`PASS  smoke    (score=${Math.floor(s.GAME.score)} over=${s.GAME.over})`);
})().catch((e) => { console.error("FAIL  smoke:", e.message); process.exit(1); });
