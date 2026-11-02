import { readdir } from "node:fs/promises";
import path from "node:path";
import { log } from "node:console";

// An extensionless import must resolve to one unique source module on both
// case-sensitive and case-insensitive filesystems (including .ts vs .tsx).
const modules = new Map();
const collisions = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (
      /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      const key = file.replace(/\.(?:ts|tsx|js|jsx|mjs)$/, "").toLowerCase();
      const previous = modules.get(key);
      if (previous) collisions.push(`${previous} / ${file}`);
      else modules.set(key, file);
    }
  }
}
await visit("src");
if (collisions.length) {
  throw new Error(`Ambiguous source module paths:\n${collisions.join("\n")}`);
}
log(`Checked ${modules.size} unambiguous source module paths.`);
