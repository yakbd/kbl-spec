# tools/: schema generator and repository checker

- `gen-schema.ts` writes `schema/0.1/kbl.schema.json` (`npm run gen`); `--check` only compares and is part of
  `npm test`. Keep its output byte-stable: root keywords first, `$defs` last, two-space JSON, final newline.
- `check/main.ts` is the repository checker (`npm run check`). Its header lists the seven checks; keep that list
  true when you add one. It runs from the repository root and reads files by relative path.
- The checker parses prose by shape, so these formats are contracts:
  - SPEC.md loss kinds: table rows starting `` | `family.name` | `` followed by `**fatal**`, `accept`, `warning`
    or `error`;
  - `## 1. Rule index` in `targets/windows.md` and `targets/windows-install.md`, rules as backticked names in the
    first column, the section ending at the next `## `;
  - `targets/windows-vk-names.tsv` (first column = VK name) and `targets/windows-default-vk.tsv` (Table A).
- It implements a subset of SPEC §19 (item 1 references, §7.3 layer overlap). The
  SPEC text stays the definition; `yakbd validate` in the tool repository checks §19 too.
