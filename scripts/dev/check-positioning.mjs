#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

const agents = read("AGENTS.md");
const readme = read("README.md");
const architecture = read("docs/architecture.md");
const mainSpec = "openspec/specs/manna-urbot-orchestrator/spec.md";
const activeSpec =
  "openspec/changes/reposition-manna-as-urbot-orchestrator/specs/manna-urbot-orchestrator/spec.md";
const spec = read(fs.existsSync(path.join(ROOT, mainSpec)) ? mainSpec : activeSpec);

const URBOT_REPO = "https://github.com/jifffffy/urbot";
const SOURCE_PATHS = [
  "pom.xml",
  "src/main/java/com/embabel/urbot/",
  "src/main/java/com/embabel/bot/<botname>/",
  "application-<profile>.properties",
  "src/main/resources/prompts/",
  "src/test/",
  "Git history"
];
const LEGACY_NAMES = [
  "urbot.persona",
  "urbot.objective",
  "urbot.max-words",
  "urbot.chat-llm.model"
];
const CURRENT_BINDINGS = [
  "urbot.bot-packages=com.embabel.bot.<botname>",
  "urbot.chat.persona=<botname>",
  "urbot.chat.objective=<botname>",
  "urbot.chat.behaviour=default",
  "urbot.chat.max-words=80",
  "urbot.chat.llm.model=gpt-4.1-mini",
  "urbot.chat.llm.temperature=0.0"
];

for (const [name, text] of [["AGENTS.md", agents], ["README.md", readme]]) {
  require(text, URBOT_REPO, `${name} must name the Urbot repository`);
  require(text, "Urbot decides", `${name} must state that Urbot decides how to develop`);
  require(text, "Manna decides", `${name} must state that Manna decides the development flow`);
  for (const source of SOURCE_PATHS) {
    require(text, source, `${name} must list source path ${source}`);
  }
  for (const legacy of LEGACY_NAMES) {
    require(text, legacy, `${name} must list obsolete property ${legacy}`);
  }
  require(text, "obsolete", `${name} must mark the legacy property names obsolete`);
  for (const binding of CURRENT_BINDINGS) {
    require(text, binding, `${name} must list current binding ${binding}`);
  }
  require(text, "second Spring Boot application", `${name} must reject a second Spring Boot application`);
  require(text, "second domain model", `${name} must reject a second domain model`);
}

for (const source of SOURCE_PATHS) {
  require(architecture, source, `docs/architecture.md must list source path ${source}`);
}
require(architecture, URBOT_REPO, "docs/architecture.md must name the Urbot repository");

require(architecture, "manna urbot init", "docs/architecture.md must specify `manna urbot init`");
require(architecture, "manna urbot inspect", "docs/architecture.md must specify `manna urbot inspect`");
require(architecture, "--repo https://github.com/jifffffy/urbot", "docs/architecture.md must pin the Urbot repo");
require(architecture, "prompts/{personas,objectives,behaviours}/<botname>.jinja", "docs/architecture.md must document bot prompts");
require(spec, URBOT_REPO, "main spec must name the Urbot repository");
require(spec, "prompts/personas|objectives|behaviours/<botname>.jinja", "main spec must document bot prompts");
for (const legacy of LEGACY_NAMES) {
  require(spec, legacy, `main spec must name obsolete property ${legacy}`);
}

const skillNames = fs
  .readdirSync(path.join(ROOT, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const workflowNames = fs
  .readdirSync(path.join(ROOT, "workflows"))
  .filter((name) => name.endsWith(".md"));

for (const [name, text, headings] of [
  ["AGENTS.md", agents, ["#### Retain", "#### Rewrite", "#### Moved to legacy"]],
  ["README.md", readme, ["### Retain", "### Rewrite", "### Moved to legacy"]]
]) {
  const rewrite = section(text, headings[1]);
  const deprecate = section(text, headings[2]);
  if (!rewrite) errors.push(`${name} is missing the Rewrite inventory`);
  if (!deprecate) errors.push(`${name} is missing the Moved to legacy inventory`);
  for (const skill of skillNames) {
    if (!rewrite?.includes(skill)) errors.push(`${name} Rewrite inventory is missing skill ${skill}`);
    if (deprecate?.includes(skill)) errors.push(`${name} must not move skill ${skill} to legacy`);
  }
  for (const workflow of workflowNames) {
    if (!rewrite?.includes(workflow)) errors.push(`${name} Rewrite inventory is missing workflow ${workflow}`);
  }
}

if (errors.length) {
  console.error("Positioning check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: Urbot positioning, source inventory, config bindings, and ${skillNames.length} skills / ${workflowNames.length} workflows classified`);

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function require(text, needle, message) {
  if (!text.includes(needle)) errors.push(message);
}

function section(text, headingPrefix) {
  const start = text.indexOf(headingPrefix);
  if (start === -1) return "";
  const rest = text.slice(start + headingPrefix.length);
  const nextHeading = rest.search(/\n#{1,6} /);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}
