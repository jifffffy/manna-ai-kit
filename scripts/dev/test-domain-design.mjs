#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyProfile } from "../../skills/urbot-profile/scripts/apply.mjs";
import { applyDomainDesign } from "../../skills/urbot-domain-design/scripts/apply.mjs";
import { routeRequest } from "../../generator/urbot/route.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODEL = path.join(ROOT, "evals/fixtures/urbot/domain-travel.json");
const PERSONA =
  "You are a professional and friendly travel assistant. You help users plan trips with clear, practical, and encouraging guidance.";
const OBJECTIVE =
  "Help the user plan itineraries, compare destinations, and organize travel logistics. Ask for the destination, dates, budget, and preferences when they are missing.";
const errors = [];
const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const projectArg = projectIndex === -1 ? null : args[projectIndex + 1];
if (projectIndex !== -1 && (!projectArg || projectArg.startsWith("--"))) {
  console.error("Missing value for --project");
  process.exit(2);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-domain-"));
try {
  if (projectArg) testRealCheckout(path.resolve(projectArg), temp);
  else testFixture(temp);
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Domain design check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  projectArg
    ? "OK: domain design applied and verified in a temp Urbot checkout"
    : "OK: domain design fixture checks pass"
);

function testFixture(temp) {
  const project = createFixture(temp);
  const plan = applyDomainDesign({ project, bot: "travel", model: MODEL });
  check(plan.status === "approval-required", "domain plan must require approval");
  check(!fs.existsSync(path.join(project, "src/main/java/com/embabel/bot/travel/domain/Trip.java")), "plan wrote domain files");

  const applied = applyDomainDesign({ project, bot: "travel", model: MODEL, approve: true });
  check(applied.status === "applied", "approved domain should be applied");
  check(applied.colorModel.length === 5, "color model should contain five classes");
  check(applied.dddModel.aggregates.includes("Trip"), "Trip must be an aggregate");
  check(applied.dddModel.entities.includes("Traveler"), "Traveler must be an entity");
  check(applied.dddModel.valueObjects.includes("DateRange"), "DateRange must be a value object");
  check(applied.dddModel.events.includes("TripPlanned"), "TripPlanned must be an event");
  check(applied.dddModel.services.includes("TripPlanningService"), "service must be modeled");
  check(applied.dddModel.repositories.includes("NamedEntityDataRepository"), "repository must be Urbot-owned");
  check(applied.entityPackage === "com.embabel.bot.travel", "entity package must be the bot package");

  assertGenerated(project);
  assertProperties(project);
  assertNoSecondModel(project);

  const again = applyDomainDesign({ project, bot: "travel", model: MODEL, approve: true });
  check(again.status === "existing", "re-applying must be a no-op");
  const forced = applyDomainDesign({ project, bot: "travel", model: MODEL, approve: true, force: true });
  check(forced.status === "applied", "force should re-apply the domain");

  const missing = applyDomainDesign({
    project,
    bot: "missing",
    model: MODEL,
    approve: true
  });
  check(missing.status === "profile-required", "missing bot profile must route to profile");
  check(missing.route === "urbot-profile-change", "profile handoff must be urbot-profile-change");

  assertRouting();
  assertHandoff();
}

function testRealCheckout(source, temp) {
  const copy = path.join(temp, "urbot");
  copyProject(source, copy);
  if (!fs.existsSync(path.join(copy, "src", "main", "resources", "application-travel.properties"))) {
    applyProfile({ project: copy, name: "travel", persona: PERSONA, objective: OBJECTIVE, approve: true });
  }
  const applied = applyDomainDesign({
    project: copy,
    bot: "travel",
    model: MODEL,
    approve: true,
    force: true
  });
  check(applied.status === "applied", "domain should apply to the checkout");

  const statusBefore = gitStatus(source);
  const mvnw = fs.existsSync(path.join(copy, "mvnw")) ? path.join(copy, "mvnw") : "mvn";
  runOrFail(mvnw, ["-q", "-DskipTests", "compile"], copy, "compile");
  runOrFail(mvnw, ["-q", "test"], copy, "test");
  const statusAfter = gitStatus(source);
  check(statusBefore === statusAfter, "the original Urbot checkout was modified");
}

function createFixture(temp) {
  const project = path.join(temp, "fixture");
  fs.mkdirSync(path.join(project, "src", "main", "java", "com", "embabel", "urbot"), { recursive: true });
  fs.writeFileSync(path.join(project, "pom.xml"), "<project/>\n");
  fs.writeFileSync(
    path.join(project, "src", "main", "java", "com", "embabel", "urbot", "UrbotApplication.java"),
    "package com.embabel.urbot;\npublic class UrbotApplication {}\n"
  );
  const profile = applyProfile({
    project,
    name: "travel",
    persona: PERSONA,
    objective: OBJECTIVE,
    approve: true
  });
  check(profile.status === "applied", "travel profile should be created");
  return project;
}

function assertGenerated(project) {
  const files = [
    "src/main/java/com/embabel/bot/travel/domain/Trip.java",
    "src/main/java/com/embabel/bot/travel/domain/Traveler.java",
    "src/main/java/com/embabel/bot/travel/domain/Destination.java",
    "src/main/java/com/embabel/bot/travel/domain/Itinerary.java",
    "src/main/java/com/embabel/bot/travel/domain/DateRange.java",
    "src/main/java/com/embabel/bot/travel/domain/events/TripPlanned.java",
    "src/main/java/com/embabel/bot/travel/domain/TripPlanningService.java",
    "src/test/java/com/embabel/bot/travel/domain/TravelDomainVocabularyTest.java",
    "src/test/java/com/embabel/bot/travel/domain/DateRangeTest.java",
    "src/test/java/com/embabel/bot/travel/domain/ItineraryTest.java"
  ];
  for (const relative of files) {
    check(fs.existsSync(path.join(project, relative)), `missing ${relative}`);
  }

  const trip = read(project, files[0]);
  check(trip.includes("extends NamedEntity"), "Trip must be a NamedEntity");
  check(trip.includes("Traveler traveler()"), "Trip must reference Traveler");
  check(trip.includes("List<Destination> destinations()"), "Trip must reference Destinations");
  check(read(project, files[1]).includes("String displayName()"), "Traveler attribute missing");
  check(read(project, files[2]).includes("String country()"), "Destination attribute missing");
  check(read(project, files[3]).includes("record Itinerary(String notes)"), "Itinerary must be a record");
  check(read(project, files[4]).includes("record DateRange(LocalDate start, LocalDate end)"), "DateRange must be a record");
  check(read(project, files[5]).includes("record TripPlanned(String tripId, Instant occurredAt)"), "event record missing");
  check(read(project, files[6]).includes("@Service"), "service must be a Spring service");
  const vocabulary = read(project, files[7]);
  check(vocabulary.includes('dataDictionaryFromPackages("com.embabel.bot.travel")'), "vocabulary test missing data dictionary");
  check(vocabulary.includes("com.embabel.bot.travel.domain.Trip") && vocabulary.includes("com.embabel.bot.travel.domain.Traveler") && vocabulary.includes("com.embabel.bot.travel.domain.Destination"), "vocabulary test missing entities");
  check(vocabulary.includes("isRecord()"), "vocabulary test missing record checks");
}

function assertProperties(project) {
  const properties = read(project, "src/main/resources/application-travel.properties");
  check(properties.includes("urbot.bot-packages=com.embabel.bot.travel"), "profile bot package missing");
  check(
    properties.includes("urbot.memory.entity-packages=com.embabel.bot.travel"),
    "entity package property missing"
  );
}

function assertNoSecondModel(project) {
  const domain = listFiles(path.join(project, "src/main/java/com/embabel/bot/travel/domain"));
  check(!domain.some((file) => file.includes("Repository")), "a repository was generated");
  check(!domain.some((file) => file.includes("Memory")), "memory was generated");
  check(!fs.existsSync(path.join(project, ".manna")), "domain design must not create a .manna directory");
}

function assertRouting() {
  const english = routeRequest({
    directoryExists: true,
    request: "Design the travel domain with color modeling and DDD",
    discovery: { targetProfile: "travel" }
  });
  check(english.route === "urbot-domain-design", "English domain request must route to domain design");

  const chinese = routeRequest({
    directoryExists: true,
    request: "用 color modeling 设计 travel 领域并 DDD 实现",
    discovery: { targetProfile: "travel" }
  });
  check(chinese.route === "urbot-domain-design", "Chinese domain request must route to domain design");

  const memory = routeRequest({
    directoryExists: true,
    request: "Add memory for traveler preferences",
    discovery: { targetProfile: "travel" }
  });
  check(memory.route === "urbot-domain-memory", "memory request must route to memory");
}

function assertHandoff() {
  const design = read(ROOT, "workflows/urbot-domain-design.md");
  check(design.includes("urbot-domain-memory"), "domain design workflow must hand off memory");
  const memory = read(ROOT, "workflows/urbot-domain-memory.md");
  check(memory.includes("urbot-domain-design"), "memory workflow must route missing domains to design");
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
    errors.push(`${label} failed (exit ${result.status}):\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
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
