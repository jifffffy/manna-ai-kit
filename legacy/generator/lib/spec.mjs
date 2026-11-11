import fs from "node:fs";
import { toCamel } from "./names.mjs";

export const SIDE_EFFECTS = ["none", "read", "internal-write", "external-write", "destructive"];
export const APPROVALS = ["none", "required", "explicit"];
export const TOOL_KINDS = ["internal", "http", "mcp", "db", "filesystem"];
export const AGENT_MODES = ["utility", "structured"];

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON at ${file}: ${error.message}`);
  }
}

export function validateProjectSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== "object") {
    return ["project spec must be an object"];
  }

  const project = spec.project;
  if (!project || typeof project !== "object") {
    errors.push("project is required");
  } else {
    for (const key of ["name", "artifactId", "groupId", "package", "designMode"]) {
      if (!project[key] || typeof project[key] !== "string") {
        errors.push(`project.${key} is required`);
      }
    }
    if (project.package && !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/.test(project.package)) {
      errors.push("project.package must be a dotted lowercase Java package");
    }
    if (project.artifactId && !/^[a-z][a-z0-9-]*$/.test(project.artifactId)) {
      errors.push("project.artifactId must be kebab-case");
    }
    if (project.designMode && !["graph-first", "capability-first"].includes(project.designMode)) {
      errors.push("project.designMode must be graph-first or capability-first");
    }
  }

  if (!Array.isArray(spec.capabilities) || spec.capabilities.length === 0) {
    errors.push("capabilities must be a non-empty array");
  } else {
    const ids = new Set();
    const classNames = new Set();
    spec.capabilities.forEach((capability, index) => {
      errors.push(...validateCapability(capability, `capabilities[${index}]`));
      if (capability?.id) {
        if (ids.has(capability.id)) errors.push(`duplicate capability id: ${capability.id}`);
        ids.add(capability.id);
      }
      if (capability?.className) {
        if (classNames.has(capability.className)) {
          errors.push(`duplicate capability className: ${capability.className}`);
        }
        classNames.add(capability.className);
      }
    });
    errors.push(...validateDomainConsistency(spec.capabilities));
  }

  return errors;
}

export function validateDomainConsistency(capabilities) {
  const errors = [];
  const entities = new Map();
  const relations = new Map();

  for (const capability of capabilities) {
    for (const entity of capability.domain?.entities ?? []) {
      const signature = fieldSignature(entity.fields ?? []);
      const existing = entities.get(entity.name);
      if (!existing) {
        entities.set(entity.name, {
          capability: capability.id,
          package: capability.package,
          signature
        });
        continue;
      }

      if (existing.package !== capability.package) {
        errors.push(
          `entity ${entity.name} is declared by ${existing.capability} (${existing.package}) and ${capability.id} (${capability.package}); consolidate it instead of forking`
        );
      } else if (existing.signature !== signature) {
        errors.push(
          `entity ${entity.name} has conflicting fields in ${existing.capability} and ${capability.id}; one canonical definition is required`
        );
      }
    }

    for (const relation of capability.domain?.relations ?? []) {
      const shape = `${relation.from}->${relation.to}`;
      const existing = relations.get(relation.type);
      if (!existing) {
        relations.set(relation.type, { shape, capability: capability.id });
      } else if (existing.shape !== shape) {
        errors.push(
          `relation ${relation.type} has conflicting shapes: ${existing.shape} (${existing.capability}) vs ${shape} (${capability.id})`
        );
      }
    }
  }

  return errors;
}

function fieldSignature(fields) {
  return fields
    .map((field) => `${field.name}:${field.type}`)
    .sort()
    .join(",");
}

export function validateCapability(cap, path = "capability") {
  const errors = [];
  if (!cap || typeof cap !== "object") return [`${path} must be an object`];

  if (!cap.id || !/^F-[0-9]{3,}$/.test(cap.id)) errors.push(`${path}.id must look like F-001`);
  if (!cap.name || typeof cap.name !== "string") errors.push(`${path}.name is required`);
  if (!cap.className || !/^[A-Z][A-Za-z0-9]*$/.test(cap.className)) {
    errors.push(`${path}.className must be PascalCase`);
  }

  const capability = cap.capability;
  if (!capability || typeof capability !== "object") {
    errors.push(`${path}.capability is required`);
  } else {
    for (const key of ["user_intent", "acceptance"]) {
      if (!Array.isArray(capability[key]) || capability[key].length === 0) {
        errors.push(`${path}.capability.${key} must be a non-empty array`);
      }
    }
    if (!Array.isArray(capability.non_goals)) {
      errors.push(`${path}.capability.non_goals must be an array`);
    }
  }

  const agent = cap.agent;
  if (!agent || typeof agent !== "object") {
    errors.push(`${path}.agent is required`);
  } else {
    if (!AGENT_MODES.includes(agent.mode)) {
      errors.push(`${path}.agent.mode must be one of ${AGENT_MODES.join(", ")}`);
    }
    if (!agent.description) errors.push(`${path}.agent.description is required`);
    if (!agent.goal) errors.push(`${path}.agent.goal is required`);
  }

  if (!Array.isArray(cap.tools)) {
    errors.push(`${path}.tools must be an array`);
  } else {
    cap.tools.forEach((tool, index) => {
      errors.push(...validateTool(tool, `${path}.tools[${index}]`));
    });
  }

  const domain = cap.domain;
  if (!domain || typeof domain !== "object") {
    errors.push(`${path}.domain is required`);
  } else {
    if (!Array.isArray(domain.entities)) errors.push(`${path}.domain.entities must be an array`);
    if (!Array.isArray(domain.relations)) errors.push(`${path}.domain.relations must be an array`);
    if (!Array.isArray(domain.invariants)) errors.push(`${path}.domain.invariants must be an array`);
    for (const [index, entity] of (domain.entities ?? []).entries()) {
      if (!entity.name || !/^[A-Z][A-Za-z0-9]*$/.test(entity.name)) {
        errors.push(`${path}.domain.entities[${index}].name must be PascalCase`);
      }
      if (!Array.isArray(entity.fields)) {
        errors.push(`${path}.domain.entities[${index}].fields must be an array`);
      }
    }
    for (const [index, relation] of (domain.relations ?? []).entries()) {
      if (!relation.from || !relation.type || !relation.to) {
        errors.push(`${path}.domain.relations[${index}] needs from, type, to`);
      }
    }
  }

  for (const vertical of ["graph", "memory", "pipeline"]) {
    if (!cap[vertical] || typeof cap[vertical] !== "object") {
      errors.push(`${path}.${vertical} is required`);
    } else if (typeof cap[vertical].enabled !== "boolean") {
      errors.push(`${path}.${vertical}.enabled must be boolean`);
    } else if (cap[vertical].enabled === false && !cap[vertical].reason) {
      errors.push(`${path}.${vertical}.reason is required when disabled`);
    }
  }

  const transport = cap.transport;
  if (!transport || typeof transport !== "object") {
    errors.push(`${path}.transport is required`);
  } else {
    if (!Array.isArray(transport.http)) errors.push(`${path}.transport.http must be an array`);
    if (typeof transport.sse !== "boolean") errors.push(`${path}.transport.sse must be boolean`);
  }

  if (!Array.isArray(cap.evals) || cap.evals.length === 0) {
    errors.push(`${path}.evals must be a non-empty array`);
  }

  return errors;
}

export function validateTool(tool, path) {
  const errors = [];
  if (!tool || typeof tool !== "object") return [`${path} must be an object`];
  if (!tool.name || !/^[a-z][A-Za-z0-9]*$/.test(tool.name)) {
    errors.push(`${path}.name must be camelCase`);
  }
  if (!tool.description) errors.push(`${path}.description is required`);
  if (!TOOL_KINDS.includes(tool.kind)) {
    errors.push(`${path}.kind must be one of ${TOOL_KINDS.join(", ")}`);
  }
  if (!SIDE_EFFECTS.includes(tool.side_effects)) {
    errors.push(`${path}.side_effects must be one of ${SIDE_EFFECTS.join(", ")}`);
  }
  if (typeof tool.idempotent !== "boolean") {
    errors.push(`${path}.idempotent must be boolean`);
  }
  if (!APPROVALS.includes(tool.approval)) {
    errors.push(`${path}.approval must be one of ${APPROVALS.join(", ")}`);
  }

  if (tool.side_effects === "external-write") {
    if (!tool.idempotency_key && tool.dry_run !== true) {
      errors.push(`${path}: external-write requires idempotency_key or dry_run=true`);
    }
    if (tool.approval === "none") {
      errors.push(`${path}: external-write requires approval=required or explicit`);
    }
  }

  if (tool.side_effects === "internal-write" && tool.approval === "none") {
    errors.push(`${path}: internal-write requires approval=required or explicit`);
  }

  if (tool.side_effects === "destructive" && tool.approval !== "explicit") {
    errors.push(`${path}: destructive requires approval=explicit`);
  }

  return errors;
}

export function normalizeCapability(cap) {
  const copy = structuredClone(cap);
  copy.package = copy.package ?? toCamel(copy.className).toLowerCase();
  copy.agent.opaque = copy.agent.opaque ?? true;
  copy.agent.confirmations = copy.agent.confirmations ?? [];

  copy.tools = copy.tools.map((tool) => ({
    ...tool,
    idempotent: tool.idempotent ?? false,
    approval: tool.approval ?? "none",
    dry_run: tool.dry_run ?? false,
    timeout_seconds: tool.timeout_seconds ?? 30,
    secrets: tool.secrets ?? []
  }));

  copy.domain.entities = copy.domain.entities.map((entity) => ({
    ...entity,
    fields: (entity.fields ?? []).map((field) => ({
      ...field,
      required: field.required ?? true
    }))
  }));
  copy.domain.relations = copy.domain.relations.map((relation) => ({
    ...relation,
    direction: relation.direction ?? "OUTGOING"
  }));

  copy.graph.labels = copy.graph.labels ?? copy.domain.entities.map((entity) => entity.name);
  copy.graph.relationships = copy.graph.relationships ?? copy.domain.relations.map((relation) => relation.type);
  copy.graph.constraints = copy.graph.constraints ?? [];
  copy.graph.queries = copy.graph.queries ?? [];
  copy.graph.read_only = copy.graph.read_only ?? true;

  copy.memory.propositions = copy.memory.propositions ?? [];
  copy.memory.relations = copy.memory.relations ?? [];
  copy.memory.recall = {
    limit: 10,
    order: "effectiveConfidence",
    ...(copy.memory.recall ?? {})
  };

  copy.pipeline.format = copy.pipeline.format ?? "csv";
  copy.pipeline.review = copy.pipeline.review ?? "csv-git";
  copy.pipeline.columns = copy.pipeline.columns ?? ["id", "status"];
  copy.pipeline.apply = copy.pipeline.apply ?? { mode: "approved-only", idempotent: true };
  copy.pipeline.apply.idempotent = copy.pipeline.apply.idempotent ?? true;

  copy.transport.http = copy.transport.http ?? [];
  copy.transport.cli = copy.transport.cli ?? false;
  copy.transport.mcp = copy.transport.mcp ?? false;

  return {
    id: copy.id,
    name: copy.name,
    className: copy.className,
    package: copy.package,
    capability: copy.capability,
    domain: copy.domain,
    graph: copy.graph,
    agent: copy.agent,
    tools: copy.tools,
    memory: copy.memory,
    pipeline: copy.pipeline,
    transport: copy.transport,
    evals: copy.evals
  };
}

export function normalizeProject(spec) {
  return {
    project: {
      version: "0.1.0",
      description: "",
      designMode: "graph-first",
      javaVersion: "21",
      embabelVersion: "1.5.4",
      springBootVersion: "3.5.13",
      ...spec.project
    },
    capabilities: spec.capabilities.map(normalizeCapability)
  };
}
