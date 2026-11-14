#!/usr/bin/env node
import fs from "node:fs";

const USAGE =
  "Usage: node review-csv.mjs --csv <file> [--key <col,...>] [--mode review|apply] [--json]";

const STATUSES = new Set(["pending", "approved", "rejected"]);

function main(argv) {
  const options = parseArgs(argv);
  if (!options.csv) usage();

  const text = fs.readFileSync(options.csv, "utf8").replace(/^\uFEFF/, "");
  const parsed = parseCsv(text);
  if (parsed.error) {
    return report(options, {
      rows: 0,
      counts: { pending: 0, approved: 0, rejected: 0 },
      errors: [{ line: parsed.errorLine, message: parsed.error }]
    });
  }
  if (parsed.rows.length === 0) {
    return report(options, {
      rows: 0,
      counts: { pending: 0, approved: 0, rejected: 0 },
      errors: [{ line: 1, message: "CSV is empty; a header row is required" }]
    });
  }

  const header = parsed.rows[0].fields.map((field) => field.trim().toLowerCase());
  const errors = [];
  const column = new Map();
  header.forEach((name, index) => {
    if (name && !column.has(name)) column.set(name, index);
  });

  const required = ["status", "reason", ...options.keyColumns];
  for (const name of required) {
    if (!column.has(name)) {
      errors.push({ line: 1, message: `missing required column "${name}"` });
    }
  }

  const counts = { pending: 0, approved: 0, rejected: 0 };
  const seen = new Map();
  const pendingLines = [];
  let approvedLines = 0;

  for (let index = 1; index < parsed.rows.length; index += 1) {
    const row = parsed.rows[index];
    const fields = row.fields;
    if (fields.every((field) => field.trim() === "")) continue;

    const line = row.line;
    if (fields.length !== header.length) {
      errors.push({
        line,
        message: `row has ${fields.length} fields but the header has ${header.length}`
      });
      continue;
    }

    const value = (name) => fields[column.get(name)]?.trim() ?? "";
    const status = value("status").toLowerCase();
    if (!STATUSES.has(status)) {
      errors.push({ line, message: `unknown status "${value("status")}"` });
      continue;
    }
    counts[status] += 1;

    if (!value("reason")) errors.push({ line, message: "reason is empty" });

    for (const numeric of ["confidence", "strength"]) {
      if (!column.has(numeric)) continue;
      const raw = value(numeric);
      const parsedNumber = Number(raw);
      if (raw === "" || Number.isNaN(parsedNumber) || parsedNumber < 0 || parsedNumber > 1) {
        errors.push({
          line,
          message: `${numeric} must be a number between 0 and 1 (got "${raw}")`
        });
      }
    }

    if (options.keyColumns.length > 0) {
      const keyValues = options.keyColumns.map((name) => value(name));
      if (keyValues.some((entry) => entry === "")) {
        errors.push({
          line,
          message: `empty key column (${options.keyColumns.join(", ")})`
        });
      } else {
        const key = keyValues.join("\u0000");
        if (seen.has(key)) {
          errors.push({
            line,
            message: `duplicate key ${keyValues.join("/")} (first seen on line ${seen.get(key)})`
          });
        } else {
          seen.set(key, line);
        }
      }
    }

    if (status === "pending") pendingLines.push(line);
    if (status === "approved") approvedLines += 1;
  }

  if (options.mode === "apply") {
    if (pendingLines.length > 0) {
      errors.push({
        line: pendingLines[0],
        message: `apply blocked: ${pendingLines.length} pending row(s) at line(s) ${pendingLines.join(", ")}`
      });
    }
    if (approvedLines === 0) {
      errors.push({ line: 1, message: "apply blocked: no approved rows" });
    }
  }

  return report(options, { rows: parsed.rows.length - 1, counts, errors });
}

function report(options, { rows, counts, errors }) {
  const ok = errors.length === 0;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          csv: options.csv,
          mode: options.mode,
          keyColumns: options.keyColumns,
          rows,
          counts,
          errors,
          ok
        },
        null,
        2
      )
    );
  } else {
    console.log(`csv: ${options.csv}`);
    console.log(`mode: ${options.mode}`);
    console.log(`rows: ${rows}`);
    console.log(`approved: ${counts.approved}`);
    console.log(`pending: ${counts.pending}`);
    console.log(`rejected: ${counts.rejected}`);
    if (!ok) {
      console.log("errors:");
      for (const error of errors) console.log(`  - line ${error.line}: ${error.message}`);
    }
    console.log(ok ? "OK: CSV is ready" : "FAILED: CSV is not ready");
  }

  process.exitCode = ok ? 0 : 1;
  return ok;
}

function parseArgs(argv) {
  const options = { mode: "review", keyColumns: [], json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (!["--csv", "--key", "--mode"].includes(arg)) usage();
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) usage();
    if (arg === "--csv") options.csv = value;
    if (arg === "--key") {
      options.keyColumns = value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    }
    if (arg === "--mode") {
      if (!["review", "apply"].includes(value)) usage();
      options.mode = value;
    }
    index += 1;
  }

  return options;
}

function usage() {
  console.error(USAGE);
  process.exit(2);
}

function parseCsv(text) {
  const rows = [];
  let fields = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\n") {
      fields.push(field);
      rows.push({ fields, line: rowLine });
      fields = [];
      field = "";
      line += 1;
      rowLine = line;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (inQuotes) {
    return { error: "unterminated quoted field", errorLine: rowLine };
  }
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    rows.push({ fields, line: rowLine });
  }

  return { rows };
}

main(process.argv.slice(2));
