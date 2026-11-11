#!/usr/bin/env node
import path from "node:path";
import { addSlice, initProject } from "./lib/generate.mjs";
import { validateProject } from "./lib/validate.mjs";
import { writeProjectLock } from "./lib/lock.mjs";

const [command, ...args] = process.argv.slice(2);

function usage() {
  console.log(`legacy manna generator (historical)

Usage:
  manna init <spec.json> <out-dir>
  manna slice <project-dir> <slice.spec.json>
  manna validate <project-dir>
  manna lock <project-dir>
`);
}

try {
  switch (command) {
    case "init": {
      requireArgs(args, 2, "manna init <spec.json> <out-dir>");
      const result = initProject(path.resolve(args[0]), path.resolve(args[1]));
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "slice": {
      requireArgs(args, 2, "manna slice <project-dir> <slice.spec.json>");
      const result = addSlice(path.resolve(args[0]), path.resolve(args[1]));
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "validate": {
      requireArgs(args, 1, "manna validate <project-dir>");
      const result = validateProject(path.resolve(args[0]));
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
      break;
    }
    case "lock": {
      requireArgs(args, 1, "manna lock <project-dir>");
      const lock = writeProjectLock(path.resolve(args[0]));
      console.log(JSON.stringify({ ok: true, digest: lock.digest, files: Object.keys(lock.files).length }, null, 2));
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

function requireArgs(values, count, usageText) {
  if (values.length < count) {
    throw new Error(`Missing arguments. Usage: ${usageText}`);
  }
}
