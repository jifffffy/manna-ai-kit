import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderFile } from "./render.mjs";
import { packagePath, toCamel, toCamelFromUpperSnake, toKebab } from "./names.mjs";
import {
  normalizeCapability,
  normalizeProject,
  readJson,
  validateCapability,
  validateProjectSpec
} from "./spec.mjs";
import { writeProjectLock } from "./lock.mjs";

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE_ROOT = path.join(KIT_ROOT, "templates");
const YEAR = new Date().getFullYear();

export function initProject(specFile, outDir) {
  const raw = readJson(specFile);
  const errors = validateProjectSpec(raw);
  if (errors.length) {
    throw new Error(`Invalid project spec:\n- ${errors.join("\n- ")}`);
  }

  const project = normalizeProject(raw);
  const created = [];
  writeCore(outDir, project, created);

  for (const capability of project.capabilities) {
    created.push(...writeSlice(outDir, project, capability));
  }

  writeJson(path.join(outDir, ".manna", "project.spec.json"), project);
  for (const capability of project.capabilities) {
    writeJson(featureSpecPath(outDir, capability.id), capability);
  }
  writeDomainRegistry(outDir, project);
  writeState(outDir, project, "generated");
  writeProjectLock(outDir);

  return {
    project: project.project.name,
    outDir,
    capabilities: project.capabilities.map((capability) => capability.id),
    files: created.sort()
  };
}

export function addSlice(projectDir, sliceFile) {
  const projectSpecPath = path.join(projectDir, ".manna", "project.spec.json");
  if (!fs.existsSync(projectSpecPath)) {
    throw new Error(`${projectDir} is not a manna project (missing .manna/project.spec.json)`);
  }

  const project = readJson(projectSpecPath);
  const raw = readJson(sliceFile);
  const errors = validateCapability(raw, "capability");
  if (errors.length) {
    throw new Error(`Invalid capability spec:\n- ${errors.join("\n- ")}`);
  }

  if (project.capabilities.some((capability) => capability.id === raw.id)) {
    throw new Error(`Capability ${raw.id} already exists in the project`);
  }

  const capability = normalizeCapability(raw);
  assertNoDomainFork(project, capability);
  const created = writeSlice(projectDir, project, capability);
  project.capabilities.push(capability);

  writeJson(projectSpecPath, project);
  writeJson(featureSpecPath(projectDir, capability.id), capability);
  writeDomainRegistry(projectDir, project);
  writeState(projectDir, project, "slice-added");
  writeProjectLock(projectDir);

  return {
    project: project.project.name,
    capability: capability.id,
    files: created.sort()
  };
}

function writeCore(outDir, project, created) {
  const p = project.project;
  const values = {
    name: p.name,
    artifactId: p.artifactId,
    groupId: p.groupId,
    package: p.package,
    packagePath: packagePath(p.package),
    version: p.version,
    description: p.description,
    designMode: p.designMode,
    objective: p.description || `Serve the ${p.name} domain`,
    systemPrompt: "chat_system",
    embabelVersion: p.embabelVersion,
    springBootVersion: p.springBootVersion,
    javaVersion: p.javaVersion,
    year: YEAR,
    copyrightHolder: p.groupId
  };

  const templateFiles = [
    ["pom.xml.tmpl", "pom.xml"],
    ["mvnw", "mvnw"],
    [".mvn/wrapper/maven-wrapper.properties", ".mvn/wrapper/maven-wrapper.properties"],
    ["application.yml.tmpl", "src/main/resources/application.yml"],
    ["docker-compose.yml.tmpl", "docker-compose.yml"],
    [".env.example.tmpl", ".env.example"],
    [".gitignore", ".gitignore"],
    ["README.md.tmpl", "README.md"],
    ["MannaApplication.java.tmpl", `src/main/java/${values.packagePath}/MannaApplication.java`],
    ["MannaProperties.java.tmpl", `src/main/java/${values.packagePath}/MannaProperties.java`],
    ["AgentConfiguration.java.tmpl", `src/main/java/${values.packagePath}/config/AgentConfiguration.java`],
    ["ApiKeyFilter.java.tmpl", `src/main/java/${values.packagePath}/config/ApiKeyFilter.java`],
    ["ConversationService.java.tmpl", `src/main/java/${values.packagePath}/conversation/ConversationService.java`],
    ["ChatController.java.tmpl", `src/main/java/${values.packagePath}/conversation/ChatController.java`],
    ["ChatRequest.java.tmpl", `src/main/java/${values.packagePath}/conversation/ChatRequest.java`],
    ["ChatResponse.java.tmpl", `src/main/java/${values.packagePath}/conversation/ChatResponse.java`]
  ];

  for (const [template, destination] of templateFiles) {
    const content = renderFile(path.join(TEMPLATE_ROOT, "agent-core", template), values);
    write(created, outDir, destination, content);
  }

  write(
    created,
    outDir,
    "src/main/resources/prompts/chat_system.jinja",
    `You are ${p.name}.\n${values.objective}\n\nBe concise and factual. Use tools when they are needed.\nNever claim that a write happened unless a tool returned a successful result.\nAsk before any external write.\n`
  );

  write(
    created,
    outDir,
    "docs/adr/0001-domain-anchored-headless.md",
    `# ADR 0001: Domain-Anchored, Headless Service\n\n## Status\nAccepted\n\n## Context\n${p.description || p.name}\n\n## Decision\nThis project is a headless, domain-anchored, agent-delivered service (design mode: ${p.designMode}). Each capability is designed in this order: domain slice -> Neo4j relation contract -> agent -> tools -> memory -> pipeline -> transport -> evals. The domain is not a full upfront ontology; it is a slice registered in \`.manna/domain.json\`.\n\n## Consequences\n- No UI framework and no admin backend.\n- REST + SSE is the default client surface.\n- Human review happens in CSV/JSONL files, Git and CLI.\n- Every tool maps to canonical entities/relations and declares its side effects.\n- A tool that needs a new entity or relation reopens the DOMAIN or GRAPH checkpoint.\n`
  );
}

function writeSlice(outDir, project, capability) {
  const p = project.project;
  const basePackage = `${p.package}.${capability.package}`;
  const basePath = `src/main/java/${packagePath(basePackage)}`;
  const created = [];
  const cap = toCamel(capability.className);
  const header = licenseHeader(p.groupId);
  const kebab = toKebab(capability.className);

  write(
    created,
    outDir,
    `${basePath}/${capability.className}Request.java`,
    `${header}package ${basePackage};\n\npublic record ${capability.className}Request(String message) {\n}\n`
  );

  write(
    created,
    outDir,
    `${basePath}/${capability.className}Result.java`,
    `${header}package ${basePackage};\n\npublic record ${capability.className}Result(String answer) {\n}\n`
  );

  const entityNames = new Set(capability.domain.entities.map((entity) => entity.name));
  for (const entity of capability.domain.entities) {
    const destination = `${basePath}/domain/${entity.name}.java`;
    if (fs.existsSync(path.join(outDir, destination))) {
      continue;
    }
    write(created, outDir, destination, entitySource(header, basePackage, capability, entity, entityNames));
    if (capability.graph.enabled) {
      write(
        created,
        outDir,
        `${basePath}/domain/${entity.name}Repository.java`,
        `${header}package ${basePackage}.domain;\n\nimport org.springframework.data.neo4j.repository.Neo4jRepository;\n\npublic interface ${entity.name}Repository extends Neo4jRepository<${entity.name}, String> {\n}\n`
      );
    }
  }

  if (capability.graph.enabled) {
    write(
      created,
      outDir,
      `src/main/resources/cypher/${capability.id}.cypher`,
      graphCypher(capability)
    );
  }

  write(
    created,
    outDir,
    `${basePath}/${capability.className}Agent.java`,
    agentSource(header, basePackage, capability)
  );

  write(
    created,
    outDir,
    `${basePath}/${capability.className}Tools.java`,
    toolsSource(header, basePackage, capability)
  );

  write(
    created,
    outDir,
    `src/main/resources/prompts/${kebab}_system.jinja`,
    `${capability.agent.description}\n\nObjective: ${capability.agent.goal}\n\nUser request:\n{{ request }}\n\nReturn a concise, structured answer. If a tool is required, call it. Never fabricate a tool result.\n`
  );

  if (capability.memory.enabled) {
    write(
      created,
      outDir,
      `${basePath}/memory/${capability.className}Memory.java`,
      memorySource(header, basePackage, capability)
    );
    write(
      created,
      outDir,
      `${basePath}/memory/InMemory${capability.className}Memory.java`,
      inMemorySource(header, basePackage, capability)
    );
  }

  if (capability.pipeline.enabled) {
    write(
      created,
      outDir,
      `${basePath}/pipeline/${capability.className}Pipeline.java`,
      pipelineSource(header, basePackage, capability)
    );
    write(
      created,
      outDir,
      `${basePath}/pipeline/${capability.className}PipelineController.java`,
      pipelineControllerSource(header, basePackage, capability)
    );
    const dataDir = `data/${capability.package}`;
    const candidate = `${dataDir}/candidates.csv`;
    if (!fs.existsSync(path.join(outDir, candidate))) {
      write(created, outDir, candidate, `${capability.pipeline.columns.join(",")}\n`);
    }
  }

  const customPath = firstCustomHttpPath(capability);
  if (customPath) {
    write(
      created,
      outDir,
      `${basePath}/${capability.className}Controller.java`,
      controllerSource(header, basePackage, capability, customPath, p.package)
    );
  }

  write(
    created,
    outDir,
    `src/test/java/${packagePath(basePackage)}/${capability.className}ContractTest.java`,
    contractTestSource(header, basePackage, capability)
  );

  write(
    created,
    outDir,
    `docs/capabilities/${capability.id}.md`,
    capabilityDoc(project, capability)
  );

  if (capability.graph.enabled) {
    writeJsonFile(created, outDir, `.manna/features/${capability.id}.graph.json`, {
      capability_id: capability.id,
      enabled: true,
      read_only: capability.graph.read_only,
      labels: capability.graph.labels,
      relationships: capability.domain.relations,
      constraints: capability.graph.constraints,
      queries: capability.graph.queries,
      migration: { strategy: "additive", rollback: "not required for additive changes" }
    });
  }

  if (capability.memory.enabled) {
    writeJsonFile(created, outDir, `.manna/features/${capability.id}.memory.json`, {
      capability_id: capability.id,
      enabled: true,
      propositions: capability.memory.propositions,
      relations: capability.memory.relations,
      recall: capability.memory.recall,
      deletion: { soft_delete: true, user_can_forget: true }
    });
  }

  if (capability.pipeline.enabled) {
    writeJsonFile(created, outDir, `.manna/features/${capability.id}.pipeline.json`, {
      capability_id: capability.id,
      enabled: true,
      format: capability.pipeline.format,
      output: `data/${capability.package}/candidates.csv`,
      columns: capability.pipeline.columns,
      review: {
        mode: capability.pipeline.review,
        status_column: "status",
        pending_value: "pending",
        approved_value: "approved",
        rejected_value: "rejected"
      },
      apply: capability.pipeline.apply,
      rollback: {
        strategy: "delete-applied-ids",
        ledger: ".manna/pipeline-applied.txt"
      }
    });
  }

  writeJsonFile(created, outDir, `.manna/evals/${capability.id}.eval.json`, {
    id: capability.id,
    skill: "manna-agent",
    fixture: `.manna/features/${capability.id}.spec.json`,
    expected: {
      must_detect: capability.tools.map((tool) => `${tool.name}:${tool.side_effects}`),
      must_create: [
        `${basePath}/${capability.className}Agent.java`,
        `${basePath}/${capability.className}Tools.java`
      ],
      must_do: ["stop at CHECKPOINT: SPEC", "stop at CHECKPOINT: TOOLS"],
      must_not: ["create a UI", "skip side_effects", "write without approval"]
    },
    pass_criteria: "spec validates, contract test passes, no UI dependency, every tool declares side effects",
    triggers: {
      should: [capability.capability.user_intent[0]],
      should_not: ["fix a typo", "rename a variable"]
    }
  });

  return created;
}

function toolsSource(header, basePackage, capability) {
  const methods = capability.tools
    .map((tool) => {
      const write = ["internal-write", "external-write", "destructive"].includes(tool.side_effects);
      const description = String(tool.description).replace(/\.+$/, "");
      return `    @LlmTool(description = "${javaString(description)}. side_effects=${tool.side_effects}; approval=${tool.approval}.")\n    public String ${tool.name}(@LlmTool.Param(description = "${javaString(description)}") String input) {\n        // TODO(manna): implement ${tool.name}. Contract: kind=${tool.kind}, side_effects=${tool.side_effects}, approval=${tool.approval}.\n        return "${tool.name} is not implemented yet"${write ? "" : " + \": \" + input"};\n    }`;
    })
    .join("\n\n");

  return `${header}package ${basePackage};\n\nimport com.embabel.agent.api.annotation.LlmTool;\nimport org.springframework.stereotype.Component;\n\n@Component\npublic class ${capability.className}Tools {\n\n${methods || "    // No tools declared for this capability."}\n}\n`;
}

function agentSource(header, basePackage, capability) {
  const structured = capability.agent.mode === "structured";
  const agentAnnotation = structured
    ? `@Agent(description = "${javaString(capability.agent.description)}", opaque = ${capability.agent.opaque})\n`
    : "@EmbabelComponent\n";
  const goalAnnotation = structured
    ? `    @AchievesGoal(description = "${javaString(capability.agent.goal)}")\n`
    : "";
  const imports = structured
    ? "import com.embabel.agent.api.annotation.AchievesGoal;\nimport com.embabel.agent.api.annotation.Action;\nimport com.embabel.agent.api.annotation.Agent;\n"
    : "import com.embabel.agent.api.annotation.Action;\nimport com.embabel.agent.api.annotation.EmbabelComponent;\n";

  return `${header}package ${basePackage};\n\n${imports}import com.embabel.agent.api.common.ActionContext;\n\nimport java.util.Map;\n\n${agentAnnotation}public class ${capability.className}Agent {\n\n    private final ${capability.className}Tools tools;\n\n    public ${capability.className}Agent(${capability.className}Tools tools) {\n        this.tools = tools;\n    }\n\n    @Action\n${goalAnnotation}    public ${capability.className}Result handle(${capability.className}Request request, ActionContext context) {\n        var answer = context.ai()\n                .withDefaultLlm()\n                .withToolObject(tools)\n                .rendering("${toKebab(capability.className)}_system")\n                .generateText(Map.of(\n                        "request", request.message(),\n                        "objective", "${javaString(capability.agent.goal)}"\n                ));\n        return new ${capability.className}Result(answer);\n    }\n}\n`;
}

function entitySource(header, basePackage, capability, entity, entityNames) {
  const graph = capability.graph.enabled;
  const fields = [...entity.fields];
  if (!fields.some((field) => field.name === "id")) {
    fields.unshift({ name: "id", type: "String", required: true });
  }

  const relations = capability.domain.relations.filter((relation) => relation.from === entity.name);
  const relationFields = relations
    .filter((relation) => entityNames.has(relation.to))
    .map((relation) => ({
      name: toCamelFromUpperSnake(relation.type),
      target: relation.to,
      type: relation.type,
      direction: relation.direction
    }));
  const missingRelations = relations.filter((relation) => !entityNames.has(relation.to));

  const imports = new Set();
  if (fields.some((field) => field.type === "Instant")) imports.add("java.time.Instant");
  if (fields.some((field) => field.type === "List<String>") || relationFields.length > 0) {
    imports.add("java.util.List");
  }
  if (graph) {
    imports.add("org.springframework.data.neo4j.core.schema.Id");
    imports.add("org.springframework.data.neo4j.core.schema.Node");
    if (relationFields.length > 0) {
      imports.add("org.springframework.data.neo4j.core.schema.Relationship");
    }
  }

  const importBlock = imports.size
    ? [...imports].sort().map((value) => `import ${value};`).join("\n") + "\n\n"
    : "";

  const fieldBlock = fields
    .map((field) => `    ${graph && field.name === "id" ? "@Id\n    " : ""}private ${field.type} ${field.name};`)
    .join("\n");

  const relationBlock = relationFields
    .map(
      (field) =>
        `\n    @Relationship(type = "${field.type}", direction = Relationship.Direction.${field.direction})\n    private List<${field.target}> ${field.name};`
    )
    .join("");

  const missingComment = missingRelations.length
    ? `\n    // Cross-slice relations declared in the spec but not generated in this slice: ${missingRelations
        .map((relation) => `${relation.type} -> ${relation.to}`)
        .join(", ")}.\n    // Add them when the target slice exists.\n`
    : "";

  const accessors = [
    ...fields.map((field) => accessor(field.name, field.type)),
    ...relationFields.map((field) => accessor(field.name, `List<${field.target}>`))
  ].join("\n\n");

  return `${header}package ${basePackage}.domain;\n\n${importBlock}${graph ? `@Node("${entity.name}")\n` : ""}public class ${entity.name} {\n\n${fieldBlock}${relationBlock}${missingComment}\n    public ${entity.name}() {\n    }\n\n${accessors}\n}\n`;
}

function accessor(name, type) {
  const suffix = name.charAt(0).toUpperCase() + name.slice(1);
  const prefix = type === "boolean" ? "is" : "get";
  return `    public ${type} ${prefix}${suffix}() {\n        return ${name};\n    }\n\n    public void set${suffix}(${type} ${name}) {\n        this.${name} = ${name};\n    }`;
}

function graphCypher(capability) {
  const lines = [`// Graph schema for ${capability.id}: ${capability.name}`];
  for (const entity of capability.domain.entities) {
    const key = toKebab(entity.name).replace(/-/g, "_");
    lines.push(`CREATE CONSTRAINT ${key}_id IF NOT EXISTS FOR (n:${entity.name}) REQUIRE n.id IS UNIQUE;`);
    if (entity.fields.some((field) => field.name === "name")) {
      lines.push(`CREATE INDEX ${key}_name IF NOT EXISTS FOR (n:${entity.name}) ON (n.name);`);
    }
    for (const field of entity.fields) {
      if (field.name === "id" || field.name === "name") continue;
      if (field.name.endsWith("Id")) {
        lines.push(`CREATE INDEX ${key}_${field.name} IF NOT EXISTS FOR (n:${entity.name}) ON (n.${field.name});`);
      }
    }
  }
  for (const query of capability.graph.queries ?? []) {
    lines.push("");
    lines.push(`// ${query.name}${query.read_only ? " (read-only)" : " (requires review)"}`);
    lines.push(query.cypher.trim());
  }
  return lines.join("\n") + "\n";
}

function memorySource(header, basePackage, capability) {
  return `${header}package ${basePackage}.memory;\n\nimport java.util.List;\n\n/**\n * Memory contract for ${capability.name}. Replace the in-memory implementation with a DICE\n * proposition repository when this capability moves to production.\n */\npublic interface ${capability.className}Memory {\n\n    List<String> recall(String userId, String context, int limit);\n\n    void remember(String userId, String context, String proposition);\n\n    void forget(String userId, String context, String proposition);\n}\n`;
}

function inMemorySource(header, basePackage, capability) {
  return `${header}package ${basePackage}.memory;\n\nimport org.springframework.stereotype.Component;\n\nimport java.util.List;\nimport java.util.Set;\nimport java.util.concurrent.ConcurrentHashMap;\n\n@Component\npublic class InMemory${capability.className}Memory implements ${capability.className}Memory {\n\n    private final ConcurrentHashMap<String, Set<String>> store = new ConcurrentHashMap<>();\n\n    @Override\n    public List<String> recall(String userId, String context, int limit) {\n        return store.getOrDefault(key(userId, context), Set.of())\n                .stream()\n                .limit(Math.max(1, limit))\n                .toList();\n    }\n\n    @Override\n    public void remember(String userId, String context, String proposition) {\n        store.computeIfAbsent(key(userId, context), ignored -> ConcurrentHashMap.newKeySet()).add(proposition);\n    }\n\n    @Override\n    public void forget(String userId, String context, String proposition) {\n        var propositions = store.get(key(userId, context));\n        if (propositions != null) {\n            propositions.remove(proposition);\n        }\n    }\n\n    private String key(String userId, String context) {\n        return userId + ":" + (context == null ? "default" : context);\n    }\n}\n`;
}

function pipelineSource(header, basePackage, capability) {
  const columns = capability.pipeline.columns.join(",");
  return `${header}package ${basePackage}.pipeline;\n\nimport org.springframework.beans.factory.annotation.Value;\nimport org.springframework.stereotype.Service;\n\nimport java.io.IOException;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\nimport java.util.ArrayList;\nimport java.util.LinkedHashMap;\nimport java.util.List;\nimport java.util.Map;\n\n/**\n * File-based review pipeline for ${capability.name}. No admin UI: reviewers edit the CSV,\n * commit it, then apply approved rows with confirm=true.\n */\n@Service\npublic class ${capability.className}Pipeline {\n\n    private static final String HEADER = "${columns}";\n    private static final String APPLIED_LEDGER = ".manna/pipeline-applied.txt";\n\n    private final Path candidates;\n\n    public ${capability.className}Pipeline(@Value("\${manna.data-dir:data}") String dataDir) {\n        this.candidates = Path.of(dataDir, "${capability.package}", "candidates.csv");\n        if (!Files.exists(this.candidates)) {\n            try {\n                Files.createDirectories(this.candidates.getParent());\n                Files.writeString(this.candidates, HEADER + "\\n");\n            } catch (IOException e) {\n                throw new IllegalStateException("Cannot create pipeline file " + this.candidates, e);\n            }\n        }\n    }\n\n    public Path candidatesPath() {\n        return candidates;\n    }\n\n    public List<Map<String, String>> readAll() {\n        try {\n            var lines = Files.readAllLines(candidates);\n            if (lines.isEmpty()) return List.of();\n            var header = lines.getFirst().split(",", -1);\n            var rows = new ArrayList<Map<String, String>>();\n            for (int i = 1; i < lines.size(); i++) {\n                if (lines.get(i).isBlank()) continue;\n                var values = lines.get(i).split(",", -1);\n                var row = new LinkedHashMap<String, String>();\n                for (int c = 0; c < header.length; c++) {\n                    row.put(header[c].trim(), c < values.length ? values[c].trim() : "");\n                }\n                rows.add(row);\n            }\n            return rows;\n        } catch (IOException e) {\n            throw new IllegalStateException("Cannot read " + candidates, e);\n        }\n    }\n\n    public List<Map<String, String>> approved() {\n        return readAll().stream()\n                .filter(row -> "approved".equalsIgnoreCase(row.getOrDefault("status", "")))\n                .toList();\n    }\n\n    public int applyApproved(boolean dryRun) {\n        var rows = approved();\n        if (dryRun) return rows.size();\n        var ids = rows.stream()\n                .map(row -> row.getOrDefault("id", ""))\n                .filter(id -> !id.isBlank())\n                .distinct()\n                .toList();\n        try {\n            Files.writeString(Path.of(APPLIED_LEDGER), String.join("\\n", ids) + "\\n");\n        } catch (IOException e) {\n            throw new IllegalStateException("Cannot write ledger", e);\n        }\n        // TODO(manna): write approved rows to Neo4j with an idempotent MERGE.\n        return ids.size();\n    }\n\n    public int rollback() {\n        var ledger = Path.of(APPLIED_LEDGER);\n        if (!Files.exists(ledger)) return 0;\n        try {\n            var ids = Files.readAllLines(ledger).stream().filter(line -> !line.isBlank()).toList();\n            // TODO(manna): delete only these ids from Neo4j.\n            Files.deleteIfExists(ledger);\n            return ids.size();\n        } catch (IOException e) {\n            throw new IllegalStateException("Cannot rollback", e);\n        }\n    }\n}\n`;
}

function pipelineControllerSource(header, basePackage, capability) {
  return `${header}package ${basePackage}.pipeline;\n\nimport org.springframework.web.bind.annotation.PathVariable;\nimport org.springframework.web.bind.annotation.PostMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RequestParam;\nimport org.springframework.web.bind.annotation.RestController;\n\nimport java.util.Map;\n\n@RestController\n@RequestMapping("/api/pipeline/${capability.package}")\npublic class ${capability.className}PipelineController {\n\n    private final ${capability.className}Pipeline pipeline;\n\n    public ${capability.className}PipelineController(${capability.className}Pipeline pipeline) {\n        this.pipeline = pipeline;\n    }\n\n    @PostMapping("/apply")\n    public Map<String, Object> apply(\n            @RequestParam(defaultValue = "false") boolean confirm,\n            @RequestParam(defaultValue = "true") boolean dryRun\n    ) {\n        if (!confirm) {\n            throw new IllegalArgumentException("confirm=true is required to apply approved rows");\n        }\n        var count = pipeline.applyApproved(dryRun);\n        return Map.of("applied", count, "dryRun", dryRun);\n    }\n\n    @PostMapping("/rollback")\n    public Map<String, Object> rollback() {\n        return Map.of("rolledBack", pipeline.rollback());\n    }\n}\n`;
}

function controllerSource(header, basePackage, capability, httpPath, rootPackage) {
  return `${header}package ${basePackage};\n\nimport ${rootPackage}.conversation.ChatResponse;\nimport ${rootPackage}.conversation.ConversationService;\nimport org.springframework.web.bind.annotation.PostMapping;\nimport org.springframework.web.bind.annotation.RequestBody;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class ${capability.className}Controller {\n\n    private final ConversationService conversations;\n\n    public ${capability.className}Controller(ConversationService conversations) {\n        this.conversations = conversations;\n    }\n\n    @PostMapping("${httpPath}")\n    public ChatResponse invoke(@RequestBody ${capability.className}Request request) {\n        return new ChatResponse(conversations.chat("${capability.id}", request.message()));\n    }\n}\n`;
}

function contractTestSource(header, basePackage, capability) {
  const checks = [];
  checks.push(`        assertTrue(Files.exists(Path.of(".manna", "features", "${capability.id}.spec.json")));`);
  checks.push(`        assertFalse(Files.readString(Path.of("pom.xml")).toLowerCase().contains("vaa" + "din"));`);
  checks.push(
    `        var request = new ${capability.className}Request("hello");\n        assertEquals("hello", request.message());`
  );
  if (capability.graph.enabled) {
    checks.push(
      `        assertTrue(Files.exists(Path.of("src", "main", "resources", "cypher", "${capability.id}.cypher")));`
    );
  }
  if (capability.pipeline.enabled) {
    checks.push(
      `        assertTrue(Files.exists(Path.of("data", "${capability.package}", "candidates.csv")));`
    );
  }

  return `${header}package ${basePackage};\n\nimport org.junit.jupiter.api.Test;\n\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\nimport static org.junit.jupiter.api.Assertions.assertEquals;\nimport static org.junit.jupiter.api.Assertions.assertFalse;\nimport static org.junit.jupiter.api.Assertions.assertTrue;\n\nclass ${capability.className}ContractTest {\n\n    @Test\n    void capabilityContractHolds() throws Exception {\n${checks.join("\n")}\n    }\n}\n`;
}

function capabilityDoc(project, capability) {
  const tools = capability.tools
    .map((tool) => `| \`${tool.name}\` | ${tool.kind} | \`${tool.side_effects}\` | ${tool.approval} |`)
    .join("\n");
  const entities = capability.domain.entities.map((entity) => `\`${entity.name}\``).join(", ") || "none";
  const relations = capability.domain.relations
    .map((relation) => `\`(${relation.from})-[:${relation.type}]->(${relation.to})\``)
    .join(", ") || "none";

  return `# ${capability.id}: ${capability.name}

## Intent
${capability.capability.user_intent.map((item) => `- ${item}`).join("\n")}

## Acceptance
${capability.capability.acceptance.map((item) => `- ${item}`).join("\n")}

## Non-goals
${capability.capability.non_goals.map((item) => `- ${item}`).join("\n") || "- none"}

## Domain
- Entities: ${entities}
- Relations: ${relations}
- Invariants: ${capability.domain.invariants.join("; ") || "none"}

## Graph
- Enabled: ${capability.graph.enabled ? "enabled" : "disabled"}
- Labels: ${(capability.graph.labels ?? []).join(", ") || "none"}
- Relationships: ${(capability.graph.relationships ?? []).join(", ") || "none"}

## Agent
- Mode: \`${capability.agent.mode}\`
- Goal: ${capability.agent.goal}
- Confirmations: ${capability.agent.confirmations.join(", ") || "none"}

## Tools
| Tool | Kind | Side effects | Approval |
|------|------|--------------|----------|
${tools || "| none | - | - | - |"}

## Memory
- Enabled: ${capability.memory.enabled ? "enabled" : "disabled"}
${capability.memory.enabled ? `- Propositions: ${capability.memory.propositions.join("; ")}` : `- Reason: ${capability.memory.reason}`}

## Pipeline
- Enabled: ${capability.pipeline.enabled ? "enabled" : "disabled"}
${capability.pipeline.enabled ? `- Format: ${capability.pipeline.format}` : `- Reason: ${capability.pipeline.reason}`}

## Transport
${capability.transport.http.map((path) => `- \`${path}\``).join("\n") || "- none"}
- SSE: ${capability.transport.sse}

## Evals
${capability.evals.map((item) => `- ${item}`).join("\n")}
`;
}

function firstCustomHttpPath(capability) {
  const core = new Set(["/api/chat", "/api/chat/stream", "/api/health"]);
  return capability.transport.http.find((value) => {
    const httpPath = typeof value === "string" ? value : value.path;
    return httpPath && !core.has(httpPath);
  });
}

function featureSpecPath(root, id) {
  return path.join(root, ".manna", "features", `${id}.spec.json`);
}

function assertNoDomainFork(project, capability) {
  const entities = new Map();
  const relations = new Map();

  for (const existingCapability of project.capabilities) {
    for (const entity of existingCapability.domain?.entities ?? []) {
      entities.set(entity.name, {
        capability: existingCapability.id,
        package: existingCapability.package,
        signature: fieldSignature(entity.fields ?? [])
      });
    }
    for (const relation of existingCapability.domain?.relations ?? []) {
      relations.set(relation.type, `${relation.from}->${relation.to}`);
    }
  }

  for (const entity of capability.domain.entities) {
    const existing = entities.get(entity.name);
    if (!existing) continue;
    if (existing.package !== capability.package) {
      throw new Error(
        `Entity ${entity.name} already exists in ${existing.capability} (${existing.package}). ` +
        `Do not fork it across slice packages; reuse it or move it to a shared domain package, then update the spec.`
      );
    }
    if (existing.signature !== fieldSignature(entity.fields ?? [])) {
      throw new Error(
        `Entity ${entity.name} has conflicting fields in ${existing.capability}; one canonical definition is required.`
      );
    }
  }

  for (const relation of capability.domain.relations) {
    const shape = `${relation.from}->${relation.to}`;
    const existing = relations.get(relation.type);
    if (existing && existing !== shape) {
      throw new Error(
        `Relation ${relation.type} already exists as ${existing}; refusing to create a conflicting shape ${shape}.`
      );
    }
  }
}

function fieldSignature(fields) {
  return fields
    .map((field) => `${field.name}:${field.type}`)
    .sort()
    .join(",");
}

function writeDomainRegistry(root, project) {
  const entities = {};
  const relations = {};

  for (const capability of project.capabilities) {
    for (const entity of capability.domain?.entities ?? []) {
      const record = entities[entity.name] ?? {
        capability: capability.id,
        package: capability.package,
        fields: entity.fields ?? [],
        relations: []
      };
      entities[entity.name] = record;
    }
    for (const relation of capability.domain?.relations ?? []) {
      relations[relation.type] = {
        from: relation.from,
        to: relation.to,
        direction: relation.direction ?? "OUTGOING",
        capability: capability.id
      };
      const source = entities[relation.from];
      if (source && !source.relations.some((value) => value.type === relation.type)) {
        source.relations.push({
          type: relation.type,
          to: relation.to,
          direction: relation.direction ?? "OUTGOING"
        });
      }
    }
  }

  writeJson(path.join(root, ".manna", "domain.json"), {
    version: 1,
    entities,
    relations
  });
}

function writeState(root, project, phase) {
  const state = {
    run_id: `RUN-${Date.now()}`,
    phase,
    capabilities: project.capabilities.map((capability) => capability.id),
    checkpoints: {},
    updated_at: new Date().toISOString()
  };
  writeJson(path.join(root, ".manna", "state.json"), state);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function writeJsonFile(created, root, relative, value) {
  write(created, root, relative, JSON.stringify(value, null, 2) + "\n");
}

function write(created, root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  if (relative.endsWith("mvnw")) {
    fs.chmodSync(target, 0o755);
  }
  created.push(relative);
}

function licenseHeader(holder) {
  return `/*\n * Copyright 2024-${YEAR} ${holder}\n *\n * Licensed under the Apache License, Version 2.0 (the "License");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n *     https://www.apache.org/licenses/LICENSE-2.0\n *\n * Unless required by applicable law or agreed to in writing, software\n * distributed under the License is distributed on an "AS IS" BASIS,\n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n * See the License for the specific language governing permissions and\n * limitations under the License.\n */\n`;
}

function javaString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}
