# kbl-spec: agent instructions

The specification of `.kbl.json`, YAKBD's keyboard-layout format: prose, a JSON Schema generated from a zod source,
and a checker. The Go tool that converts and compiles these files is the sibling repository
`yakbd/yakbd-cli`; it implements this specification and sends its questions back as notes.

## Commands

Run everything from the repository root, on Node.js 22 (`engines` `>=22 <23` with `engine-strict`: `npm ci` refuses
other majors).

    npm ci                           # exact pins from package-lock.json
    npm test                         # tsc + schema freshness + tools/check; this is what CI runs
    npm run gen                      # after editing src/schema.ts: rewrite schema/<version>/kbl.schema.json (0.1–0.3)
    npm run check                    # checker only (examples, schema cases, cross-document checks)
    npx tsx tools/gen-schema.ts --check   # schema freshness only

CI (`.github/workflows/validate.yml`) runs `npm ci && npm test` on push to `main` only when a filtered path changes
(`src/`, `schema/`, `examples/`, `testdata/`, `tools/`, `targets/`, `coverage/`, `SPEC.md`, package files, the
workflow); a push that touches none of them (root docs only), and every push to another branch, starts no run. Start
one by hand with `gh workflow run validate.yml --ref <branch>`. Push in batches.

## Which text wins

- `SPEC.md` is the normative format text. `targets/windows.md` and `targets/windows-install.md` are normative for
  the Windows target (§10 of the install text is informative); `targets/windows-default-vk.tsv` is Table A and is
  normative over the summary in `targets/windows.md`. The same holds for each other target's `targets/<target>.md`
  and its position table (SPEC §16, D109).
- The schema checks structure only; the cross-field rules of SPEC §19 live in prose and partly in `tools/check`.
- `src/schema.ts` is the only edited schema source; every `schema/<version>/kbl.schema.json` is generated from it
  and committed.
- Versions (SPEC §1.1, D108, D150): this branch writes **0.3** (draft: Android, iOS, ChromeOS, Keyman, touch
  geometry). 0.1 and 0.2 are released and frozen: the checker pins the hashes of their schema files. Work on 0.3
  stays on the branch `spec-0.3` until the owner merges it; fixes to 0.2 arrive by merging `main` into `spec-0.3`, never by
  rebase. Pages publishes `main`, and `schema/latest/` is the newest `schema/<version>/` there: it must not move to an
  unfinished 0.3.
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
  (`targets/<target>.md`); `tools/check` fails on any mismatch. A loss kind named in `targets/` or `coverage/`
  must be defined in SPEC. A new family goes into `familiesSince` in `tools/check/main.ts`; a 0.3 kind of an old
  family (`general`, `cldr`) into `lossKindsCore03`.
- `npm test` fails "0.1 is frozen" (or 0.2) -> an edit to a shared part of `src/schema.ts` changed an older schema.
  Build the change per version in `kblFile()` (or a factory it calls) instead; only a recorded bug fix of that
  version may change it (then update the pinned hash `frozen` in `tools/check/main.ts`).
- The checker reads those tables and headings by their text shape: reformatting a loss-kind row of SPEC §17.3 or
  the `## 1. Rule index` heading breaks `npm test` (formats in `tools/AGENTS.md`).
- Added a schema property -> mention its name in `SPEC.md` (checked) and give it a description (checked).
- Changed the shape of the format (schema, `targets.windows`, loss kinds, default rules) -> add a line to the
  changelog at the end of `STATUS.md` naming the commit; the tool repository follows that changelog.
- New example in `examples/` -> it must pass zod, the JSON Schema and the checker's §19 subset; list it in `STATUS.md`.
- The schema `$id`s (`https://yakbd.github.io/kbl-spec/schema/<version>/kbl.schema.json`) serve the copies that
  `.github/workflows/pages.yml` last published; it publishes only `schema/` plus a generated `schema/latest/` (D106),
  so never commit `schema/latest/`. Validate against the local files. Keep the `$id`s as they are (D100).
- Examples are 0.1 files except those that need a later version (0.2: `macos-option-deadkeys`, `xkb-caps-deadkeys`;
  0.3: the touch examples); the tool repository copies them, and reads every version. Each version's shapes are also
  tested by `testdata/schema/<version>/`.
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

## Documentation and the website

- People read the documentation on the website, https://yakbd.github.io/ (repository `yakbd/yakbd.github.io`). It
  fetches this repository's reference files (SPEC.md, `targets/*.md`, `coverage/`, COMPATIBILITY.md, STATUS.md,
  DECISIONS.md) at the commit pinned in its `sources.json`; the format's introduction (`/spec/`) is a page of the
  website itself. `README.md` stays a short front door: one sentence, the targets table, links to the site's pages.
  Explanatory text goes into the document it belongs to or a website page, not into the README.
- **Part of every tagged version** (and of every change on `main` that adds, removes or changes what the format
  can express): update this repository's documents (README targets table, `STATUS.md`, the documents the change
  touches) and prepare the website change in `yakbd/yakbd.github.io`: re-pin `kbl-spec` in `sources.json` to the
  version's commit, add or update the pages the change needs (a new target gets its spec and coverage pages, a new
  fetched file its entry in `sources.json`), and update the landing page's platform list and `/spec/` page. The
  owner tags and publishes; a version is not finished while the website still describes the previous one.

## Schema and checker work

Rules for `src/` and `tools/` are in `src/AGENTS.md` and `tools/AGENTS.md`; schema test cases in
`testdata/AGENTS.md`. For zod questions use the zod documentation (https://zod.dev), or a zod skill or docs server if your
setup has one. Where they and this repository differ, this repository's files win.

## Keeping this file current

Rewrite a rule where it stands when it changes; history stays in git. Keep this file under 150 lines.
