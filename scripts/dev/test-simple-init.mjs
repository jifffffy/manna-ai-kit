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

  const workspace = work;
  const checkout = path.join(workspace, "urbot");
  const first = run(["init", "design the travel domain", "--repo", source], work);
  check(
    fs.realpathSync(first.workspace) === fs.realpathSync(workspace),
    "first run must use the current directory"
  );
  check(first.source.repository === source, "first run must use the repository override");
  check(first.source.requestedRef === "refs/tags/v0.2.0", "first run must select the highest tag");
  check(
    first.source.resolvedCommit === git(["-C", source, "rev-parse", "v0.2.0"]).trim(),
    "first run must record the tag commit"
  );
  check(
    fs.realpathSync(first.source.directory) === fs.realpathSync(checkout),
    "default checkout must be <workspace>/urbot"
  );
  check(first.kit.copied.includes("AGENTS.md"), "workspace AGENTS.md must be generated");
  check(first.kit.copied.includes("openspec/config.yaml"), "openspec config must be copied");
  check(
    first.kit.copied.includes(".opencode/skills/urbot-router/SKILL.md"),
    "Manna skills must be copied into .opencode/skills"
  );
  assertWorkspace(workspace, checkout);
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

  const agentFile = path.join(workspace, "skills/urbot-router/SKILL.md");
  fs.appendFileSync(agentFile, "\nMODIFIED\n");
  const noteFile = path.join(workspace, "user-note.txt");
  fs.writeFileSync(noteFile, "keep me\n");
  const forced = run(["init", "add a weather tool", "--force"], work);
  check(!fs.readFileSync(agentFile, "utf8").includes("MODIFIED"), "--force must refresh copied kit files");
  check(fs.existsSync(noteFile), "--force must keep files outside the copy set");
  check(forced.kit.copied.includes("AGENTS.md"), "--force must refresh the workspace AGENTS.md");

  const customWorkspace = path.join(temp, "custom-workspace");
  const custom = run(
    ["init", "run the regression tests", "--workspace", customWorkspace, "--repo", `${source}-moved`],
    work
  );
  check(
    fs.realpathSync(custom.workspace) === fs.realpathSync(customWorkspace),
    "--workspace must choose the workspace root"
  );
  check(
    fs.realpathSync(custom.source.directory) === fs.realpathSync(path.join(customWorkspace, "urbot")),
    "custom workspace must keep the checkout inside it"
  );

  const externalDir = path.join(temp, "external-checkout");
  const externalWorkspace = path.join(temp, "external-workspace");
  const external = run(
    [
      "init",
      "run the regression tests",
      "--workspace",
      externalWorkspace,
      "--dir",
      externalDir,
      "--repo",
      `${source}-moved`
    ],
    work
  );
  check(
    fs.realpathSync(external.source.directory) === fs.realpathSync(externalDir),
    "--dir must control the checkout"
  );
  const externalAgents = fs.readFileSync(path.join(externalWorkspace, "AGENTS.md"), "utf8");
  check(externalAgents.includes(externalDir), "external checkout must be absolute in AGENTS.md");

  const localHelp = spawnSync(process.execPath, [path.join(workspace, "generator/manna.mjs"), "--help"], {
    cwd: workspace,
    encoding: "utf8"
  });
  check(localHelp.status === 0, "copied generator must run without package.json");
  check(localHelp.stdout.includes("manna init"), "copied generator help must show init");

  const help = run(["init", "--help"], work);
  check(
    Array.isArray(help.usage) && help.usage.some((line) => line.includes("--workspace")),
    "init help must show the workspace option"
  );

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

console.log("OK: workspace init, kit copy, OpenCode discovery, reuse, routing, and read-only behavior pass");

function assertWorkspace(workspace, checkout) {
  const required = [
    "AGENTS.md",
    ".opencode/commands/opsx-propose.md",
    ".opencode/skills/urbot-router/SKILL.md",
    ".opencode/skills/openspec-propose/SKILL.md",
    "skills/urbot-router/SKILL.md",
    "workflows/urbot-domain-design.md",
    "policies/tool-safety.md",
    "shared/SKILL-template.md",
    "docs/architecture.md",
    "generator/manna.mjs",
    "skills.json",
    ".well-known/agent-skills/index.json",
    ".claude-plugin/plugin.json",
    "openspec/config.yaml",
    "openspec/specs/urbot-inspect-and-route/spec.md",
    "urbot/pom.xml"
  ];
  for (const relative of required) {
    check(fs.existsSync(path.join(workspace, relative)), `workspace missing ${relative}`);
  }

  for (const relative of ["scripts/dev", "evals", "package.json", "skills.lock", "openspec/changes"]) {
    check(!fs.existsSync(path.join(workspace, relative)), `workspace must not copy ${relative}`);
  }

  const agents = fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8");
  check(agents.includes("./urbot"), "AGENTS.md must point at ./urbot");
  check(agents.includes("skills/urbot-router"), "AGENTS.md must point at the local router");
  check(agents.includes("openspec"), "AGENTS.md must name the OpenSpec root");
  check(!agents.includes("scripts/dev"), "AGENTS.md must not mention kit maintenance");

  const gitignore = fs.readFileSync(path.join(workspace, ".gitignore"), "utf8");
  check(gitignore.includes(".manna-run/"), "workspace .gitignore must ignore .manna-run");
  check(gitignore.includes("urbot/"), "workspace .gitignore must ignore the nested checkout");

  check(fs.existsSync(path.join(checkout, "pom.xml")), "checkout must be a Urbot checkout");
}

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
