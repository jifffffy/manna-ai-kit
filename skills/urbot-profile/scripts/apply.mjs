import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEGACY_NAMES = [
  "urbot.persona=",
  "urbot.objective=",
  "urbot.max-words=",
  "urbot.chat-llm.model="
];

export function applyProfile(options) {
  const project = path.resolve(options.project);
  validateProject(project);

  const name = options.name;
  if (!name || !/^[a-z][a-z0-9]*$/.test(name)) {
    throw new Error("Profile name must be a lowercase Java identifier (letters and digits).");
  }
  if (!options.persona || !options.objective) {
    throw new Error("Both --persona and --objective are required.");
  }

  const behaviour = options.behaviour ?? "default";
  const botPackage = `com.embabel.bot.${name}`;
  const className = `${pascal(name)}Configuration`;
  const files = buildFiles({
    project,
    name,
    className,
    botPackage,
    behaviour,
    behaviourText: options.behaviourText,
    maxWords: options.maxWords ?? 80,
    model: options.model ?? "gpt-4.1-mini",
    temperature: options.temperature ?? 0,
    persona: options.persona,
    objective: options.objective
  });

  const activation = {
    profile: name,
    botPackages: botPackage,
    configClass: className,
    configHasProfile: true
  };

  if (!options.approve) {
    return {
      status: "approval-required",
      name,
      profile: name,
      botPackage,
      files: files.map((file) => file.relative),
      activation
    };
  }

  const existing = files.filter((file) => fs.existsSync(file.absolute));
  if (existing.length > 0 && !options.force) {
    return {
      status: "existing",
      name,
      profile: name,
      botPackage,
      existingFiles: existing.map((file) => file.relative),
      files: files.map((file) => file.relative),
      activation
    };
  }

  const createdFiles = [];
  for (const file of files) {
    ensureNoLegacyNames(file);
    fs.mkdirSync(path.dirname(file.absolute), { recursive: true });
    fs.writeFileSync(file.absolute, file.content);
    createdFiles.push(file.relative);
  }

  return {
    status: "applied",
    name,
    profile: name,
    botPackage,
    createdFiles,
    skippedFiles: [],
    activation
  };
}

function buildFiles(config) {
  const properties = [
    `urbot.bot-packages=${config.botPackage}`,
    `urbot.chat.persona=${config.name}`,
    `urbot.chat.objective=${config.name}`,
    `urbot.chat.behaviour=${config.behaviour}`,
    `urbot.chat.max-words=${config.maxWords}`,
    `urbot.chat.llm.model=${config.model}`,
    `urbot.chat.llm.temperature=${formatTemperature(config.temperature)}`
  ].join("\n") + "\n";

  const files = [
    {
      relative: `src/main/java/com/embabel/bot/${config.name}/${config.className}.java`,
      content: [
        `package com.embabel.bot.${config.name};`,
        "",
        "import org.springframework.context.annotation.Configuration;",
        "import org.springframework.context.annotation.Profile;",
        "",
        "@Configuration",
        `@Profile("${config.name}")`,
        `public class ${config.className} {`,
        "}",
        ""
      ].join("\n")
    },
    {
      relative: `src/main/resources/application-${config.name}.properties`,
      content: properties
    },
    {
      relative: `src/main/resources/prompts/personas/${config.name}.jinja`,
      content: ensureNewline(config.persona)
    },
    {
      relative: `src/main/resources/prompts/objectives/${config.name}.jinja`,
      content: ensureNewline(config.objective)
    }
  ];

  if (config.behaviour !== "default") {
    files.push({
      relative: `src/main/resources/prompts/behaviours/${config.name}.jinja`,
      content: ensureNewline(config.behaviourText ?? "Follow the default Urbot conversation style.")
    });
  }

  return files.map((file) => ({
    ...file,
    absolute: path.join(config.project, file.relative)
  }));
}

function validateProject(project) {
  if (!fs.existsSync(project)) {
    throw new Error(`Project directory does not exist: ${project}`);
  }
  if (!fs.existsSync(path.join(project, "pom.xml"))) {
    throw new Error(`Not a Urbot checkout (missing pom.xml): ${project}`);
  }
  if (!fs.existsSync(path.join(project, "src", "main", "java", "com", "embabel", "urbot"))) {
    throw new Error(`Not a Urbot checkout (missing com/embabel/urbot): ${project}`);
  }
}

function ensureNoLegacyNames(file) {
  for (const legacy of LEGACY_NAMES) {
    if (file.content.includes(legacy)) {
      throw new Error(`Refusing to write obsolete property ${legacy} in ${file.relative}`);
    }
  }
  if (file.content.includes("spring.profiles.active")) {
    throw new Error(`Refusing to hardcode spring.profiles.active in ${file.relative}`);
  }
}

function ensureNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function formatTemperature(value) {
  const temperature = Number(value);
  return Number.isInteger(temperature) ? `${temperature}.0` : `${temperature}`;
}

function pascal(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const KNOWN_VALUE_OPTIONS = new Set([
  "project",
  "name",
  "persona",
  "objective",
  "behaviour",
  "behaviourText",
  "maxWords",
  "model",
  "temperature"
]);

function normalizeKey(key) {
  return key.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

function parseArgs(args) {
  const options = {
    behaviour: "default",
    maxWords: 80,
    model: "gpt-4.1-mini",
    temperature: 0
  };

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

  if (typeof options.maxWords === "string") options.maxWords = Number.parseInt(options.maxWords, 10);
  if (typeof options.temperature === "string") options.temperature = Number.parseFloat(options.temperature);
  if (!Number.isFinite(options.maxWords) || !Number.isFinite(options.temperature)) {
    throw new Error("--max-words and --temperature must be numbers.");
  }
  return options;
}

function usage() {
  return {
    usage: [
      "node skills/urbot-profile/scripts/apply.mjs --project <dir> --name <bot> --persona <text> --objective <text> [--behaviour <name>] [--max-words <n>] [--model <id>] [--temperature <n>] [--approve] [--force]"
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
      : applyProfile({
          project: requireOption(options, "project"),
          name: requireOption(options, "name"),
          persona: requireOption(options, "persona"),
          objective: requireOption(options, "objective"),
          behaviour: options.behaviour,
          behaviourText: options.behaviourText,
          maxWords: options.maxWords,
          model: options.model,
          temperature: options.temperature,
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
