import fs from "node:fs";
import path from "node:path";
import { initCommand, URBOT_REPO } from "./init.mjs";
import { writeStateFile } from "./state.mjs";
import { gitOrNull } from "./git.mjs";
import { copyWorkspaceKit, KIT_ROOT, WORKSPACE_ENTRY } from "./workspace.mjs";

export const DEFAULT_BRANCH = "main";

const USAGE = ["manna init <project> [--repo <url>] [--ref <ref>] [--write-state]"];

export function resolveDefaultRef(repo) {
  const output = gitOrNull(["ls-remote", "--tags", repo]);
  if (!output) return DEFAULT_BRANCH;

  const versions = output
    .split("\n")
    .map((line) => line.split("\t")[1])
    .filter((ref) => ref && ref.startsWith("refs/tags/") && !ref.endsWith("^{}"))
    .map((ref) => ref.slice("refs/tags/".length))
    .map((tag) => {
      const parts = tag.replace(/^v/, "").split(".").map(Number);
      return { tag, parts };
    })
    .filter(({ parts }) => parts.length === 3 && parts.every(Number.isInteger));

  if (versions.length === 0) return DEFAULT_BRANCH;
  versions.sort((a, b) => compareParts(a.parts, b.parts));
  return versions[versions.length - 1].tag;
}

export function runSimpleInit(args) {
  const { project, options } = parseArgs(args);
  if (options.help) return { usage: USAGE };
  if (!project) {
    throw new Error(
      'Usage: manna init <project> [--repo <url>] [--ref <ref>] [--write-state]'
    );
  }

  const workspace = path.resolve(project);
  if (workspace === KIT_ROOT) {
    throw new Error("Project must not be the Manna kit root");
  }

  const source = ensureSource({
    dir: workspace,
    repo: options.repo,
    ref: options.ref,
    writeState: options.writeState
  });
  const kit = copyWorkspaceKit(workspace);

  return {
    workspace,
    kit,
    source,
    entry: WORKSPACE_ENTRY,
    next: `Open ${workspace} in OpenCode to start work`
  };
}

function ensureSource({ dir, repo, ref, writeState }) {
  let source;

  if (fs.existsSync(dir)) {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      throw new Error(`Project path is not a directory: ${dir}`);
    }
    if (fs.readdirSync(dir).length > 0) {
      if (!isUrbotCheckout(dir)) {
        throw new Error(`Project directory is not a Urbot checkout: ${dir}`);
      }
      source = {
        repository: gitOrNull(["-C", dir, "remote", "get-url", "origin"]) ?? repo,
        requestedRef: ref ?? detectCurrentRef(dir),
        resolvedCommit: gitOrNull(["-C", dir, "rev-parse", "HEAD"]),
        directory: dir,
        fetchedAt: new Date().toISOString()
      };
      if (!source.resolvedCommit) {
        throw new Error(`Could not read the resolved commit from ${dir}`);
      }
    }
  }

  if (!source) {
    const resolvedRef = ref ?? resolveDefaultRef(repo);
    const initialized = initCommand({
      repo,
      ref: resolvedRef,
      dir,
      writeState: false
    });
    source = {
      repository: initialized.repository,
      requestedRef: initialized.requestedRef,
      resolvedCommit: initialized.resolvedCommit,
      directory: initialized.directory,
      fetchedAt: initialized.fetchedAt
    };
  }

  if (writeState) {
    writeStateFile(
      "source.json",
      {
        repository: source.repository,
        requestedRef: source.requestedRef,
        resolvedCommit: source.resolvedCommit,
        fetchedAt: source.fetchedAt
      },
      dir
    );
  }

  return source;
}

function isUrbotCheckout(dir) {
  return (
    fs.existsSync(path.join(dir, ".git")) &&
    fs.existsSync(path.join(dir, "pom.xml")) &&
    fs.existsSync(path.join(dir, "src", "main", "java", "com", "embabel", "urbot"))
  );
}

function detectCurrentRef(dir) {
  const tag = gitOrNull(["-C", dir, "describe", "--tags", "--exact-match"]);
  if (tag) return `refs/tags/${tag}`;
  return gitOrNull(["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"]) ?? "existing";
}

function parseArgs(args) {
  const options = { repo: URBOT_REPO };
  let project = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--write-state") {
      options.writeState = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      if (project !== null) throw new Error(`Unexpected argument: ${arg}`);
      project = arg;
      continue;
    }

    const key = arg.slice(2);
    if (!["repo", "ref"].includes(key)) {
      throw new Error(`Unknown option: --${key}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }

  return { project, options };
}

function compareParts(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export { USAGE };
