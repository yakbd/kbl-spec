# Target `macos`: default rules and pinning (0.2 draft, normative)

How a `.kbl.json` file becomes a macOS keyboard layout, a `.keylayout` file in a `.bundle`, when `targets.macos`
(SPEC §16.4) is silent. Facts about macOS are cited by source: **TN2056** = Apple's archived technical note
"Installable Keyboard Layouts" (2009); **[MAC run N]** = a measurement on GitHub's macOS runners (workflow run N of
`yakbd/yakbd-cli`'s `macos-layout-check`, recorded there in `tools/macos-check/README.md`); **[pub]** = a public
source named in `CLEAN-ROOM.md`; **unmeasured** = the rule is this specification's choice and the behaviour behind it
has not been measured yet (§8 lists these).

Section 1 is being written first; the sections after it follow.

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16, D120): a fixed table and one-line rules, no heuristics. They
   are knowingly wrong for many layouts. A layout that needs anything else says it in its own `targets.macos`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported**, as an entry of kind `macosDefault.<rule>` (SPEC §17.1) listing what it
   decided (`detail.value`). Its policy defaults to `accept`; `"macosDefault.*": "error"` makes a file fully
   explicit.
4. **`pin`** (§6) writes the result of every rule into the file.
5. What the general data says is compiled as far as a `.keylayout` can express it; everything else is a loss of a
   kind of SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `layoutName` | layout name: `metadata.name` with `/`, `:` and control characters removed, cut to 128 characters; `metadata.id` if that is empty | `layoutName` | 5 |
| `bundleName` | bundle name = the layout name | `bundleName` | 5 |
| `bundleId` | `org.yakbd.keyboardlayout.` + slug of `metadata.id` (lower case, every run of characters outside `a`–`z`, `0`–`9` becomes `-`, leading and trailing `-` removed; `layout` if empty) | `bundleId` | 5 |
| `inputSourceId` | bundle id + `.` + slug of the layout name | `inputSourceId` | 5 |
| `language` | the language subtag of `metadata.id` | `language` | 5 |
| `localizedNames` | `metadata.localizedNames` | `localizedNames` | 5 |
| `bundleVersion` | the leading `a`, `a.b` or `a.b.c` digits of `metadata.version`; `1.0` if there are none | `bundleVersion` | 5 |
| `group` | `126` (Unicode) | `group` | 5 |
| `keyboardId` | −2 − (FNV-1a 32 of the UTF-8 input-source id, mod 32767): a negative number from −2 to −32768 | `id` | 5 |
| `maxout` | the most UTF-16 units of any output the layout writes (at least 1) | `maxout` | 5 |
| `hardwareRanges` | one `<layout first="0" last="255">` | `hardwareRanges` | 3 |
| `keyCode` | key code per position from `targets/macos-default-keycode.tsv` | `keys.<p>.keyCode` | 2 |
| `isoKeys` | the codes of `Backquote` and `IntlBackslash`: swapped (10 and 50) when the file binds `IntlBackslash`, otherwise `Backquote` on 50 and also on 10 | `keys.<p>.keyCode` of either | 2 |
| `standardKeys` | unbound standard keys get the outputs of the position table's `output` column | `standardKeys`, a binding | 3 |
| `commandMap` | a Command state no layer serves types as the same state without Command | `commandMap`, `modifiers.command` | 3 |
| `controlMap` | a Control state no layer serves types as the state without Control, ASCII letters turned into U+0001–U+001A | `controlMap`, a layer | 3 |
| `stateName` | state name of a dead key: its id if that is an XML NMTOKEN of at most 64 characters other than `none`, else `dk<n>` (n = 1-based place in ascending id order) | `deadKeys.<id>.state` | 4 |

No rule exists for `icon` (absent unless given) or `modifiers.command` (absent unless given).

## 2. Position table

The default table from position names to the target's key codes: `targets/macos-default-keycode.tsv` (SPEC §16, "Position tables").

## 3. Modifiers and layers

## 4. Dead keys

How the dead-key model of SPEC §10 and §14.2 becomes `.keylayout` actions and states (SPEC §14.2, "One model, every target").

## 5. Files and installation

## 6. Pinning

## 7. Carried, not compiled
