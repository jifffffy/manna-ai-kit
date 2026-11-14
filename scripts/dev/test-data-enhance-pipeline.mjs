#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs");
const GENERATOR = path.join(ROOT, "skills/urbot-data-enhance-pipeline/scripts/apply.mjs");
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

  testGenerator();
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

console.log("OK: review CSV validation, Java pipeline generation, and apply gate pass");

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

function testGenerator() {
  const project = path.join(temp, "project");
  writeFile(project, "pom.xml", "<project/>\n");
  writeFile(
    project,
    "src/main/java/com/embabel/urbot/UrbotApplication.java",
    "package com.embabel.urbot;\npublic class UrbotApplication {}\n"
  );
  writeFile(
    project,
    "src/main/java/com/embabel/bot/trail/domain/TrailEntity.java",
    "package com.embabel.bot.trail.domain;\n\nimport com.embabel.agent.rag.model.NamedEntity;\n\npublic interface TrailEntity extends NamedEntity {}\n"
  );
  writeFile(
    project,
    "src/main/java/com/embabel/bot/trail/domain/Race.java",
    "package com.embabel.bot.trail.domain;\n\npublic interface Race extends TrailEntity {}\n"
  );
  writeFile(
    project,
    "src/main/java/com/embabel/bot/trail/domain/Region.java",
    "package com.embabel.bot.trail.domain;\n\nimport com.embabel.agent.rag.model.NamedEntity;\n\npublic interface Region extends NamedEntity {}\n"
  );
  writeFile(
    project,
    "src/main/java/com/embabel/bot/trail/domain/Plain.java",
    "package com.embabel.bot.trail.domain;\n\npublic interface Plain {}\n"
  );
  writeFile(project, "src/main/resources/application-trail.properties", "urbot.bot-packages=com.embabel.bot.trail\n");

  const base = [
    "--project",
    project,
    "--bot",
    "trail",
    "--name",
    "race-region",
    "--source",
    "Race",
    "--target",
    "Region",
    "--relationship",
    "LOCATED_IN"
  ];

  const planResult = runGenerator([...base, "--match", "contains"]);
  check(planResult.status === 0, `generator plan must succeed:\n${planResult.stdout}${planResult.stderr}`);
  const plan = JSON.parse(planResult.stdout);
  check(plan.status === "approval-required", "generator must plan before writing");
  check(plan.source === "com.embabel.bot.trail.domain.Race", "generator must resolve the source type");
  check(plan.files.length === 7, "generator must list every file");
  check(
    !fs.existsSync(path.join(project, "src/main/java/com/embabel/bot/trail/data/EnhancementBatch.java")),
    "the plan must not write files"
  );

  const appliedResult = runGenerator([...base, "--match", "contains", "--approve"]);
  check(appliedResult.status === 0, `generator apply must succeed:\n${appliedResult.stdout}${appliedResult.stderr}`);
  const applied = JSON.parse(appliedResult.stdout);
  check(applied.status === "applied", "approved generator run must apply");

  const enhancer = readFile(project, "src/main/java/com/embabel/bot/trail/data/RaceRegionEnhancer.java");
  check(enhancer.includes('@Profile("trail")'), "enhancer must be profile-scoped");
  check(enhancer.includes("MATCH (source:Race {id: $sourceId})"), "enhancer must use the source label");
  check(enhancer.includes("(target:Region {id: $targetId})"), "enhancer must use the target label");
  check(enhancer.includes("LOCATED_IN"), "enhancer must use the relationship");
  check(enhancer.includes('"approved".equals(ReviewCsv.status(row))'), "apply must filter approved rows");
  check(enhancer.includes("r.reviewedAt = datetime()"), "apply must record reviewedAt");
  check(enhancer.includes("Name contains "), "contains pattern must be generated");
  check(!enhancer.includes("com.embabel.agent.api.common.Ai"), "no LLM call may be generated");

  const controller = readFile(project, "src/main/java/com/embabel/bot/trail/data/DataEnhancementController.java");
  check(controller.includes("/api/data-enhancements"), "controller must expose the REST path");
  check(controller.includes("confirm"), "apply must require confirmation");
  check(controller.includes("ConditionalOnProperty"), "controller must be property-gated");
  check(!controller.includes("/force"), "controller must not expose a force endpoint");

  const properties = readFile(project, "src/main/resources/application-trail.properties");
  check(properties.includes("urbot.data-enhancement.enabled=false"), "controller must be disabled by default");
  check(
    properties.includes("urbot.data-enhancement.race-region.csv=data/enhancements/race-region.csv"),
    "the CSV path property must be generated"
  );

  check(
    fs.existsSync(path.join(project, "src/test/java/com/embabel/bot/trail/data/RaceRegionEnhancerTest.java")),
    "the generated test must exist"
  );

  const existingResult = runGenerator([...base, "--match", "contains", "--approve"]);
  check(JSON.parse(existingResult.stdout).status === "existing", "existing files must be reported");

  const forcedResult = runGenerator([...base, "--match", "contains", "--approve", "--force"]);
  check(JSON.parse(forcedResult.stdout).status === "applied", "--force must overwrite");

  const noneResult = runGenerator([
    "--project",
    project,
    "--bot",
    "trail",
    "--name",
    "race-region-none",
    "--source",
    "Race",
    "--target",
    "Region",
    "--relationship",
    "LOCATED_IN",
    "--match",
    "none",
    "--approve"
  ]);
  check(noneResult.status === 0, `none mode must generate:\n${noneResult.stdout}${noneResult.stderr}`);
  const noneEnhancer = readFile(project, "src/main/java/com/embabel/bot/trail/data/RaceRegionNoneEnhancer.java");
  check(noneEnhancer.includes("TODO: implement the domain pattern"), "none mode must generate the TODO hook");
  check(noneEnhancer.includes("return List.of();"), "none mode must return no candidates");

  const strengthResult = runGenerator([
    "--project",
    project,
    "--bot",
    "trail",
    "--name",
    "race-region-strength",
    "--source",
    "Race",
    "--target",
    "Region",
    "--relationship",
    "LOCATED_IN",
    "--properties",
    "reason,strength",
    "--approve"
  ]);
  check(strengthResult.status === 0, "custom properties must generate");
  const strengthEnhancer = readFile(project, "src/main/java/com/embabel/bot/trail/data/RaceRegionStrengthEnhancer.java");
  check(strengthEnhancer.includes('List.of("reason", "strength")'), "custom properties must reach the enhancer");
  check(strengthEnhancer.includes("r.strength = $strength"), "custom properties must reach the Cypher");

  const missing = runGenerator([...base, "--source", "Missing", "--approve"]);
  check(missing.status === 1, "an unknown type must fail");
  check(missing.stderr.includes("was not found"), "an unknown type must be named");

  const notEntity = runGenerator([...base, "--source", "Plain", "--approve"]);
  check(notEntity.status === 1, "a non-NamedEntity type must fail");
  check(notEntity.stderr.includes("does not extend NamedEntity"), "the missing NamedEntity must be named");

  const badKey = runGenerator([...base, "--key", "a,b", "--approve"]);
  check(badKey.status === 1, "an unsupported key must fail");

  const badOption = runGenerator([...base, "--bogus", "1"]);
  check(badOption.status === 1, "an unknown option must fail");
  check(badOption.stderr.includes("Unknown option: --bogus"), "an unknown option must be named");

  const badMatch = runGenerator([...base, "--match", "llm", "--approve"]);
  check(badMatch.status === 1, "an unsupported match mode must fail");

  const labels = runGenerator([
    "--project",
    project,
    "--bot",
    "trail",
    "--name",
    "race-region-labels",
    "--source",
    "Race",
    "--target",
    "Region",
    "--relationship",
    "LOCATED_IN",
    "--source-label",
    "TrailRace",
    "--approve"
  ]);
  check(labels.status === 0, "custom labels must generate");
  check(
    readFile(project, "src/main/java/com/embabel/bot/trail/data/RaceRegionLabelsEnhancer.java").includes(
      "MATCH (source:TrailRace {id: $sourceId})"
    ),
    "custom labels must reach the Cypher"
  );
}

function writeFile(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readFile(root, relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function runGenerator(args) {
  return spawnSync(process.execPath, [GENERATOR, ...args], { encoding: "utf8" });
}
