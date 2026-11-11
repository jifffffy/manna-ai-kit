import fs from "node:fs";
import path from "node:path";
import { emptyDiscovery, inspectProject } from "../../skills/urbot-discovery/scripts/inspect.mjs";
import { routeRequest } from "./route.mjs";
import { writeStateFile } from "./state.mjs";
import { URBOT_REPO } from "./init.mjs";

export function inspectCommand(options) {
  const { project, request } = options;
  if (!project || !request) {
    throw new Error(
      'Usage: manna urbot inspect --repo <url> --ref <ref> --project <dir> --request "<natural language request>" [--write-state]'
    );
  }

  const target = path.resolve(project);
  const repository = options.repo ?? URBOT_REPO;
  const directoryExists = fs.existsSync(target);
  const discovery = directoryExists
    ? inspectProject(target, { repository, request })
    : emptyDiscovery(target, repository);
  const routing = routeRequest({ directoryExists, request, discovery });
  const runId = `RUN-${Date.now()}`;

  const result = {
    runId,
    request,
    discovery,
    route: routing.route,
    skills: routing.skills,
    targetFiles: routing.targetFiles,
    verificationCommands: routing.verificationCommands,
    question: routing.question,
    status: "read-only"
  };

  if (options.writeState) {
    result.stateFile = writeStateFile(`${runId}.json`, {
      runId,
      repository,
      resolvedCommit: discovery.commit,
      targetProfile: discovery.targetProfile,
      request,
      route: routing.route,
      skills: routing.skills,
      changedFiles: [],
      commands: routing.verificationCommands,
      status: "read-only"
    });
  }

  return result;
}
