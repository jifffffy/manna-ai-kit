import fs from "node:fs";
import path from "node:path";
import { git, gitOrNull } from "./git.mjs";
import { writeStateFile } from "./state.mjs";

export const URBOT_REPO = "https://github.com/jifffffy/urbot";

export function resolveRef(repo, ref) {
  const tagRef = ref.startsWith("refs/tags/") ? ref : `refs/tags/${ref}`;
  const tags = gitOrNull(["ls-remote", "--tags", repo]);
  if (tags && tags.split("\n").some((line) => line.endsWith(`\t${tagRef}`))) {
    return tagRef;
  }
  return ref;
}

export function initCommand(options) {
  const repo = options.repo ?? URBOT_REPO;
  const { ref, dir } = options;
  if (!ref || !dir) {
    throw new Error("Usage: manna urbot init --repo <url> --ref <ref> --dir <dir> [--write-state]");
  }

  const target = path.resolve(dir);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    throw new Error(`Target directory is not empty: ${target}`);
  }

  const requestedRef = resolveRef(repo, ref);
  git(["clone", "--depth=1", "--single-branch", "--branch", ref, repo, target]);
  const resolvedCommit = git(["-C", target, "rev-parse", "HEAD"]);
  const fetchedAt = new Date().toISOString();

  const result = {
    repository: repo,
    requestedRef,
    resolvedCommit,
    fetchedAt,
    directory: target
  };

  if (options.writeState) {
    writeStateFile("source.json", {
      repository: result.repository,
      requestedRef: result.requestedRef,
      resolvedCommit: result.resolvedCommit,
      fetchedAt: result.fetchedAt
    });
  }

  return result;
}
