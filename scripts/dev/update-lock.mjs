#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeDigest, walk } from "../../generator/lib/lock.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const LOCK_FILE = path.join(ROOT, "skills.lock");

const excluded = new Set([
  "README.md",
  "skills.lock",
  ".git",
  "node_modules",
  "target",
  ".DS_Store",
  ".env"
]);

const files = walk(ROOT, { exclude: [...excluded] }).filter((file) => {
  return !file.startsWith("evals/") && !file.startsWith(".github/");
});

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const { files: entries, digest } = computeDigest(ROOT, { files });
const lock = {
  schemaVersion: 1,
  version,
  digest,
  generatedAt: new Date().toISOString(),
  files: entries
};

if (CHECK) {
  if (!fs.existsSync(LOCK_FILE)) {
    console.error("skills.lock is missing; run npm run lock");
    process.exit(1);
  }
  const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  if (existing.digest !== digest || existing.version !== version) {
    const changed = files.filter((file) => existing.files?.[file] !== entries[file]);
    console.error(`skills.lock is stale. Changed files:`);
    for (const file of changed.slice(0, 20)) console.error(`- ${file}`);
    if (changed.length > 20) console.error(`- … ${changed.length - 20} more`);
    process.exit(1);
  }
  console.log(`OK: skills.lock is fresh (${files.length} files)`);
} else {
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + "\n");
  console.log(`Wrote skills.lock: ${files.length} files, digest ${digest.slice(0, 12)}`);
}
