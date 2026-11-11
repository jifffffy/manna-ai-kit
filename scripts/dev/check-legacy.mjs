#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

const MOVED_SCHEMAS = [
  "project-spec.schema.json",
  "capability-spec.schema.json",
  "graph-schema.schema.json",
  "memory-schema.schema.json",
  "pipeline-schema.schema.json"
];

const LEGACY_PATHS = [
  "legacy/README.md",
  "legacy/templates/agent-core",
  "legacy/generator/manna.mjs",
  "legacy/generator/lib/generate.mjs",
  "legacy/generator/lib/validate.mjs",
  "legacy/generator/lib/lock.mjs",
  "legacy/examples/example.spec.json",
  "legacy/scripts/test-generator.mjs",
  "legacy/scripts/test-generated-compile.mjs",
  "legacy/evals/golden/requirement-to-slice.eval.json",
  ...MOVED_SCHEMAS.map((name) => `legacy/shared/schemas/${name}`)
];

const MAIN_ABSENT = [
  "templates/agent-core",
  "templates/slice",
  "examples",
  "generator/lib",
  ...MOVED_SCHEMAS.map((name) => `shared/schemas/${name}`)
];

const RETAINED = [
  "skills/manna-router/SKILL.md",
  "workflows/routing/pipeline.json",
  "scripts/dev/validate-kit.mjs",
  "skills.json",
  ".well-known/agent-skills/index.json",
  ".claude-plugin/plugin.json",
  "policies/modes.json",
  "policies/tool-safety.md",
  "skills.lock",
  "evals/golden",
  "shared/SKILL-template.md"
];

for (const relative of LEGACY_PATHS) {
  if (!fs.existsSync(path.join(ROOT, relative))) errors.push(`missing legacy asset ${relative}`);
}
for (const relative of MAIN_ABSENT) {
  if (fs.existsSync(path.join(ROOT, relative))) errors.push(`main path still contains ${relative}`);
}
for (const relative of RETAINED) {
  if (!fs.existsSync(path.join(ROOT, relative))) errors.push(`missing retained asset ${relative}`);
}

const cli = read("generator/manna.mjs");
check(cli.includes("runUrbotCommand"), "main CLI must dispatch urbot");
for (const legacyCase of ['case "init"', 'case "slice"', 'case "validate"', 'case "lock"', '"./lib']) {
  check(!cli.includes(legacyCase), `main CLI still contains ${legacyCase}`);
}

const lockScript = read("scripts/dev/update-lock.mjs");
check(lockScript.includes("./lock-utils.mjs"), "update-lock must use lock-utils");
check(!lockScript.includes("generator/lib"), "update-lock must not import generator/lib");

const validator = read("scripts/dev/validate-kit.mjs");
check(validator.includes('"legacy"'), "validate-kit must skip legacy");

const pkg = JSON.parse(read("package.json"));
const scripts = JSON.stringify(pkg.scripts ?? {});
check(!scripts.includes("legacy/"), "package scripts must not reference legacy/");
check(!scripts.includes("test-generator"), "package scripts must not run the legacy generator test");
check(!("test:compile" in (pkg.scripts ?? {})), "package scripts must not run the legacy compile");
check(
  (pkg.scripts?.test ?? "").includes("check:legacy") ||
    (pkg.scripts?.test ?? "").includes("check-legacy.mjs"),
  "npm test must run check:legacy"
);
check(!(pkg.files ?? []).includes("templates/"), "package files must not include templates/");
check(!(pkg.files ?? []).includes("examples/"), "package files must not include examples/");

const lock = JSON.parse(read("skills.lock"));
for (const file of Object.keys(lock.files ?? {})) {
  if (file.startsWith("legacy/")) errors.push(`skills.lock includes legacy file ${file}`);
}

for (const doc of ["AGENTS.md", "README.md"]) {
  const text = read(doc);
  check(text.includes("legacy/"), `${doc} must mention legacy/`);
  check(/historical/i.test(text), `${doc} must describe legacy as historical`);
}

const scanRoots = ["generator", "scripts/dev", "skills", "workflows", "policies", "shared", "evals"];
for (const root of scanRoots) {
  for (const file of listFiles(path.join(ROOT, root))) {
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    if (relative === "scripts/dev/check-legacy.mjs") continue;
    if (!/\.(mjs|js|json|md)$/.test(relative)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("legacy/")) errors.push(`${relative} references legacy/`);
    for (const schema of MOVED_SCHEMAS) {
      if (text.includes(`shared/schemas/${schema}`)) {
        errors.push(`${relative} references moved schema shared/schemas/${schema}`);
      }
    }
    for (const moved of ["templates/agent-core", "generator/lib"]) {
      if (text.includes(moved)) errors.push(`${relative} references moved path ${moved}`);
    }
    if (/(^|[^a-zA-Z0-9_-])examples\//.test(text)) {
      errors.push(`${relative} references moved examples/`);
    }
  }
}

if (fs.existsSync(path.join(ROOT, ".manna"))) {
  errors.push("root .manna/ must live under legacy/");
}

if (errors.length) {
  console.error("Legacy retirement check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: legacy assets isolated; main path has no legacy references");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "target", "legacy", ".opencode", "openspec", ".github"].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files.sort();
}
