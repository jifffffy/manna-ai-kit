#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const project = projectIndex === -1 ? null : args[projectIndex + 1];

if (!project) {
  console.error("Usage: npm run test:data:checkout -- --project <urbot-checkout>");
  process.exit(2);
}
if (!fs.existsSync(path.join(project, "pom.xml"))) {
  console.error(`Not a Urbot checkout (missing pom.xml): ${project}`);
  process.exit(2);
}

const bot = "pipelinecheck";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-data-checkout-"));

try {
  const copy = path.join(temp, "urbot");
  copyProject(path.resolve(project), copy);

  write(
    copy,
    `src/main/java/com/embabel/bot/${bot}/domain/TrailEntity.java`,
    `package com.embabel.bot.${bot}.domain;

import com.embabel.agent.rag.model.NamedEntity;

public interface TrailEntity extends NamedEntity {
}
`
  );
  write(
    copy,
    `src/main/java/com/embabel/bot/${bot}/domain/Race.java`,
    `package com.embabel.bot.${bot}.domain;

public interface Race extends TrailEntity {
}
`
  );
  write(
    copy,
    `src/main/java/com/embabel/bot/${bot}/domain/Region.java`,
    `package com.embabel.bot.${bot}.domain;

import com.embabel.agent.rag.model.NamedEntity;

public interface Region extends NamedEntity {
}
`
  );
  write(copy, `src/main/resources/application-${bot}.properties`, `urbot.bot-packages=com.embabel.bot.${bot}\n`);

  const generated = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "skills/urbot-data-enhance-pipeline/scripts/apply.mjs"),
      "--project",
      copy,
      "--bot",
      bot,
      "--name",
      "race-region",
      "--source",
      "Race",
      "--target",
      "Region",
      "--relationship",
      "LOCATED_IN",
      "--approve"
    ],
    { encoding: "utf8" }
  );
  if (generated.status !== 0) {
    throw new Error(`generation failed:\n${generated.stdout}\n${generated.stderr}`);
  }

  run(path.join(copy, "mvnw"), ["-q", "-DskipTests", "compile"], copy);
  run(path.join(copy, "mvnw"), ["-q", "-Dtest=RaceRegionEnhancerTest", "test"], copy);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (!process.exitCode) {
  console.log("OK: generated pipeline compiles and its unit test passes in a real checkout");
}

function copyProject(source, target) {
  fs.mkdirSync(target, { recursive: true });
  const result = spawnSync(
    "rsync",
    ["-a", "--exclude", ".git", "--exclude", "target", `${source}/`, `${target}/`],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`rsync failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
}
