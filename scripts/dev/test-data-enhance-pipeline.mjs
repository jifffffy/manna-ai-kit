#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs");
const errors = [];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-review-"));

try {
  const clean = write("clean.csv", [
    "from,to,reason,strength,confidence,status",
    'a,b,"influenced by",0.8,0.9,approved',
    'c,d,"studied with",0.7,0.8,APPROVED'
  ]);
  const pending = write("pending.csv", [
    "from,to,reason,strength,confidence,status",
    'a,b,"influenced by",0.8,0.9,approved',
    'c,d,"studied with",0.7,0.8,pending'
  ]);
  const badStatus = write("bad-status.csv", [
    "from,to,reason,confidence,status",
    'a,b,"x",0.9,maybe'
  ]);
  const missingColumn = write("missing-column.csv", [
    "from,to,confidence,status",
    'a,b,0.9,pending'
  ]);
  const duplicate = write("duplicate.csv", [
    "from,to,reason,confidence,status",
    'a,b,"x",0.9,approved',
    'a,b,"y",0.8,approved'
  ]);
  const badNumber = write("bad-number.csv", [
    "from,to,reason,confidence,status",
    'a,b,"x",1.5,approved'
  ]);

  const cleanReview = run(["--csv", clean, "--key", "from,to", "--mode", "review"]);
  check(cleanReview.status === 0, `clean review must pass:\n${cleanReview.stdout}${cleanReview.stderr}`);
  check(cleanReview.stdout.includes("approved: 2"), "clean review must count approved rows");
  check(cleanReview.stdout.includes("pending: 0"), "clean review must report zero pending rows");

  const cleanApply = run(["--csv", clean, "--key", "from,to", "--mode", "apply"]);
  check(cleanApply.status === 0, `clean apply must pass:\n${cleanApply.stdout}${cleanApply.stderr}`);

  const pendingReview = run(["--csv", pending, "--key", "from,to", "--mode", "review"]);
  check(pendingReview.status === 0, "pending rows must pass review mode");
  check(pendingReview.stdout.includes("pending: 1"), "review must count pending rows");

  const pendingApply = run(["--csv", pending, "--key", "from,to", "--mode", "apply"]);
  check(pendingApply.status === 1, "pending rows must fail apply mode");
  check(pendingApply.stdout.includes("apply blocked"), "apply must explain the pending gate");
  check(pendingApply.stdout.includes("line 3"), "apply must name the pending row line");

  const badStatusResult = run(["--csv", badStatus, "--key", "from,to", "--mode", "review"]);
  check(badStatusResult.status === 1, "unknown status must fail");
  check(badStatusResult.stdout.includes('unknown status "maybe"'), "unknown status must be named");

  const missing = run(["--csv", missingColumn, "--key", "from,to", "--mode", "review"]);
  check(missing.status === 1, "missing required column must fail");
  check(missing.stdout.includes('missing required column "reason"'), "missing column must be named");

  const duplicateResult = run(["--csv", duplicate, "--key", "from,to", "--mode", "review"]);
  check(duplicateResult.status === 1, "duplicate key must fail");
  check(duplicateResult.stdout.includes("duplicate key a/b"), "duplicate key must be named");

  const badNumberResult = run(["--csv", badNumber, "--key", "from,to", "--mode", "review"]);
  check(badNumberResult.status === 1, "out-of-range confidence must fail");
  check(badNumberResult.stdout.includes("confidence must be a number between 0 and 1"), "number error must be named");

  const jsonResult = run(["--csv", clean, "--key", "from,to", "--mode", "apply", "--json"]);
  const summary = JSON.parse(jsonResult.stdout);
  check(jsonResult.status === 0 && summary.ok === true, "--json must report ok");
  check(summary.counts.approved === 2, "--json must report approved counts");
  check(summary.mode === "apply", "--json must report the mode");

  const empty = write("empty.csv", []);
  const emptyResult = run(["--csv", empty, "--mode", "review"]);
  check(emptyResult.status === 1, "an empty CSV must fail");

  const usage = run(["--mode", "review"]);
  check(usage.status === 2, "missing --csv must be a usage error");
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Data enhancement check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: review CSV validation, apply gate, and counts pass");

function write(name, lines) {
  const file = path.join(temp, name);
  fs.writeFileSync(file, lines.length === 0 ? "" : `${lines.join("\n")}\n`);
  return file;
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

function check(condition, message) {
  if (!condition) errors.push(message);
}
