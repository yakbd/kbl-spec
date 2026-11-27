# testdata/: schema cases and third-party fixtures

- `schema/valid/*.kbl.json` must be accepted and `schema/invalid/*.kbl.json` rejected, by the zod schema and by the
  JSON Schema alike (`npm run check`).
- An invalid case breaks exactly one member of an otherwise valid file, and its name says which
  (`key-width-zero.kbl.json`). Start from `schema/valid/base.kbl.json`. A case that fails for a second reason
  proves nothing about the first.
- `schema/valid/boundaries.kbl.json` holds the edge values that must pass; add a boundary there when you add a
  bound.
- `third_party/cldr-release-49/` holds unmodified CLDR files under the Unicode License v3 (its `LICENSE` and
  `README.md`). Never edit them. New third-party files go in a folder of their own with their licence text and
  an entry in `NOTICE`.
