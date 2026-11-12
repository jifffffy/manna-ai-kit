import fs from "node:fs";
import path from "node:path";
import { initCommand, URBOT_REPO } from "./init.mjs";
import { inspectCommand } from "./inspect.mjs";
import { writeStateFile } from "./state.mjs";
import { gitOrNull } from "./git.mjs";

export const DEFAULT_DIR = "urbot";
export const DEFAULT_BRANCH = "main";

const USAGE = [
  'manna init "<request>" [--repo <url>] [--ref <ref>] [--dir <dir>] [--write-state]'
];

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
  const { request, options } = parseArgs(args);
  if (options.help) return { usage: USAGE };
  if (!request) throw new Error('Usage: manna init "<request>" [--repo <url>] [--ref <ref>] [--dir <dir>]');

  const dir = path.resolve(options.dir);
  const source = ensureSource({ dir, repo: options.repo, ref: options.ref, writeState: options.writeState });
  const inspection = inspectCommand({
    project: dir,
    request,
    repo: source.repository,
    writeState: options.writeState
  });

  return { source, inspection };
}

function ensureSource({ dir, repo, ref, writeState }) {
  const exists = fs.existsSync(dir);
  let source;

  if (exists) {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      throw new Error(`Target path is not a directory: ${dir}`);
    }
    if (fs.readdirSync(dir).length > 0) {
      if (!isUrbotCheckout(dir)) {
        throw new Error(`Target directory is not a Urbot checkout: ${dir}`);
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
    writeStateFile("source.json", {
      repository: source.repository,
      requestedRef: source.requestedRef,
      resolvedCommit: source.resolvedCommit,
      fetchedAt: source.fetchedAt
    });
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
  const options = { repo: URBOT_REPO, dir: DEFAULT_DIR };
  let request = null;

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
      if (request !== null) throw new Error(`Unexpected argument: ${arg}`);
      request = arg;
      continue;
    }

    const key = arg.slice(2);
    if (!["repo", "ref", "dir"].includes(key)) {
      throw new Error(`Unknown option: --${key}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }

  return { request, options };
}

function compareParts(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export { USAGE };
