import fs from "node:fs";
import path from "node:path";
import { checkProjectLock, walk } from "./lock.mjs";
import { packagePath } from "./names.mjs";
import { readJson, validateProjectSpec } from "./spec.mjs";

const UI_MARKERS = ["com.vaadin", "vaadin-spring", "<artifactId>vaadin", "vaadin-bom"];

export function validateProject(root) {
  const errors = [];
  const warnings = [];

  const specFile = path.join(root, ".manna", "project.spec.json");
  if (!fs.existsSync(specFile)) {
    return { ok: false, errors: ["missing .manna/project.spec.json"], warnings };
  }

  let project;
  try {
    project = readJson(specFile);
  } catch (error) {
    return { ok: false, errors: [error.message], warnings };
  }

  errors.push(...validateProjectSpec(project));

  if (project?.project?.package) {
    const base = packagePath(project.project.package);
    for (const required of [
      "pom.xml",
      `src/main/java/${base}/MannaApplication.java`,
      `src/main/java/${base}/conversation/ChatController.java`,
      "src/main/resources/application.yml",
      ".manna/state.json",
      ".manna/domain.json",
      ".manna/lock.json"
    ]) {
      if (!fs.existsSync(path.join(root, required))) {
        errors.push(`missing required file: ${required}`);
      }
    }
  }

  for (const capability of project.capabilities ?? []) {
    validateCapabilityArtifacts(root, project, capability, errors);
  }

  validateDomainRegistry(root, project, errors);
  validateDomainFiles(root, errors);

  const lock = checkProjectLock(root);
  if (!lock.ok) errors.push(lock.reason);

  const files = walk(root, { exclude: ["target", ".git", ".manna/lock.json"] });
  for (const relative of files) {
    if (relative.includes("/ui/") || relative.includes("/admin/")) {
      errors.push(`${relative} is a UI/admin package; generated projects are headless`);
      continue;
    }
    if (!/\.(java|xml|yml|yaml|kt|kts)$/.test(relative)) continue;
    const content = fs.readFileSync(path.join(root, relative), "utf8").toLowerCase();
    if (!/\.(xml)$/.test(relative) && relative.endsWith(".java")) {
      if (/import\s+com\.vaadin\b/.test(content) || /package\s+com\.vaadin\b/.test(content)) {
        errors.push(`${relative} imports a UI framework; generated projects are headless`);
      }
      continue;
    }
    for (const marker of UI_MARKERS) {
      if (content.includes(marker)) {
        errors.push(`${relative} contains forbidden UI marker "${marker}"`);
        break;
      }
    }
  }

  for (const capability of project.capabilities ?? []) {
    for (const endpoint of capability.transport?.http ?? []) {
      const value = typeof endpoint === "string" ? endpoint : endpoint.path;
      if (value && /admin/i.test(value)) {
        errors.push(`${capability.id}: forbidden admin endpoint ${value}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateDomainRegistry(root, project, errors) {
  const file = path.join(root, ".manna", "domain.json");
  if (!fs.existsSync(file)) return;
  let registry;
  try {
    registry = readJson(file);
  } catch (error) {
    errors.push(error.message);
    return;
  }

  for (const capability of project.capabilities ?? []) {
    for (const entity of capability.domain?.entities ?? []) {
      const entry = registry.entities?.[entity.name];
      if (!entry) {
        errors.push(`.manna/domain.json is missing entity ${entity.name} from ${capability.id}`);
        continue;
      }
      if (entry.package !== capability.package) {
        errors.push(
          `.manna/domain.json maps ${entity.name} to package ${entry.package}, but ${capability.id} declares ${capability.package}`
        );
      }
    }
    for (const relation of capability.domain?.relations ?? []) {
      const entry = registry.relations?.[relation.type];
      if (!entry) {
        errors.push(`.manna/domain.json is missing relation ${relation.type} from ${capability.id}`);
      } else if (entry.from !== relation.from || entry.to !== relation.to) {
        errors.push(
          `.manna/domain.json relation ${relation.type} is ${entry.from}->${entry.to}, but ${capability.id} declares ${relation.from}->${relation.to}`
        );
      }
    }
  }
}

function validateDomainFiles(root, errors) {
  const seen = new Map();
  const files = walk(root, { exclude: ["target", ".git", ".manna/lock.json", "data"] });
  for (const relative of files) {
    if (!relative.endsWith(".java") || !relative.includes("/domain/")) continue;
    const name = path.basename(relative, ".java");
    const existing = seen.get(name);
    if (existing && existing !== relative) {
      errors.push(
        `domain type ${name} exists in both ${existing} and ${relative}; consolidate it into one canonical type`
      );
    } else {
      seen.set(name, relative);
    }
  }
}

function validateCapabilityArtifacts(root, project, capability, errors) {
  const base = `${project.project.package}.${capability.package}`;
  const basePath = `src/main/java/${packagePath(base)}`;
  const required = [
    `${basePath}/${capability.className}Agent.java`,
    `${basePath}/${capability.className}Tools.java`,
    `src/test/java/${packagePath(base)}/${capability.className}ContractTest.java`,
    `.manna/features/${capability.id}.spec.json`,
    `.manna/evals/${capability.id}.eval.json`
  ];

  if (capability.graph?.enabled) {
    required.push(`src/main/resources/cypher/${capability.id}.cypher`);
    for (const entity of capability.domain.entities) {
      required.push(`${basePath}/domain/${entity.name}.java`);
      required.push(`${basePath}/domain/${entity.name}Repository.java`);
    }
  }

  if (capability.memory?.enabled) {
    required.push(`${basePath}/memory/${capability.className}Memory.java`);
    required.push(`${basePath}/memory/InMemory${capability.className}Memory.java`);
  }

  if (capability.pipeline?.enabled) {
    required.push(`${basePath}/pipeline/${capability.className}Pipeline.java`);
    required.push(`data/${capability.package}/candidates.csv`);
  }

  for (const relative of required) {
    if (!fs.existsSync(path.join(root, relative))) {
      errors.push(`${capability.id}: missing artifact ${relative}`);
    }
  }
}
