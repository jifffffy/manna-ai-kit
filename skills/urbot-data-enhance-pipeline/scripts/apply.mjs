import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MATCH_MODES = ["contains", "none"];
const NUMERIC_PROPERTIES = new Set(["confidence", "strength", "divergence"]);
const ALLOWED_PROPERTIES = new Set(["reason", "confidence", "strength", "divergence"]);

const KNOWN_VALUE_OPTIONS = new Set([
  "project",
  "bot",
  "name",
  "source",
  "target",
  "relationship",
  "match",
  "csv",
  "key",
  "properties",
  "sourceLabel",
  "targetLabel"
]);

export function applyDataPipeline(options) {
  const project = path.resolve(options.project);
  validateProject(project);

  const bot = options.bot;
  validateBot(project, bot);

  const name = options.name;
  validateName(name);
  const relationship = options.relationship;
  validateRelationship(relationship);
  const match = options.match ?? "contains";
  if (!MATCH_MODES.includes(match)) {
    throw new Error(`--match must be one of: ${MATCH_MODES.join(", ")}`);
  }

  const keyColumns = splitList(options.key ?? "sourceId,targetId");
  if (keyColumns.length !== 2 || !keyColumns.includes("sourceId") || !keyColumns.includes("targetId")) {
    throw new Error("--key must be exactly sourceId,targetId for a relationship batch.");
  }

  const properties = splitList(options.properties ?? "reason,confidence");
  if (!properties.includes("reason")) {
    throw new Error("--properties must include reason.");
  }
  for (const property of properties) {
    if (!ALLOWED_PROPERTIES.has(property)) {
      throw new Error(`Unsupported property: ${property}`);
    }
  }
  if (new Set(properties).size !== properties.length) {
    throw new Error("--properties contains duplicates.");
  }

  const csvPath = options.csv ?? `data/enhancements/${name}.csv`;
  if (path.isAbsolute(csvPath) || csvPath.split(/[\\/]/).includes("..")) {
    throw new Error("--csv must be a project-relative path without '..'.");
  }

  const source = inspectDomain(project, bot, options.source);
  const target = inspectDomain(project, bot, options.target);
  const sourceLabel = options.sourceLabel ?? source.name;
  const targetLabel = options.targetLabel ?? target.name;
  validateLabel(sourceLabel, "--source-label");
  validateLabel(targetLabel, "--target-label");

  const artifacts = buildArtifacts({
    project,
    bot,
    name,
    relationship,
    match,
    csvPath,
    keyColumns,
    properties,
    source,
    target,
    sourceLabel,
    targetLabel
  });

  const plan = {
    status: "approval-required",
    bot,
    batch: name,
    source: source.type,
    target: target.type,
    relationship,
    match,
    csvPath,
    keyColumns,
    properties,
    labels: { source: sourceLabel, target: targetLabel },
    files: artifacts.files.map((file) => file.relative).concat(artifacts.properties.relative),
    properties: {
      file: artifacts.properties.relative,
      append: artifacts.properties.lines
    }
  };

  if (!options.approve) return plan;

  const batchFiles = artifacts.files.filter((file) => file.kind === "batch");
  const existingBatch = batchFiles.filter((file) => fs.existsSync(file.absolute));
  if (existingBatch.length > 0 && !options.force) {
    return {
      ...plan,
      status: "existing",
      existingFiles: existingBatch.map((file) => file.relative)
    };
  }

  const createdFiles = [];
  const existingShared = [];
  for (const file of artifacts.files) {
    if (fs.existsSync(file.absolute) && !options.force) {
      existingShared.push(file.relative);
      continue;
    }
    fs.mkdirSync(path.dirname(file.absolute), { recursive: true });
    fs.writeFileSync(file.absolute, file.content);
    createdFiles.push(file.relative);
  }

  const appended = appendProperties(project, artifacts.properties);
  createdFiles.push(...appended.created);

  return {
    ...plan,
    status: "applied",
    createdFiles,
    existingProperties: appended.existing
  };
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

function validateBot(project, bot) {
  if (!bot || !/^[a-z][a-z0-9]*$/.test(bot)) {
    throw new Error("The bot name must be a lowercase Java identifier (letters and digits).");
  }
  const botDir = path.join(project, "src", "main", "java", "com", "embabel", "bot", bot);
  if (!fs.existsSync(botDir)) {
    throw new Error(`Bot package does not exist: ${bot}. Run the profile workflow first.`);
  }
  const properties = path.join(project, "src", "main", "resources", `application-${bot}.properties`);
  if (!fs.existsSync(properties)) {
    throw new Error(`Missing application-${bot}.properties. Run the profile workflow first.`);
  }
}

function validateName(name) {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error("The batch name must be lowercase letters, digits, or dashes.");
  }
}

function validateRelationship(relationship) {
  if (!relationship || !/^[A-Z][A-Z0-9_]*$/.test(relationship)) {
    throw new Error("--relationship must be an uppercase Neo4j relationship type, for example LOCATED_IN.");
  }
}

function validateLabel(label, option) {
  if (!label || !/^[A-Za-z][A-Za-z0-9_]*$/.test(label)) {
    throw new Error(`${option} must be a valid Neo4j label.`);
  }
}

function splitList(value) {
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function inspectDomain(project, bot, typeName) {
  if (!typeName || !/^[A-Z][A-Za-z0-9_]*$/.test(typeName)) {
    throw new Error(`Invalid domain type: ${typeName}`);
  }
  const domainDir = path.join(project, "src", "main", "java", "com", "embabel", "bot", bot, "domain");
  if (!fs.existsSync(domainDir)) {
    throw new Error(`Domain package does not exist: ${domainDir}. Run urbot-domain-design first.`);
  }

  const interfaces = new Map();
  for (const file of javaFiles(domainDir)) {
    const text = fs.readFileSync(file, "utf8");
    const packageName = text.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    if (!packageName) continue;
    const declaration = text.match(/interface\s+([A-Za-z0-9_]+)\s*(?:extends\s+([^{]+))?\{/s);
    if (!declaration) continue;
    const name = declaration[1];
    const parents = (declaration[2] ?? "")
      .split(",")
      .map((parent) => parent.replace(/<.*$/s, "").trim().split(".").pop())
      .filter(Boolean);
    if (interfaces.has(name)) {
      throw new Error(`Ambiguous domain type ${name}: declared in more than one package.`);
    }
    interfaces.set(name, { name, packageName, parents });
  }

  const found = interfaces.get(typeName);
  if (!found) {
    throw new Error(`Domain type ${typeName} was not found in ${domainDir}.`);
  }
  if (!isNamedEntity(typeName, interfaces, new Set())) {
    throw new Error(`Domain type ${typeName} does not extend NamedEntity.`);
  }

  return {
    name: found.name,
    packageName: found.packageName,
    type: `${found.packageName}.${found.name}`,
    import: `import ${found.packageName}.${found.name};`
  };
}

function isNamedEntity(name, interfaces, seen) {
  if (name === "NamedEntity") return true;
  if (seen.has(name)) return false;
  seen.add(name);
  const found = interfaces.get(name);
  if (!found) return false;
  return found.parents.some((parent) => isNamedEntity(parent, interfaces, seen));
}

function javaFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...javaFiles(absolute));
    else if (entry.name.endsWith(".java")) files.push(absolute);
  }
  return files;
}

function buildArtifacts(config) {
  const {
    project,
    bot,
    name,
    relationship,
    match,
    csvPath,
    keyColumns,
    properties,
    source,
    target,
    sourceLabel,
    targetLabel
  } = config;

  const packageName = `com.embabel.bot.${bot}.data`;
  const className = `${pascal(name)}Enhancer`;
  const columns = ["sourceId", "targetId", ...properties, "status"];
  const columnsJava = `List.of(${columns.map((column) => `"${column}"`).join(", ")})`;
  const propertiesJava = `List.of(${properties.map((property) => `"${property}"`).join(", ")})`;
  const keyJava = `List.of(${keyColumns.map((column) => `"${column}"`).join(", ")})`;

  const files = [
    { ...javaFile(packageName, "EnhancementBatch", "EnhancementBatch.java", enhancementBatchJava(packageName)), kind: "shared" },
    { ...javaFile(packageName, "ReviewCsv", "ReviewCsv.java", reviewCsvJava(packageName)), kind: "shared" },
    { ...javaFile(packageName, "EnhancementPipeline", "EnhancementPipeline.java", pipelineJava(packageName, bot)), kind: "shared" },
    { ...javaFile(
      packageName,
      className,
      `${className}.java`,
      enhancerJava({
        packageName,
        className,
        bot,
        name,
        relationship,
        match,
        source,
        target,
        sourceLabel,
        targetLabel,
        columnsJava,
        propertiesJava,
        keyJava,
        properties
      })
    ), kind: "batch" },
    { ...javaFile(
      packageName,
      "DataEnhancementController",
      "DataEnhancementController.java",
      controllerJava(packageName, bot)
    ), kind: "shared" },
    {
      relative: `src/test/java/com/embabel/bot/${bot}/data/${className}Test.java`,
      content: testJava(packageName, className),
      kind: "batch"
    }
  ].map((file) => ({
    ...file,
    absolute: path.join(project, file.relative)
  }));

  return {
    files,
    properties: {
      relative: `src/main/resources/application-${bot}.properties`,
      lines: [
        "urbot.data-enhancement.enabled=false",
        `urbot.data-enhancement.${name}.csv=${csvPath}`
      ]
    }
  };
}

function javaFile(packageName, typeName, fileName, content) {
  return {
    relative: `src/main/java/${packageName.split(".").join("/")}/${fileName}`,
    content
  };
}

function enhancementBatchJava(packageName) {
  return `package ${packageName};

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * One reviewable data enhancement batch.
 */
public interface EnhancementBatch {

    String id();

    Path csvPath();

    List<String> keyColumns();

    default boolean shouldGenerate() {
        return true;
    }

    default boolean shouldApply() {
        return true;
    }

    void generate() throws IOException;

    ApplyResult apply() throws IOException;

    record ApplyResult(int loaded, int skipped, int failed) {
    }
}
`;
}

function reviewCsvJava(packageName) {
  return `package ${packageName};

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Minimal quoted CSV reader/writer for review batches.
 */
public final class ReviewCsv {

    private ReviewCsv() {
    }

    public static String line(List<String> values) {
        var line = new StringBuilder();
        for (var index = 0; index < values.size(); index++) {
            if (index > 0) line.append(',');
            line.append(escape(values.get(index)));
        }
        return line.toString();
    }

    public static boolean hasRows(Path path) throws IOException {
        return Files.exists(path) && Files.readAllLines(path, StandardCharsets.UTF_8).size() > 1;
    }

    public static List<Map<String, String>> read(Path path, List<String> keyColumns) throws IOException {
        var lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("CSV is empty: " + path);
        }

        var header = parseLine(lines.get(0));
        var missing = new ArrayList<String>();
        for (var required : keyColumns) {
            if (!header.contains(required)) missing.add(required);
        }
        if (!header.contains("status") && !missing.contains("status")) missing.add("status");
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("CSV is missing columns " + missing + ": " + path);
        }

        var rows = new ArrayList<Map<String, String>>();
        var seen = new HashSet<String>();
        for (var lineIndex = 1; lineIndex < lines.size(); lineIndex++) {
            if (lines.get(lineIndex).isBlank()) continue;
            var values = parseLine(lines.get(lineIndex));
            if (values.size() != header.size()) {
                throw new IllegalArgumentException(
                        "CSV line " + (lineIndex + 1) + " has " + values.size()
                                + " fields but the header has " + header.size());
            }
            var row = new LinkedHashMap<String, String>();
            for (var column = 0; column < header.size(); column++) {
                row.put(header.get(column), values.get(column));
            }
            if (!keyColumns.isEmpty()) {
                var key = new StringBuilder();
                for (var keyColumn : keyColumns) {
                    key.append(row.getOrDefault(keyColumn, "")).append('\\u0000');
                }
                if (!seen.add(key.toString())) {
                    throw new IllegalArgumentException(
                            "CSV line " + (lineIndex + 1) + " duplicates key " + key);
                }
            }
            rows.add(row);
        }
        return rows;
    }

    public static String status(Map<String, String> row) {
        return row.getOrDefault("status", "").trim().toLowerCase(Locale.ROOT);
    }

    public static Map<String, Long> statusCounts(Path path) throws IOException {
        var counts = new LinkedHashMap<String, Long>();
        counts.put("pending", 0L);
        counts.put("approved", 0L);
        counts.put("rejected", 0L);
        if (!Files.exists(path) || Files.size(path) == 0) return counts;

        for (var row : read(path, List.of())) {
            var status = status(row);
            if (counts.containsKey(status)) counts.put(status, counts.get(status) + 1);
        }
        return counts;
    }

    private static String escape(String value) {
        var text = value == null ? "" : value;
        if (text.contains(",") || text.contains("\\"") || text.contains("\\n")) {
            return "\\"" + text.replace("\\"", "\\"\\"") + "\\"";
        }
        return text;
    }

    private static List<String> parseLine(String line) {
        var fields = new ArrayList<String>();
        var field = new StringBuilder();
        var quoted = false;
        for (var index = 0; index < line.length(); index++) {
            var character = line.charAt(index);
            if (quoted) {
                if (character == '"') {
                    if (index + 1 < line.length() && line.charAt(index + 1) == '"') {
                        field.append('"');
                        index++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(character);
                }
            } else if (character == '"') {
                quoted = true;
            } else if (character == ',') {
                fields.add(field.toString());
                field.setLength(0);
            } else {
                field.append(character);
            }
        }
        fields.add(field.toString());
        return fields;
    }
}
`;
}

function pipelineJava(packageName, bot) {
  return `package ${packageName};

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Discovers and runs the reviewable data enhancement batches.
 */
@Service
@Profile("${bot}")
public class EnhancementPipeline {

    private final Map<String, EnhancementBatch> batches;

    public EnhancementPipeline(List<EnhancementBatch> batches) {
        this.batches = batches.stream()
                .collect(Collectors.toMap(EnhancementBatch::id, Function.identity()));
    }

    public List<BatchInfo> infos() throws IOException {
        var infos = new ArrayList<BatchInfo>();
        for (var batch : batches.values()) {
            var counts = ReviewCsv.statusCounts(batch.csvPath());
            infos.add(new BatchInfo(
                    batch.id(),
                    batch.csvPath().toString(),
                    counts.getOrDefault("pending", 0L),
                    counts.getOrDefault("approved", 0L),
                    counts.getOrDefault("rejected", 0L)));
        }
        infos.sort(Comparator.comparing(BatchInfo::id));
        return infos;
    }

    public Optional<EnhancementBatch> batch(String id) {
        return Optional.ofNullable(batches.get(id));
    }

    public void generate(String id) throws IOException {
        batchOrFail(id).generate();
    }

    public EnhancementBatch.ApplyResult apply(String id) throws IOException {
        var batch = batchOrFail(id);
        if (!batch.shouldApply()) {
            return new EnhancementBatch.ApplyResult(0, 0, 0);
        }
        return batch.apply();
    }

    private EnhancementBatch batchOrFail(String id) {
        return batch(id).orElseThrow(() -> new IllegalArgumentException("Unknown batch: " + id));
    }

    public record BatchInfo(String id, String csvPath, long pending, long approved, long rejected) {
    }
}
`;
}

function enhancerJava(config) {
  const {
    packageName,
    className,
    bot,
    name,
    relationship,
    match,
    source,
    target,
    sourceLabel,
    targetLabel,
    columnsJava,
    propertiesJava,
    keyJava,
    properties
  } = config;

  const bindings = properties
    .filter((property) => property !== "reason")
    .map(
      (property) => `            bindings.put("${property}", Double.parseDouble(row.getOrDefault("${property}", "0")));`
    )
    .join("\n");
  const setClause = properties
    .map((property) => `r.${property} = $${property}`)
    .concat(["r.source = 'generated'", "r.reviewedAt = datetime()"])
    .join(", ");

  const pattern =
    match === "contains"
      ? `        var sourceName = source.getName() == null ? "" : source.getName().toLowerCase(Locale.ROOT);
        var candidates = new ArrayList<Candidate>();
        for (var target : targets) {
            var targetName = target.getName() == null ? "" : target.getName().toLowerCase(Locale.ROOT);
            if (!targetName.isEmpty() && sourceName.contains(targetName)) {
                candidates.add(new Candidate(source.getId(), target.getId(), Map.of(
                        "reason", "Name contains " + target.getName(),
                        "confidence", "0.50")));
            }
        }
        return candidates;`
      : `        // TODO: implement the domain pattern. Return candidates with the configured properties.
        return List.of();`;

  return `package ${packageName};

${source.import}
${target.import}
import com.embabel.agent.rag.service.NamedEntityDataRepository;
import org.drivine.manager.PersistenceManager;
import org.drivine.query.QuerySpecification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * ${name}: generates pending candidates and applies approved rows as ${relationship}.
 */
@Component
@Profile("${bot}")
public class ${className} implements EnhancementBatch {

    public static final String ID = "${name}";

    private static final Logger log = LoggerFactory.getLogger(${className}.class);
    private static final List<String> KEY_COLUMNS = ${keyJava};
    private static final List<String> CSV_COLUMNS = ${columnsJava};
    private static final List<String> PROPERTIES = ${propertiesJava};

    private static final String EXISTS_QUERY = """
            MATCH (source:${sourceLabel} {id: $sourceId})-[r:${relationship}]->(target:${targetLabel} {id: $targetId})
            RETURN count(r) AS count
            """;

    private static final String CREATE_QUERY = """
            MATCH (source:${sourceLabel} {id: $sourceId})
            MATCH (target:${targetLabel} {id: $targetId})
            MERGE (source)-[r:${relationship}]->(target)
            SET ${setClause}
            RETURN count(r) AS written
            """;

    private static final String COUNT_QUERY = """
            MATCH ()-[r:${relationship}]->()
            RETURN count(r) AS count
            """;

    private final NamedEntityDataRepository entityRepository;
    private final PersistenceManager persistenceManager;
    private final Path csvPath;

    public ${className}(
            NamedEntityDataRepository entityRepository,
            PersistenceManager persistenceManager,
            @Value("\${urbot.data-enhancement.${name}.csv:data/enhancements/${name}.csv}") String csvPath) {
        this.entityRepository = entityRepository;
        this.persistenceManager = persistenceManager;
        this.csvPath = Path.of(csvPath);
    }

    @Override
    public String id() {
        return ID;
    }

    @Override
    public Path csvPath() {
        return csvPath;
    }

    @Override
    public List<String> keyColumns() {
        return KEY_COLUMNS;
    }

    @Override
    public boolean shouldGenerate() {
        try {
            return !ReviewCsv.hasRows(csvPath);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read " + csvPath, exception);
        }
    }

    @Override
    public void generate() throws IOException {
        if (!shouldGenerate()) {
            log.info("[{}] CSV already contains rows - skipping generation", ID);
            return;
        }

        if (csvPath.getParent() != null) {
            Files.createDirectories(csvPath.getParent());
        }
        var sources = entityRepository.findAll(${source.name}.class);
        var targets = entityRepository.findAll(${target.name}.class);
        var lines = new ArrayList<String>();
        lines.add(ReviewCsv.line(CSV_COLUMNS));

        for (var source : sources) {
            for (var candidate : candidatesFor(source, targets)) {
                var values = new ArrayList<String>();
                values.add(candidate.sourceId());
                values.add(candidate.targetId());
                for (var property : PROPERTIES) {
                    values.add(candidate.values().getOrDefault(property, ""));
                }
                values.add("pending");
                lines.add(ReviewCsv.line(values));
            }
        }

        Files.write(csvPath, lines, StandardCharsets.UTF_8);
        log.info("[{}] Wrote {} pending candidates to {}", ID, lines.size() - 1, csvPath);
    }

    /**
     * Domain pattern hook. Candidates are written as pending and reviewed before apply.
     */
    private List<Candidate> candidatesFor(${source.name} source, List<${target.name}> targets) {
${pattern}
    }

    @Override
    public boolean shouldApply() {
        var count = persistenceManager.getOne(
                QuerySpecification.withStatement(COUNT_QUERY).transform(Long.class));
        return count == null || count == 0;
    }

    @Override
    @Transactional
    public EnhancementBatch.ApplyResult apply() throws IOException {
        var rows = ReviewCsv.read(csvPath, KEY_COLUMNS);
        var loaded = 0;
        var skipped = 0;
        var failed = 0;

        for (var row : rows) {
            if (!"approved".equals(ReviewCsv.status(row))) continue;

            var sourceId = row.getOrDefault("sourceId", "");
            var targetId = row.getOrDefault("targetId", "");
            var exists = persistenceManager.getOne(
                    QuerySpecification.withStatement(EXISTS_QUERY)
                            .bind(Map.of("sourceId", sourceId, "targetId", targetId))
                            .transform(Long.class));
            if (exists != null && exists > 0) {
                skipped++;
                continue;
            }

            var bindings = new HashMap<String, Object>();
            bindings.put("sourceId", sourceId);
            bindings.put("targetId", targetId);
            bindings.put("reason", row.getOrDefault("reason", ""));
${bindings}

            try {
                persistenceManager.execute(
                        QuerySpecification.withStatement(CREATE_QUERY).bind(bindings));
                loaded++;
            } catch (Exception exception) {
                failed++;
                log.warn("[{}] Could not write {} -> {}: {}", ID, sourceId, targetId, exception.getMessage());
            }
        }

        log.info("[{}] Apply complete: {} loaded, {} skipped, {} failed", ID, loaded, skipped, failed);
        return new EnhancementBatch.ApplyResult(loaded, skipped, failed);
    }

    private record Candidate(String sourceId, String targetId, Map<String, String> values) {
    }
}
`;
}

function controllerJava(packageName, bot) {
  return `package ${packageName};

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

/**
 * Headless generate/apply surface. Disabled by default; enable with
 * urbot.data-enhancement.enabled=true. There is intentionally no force or delete operation.
 */
@RestController
@RequestMapping("/api/data-enhancements")
@Profile("${bot}")
@ConditionalOnProperty(name = "urbot.data-enhancement.enabled", havingValue = "true")
public class DataEnhancementController {

    private final EnhancementPipeline pipeline;

    public DataEnhancementController(EnhancementPipeline pipeline) {
        this.pipeline = pipeline;
    }

    @GetMapping
    public List<EnhancementPipeline.BatchInfo> list() throws IOException {
        return pipeline.infos();
    }

    @PostMapping("/{id}/generate")
    public GenerateResponse generate(@PathVariable String id) throws IOException {
        pipeline.batch(id).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Unknown batch: " + id));
        pipeline.generate(id);
        return new GenerateResponse(id, "generated");
    }

    @PostMapping("/{id}/apply")
    public EnhancementBatch.ApplyResult apply(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean confirm) throws IOException {
        if (!confirm) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Apply requires confirm=true after human review.");
        }
        pipeline.batch(id).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Unknown batch: " + id));
        return pipeline.apply(id);
    }

    public record GenerateResponse(String id, String status) {
    }
}
`;
}

function testJava(packageName, className) {
  return `package ${packageName};

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ${className}Test {

    @TempDir
    Path temp;

    @Test
    void readsQuotedReasonAndCountsStatuses() throws Exception {
        var csv = temp.resolve("review.csv");
        Files.writeString(csv, """
                sourceId,targetId,reason,confidence,status
                a,b,"influenced, directly",0.90,approved
                a,c,"studied with",0.80,pending
                """);

        var rows = ReviewCsv.read(csv, List.of("sourceId", "targetId"));

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).get("reason")).isEqualTo("influenced, directly");
        assertThat(ReviewCsv.status(rows.get(0))).isEqualTo("approved");
        assertThat(ReviewCsv.statusCounts(csv))
                .containsEntry("approved", 1L)
                .containsEntry("pending", 1L);
    }

    @Test
    void rejectsDuplicateKeys() throws Exception {
        var csv = temp.resolve("duplicate.csv");
        Files.writeString(csv, """
                sourceId,targetId,reason,confidence,status
                a,b,"first",0.90,approved
                a,b,"second",0.80,approved
                """);

        assertThatThrownBy(() -> ReviewCsv.read(csv, List.of("sourceId", "targetId")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duplicates key");
    }

    @Test
    void rejectsUnknownStatusInCounts() throws Exception {
        var csv = temp.resolve("unknown.csv");
        Files.writeString(csv, """
                sourceId,targetId,reason,confidence,status
                a,b,"first",0.90,maybe
                """);

        var counts = ReviewCsv.statusCounts(csv);

        assertThat(counts.get("pending")).isZero();
        assertThat(counts.get("approved")).isZero();
    }
}
`;
}

function appendProperties(project, target) {
  const absolute = path.join(project, target.relative);
  const current = fs.readFileSync(absolute, "utf8");
  const lines = current.split(/\r?\n/);
  const present = new Set(lines.map((line) => line.trim()));
  const missing = target.lines.filter((line) => !present.has(line));
  if (missing.length === 0) {
    return { created: [], existing: [target.relative] };
  }
  const prefix = current.length === 0 ? "" : current.endsWith("\n") ? current : `${current}\n`;
  fs.writeFileSync(absolute, `${prefix}${missing.join("\n")}\n`);
  return { created: [target.relative], existing: [] };
}

function pascal(value) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function normalizeKey(key) {
  return key.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

function parseArgs(args) {
  const options = { match: "contains" };
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
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const rawKey = arg.slice(2);
    const key = normalizeKey(rawKey);
    if (!KNOWN_VALUE_OPTIONS.has(key)) {
      throw new Error(`Unknown option: --${rawKey}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${rawKey}`);
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

function usage() {
  return {
    usage: [
      "node skills/urbot-data-enhance-pipeline/scripts/apply.mjs --project <dir> --bot <bot> --name <batch> --source <Type> --target <Type> --relationship <REL> [--match contains|none] [--csv <path>] [--properties reason,confidence] [--source-label <Label>] [--target-label <Label>] [--approve] [--force]"
    ]
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = options.help
      ? usage()
      : applyDataPipeline({
          project: requireOption(options, "project"),
          bot: requireOption(options, "bot"),
          name: requireOption(options, "name"),
          source: requireOption(options, "source"),
          target: requireOption(options, "target"),
          relationship: requireOption(options, "relationship"),
          match: options.match,
          csv: options.csv,
          key: options.key,
          properties: options.properties,
          sourceLabel: options.sourceLabel,
          targetLabel: options.targetLabel,
          approve: options.approve,
          force: options.force
        });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

function requireOption(options, key) {
  if (!options[key]) throw new Error(`Missing required --${key}.`);
  return options[key];
}
