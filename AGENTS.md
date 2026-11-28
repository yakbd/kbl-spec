# kbl-spec: agent instructions

The specification of `.kbl.json`, YAKBD's keyboard-layout format: prose, a JSON Schema generated from a zod source,
and a checker. The Go tool that converts and compiles these files is the sibling repository
`yakbd/yakbd-cli`; it implements this specification and sends its questions back as notes.

## Commands

Run everything from the repository root, on Node.js 22 (`engines` `>=22 <23` with `engine-strict`: `npm ci` refuses
other majors).

    npm ci                           # exact pins from package-lock.json
    npm test                         # tsc + schema freshness + tools/check; this is what CI runs
    npm run gen                      # after editing src/schema.ts: rewrite schema/<version>/kbl.schema.json (0.1, 0.2)
    npm run check                    # checker only (examples, schema cases, cross-document checks)
    npx tsx tools/gen-schema.ts --check   # schema freshness only

CI (`.github/workflows/validate.yml`) runs `npm ci && npm test` on push to `main` only when a filtered path changes
(`src/`, `schema/`, `examples/`, `testdata/`, `tools/`, `targets/`, `coverage/`, `SPEC.md`, package files, the
workflow); a push that touches none of them (root docs only) starts no run. Start one by hand with
`gh workflow run validate.yml`. Push in batches.

## Which text wins

- `SPEC.md` is the normative format text. `targets/windows.md` and `targets/windows-install.md` are normative for
  the Windows target (§10 of the install text is informative); `targets/windows-default-vk.tsv` is Table A and is
  normative over the summary in `targets/windows.md`. The same holds for each other target's `targets/<target>.md`
  and its position table (SPEC §16, D109).
- The schema checks structure only; the cross-field rules of SPEC §19 live in prose and partly in `tools/check`.
- `src/schema.ts` is the only edited schema source; `schema/0.1/` and `schema/0.2/kbl.schema.json` are generated
  from it and committed.
- Versions (SPEC §1.1, D108): this branch writes **0.2** (draft, macOS and XKB). 0.1 is released and frozen: the
  checker pins the hash of `schema/0.1/kbl.schema.json`. Work on 0.2 stays on the branch `spec-0.2` until the owner
  merges it; Pages publishes `main`, and `schema/latest/` must not move to an unfinished 0.2.
- Record every format design decision as the next numbered entry of `DECISIONS.md`, with its reason; a later
  entry that changes an earlier one says so. Entries are never renumbered. Questions for the owner go to
  `OPEN-QUESTIONS.md`, each with a recommendation.
- When SPEC and the schema disagree, SPEC wins and the schema is the bug (D101, `COMPATIBILITY.md`).
  If the fix changes which files are accepted, record it in `DECISIONS.md` and the `STATUS.md` changelog.

## Gotchas

- Edited `src/schema.ts` without `npm run gen` -> `npm test` fails "is not what src/schema.ts generates". Commit
  the source and the generated file together.
- Added or renamed a loss kind or a default rule -> update all of: SPEC §17.3, the schema's `onLoss` kinds (0.2
  kinds in the target's own list, `lossKindsMacos` / `lossKindsXkb`), and the "Rule index" of the target's document
  (`targets/windows.md` / `targets/windows-install.md`, `targets/macos.md`, `targets/xkb.md`); `tools/check` fails
  on any mismatch. A loss kind named in `targets/` or `coverage/` must be defined in SPEC. A new 0.2-only family
  also goes into `families02` in `tools/check/main.ts`.
- `npm test` fails "0.1 is frozen" -> an edit to a shared part of `src/schema.ts` changed the 0.1 schema. Build the
  change per version in `kblFile()` instead; only a recorded 0.1 bug fix or a new loss kind for both versions may
  change 0.1 (then update the pinned hash in `tools/check/main.ts`).
- The checker reads those tables and headings by their text shape: reformatting a loss-kind row of SPEC §17.3 or
  the `## 1. Rule index` heading breaks `npm test` (formats in `tools/AGENTS.md`).
- Added a schema property -> mention its name in `SPEC.md` (checked) and give it a description (checked).
- Changed the shape of the format (schema, `targets.windows`, loss kinds, default rules) -> add a line to the
  changelog at the end of `STATUS.md` naming the commit; the tool repository follows that changelog.
- New example in `examples/` -> it must pass zod, the JSON Schema and the checker's §19 subset; list it in `STATUS.md`.
- The schema `$id`s (`https://yakbd.github.io/kbl-spec/schema/<version>/kbl.schema.json`) serve the copies that
  `.github/workflows/pages.yml` last published; it publishes only `schema/` plus a generated `schema/latest/` (D106),
  so never commit `schema/latest/`. Validate against the local files. Keep the `$id`s as they are (D100).
- Examples are 0.1 files except those that need 0.2 (`macos-option-deadkeys`, `xkb-caps-deadkeys`: `targets.macos`, `targets.xkb`); the tool repository copies them, and reads both versions. 0.2 shapes are also tested by `testdata/schema/0.2/`.
- A change that would make a valid 0.1 file invalid or change its meaning is not a 0.1 change: it waits for a new
  minor version with its own schema path (`COMPATIBILITY.md`). This includes the default rules and Table A.
  Bug fixes (a schema that follows SPEC, a rule that follows its text) are the exception.

## Clean room (binding)

- Sources allowed: this repository, the clean YAKBD reference specification (the version `CLEAN-ROOM.md` names),
  and public pages and repositories (CLDR `keyboards/`, the LDML Part 7 text, zod, Node.js, Unicode data files).
  Without the reference specification, a Windows fact needs a public source or a measurement (the organisation's
  [`CONTRIBUTING.md`](https://github.com/yakbd/.github/blob/main/CONTRIBUTING.md)).
- Every Windows DLL, Windows behaviour, installation and `.klc` fact comes from the reference specification and is
  cited by section ("dll §4.2", "wb", "klc", "inst"; key at the top of `targets/windows.md`). Never read Windows
  source, leaked code, decompiled or disassembled material, Wine or ReactOS.
- A fact the reference specification does not give is not supplied from memory: add it to `OPEN-QUESTIONS.md` with
  a recommendation.
- Record what you read in `CLEAN-ROOM.md` (reference-spec sections, and any part of it beyond its specification
  documents that you opened).
- Describe CLDR in your own words and link to it; do not copy its prose.
- macOS and Linux (D111): any public source may be read (docs, public repositories, source of any licence, public
  header mirrors), never copy code or long prose; record every source in `CLEAN-ROOM.md` under its platform's
  subsection. Fixtures only from openly licensed corpora; platform-owned layouts are never committed.

## Repository rules

- No Python, anywhere. Tooling is TypeScript here and Go in the tool repository.
- Visibility, GitHub Pages, tags and releases are the owner's: never change them, publish nothing yourself.
- Licence MIT-0 (`LICENSE`). Third-party material keeps its licence and gets an entry in `NOTICE`; CLDR fixtures
  stay unmodified in `testdata/third_party/` with the Unicode License v3 text.
- Windows tests run on disposable VMs outside this repository; their results are recorded in
  `targets/windows-vm-tests.md`. Do not mark anything "verified on Windows" without such a run.
- GitHub API: do not poll `gh` in a loop. Wait for a CI run with one `gh run watch <id> --exit-status`; on 403 or
  "rate limit", read the reset time from `gh api rate_limit` and wait.

## Schema and checker work

Rules for `src/` and `tools/` are in `src/AGENTS.md` and `tools/AGENTS.md`; schema test cases in
`testdata/AGENTS.md`. For zod questions use the zod documentation (https://zod.dev), or a zod skill or docs server if your
setup has one. Where they and this repository differ, this repository's files win.

## Keeping this file current

Rewrite a rule where it stands when it changes; history stays in git. Keep this file under 150 lines.
