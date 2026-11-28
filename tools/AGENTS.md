# tools/: schema generator and repository checker

- `gen-schema.ts` writes `schema/<version>/kbl.schema.json` for every version `src/schema.ts` exports (`npm run
  gen`); `--check` only compares and is part of `npm test`. Keep its output byte-stable: root keywords first,
  `$defs` last, two-space JSON, final newline. `schema/0.1/` and `schema/0.2/kbl.schema.json` must not change
  (D108, D150): the checker pins their SHA-256 (`frozen` in `check/main.ts`).
- `check/main.ts` is the repository checker (`npm run check`). Its header lists the eight checks; keep that list
  true when you add one. It runs from the repository root and reads files by relative path.
- Targets are one list at the top of `check/main.ts` (`targets`: name, rule-index files, position table); a new
  build target adds a line there. The loss-kind families each version adds are `familiesSince`; kinds a version adds to older families
  are `kindsSince` (from `lossKindsCore03`).
- The checker parses prose by shape, so these formats are contracts:
  - SPEC.md loss kinds: table rows starting `` | `family.name` | `` followed by `**fatal**`, `accept`, `warning`
    or `error`;
  - `## 1. Rule index` in every target document (`targets/windows.md`, `targets/windows-install.md`,
    `targets/<target>.md` of every other target), rules as backticked names in the first column, the section ending at
    the next `## `; they must equal the schema's `<target>Default.<rule>` kinds;
  - `targets/windows-vk-names.tsv` (first column = VK name) and `targets/windows-default-vk.tsv` (Table A);
  - the other position tables (SPEC §16): `#` comment lines, a header `position`, the target's code, …, `source`;
    positions and codes unique, every row with a source. A table that does not exist yet is skipped.
- It implements a subset of SPEC §19 (item 1 references, §7.3 layer overlap). The
  SPEC text stays the definition; `yakbd validate` in the tool repository checks §19 too.
