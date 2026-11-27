# Target `windows`: default rules and pinning (0.1 draft, normative)

How a `.kbl.json` file becomes a Windows keyboard-layout DLL when `targets.windows` (SPEC §16.1) is silent. Facts
about Windows are cited from the reference specification, revision 10: "dll §4.2" = `spec/dll-format/README.md` §4.2,
"wb" = `windows-behaviour`, "klc" = `klc-format`, "inst" = `installation`.

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16): a fixed table and one-line rules, no heuristics, no
   per-language or per-script cases. They are knowingly wrong for many layouts. A layout that needs anything else
   says it in its own `targets.windows`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported**, as an entry of kind `windowsDefault.<rule>` (SPEC §17.1) listing the items
   it decided. Its policy defaults to `accept`; `"onLoss": {"kinds": {"windowsDefault.*": "error"}}` makes a file
   fully explicit.
4. **`pin`** (§10) writes the result of every rule into the file, as a starting point for editing.
5. What the general data says is compiled as far as Windows can express it; everything else is a loss of a kind
   listed in SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `dllName` | file name | `dllName` | 2 |
| `builds` | which DLL builds | `builds` | 2 |
| `strings` | strings 1000, 1100, 1200 | `strings` | 2 |
| `versionInfo` | version resource | `versionInfo` | 2 |
| `altGr`, `shiftLock`, `lrmRlm` | locale flags | `localeFlags.*` | 3 |
| `kbdVersion` | version word | `kbdVersion` | 3 |
| `keyboardType` | `dwType`, `dwSubType` | `keyboardType` | 3 |
| `modifierBits` | `VK_TO_BIT` | `modifiers.bits` | 4 |
| `modNumber` | `ModNumber`, columns | `modifiers.modNumber` | 4 |
| `vk` | VK per position, standard keys | `keys.<p>.vk`, `positions`, `useTableA` | 5 |
| `scanCodeFlags` | flags per scan code | `keys.<p>.scanCodeFlags` | 5 |
| `scanCodeTableSize` | `bMaxVSCtoVK` | `scanCodeTableSize` | 5 |
| `attributes` | `CAPLOK`, `SGCAPS`, `CAPLOKALTGR`, `KANALOK` | `keys.<p>.attributes` | 6 |
| `tables` | table widths and row order | `tables` | 7 |
| `deadCharacter` | dead character per dead key | `deadKeys.<id>.character` | 8 |
| `registration` | `Layout Text`, locale and custom-language values | `registration.*` | 9 |

No rule exists for `registration.langId` (Q2), `registration.klid` and `registration.layoutId` (allocated by the
installer on the machine, `targets/windows-install.md` §5, D47), `nls`, `dispatcher` and `extraRows` (absent unless
given). The installer's rules (`productCode`, `enableForUser`, `enableForSignInAndNewUsers`, `uninstallEntry`) are in
`targets/windows-install.md` §1.

## 2. Files and strings

- **`dllName`**: `metadata.id` in lower case with every character outside `a`–`z`, `0`–`9` removed, prefixed with
  `k` if empty or starting with a digit, cut to 8 characters. (`pt-t-k0-abnt2` → `pttk0abn`.) The installer never
  overwrites a foreign file of that name (inst §2.3).
- **`builds`**: every build the tool can make, out of `["x86", "x64", "wow64", "arm64x"]` (D39). One installer per
  platform carries all builds and installs the ones the machine needs (D18, `targets/windows-install.md`). Builds the
  tool cannot make yet are skipped and listed in the `windowsDefault.builds` entry (`detail.skipped`); only a build
  the **file lists** in `builds` and the tool cannot make reports `windows.architectureUnsupported` (error). `x64` or
  `arm64x` without `wow64` reports `windows.wow64Missing` (inst §2.1). What each build is and where it goes: §2.1.
- **`strings`** (dll §1.6, written into every build):
  - `layoutName` = `{ <langId>: metadata.name }`, where `<langId>` is `registration.langId`; without a LANGID the
    build fails with `windows.langIdMissing`. `metadata.localizedNames` are not used (no LANGID table, Q2):
    `windows.stringLanguageUnmapped` if present.
  - `languageName` = `{ <langId>: the language subtag of metadata.id }` (`pt`).
  - `localeName` = `metadata.id` up to its first singleton extension (`-t-`, `-u-`, `-x-`, …): `pt-t-k0-abnt2` → `pt`.
- **`versionInfo`**: `fileVersion` = `productVersion` = the first three dot-separated numbers of `metadata.version`
  followed by `.0` (missing numbers are 0; a part above 65535 or not a number reports
  `windows.versionUnrepresentable` and is 0); `companyName` = `metadata.organization`, `legalCopyright` =
  `metadata.copyright` (absent when absent; never another vendor's name, dll §1.6); `fileDescription` =
  `metadata.name`. Product name and the tool's version are the tool's own.

### 2.1 The builds

Every build is one DLL with the same file name, strings, version resource and tables (inst §2.1); only the container
and the pointer width differ (dll §1, §2).

| build | file | goes to | serves | source |
|---|---|---|---|---|
| `x86` | Machine 014C, PE32, 4-byte pointers | `System32` of 32-bit Windows | every process there | inst §2.1, dll §2 |
| `x64` | Machine 8664, PE32+ | `System32` of x64 Windows | 64-bit processes | inst §2.1 |
| `wow64` | Machine 014C, PE32, 8-byte pointer slots (dll §1.4, §2), relocation rule W-1 (§12) | `SysWOW64` of x64 **and** of ARM64 Windows (the same file) | 32-bit (x86) processes, also on ARM64 | inst §2.1, §2.2, §2.4 **[VM]** |
| `arm64x` | Machine AA64, PE32+, with ARM64X metadata (a load configuration with CHPE metadata and ARM64X entries) so that an x64 process sees an x64 view of the same file (dll §1.7) | `System32` of ARM64 Windows | native ARM64 processes **and** emulated x64 processes (which see `System32` unredirected) | inst §2.2, §2.4 **[VM]**, dll §1.7 |

- **No other build exists in the format.** A plain ARM64 file (Machine AA64 without ARM64X metadata) is not enough:
  emulated x64 processes that load the layout themselves get error 193 (inst §2.4 **[VM]**). A tool MAY write one as
  a test control, but never as a build of a file or into an installer (D45). There is no ARM32 build (`SysArm32`:
  inst §2.4) and no IA64 build.
- **When a tool may make `arm64x`** (D44): only when its ARM64X writer has passed the test of dll §11 item 9 and the
  table of inst §2.4: a file written by that writer, installed with the `wow64` build, loads and types in a native
  ARM64, an emulated x64 and an x86 process, after sign-in and with `ctfmon.exe` running. Until a tool has a passing
  result it cannot make `arm64x`, so rule `builds` skips it (D39) and a file listing it fails with
  `windows.architectureUnsupported`. The result is recorded **[VM]** in `targets/windows-vm-tests.md`; once it
  exists, `arm64x` is in the default build set with no change to any file.
- **Gate passed for yakbd's writer** (VM-6 **[VM]**, yakbd VM run 2, 2026-11-22; D66): the shape the tool ships,
  `arm64x-x64` (an ARM64X file whose x64 view exports a plain x64 descriptor function, with its own load
  configuration; tool `docs/arm64x.md` §5), was in the user's list and in the session after sign-in, with
  `ctfmon.exe` running, and typed through `ToUnicodeEx` and through real input in native ARM64, emulated x64 and x86
  processes. **`arm64x` is therefore in the default build set of yakbd** (rule `builds`, D39). A tool with another
  ARM64X writer, or yakbd writing another shape, passes the gate again for that writer or shape.
- **Asking for or leaving out ARM64X, per file**: the default (no `builds`) gives every build the tool can make,
  `arm64x` included once the tool can make it. A file that must have ARM64X lists it
  (`["x86", "x64", "wow64", "arm64x"]`): a tool that cannot make it fails instead of producing an installer without
  ARM64 support. A file that must not have ARM64X lists the others (`["x86", "x64", "wow64"]`); its installer then
  refuses to install on ARM64 Windows (`targets/windows-install.md` §3). There is no separate switch (D45).

## 3. Flags

- **`altGr`**: `true` if any modifier set of a hardware layer contains `altR`, else `false` (`KLLF_ALTGR`, dll §4.8,
  wb §3.3).
- **`shiftLock`**: `settings.capsLockOffBy == "shift"` (`KLLF_SHIFTLOCK`, wb §3.4).
- **`lrmRlm`**: `settings.bidiMarksOnShiftBackspace` (`KLLF_LRM_RLM`, wb §11). With the flag, Windows **replaces
  every Shift column of Backspace** by the marks: Backspace with the left Shift key down gives U+200E whatever else
  is held (Ctrl, Alt, Caps Lock, Kana), with only the right Shift down U+200F, and a pending dead key stays pending
  (wb §11). The left-Shift case, including Shift's own column holding U+0008 and Kana + Shift having no character,
  was observed **[VM]** in yakbd VM run 1, 2026-11-22; the right-Shift case (U+200F with only the right Shift key, U+200E with both) **[VM]** in yakbd VM run 2, 2026-11-22. If any layer
  binds Backspace in a state with Shift to something other than the marks: `windows.bidiMarksConflict` (the marks
  win).
- **`kbdVersion`**: `1` (`KBD_VERSION`; ligatures need it, dll §4.7). A pinned `0` with multi-unit outputs reports
  `windows.pinOverridesModel`.
- **`keyboardType`**: `{type: 0, subType: 0}` (dll §3, §6.2).

## 4. Modifiers and columns (dll §4.1, wb §4)

**`modifierBits`**: `SHIFT`→1 (`shift`), `CONTROL`→2 (`ctrl`), `MENU`→4 (`alt`), then each custom modifier of
`kind: held`, in ascending name order, gets the next of the bits 8, 10, 20, 80 (hex). Its VK is
`keys.<p>.vk` of its first position; there is no default (the VK table of §5 gives Shift/Ctrl/Alt VKs only), so
without a pin the build reports `windows.modifierUnmapped`. A fifth custom modifier: `windows.modifierUnmapped`.
A custom `lock` is the Kana lock only if pinned as `modifiers.kanaLockComponent`; otherwise `windows.lockUnmapped`.

**State of a modifier set** (used by `modNumber`): the OR of 1 for `shift`; 2 for `ctrl`, `ctrlL`, `ctrlR`; 4 for
`alt`, `altL`; for `altR`: 6 when `altGr` is true, 4 otherwise; the custom modifier's bit; `caps` and lock components
add nothing (they are handled by §6). A set with `ctrlL`, `ctrlR` or `altL`, or `altR` without `altGr`, reports
`windows.sideModifierWidened`. A set whose state has 4 without 2 reports `windows.altOnlyLayer` (wb §4.2).

**`modNumber`**: the columns are the distinct states of all modifier sets of all hardware layers except `["other"]`
and except sets containing `caps` or a lock, in ascending order; column *i* is the *i*-th. `wMaxModBits` = the
highest such state. `ModNumber[s]` = the column of `s`, or `SHFT_INVALID` (null in the pin). If an `["other"]`
layer exists, it gets one more column, and every `s` ≤ `wMaxModBits` that is still invalid and has not 4 without 2
gets that column. More than 15 columns: `windows.tooManyColumns`.

**Representative state of a column**: the lowest `s` with `ModNumber[s]` = column, turned into a modifier state
(SPEC §7.3): bit 1 → Shift; bits 2+4 with `altGr` → right Alt alone; otherwise bit 2 → left Control, bit 4 → left
Alt; a custom bit → that component active. The column's cell for position P is `resolve(P, representative)`
(SPEC §9.3). If another modifier set mapped to the same state resolves differently for some P (for example a
`ctrl alt` layer next to an `altR` layer), the representative wins and the build reports `windows.altGrConflict`
(state 6) or `windows.sideModifierWidened` (others).

## 5. Scan codes and virtual keys (dll §4.5, §4.6)

**`vk`**: with `useTableA: false` (D54) Table A is not used at all: a position's VK is its `keys.<p>.vk` or none,
and no Table A row is added; the rest of this paragraph then applies without Table A. Otherwise:
a position's VK is `keys.<p>.vk`; otherwise the VK of Table A below for the position's name (matched by name, or by scan code when the file's id is not a Table A name); otherwise it
has none. A position that has a binding, is named in `customModifiers` or in `tables`, and has no VK reports
`windows.vkMissing`. The scan-code tables of the DLL hold every position of the file that has a `scanCode` and a VK,
**plus** every row of Table A whose scan code no position of the file uses, whatever VKs the file's positions have
(D86, replacing the explicit-remap exception of D35/D37). So Escape, F1 and the arrows work in a file that does not
mention them, and a file that puts `W` on scan code 10 without naming scan code 11 gets `W` on both, as Windows and
MSKLC do (a key that types nothing is worse than a second `W`; pin `vk: "_none_"` on 11 to remove it). The added rows
are reported in `windowsDefault.vk`. The same VK on two positions reports `windows.vkDuplicate`, except between a
position of the file and a Table A row added this way (D86), except where Table A itself
gives both positions that VK (`RETURN` on Enter and NumpadEnter, the number-pad keys and their navigation twins,
`SNAPSHOT` on SysRq and PrintScreen) and both have it (D38), and except in a file with `useTableA: false`, whose VKs are all explicit (D59). A pinned `vk: "_none_"` (VK `FF`) writes `FF` with the position's `scanCodeFlags` into the scan-code table (an unprefixed code) or, without flags, no entry; such a position has no row and is never part of `windows.vkDuplicate` (D59). Windows has **one character row per VK**: positions sharing a VK share the row of the one with the lowest
scan code, and if the others' cells differ the build reports `windows.sharedVkRowConflict`. A position without `scanCode` but with bindings reports `windows.scanCodeMissing`; an `E1` code other
than `E11D`, `windows.scanCodeUnsupported`.

Table A is the fixed default table of this target: **`targets/windows-default-vk.tsv`** (position, scan code, VK,
flags, source), 135 rows. It is the one table for every tool; the tool generates its own table from that file (or
checks against it) and never adds rows of its own. Its rows come from two kinds of source (D29): **[PUB]** public
Microsoft documentation, the scan-code table of "About Keyboard Input" joined by key with "Virtual-Key Codes"
(which names the US ANSI or ISO key of each `VK_OEM_*`), cited by URL in the file, facts only; and **wb** the
standard uses the reference specification measured (wb §3.1, §3.2; dll §4.5, §4.6). Positions without a row,
because no public source names their VK, have no default: `IntlRo`, `IntlYen`, `NumpadComma`, `NumpadEqual`,
`KanaMode`, `Convert`, `NonConvert` and the `Lang` keys; a file that binds them gives `keys.<p>.vk`.

Summary of Table A (the file is normative):

| positions | VK |
|---|---|
| KeyA … KeyZ, Digit0 … Digit9 | A … Z, 0 … 9 |
| Escape, Backspace, Tab, Enter, Space, CapsLock | ESCAPE, BACK, TAB, RETURN, SPACE, CAPITAL |
| Minus, Equal, BracketLeft, BracketRight, Backslash, Semicolon, Quote, Backquote, Comma, Period, Slash, IntlBackslash | OEM_MINUS, OEM_PLUS, OEM_4, OEM_6, OEM_5, OEM_1, OEM_7, OEM_3, OEM_COMMA, OEM_PERIOD, OEM_2, OEM_102 |
| ShiftLeft, ShiftRight, ControlLeft, ControlRight, AltLeft, AltRight, MetaLeft, MetaRight, ContextMenu | LSHIFT, RSHIFT, LCONTROL, RCONTROL, LMENU, RMENU, LWIN, RWIN, APPS |
| F1 … F24, PrintScreen, SysRq (54), ScrollLock, Pause (E11D), Break (E046), NumLock | F1 … F24, SNAPSHOT, SNAPSHOT, SCROLL, PAUSE, CANCEL, NUMLOCK |
| Numpad7 8 9 4 5 6 1 2 3 0, NumpadDecimal | HOME UP PRIOR LEFT CLEAR RIGHT END DOWN NEXT INSERT, DELETE (wb §3.2) |
| NumpadMultiply, NumpadDivide, NumpadSubtract, NumpadAdd, NumpadEnter | MULTIPLY, DIVIDE, SUBTRACT, ADD, RETURN |
| Insert, Delete, Home, End, PageUp, PageDown, arrows | INSERT, DELETE, HOME, END, PRIOR, NEXT, LEFT/UP/RIGHT/DOWN |
| media and browser keys (E010 … E06C), Sleep (E05F) | MEDIA_*, VOLUME_*, BROWSER_*, LAUNCH_MAIL, SLEEP |

Scan codes of Table A's positions are those of its `scanCode` column (the same as SPEC Appendix A). Numpad0–9 and NumpadDecimal are also `numLock`
positions by default (their `positions.<p>.numLock` default is `true` when they come from Table A).

**`scanCodeFlags`** (the `flags` column of Table A, and for positions outside it the same rule): `ext` for every `E0` scan code and for 36 and 45; `multiVk` for 37, 45 and 46; `numpad` and
`special` for 47, 48, 49, 4B, 4C, 4D, 4F, 50, 51, 52, 53; nothing else (wb §3.1; dll §4.5). The flags `unicode`,
`injectedVk`, `mappedVk`, `break` are never set by default.

**`scanCodeTableSize`**: `7F`, or one more than the highest unprefixed scan code if that is higher (dll §4.5).

**Number pad** (wb §3.2): the bindings of a `numLock` position are compiled into the row of the VK that Num Lock
turns its VK into (HOME→NUMPAD7, UP→NUMPAD8, PRIOR→NUMPAD9, LEFT→NUMPAD4, CLEAR→NUMPAD5, RIGHT→NUMPAD6,
END→NUMPAD1, DOWN→NUMPAD2, NEXT→NUMPAD3, INSERT→NUMPAD0, DELETE→DECIMAL); its own VK gets no row. Bindings in
layers with Shift report `windows.numpadShiftUnreachable`.

## 6. Cells and Caps Lock (dll §4.2, §4.7, wb §5, §9)

**A binding becomes cells** in its column:

| binding (after `{"key"}` is replaced by the Key's `output` or `deadKey`) | cell |
|---|---|
| Text or CodeUnits of one unit, not F000–F002 | that unit |
| one unit F001 or F002 | `WCH_LGTR` and a 1-unit ligature (ligature units are literal, wb §6) |
| one unit F000 | `windows.outputUnencodable` |
| 2 to 125 units | `WCH_LGTR` + a ligature entry with the **column index** (wb §9.1); a unit F000 inside reports `windows.outputUnencodable`; more than 16 units `windows.ligatureTruncatedTyped` |
| more than 125 units | `windows.ligatureTooLong` |
| `{"deadKey": id}` | `WCH_DEAD`, and the dead character in the same column of the FF row that follows |
| MarkedText with markers | the text without the markers; `windows.markerNotCompiled` |
| MarkedText with `{"variable"}` | the variable's value with `\u{…}` decoded; markers dropped as above |
| nothing (no binding, or the explicit nothing `{"output": ""}`) | `WCH_NONE` |

When `settings.normalization` is `enabled`, every output is NFC-normalised (Unicode 18.0.0, D71) before the rows above
are applied, each output as a whole: key outputs after resolution (bindings, `{"key"}`, variable values, markers
removed), dead-key results and `spacing` texts, and dead-key bases, so that a base matches the normalised output of
the key that types it (D72). CodeUnits values and the Windows data of `targets.windows` (`extraRows` cells, dead
characters) are taken as written. A changed output is `general.outputNormalized`; NFC can make an output longer or
shorter (U+0344 becomes two units, `a` + U+0301 one), and the encoding rows and limits above then apply to the
normalised text with their own kinds. Each build reports `general.normalizationNotApplied` once: Windows does not
normalise across keystrokes (D73). With `disabled`, outputs are exact code points.

**`attributes`** for position P, with `out(s)` = the cell of the column of state `s` and `capsOut(s)` =
`resolve(P, s with caps)` (SPEC §9.3). First, **in every column**: where `capsOut(s)` is nothing and `out(s)` is not,
that is not a difference to express but `windows.capsUnmatched` (Windows types `out(s)`; one entry per build listing
the positions, D40), and `capsOut(s)` is taken as `out(s)` for the rules below. This is the common case of CLDR
imports, whose Caps Lock layers (with `capsLockFallback: false`) stop at Shift. An **explicit nothing**
(`{"output": ""}`, SPEC §9.2) is not "nothing" in this sense but a real Caps Lock output: it makes the key `SGCAPS`
by rule 1 with `WCH_NONE` in the Caps Lock row, and Windows then types nothing (VM-7 **[VM]**, yakbd VM run 2; D64).

1. `(capsOut(0), capsOut(1))` equals `(out(0), out(1))`: no Caps attribute; equals `(out(1), out(0))` and differs
   from it: `CAPLOK`; otherwise `SGCAPS` with the Caps Lock row `[capsOut(0), capsOut(1)]` (one unit each, else
   `windows.sgcapsLigature`).
2. If column 6 exists: `(capsOut(6), capsOut(7))` equals `(out(6), out(7))`: nothing; equals `(out(7), out(6))`:
   `CAPLOKALTGR`; otherwise `windows.capsNotExpressible`.
3. For every other column state `s`: `capsOut(s)` must equal `out(s)`, else `windows.capsNotExpressible`.
   A layer whose modifier sets all contain `caps` and whose state without `caps` has no column (for example
   `caps altR` without an `altR` layer) reports `windows.capsNotExpressible` for each of its bindings.
4. A key that is `SGCAPS` and has a dead key in column 0 or 1 is written in the one shape Windows accepts (the Caps
   Lock row doubles as the dead-key row) only if the Caps Lock output of that column is the same dead key. A key that
   is `SGCAPS` with a dead key **only in its Caps Lock row** (columns 0 and 1 of the main row are not dead) is written
   as main row, Caps Lock row, then an FF row with the dead characters of the Caps Lock row's dead columns (writer
   rule W-2, VM-4 **[VM]**). Any other combination of SGCAPS and dead keys: `windows.sgcapsDeadKey` (dll §4.2).
   Only columns 0 and 1 have Caps Lock forms: with Caps Lock and AltGr Windows types the main row (VM-8 **[VM]**,
   D67), so Caps Lock layers of other states are compared by rules 2 and 3, never written into a Caps Lock row.
5. `KANALOK`: if `modifiers.kanaLockComponent` is pinned: `resolve(P, {lock})` (with the lock's fallback, SPEC
   §9.3) equal to the Kana column's cell and different from `out(0)` → `KANALOK`; equal to `out(0)` → nothing;
   otherwise `windows.kanaLockNotExpressible`.
6. `GRPSELTAP` is never set by default.

A pinned `attributes` value wins; where it contradicts these results: `windows.pinOverridesModel`.

**Ctrl+letter**: Windows types U+0001–U+001A for Ctrl+A…Z when the cell is empty (wb §5):
`windows.ctrlLetterFallback` (accept). **Frame keys**: a position with VK `RETURN`, `BACK`, `TAB` or `ESCAPE` without a
base cell reports `windows.frameKeyWithoutText`; the build adds nothing.

## 7. Tables (dll §4.2)

**`tables`**: a row's width is one more than its highest non-empty column. Rows of equal width form one table;
tables are in ascending width. Inside a table rows are ordered by scan code (unprefixed, then `E0`, then `E1`, each
ascending; number-pad rows at their position's scan code), followed by `extraRows` of that width in file order. A
row's FF row (dead characters) and SGCAPS row follow it directly. The terminators, `cbSize` = 2 + 2n and the other
writer rules are the DLL writer's (dll §4.2, §9).

A pinned `tables` is built **as listed** (D59): each entry is one table, in the listed order, with its rows in the
listed order and its stated width, even when two entries have the same width or the widths are not ascending
(Windows' own files group rows that way, dll §8); a listed row that gives nothing (an extra row of `null` cells) is
kept. Rows the pin does not list are added by the rule above after the listed tables.

## 8. Dead keys (dll §4.3, wb §6, §8)

**`deadCharacter`**: the dead character of a dead key is `deadKeys.<id>.character`, else its `spacing`. It must be one
unit (`windows.deadCharacterInvalid`) and differ from every other dead key's (`windows.deadCharacterCollision`).

**Entries**, in file order, one `DEADKEY` entry each (dead character of D, base unit → composed unit, flags):

| base | result | written |
|---|---|---|
| one unit (Text, CodeUnits), or `{"deadKey": E}` (E's dead character) | one unit | (base, result, 0) |
| as before | `{"deadKey": F}` | (base, F's dead character, `DKF_DEAD`) |
| B of n ≥ 2 units (the output of a ligature key) | R of n units with R[2…n] = B[2…n] | (B[1], R[1], 0): Windows passes the rest of the ligature unchanged (wb §6.2, §8; this is the multi-unit recipe of `spec-v9`, e.g. a supplementary result from a supplementary base) |
| any | R = spacing + base, `noMatch` `emitBoth` | no entry needed (Windows does that by itself) |
| B of n ≥ 2 units | anything else | `windows.deadKeyBaseUnencodable` |
| one unit | anything else | `windows.deadKeyResultUnencodable` |

Two entries that give the same (dead, base unit) keep the first (Windows takes the first match). Windows composes on
the **first unit** of a multi-unit output (wb §6.2): if a dead key has an entry for unit `u` and some cell's output
starts with `u` but has more units and no entry of its own, typing gives the composed `u` followed by the rest,
where the file's `noMatch` says otherwise: `windows.deadKeyFirstUnitComposes`.

**`noMatch`**: `emitBoth` is what Windows does (wb §6.2). `emitText` is compiled by appending, for every unit `c`
that is a one-unit cell or the first unit of a ligature cell anywhere in the tables, or a dead character, and that has
no entry yet, the entry (c → c); reported as `windows.deadKeyNoMatchExpanded` (keys whose text does not come from the
tables, such as Ctrl+letter, still give both). `emitSpacing`, `emitNothing`: `windows.deadKeyNoMatchNotExpressible`.

**Names**: `pKeyNamesDead` holds `deadKeys.<id>.name` for every dead key that has one (with its dead character).

**Markers and transforms are not compiled**: a Windows build compiles `deadKeys` only. Every `transforms` group
reports `windows.transformNotCompiled`. (Converting CLDR marker dead keys into `deadKeys` is the CLDR importer's job,
`coverage/cldr-keyboard3.md` §3.6.)

## 9. Registration (inst §3, §6)

**`registration`**: `layoutText` = `metadata.name`. When `langId` is `0C00` (a language without LCID, inst §6):
`localeName` = `strings.localeName`, `customLanguageName` = the `languageName` string. `langId` has no default
(`windows.langIdMissing`, Q2). `klid` and `layoutId` are allocated on the machine when absent, `productCode` comes
from its own rule; none of them is part of the DLL (`targets/windows-install.md`).

## 10. Pinning

`yakbd pin` (target `windows`) makes a file independent of these rules: it writes into `targets.windows` every value
a rule decided (`dllName`, `builds`, `strings`, `versionInfo`, `localeFlags`, `kbdVersion`, `keyboardType`,
`modifiers.bits`, `modifiers.modNumber`, `keys.<p>` with `vk`, `scanCodeFlags` and `attributes` for every position
in the DLL, `scanCodeTableSize`, `tables`, `deadKeys.<id>.character`, `registration.layoutText` and the custom-language
values, and the installer's `registration.productCode` and `install.*`), and adds to `positions` every Table A
position the DLL contains that the file lacks (with its `scanCode`). It does not write `registration.klid` or
`registration.layoutId`, which are chosen on the machine (D47). Pinning writes `builds` as the tool decided it: a
file pinned by a tool that could not make `arm64x` lists no `arm64x` and does not get it later until the author adds
it (§2.1).
It never changes other general data. After pinning, a build of the file reports no `windowsDefault.*` entry and gives
the same DLL. Pinning is a starting point: the author then edits the pinned values.

## 11. Carried, not compiled

`targets.windows.nls` (`KbdNlsLayerDescriptor`, dll §6.1; filled when a DLL is imported) and
`targets.windows.dispatcher` (dll §6.3; only written by hand, because a dispatcher's list sits behind code with no
public prototype, so the importer cannot read it, `dll.dispatcherNotRead`) are kept by `pin`, but the 0.1 build does
not emit them: `windows.nlsNotCompiled`,
`windows.dispatcherNotCompiled`.

## 12. Writer rules established by yakbd's own tests

| id | rule | source |
|---|---|---|
| W-1 | A 32-bit build (`x86`, `wow64`) writes a HIGHLOW base relocation for the 32-bit address inside the descriptor function, besides those for every table pointer (dll §1.5). Without it a rebased file does not load in 32-bit processes | **[VM]** yakbd VM run 1, 2026-11-22 (`targets/windows-vm-tests.md` VM-1); the count of Windows' files repeated in run 2 |
| W-2 | An SGCAPS key whose dead key is only in the Caps Lock row is followed by its Caps Lock row and then an FF row holding the dead characters: Windows takes the dead character of a `WCH_DEAD` in the Caps Lock row from the row after the Caps Lock row, whatever that row is | **[VM]** yakbd VM run 2, 2026-11-22 (`targets/windows-vm-tests.md` VM-4) |

The linker version (VM-2) and the stack and heap sizes (VM-3) are not checked by Windows: no rule.
