#!/usr/bin/env node
import { runUrbotCommand } from "./urbot/index.mjs";
import { runSimpleInit } from "./urbot/simple-init.mjs";

const [command, ...args] = process.argv.slice(2);

function usage() {
  console.log(`manna

Usage:
  manna init <project> [--repo <url>] [--ref <ref>] [--write-state]
  manna urbot init --repo <url> --ref <ref> --dir <dir> [--write-state]
  manna urbot inspect --repo <url> --ref <ref> --project <dir> --request "<natural language request>" [--write-state]
`);
}

try {
  switch (command) {
    case "init": {
      const result = runSimpleInit(args);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "urbot": {
      const [subcommand, ...rest] = args;
      const result = runUrbotCommand(subcommand, rest);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      usage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
