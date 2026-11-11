#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addSlice, initProject } from "../generator/lib/generate.mjs";
import { validateProject } from "../generator/lib/validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-compile-"));

try {
  const projectDir = path.join(tmp, "session-scout");
  initProject(path.join(ROOT, "examples/example.spec.json"), projectDir);
  addSlice(projectDir, path.join(ROOT, "examples/save-to-agenda.slice.json"));
  addSlice(projectDir, path.join(ROOT, "examples/curate-sessions.slice.json"));

  const validation = validateProject(projectDir);
  if (!validation.ok) {
    throw new Error(`validation failed:\n${validation.errors.join("\n")}`);
  }

  const result = spawnSync("./mvnw", ["-q", "-DskipTests", "compile"], {
    cwd: projectDir,
    stdio: "inherit",
    env: { ...process.env }
  });

  if (result.error) {
    throw new Error(`cannot run mvnw: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`mvnw compile failed with status ${result.status}`);
  }

  console.log(`OK: generated project compiles at ${projectDir}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
