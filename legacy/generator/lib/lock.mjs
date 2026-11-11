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

export function writeProjectLock(root) {
  const files = walk(root, {
    exclude: [".manna/lock.json", ".manna/state.json", ".manna/pipeline-applied.txt", "data"]
  });
  const { files: entries, digest } = computeDigest(root, { files });
  const lock = {
    schemaVersion: 1,
    version: projectVersion(root),
    digest,
    files: entries
  };
  const target = path.join(root, ".manna", "lock.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(lock, null, 2) + "\n");
  return lock;
}

export function checkProjectLock(root) {
  const target = path.join(root, ".manna", "lock.json");
  if (!fs.existsSync(target)) {
    return { ok: false, reason: ".manna/lock.json is missing; run the lock command" };
  }
  const existing = JSON.parse(fs.readFileSync(target, "utf8"));
  const files = walk(root, {
    exclude: [".manna/lock.json", ".manna/state.json", ".manna/pipeline-applied.txt", "data"]
  });
  const { files: entries, digest } = computeDigest(root, { files });
  if (existing.digest !== digest) {
    const changed = files.filter((file) => existing.files?.[file] !== entries[file]);
    return {
      ok: false,
      reason: `lock is stale; changed files: ${changed.slice(0, 10).join(", ")}${changed.length > 10 ? "…" : ""}`
    };
  }
  return { ok: true };
}

function projectVersion(root) {
  const specFile = path.join(root, ".manna", "project.spec.json");
  if (!fs.existsSync(specFile)) return "0.0.0";
  try {
    return JSON.parse(fs.readFileSync(specFile, "utf8")).project?.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
