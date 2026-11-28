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
- README and AGENTS.md again (2026-11-28, documentation moved to the website): written from this repository and the
  website's page list, following the same two skills and the `init-deep` skill (hierarchical AGENTS.md files).
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

## macOS and Linux (version 0.2)

The rule for these platforms is the owner's (D111) and differs from the Windows rule above, which is unchanged:

- **Any public source may be read** for macOS and Linux facts: documentation, specifications, public repositories
  and source code of any licence (GPL included), public mirrors of headers, and reference tools for their
  behaviour (for example Kiimo, libxkbcommon, xkeyboard-config, compositors, Apple's TN2056).
- **Nothing is copied.** No code and no long prose from any source; code and text here are written from
  understanding. Short names and values a format requires (element names, keysym names, key codes) are facts and
  may be used.
- **Every source read is recorded** below, in the subsection of its platform: URL (with a version, tag or commit
  where there is one), what it was read for, and its licence.
- **Fixtures** come only from openly licensed corpora (MIT or Unlicense `.keylayout` files, CLDR `keyboards/osx` up
  to release 43 under the Unicode licence, xkeyboard-config symbols under their MIT/X11 notices), each in its own
  folder under `testdata/third_party/` with its licence text and an entry in `NOTICE`. Layouts owned by the platform
  (Apple's own layouts, files installed by an operating system) are read on the platform only and never committed.
- Windows facts still come only from the reference specification and Microsoft's public documentation.

The groundwork for 0.2 (version mechanics, position-table pattern, dead-key statement, these rules; D108 to D111)
was written from this repository and the owner's decisions. The drift test of D109 follows the tool repository's
Table A test (`yakbd/yakbd-cli`, `target/windows/vk/tablea_test.go` and `scancodes.go`, MIT-0, read 2026-11-28 for how
the embedded copy is compared); no other source was read for it.

### macOS sources

| source | read for | licence |
|---|---|---|
| Apple, Technical Note TN2056 "Installable Keyboard Layouts" (2009-10-02), https://developer.apple.com/library/archive/technotes/tn2056/_index.html, read 2026-11-28 | every `.keylayout` element and attribute and the DTD (`coverage/macos.md`), modifier words and matching, key maps and `baseMapSet`, actions, states, terminators, the dead-key example, bundle shapes, install folders, group 126 and negative ids | Apple documentation; facts only |
| Chromium, `ui/events/keycodes/dom/dom_code_data.inc` (branch `main`, fetched 2026-11-28), https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/events/keycodes/dom/dom_code_data.inc | the Mac key code of each W3C code value (`targets/macos-default-keycode.tsv`, column `keyCode`) | BSD-3-Clause; names and values only |
| Apple, Carbon `HIToolbox/Events.h` of the macOS 10.15 SDK, read through the public mirror https://github.com/phracker/MacOSX-SDKs (commit `041600eda65c6a668f66cb7d56b7d1da3e8bcc93`), 2026-11-28 | the `kVK_*` virtual-key constants and their values (column `constant`), the ISO-only and JIS-only key codes | Apple SDK header (the mirror states no licence); names and values only |
| Kiimo (https://github.com/Manoonchai/kiimo, commit `c51da722b9d95ed579b47939209c5c96d7888e60`), `generator/generateMacBundle.ts` and `output/Manoonchai/Manoonchai.bundle/Contents/Resources/Manoonchai.keylayout`, read 2026-11-28 | the `Info.plist` keys of a layout bundle (`KLInfo_<name>`, `TISInputSourceID`, `TISIntendedLanguage`, `TISIconIsTemplate`), `InfoPlist.strings` lines; the standard outputs of Return, Tab, Delete, Escape, the arrows, Home/End/Page keys, Help, Forward Delete, the function keys and the number pad in its base key map (column `output`); XML 1.1 | MIT; key names and output values only |
| SDL, `src/events/scancodes_darwin.h` (https://github.com/libsdl-org/SDL, commit `4c60f49b6b4bc7df1a97755ac63fba39641bfe96`), read 2026-11-28 | that macOS delivers key codes 10 and 50 swapped from ISO keyboards (rule `isoKeys`) | zlib; a fact only |
| Web search result snippets, not opened: Mozilla bugs 1263302 and 1755096, WebKit bug 244202, QEMU keycodemapdb, SFML pull request 2243, Blender issue T65532 (2026-11-28) | the same ISO swap, as a second source | facts only |
| `yakbd/yakbd-cli` `tools/macos-check/` (README, the two check bundles, MIT-0) and its runs 46102612485, 46102900903, 46103925085, 46104372309, 46104797718, 46105185134 | the measured install, enable and select order, no sign-out, unsigned bundles not blocked, XML 1.1 working (`targets/macos.md` §5) | MIT-0, this project |

No Apple layout was opened. The decisions D120 to D127 and the macOS pages (`targets/macos.md`, `coverage/macos.md`, the position table) were written from these sources in our own words.

### Linux (XKB) sources

| source | read for | licence |
|---|---|---|
| libxkbcommon (https://github.com/xkbcommon/libxkbcommon, commit `15b2b4e47a350712c0ebd120a100c95a7c17e04e`, 2026-11-11), read 2026-11-28: `doc/custom-configuration.md`, `doc/packaging-keyboard-layouts.md`, `doc/rules-format.md`, `doc/compatibility.md`, `doc/keymap-text-format-v1-v2.md`, `doc/keysym-encoding.md`, `NEWS.md`, `include/xkbcommon/xkbcommon-compose.h`, `include/xkbcommon/xkbcommon-keysyms.h`, `src/keysym-utf.c` (`xkb_utf32_to_keysym`), `src/compose/paths.c` | the user path and its order, the registry entry, the extension directories and `.post` rules (1.13), the rules grammar (`layout[any]`, `%S`), key types, consumed and preserved modifiers, the automatic type, keysym spellings and string literals (1.9), several keysyms per level, `Level9`+ (1.11), X11 limits, Compose lookup order and cancelled sequences, the dead keysym names, how a character becomes a keysym (`targets/xkb.md`, `coverage/xkb.md`) | MIT; facts only |
| xkeyboard-config (https://gitlab.freedesktop.org/xkeyboard-config/xkeyboard-config, commit `f4d3ed8bb830e4b695408fe1df5b3cb038b97926`, 2026-11-06), read 2026-11-28: `types/basic`, `types/extra`, `types/level5`, `types/caps`, `types/iso9995`, `types/numpad`, `types/complete`, `keycodes/evdev`, `keycodes/aliases`, `symbols/pc`, `symbols/level3`, `symbols/level5`, `symbols/keypad`, `COPYING` | the stock key types and their level maps (the table of `targets/xkb.md` §3, computed from the type definitions), key names and aliases (`targets/xkb-default-keyname.tsv`), the level-shift keys, the keypad navigation keysyms, the keys `symbols/pc` gives every keymap; the same `types/` files of the 2.49 release (tarball, compared 2026-11-28) are identical | MIT/X11-style notices (`COPYING`); names and values only |
| xorgproto `include/X11/keysymdef.h`, release 2026.1 (https://gitlab.freedesktop.org/xorg/proto/xorgproto, tag `xorgproto-2026.1`), read 2026-11-28 | keysym names, their `U+` comments and the deprecation rules (rule `characters`) | MIT/X11-style notice (The Open Group); names and values only |
| Chromium, `ui/events/keycodes/dom/dom_code_data.inc` (branch `main`, fetched 2026-11-28), https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/events/keycodes/dom/dom_code_data.inc | the X keycode (XKB column) of each W3C code value (`targets/xkb-default-keyname.tsv`, column `keycode`) | BSD-3-Clause; names and values only |
| `yakbd/yakbd-cli` `tools/xkb-check/` (README "Results" and "Limits", the test layouts, `src/xkbtype.c`; MIT-0, commit `efb2a00`) | the measured facts cited **[LNX]** in `targets/xkb.md`: versions per distribution, the user path per stack, UTF-8 strings, Caps Lock per stock type, Compose order, GTK 4 and dead keys, several keysyms per level | MIT-0, this project |
| Our own tries **[LAB]** (2026-11-28): a container from `archlinux:latest` with libxkbcommon 1.13.2, xkeyboard-config 2.49, `xkbcomp` 1.5.0 and `setxkbmap` 1.3.5 from Arch Linux's packages, typing with the check's `xkbtype` | a key type from `~/.config/xkb/types/` added by `~/.config/xkb/rules/evdev.post` (`layout[any]`, with and without a variant, as first and second layout), a missing type (warning XKB-286), `xkbcomp` compiling the same types, a Compose `include` of a file under `%H`, an empty Compose result, a hyphen in a symbols file name | measurements; nothing published |

No layout of a distribution was copied. The decisions D135 to D142 and the Linux pages (`targets/xkb.md`,
`coverage/xkb.md`, the position table) were written from these sources in our own words.

### Linux (XKB) and macOS follow-ups (D143 to D145)

| source | read for | licence |
|---|---|---|
| libxkbcommon, the same commit `15b2b4e`, read 2026-11-28: `src/registry.c` (`parse_layout`, `parse_variant`) | that the registry merges `layout` elements of one name and adds their variants once each, so install blocks may each hold a whole `layout` element (`targets/xkb.md` §5, D144) | MIT; facts only |
| `yakbd/yakbd-cli` `tools/xkb-check/` README "Results" (MIT-0, this project) | Xvfb 21.1 refuses a keymap with a level of several keysyms (D143) | MIT-0, this project |
| This repository's position tables (`targets/*-default-*.tsv`) | which positions a target has no row for (D145) | MIT-0, this project |

### Linux (XKB) fixes after the verification run (D146 to D149)

| source | read for | licence |
|---|---|---|
| xkeyboard-config 2.42 and 2.49 as installed in the check's containers (Debian 13, Arch Linux): `symbols/pc`, `symbols/keypad`, and the keymap `xkbcli compile-keymap` gives a layout without keys | which keys the system defines and with how many levels and which type (`CTRL+ALT` on F1 to F12 and the number-pad operators, four levels on `<LSGT>`), D146 | MIT/X11 notices; names and values only |
| Measurements in those containers (libxkbcommon 1.7.0 and 1.13.2 `xkbcli`, Xvfb 21.1 with `setxkbmap` and `xkbcomp`) and `yakbd/yakbd-cli` `tools/xkb-check/` (MIT-0, this project) | `NoSymbol` levels filled from the system key, `VoidSymbol` kept, X11 refusals and what loads (D146); GTK 4 on X11 and Caps Lock (D148) | MIT-0, this project |

### macOS follow-ups (D128 to D130)

| source | read for | licence |
|---|---|---|
| Apple, TN2056 (as listed above), the `<when>` and `<terminators>` sections, read again 2026-11-28 | that a `<when>` needs `output` or `next`, that `next` defaults to the base state, that a terminator has only an output (D129) | Apple's archived documentation, read only |
| `.keylayout` files that use an empty `output=""`: Kiimo's generated `Manoonchai.keylayout` (commit as above, MIT), `Deutsch (Programmieren).keylayout` of https://github.com/bitboxer/de-coding.keylayout (MIT), `old/AndreiRomanian.keylayout` of https://github.com/ysoftwareab/xkb-for-macos (Unlicense), read 2026-11-28 | that layouts in use write an empty output on keys and in a terminator (D129) | MIT, MIT, Unlicense; read only, nothing copied |
| `yakbd/yakbd-cli` `tools/macos-check/` (README, the cases `sides`, `gen-pending`, `gen-maxout`, `gen-spacing`, `gen-lproj-*`, `twin-*`; MIT-0) and its runs 46117765009, 46119172899, 46126097229 | the measured facts of D128 to D130 and `targets/macos.md` §8 | MIT-0, this project |

## Android, iOS, ChromeOS, Keyman and kbdgen (version 0.3)

The rule for these platforms and formats is the owner's (2026-11-28; recorded with D150) and is the macOS and Linux
rule of D111 carried over. The Windows rule above is unchanged.

- **Any public source may be read** for Android, iOS, ChromeOS, Keyman and kbdgen facts: documentation,
  specifications, public repositories and source code of any licence (GPL included), for example the Android Open
  Source Project, Chromium, Keyman, Divvun's kbdgen and its keyboard apps, Apple's developer documentation.
- **Nothing is copied.** No code and no long prose from any source; code and text here are written from
  understanding. Short names and values a format requires (attribute names, `KEYCODE_*` names, DOM codes, Keyman
  key names) are facts and may be used.
- **Every source read is recorded** below, in the subsection of its platform or format: URL (with a version, tag or
  commit where there is one), what it was read for, and its licence. Each piece of work adds its own subsection or
  rows and never rewrites another's.
- **Fixtures** come only from material whose licence allows it (for example AOSP `.kcm` files under Apache-2.0,
  giellalt kbdgen bundles and Keyman's keyboards repository under MIT), each in its own folder under
  `testdata/third_party/` with its licence text and an entry in `NOTICE`. Platform-owned material without such a
  licence (Apple's keyboards, Google's proprietary keyboard data, store apps) is never committed.
- Windows facts still come only from the reference specification and Microsoft's public documentation.

The groundwork for 0.3 (version mechanics, target and format names, the position-table rule for touch-only targets,
these rules; D150, D151) was written from this repository and the owner's decisions; no other source was read for it.

### Android sources

| source | read for | licence |
|---|---|---|
| Android Developers, "Configure the app module", section "Set the application ID" (https://developer.android.com/build/configure-app-module), read 2026-11-28 (on-screen targets work) | the grammar of an application id (`targets/androidime.md` §1, rule `packageName`) | documentation; facts only |

### iOS sources

| source | read for | licence |
|---|---|---|
| Apple, App Extension Programming Guide, "Custom Keyboard" and "Creating an App Extension" (developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/), read 2026-11-28 (on-screen targets work) | the next-keyboard requirement and `needsInputModeSwitchKey`; the `NSExtensionAttributes` keys of a keyboard extension (`targets/ios.md` §2, §4); that guide does not state the bundle-id prefix rule (left unmeasured) | documentation; facts only |

### ChromeOS sources

### Keyman sources

| source | read for | licence |
|---|---|---|
| keymanapp/keyman `common/schemas/keyman-touch-layout/README.md` and `keyman-touch-layout.spec.json` at commit `1e0a9dd113dd4ee52f09dc583060324a63eb4467`, read 2026-11-28 (on-screen targets work) | every member of a touch layout and its meaning (`coverage/keymantouch.md`) | MIT; nothing copied |
| keymanapp/keyboards at commit `46980ce`, the `.keyman-touch-layout` files (counts of members, ids and special labels only) | which members and `K_` ids real layouts use (`coverage/keymantouch.md` §3) | MIT; nothing copied |

### kbdgen sources

| source | read for | licence |
|---|---|---|
| divvun/kbdgen at commit `7a93e952849295a8bd4e9b21f57e6d43028289cf` (3.0.0-beta.5): `src/bundle/project.rs`, `src/bundle/target/mod.rs`, `src/bundle/layout/*.rs`, `src/util/mod.rs`, `src/util/iso_key.rs`, `src/build/chromeos/keymap.rs`, the special-key handling of `src/build/android/generate_android.rs`; read 2026-11-28 (on-screen targets work) | the bundle model and the hardware row order (`coverage/kbdgen.md`) | MIT OR Apache-2.0; nothing copied |
| giellalt/keyboard-sme at commit `c2b103b`, `sme.kbdgen/` (project, targets, layouts) | the shapes of real bundles (`coverage/kbdgen.md` §2, §3) | MIT; nothing copied |
| divvun/giellakbd-ios at commit `d877da4`, `Keyboard/Models/KeyDefinition.swift` (key type names only) | which special keys an iOS template knows (`coverage/kbdgen.md` §3.2) | MIT OR Apache-2.0; nothing copied |

### Touch model sources

| source | read for | licence |
|---|---|---|
| Unicode, UTS #35 Part 7 Keyboards (https://www.unicode.org/reports/tr35/tr35-keyboards.html, current version), read 2026-11-28 | the meaning of `layers/@minDeviceWidth` (minimum width of the touch surface, greatest matching width chosen) and the attributes of `key`, which have no height, hint or orientation (D152, D154) | Unicode License v3; facts only |

The other touch decisions (D152, D153, D155, D156) were written from this repository, the round plan's survey of
the platforms (recorded by the work on each platform in its own subsection) and the owner's decisions; their
platform remarks say what the format decides, not how a platform behaves.

The touch runtime file and the two on-screen targets (`targets/touch-runtime.md`, `targets/androidime.md`,
`targets/ios.md`; D200 to D206) were written from this repository, the round plan's platform survey and the sources
in the Android, iOS, Keyman and kbdgen subsections above; Android and iOS facts not found in those sources are
marked **unmeasured** there.
