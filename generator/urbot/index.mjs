import { initCommand } from "./init.mjs";
import { inspectCommand } from "./inspect.mjs";

const USAGE = [
  'manna urbot init --repo <url> --ref <ref> --dir <dir> [--write-state]',
  'manna urbot inspect --repo <url> --ref <ref> --project <dir> --request "<natural language request>" [--write-state]'
];

export function runUrbotCommand(subcommand, args) {
  if (!subcommand || subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    return { usage: USAGE };
  }

  const options = parseArgs(args);
  if (options.help) return { usage: USAGE };

  switch (subcommand) {
    case "init":
      return initCommand(options);
    case "inspect":
      return inspectCommand(options);
    default:
      throw new Error(`Unknown urbot command: ${subcommand}`);
  }
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (key === "write-state") {
      options.writeState = true;
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }
  return options;
}

export { USAGE };
