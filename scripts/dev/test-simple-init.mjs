#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { URBOT_REPO } from "../../generator/urbot/init.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-init-"));

try {
  const source = path.join(temp, "urbot-source");
  const work = path.join(temp, "work");
  fs.mkdirSync(work, { recursive: true });
  createSource(source);

  const checkout = path.join(work, "urbot");
  const first = run(["init", "design the travel domain", "--repo", source], work);
  check(first.source.repository === source, "first run must use the repository override");
  check(first.source.requestedRef === "refs/tags/v0.2.0", "first run must select the highest tag");
  check(
    first.source.resolvedCommit === git(["-C", source, "rev-parse", "v0.2.0"]).trim(),
    "first run must record the tag commit"
  );
  check(
    fs.realpathSync(first.source.directory) === fs.realpathSync(checkout),
    "default checkout must be ./urbot"
  );
  check(first.inspection.route === "urbot-domain-design", "first request must route to domain design");
  check(first.inspection.skills.includes("urbot-domain-design"), "domain design skill must be in the route");
  check(!fs.existsSync(path.join(checkout, "src/main/java/com/embabel/bot/travel/domain")), "init must not apply");
  check(gitStatus(checkout) === "", "first run must leave the checkout clean");

  fs.renameSync(source, `${source}-moved`);
  const before = gitStatus(checkout);
  const second = run(["init", "add a weather tool"], work);
  check(second.source.resolvedCommit === first.source.resolvedCommit, "reuse must keep the resolved commit");
  check(second.source.requestedRef === "refs/tags/v0.2.0", "reuse must report the checked-out tag");
  check(second.inspection.route === "urbot-tool-development", "second request must route to tool development");
  check(gitStatus(checkout) === before, "reuse must not change the checkout");
  check(!fs.existsSync(path.join(checkout, "src/main/java/com/embabel/bot/travel")), "init must not apply tools");

  const ambiguous = run(["init", "Make it better"], work);
  check(ambiguous.inspection.route === null, "ambiguous request must not select a route");
  check(Boolean(ambiguous.inspection.question), "ambiguous request must ask one question");

  const help = run(["init", "--help"], work);
  check(Array.isArray(help.usage) && help.usage.some((line) => line.includes("manna init")), "init help must show the one-step form");

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  check(JSON.stringify(Object.keys(pkg.bin ?? {})) === JSON.stringify(["manna"]), "only the manna bin must be exposed");
  check(pkg.bin.manna === "generator/manna.mjs", "manna bin must point at the CLI");
  check(URBOT_REPO === "https://github.com/jifffffy/urbot", "default repository must be the fixed Urbot repo");
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Simple init check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: simple init defaults, tag selection, reuse, routing, and read-only behavior pass");

function createSource(source) {
  fs.mkdirSync(path.join(source, "src", "main", "java", "com", "embabel", "urbot"), { recursive: true });
  fs.writeFileSync(path.join(source, "pom.xml"), "<project/>\n");
  fs.writeFileSync(
    path.join(source, "src", "main", "java", "com", "embabel", "urbot", "UrbotApplication.java"),
    "package com.embabel.urbot;\npublic class UrbotApplication {}\n"
  );
  git(["init", "-q"], source);
  git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "add", "-A"], source);
  git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "initial"], source);
  git(["tag", "v0.1.0"], source);
  fs.writeFileSync(path.join(source, "CHANGELOG.md"), "second\n");
  git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "add", "-A"], source);
  git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "second"], source);
  git(["tag", "v0.2.0"], source);
}

function run(args, cwd) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "generator/manna.mjs"), ...args], {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`init failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function gitStatus(dir) {
  return git(["-C", dir, "status", "--porcelain"]).trim();
}

function check(condition, message) {
  if (!condition) errors.push(message);
}
