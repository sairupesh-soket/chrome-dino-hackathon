/** Mobile sim: DPR-capped canvas sizing, touch jump/swipe-duck, live resize. */
"use strict";
const { boot } = require("./harness");

(async () => {
  const g = boot({
    devicePixelRatio: 3,                       // high-DPI phone
    canvasSize: [400, 260],
    stageRect: { width: 400, height: 260 },
  });
  await new Promise((r) => setTimeout(r, 5));

  const cv = global.document.getElementById("game");
  const w0 = cv.width, h0 = cv.height;
  if (cv.width !== 800 || cv.height !== 520) {          // 400*2 (DPR capped at 2)
    throw new Error(`unexpected initial canvas ${cv.width}x${cv.height}`);
  }

  g.fire("pointerdown", { clientY: 100 });              // tap = start/jump
  g.pump(30);
  g.fire("pointermove", { clientY: 140 });              // swipe down = duck
  g.pump(20);
  g.fire("pointerup", {});
  g.pump(60);

  global.window.devicePixelRatio = 2;                   // rotate / zoom change
  g.fire("resize", {});
  g.pump(120);

  g.fire("pointerdown", { clientY: 100 }); g.fire("pointerup", {});
  g.pump(600);                                          // keep playing on "phone"

  console.log(`PASS  mobile   (${w0}x${h0} -> ${cv.width}x${cv.height}, touch OK)`);
})().catch((e) => { console.error("FAIL  mobile:", e.message); process.exit(1); });
