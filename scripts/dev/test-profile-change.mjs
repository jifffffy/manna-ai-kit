#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyProfile } from "../../skills/urbot-profile/scripts/apply.mjs";
import { routeRequest } from "../../generator/urbot/route.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PERSONA =
  "You are a professional and friendly travel assistant. You help users plan trips with clear, practical, and encouraging guidance.";
const OBJECTIVE =
  "Help the user plan itineraries, compare destinations, and organize travel logistics. Ask for the destination, dates, budget, and preferences when they are missing.";
const TRAVEL_REQUEST = "创建一个名为 travel 的旅行助手，人格专业友好，目标是帮助用户规划行程";
const EXPECTED_FILES = [
  "src/main/java/com/embabel/bot/travel/TravelConfiguration.java",
  "src/main/resources/application-travel.properties",
  "src/main/resources/prompts/personas/travel.jinja",
  "src/main/resources/prompts/objectives/travel.jinja"
];
const LEGACY_NAMES = [
  "urbot.persona=",
  "urbot.objective=",
  "urbot.max-words=",
  "urbot.chat-llm.model="
];
const ACTIVATION_TEST = `package com.embabel.bot.travel;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class TravelProfileActivationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(TravelConfiguration.class);

    @Test
    void configurationLoadsOnlyWithTravelProfile() {
        runner.withPropertyValues("spring.profiles.active=travel")
                .run(context -> assertThat(context).hasSingleBean(TravelConfiguration.class));

        runner.run(context -> assertThat(context).doesNotHaveBean(TravelConfiguration.class));
    }
}
`;

const errors = [];
const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const projectArg = projectIndex === -1 ? null : args[projectIndex + 1];
if (projectIndex !== -1 && (!projectArg || projectArg.startsWith("--"))) {
  console.error("Missing value for --project");
  process.exit(2);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-profile-"));
try {
  if (projectArg) testRealCheckout(path.resolve(projectArg), temp);
  else testFixture(temp);
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Profile change check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  projectArg
    ? "OK: profile change applied and verified in a temp Urbot checkout"
    : "OK: profile change fixture checks pass"
);

function testFixture(temp) {
  const project = path.join(temp, "fixture");
  fs.mkdirSync(path.join(project, "src", "main", "java", "com", "embabel", "urbot"), { recursive: true });
  fs.writeFileSync(path.join(project, "pom.xml"), "<project/>\n");
  fs.writeFileSync(
    path.join(project, "src", "main", "java", "com", "embabel", "urbot", "UrbotApplication.java"),
    "package com.embabel.urbot;\npublic class UrbotApplication {}\n"
  );

  const frameworkBefore = listFiles(path.join(project, "src", "main", "java", "com", "embabel", "urbot"));
  const srcBefore = listFiles(path.join(project, "src"));

  const plan = applyProfile({ project, name: "travel", persona: PERSONA, objective: OBJECTIVE });
  check(plan.status === "approval-required", "a profile plan must require approval");
  check(listFiles(path.join(project, "src")).length === srcBefore.length, "the plan wrote files");

  const applied = applyProfile({
    project,
    name: "travel",
    persona: PERSONA,
    objective: OBJECTIVE,
    approve: true
  });
  check(applied.status === "applied", "approved profile should be applied");
  check(applied.createdFiles.length === 4, "exactly four profile files should be created");
  for (const file of EXPECTED_FILES) {
    check(fs.existsSync(path.join(project, file)), `missing ${file}`);
  }

  const config = read(project, EXPECTED_FILES[0]);
  check(config.includes("@Configuration"), "config class must be @Configuration");
  check(config.includes('@Profile("travel")'), "config class must be @Profile(\"travel\")");
  check(config.includes("public class TravelConfiguration"), "config class name is wrong");

  const properties = read(project, EXPECTED_FILES[1]);
  for (const line of [
    "urbot.bot-packages=com.embabel.bot.travel",
    "urbot.chat.persona=travel",
    "urbot.chat.objective=travel",
    "urbot.chat.behaviour=default",
    "urbot.chat.max-words=80",
    "urbot.chat.llm.model=gpt-4.1-mini",
    "urbot.chat.llm.temperature=0.0"
  ]) {
    check(properties.includes(line), `properties missing ${line}`);
  }
  for (const legacy of LEGACY_NAMES) {
    check(!properties.includes(legacy), `properties contain legacy ${legacy}`);
  }
  check(!properties.includes("spring.profiles.active"), "properties must not hardcode spring.profiles.active");

  check(
    read(project, EXPECTED_FILES[2]).includes("professional and friendly travel assistant"),
    "persona content is wrong"
  );
  check(read(project, EXPECTED_FILES[3]).includes("plan itineraries"), "objective content is wrong");

  const frameworkAfter = listFiles(path.join(project, "src", "main", "java", "com", "embabel", "urbot"));
  check(JSON.stringify(frameworkBefore) === JSON.stringify(frameworkAfter), "framework files changed");
  check(
    listFiles(path.join(project, "src", "main", "java", "com", "embabel", "bot")).length === 1,
    "only the configuration class should be created under the bot package"
  );
  check(
    listFiles(path.join(project, "src", "main", "resources")).length === 3,
    "expected one properties file and two prompt files"
  );

  const again = applyProfile({
    project,
    name: "travel",
    persona: PERSONA,
    objective: OBJECTIVE,
    approve: true
  });
  check(again.status === "existing", "re-applying must be a no-op");
  check(read(project, EXPECTED_FILES[1]) === properties, "re-applying changed the properties file");

  const forced = applyProfile({
    project,
    name: "travel",
    persona: PERSONA,
    objective: OBJECTIVE,
    approve: true,
    force: true
  });
  check(forced.status === "applied", "force should re-apply the profile");

  const travelRoute = routeRequest({
    directoryExists: true,
    request: TRAVEL_REQUEST,
    discovery: { targetProfile: "travel" }
  });
  check(travelRoute.route === "urbot-profile-change", "travel request must route to urbot-profile-change");
  check(travelRoute.question === null, "travel request must not be treated as ambiguous");

  const promptRoute = routeRequest({
    directoryExists: true,
    request: "Change the scheduler persona to be more concise",
    discovery: {}
  });
  check(promptRoute.route === "urbot-prompt-tuning", "pure persona request must route to urbot-prompt-tuning");

  testCliFlags(temp);
}

function testCliFlags(temp) {
  const project = path.join(temp, "cli");
  fs.mkdirSync(path.join(project, "src", "main", "java", "com", "embabel", "urbot"), { recursive: true });
  fs.writeFileSync(path.join(project, "pom.xml"), "<project/>\n");
  const script = path.join(ROOT, "skills/urbot-profile/scripts/apply.mjs");
  const run = (args) =>
    spawnSync(process.execPath, [script, "--project", project, ...args], { encoding: "utf8" });

  const kebab = run([
    "--name",
    "trail",
    "--persona",
    "You are an experienced trail guide.",
    "--objective",
    "Help hikers plan safe routes.",
    "--behaviour",
    "trail",
    "--behaviour-text",
    "Speak like an experienced trail guide.",
    "--max-words",
    "120",
    "--temperature",
    "0.3",
    "--approve"
  ]);
  check(kebab.status === 0, `kebab-case flags must be accepted:\n${kebab.stdout}${kebab.stderr}`);
  check(JSON.parse(kebab.stdout).status === "applied", "kebab-case flags must apply the profile");

  const properties = read(project, "src/main/resources/application-trail.properties");
  check(properties.includes("urbot.chat.max-words=120"), "--max-words must reach the properties file");
  check(properties.includes("urbot.chat.behaviour=trail"), "--behaviour must reach the properties file");
  check(properties.includes("urbot.chat.llm.temperature=0.3"), "--temperature must reach the properties file");

  const behaviour = read(project, "src/main/resources/prompts/behaviours/trail.jinja");
  check(behaviour.includes("experienced trail guide"), "--behaviour-text must reach the behaviour template");
  check(
    !behaviour.includes("Follow the default Urbot conversation style."),
    "--behaviour-text must not fall back to the placeholder"
  );

  const unknown = run(["--name", "trail2", "--persona", "p", "--objective", "o", "--bogus", "1"]);
  check(unknown.status === 1, "an unknown option must fail");
  check(unknown.stderr.includes("Unknown option: --bogus"), "an unknown option must be named");
}

function testRealCheckout(project, temp) {
  const copy = path.join(temp, "urbot");
  copyProject(project, copy);

  const statusBefore = gitStatus(project);
  const applied = applyProfile({
    project: copy,
    name: "travel",
    persona: PERSONA,
    objective: OBJECTIVE,
    approve: true
  });
  check(applied.status === "applied", "approved profile should be applied to the checkout");

  const testFile = path.join(
    copy,
    "src",
    "test",
    "java",
    "com",
    "embabel",
    "bot",
    "travel",
    "TravelProfileActivationTest.java"
  );
  fs.mkdirSync(path.dirname(testFile), { recursive: true });
  fs.writeFileSync(testFile, ACTIVATION_TEST);

  const mvnw = fs.existsSync(path.join(copy, "mvnw")) ? path.join(copy, "mvnw") : "mvn";
  runOrFail(mvnw, ["-q", "-DskipTests", "compile"], copy, "compile");
  runOrFail(mvnw, ["-q", "test"], copy, "test");

  const statusAfter = gitStatus(project);
  check(statusBefore === statusAfter, "the original Urbot checkout was modified");
}

function copyProject(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of ["pom.xml", "mvnw", "mvnw.cmd", ".mvn", "src"]) {
    const from = path.join(source, entry);
    if (!fs.existsSync(from)) continue;
    fs.cpSync(from, path.join(target, entry), { recursive: true });
  }
}

function runOrFail(command, args, cwd, label) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 900000 });
  if (result.status !== 0) {
    errors.push(
      `${label} failed (exit ${result.status}):\n${result.stdout ?? ""}\n${result.stderr ?? ""}`
    );
  }
}

function gitStatus(project) {
  const result = spawnSync("git", ["-C", project, "status", "--porcelain"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function read(project, relative) {
  return fs.readFileSync(path.join(project, relative), "utf8");
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolute));
    else files.push(absolute);
  }
  return files.sort();
}

function check(condition, message) {
  if (!condition) errors.push(message);
}
