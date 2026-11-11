#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

const URBOT_SKILLS = [
  "urbot-discovery",
  "urbot-domain-memory",
  "urbot-profile",
  "urbot-prompt",
  "urbot-router",
  "urbot-tool",
  "urbot-verification"
];

const URBOT_WORKFLOWS = [
  "urbot-bootstrap.md",
  "urbot-domain-memory.md",
  "urbot-profile-change.md",
  "urbot-prompt-tuning.md",
  "urbot-tool-development.md",
  "urbot-verification.md"
];

const LEGACY_SKILLS = [
  "manna-agent",
  "manna-discovery",
  "manna-domain",
  "manna-evals",
  "manna-graph",
  "manna-memory",
  "manna-pipeline",
  "manna-release",
  "manna-router",
  "manna-tools",
  "manna-transport"
];

const LEGACY_WORKFLOWS = [
  "requirement-to-slice.md",
  "feature-add.md",
  "feature-modify.md",
  "tool-integration.md",
  "memory-tuning.md",
  "data-pipeline.md",
  "quality-gate.md",
  "release.md"
];

const LEGACY_PATHS = [
  "legacy",
  "templates",
  "examples",
  "generator/lib",
  "shared/patterns",
  "shared/schemas",
  "shared/schemas/project-spec.schema.json",
  "shared/schemas/capability-spec.schema.json",
  "shared/schemas/graph-schema.schema.json",
  "shared/schemas/memory-schema.schema.json",
  "shared/schemas/pipeline-schema.schema.json"
];

const RETAINED = [
  "skills/urbot-router/SKILL.md",
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
  if (fs.existsSync(path.join(ROOT, relative))) errors.push(`legacy path still exists: ${relative}`);
}
for (const relative of RETAINED) {
  if (!fs.existsSync(path.join(ROOT, relative))) errors.push(`missing retained asset ${relative}`);
}

const skillDirs = fs
  .readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
checkEquals(skillDirs, [...URBOT_SKILLS].sort(), "skills directory");

const workflowFiles = fs
  .readdirSync(path.join(ROOT, "workflows"))
  .filter((name) => name.endsWith(".md"))
  .sort();
checkEquals(workflowFiles, [...URBOT_WORKFLOWS].sort(), "workflows directory");

const sharedFiles = fs.readdirSync(path.join(ROOT, "shared")).sort();
checkEquals(sharedFiles, ["SKILL-template.md"], "shared directory");

const skillsManifest = readJson("skills.json");
checkEquals(names(skillsManifest.skills), [...URBOT_SKILLS].sort(), "skills.json");

const wellKnown = readJson(".well-known/agent-skills/index.json");
checkEquals(names(wellKnown.skills), [...URBOT_SKILLS].sort(), ".well-known index");

const plugin = readJson(".claude-plugin/plugin.json");
checkEquals(
  plugin.skills.map((entry) => entry.split("/").filter(Boolean).pop()).sort(),
  [...URBOT_SKILLS].sort(),
  "plugin.json"
);

const modes = readJson("policies/modes.json");
checkEquals(Object.keys(modes.skillModes ?? {}).sort(), [...URBOT_SKILLS].sort(), "policies/modes.json");

const routing = readJson("workflows/routing/pipeline.json");
checkEquals(
  routing.entrypoints.map((entry) => entry.id).sort(),
  ["urbot-bootstrap", "urbot-domain-memory", "urbot-profile-change", "urbot-prompt-tuning", "urbot-tool-development", "urbot-verification"],
  "pipeline entrypoints"
);
checkEquals(
  Object.keys(routing.skillRoutes ?? {}).sort(),
  ["urbot-discovery", "urbot-domain-memory", "urbot-profile", "urbot-prompt", "urbot-tool", "urbot-verification"],
  "pipeline skillRoutes"
);

const cli = read("generator/manna.mjs");
check(cli.includes("runUrbotCommand"), "main CLI must dispatch urbot");
for (const legacyCase of ['case "init"', 'case "slice"', 'case "validate"', 'case "lock"', '"./lib']) {
  check(!cli.includes(legacyCase), `main CLI still contains ${legacyCase}`);
}

const lockScript = read("scripts/dev/update-lock.mjs");
check(lockScript.includes("./lock-utils.mjs"), "update-lock must use lock-utils");
check(!lockScript.includes("generator/lib"), "update-lock must not import generator/lib");

const validator = read("scripts/dev/validate-kit.mjs");
check(validator.includes('"urbot-router"'), "validate-kit must treat urbot-router as the router");
check(!validator.includes('"manna-router"'), "validate-kit must not reference manna-router");

const pkg = JSON.parse(read("package.json"));
check((pkg.scripts?.test ?? "").includes("check:urbot-only") || (pkg.scripts?.test ?? "").includes("check-urbot-only.mjs"), "npm test must run check:urbot-only");
check(!JSON.stringify(pkg).includes("manna-router"), "package.json must not reference manna-router");

const lock = readJson("skills.lock");
for (const file of Object.keys(lock.files ?? {})) {
  if (isLegacyPath(file)) errors.push(`skills.lock includes legacy file ${file}`);
}

for (const doc of ["AGENTS.md", "README.md"]) {
  const text = read(doc);
  check(/urbot-only/i.test(text), `${doc} must state the Urbot-only path`);
  check(/legacy/i.test(text), `${doc} must mention that legacy was deleted`);
}

const scanRoots = ["generator", "scripts/dev", "skills", "workflows", "policies", "shared", "evals"];
const legacyMarkers = [
  "legacy/",
  "skills/manna-",
  "manna-router",
  "templates/agent-core",
  "examples/",
  "generator/lib",
  "shared/patterns",
  "shared/schemas",
  ".manna/",
  "designMode",
  "F-001",
  ...LEGACY_WORKFLOWS
];
for (const root of scanRoots) {
  for (const file of listFiles(path.join(ROOT, root))) {
    const relative = path.relative(ROOT, file).split(path.sep).join("/");
    if (relative === "scripts/dev/check-urbot-only.mjs") continue;
    if (!/\.(mjs|js|json|md)$/.test(relative)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const marker of legacyMarkers) {
      if (text.includes(marker)) errors.push(`${relative} references legacy marker ${marker}`);
    }
  }
}

if (errors.length) {
  console.error("Urbot-only check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: main path is Urbot-only; no legacy assets remain");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function names(entries) {
  return (entries ?? []).map((entry) => entry.name).sort();
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function checkEquals(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${label} mismatch: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  }
}

function isLegacyPath(file) {
  return (
    file.startsWith("legacy/") ||
    file.startsWith("skills/manna-") ||
    file.startsWith("templates/") ||
    file.startsWith("examples/") ||
    file.startsWith("generator/lib") ||
    file.startsWith("shared/patterns") ||
    file.startsWith("shared/schemas") ||
    LEGACY_WORKFLOWS.some((name) => file.endsWith(`workflows/${name}`))
  );
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
