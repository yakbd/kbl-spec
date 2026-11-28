# testdata/: schema cases and third-party fixtures

- `schema/<version>/valid/*.kbl.json` must be accepted and `schema/<version>/invalid/*.kbl.json` rejected, by that
  version's zod schema and JSON Schema alike (`npm run check`). Versions: `0.1`, `0.2`.
- An invalid case breaks exactly one member of an otherwise valid file, and its name says which
  (`key-width-zero.kbl.json`). Start from `schema/<version>/valid/base.kbl.json`. A case that fails for a second
  reason proves nothing about the first.
- Every valid 0.1 case is also checked as a 0.2 file (its `kbl` changed): 0.2 holds 0.1 (D108). A 0.2-only member in
  a 0.1 file is an invalid 0.1 case (`schema/0.1/invalid/targets-macos-in-0.1.kbl.json`).
- `schema/0.1/valid/boundaries.kbl.json` holds the edge values that must pass; add a boundary there when you add a
  bound (in a 0.2-only member: a `boundaries` case under `schema/0.2/valid/`).
- `third_party/cldr-release-49/` holds unmodified CLDR files under the Unicode License v3 (its `LICENSE` and
  `README.md`). Never edit them. New third-party files go in a folder of their own with their licence text and
  an entry in `NOTICE`.
