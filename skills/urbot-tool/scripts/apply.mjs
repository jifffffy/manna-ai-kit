import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const KINDS = ["llm-tool", "llm-reference", "toolish-rag", "subagent", "mcp"];
const SIDE_EFFECTS = ["read", "internal-write", "external-write", "destructive"];
const REQUIRES = ["none", "domain", "memory", "domain+memory"];

export function applyTool(options) {
  const project = path.resolve(options.project);
  validateProject(project);
  validateOptions(options);

  const bot = options.bot;
  const botDir = path.join(project, "src", "main", "java", "com", "embabel", "bot", bot);
  const propertiesRelative = `src/main/resources/application-${bot}.properties`;
  const properties = path.join(project, propertiesRelative);
  if (!fs.existsSync(botDir) || !fs.existsSync(properties)) {
    return {
      status: "profile-required",
      route: "urbot-profile-change",
      bot,
      kind: options.kind,
      message: `Create the ${bot} profile before adding a tool.`
    };
  }

  const sideEffect = options.sideEffect;
  const secrets = parseList(options.secrets);
  const idempotency = {
    key: options.idempotencyKey ?? null,
    dryRun: Boolean(options.dryRun)
  };
  const requires = options.requires ?? "none";

  if (sideEffect === "destructive") {
    return {
      status: "blocked-destructive",
      bot,
      kind: options.kind,
      sideEffect,
      message: "Destructive tools require explicit human confirmation and are never auto-applied."
    };
  }

  if (sideEffect === "external-write") {
    const missing = [];
    if (!idempotency.key && !idempotency.dryRun) missing.push("idempotency key or dry-run");
    if (secrets.length === 0) missing.push("declared secret");
    if (missing.length > 0) {
      return {
        status: "blocked-external-write",
        bot,
        kind: options.kind,
        sideEffect,
        message: `External writes need ${missing.join(" and ")}.`
      };
    }
  }

  if (requires !== "none") {
    return {
      status: "route-required",
      route: "urbot-domain-memory",
      bot,
      kind: options.kind,
      requires,
      message: "Domain or memory changes must run as a separate workflow before the tool."
    };
  }

  const artifacts = buildArtifacts({ project, bot, sideEffect, idempotency, options, botDir, properties });
  const plan = {
    status: "approval-required",
    bot,
    kind: options.kind,
    name: options.name,
    sideEffect,
    secrets,
    idempotency,
    requires,
    collection: artifacts.collection,
    files: artifacts.files.map((file) => file.relative)
  };

  if (!options.approve) return plan;

  if (options.kind === "mcp") {
    const [propertiesFile, testFile] = artifacts.files;
    const createdFiles = [];
    const existingFiles = [];
    const current = fs.readFileSync(propertiesFile.absolute, "utf8");
    if (current.includes(propertiesFile.appendKey)) {
      existingFiles.push(propertiesFile.relative);
    } else {
      fs.writeFileSync(propertiesFile.absolute, propertiesFile.content);
      createdFiles.push(propertiesFile.relative);
    }
    if (fs.existsSync(testFile.absolute) && !options.force) {
      existingFiles.push(testFile.relative);
    } else {
      fs.mkdirSync(path.dirname(testFile.absolute), { recursive: true });
      fs.writeFileSync(testFile.absolute, testFile.content);
      createdFiles.push(testFile.relative);
    }
    return {
      ...plan,
      status: createdFiles.length > 0 ? "applied" : "existing",
      createdFiles,
      existingFiles
    };
  }

  const existing = artifacts.files.filter((file) => fs.existsSync(file.absolute));
  if (existing.length > 0 && !options.force) {
    return { ...plan, status: "existing", existingFiles: existing.map((file) => file.relative) };
  }

  for (const file of artifacts.files) {
    fs.mkdirSync(path.dirname(file.absolute), { recursive: true });
    fs.writeFileSync(file.absolute, file.content);
  }
  return { ...plan, status: "applied", createdFiles: artifacts.files.map((file) => file.relative) };
}

function buildArtifacts(config) {
  const { project, bot, options, botDir, properties } = config;
  const pascalName = pascal(options.name);
  const camelName = camel(options.name);
  const description = escapeJava(options.description ?? options.name);
  const toolName = escapeJava(options.name);

  if (options.kind === "mcp") {
    const transport = options.mcpTransport ?? "stdio";
    const block = mcpBlock({ bot, options, transport });
    const relative = path.relative(project, properties);
    const current = fs.readFileSync(properties, "utf8");
    const testRelative = `src/test/java/com/embabel/bot/${bot}/${pascalName}PropertiesTest.java`;
    return {
      collection: "MCP properties",
      files: [
        {
          relative,
          absolute: properties,
          content: `${current.trimEnd()}\n\n${block}\n`,
          appendKey: `spring.ai.mcp.client.${transport}.connections.${options.name}.`
        },
        {
          relative: testRelative,
          absolute: path.join(project, testRelative),
          content: mcpTest({ bot, pascalName, name: options.name, transport })
        }
      ]
    };
  }

  const configRelative = `src/main/java/com/embabel/bot/${bot}/${pascalName}ToolConfiguration.java`;
  const testRelative = `src/test/java/com/embabel/bot/${bot}/${pascalName}ToolTest.java`;
  const files = [];

  if (options.kind === "llm-tool" || options.kind === "llm-reference") {
    const toolsRelative = `src/main/java/com/embabel/bot/${bot}/${pascalName}Tools.java`;
    files.push({
      relative: toolsRelative,
      absolute: path.join(project, toolsRelative),
      content: toolsClass({ bot, pascalName, camelName, toolName, description, sideEffect: config.sideEffect })
    });
  }

  if (options.kind === "subagent") {
    const agentRelative = `src/main/java/com/embabel/bot/${bot}/${pascalName}Agent.java`;
    files.push({
      relative: agentRelative,
      absolute: path.join(project, agentRelative),
      content: agentClass({ bot, pascalName, camelName, description })
    });
  }

  files.push({
    relative: configRelative,
    absolute: path.join(project, configRelative),
    content: configurationClass({ bot, options, pascalName, camelName, toolName, description, config })
  });
  files.push({
    relative: testRelative,
    absolute: path.join(project, testRelative),
    content: testClass({ bot, options, pascalName, camelName })
  });

  return {
    collection: collectionType(options.kind),
    files
  };
}

function toolsClass({ bot, pascalName, camelName, toolName, description, sideEffect }) {
  const result = sideEffect === "external-write"
    ? `return "Dry run: external write ${toolName} was not performed.";`
    : `return "Stub: ${toolName} handled " + request;`;
  return `package com.embabel.bot.${bot};

import com.embabel.agent.api.annotation.LlmTool;

public class ${pascalName}Tools {

    @LlmTool(name = "${toolName}", description = "${description}")
    public String ${camelName}(@LlmTool.Param(description = "Tool request") String request) {
        ${result}
    }
}
`;
}

function agentClass({ bot, pascalName, camelName, description }) {
  return `package com.embabel.bot.${bot};

import com.embabel.agent.api.annotation.Action;
import com.embabel.agent.api.annotation.Agent;

@Agent(description = "${description}")
public class ${pascalName}Agent {

    @Action
    public String ${camelName}(String request) {
        return "Stub: subagent handled " + request;
    }
}
`;
}

function configurationClass({ bot, options, pascalName, camelName, toolName, description, config }) {
  if (options.kind === "toolish-rag") {
    return `package com.embabel.bot.${bot};

import com.embabel.agent.api.reference.LlmReference;
import com.embabel.agent.filter.PropertyFilter;
import com.embabel.agent.rag.service.SearchOperations;
import com.embabel.agent.rag.tools.ToolishRag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("${bot}")
public class ${pascalName}ToolConfiguration {

    @Bean
    LlmReference ${camelName}Reference(SearchOperations searchOperations) {
        return new ToolishRag("${escapeJava(options.name)}_docs", "${description}", searchOperations)
                .withMetadataFilter(new PropertyFilter.Eq("context", "global"))
                .withUnfolding();
    }
}
`;
  }

  if (options.kind === "subagent") {
    return `package com.embabel.bot.${bot};

import com.embabel.agent.api.tool.Subagent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("${bot}")
public class ${pascalName}ToolConfiguration {

    @Bean
    Subagent ${camelName}Subagent() {
        return Subagent.ofClass(${pascalName}Agent.class).consuming(String.class);
    }
}
`;
  }

  if (options.kind === "llm-reference") {
    return `package com.embabel.bot.${bot};

import com.embabel.agent.api.reference.LlmReference;
import com.embabel.agent.api.tool.Tool;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("${bot}")
public class ${pascalName}ToolConfiguration {

    @Bean
    LlmReference ${camelName}Reference() {
        return LlmReference.of("${toolName}", "${description}",
                Tool.fromInstance(new ${pascalName}Tools()), "Use for ${toolName} requests.");
    }
}
`;
  }

  return `package com.embabel.bot.${bot};

import com.embabel.agent.api.tool.Tool;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("${bot}")
public class ${pascalName}ToolConfiguration {

    @Bean
    Tool ${camelName}Tool() {
        return Tool.fromInstance(new ${pascalName}Tools()).get(0);
    }
}
`;
}

function testClass({ bot, options, pascalName, camelName }) {
  const beanName =
    options.kind === "llm-reference" || options.kind === "toolish-rag"
      ? `${camelName}Reference`
      : options.kind === "subagent"
        ? `${camelName}Subagent`
        : `${camelName}Tool`;
  const beanType =
    options.kind === "llm-reference" || options.kind === "toolish-rag" ? "LlmReference" : "Tool";
  const importType =
    beanType === "LlmReference"
      ? "import com.embabel.agent.api.reference.LlmReference;"
      : "import com.embabel.agent.api.tool.Tool;";
  const extra = options.kind === "toolish-rag"
    ? `\n            .withBean(SearchOperations.class, () -> org.mockito.Mockito.mock(SearchOperations.class))`
    : "";
  const imports = options.kind === "toolish-rag"
    ? `import com.embabel.agent.rag.service.SearchOperations;\n`
    : "";

  return `package com.embabel.bot.${bot};

${imports}${importType}
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ${pascalName}ToolTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(${pascalName}ToolConfiguration.class)${extra};

    @Test
    void beanLoadsOnlyWith${pascal(bot)}Profile() {
        runner.withPropertyValues("spring.profiles.active=${bot}")
                .run(context -> assertThat(context.getBeansOfType(${beanType}.class)).containsKey("${beanName}"));

        runner.run(context -> assertThat(context.getBeansOfType(${beanType}.class)).doesNotContainKey("${beanName}"));
    }
}
`;
}

function mcpTest({ bot, pascalName, name, transport }) {
  const key = `spring.ai.mcp.client.${transport}.connections.${name}.`;
  return `package com.embabel.bot.${bot};

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ${pascalName}PropertiesTest {

    @Test
    void mcpPropertiesAreProfileScoped() throws Exception {
        String properties = new String(
                new ClassPathResource("application-${bot}.properties").getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);

        assertThat(properties).contains("${key}");
    }
}
`;
}

function mcpBlock({ bot, options, transport }) {
  const name = options.name;
  const lines = [];
  if (transport === "sse") {
    lines.push(`spring.ai.mcp.client.sse.connections.${name}.url=${options.mcpUrl}`);
  } else {
    lines.push(`spring.ai.mcp.client.stdio.connections.${name}.command=${options.mcpCommand}`);
    const args = String(options.mcpArgs ?? "").split(/\s+/).filter(Boolean);
    args.forEach((arg, index) => {
      lines.push(`spring.ai.mcp.client.stdio.connections.${name}.args[${index}]=${arg}`);
    });
    for (const key of parseList(options.mcpEnv)) {
      lines.push(`spring.ai.mcp.client.stdio.connections.${name}.env.${key}=\${${key}:}`);
    }
  }
  return lines.join("\n");
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

function validateOptions(options) {
  if (!options.bot || !/^[a-z][a-z0-9]*$/.test(options.bot)) {
    throw new Error("--bot must be a lowercase Java identifier.");
  }
  if (!KINDS.includes(options.kind)) {
    throw new Error(`--kind must be one of: ${KINDS.join(", ")}`);
  }
  if (!options.name || !/^[a-z][a-z0-9-]*$/.test(options.name)) {
    throw new Error("--name must be lowercase letters, digits, or hyphens.");
  }
  if (!SIDE_EFFECTS.includes(options.sideEffect)) {
    throw new Error(`--side-effect must be one of: ${SIDE_EFFECTS.join(", ")}`);
  }
  if (options.requires && !REQUIRES.includes(options.requires)) {
    throw new Error(`--requires must be one of: ${REQUIRES.join(", ")}`);
  }
  if (options.kind === "mcp") {
    const transport = options.mcpTransport ?? "stdio";
    if (!["stdio", "sse"].includes(transport)) {
      throw new Error("--mcp-transport must be stdio or sse.");
    }
    if (transport === "stdio" && !options.mcpCommand) {
      throw new Error("--mcp-command is required for stdio MCP connections.");
    }
    if (transport === "sse" && !options.mcpUrl) {
      throw new Error("--mcp-url is required for sse MCP connections.");
    }
  }
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectionType(kind) {
  if (kind === "llm-reference" || kind === "toolish-rag") return "LlmReference";
  if (kind === "mcp") return "MCP properties";
  return "Tool";
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

function escapeJava(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n");
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
    if (arg === "--dry-run") {
      options.dryRun = true;
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
      "node skills/urbot-tool/scripts/apply.mjs --project <dir> --bot <bot> --kind <llm-tool|llm-reference|toolish-rag|subagent|mcp> --name <name> --description <text> --side-effect <read|internal-write|external-write|destructive> [--secrets KEY,...] [--idempotency-key <key>] [--dry-run] [--requires none|domain|memory|domain+memory] [--mcp-transport stdio|sse] [--mcp-command <cmd>] [--mcp-args <args>] [--mcp-url <url>] [--mcp-env KEY,...] [--approve] [--force]"
    ]
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = options.help ? usage() : applyTool(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
