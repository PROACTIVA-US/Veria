// Validate all tool input_schema objects against JSON Schema draft-2020-12
import fs from "node:fs";
import path from "node:path";
import { globby } from "globby";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: true, strictSchema: true, allErrors: true });
addFormats(ajv);

const files = await globby([
  "prompts/**/*.{md,mdx,yaml,yml,json}",
  "veria-tool-masker/**/*.{md,mdx,yaml,yml,json}",
  "!**/node_modules/**",
  "!**/.git/**",
]);

let bad = 0;

function collectSchemas(obj, out = []) {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "input_schema" && v && typeof v === "object") out.push(v);
      // recurse
      if (v && typeof v === "object") collectSchemas(v, out);
    }
  }
  return out;
}

function parseFrontmatterMD(src) {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  try { return YAML.parse(m[1]); } catch { return null; }
}

for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  let doc = null;

  if (f.endsWith(".json")) {
    try { doc = JSON.parse(raw); } catch { /* ignore */ }
  } else if (f.endsWith(".yaml") || f.endsWith(".yml")) {
    try { doc = YAML.parse(raw); } catch { /* ignore */ }
  } else if (f.endsWith(".md") || f.endsWith(".mdx")) {
    doc = parseFrontmatterMD(raw);
  }

  if (!doc) continue;

  const schemas = collectSchemas(doc);
  schemas.forEach((schema, i) => {
    try {
      ajv.compile(schema); // throws if schema is invalid
    } catch (e) {
      bad++;
      console.error(`❌ Invalid schema in ${f} [index ${i}]: ${e.message}`);
    }
  });
}

if (bad) {
  console.error(`\n${bad} invalid tool schema(s) found. Fix before running Claude.`);
  process.exit(1);
}
console.log("✅ All tool input_schema objects are valid (draft-2020-12).");
