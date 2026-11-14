import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COLORS = ["moment-interval", "role", "party-place-thing", "description", "milled"];
const DDD_VARIANTS = ["aggregate-root", "entity", "catalog-entity", "value-object"];
const DIRECTIONS = ["OUTGOING", "INCOMING", "BOTH"];
const COLOR_VARIANTS = {
  "moment-interval": ["aggregate-root", "entity"],
  role: ["entity", "value-object"],
  "party-place-thing": ["entity", "aggregate-root"],
  description: ["value-object", "catalog-entity"],
  milled: ["value-object"]
};
const PRIMITIVES = new Set(["int", "long", "double", "float", "boolean", "short", "byte", "char"]);
const IMPORTS = {
  LocalDate: "java.time.LocalDate",
  LocalDateTime: "java.time.LocalDateTime",
  Instant: "java.time.Instant",
  BigDecimal: "java.math.BigDecimal",
  UUID: "java.util.UUID"
};

export function applyDomainDesign(options) {
  const project = path.resolve(options.project);
  validateProject(project);
  const bot = options.bot;
  if (!bot || !/^[a-z][a-z0-9]*$/.test(bot)) {
    throw new Error("--bot must be a lowercase Java identifier.");
  }
  if (!options.model) throw new Error("--model is required.");

  const botDir = path.join(project, "src", "main", "java", "com", "embabel", "bot", bot);
  const propertiesRelative = `src/main/resources/application-${bot}.properties`;
  const properties = path.join(project, propertiesRelative);
  if (!fs.existsSync(botDir) || !fs.existsSync(properties)) {
    return {
      status: "profile-required",
      route: "urbot-profile-change",
      bot,
      message: `Create the ${bot} profile before designing its domain.`
    };
  }

  const model = readModel(options.model);
  validateModel(model);
  const built = buildArtifacts({ project, bot, model });
  const entityPackage = `com.embabel.bot.${bot}`;
  const propertyUpdate = ensureEntityPackage(fs.readFileSync(properties, "utf8"), entityPackage);
  const files = [...built.files];
  if (propertyUpdate.changed) {
    files.push({
      relative: propertiesRelative,
      absolute: properties,
      content: propertyUpdate.content
    });
  }

  const plan = {
    status: "approval-required",
    bot,
    boundedContext: model.boundedContext,
    ubiquitousLanguage: model.ubiquitousLanguage ?? [],
    colorModel: colorModel(model),
    dddModel: dddModel(model),
    entityPackage,
    files: files.map((file) => file.relative),
    tests: built.tests
  };

  if (!options.approve) return plan;

  const existing = built.files.filter((file) => fs.existsSync(file.absolute));
  if (existing.length > 0 && !options.force) {
    return { ...plan, status: "existing", existingFiles: existing.map((file) => file.relative) };
  }

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.absolute), { recursive: true });
    fs.writeFileSync(file.absolute, file.content);
  }

  return {
    ...plan,
    status: "applied",
    createdFiles: files.map((file) => file.relative),
    existingFiles: []
  };
}

function buildArtifacts({ project, bot, model }) {
  const domainDir = path.join(project, "src", "main", "java", "com", "embabel", "bot", bot, "domain");
  const eventsDir = path.join(domainDir, "events");
  const testDir = path.join(project, "src", "test", "java", "com", "embabel", "bot", bot, "domain");
  const files = [];
  const tests = [];

  for (const cls of model.classes.filter((item) => item.dddVariant !== "value-object")) {
    files.push({
      relative: `src/main/java/com/embabel/bot/${bot}/domain/${cls.name}.java`,
      absolute: path.join(domainDir, `${cls.name}.java`),
      content: entityInterface({ bot, cls })
    });
  }

  for (const cls of model.classes.filter((item) => item.dddVariant === "value-object")) {
    files.push({
      relative: `src/main/java/com/embabel/bot/${bot}/domain/${cls.name}.java`,
      absolute: path.join(domainDir, `${cls.name}.java`),
      content: valueRecord({ bot, cls })
    });
    files.push({
      relative: `src/test/java/com/embabel/bot/${bot}/domain/${cls.name}Test.java`,
      absolute: path.join(testDir, `${cls.name}Test.java`),
      content: valueTest({ bot, cls })
    });
    tests.push(`src/test/java/com/embabel/bot/${bot}/domain/${cls.name}Test.java`);
  }

  for (const event of model.events ?? []) {
    files.push({
      relative: `src/main/java/com/embabel/bot/${bot}/domain/events/${event.name}.java`,
      absolute: path.join(eventsDir, `${event.name}.java`),
      content: eventRecord({ bot, event })
    });
  }

  for (const service of model.services ?? []) {
    files.push({
      relative: `src/main/java/com/embabel/bot/${bot}/domain/${service.name}.java`,
      absolute: path.join(domainDir, `${service.name}.java`),
      content: serviceClass({ bot, service })
    });
  }

  const vocabularyTest = `src/test/java/com/embabel/bot/${bot}/domain/${pascal(bot)}DomainVocabularyTest.java`;
  files.push({
    relative: vocabularyTest,
    absolute: path.join(testDir, `${pascal(bot)}DomainVocabularyTest.java`),
    content: vocabularyTestClass({ bot, model })
  });
  tests.push(vocabularyTest);

  return { files, tests };
}

function entityInterface({ bot, cls }) {
  const imports = new Set(["com.embabel.agent.rag.model.NamedEntity", "com.embabel.agent.core.CreationPermitted"]);
  if (cls.description) imports.add("com.fasterxml.jackson.annotation.JsonClassDescription");
  const lines = [];

  for (const attribute of cls.attributes ?? []) {
    addImport(imports, attribute.type);
    if (attribute.description) {
      imports.add("com.fasterxml.jackson.annotation.JsonPropertyDescription");
      lines.push(`    @JsonPropertyDescription(${javaString(attribute.description)})`);
    }
    if (attribute.optional) {
      imports.add("org.jspecify.annotations.Nullable");
      lines.push("    @Nullable");
    }
    lines.push(`    ${attribute.type} ${camel(attribute.name)}();`);
  }

  for (const relationship of cls.relationships ?? []) {
    imports.add("com.embabel.agent.rag.model.Relationship");
    if (relationship.cardinality === "many") imports.add("java.util.List");
    if (relationship.optional) imports.add("org.jspecify.annotations.Nullable");
    const direction = relationship.direction ?? "OUTGOING";
    if (direction !== "OUTGOING") imports.add("com.embabel.agent.rag.model.RelationshipDirection");
    if (relationship.optional) lines.push("    @Nullable");
    const annotation =
      direction === "OUTGOING"
        ? `@Relationship(name = "${relationship.type}")`
        : `@Relationship(name = "${relationship.type}", direction = RelationshipDirection.${direction})`;
    lines.push(`    ${annotation}`);
    const type =
      relationship.cardinality === "many" ? `List<${relationship.target}>` : relationship.target;
    lines.push(`    ${type} ${relationship.method}();`);
  }

  const annotations = [`@CreationPermitted(${creationPermitted(cls)})`];
  if (cls.description) annotations.push(`@JsonClassDescription(${javaString(cls.description)})`);

  return `${packageAndImports(bot, "domain", imports)}
${annotations.join("\n")}
public interface ${cls.name} extends NamedEntity {
${lines.join("\n")}
}
`;
}

function valueRecord({ bot, cls }) {
  const imports = new Set();
  for (const attribute of cls.attributes ?? []) addImport(imports, attribute.type);
  if ((cls.attributes ?? []).some((attribute) => attribute.optional)) {
    imports.add("org.jspecify.annotations.Nullable");
  }
  const components = (cls.attributes ?? []).map(
    (attribute) =>
      `${attribute.optional ? "@Nullable " : ""}${attribute.type} ${camel(attribute.name)}`
  );
  const checks = (cls.attributes ?? [])
    .filter((attribute) => !attribute.optional && !PRIMITIVES.has(attribute.type))
    .map((attribute) => {
      const name = camel(attribute.name);
      return `        if (${name} == null) throw new IllegalArgumentException("${name} is required");`;
    });
  return `${packageAndImports(bot, "domain", imports)}
public record ${cls.name}(${components.join(", ")}) {
    public ${cls.name} {
${checks.join("\n")}
    }
}
`;
}
function valueTest({ bot, cls }) {
  const fields = cls.attributes ?? [];
  const allReference = fields.length > 0 && fields.every((attribute) => !PRIMITIVES.has(attribute.type));
  const nullArgs = fields.map(() => "null").join(", ");
  return `package com.embabel.bot.${bot}.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ${cls.name}Test {

    @Test
    void isRecord() {
        assertThat(${cls.name}.class.isRecord()).isTrue();
    }
${allReference ? `
    @Test
    void rejectsMissingValues() {
        assertThatThrownBy(() -> new ${cls.name}(${nullArgs}))
                .isInstanceOf(IllegalArgumentException.class);
    }
` : ""}}
`;
}

function eventRecord({ bot, event }) {
  const imports = new Set(["java.time.Instant"]);
  const fields = [...(event.fields ?? [])];
  if (!fields.some((field) => field.name === "occurredAt")) {
    fields.push({ name: "occurredAt", type: "Instant" });
  }
  for (const field of fields) addImport(imports, field.type);
  const components = fields.map((field) => `${field.type} ${camel(field.name)}`);
  return `${packageAndImports(bot, "domain.events", imports)}
public record ${event.name}(${components.join(", ")}) {
}
`;
}

function serviceClass({ bot, service }) {
  return `package com.embabel.bot.${bot}.domain;

import org.springframework.stereotype.Service;

@Service
public class ${service.name} {
}
`;
}

function vocabularyTestClass({ bot, model }) {
  const entityNames = model.classes
    .filter(
      (cls) =>
        cls.dddVariant === "entity" ||
        cls.dddVariant === "aggregate-root" ||
        cls.dddVariant === "catalog-entity"
    )
    .map((cls) => cls.name);
  const valueObjects = model.classes.filter((cls) => cls.dddVariant === "value-object").map((cls) => cls.name);
  const events = (model.events ?? []).map((event) => event.name);
  const eventImports = events
    .map((name) => `import com.embabel.bot.${bot}.domain.events.${name};`)
    .join("\n");
  const recordChecks = [...valueObjects, ...events]
    .map((name) => `        assertThat(${name}.class.isRecord()).isTrue();`)
    .join("\n");
  const entityCheck = entityNames.length
    ? `        assertThat(dictionary.getDomainTypes())
                .extracting(DomainType::getName)
                .contains(${entityNames.map((name) => `"com.embabel.bot.${bot}.domain.${name}"`).join(", ")});`
    : `        assertThat(dictionary).isNotNull();`;
  return `package com.embabel.bot.${bot}.domain;

import com.embabel.agent.core.DataDictionary;
import com.embabel.agent.core.DomainType;
import com.embabel.agent.rag.model.NamedEntity;
import org.junit.jupiter.api.Test;
${eventImports ? `\n${eventImports}\n` : ""}
import static org.assertj.core.api.Assertions.assertThat;

class ${pascal(bot)}DomainVocabularyTest {

    @Test
    void registersDomainTypes() {
        DataDictionary dictionary = NamedEntity.dataDictionaryFromPackages("com.embabel.bot.${bot}");
${entityCheck}
    }

    @Test
    void valueObjectsAndEventsAreRecords() {
${recordChecks}
    }
}
`;
}

function javaString(value) {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")}"`;
}

function packageAndImports(bot, subpackage, imports) {
  const sorted = [...imports].sort();
  const importLines = sorted.length ? `${sorted.map((item) => `import ${item};`).join("\n")}\n\n` : "";
  return `package com.embabel.bot.${bot}.${subpackage};

${importLines}`;
}

function addImport(imports, type) {
  if (IMPORTS[type]) imports.add(IMPORTS[type]);
}

function ensureEntityPackage(content, entityPackage) {
  const prefix = "urbot.memory.entity-packages=";
  const lines = content.split("\n");
  const index = lines.findIndex((line) => line.startsWith(prefix));
  if (index >= 0) {
    const values = lines[index]
      .slice(prefix.length)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.includes(entityPackage)) return { changed: false, content };
    values.push(entityPackage);
    lines[index] = `${prefix}${values.join(",")}`;
    return { changed: true, content: lines.join("\n") };
  }
  const suffix = content.endsWith("\n") ? "" : "\n";
  return { changed: true, content: `${content}${suffix}${prefix}${entityPackage}\n` };
}

function validateProject(project) {
  if (!fs.existsSync(project)) throw new Error(`Project directory does not exist: ${project}`);
  if (!fs.existsSync(path.join(project, "pom.xml"))) {
    throw new Error(`Not a Urbot checkout (missing pom.xml): ${project}`);
  }
  if (!fs.existsSync(path.join(project, "src", "main", "java", "com", "embabel", "urbot"))) {
    throw new Error(`Not a Urbot checkout (missing com/embabel/urbot): ${project}`);
  }
}

function readModel(file) {
  if (!fs.existsSync(file)) throw new Error(`Model file does not exist: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateModel(model) {
  if (!model || typeof model !== "object") throw new Error("Model must be an object.");
  if (model.schemaVersion !== 2) {
    throw new Error("Domain model schema version must be 2; migrate the model first.");
  }
  if (!model.boundedContext) throw new Error("Model needs a boundedContext.");
  if (!Array.isArray(model.classes) || model.classes.length === 0) {
    throw new Error("Model needs at least one class.");
  }

  const names = new Set();
  const byName = new Map();
  for (const cls of model.classes) {
    if (!cls.name || !/^[A-Z][A-Za-z0-9]*$/.test(cls.name)) {
      throw new Error(`Invalid class name: ${cls.name}`);
    }
    if (names.has(cls.name)) throw new Error(`Duplicate class name: ${cls.name}`);
    names.add(cls.name);
    byName.set(cls.name, cls);

    if (!COLORS.includes(cls.color)) throw new Error(`Invalid color for ${cls.name}: ${cls.color}`);
    if (!DDD_VARIANTS.includes(cls.dddVariant)) {
      throw new Error(`Invalid DDD variant for ${cls.name}: ${cls.dddVariant}`);
    }
    if (!COLOR_VARIANTS[cls.color].includes(cls.dddVariant)) {
      throw new Error(`Color ${cls.color} cannot be a ${cls.dddVariant} (${cls.name})`);
    }
    if (cls.creationPermitted !== undefined && typeof cls.creationPermitted !== "boolean") {
      throw new Error(`creationPermitted must be a boolean on ${cls.name}.`);
    }
    if (cls.creationPermitted !== undefined && cls.dddVariant === "value-object") {
      throw new Error(`creationPermitted is only valid on graph entities, not ${cls.name}.`);
    }
    if (cls.description !== undefined && typeof cls.description !== "string") {
      throw new Error(`description must be a string on ${cls.name}.`);
    }

    cls.attributes = cls.attributes ?? [];
    cls.relationships = cls.relationships ?? [];
    cls.invariants = cls.invariants ?? [];

    for (const attribute of cls.attributes) {
      if (!attribute.name || !attribute.type) throw new Error(`Invalid attribute on ${cls.name}`);
      if (attribute.optional !== undefined && typeof attribute.optional !== "boolean") {
        throw new Error(`optional must be a boolean on ${cls.name}.${attribute.name}.`);
      }
      if (attribute.optional && PRIMITIVES.has(attribute.type)) {
        throw new Error(`Optional attribute ${cls.name}.${attribute.name} cannot be a primitive.`);
      }
      if (attribute.description !== undefined && typeof attribute.description !== "string") {
        throw new Error(`description must be a string on ${cls.name}.${attribute.name}.`);
      }
    }

    const methods = new Set();
    for (const relationship of cls.relationships) {
      if (!relationship.method || !/^[a-z][A-Za-z0-9]*$/.test(relationship.method)) {
        throw new Error(`Invalid relationship method on ${cls.name}: ${relationship.method}`);
      }
      if (methods.has(relationship.method)) {
        throw new Error(`Duplicate relationship method ${cls.name}.${relationship.method}`);
      }
      methods.add(relationship.method);
      if (!relationship.type || !/^[A-Z][A-Z0-9_]*$/.test(relationship.type)) {
        throw new Error(`Invalid relationship type on ${cls.name}: ${relationship.type}`);
      }
      if (!relationship.target) throw new Error(`Relationship ${cls.name}.${relationship.method} needs a target`);
      if (!["one", "many"].includes(relationship.cardinality)) {
        throw new Error(`Invalid cardinality on ${cls.name}.${relationship.method}`);
      }
      if (relationship.optional !== undefined && typeof relationship.optional !== "boolean") {
        throw new Error(`optional must be a boolean on ${cls.name}.${relationship.method}.`);
      }
      if (relationship.optional && relationship.cardinality === "many") {
        throw new Error(`Optional is only valid for a single relationship (${cls.name}.${relationship.method}).`);
      }
      const direction = relationship.direction ?? "OUTGOING";
      if (!DIRECTIONS.includes(direction)) {
        throw new Error(`Invalid direction on ${cls.name}.${relationship.method}: ${direction}`);
      }
    }

    if (cls.dddVariant === "value-object" && cls.relationships.length > 0) {
      throw new Error(`Value object ${cls.name} cannot declare relationships.`);
    }
  }

  for (const cls of model.classes) {
    for (const relationship of cls.relationships) {
      const target = byName.get(relationship.target);
      if (!target) {
        throw new Error(`Relationship ${cls.name}.${relationship.method} targets unknown ${relationship.target}`);
      }
      if (target.dddVariant === "value-object") {
        throw new Error(
          `Relationship ${cls.name}.${relationship.method} targets value object ${relationship.target}; use an attribute instead.`
        );
      }
    }
  }

  for (const event of model.events ?? []) {
    if (!event.name || !/^[A-Z][A-Za-z0-9]*$/.test(event.name)) throw new Error(`Invalid event ${event.name}`);
    event.fields = event.fields ?? [];
  }
  for (const service of model.services ?? []) {
    if (!service.name || !/^[A-Z][A-Za-z0-9]*$/.test(service.name)) {
      throw new Error(`Invalid service ${service.name}`);
    }
  }
}

function colorModel(model) {
  return model.classes.map((cls) => ({
    name: cls.name,
    color: cls.color,
    dddVariant: cls.dddVariant,
    creationPermitted: creationPermitted(cls),
    responsibility: cls.description,
    attributes: cls.attributes,
    relationships: cls.relationships,
    invariants: cls.invariants
  }));
}

function creationPermitted(cls) {
  if (cls.creationPermitted !== undefined) return cls.creationPermitted;
  return cls.dddVariant !== "catalog-entity";
}

function dddModel(model) {
  return {
    boundedContext: model.boundedContext,
    ubiquitousLanguage: model.ubiquitousLanguage ?? [],
    aggregates: model.classes.filter((cls) => cls.dddVariant === "aggregate-root").map((cls) => cls.name),
    entities: model.classes
      .filter((cls) => cls.dddVariant === "entity" || cls.dddVariant === "aggregate-root")
      .map((cls) => cls.name),
    catalogEntities: model.classes
      .filter((cls) => cls.dddVariant === "catalog-entity")
      .map((cls) => cls.name),
    valueObjects: model.classes.filter((cls) => cls.dddVariant === "value-object").map((cls) => cls.name),
    events: (model.events ?? []).map((event) => event.name),
    services: (model.services ?? []).map((service) => service.name),
    repositories: ["NamedEntityDataRepository"]
  };
}

function pascal(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function camel(value) {
  const name = pascal(value);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--approve") {
      options.approve = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[toCamel(key)] = value;
    index += 1;
  }
  return options;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function usage() {
  return {
    usage: [
      "node skills/urbot-domain-design/scripts/apply.mjs --project <dir> --bot <bot> --model <domain-model.json> [--approve] [--force]"
    ]
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = options.help ? usage() : applyDomainDesign(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
