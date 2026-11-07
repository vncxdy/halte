const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function load(file, exportsText) {
  const source = fs.readFileSync(path.join(__dirname, "../src/services", file), "utf8")
    .replace(/export function /g, "function ")
    .replace(/export \{[^}]+\};?/g, "");
  const module = { exports: {} };
  new Function("module", "exports", source + `\nmodule.exports = { ${exportsText} };`)(module, module.exports);
  return module.exports;
}

const theme = load("theme.js", "resolveTheme");
assert.equal(theme.resolveTheme("light", true), "light");
assert.equal(theme.resolveTheme("dark", false), "dark");
assert.equal(theme.resolveTheme("system", true), "dark");

const favorites = load("favorites.js", "favoriteKey, toggleFavorite");
const route = { kind: "route", id: "1", name: "Koridor 1" };
let saved = favorites.toggleFavorite([], route);
assert.equal(saved.length, 1);
assert.equal(favorites.toggleFavorite(saved, route).length, 0);
assert.equal(favorites.favoriteKey(route), "route:1");

console.log(JSON.stringify({ passed: true, cases: 6 }));