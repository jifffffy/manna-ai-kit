#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addSlice, initProject } from "../../generator/lib/generate.mjs";
import { validateProject } from "../../generator/lib/validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-test-"));

try {
  const init = initProject(
    path.join(ROOT, "examples/example.spec.json"),
    path.join(tmp, "session-scout")
  );
  assert(init.capabilities.includes("F-001"), "init did not create F-001");

  const projectDir = path.join(tmp, "session-scout");
  let result = validateProject(projectDir);
  assert(result.ok, `initial project validation failed:\n${result.errors.join("\n")}`);
  assertNoUi(projectDir);

  const projectSpec = JSON.parse(fs.readFileSync(path.join(projectDir, ".manna/project.spec.json"), "utf8"));
  assert(projectSpec.project.designMode === "graph-first", "project designMode must be graph-first");
  const registryAfterInit = JSON.parse(fs.readFileSync(path.join(projectDir, ".manna/domain.json"), "utf8"));
  assert(registryAfterInit.entities.Session?.package === "findsessions", "Session must be registered");
  assert(registryAfterInit.relations.PRESENTED_BY?.to === "Speaker", "PRESENTED_BY relation must be registered");

  addSlice(projectDir, path.join(ROOT, "examples/save-to-agenda.slice.json"));
  addSlice(projectDir, path.join(ROOT, "examples/curate-sessions.slice.json"));

  result = validateProject(projectDir);
  assert(result.ok, `project validation after slices failed:\n${result.errors.join("\n")}`);
  assertNoUi(projectDir);

  assert(fs.existsSync(path.join(projectDir, "data/curatesessions/candidates.csv")), "pipeline CSV missing");
  assert(
    fs.existsSync(path.join(projectDir, "src/main/resources/cypher/F-002.cypher")),
    "F-002 graph schema missing"
  );
  assert(
    fs.existsSync(path.join(projectDir, ".manna/features/F-003.spec.json")),
    "F-003 feature spec missing"
  );
  const registryAfterSlices = JSON.parse(fs.readFileSync(path.join(projectDir, ".manna/domain.json"), "utf8"));
  assert(registryAfterSlices.entities.AgendaEntry?.package === "savetoagenda", "AgendaEntry must be registered");
  assert(registryAfterSlices.entities.CuratedSession?.package === "curatesessions", "CuratedSession must be registered");
  assert(registryAfterSlices.relations.REFERENCES?.to === "Session", "REFERENCES must point at Session");

  const duplicateSlice = path.join(tmp, "duplicate-session.json");
  fs.writeFileSync(
    duplicateSlice,
    JSON.stringify({
      id: "F-004",
      name: "Duplicate Session",
      className: "DuplicateSession",
      package: "duplicatesession",
      capability: {
        user_intent: ["Duplicate an entity"],
        acceptance: ["Must be rejected"],
        non_goals: []
      },
      agent: {
        mode: "utility",
        description: "Duplicate entity guard test",
        goal: "Prove the guard rejects forks"
      },
      tools: [],
      domain: {
        entities: [
          {
            name: "Session",
            description: "A forked Session",
            fields: [{ name: "id", type: "String" }]
          }
        ],
        relations: [],
        invariants: []
      },
      graph: { enabled: false, reason: "Test slice" },
      memory: { enabled: false, reason: "Test slice" },
      pipeline: { enabled: false, reason: "Test slice" },
      transport: { http: [], sse: false },
      evals: ["duplicate entity is rejected"]
    })
  );

  let rejected = false;
  try {
    addSlice(projectDir, duplicateSlice);
  } catch (error) {
    rejected = /already exists|Do not fork/.test(error.message);
  }
  assert(rejected, "duplicate entity across slice packages was not rejected");

  const candidates = path.join(projectDir, "data/curatesessions/candidates.csv");
  fs.appendFileSync(candidates, "c-1,approved,Intro to Agents,Platform\n");
  result = validateProject(projectDir);
  assert(result.ok, "editing a pipeline CSV must not invalidate the code lock");

  const application = path.join(projectDir, "src/main/java/dev/manna/session/MannaApplication.java");
  fs.appendFileSync(application, "\n// drift\n");
  result = validateProject(projectDir);
  assert(!result.ok, "editing a generated source file must invalidate the lock");

  console.log(`OK: generated and validated ${projectDir}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoUi(projectDir) {
  const pom = fs.readFileSync(path.join(projectDir, "pom.xml"), "utf8").toLowerCase();
  assert(!pom.includes("vaadin"), "generated pom.xml must not contain Vaadin");
}
