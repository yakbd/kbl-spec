# testdata/: schema cases and third-party fixtures

- `schema/<version>/valid/*.kbl.json` must be accepted and `schema/<version>/invalid/*.kbl.json` rejected, by that
  version's zod schema and JSON Schema alike (`npm run check`). Versions: `0.1`, `0.2`, `0.3`.
- An invalid case breaks exactly one member of an otherwise valid file, and its name says which
  (`key-width-zero.kbl.json`). Start from `schema/<version>/valid/base.kbl.json`. A case that fails for a second
  reason proves nothing about the first.
- Every valid case of a version is also checked as each later version (its `kbl` changed): each version holds the
  older ones (D108, D150). A member of a later version in an older file is an invalid case of the older version
  (`schema/0.1/invalid/targets-macos-in-0.1.kbl.json`, `schema/0.2/invalid/targets-android-in-0.2.kbl.json`).
- `schema/0.1/valid/boundaries.kbl.json` holds the edge values that must pass; add a boundary there when you add a
  bound (in a 0.2-only member: a `boundaries` case under `schema/0.2/valid/`).
- `third_party/cldr-release-49/` holds unmodified CLDR files under the Unicode License v3 (its `LICENSE` and
  `README.md`). Never edit them. New third-party files go in a folder of their own with their licence text and
  an entry in `NOTICE`.
- `touch-runtime/<N>/{valid,invalid}/*.json` and `touch-runtime/manifest/{valid,invalid}/*.json`: cases of the touch
  runtime schemas (`src/touch-runtime.ts`); valid runtime files must also meet `targets/touch-runtime.md` §8.
