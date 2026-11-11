#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];
const warnings = [];

const pkg = readJson("package.json");
const skillsManifest = readJson("skills.json");
const plugin = readJson(".claude-plugin/plugin.json");
const wellKnown = readJson(".well-known/agent-skills/index.json");
const modes = readJson("policies/modes.json");
const routing = readJson("workflows/routing/pipeline.json");

checkVersion(pkg.version, "package.json");
checkVersion(skillsManifest.version, "skills.json");
checkVersion(plugin.version, ".claude-plugin/plugin.json");
checkVersion(wellKnown.version, ".well-known/agent-skills/index.json");

const skillEntries = new Map();
for (const entry of skillsManifest.skills ?? []) {
  skillEntries.set(entry.name, entry);
}

const skillDirs = fs
  .readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const name of skillDirs) {
  if (!skillEntries.has(name)) errors.push(`skills/${name} is missing from skills.json`);
}

for (const [name, entry] of skillEntries) {
  if (!skillDirs.includes(name)) errors.push(`skills.json references missing skill ${name}`);
  if (entry.version !== pkg.version) {
    errors.push(`skills.json ${name} version ${entry.version} != ${pkg.version}`);
  }
  const skillFile = path.join(ROOT, "skills", name, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    errors.push(`missing ${skillFile}`);
    continue;
  }
  const frontmatter = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
  if (frontmatter.name !== name) {
    errors.push(`${name}: frontmatter name "${frontmatter.name}" does not match directory`);
  }
  if (frontmatter.version !== pkg.version) {
    errors.push(`${name}: frontmatter version ${frontmatter.version} != ${pkg.version}`);
  }
  if (frontmatter["mode-default"] !== entry.mode) {
    errors.push(`${name}: mode-default ${frontmatter["mode-default"]} != skills.json mode ${entry.mode}`);
  }
  for (const required of frontmatter.requires ?? []) {
    if (!fs.existsSync(path.join(ROOT, required))) {
      errors.push(`${name}: requires path does not exist: ${required}`);
    }
  }
}

const wellKnownNames = new Set((wellKnown.skills ?? []).map((entry) => entry.name));
for (const name of skillDirs) {
  if (!wellKnownNames.has(name)) errors.push(`.well-known index missing ${name}`);
}
for (const name of wellKnownNames) {
  if (!skillDirs.includes(name)) errors.push(`.well-known index references missing skill ${name}`);
}

for (const name of plugin.skills ?? []) {
  const skillName = name.split("/").filter(Boolean).pop();
  if (!skillDirs.includes(skillName)) errors.push(`plugin.json references missing skill ${name}`);
}

for (const [name, mode] of Object.entries(modes.skillModes ?? {})) {
  if (!skillDirs.includes(name)) errors.push(`policies/modes.json references missing skill ${name}`);
  if (!["suggest", "review", "autofix"].includes(mode)) {
    errors.push(`policies/modes.json ${name} has invalid mode ${mode}`);
  }
}

for (const skill of skillDirs) {
  if (skill !== "urbot-router" && !routing.skillRoutes?.[skill]) {
    errors.push(`workflows/routing/pipeline.json has no route for ${skill}`);
  }
}

const entrypointIds = new Set();
for (const entrypoint of routing.entrypoints ?? []) {
  entrypointIds.add(entrypoint.id);
  if (!fs.existsSync(path.join(ROOT, entrypoint.workflow))) {
    errors.push(`routing entrypoint ${entrypoint.id} references missing workflow ${entrypoint.workflow}`);
  }
  for (const skill of entrypoint.skills ?? []) {
    if (!skillDirs.includes(skill)) {
      errors.push(`routing entrypoint ${entrypoint.id} references missing skill ${skill}`);
    }
  }
}

for (const [skill, entrypoint] of Object.entries(routing.skillRoutes ?? {})) {
  if (!skillDirs.includes(skill)) errors.push(`skillRoutes references missing skill ${skill}`);
  if (!entrypointIds.has(entrypoint)) {
    errors.push(`skillRoutes ${skill} -> ${entrypoint} is not a declared entrypoint`);
  }
}

for (const file of jsonFiles()) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(ROOT, file)} is invalid JSON: ${error.message}`);
  }
}

for (const evalFile of fs.readdirSync(path.join(ROOT, "evals/golden"))) {
  if (!evalFile.endsWith(".json")) continue;
  const value = readJson(`evals/golden/${evalFile}`);
  for (const key of ["id", "fixture", "expected", "pass_criteria", "triggers"]) {
    if (!(key in value)) errors.push(`evals/golden/${evalFile} missing ${key}`);
  }
  if (!value.expected?.must_do || !value.expected?.must_not) {
    errors.push(`evals/golden/${evalFile} needs expected.must_do and expected.must_not`);
  }
}

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: ${skillDirs.length} skills, ${entrypointIds.size} workflows, version ${pkg.version}`);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
}

function checkVersion(actual, source) {
  if (actual !== pkg.version) {
    errors.push(`${source} version ${actual} != package.json ${pkg.version}`);
  }
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const lines = text.slice(3, end).trim().split("\n");
  const result = {};
  let currentList = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentList) {
      result[currentList].push(listMatch[1].trim());
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      if (value === "") {
        result[key] = [];
        currentList = key;
      } else {
        result[key] = value.trim();
        currentList = null;
      }
    }
  }
  return result;
}

function jsonFiles() {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git", "target", "legacy", ".opencode", "openspec", ".github"].includes(entry.name)) {
        continue;
      }
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(absolute);
    }
  }
  visit(ROOT);
  return files;
}
