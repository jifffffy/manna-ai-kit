import fs from "node:fs";

export function render(text, values) {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (!(key in values)) {
      throw new Error(`Missing template value: ${key}`);
    }
    return String(values[key] ?? "");
  });
}

export function renderFile(file, values) {
  return render(fs.readFileSync(file, "utf8"), values);
}

export function assertNoPlaceholders(text, file) {
  const unresolved = text.match(/\{\{[a-zA-Z0-9_]+\}\}/g);
  if (unresolved) {
    throw new Error(`Unresolved placeholders in ${file}: ${unresolved.join(", ")}`);
  }
}
