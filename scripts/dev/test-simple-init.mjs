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
  const parent = path.join(temp, "parent");
  fs.mkdirSync(parent, { recursive: true });
  createSource(source);

  const workspace = path.join(parent, "demo");
  const first = run(["init", "demo", "--repo", source], parent);
  check(
    fs.realpathSync(first.workspace) === fs.realpathSync(workspace),
    "init must resolve the project name to a directory"
  );
  check(first.source.repository === source, "first run must use the repository override");
  check(first.source.requestedRef === "refs/tags/v0.2.0", "first run must select the highest tag");
  check(
    first.source.resolvedCommit === git(["-C", source, "rev-parse", "v0.2.0"]).trim(),
    "first run must record the tag commit"
  );
  check(
    fs.realpathSync(first.source.directory) === fs.realpathSync(workspace),
    "the project directory must be the Urbot checkout"
  );
  check(first.entry === "AGENTS.md", "entry must be AGENTS.md");
  check(first.next.includes(workspace), "next must name the workspace to open");
  check(!("inspection" in first), "init must not return an inspection");
  check(first.kit.copied.includes("AGENTS.md"), "workspace AGENTS.md must be generated");
  check(!first.kit.copied.some((entry) => entry.startsWith("openspec/")), "openspec must not be copied");
  check(
    first.kit.copied.includes(".opencode/skills/urbot-router/SKILL.md"),
    "Manna skills must be copied into .opencode/skills"
  );
  check(!fs.existsSync(path.join(workspace, "urbot")), "there must be no nested urbot directory");
  assertWorkspace(workspace);
  assertEntryPoint(workspace);
  assertIgnore(workspace);
  check(gitStatus(workspace) !== "", "the kit copy must show up in git status");

  fs.renameSync(source, `${source}-moved`);
  const before = gitStatus(workspace);
  const second = run(["init", "demo"], parent);
  check(second.source.resolvedCommit === first.source.resolvedCommit, "reuse must keep the resolved commit");
  check(second.source.requestedRef === "refs/tags/v0.2.0", "reuse must report the checked-out tag");
  check(gitStatus(workspace) === before, "reuse must not change the working tree");
  check(
    fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8").includes("FIXTURE-AGENTS-SENTINEL") === false,
    "the fixture AGENTS.md must be replaced"
  );

  const agentFile = path.join(workspace, "skills/urbot-router/SKILL.md");
  fs.appendFileSync(agentFile, "\nMODIFIED\n");
  const noteFile = path.join(workspace, "user-note.txt");
  fs.writeFileSync(noteFile, "keep me\n");
  run(["init", "demo", "--repo", `${source}-moved`], parent);
  check(!fs.readFileSync(agentFile, "utf8").includes("MODIFIED"), "re-running must overwrite kit files");
  check(fs.existsSync(noteFile), "re-running must keep files outside the copy set");

  const pinned = run(["init", "pinned", "--repo", `${source}-moved`, "--ref", "v0.1.0"], parent);
  check(pinned.source.requestedRef === "refs/tags/v0.1.0", "--ref must select the requested tag");
  check(
    pinned.source.resolvedCommit === git(["-C", `${source}-moved`, "rev-parse", "v0.1.0"]).trim(),
    "--ref must record the requested commit"
  );

  const stated = run(["init", "stated", "--repo", `${source}-moved`, "--write-state"], parent);
  check(
    fs.existsSync(path.join(stated.workspace, ".manna-run/source.json")),
    "--write-state must write inside the project"
  );
  check(!gitStatus(stated.workspace).includes(".manna-run"), "run state must be ignored");

  const emptyParent = path.join(temp, "empty-parent");
  fs.mkdirSync(emptyParent);
  const missing = runFail(["init"], emptyParent);
  check(missing.stderr.includes("Usage: manna init <project>"), "missing project must print usage");
  check(fs.readdirSync(emptyParent).length === 0, "missing project must not create files");

  const force = runFail(["init", "demo", "--force"], parent);
  check(force.stderr.includes("Unknown option: --force"), "--force must be rejected");

  const notUrbot = path.join(parent, "noturbot");
  fs.mkdirSync(notUrbot);
  fs.writeFileSync(path.join(notUrbot, "keep.txt"), "keep\n");
  const rejected = runFail(["init", "noturbot"], parent);
  check(rejected.stderr.includes("not a Urbot checkout"), "a non-Urbot directory must be rejected");
  check(fs.readFileSync(path.join(notUrbot, "keep.txt"), "utf8") === "keep\n", "rejection must not write");
  check(!fs.existsSync(path.join(notUrbot, "pom.xml")), "rejection must not clone");

  const kitRoot = runFail(["init", ROOT], parent);
  check(kitRoot.stderr.includes("Manna kit root"), "the kit root must be rejected");

  const localHelp = spawnSync(process.execPath, [path.join(workspace, "generator/manna.mjs"), "--help"], {
    cwd: workspace,
    encoding: "utf8"
  });
  check(localHelp.status === 0, "copied generator must run without package.json");
  check(localHelp.stdout.includes("manna init <project>"), "copied generator help must show the project form");
  check(!localHelp.stdout.includes("--force"), "copied generator must not advertise --force");

  const help = run(["init", "--help"], parent);
  check(
    Array.isArray(help.usage) && help.usage.some((line) => line.includes("--repo")),
    "init help must show the remaining options"
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

console.log("OK: project init, clone/reuse, overwrite copy, one AGENTS.md, and read-only behavior pass");

function assertWorkspace(workspace) {
  const required = [
    "AGENTS.md",
    ".opencode/skills/urbot-router/SKILL.md",
    "skills/urbot-router/SKILL.md",
    "workflows/urbot-domain-design.md",
    "policies/tool-safety.md",
    "shared/SKILL-template.md",
    "docs/architecture.md",
    "generator/manna.mjs",
    "skills.json",
    ".well-known/agent-skills/index.json",
    ".claude-plugin/plugin.json",
    "pom.xml"
  ];
  for (const relative of required) {
    check(fs.existsSync(path.join(workspace, relative)), `workspace missing ${relative}`);
  }

  for (const relative of [
    "scripts/dev",
    "evals",
    "package.json",
    "skills.lock",
    "openspec",
    ".opencode/commands",
    ".opencode/skills/openspec-propose",
    "urbot"
  ]) {
    check(!fs.existsSync(path.join(workspace, relative)), `workspace must not contain ${relative}`);
  }
}

function assertEntryPoint(workspace) {
  const agents = fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8");
  check(agents.includes("Manna Workspace"), "AGENTS.md must be the Manna-owned entry point");
  check(agents.includes("skills/urbot-router"), "AGENTS.md must point at the local router");
  check(agents.includes("Manna workflows"), "AGENTS.md must name the Manna workflow");
  check(!agents.includes("opsx"), "AGENTS.md must not reference the OpenSpec commands");
  check(!agents.includes("./urbot"), "AGENTS.md must not reference a nested checkout");
  check(!agents.includes("FIXTURE-AGENTS-SENTINEL"), "the Urbot AGENTS.md must be replaced");
  check(!fs.existsSync(path.join(workspace, "MANNA.md")), "there must be no second instruction file");

  const tokens = [
    "docker compose",
    "7891",
    "./mvnw",
    "TemplateRenderingTest",
    "ByokFactoryClasspathTest",
    "urbot.bot-packages",
    "context",
    "NullRequestCache",
    "DummyUrbotUserService",
    "PathPatternRequestMatcher",
    "jspecify",
    "aot.sh"
  ];
  for (const token of tokens) {
    check(agents.includes(token), `AGENTS.md must carry the Urbot operation: ${token}`);
  }
}

function assertIgnore(workspace) {
  const gitignore = fs.readFileSync(path.join(workspace, ".gitignore"), "utf8");
  check(gitignore === "# fixture gitignore\ntarget/\n", ".gitignore must not be rewritten");
  const exclude = fs.readFileSync(path.join(workspace, ".git/info/exclude"), "utf8");
  check(exclude.includes(".manna-run/"), ".git/info/exclude must ignore run state");
}

function createSource(source) {
  fs.mkdirSync(path.join(source, "src", "main", "java", "com", "embabel", "urbot"), { recursive: true });
  fs.writeFileSync(path.join(source, "pom.xml"), "<project/>\n");
  fs.writeFileSync(path.join(source, ".gitignore"), "# fixture gitignore\ntarget/\n");
  fs.writeFileSync(path.join(source, "AGENTS.md"), "# Urbot fixture AGENTS\nFIXTURE-AGENTS-SENTINEL\n");
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

function runFail(args, cwd) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "generator/manna.mjs"), ...args], {
    cwd,
    encoding: "utf8"
  });
  if (result.status === 0) {
    throw new Error(`expected failure but init succeeded:\n${result.stdout}`);
  }
  return result;
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function gitStatus(dir) {
  return git(["-C", dir, "status", "--porcelain"], dir);
}

function check(condition, message) {
  if (!condition) errors.push(message);
}
