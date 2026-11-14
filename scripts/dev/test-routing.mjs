#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_IDS, routeRequest } from "../../generator/urbot/route.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXPECTED_ROUTES = [
  "urbot-bootstrap",
  "urbot-profile-change",
  "urbot-prompt-tuning",
  "urbot-tool-development",
  "urbot-domain-design",
  "urbot-domain-memory",
  "urbot-verification",
  "urbot-data-enhance-pipeline"
];
const errors = [];

for (const route of EXPECTED_ROUTES) {
  if (!ROUTE_IDS.includes(route)) errors.push(`routing table is missing ${route}`);
}

const evalDir = path.join(ROOT, "evals/golden");
const evalFiles = fs
  .readdirSync(evalDir)
  .filter((name) => name.startsWith("urbot-") && name.endsWith(".eval.json"))
  .sort();

if (evalFiles.length !== 7) {
  errors.push(`expected 7 golden routing evals, found ${evalFiles.length}`);
}

for (const name of evalFiles) {
  const spec = JSON.parse(fs.readFileSync(path.join(evalDir, name), "utf8"));
  const cases = spec.cases ?? [{ fixture: spec.fixture, workflow: spec.workflow }];
  for (const testCase of cases) {
    const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, testCase.fixture), "utf8"));
    const result = routeRequest({
      directoryExists: fixture.directoryExists ?? true,
      request: fixture.request,
      discovery: fixture.discovery ?? {}
    });
    if (result.route !== testCase.workflow) {
      errors.push(`${name} ${testCase.fixture}: expected ${testCase.workflow}, got ${result.route ?? "no route"}`);
    }
  }
}

const ambiguous = routeRequest({ directoryExists: true, request: "Make it better" });
if (ambiguous.route !== null || !ambiguous.question) {
  errors.push("ambiguous request must ask one question instead of selecting a route");
}

const multi = routeRequest({
  directoryExists: true,
  request: "Add a new tool and change the persona"
});
if (multi.route !== null || !multi.question) {
  errors.push("multi-intent request must ask which workflow to do first");
}

if (errors.length) {
  console.error("Routing eval failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: ${evalFiles.length} golden routing evals pass and ${EXPECTED_ROUTES.length} routes are covered`);
