/** Syntax check: src/game.js parses cleanly. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const src = fs.readFileSync(path.resolve(__dirname, "..", "src", "game.js"), "utf8");
new vm.Script(src);   // throws on syntax error
console.log(`PASS  syntax  (${src.length} bytes)`);
