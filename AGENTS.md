# AGENTS.md — Build Guide & Workflow Notes

This file documents how this project was built, the key decisions made along the way,
and the workflow rules any future contributor (human or AI agent) should follow.
It exists so the *why* behind the code survives longer than the conversation that
produced it.

> **Project:** Chrome Dino — Remastered (`dino-game.html` / `src/`)
> **Built:** November 2026, in a single agent session, step-by-step with user sign-off
> at each stage.

---

## 1. How this project was built

The game was developed in **numbered steps**, each verified before moving on:

| Step | Deliverable | Key lesson |
|---|---|---|
| 1 | Scene: canvas, ground, clouds | Fixed logical resolution; CSS scales it |
| 2 | The dino | Started as hand-drawn rectangles → replaced with real Chromium sprites after pixel analysis. **Hand-drawn approximations of famous art always lose; extract the real thing.** |
| 3 | Jump physics + speed ramp | Sign conventions documented inline (`y` = height above ground, velocity positive = up). A sign bug once made jumping impossible. |
| 4 | Obstacles + collision + game over | Sprite cells located by dumping pixels and identifying frames by their legs/eye. Cactus groups are *stitched* from single stems at natural pitch — cropping wider slices visibly sliced arms. |
| 5 | Score, high score, day/night | Scoring rate derived from Chrome's (~10 pts/sec at base speed = `SPEED/36` per frame). |
| — | Visual spectacle | Sky cycle via piecewise palette interpolation; see §3. |
| — | Autopilot bot | Same physics as the player; crashes sometimes *by design*. |
| — | Fullscreen + mobile | DPR-capped responsive canvas; touch gestures via pointer events. |

### The debugging stories worth remembering

These bugs cost real time and each left a rule behind:

1. **The invisible eye.** The tint-blitter used one `source-in` fill, which recolors
   *every opaque pixel* — erasing the eye (encoded as light-gray pixels inside the dark
   head). The duck's eye survived only because it's a transparent hole, not a light
   pixel — that asymmetry was the clue. **Rule: when compositing layers, tint each
   layer in its own isolated buffer.**

2. **The blank page.** A splice script ran twice, leaving a duplicate `const obstacles`
   declaration → instant `SyntaxError` → dead page. Bracket-counting checks did NOT
   catch it. **Rule: verify JS with a real parser (`node --check` / `vm.Script`),
   never with character counting.** This is also why the test suite exists.

3. **The frozen autopilot.** Auto-restart used `setTimeout`, which the synchronous
   test harness never yields to. Replaced with a frame-countdown. **Rule: gameplay
   logic must not depend on wall-clock timers; drive everything from the frame loop.**

4. **The misidentified run frames.** Sprite cells were guessed from ink-column runs;
   the dino strip has no gaps between frames, so guesses merged cells and "running"
   showed stand ↔ glitched-stand. Fixed by dumping each candidate cell's *legs* and
   matching against Chromium's documented offsets. **Rule: identify sprite frames by
   their distinguishing features (legs, eye), not by whitespace.**

---

## 2. Workflow rules for this repo

### Making changes

- **Edit `src/`, never `dino-game.html`.** The standalone file is *generated*:

  ```bash
  python3 - <<'EOF'
  html = open('src/index.html').read()
  css  = open('src/style.css').read()
  js   = open('src/game.js').read()
  out = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}</style>')
  out = out.replace('<script src="game.js"></script>', f'<script>\n{js}</script>')
  open('dino-game.html','w').write(out)
  EOF
  ```

  (A build script should replace this inline snippet if it's needed more often.)

- **Run the tests after every change:**

  ```bash
  tests/run.sh node
  ```

  The suite is zero-dependency; it needs only a Node binary. If you don't have Node
  locally, any Node ≥ 14 works — the harness uses no modern APIs beyond ES2020
  optional chaining.

- **Regenerate screenshots** if visual behavior changes (see §4).

### Adding features

- Keep the game a **single IIFE with no module system** — that constraint is what
  makes the headless test harness possible (it evals the source with DOM stubs).
  If the file ever grows past comfortable, split *then*, and update the harness
  accordingly.
- New palettes/visual phases: add to `PAL_KEYS` and mirror in `NIGHT_KEYS`.
- New obstacles: extend `SPR`, then `spawnObstacle()` — store `stems`/`pitch` for
  anything multi-part so the cactus test covers it.
- Anything gameplay-timed: count frames, don't use `setTimeout`.

### Testing philosophy

- Tests assert **observable behavior**: score rates, hitbox widths, palette colors,
  canvas-op budgets — not implementation details.
- The state hook lives in `tests/harness.js`, injected before the IIFE's final
  closer. Values reassigned per-frame (`PAL`, `SPEED`, `INK`) MUST be exposed as
  getters, or tests read stale references (this bit us once).

---

## 3. Technical reference

### Sprite sheet map (official 1× `offline-sprite.png`, 1233×68)

Located by pixel analysis; offsets are `[x, y, w, h]` in sheet coordinates:

```
CLOUD         x=2    y=2   w=36 h=28
PTERO frame1  x=134  y=2   w=46 h=40   (ink y8..41)
PTERO frame2  x=182  y=2   w=44 h=30   (ink y2..31)
CACTUS_SMALL  x=332  y=2   w=17 h=35   (single stem; groups stitch at 17px pitch)
CACTUS_LARGE  x=382  y=2   w=25 h=47   (single stem; groups stitch at 25px pitch)
DINO stand    x=848  y=2   w=44 h=47
DINO blink    x=892  y=2   w=44 h=47
DINO run1     x=936  y=2   w=44 h=47   (right leg lifted)
DINO run2     x=980  y=2   w=44 h=47   (left leg lifted)
DINO crash    x=1068 y=2   w=44 h=47
DINO duck1    x=1112 y=19  w=59 h=30
DINO duck2    x=1171 y=19  w=59 h=30
```

Tone encoding: body ink = gray value 83; highlights/eye = gray 247+ (the run/stand
eye is *white pixels*; the duck eye is a *transparent hole* — they differ!).

### Tuning constants (all in `src/game.js`)

| Constant | Value | Meaning |
|---|---|---|
| `BASE_SPEED` | 6 px/frame | starting world speed |
| `MAX_SPEED` | 13 px/frame | cap |
| `GRAVITY` | 0.6 px/f² | jump arc |
| `JUMP_VEL` | 11 px/frame | apex ≈ 106 px, airtime ≈ 0.62 s |
| `CYCLE` | 1200 pts | full day→night→day cycle |
| score rate | `SPEED/36` per frame | ≈ 10 pts/sec at base speed |

### Day/night palette phases

`skyPhase = (score % CYCLE) / CYCLE`, interpolated across keyframes:
day (0–0.38) → sunset (0.48) → night (0.53–0.88) → dawn (0.93) → day (1.0).

---

## 4. Regenerating assets

Screenshots are captured with headless Chrome driven by a dev-only URL hook in
`game.js` (`?shot=day|night|auto|over&advance=N`). The hook self-disables outside a
browser (`typeof location === "undefined"` guard), so tests are unaffected.

```bash
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --screenshot="assets/screenshot-night.png" --window-size=1200,500 \
  --virtual-time-budget=5000 \
  "file:///$PWD/src/index.html?shot=night&advance=300"
```

Verify captures programmatically (sky brightness, text bands, button color) — don't
trust that a screenshot "looks right" without checking pixels.

---

## 5. Known limitations / future work

- No audio (jump blip + milestone ding would be easy WebAudio additions)
- Autopilot occasionally mistimes tight gaps at max speed — intentional, but a
  lookahead window could make it flawless if desired
- The `?shot=` hook fast-forwards by calling `update()` N times synchronously;
  particle-heavy states may look slightly different than real-time play
- No PWA manifest (installable app icon) yet
