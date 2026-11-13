import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_WORKSPACE = "manna-workspace";

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

export function copyWorkspaceKit(workspace, options = {}) {
  const root = path.resolve(workspace);
  if (root === KIT_ROOT) {
    throw new Error("Workspace must not be the Manna kit root");
  }

  fs.mkdirSync(root, { recursive: true });
  const copied = [];
  const skipped = [];

  for (const relative of COPY_SET) {
    const source = path.join(KIT_ROOT, relative);
    if (!fs.existsSync(source)) {
      throw new Error(`Manna kit is missing ${relative}`);
    }
    copyTree(source, path.join(root, relative), {
      workspaceRoot: root,
      force: Boolean(options.force),
      copied,
      skipped
    });
  }

  const skillsRoot = path.join(KIT_ROOT, "skills");
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("urbot-")) continue;
    copyTree(path.join(skillsRoot, entry.name), path.join(root, ".opencode", "skills", entry.name), {
      workspaceRoot: root,
      force: Boolean(options.force),
      copied,
      skipped
    });
  }

  const project = relativeProject(root, options.checkout);
  writeGenerated(
    root,
    "AGENTS.md",
    fs
      .readFileSync(path.join(KIT_ROOT, "generator/urbot/workspace-agents.md"), "utf8")
      .replaceAll("{{URBOT_PROJECT}}", project),
    options.force,
    copied,
    skipped
  );

  const checkoutIgnore = ignorePath(root, options.checkout);
  writeGenerated(
    root,
    ".gitignore",
    `.DS_Store\n.idea/\n*.iml\nnode_modules/\ntarget/\n.env\n.manna-run/\n${checkoutIgnore}\n`,
    options.force,
    copied,
    skipped
  );

  return { copied, skipped };
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
  if (fs.existsSync(destination) && !options.force) {
    options.skipped.push(relative);
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  options.copied.push(relative);
}

function writeGenerated(root, relative, content, force, copied, skipped) {
  const destination = path.join(root, relative);
  if (fs.existsSync(destination) && !force) {
    skipped.push(relative);
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  copied.push(relative);
}

function relativeProject(workspace, checkout) {
  if (!checkout) return "./urbot";
  const relative = path.relative(workspace, path.resolve(checkout));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return path.resolve(checkout);
  }
  return `./${relative.split(path.sep).join("/")}`;
}

function ignorePath(workspace, checkout) {
  if (!checkout) return "urbot/";
  const relative = path.relative(workspace, path.resolve(checkout));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return "urbot/";
  }
  return `${relative.split(path.sep).join("/")}/`;
}
