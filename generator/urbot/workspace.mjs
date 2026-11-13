import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const COPY_SET = [
  ".opencode",
  "skills",
  "workflows",
  "policies",
  "shared",
  "docs",
  "generator",
  "skills.json",
  ".well-known",
  ".claude-plugin",
  "openspec/config.yaml",
  "openspec/specs"
];

const SKIP_NAMES = new Set([".git", "node_modules", "target", ".DS_Store", ".manna-run"]);

export const WORKSPACE_ENTRY = "AGENTS.md";

export function copyWorkspaceKit(workspace) {
  const root = path.resolve(workspace);
  if (root === KIT_ROOT) {
    throw new Error("Project must not be the Manna kit root");
  }

  fs.mkdirSync(root, { recursive: true });
  const copied = [];

  for (const relative of COPY_SET) {
    const source = path.join(KIT_ROOT, relative);
    if (!fs.existsSync(source)) {
      throw new Error(`Manna kit is missing ${relative}`);
    }
    copyTree(source, path.join(root, relative), { workspaceRoot: root, copied });
  }

  const skillsRoot = path.join(KIT_ROOT, "skills");
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("urbot-")) continue;
    copyTree(path.join(skillsRoot, entry.name), path.join(root, ".opencode", "skills", entry.name), {
      workspaceRoot: root,
      copied
    });
  }

  writeEntryPoint(root, copied);
  ensureRunStateIgnore(root);
  return { copied };
}

function copyTree(source, destination, options) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    if (SKIP_NAMES.has(path.basename(source))) return;
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyTree(path.join(source, entry.name), path.join(destination, entry.name), options);
    }
    return;
  }

  if (!stat.isFile() || SKIP_NAMES.has(path.basename(source))) return;

  const relative = path.relative(options.workspaceRoot, destination).split(path.sep).join("/");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  options.copied.push(relative);
}

function writeEntryPoint(root, copied) {
  const destination = path.join(root, WORKSPACE_ENTRY);
  const content = fs
    .readFileSync(path.join(KIT_ROOT, "generator/urbot/workspace-agents.md"), "utf8")
    .replaceAll("{{URBOT_PROJECT}}", ".");

  fs.rmSync(destination, { force: true });
  fs.writeFileSync(destination, content);
  copied.push(WORKSPACE_ENTRY);
}

function ensureRunStateIgnore(root) {
  if (fs.existsSync(path.join(root, ".git"))) {
    ensureLine(path.join(root, ".git", "info", "exclude"), ".manna-run/");
    return;
  }
  ensureLine(path.join(root, ".gitignore"), ".manna-run/");
}

function ensureLine(file, line) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const present = existing.split("\n").some((entry) => entry.trim() === line);
  if (present) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const prefix = existing.length === 0 ? "" : existing.endsWith("\n") ? existing : `${existing}\n`;
  fs.writeFileSync(file, `${prefix}${line}\n`);
}
