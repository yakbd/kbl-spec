// Writes schema/0.1/kbl.schema.json from the zod source src/schema.ts (`npm run gen`).
// With --check it writes nothing and fails when the committed file differs from what the source generates (CI).
import { readFileSync, writeFileSync } from "node:fs";
import * as z from "zod";
import { KblFile } from "../src/schema.ts";

const path = "schema/0.1/kbl.schema.json";

/** The JSON Schema text of the format: draft 2020-12, root keywords first, `$defs` last. */
export function generate(): string {
  const generated = z.toJSONSchema(KblFile, {
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

const text = generate();
if (process.argv.includes("--check")) {
  let committed = "";
  try {
    committed = readFileSync(path, "utf8");
  } catch {}
  if (committed !== text) {
    console.error(`${path} is not what src/schema.ts generates; run \`npm run gen\` and commit the result`);
    process.exit(1);
  }
  console.log(`${path} is fresh`);
} else {
  writeFileSync(path, text);
  console.log(`wrote ${path}`);
}
