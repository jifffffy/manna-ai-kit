import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DISCOVERY_FIELDS = [
  "project",
  "source",
  "commit",
  "profiles",
  "targetProfile",
  "botPackage",
  "persona",
  "objective",
  "domainTypes",
  "tools"
];

export function emptyDiscovery(projectDir, repository) {
  return {
    project: projectDir ? path.basename(projectDir) : null,
    source: repository ?? null,
    commit: null,
    profiles: [],
    targetProfile: null,
    botPackage: null,
    persona: null,
    objective: null,
    domainTypes: [],
    tools: []
  };
}

export function inspectProject(projectDir, options = {}) {
  const repository = options.repository ?? null;
  const request = options.request ?? "";
  const profiles = readProfiles(projectDir);
  const targetProfile = inferProfile(request, profiles);
  const config = readConfig(projectDir, targetProfile);

  return {
    project: path.basename(projectDir),
    source: gitOrNull(projectDir, ["remote", "get-url", "origin"]) ?? repository,
    commit: gitOrNull(projectDir, ["rev-parse", "HEAD"]),
    profiles,
    targetProfile,
    botPackage: targetProfile ? `com.embabel.bot.${targetProfile}` : null,
    persona: config.persona,
    objective: config.objective,
    domainTypes: readDomainTypes(projectDir, targetProfile),
    tools: readTools(projectDir, targetProfile)
  };
}

function readProfiles(projectDir) {
  const profiles = new Set();

  const resources = path.join(projectDir, "src", "main", "resources");
  if (fs.existsSync(resources)) {
    for (const name of fs.readdirSync(resources)) {
      const match = name.match(/^application-(.+)\.(properties|ya?ml)$/);
      if (match) profiles.add(match[1]);
    }
  }

  const bots = path.join(projectDir, "src", "main", "java", "com", "embabel", "bot");
  if (fs.existsSync(bots)) {
    for (const entry of fs.readdirSync(bots, { withFileTypes: true })) {
      if (entry.isDirectory()) profiles.add(entry.name);
    }
  }

  return [...profiles].sort();
}

function inferProfile(request, profiles) {
  const text = String(request).toLowerCase();
  const matches = profiles.filter((profile) => text.includes(profile.toLowerCase()));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0 && profiles.length === 1) return profiles[0];
  return null;
}

function readConfig(projectDir, profile) {
  const resources = path.join(projectDir, "src", "main", "resources");
  const candidates = [];
  if (profile) candidates.push(path.join(resources, `application-${profile}.properties`));
  candidates.push(
    path.join(resources, "application.properties"),
    path.join(resources, "application.yml"),
    path.join(resources, "application.yaml")
  );

  let persona = null;
  let objective = null;
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    persona = persona ?? findValue(text, "urbot.chat.persona", "persona");
    objective = objective ?? findValue(text, "urbot.chat.objective", "objective");
  }
  return { persona, objective };
}

function findValue(text, fullKey, shortKey) {
  const property = text.match(new RegExp(`^\\s*${escapeRegExp(fullKey)}\\s*[=:]\\s*(.+)$`, "m"));
  if (property) return property[1].trim();
  const yaml = text.match(new RegExp(`^\\s*${escapeRegExp(shortKey)}:\\s*(.+)$`, "m"));
  return yaml ? yaml[1].trim() : null;
}

function readDomainTypes(projectDir, profile) {
  if (!profile) return [];
  const domain = path.join(projectDir, "src", "main", "java", "com", "embabel", "bot", profile, "domain");
  if (!fs.existsSync(domain)) return [];
  return fs
    .readdirSync(domain)
    .filter((name) => name.endsWith(".java"))
    .map((name) => path.basename(name, ".java"))
    .sort();
}

function readTools(projectDir, profile) {
  if (!profile) return [];
  const botDir = path.join(projectDir, "src", "main", "java", "com", "embabel", "bot", profile);
  if (!fs.existsSync(botDir)) return [];
  return walk(botDir)
    .filter((file) => file.endsWith("Tools.java"))
    .map((file) => path.basename(file, ".java"))
    .sort();
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function gitOrNull(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
