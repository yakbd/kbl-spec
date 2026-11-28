# Compatibility of `.kbl.json` 0.x

The format is released as **0.2 preview** (tag `v0.2.0-preview`), which adds macOS and Linux (XKB) targets to the
**0.1 preview** (tag `v0.1.0-preview`). Both are complete enough to implement and to write layouts in, and neither is
frozen. This page says what you can rely on before 1.0.

## What 0.1 promises

- **A valid 0.1 file stays valid and keeps its meaning** for as long as the format is 0.1. The texts may be
  clarified and corrected, but such a fix does not change what a correct file means.
- **The schema at `schema/0.1/` changes only to fix bugs and to add loss kinds.** A bug fix makes the schema agree
  with `SPEC.md` (see below), so it can reject a file that the specification already forbade. New loss kinds may be
  added to the list in `SPEC.md` §17.3; an existing kind keeps its meaning.
- **Default rules are part of 0.1.** The Windows default rules in `targets/windows.md` and the default table
  `targets/windows-default-vk.tsv` keep their names and results within 0.1, except to fix a bug (a rule that does
  not do what its text says), recorded in `DECISIONS.md` and the changelog. A file that writes its defaults out
  (pinning, `targets/windows.md` §10) does not depend on them at all.

## What 0.2 promises

- **A valid 0.2 file stays valid and keeps its meaning** for as long as the format is 0.2, as "What 0.1 promises"
  says for 0.1: the texts may be clarified and corrected, `schema/0.2/` changes only to fix bugs and to add loss
  kinds, and the macOS and XKB default rules and position tables keep their names and results within 0.2, except
  to fix a bug.

And, from D108:

- **0.2 does not change 0.1.** `schema/0.1/kbl.schema.json` changes only as "What 0.1 promises" allows (the
  repository's checker pins its hash, so no other change slips in), and those rules still hold for 0.1 files.
- **0.2 holds 0.1.** 0.2 only adds (`targets.macos`, `targets.xkb`, their loss kinds, two provenance formats). A
  valid 0.1 file whose `kbl` (and `$schema`) is changed to `"0.2"` is a valid 0.2 file and means the same: the
  Windows default rules and Table A do not change in 0.2.
- **A 0.2 reader reads 0.1 files**, checking each file against the schema of the version it names. A 0.1 reader
  rejects 0.2 files (below).
- **Tools write the lowest version that holds the file** (`SPEC.md` §1.1), so a file that uses nothing new stays
  readable by 0.1 tools.

## What may change in 0.x

- **A new minor version (0.2, 0.3, …)** may add fields, targets (for example macOS or Linux) and loss kinds, and may,
  where there is no other way, change or remove something. Each minor version has its own `kbl` value (`"0.2"`)
  and its own schema path (`schema/0.2/kbl.schema.json`). Earlier schema paths stay published and unchanged, so a
  file keeps validating against the version it names.
- **`schema/latest/kbl.schema.json` moves.** The published site also serves
  `https://yakbd.github.io/kbl-spec/schema/latest/kbl.schema.json`, a byte-identical copy of the newest version's
  schema, made when the site is published (its `$id` is the versioned address). It moves to each new minor
  version, so a file's `$schema`, and anything that needs stability, names the versioned path (D106).
- A reader for one version rejects a file of a later one: files have no unknown properties (`SPEC.md` §1), and the
  `kbl` value differs. A tool that supports several versions says so.
- Additions are preferred to changes. When a minor version has to change something, the changelog says what, and
  how to update a file.

## How changes are announced

- Every change to the shape of the format (schema, `targets.windows`, loss kinds, default rules) gets a line in the
  changelog at the end of [`STATUS.md`](STATUS.md), naming the commit.
- The reason for each change is a numbered entry in [`DECISIONS.md`](DECISIONS.md).
- Versions are marked by git tags (`v0.1.0-preview`, `v0.2.0-preview`, then `v0.2.1`, `v0.3.0`, …).

## When 1.0 comes

1.0 is declared after **one implementation outside this project** reads or writes the format, or **six months
after the first public release**, whichever comes first. 1.0 then freezes the format under a stricter policy.

## Which text wins

[`SPEC.md`](SPEC.md) is the normative text (with the target documents it names). The JSON Schema checks the structure
of a file. When the two accept different files, **`SPEC.md` wins** and the schema is the bug: it is fixed, and the
fix is listed in the changelog. Some rules that relate parts of a file to each other are not in the schema at all
(`SPEC.md` §19).
