import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ALWAYS_EXCLUDED = new Set([
  ".git",
  "target",
  "node_modules",
  ".idea",
  ".DS_Store",
  ".env",
  "skills.lock"
]);

export function walk(root, options = {}) {
  const excluded = new Set([...ALWAYS_EXCLUDED, ...(options.exclude ?? [])]);
  const files = [];

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (excluded.has(entry.name) || excluded.has(relative)) continue;
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  visit(root);
  return files.sort();
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function computeDigest(root, options = {}) {
  const files = options.files ?? walk(root, options);
  const entries = {};
  for (const relative of files) {
    entries[relative] = sha256File(path.join(root, relative));
  }
  const digest = crypto
    .createHash("sha256")
    .update(files.map((file) => `${file}:${entries[file]}`).join("\n"))
    .digest("hex");
  return { files: entries, digest };
}
