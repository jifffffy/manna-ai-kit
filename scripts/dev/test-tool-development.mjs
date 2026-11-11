#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyProfile } from "../../skills/urbot-profile/scripts/apply.mjs";
import { applyTool } from "../../skills/urbot-tool/scripts/apply.mjs";
import { routeRequest } from "../../generator/urbot/route.mjs";

const PERSONA =
  "You are a professional and friendly travel assistant. You help users plan trips with clear, practical, and encouraging guidance.";
const OBJECTIVE =
  "Help the user plan itineraries, compare destinations, and organize travel logistics. Ask for the destination, dates, budget, and preferences when they are missing.";
const TOOL_CASES = [
  {
    kind: "llm-tool",
    name: "weather",
    description: "Get current weather for a city",
    sideEffect: "read"
  },
  {
    kind: "llm-reference",
    name: "stripe",
    description: "Create a Stripe charge",
    sideEffect: "external-write",
    secrets: "STRIPE_SECRET_KEY",
    dryRun: true
  },
  {
    kind: "toolish-rag",
    name: "travel-docs",
    description: "Travel documents",
    sideEffect: "read"
  },
  {
    kind: "subagent",
    name: "planner",
    description: "Plan a trip",
    sideEffect: "read"
  },
  {
    kind: "mcp",
    name: "weather-mcp",
    description: "Weather MCP",
    sideEffect: "read",
    mcpTransport: "stdio",
    mcpCommand: "docker",
    mcpArgs: "run -i --rm weather-mcp",
    mcpEnv: "WEATHER_API_KEY"
  }
];
const TOOL_REQUESTS = ["增加天气查询工具", "接入 Stripe", "增加 MCP 工具", "添加一个 Subagent"];

const errors = [];
const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const projectArg = projectIndex === -1 ? null : args[projectIndex + 1];
if (projectIndex !== -1 && (!projectArg || projectArg.startsWith("--"))) {
  console.error("Missing value for --project");
  process.exit(2);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-tool-"));
try {
  if (projectArg) testRealCheckout(path.resolve(projectArg), temp);
  else testFixture(temp);
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (errors.length) {
  console.error("Tool development check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  projectArg
    ? "OK: tool development applied and verified in a temp Urbot checkout"
    : "OK: tool development fixture checks pass"
);

function testFixture(temp) {
  const project = createFixture(temp);
  const frameworkBefore = listFiles(path.join(project, "src", "main", "java", "com", "embabel", "urbot"));

  for (const testCase of TOOL_CASES) {
    const plan = applyTool({ project, bot: "travel", ...testCase });
    check(plan.status === "approval-required", `${testCase.kind} plan must require approval`);
    const applied = applyTool({ project, bot: "travel", ...testCase, approve: true });
    check(applied.status === "applied", `${testCase.kind} should apply`);
    check(applied.sideEffect === testCase.sideEffect, `${testCase.kind} side effect mismatch`);
  }

  assertKindArtifacts(project);
  assertSafety(project);
  assertRouting();

  const frameworkAfter = listFiles(path.join(project, "src", "main", "java", "com", "embabel", "urbot"));
  check(JSON.stringify(frameworkBefore) === JSON.stringify(frameworkAfter), "core Urbot files changed");
  check(
    listFiles(path.join(project, "src", "main", "java", "com", "embabel", "bot", "travel", "domain")).length === 0,
    "tool generation must not create domain files"
  );
}

function testRealCheckout(source, temp) {
  const copy = path.join(temp, "urbot");
  copyProject(source, copy);

  if (!fs.existsSync(path.join(copy, "src", "main", "resources", "application-travel.properties"))) {
    applyProfile({ project: copy, name: "travel", persona: PERSONA, objective: OBJECTIVE, approve: true });
  }

  for (const testCase of TOOL_CASES) {
    const applied = applyTool({ project: copy, bot: "travel", ...testCase, approve: true, force: true });
    check(applied.status === "applied", `${testCase.kind} should apply to the checkout`);
  }

  const chatActions = read(copy, "src/main/java/com/embabel/urbot/ChatActions.java");
  check(
    chatActions.includes("List<Tool>") && chatActions.includes("List<LlmReference>"),
    "ChatActions must inject List<Tool> and List<LlmReference>"
  );
  const mcpConfiguration = read(copy, "src/main/java/com/embabel/urbot/McpToolsConfiguration.java");
  check(
    mcpConfiguration.includes("Tool mcpTools"),
    "MCP must reuse the existing mcpTools bean"
  );

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

function assertKindArtifacts(project) {
  const files = {
    weatherTools: "src/main/java/com/embabel/bot/travel/WeatherTools.java",
    weatherConfig: "src/main/java/com/embabel/bot/travel/WeatherToolConfiguration.java",
    weatherTest: "src/test/java/com/embabel/bot/travel/WeatherToolTest.java",
    stripeTools: "src/main/java/com/embabel/bot/travel/StripeTools.java",
    stripeConfig: "src/main/java/com/embabel/bot/travel/StripeToolConfiguration.java",
    stripeTest: "src/test/java/com/embabel/bot/travel/StripeToolTest.java",
    ragConfig: "src/main/java/com/embabel/bot/travel/TravelDocsToolConfiguration.java",
    ragTest: "src/test/java/com/embabel/bot/travel/TravelDocsToolTest.java",
    plannerAgent: "src/main/java/com/embabel/bot/travel/PlannerAgent.java",
    plannerConfig: "src/main/java/com/embabel/bot/travel/PlannerToolConfiguration.java",
    plannerTest: "src/test/java/com/embabel/bot/travel/PlannerToolTest.java",
    mcpTest: "src/test/java/com/embabel/bot/travel/WeatherMcpPropertiesTest.java",
    props: "src/main/resources/application-travel.properties"
  };
  for (const [label, relative] of Object.entries(files)) {
    check(fs.existsSync(path.join(project, relative)), `missing ${label} (${relative})`);
  }

  check(read(project, files.weatherTools).includes("@LlmTool"), "weather tool must use @LlmTool");
  check(read(project, files.weatherConfig).includes('@Profile("travel")'), "weather config must be profile-gated");
  check(read(project, files.weatherConfig).includes("Tool.fromInstance"), "weather config must expose a Tool bean");
  check(read(project, files.weatherTest).includes("ApplicationContextRunner"), "weather test must use a context runner");
  check(read(project, files.stripeConfig).includes("LlmReference.of"), "Stripe config must expose an LlmReference");
  check(read(project, files.stripeTest).includes("LlmReference.class"), "Stripe test must assert LlmReference");
  check(read(project, files.ragConfig).includes("ToolishRag"), "RAG config must use ToolishRag");
  check(read(project, files.ragTest).includes("LlmReference.class"), "RAG test must assert LlmReference");
  check(read(project, files.plannerAgent).includes("@Agent"), "subagent must define an @Agent class");
  check(read(project, files.plannerAgent).includes("@Action"), "subagent must define an @Action");
  check(read(project, files.plannerConfig).includes("Subagent.ofClass"), "subagent config must use Subagent.ofClass");
  check(read(project, files.plannerTest).includes("Tool.class"), "subagent test must assert Tool");
  check(read(project, files.mcpTest).includes("ClassPathResource"), "MCP test must read the properties offline");
  check(
    read(project, files.props).includes("spring.ai.mcp.client.stdio.connections.weather-mcp.command=docker"),
    "MCP properties must include the stdio command"
  );
  check(
    read(project, files.props).includes("spring.ai.mcp.client.stdio.connections.weather-mcp.env.WEATHER_API_KEY=${WEATHER_API_KEY:}"),
    "MCP properties must declare the environment variable"
  );
}

function assertSafety(project) {
  const external = applyTool({
    project,
    bot: "travel",
    kind: "llm-tool",
    name: "charge",
    description: "Charge",
    sideEffect: "external-write"
  });
  check(external.status === "blocked-external-write", "external write without safeguards must be blocked");

  const destructive = applyTool({
    project,
    bot: "travel",
    kind: "llm-tool",
    name: "wipe",
    description: "Wipe",
    sideEffect: "destructive"
  });
  check(destructive.status === "blocked-destructive", "destructive must be blocked");

  const domain = applyTool({
    project,
    bot: "travel",
    kind: "llm-tool",
    name: "entity",
    description: "Entity",
    sideEffect: "read",
    requires: "domain"
  });
  check(domain.status === "route-required", "domain-dependent tool must hand off");
  check(domain.route === "urbot-domain-memory", "domain handoff must route to urbot-domain-memory");

  const missing = applyTool({
    project,
    bot: "missing",
    kind: "llm-tool",
    name: "x",
    description: "X",
    sideEffect: "read"
  });
  check(missing.status === "profile-required", "missing bot profile must route to the profile workflow");
  check(missing.route === "urbot-profile-change", "profile handoff must route to urbot-profile-change");

  const unapproved = applyTool({
    project,
    bot: "travel",
    kind: "llm-tool",
    name: "unapproved",
    description: "Unapproved",
    sideEffect: "read"
  });
  check(unapproved.status === "approval-required", "unapproved tool must only plan");
  check(
    !fs.existsSync(path.join(project, "src/main/java/com/embabel/bot/travel/UnapprovedTools.java")),
    "unapproved tool must not write files"
  );

  const again = applyTool({ project, bot: "travel", ...TOOL_CASES[0], approve: true });
  check(again.status === "existing", "re-applying the same tool must be a no-op");
}

function assertRouting() {
  for (const request of TOOL_REQUESTS) {
    const route = routeRequest({ directoryExists: true, request, discovery: { targetProfile: "travel" } });
    check(route.route === "urbot-tool-development", `request '${request}' must route to urbot-tool-development`);
  }

  const mixed = routeRequest({
    directoryExists: true,
    request: "Add a weather tool and a Meeting NamedEntity",
    discovery: {}
  });
  check(mixed.route === null, "mixed tool/domain request must not select multiple workflows");
  check(Boolean(mixed.question), "mixed tool/domain request must ask one question");
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
