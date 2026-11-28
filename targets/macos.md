# Target `macos`: default rules and pinning (0.2 preview, normative)

How a `.kbl.json` file becomes a macOS keyboard layout, a `.keylayout` file in a `.bundle`, when `targets.macos`
(SPEC §16.4) is silent. Facts about macOS are cited by source: **TN2056** = Apple's archived technical note
"Installable Keyboard Layouts" (2009); **[MAC]** = measured on GitHub's macOS runners (`macos-15` 15.8.2 and
`macos-26` 26.7.2, arm64) by the layout check of `yakbd/yakbd-cli` (`tools/macos-check/`), with the workflow run
named; **[pub]** = another public source named in `CLEAN-ROOM.md` ("macOS sources"); **unmeasured** = this
specification's choice, with the macOS behaviour behind it not yet measured (§8 lists these for the verification
harness). Nothing here is taken from Apple's own layouts.

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16, D120): a fixed table and one-line rules, no heuristics. They
   are knowingly wrong for many layouts. A layout that needs anything else says it in its own `targets.macos`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported**, as an entry of kind `macosDefault.<rule>` (SPEC §17.1) listing what it
   decided (`detail.value`). Its policy defaults to `accept`; `"macosDefault.*": "error"` makes a file fully
   explicit.
4. **`pin`** (§6) writes the result of every rule into the file.
5. What the general data says is compiled as far as a `.keylayout` can express it (SPEC §14 is the meaning to
   keep); everything else is a loss of a kind of SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `layoutName` | layout name: `metadata.name` with `/`, `:` and control characters removed, cut to 128 characters; `metadata.id` if that is empty | `layoutName` | 5 |
| `bundleName` | bundle name = the layout name | `bundleName` | 5 |
| `bundleId` | `org.yakbd.keyboardlayout.` + slug of `metadata.id` | `bundleId` | 5 |
| `inputSourceId` | bundle id + `.` + slug of the layout name | `inputSourceId` | 5 |
| `language` | the language subtag of `metadata.id` | `language` | 5 |
| `localizedNames` | `metadata.localizedNames` | `localizedNames` | 5 |
| `bundleVersion` | the leading `a`, `a.b` or `a.b.c` digits of `metadata.version`; `1.0` if there are none | `bundleVersion` | 5 |
| `group` | `126` (Unicode) | `group` | 5 |
| `keyboardId` | −2 − (FNV-1a 32 of the UTF-8 input-source id, mod 32767): a number from −32768 to −2 | `id` | 5 |
| `maxout` | the longest single output in UTF-16 units: a terminator, a key or a `when` output (at least 1) | `maxout` | 5 |
| `hardwareRanges` | one `<layout first="0" last="255">` | `hardwareRanges` | 3 |
| `keyCode` | key code per position from `targets/macos-default-keycode.tsv` | `keys.<p>.keyCode` | 2 |
| `isoKeys` | when a layer binds `IntlBackslash`: `Backquote` on 10 and `IntlBackslash` on 50 (the table's two codes swapped) | `keys.<p>.keyCode` of either | 2 |
| `standardKeys` | standard keys the file leaves unbound get the table's `output` | `standardKeys`, a binding | 3 |
| `commandMap` | a state with Command that no layer serves types as the same state without Command | `commandMap`, a layer serving the state | 3 |
| `controlMap` | a state with Control that no layer serves types as the state without Control, the letters `A`–`Z`, `a`–`z` turned into U+0001–U+001A | `controlMap`, a layer serving the state | 3 |
| `stateName` | state name of a dead key: its id when that is an XML NMTOKEN of at most 64 characters other than `none`, else `dk<n>` (n = its 1-based place in ascending id order) | `deadKeys.<id>.state` | 4 |

**Slug** (rules `bundleId`, `inputSourceId`): the text in lower case, every run of characters outside `a`–`z`,
`0`–`9` replaced by one `-`, leading and trailing `-` removed, `layout` if nothing is left
(`pt-t-k0-abnt2` → `pt-t-k0-abnt2`, `Føroyskt (US)` → `f-royskt-us`).

No rule exists for `icon` and `modifiers.command`: absent unless given.

## 2. Position table

The default table from position names to the target's key codes: `targets/macos-default-keycode.tsv` (SPEC §16,
"Position tables"). Its key codes are the Mac column of Chromium's table of W3C code values, checked against the
`kVK_*` constants of Apple's `Events.h` **[pub]**; every row says so in its `source` column. Its `output` column holds
the standard output of the keys that have one (rule `standardKeys`, §3).

- **`keyCode`**: a position's key code is `keys.<p>.keyCode`; otherwise the table's code for the position's name;
  otherwise it has none. A position that has a binding and no key code is left out: when another target's position
  table (SPEC §16) has a row for it (`Break`, `SysRq`, `PrintScreen`, `ScrollLock`, `Pause`, `F21`–`F24`, the media,
  browser, mail and sleep keys, `Convert`, `NonConvert`, `KanaMode`), it is a key this table does not have,
  `macos.positionWithoutKey` (a warning; a file converted from a `.klc` file binds `Break`, the row MSKLC adds to
  every layout, D145); otherwise `macos.keyCodeMissing` (an error). A file that wants such a binding built pins a
  key code. Two positions with the same key code report `macos.keyCodeDuplicate`. Positions
  that operate Shift, Option, Control, Caps Lock or Command need no key element: macOS reads those keys itself.
- **`isoKeys`**: macOS delivers the key left of `1` and the key right of the left Shift with swapped codes from ISO
  keyboards: the key left of `1` (`Backquote`) as 10, the key next to the left Shift (`IntlBackslash`) as 50, while
  ANSI and JIS keyboards deliver `Backquote` as 50 and have no `IntlBackslash` **[pub]** (SDL's `scancodes_darwin.h`,
  Mozilla bug 1263302). The table has the codes of ANSI hardware (50, 10). So when any hardware layer binds
  `IntlBackslash` (the layout is drawn for ISO keyboards), the build gives `Backquote` code 10 and `IntlBackslash`
  code 50; otherwise the table's codes stay. A pin of `keys.<p>.keyCode` on either position turns the rule off for
  both. A layout without `IntlBackslash` therefore types its `Backquote` binding on the key next to the left Shift
  of an ISO Mac, and nothing on the key left of `1`: knowingly wrong, the price of one key map set (D121).
- The key codes of positions without a binding still matter for `standardKeys` (§3).

## 3. Modifiers and layers

**States.** A `.keylayout` selects a key map (a table from key code to output) per modifier combination through its
`<modifierMap>` (TN2056). The build uses five of TN2056's modifier words: `anyShift`, `anyOption`, `anyControl`,
`command`, `caps`. Their 32 combinations are the build's **states**, numbered by adding Shift 1, Option 2, Control 4,
Command 8, Caps Lock 16. Each state is turned into a kbl modifier state (SPEC §7.3): Shift → `shift`, Option →
left Alt (`alt`), Control → left Control (`ctrl`), Caps Lock → `caps`, Command → the component
`modifiers.command` if it is given (no component otherwise).

**Tables.** For each state *s* and each position P with a key code, the output is `resolve(P, s)` (SPEC §9.3). States
whose outputs are equal for every key code share one key map. Key maps are numbered in the order of the lowest
state that uses them (state 0, the base, is key map 0). Each `keyMapSelect` lists every state that uses its key map
as one `<modifier keys="…">` naming exactly the words of that state, without `?`; `defaultIndex` is 0. This writes
every combination explicitly, so the order of `keyMapSelect` elements (later ones win, TN2056) never matters.

- **Caps Lock** selects a whole key map (TN2056), and each Caps Lock state has its own key map filled per key from
  `resolve()`. So Caps Lock behaviour per key, `capsLockFallback`, an explicit nothing (`{"output": ""}`) and
  Caps Lock layers of any shape are all expressed exactly; there is no Caps Lock loss (D122).
- **`["other"]`** layers are compiled through `resolve()` like any other layer.
- **Sides.** TN2056 has words for the right-hand keys (`rightShift`, `rightOption`, `rightControl`), but macOS hands a
  layout the right-hand modifiers as the left-hand state: Right Shift selects the key map of `shift`, Right Option that
  of `option` **[MAC run 46117765009]** (posted events carrying the right-hand device bit, not real hardware; D130). A
  layout cannot tell the sides apart, so the build uses only the "any" words. A layer with
  `ctrlL`, `ctrlR`, `altL` or `altR` is built for either side: its sets are read with `ctrl` and `alt` instead, and
  the build reports `macos.sideModifierWidened`. Where two layers then serve the same state, the earlier layer
  wins.
- **Custom components.** A custom `held` component other than `modifiers.command` cannot be a macOS modifier:
  `macos.modifierUnmapped` for each layer whose modifier sets need it (the layer is left out). A custom `lock`:
  `macos.lockUnmapped`, likewise.
- **`hardwareRanges`**: the `<layouts>` element, each range one `<layout first last>` with the build's one
  modifier map and one key map set. Default one range, 0 to 255: every hardware keyboard type gets the same tables
  (TN2056: the first `<layout>` also serves types no range names) **[MAC run 46105185134]**.
- **Explicit nothing.** `{"output": ""}` and "nothing" both give no `<key>` element in that key map (TN2056: missing
  entries do nothing); they differ only in how `resolve()` reaches them.

A state is **served** when `resolve()` (SPEC §9.3) finds a layer for it directly: a modifier set of a hardware
layer other than `["other"]` matches it (SPEC §7.3, after side widening), or, when `settings.capsLockFallback` is
`true` and the state has Caps Lock, matches it with Caps Lock removed. A state with Command is served only through a
set that contains the component `modifiers.command`, so without that component no Command state is served. (In
example (f) Command + Caps Lock is not served, because the file sets `capsLockFallback` to `false`; rule
`commandMap` gives it the Caps Lock key map.) Unserved states with Command or Control are built by the two
rules below instead of `resolve()`, so that a missing layer or an `["other"]` layer does not leave shortcuts and
control characters without output.

**`commandMap`.** Every state with Command that is not served (without `modifiers.command`, none is). `withoutCommand`
(the default): the state's key map is that of the same state without Command (Command-Option-E types what Option-E
types; programs read shortcuts from it). `base`: the key map of state 0.

**`controlMap`.** Every state with Control that is not served; for a state with Command too, `commandMap` first
takes the state without Command, which this rule then builds if it is not served. `controlCharacters` (the default): the key
map of the same state without Control, where each output that is exactly one letter `A`–`Z` or `a`–`z` becomes the
control character U+0001–U+001A of that letter (Control-C types U+0003 for programs that read it, as Windows does,
`windows.ctrlLetterFallback`). `withoutControl`: that key map unchanged. `nothing`: no output.

**`standardKeys`** (default `true`). In every key map, a key code of a table row with an `output` (Return, Tab,
Delete, Escape, Clear, the number-pad keys, Help, Home, End, Page Up, Page Down, Forward Delete, the arrows, the
function keys) whose position the key map gives nothing (not an explicit nothing) gets that output, whether or not
the file has the position. A layout file that never mentions them still has working arrows and Return. The values
are those of an openly licensed generated layout **[pub]** (Kiimo). `false`: no such outputs.

**Settings.** `numLock` positions always type their binding: macOS has no Num Lock, the key at its place is Clear
(`macos.numLockIgnored`). `settings.capsLockOffBy` `shift` and `settings.bidiMarksOnShiftBackspace` have no
`.keylayout` form: `macos.settingNotCompiled`.

## 4. Dead keys

How the dead-key model of SPEC §10 and §14.2 becomes `.keylayout` actions and states (SPEC §14.2, "One model, every
target"). A `.keylayout` has one state machine: a current state (`none` at first), `<action>` elements whose
`<when state>` children say what a key does in each state (an output, a next state, or both), and `<terminators>`
that say what is emitted when a key has no `when` for the current state, before the machine returns to `none` and
the key acts as in `none` (TN2056, its dead-key example).

| model (SPEC §10, §14.2) | `.keylayout` |
|---|---|
| dead key D | a state named by rule `stateName` |
| a binding that is dead key D (any key map) | the key's `action` has `<when state="none" next="D"/>` |
| an entry of D with base text B, result text R | every key whose output in a key map is exactly B gets an action with `<when state="none" output="B"/>` and `<when state="D" output="R"/>` |
| result `{"deadKey": F}` (chained, any depth, cycles) | `<when state="D" next="F"/>` |
| base `{"deadKey": E}` | the `when state="D"` in the action of E's key |
| entries in order, first match wins | only the first entry per (D, base) is written; later ones are unreachable (`general.duplicateDeadKeyEntry` already says so) |
| `spacing` with `noMatch` `emitBoth` | `<terminators><when state="D" output="spacing"/>` |
| `noMatch` `emitText` | no terminator for D: the machine returns to `none` and the key types its own output (TN2056) |
| `noMatch` `emitSpacing` | terminator `spacing`, and every key that has an output in some key map gets `<when state="D" output="spacing"/>` in its action |
| `noMatch` `emitNothing` | no terminator, and every such key gets `<when state="D" output=""/>`: it types nothing and the machine returns to `none` **[MAC run 46126097229]** (D129) |
| dead key E pressed while D is pending, D has no entry for E | E's action gets `<when state="D" …>` with D's `noMatch` applied to T = `spacing(E)` (`emitBoth`: output `spacing(D)` + `spacing(E)`), and E does **not** become pending, as §14.2 says; without it macOS would emit D's terminator and make E pending (TN2056) |
| the backspace action (U+0008) | the Delete key's output U+0008 is input like any other; `noMatch` applies to it |

- An entry's base matches the text a key event produced (§14.2), so one action serves every key code and every key
  map whose output is that text; action ids are the writer's choice. A base that no key produces is written
  nowhere.
- The rows that give keys extra `when` elements for `noMatch` (`emitSpacing`, `emitNothing`, a dead key pressed
  while another is pending) report one `macos.deadKeyNoMatchExpanded` per build, the dead keys in `detail`.
- Two dead keys with the same state name, or a pinned state name `none` (the base state): `macos.stateNameDuplicate`.
- **Empty outputs.** Every empty output of a `when` (`emitNothing`, an empty spacing or result) is written as
  `output=""`. A `when` with only `next="none"`, or with only a `next` that names a state no `when` or terminator
  defines, makes the system reject the whole layout: it is never listed **[MAC run 46126097229]** (D129).
- **A key with no output while a state is pending** (a key code without a key in that key map, as a position without
  a binding or an explicit nothing gives): macOS emits D's terminator and returns to `none` **[MAC run 46126097229]**,
  while the model leaves D pending (§14.2, "nothing"). The build writes nothing for such a key and so differs from
  the model there (D130); it reports this once per build as `macos.deadKeyEndedByEmptyKey` (a warning, D131) when
  a dead key is reached and some key code of the position table (not a modifier) or a pinned code has no output in
  some key map. The form `<when state="D" next="D"/>` for such keys keeps D pending for a dead key without a
  terminator **[MAC run 46129926577]**; with a terminator it is unmeasured, and the build does not write it (§8 item 8).
- **Normalisation** (SPEC §5): macOS does not normalise while typing, so a build does what a Windows build does
  (`targets/windows.md` §6): with `normalization` `enabled` every output is NFC-normalised at build time, each changed
  output reports `general.outputNormalized`, and the build reports `general.normalizationNotApplied` once.
- **Markers and transforms** are not compiled: `macos.markerNotCompiled` (the output is built without the marker),
  `macos.transformNotCompiled` per group.

## 5. Files and installation

**The `.keylayout` file** (TN2056 for every element). `<?xml version="1.1" encoding="UTF-8"?>` (the C0 controls of
Return, Tab, the arrows and Control-letter outputs are numeric character references, which XML 1.0 forbids and XML
1.1 allows; the file of **[MAC run 46105185134]** is XML 1.1), then
`<!DOCTYPE keyboard SYSTEM "file://localhost/System/Library/DTDs/KeyboardLayout.dtd">`, then
`<keyboard group id name maxout>` with `<layouts>`, one `<modifierMap>`, one `<keyMapSet>`, `<actions>` and
`<terminators>` when there are dead keys. Outputs are UTF-16 strings of at least one unit; a character outside the
BMP is one numeric character reference; `<`, `&`, `"` and every C0 control are written as numeric character
references (TN2056). U+0000 and CodeUnits that are not well-formed UTF-16 cannot be written:
`macos.outputUnencodable`. An output longer than a pinned `maxout`: `macos.outputBeyondMaxout`.

- **`group`** 126 and a negative **`id`** mark a Unicode layout (TN2056; the system renumbers on a clash). Rule
  `keyboardId` hashes the input-source id with FNV-1a (32-bit, offset basis 2166136261, prime 16777619, over the
  UTF-8 bytes) so that the same file always gets the same id.
- **`maxout`** bounds the outputs of the file (TN2056). One key press can emit a terminator and then the key's own
  output (TN2056's dead-key example), but macOS applies `maxout` to each output separately: with `maxout` 2, a
  terminator of one unit and a key output of two units are both typed in one press **[MAC runs 46119172899,
  46126097229]** (D128). So the rule takes the longest single output (a terminator, a key or a `when` output), and
  `macos.outputBeyondMaxout` is reported when one output is longer than a pinned `maxout`.

**The bundle** (TN2056, "Localized XML Keyboard Bundle"; the `Info.plist` keys **[pub]** Kiimo, **[MAC run
46105185134]**):

```
<bundleName>.bundle/Contents/Info.plist
<bundleName>.bundle/Contents/Resources/<layoutName>.keylayout
<bundleName>.bundle/Contents/Resources/<layoutName>.icns              (only with icon)
<bundleName>.bundle/Contents/Resources/<tag>.lproj/InfoPlist.strings   (one per localizedNames entry)
```

`Info.plist` (an XML property list) holds `CFBundleIdentifier` = `bundleId`, `CFBundleName` = `bundleName`,
`CFBundleShortVersionString` and `CFBundleVersion` = `bundleVersion`, and `KLInfo_<layoutName>`, a dictionary
with `TISInputSourceID` = `inputSourceId`, `TISIntendedLanguage` = `language`, and `TISIconIsTemplate` =
`icon.template` when there is an icon. Each `InfoPlist.strings` holds the one line
`"<layoutName>" = "<localised name>";` (TN2056), with `"` and `\` escaped by `\`; the file is written in UTF-8. Both a
hyphenated tag folder (`en-US.lproj`) and a UTF-8 `InfoPlist.strings` with letters outside ASCII are used for the
shown name **[MAC run 46117765009]** (session language `en-US`; D130). The `.icns` file is `icon.icns` decoded.

**Installation** (TN2056 for the folders):

- `~/Library/Keyboard Layouts/` for one user, `/Library/Keyboard Layouts/` for every user of the Mac (an
  administrator copies it there). The bundle is copied as it is.
- **Without signing out** **[MAC runs 46104797718, 46105185134]**, on both runner versions and both folders: copy
  the bundle; register it (`TISRegisterInputSource` on the bundle's URL); add an entry to the
  `AppleEnabledInputSources` list of the `com.apple.HIToolbox` preferences (`InputSourceKind` `Keyboard Layout`,
  `KeyboardLayout ID` = the `.keylayout` id, `KeyboardLayout Name` = the layout name); then a **new** process
  selects it (`TISSelectInputSource`) and it types. In this order: an entry written before registration races
  (run 46104372309). `TISEnableInputSource` alone did not enable a bundle in `~/Library` (runs 46102612485,
  46102900903). TN2056's "log out and in again" was not needed for this scripted path.
- **By hand** the user copies the bundle into one of the folders and adds the layout in System Settings ›
  Keyboard › Text Input (Edit, +). That path is **unmeasured**; a user who does not see the layout signs out and
  in again, as TN2056 says.
- **Unsigned.** A layout bundle holds no code. An unsigned bundle carrying a `com.apple.quarantine` attribute was
  listed, compiled, selected and typed; `spctl --assess` rejects it ("no usable signature") but nothing enforced
  that **[MAC run 46105185134]** (an attribute set by hand, not a real download). "Open Anyway" is not needed.

**Release form** (owner, 2026-11-28; D126): a zip file holding the bundle folder at its root and a `README` that says
where to copy the bundle, how to select the layout and that the layout is unsigned. An installer package (`.pkg`,
which needs Apple's `pkgbuild` and is subject to Gatekeeper as an installer) may come later.

## 6. Pinning

`yakbd pin` (target `macos`) writes into `targets.macos` every value a rule decided: `layoutName`, `bundleName`,
`bundleId`, `inputSourceId`, `language`, `localizedNames` (when any), `bundleVersion`, `group`, `id`, `maxout`,
`hardwareRanges`, `keys.<p>.keyCode` for every position in the layout (adding to `positions` every table position
the layout contains through `standardKeys` that the file lacks), `standardKeys`, `commandMap`, `controlMap` (each
as decided) and `deadKeys.<id>.state`. It never changes other general data. After pinning, a build reports no
`macosDefault.*` entry and gives the same layout.

## 7. Carried, not compiled

Nothing: every member of `targets.macos` is compiled. Touch layouts, `displays`, `tests` and `extensions` are not
part of a `.keylayout` (`general.touchDropped`, `general.displayDropped`, `general.testsDropped`,
`general.extensionDropped`); `metadata` beyond the names and the version reports `general.metadataDropped`. A file
without hardware layers fails with `macos.noHardwareLayers`.

## 8. Measured and unmeasured (informative)

The cases of the macOS verification harness (`yakbd/yakbd-cli`, `tools/macos-check/`), with their results:

1. A key with no output pressed while a dead-key state is pending: macOS emits the terminator and returns to the
   base state, unlike the model (§4) **[MAC run 46126097229]**; reported as `macos.deadKeyEndedByEmptyKey` (D131).
2. `<when state="D" next="none"/>` with no output: the layout is rejected (not listed); `output=""` works (§4)
   **[MAC runs 46117765009, 46119172899, 46126097229]**.
3. Right-hand modifier words: right-hand keys reach the layout as the left-hand state (§3) **[MAC run
   46117765009]**, measured with posted events, not real hardware.
4. A localised name from a hyphenated `.lproj` folder and from a UTF-8 `InfoPlist.strings`: both used (§5) **[MAC
   run 46117765009]**.
5. Adding the layout by hand in System Settings without signing out: **unmeasured** (the UI path is not scripted).
6. The ISO swap of codes 10 and 50: **unmeasured**; it needs real ISO hardware (a runner types by key code).
7. `maxout` with a dead key followed by a multi-unit key: applied to each output, not to the terminator and the
   output together (§5) **[MAC runs 46119172899, 46126097229]**.
8. A key whose action keeps a pending state, `<when state="D" next="D"/>`, as the way to compile item 1 as the
   model says: for a dead key without a terminator (`noMatch` `emitText`) D stays pending and the next key gets D's
   result **[MAC run 46129926577]**, hand-written case `twin-pending-next`; for a dead key with a terminator
   (`emitBoth`, the situation of item 1): **unmeasured**. The build does not write the form.

A measured result is recorded here with its run and, where it changes a rule, in `DECISIONS.md`.
