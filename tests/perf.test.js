/** Perf budget: peak canvas ops per frame must stay well under the 60fps limit. */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot();
  await new Promise((r) => setTimeout(r, 5));
  g.key("Space"); g.key("Space", "keyup");

  let peak = 0;
  for (let i = 0; i < 3600; i++) {              // one minute of play
    g.calls.count = 0;
    g.pump(1);
    if (g.calls.count > peak) peak = g.calls.count;
  }
  if (peak > 2000) throw new Error(`peak ${peak} ops/frame exceeds 2000 budget`);
  console.log(`PASS  perf     (peak ${peak} canvas ops/frame, budget 2000)`);
})().catch((e) => { console.error("FAIL  perf:", e.message); process.exit(1); });
