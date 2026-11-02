/** Cactus integrity: multi-stem groups must be stems × pitch wide (no sliced art). */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot();
  await new Promise((r) => setTimeout(r, 5));
  g.key("Space"); g.key("Space", "keyup");     // start the run

  let checked = 0;
  for (let i = 0; i < 2000 && checked < 25; i++) {
    g.pump(1);
    for (const o of g.state.obstacles) {
      if (!o.flying) {
        const expect = (o.stems || 1) * (o.pitch || 17);
        if (o.w !== expect) throw new Error(`group w=${o.w} != stems*pitch=${expect}`);
        checked++;
      }
    }
  }
  if (checked < 5) throw new Error("not enough cacti spawned to verify");
  console.log(`PASS  cactus   (${checked} groups verified, widths exact)`);
})().catch((e) => { console.error("FAIL  cactus:", e.message); process.exit(1); });
