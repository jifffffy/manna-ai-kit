import fs from "node:fs";
import path from "node:path";

export function writeStateFile(name, value, directory = process.cwd()) {
  const file = path.join(directory, ".manna-run", name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  return file;
}
