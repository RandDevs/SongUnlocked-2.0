import { readFileSync } from "node:fs";
import { join } from "node:path";

function parsePrecacheManifest(pkg) {
  const swPath = join(process.cwd(), pkg, "dist", "sw.js");
  const swContent = readFileSync(swPath, "utf8");
  const match = swContent.match(/precacheAndRoute\((\[.*?\])\s*,\s*\{/s);
  if (!match) return { package: pkg, count: 0, urls: [] };

  const entriesRaw = match[1];
  const validJson = entriesRaw
    .replace(/url:/g, '"url":')
    .replace(/revision:/g, '"revision":');

  const entries = JSON.parse(validJson);
  const uniqueUrls = Array.from(new Set(entries.map((e) => e.url)));
  return {
    package: pkg,
    count: uniqueUrls.length,
    urls: uniqueUrls,
  };
}

console.log("=== VANILLA PRECACHE MANIFEST ===");
console.log(JSON.stringify(parsePrecacheManifest("vanilla"), null, 2));

console.log("\n=== REACT PRECACHE MANIFEST ===");
console.log(JSON.stringify(parsePrecacheManifest("react"), null, 2));
