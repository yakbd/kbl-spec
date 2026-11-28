# src/: the zod source of the schema

`schema.ts` is the only place the schema is edited. Its header comment states the conventions; the helpers
`unique` and `has` near the top are the exemplars.

- Every object is `z.strictObject`, every exclusive choice `z.xor`, every schema (and every property) has a
  `.meta({ description })`; `tools/check` fails on a missing description. A schema with a metadata `id` becomes a
  `$defs` entry: renaming an id renames a published `$defs` name.
- A JSON Schema keyword zod does not generate (`uniqueItems`, `not` on property names, `required` under
  `anyOf`/`oneOf`/`not`) goes into `.meta()` **and** is enforced by a `.refine()` that checks the same thing. Then
  add an invalid case to `testdata/schema/<version>/invalid/` that only that rule rejects: the checker proves zod and the
  JSON Schema agree on it.
- `z.int()` bounds of ±(2⁵³−1) are dropped from the JSON Schema by `tools/gen-schema.ts`; zod alone keeps them.
  Any other difference between the two is a bug.
- Three versions come from this one file (D108, D150). Shared schemas are module-level constants; what differs per
  version (`onLoss` kinds, provenance formats, `targets`, the touch members, `kbl`, `$id`) is built in
  `kblFile(v)` at the end and the factories it calls. 0.1 and 0.2 are frozen: an edit that changes their schema files
  fails `npm test` (pinned hashes). A member of a newer version goes in `kblFile()` or a factory taking the version
  (or the version's `OnLoss`), never into a shared constant.
- Each platform target edits only its own factory (`targetsMacos`, `targetsXkb`, `targetsAndroid`,
  `targetsAndroidime`, `targetsIos`, `targetsChromeos`, `targetsKeyman`) and its own kind list (`lossKinds<Name>`),
  so two targets never edit the same lines. The touch core (keys, touch layers, `lossKindsCore03`) belongs to the
  spec core; a target that needs a change there asks for it.
- Cross-field rules (references, layer overlap, unique scan codes: SPEC §19) do not belong here; they go in
  `tools/check`.
- `z.compile()` is not used: the checker is no hot path. Where the zod skill's performance rules suggest otherwise,
  this file wins.

`touch-runtime.ts` is the source of the touch runtime file's schema (`targets/touch-runtime.md`), with the same
conventions; its cases are `testdata/touch-runtime/` (checker step 9). Any change to it is a new `touchRuntime`
version once 0.3 is tagged (D200).

After an edit: `npm run gen`, then `npm test`, then commit `src/schema.ts` and the generated `schema/*/kbl.schema.json`
together.

zod help: the zod documentation (https://zod.dev, Zod 4), or a zod skill or docs server if your setup has one (ask
it about zod only, never about Windows or the format).
