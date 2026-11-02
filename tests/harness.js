/**
 * Browser-environment harness for headless-testing the dino game.
 *
 * Stubs out DOM/canvas/timers so `src/game.js` can run under plain Node.
 * Every test file requires this; it exports:
 *   boot(opts) -> { pump, key, fire, state } where state exposes live game internals
 */
"use strict";

const fs = require("fs");
const path = require("path");

const GAME_JS = path.resolve(__dirname, "..", "src", "game.js");

function makeCtxStub(record) {
  return new Proxy({}, {
    get(_t, p) {
      if (p === "canvas") return { width: 900, height: 300 };
      if (typeof p === "string" && p.startsWith("create")) {
        return () => ({ addColorStop() {} });
      }
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(1233 * 68 * 4) });
      if (p === "putImageData" || p === "createImageData") {
        return () => ({ data: new Uint8ClampedArray(1233 * 68 * 4) });
      }
      return (...args) => { if (record) record(p, args); };
    },
    set() { return true; },
  });
}

function boot(opts = {}) {
  const src = fs.readFileSync(GAME_JS, "utf8");
  const listeners = {};
  const rafQueue = [];
  const calls = { count: 0 };

  const ctxStub = makeCtxStub((p) => { calls.count++; });

  const stageRect = opts.stageRect || { width: 900, height: 300 };
  const canvasEl = {
    width: opts.canvasSize ? opts.canvasSize[0] : 900,
    height: opts.canvasSize ? opts.canvasSize[1] : 300,
    getContext: () => ctxStub,
    style: {},
    getBoundingClientRect: () => stageRect,
  };

  global.window = {
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    devicePixelRatio: opts.devicePixelRatio || 1,
  };
  global.document = {
    getElementById: (id) => {
      if (id === "game") return canvasEl;
      if (id === "stage") {
        return {
          getBoundingClientRect: () => stageRect,
          requestFullscreen: () => Promise.resolve(),
        };
      }
      // buttons + anything else
      return { classList: { toggle() {} }, textContent: "", addEventListener() {} };
    },
    createElement: () => {
      const c = { width: 0, height: 0, getContext: () => ctxStub, style: {} };
      return c;
    },
    body: { style: {} },
  };
  global.Image = class {
    constructor() { this.complete = true; this.naturalWidth = 1233; }
    set src(v) { this._src = v; if (this.onload) setTimeout(() => this.onload(), 0); }
    get src() { return this._src; }
  };
  global.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
  global.localStorage = {
    _store: {},
    getItem: (k) => global.localStorage._store[k] ?? null,
    setItem: (k, v) => { global.localStorage._store[k] = String(v); },
  };

  // Expose internals for assertions by appending a hook inside the IIFE.
  // Insert the state hook just BEFORE the IIFE's final closer so it stays in scope.
  const trimmed = src.trimEnd();
  const closer = "()();".replace("()()", "})();");   // avoid confusing editors
  if (!trimmed.endsWith("})();")) throw new Error("game.js does not end with })();");
  const body = trimmed.slice(0, trimmed.lastIndexOf("})();"));
  // Use getters for values the game reassigns each frame (PAL, SPEED, ...),
  // plain references for stable objects.
  const hooked = body +
    "globalThis.__state = { GAME, DINO, obstacles, AUTO, setAuto, restart, " +
    "isStarted: () => gameStarted, " +
    "get SPEED() { return SPEED; }, get PAL() { return PAL; }, " +
    "get INK() { return INK; } };\n})();\n";

  eval(hooked);

  const pump = (n = 1) => {
    for (let i = 0; i < n; i++) {
      const q = rafQueue.splice(0);   // take pending frames (leave queue open)
      if (!q.length) throw new Error("render loop died — no rAF scheduled");
      q.forEach((fn) => fn());
    }
  };
  const key = (code, type = "keydown") => {
    (listeners[type] || []).forEach((f) => f({ code, preventDefault() {} }));
  };
  const fire = (ev, obj = {}) => {
    (listeners[ev] || []).forEach((f) => f(obj));
  };

  return { pump, key, fire, listeners, calls, state: globalThis.__state };
}

module.exports = { boot };
