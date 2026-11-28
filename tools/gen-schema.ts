// Writes schema/<version>/kbl.schema.json for every version from the zod source src/schema.ts, and the touch runtime
// schemas from src/touch-runtime.ts (`npm run gen`).
// With --check it writes nothing and fails when a committed file differs from what the source generates (CI).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as z from "zod";
import { schemaPath, schemas, versions, type Version } from "../src/schema.ts";
import {
  manifestPath,
  RuntimeManifest,
  touchRuntimePath,
  touchRuntimeSchemas,
  touchRuntimeVersions,
} from "../src/touch-runtime.ts";

/** The JSON Schema text of one version: draft 2020-12, root keywords first, `$defs` last. */
export function generate(v: Version): string {
  return generateFrom(schemas[v]);
}

/** The JSON Schema text of a zod schema, in the same form. */
export function generateFrom(schema: z.ZodType): string {
  const generated = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    unrepresentable: "throw",
    cycles: "throw",
    // z.int() adds the safe-integer bounds ±(2^53-1); the format has no such bound, so the JSON Schema leaves them out.
    override: ({ jsonSchema: s }) => {
      if (s.type !== "integer") return;
      if (s.maximum === Number.MAX_SAFE_INTEGER) delete s.maximum;
      if (s.minimum === Number.MIN_SAFE_INTEGER) delete s.minimum;
    },
  });
  const { $schema, $id, title, description, $defs, ...rest } = generated;
  return JSON.stringify({ $schema, $id, title, description, ...rest, $defs }, null, 2) + "\n";
}

const check = process.argv.includes("--check");
let stale = false;
const outputs: [string, () => string][] = [
  ...versions.map((v): [string, () => string] => [schemaPath(v), () => generate(v)]),
  ...touchRuntimeVersions.map((n): [string, () => string] => [touchRuntimePath(n), () => generateFrom(touchRuntimeSchemas[n])]),
  [manifestPath, () => generateFrom(RuntimeManifest)],
];
for (const [path, make] of outputs) {
  const text = make();
  if (check) {
    let committed = "";
    try {
      committed = readFileSync(path, "utf8");
    } catch {}
    if (committed !== text) {
      console.error(`${path} is not what src/ generates; run \`npm run gen\` and commit the result`);
      stale = true;
    } else {
      console.log(`${path} is fresh`);
    }
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    console.log(`wrote ${path}`);
  }
}
if (stale) process.exit(1);
