# Clean-room record

This file says where the content of this repository came from, so that anyone can check that it was written from
public sources and measurements only.

## The reference specification

Every fact about Windows keyboard-layout DLLs, Windows' keyboard behaviour, layout installation and the `.klc`
format comes from one clean reference specification: the **YAKBD reference specification, revision 10** (frozen
2026-11-21).

- It was written from public documents and from black-box measurements of Windows and of Microsoft Keyboard Layout
  Creator (MSKLC) 1.4 in disposable virtual machines. Every rule in it is tagged with its public source or with the
  test that repeats it.
- The authors of this repository worked from the frozen revision only, under its clean-room rules.
- The reference specification is not public. Citations such as "dll §4.2", "inst §10", "wb" or "klc" (key at the
  top of `targets/windows.md`) name its sections. They record where a fact came from; publishing the reference
  specification is a separate decision.
- Its owner relicensed it to MIT-0 for use in the yakbd repositories on 2026-11-22 (D20). Text taken from it is
  cited by section.

| item | value |
|---|---|
| revision | 10, commit `6637b8db2737f0c84f646dc603797708eb6aaceb` |
| tree hash of its `spec/` folder | `24fb0165bc1ef4c96c0b45c2859a933a9bd39e95` |
| sections read | `dll-format` (again later: §1.7, §10, §11), `klc-format` (with its table `vk-names.tsv`), `windows-behaviour`, `installation` (§0 to §8, §10, §11 including T12; later §2.4, §4.1 to §4.7, §5, §6, §7, §10 and, from its VM test folder, the README parts T3 and T8, `series-welcome.ps1` and the T8 results) |
| its MSKLC observations (what MSKLC's own tools were seen to do) | **read in part**, once (2026-11-22): the README and entries D16 to D24 of its DLL notes (to see whether a default scan-code table is kept there; it is not), plus one text search. Nothing from it is used as a rule here, and observation entries named in `installation` are not cited as facts |
| its notes on public sources | **not read** |

The written instructions each author worked from are kept in the private prototype repository. Commit hashes in
this record name commits of that private history, which the public history does not contain.

## Other sources, all public

- Unicode CLDR, release tag `release-49`: `keyboards/dtd/ldmlKeyboard3.dtd`, `ldmlKeyboard3.xsd`,
  `ldmlKeyboardTest3.dtd`, `ldmlKeyboardTest3.xsd`, `keyboards/import/*`, `keyboards/3.0/*`, `keyboards/test/*`,
  `keyboards/abnf/*` and the LDML Part 7 text `docs/ldml/tr35-keyboards.md` at that tag
  (https://www.unicode.org/reports/tr35/tr35-keyboards.html). Described in our own words.
- Microsoft, "About Keyboard Input" (scan-code table only), cited by the reference specification itself.
- Microsoft, "Virtual-Key Codes" (which key each VK names), accepted as a source by the owner (D29); used for facts
  only in `targets/windows-default-vk.tsv`.
- W3C, "UI Events KeyboardEvent code Values" (names of physical positions).
- Go documentation of `encoding/json` (handling of lone surrogates).
- RFC 9562 (UUID version 5), named for rule `productCode`.
- zod (2026-11-25): the zod repository and documentation (https://github.com/colinhacks/zod, https://zod.dev;
  release v4.6.7), asked through the zod docs MCP server in `.mcp.json` (zod questions only); the zod agent skill
  https://github.com/anivar/zod-skill at commit `619b0fbd142f83eeee0c0a54efbd4352672aa51f` (MIT; in
  `.claude/skills/zod/`, see `NOTICE`); npm package metadata of the pinned dependencies. Nothing about Windows.
- The kalamine `.klc` template cited by `klc` §0 was fetched once (2026-11-22) to look for scan-code rows; it has
  none, the copy was deleted and nothing from it is used.
- README and AGENTS.md files (2026-11-26): written from this repository, following two public agent-instruction
  skills (Microsoft's `wiki-agents-md`, https://github.com/microsoft/skills, and mblode's `agents-md`,
  https://github.com/mblode/agent-skills). The README's validation command was tried with the npm package
  `ajv-cli` 5.0.0.
- 0.1 preview (2026-11-27): the macOS / XKB paper check (D105) read Apple's archived technical note TN2056
  "Installing and Using Keyboard Layouts" (https://developer.apple.com/library/archive/technotes/tn2056/_index.html)
  and libxkbcommon's keymap text format and Compose pages (https://xkbcommon.org/doc/current/).
  `COMPATIBILITY.md`, the contributing guide and decisions D100 to D104 were written from this repository and the
  owner's answers.

## What was never read

No decompiled or disassembled code, no leaked source, no Windows SDK or WDK headers, no Wine or ReactOS source,
and no private material of the reference specification's authors. Where a Windows fact was needed and the
reference specification does not give it, it is listed in `OPEN-QUESTIONS.md` instead of being supplied from
memory.

The full working record, with the date and author of each reading, is kept in the private prototype repository.
