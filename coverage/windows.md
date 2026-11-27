# Coverage: Windows layout DLLs and `.klc` files → `.kbl.json`

Everything a Windows keyboard-layout DLL and an MSKLC `.klc` file can express, and its home in `.kbl.json`. Facts are
from the reference specification, tag revision 10 (`CLEAN-ROOM.md`); "dll §4.2" means `spec/dll-format/README.md`
§4.2, likewise "wb" (`windows-behaviour`), "klc" (`klc-format`) and "inst" (`installation`). "General" means the
target-neutral part of the file; "pin" means a field of `targets.windows` (SPEC §16.1). The default rule that fills a
field when the file is silent is named in `targets/windows.md`.

**Carried, not compiled** marks data the format holds so that nothing is lost when a DLL or `.klc` is read, but
that the 0.1 tool does not build (reported as a loss when building).

## 1. PE container (dll §1)

| item | home |
|---|---|
| architecture: x86, amd64, WOW64 (x86 with 8-byte pointer slots), ARM64X, IA64 (dead) | `targets.windows.builds` (`x86`, `x64`, `wow64`, `arm64x`, `targets/windows.md` §2.1; IA64, ARM32 and plain ARM64 are not builds, D45). Header values, sections, relocations, the descriptor function and the size limit are writer rules, not layout data: no home needed |
| exports `KbdLayerDescriptor` (ordinal 1) | implied by every build |
| export `KbdNlsLayerDescriptor` (ordinal 2) and its table | `targets.windows.nls` (carried, not compiled) |
| exports `KbdLayerRealDllFileNT4` (3), `KbdLayerRealDllFile` (5), `KbdLayerMultiDescriptor` (6); `KBDTABLE_MULTI`, `KBDTABLE_DESC` | `targets.windows.dispatcher.tables[]` (`dllName`, `type`, `subType`), `targets.windows.dispatcher.realDllFile` (carried, not compiled, written by hand only: these DLLs contain real code and the list has no public prototype, dll §6.3, so an import cannot read it, `dll.dispatcherNotRead`) |
| string resources 1000 (layout name), 1100 (language name), 1200 (locale name), per resource language | `targets.windows.strings.layoutName` / `.languageName` (LANGID → Text), `.localeName`; general: `metadata.name`, `metadata.localizedNames` |
| version resource (file and product version, company, copyright, description) | `targets.windows.versionInfo`; general: `metadata.version`, `metadata.organization`, `metadata.copyright`, `metadata.name` |
| file name (`Layout File`, ≤ 8 characters for `.klc`) | `targets.windows.dllName` |

## 2. `KBDTABLES` (dll §3)

| field | meaning | home |
|---|---|---|
| `pCharModifiers` → `MODIFIERS` | modifier keys → bits, bits → column | §3 below |
| `pVkToWcharTable` | character tables | §4 below |
| `pDeadKey` | dead-key table | `deadKeys` (§5) |
| `pKeyNames`, `pKeyNamesExt` | key names per scan code (without / with E0) | `positions.<p>.name` (the position's `scanCode` decides which table) |
| `pKeyNamesDead` | dead-key names | `deadKeys.<id>.name`; the dead character from the pin `targets.windows.deadKeys.<id>.character` |
| `pusVSCtoVK`, `bMaxVSCtoVK` | scan code → VK and flags, table size | `positions.<p>.scanCode` + `targets.windows.keys.<p>.vk` / `.scanCodeFlags`; size: `targets.windows.scanCodeTableSize` |
| `pVSCtoVK_E0`, `pVSCtoVK_E1` | the same for E0 / E1 scan codes | positions with `scanCode` `E0xx` / `E11D` and their `targets.windows.keys` entries |
| `fLocaleFlags` low word: `KLLF_ALTGR` | right Alt acts as Ctrl+Alt | `targets.windows.localeFlags.altGr`; general: layers with `altR` |
| `KLLF_SHIFTLOCK` | Shift turns Caps Lock off | general `settings.capsLockOffBy: "shift"`; pin `localeFlags.shiftLock` |
| `KLLF_LRM_RLM` | Shift+Backspace gives LRM/RLM (wb §11) | general `settings.bidiMarksOnShiftBackspace`; pin `localeFlags.lrmRlm` |
| `fLocaleFlags` high word `KBD_VERSION` | must be ≥ 1 for ligatures (dll §4.7) | `targets.windows.kbdVersion` |
| `nLgMax`, `cbLgEntry`, `pLigature` | ligature table | outputs of more than one unit in bindings (§4) |
| `dwType`, `dwSubType` | keyboard type reported by `GetKeyboardType` (dll §6.2) | `targets.windows.keyboardType` |
| short form (no `dwType`/`dwSubType`) | old file shape (dll §3) | read only; the writer always writes the full form; no home needed |

## 3. Modifiers and shift states (dll §4.1, wb §4, klc §5)

| item | home |
|---|---|
| `VK_TO_BIT` entries: `VK_SHIFT`→`KBDSHIFT`, `VK_CONTROL`→`KBDCTRL`, `VK_MENU`→`KBDALT` | general components `shift`, `ctrl`/`ctrlL`/`ctrlR`, `alt`/`altL`/`altR`; pin `targets.windows.modifiers.bits` |
| extra bits `KBDKANA` 08, `KBDROYA` 10, `KBDLOYA` 20, `KBDGRPSELTAP` 80, on any VK (Kana, OEM_8 "extra AltGr" of the Canadian Multilingual layout, …) | general `customModifiers.<name>` (`kind: held`, `positions`) used in layer modifier sets; pin `modifiers.bits[]` `{vk, bit, component}` |
| `ModNumber[]`, `wMaxModBits`, `SHFT_INVALID` | which bit combination selects which column; invalid combinations | pin `modifiers.modNumber` (null = invalid; several combinations may share a column); default from the layers |
| column order (the `.klc` `SHIFTSTATE` list) | the position of each state's cells | the order of `modNumber` values; default ascending state value |
| Alt-only and Shift+Alt columns | writable but never reached (wb §4.2) | a layer with `alt` and no `ctrl`; build reports `windows.altOnlyLayer` |
| more than 8 columns (up to 15, dll §4.1) | | layers; `windows.tooManyColumns` above 15 |
| AltGr encodings (right Alt = fake left Ctrl + Alt, wb §3.3) | | layers with `altR`; `localeFlags.altGr` |
| Kana toggle (VK_KANA toggled counts for `KANALOK` rows, wb §4.1) | | general `customModifiers` of `kind: lock` on the Kana position; pin `modifiers.kanaLockComponent` and `keys.<p>.attributes` `KANALOK` |
| `.klc` `MODIFIERS` section | | `customModifiers` + `modifiers.bits` |

## 4. Character tables (dll §4.2, wb §5)

| item | home |
|---|---|
| one row per VK: cells per column | the bindings of the position whose VK it is, one per layer (`hardware.layers[].bindings.<p>`); the column is the layer's state |
| a cell with one UTF-16 unit | Text binding |
| `WCH_NONE` | no binding |
| `WCH_DEAD` + the dead character in the next (FF) row | `{"deadKey": id}` binding; the dead character is `targets.windows.deadKeys.<id>.character` (default `deadKeys.<id>.spacing`) |
| `WCH_LGTR` → `LIGATUREn` entry (by VK and **column index**, wb §9.1), 2 to 125 units | a Text binding of several units; a supplementary character is such a Text (two units) |
| a lone surrogate, `F001`, `F002` or any unit sequence that is not valid text | CodeUnits binding `{"utf16": [...]}` |
| control characters (Ctrl+[ = 1B, Backspace 08, Enter 0D, …) | ordinary Text bindings in the relevant layers |
| row attribute `CAPLOK` | general: Caps Lock layers whose bindings equal the Shift / base ones (`settings.capsLockFallback` keeps them short); pin `keys.<p>.attributes` |
| `SGCAPS` + the following Caps Lock row | general: Caps Lock layers (`caps`, `caps shift`) with their own bindings; pin `attributes: ["SGCAPS"]` |
| `CAPLOKALTGR` | general: layers `caps altR` (or `caps ctrl alt`) whose bindings equal those of `shift altR` and vice versa; pin |
| `KANALOK` | general: the Kana-lock layer; pin |
| `GRPSELTAP` | pin `keys.<p>.attributes` (no general meaning established) |
| SGCAPS and dead key on one key (dll §4.2) | the same general data; `windows.sgcapsDeadKey` when the shape cannot be written |
| table widths and order, rows' order (matters for `VkKeyScanEx`, wb §14) | pin `targets.windows.tables` |
| rows for a VK that no scan code produces | pin `targets.windows.extraRows` |
| number-pad rows (`VK_NUMPAD0`… reached through `KBDNUMPAD`, wb §3.2) | bindings of the `numLock` positions (SPEC §14.1); the row's VK follows from the position's navigation VK |
| Ctrl+letter fallback U+0001–U+001A (wb §5) | not data: Windows behaviour; `windows.ctrlLetterFallback` |

## 5. Dead keys (dll §4.3, wb §6, §8)

| item | home |
|---|---|
| `DEADKEY` entry (dead character, base) → composed unit | `deadKeys.<id>.entries[]` `{base, result}` |
| `DKF_DEAD` (chained dead keys, any depth) | `result: {"deadKey": id}` |
| other `uFlags` bits (ignored by Windows) | not kept (they have no effect); a reader reports nothing |
| a dead key followed by a key without entry: dead character, then the key's text, state cleared | `deadKeys.<id>.noMatch: "emitBoth"` (the default) |
| a dead key followed by another dead key without entry: both characters, nothing pending | SPEC §14.2 (same rule) |
| a key without text keeps the dead key pending | SPEC §14.2 |
| entries for dead+dead (base = the other dead character) | `base: {"deadKey": id}` |
| multi-unit dead-key output (`spec-v9`, wb §8): the dead key is followed by a ligature key; an entry changes the first unit; e.g. a supplementary result | `entries[].result` with several units, compiled by the recipe of `targets/windows.md` §6 |
| literal composed values `0000`, `F000`–`F002`, lone surrogates | `result` as CodeUnits |
| dead character `0000` (nothing pending) | pin `deadKeys.<id>.character: {"utf16": ["0000"]}` |
| order of entries (first match wins) | the order of `entries` |
| dead-key names (`KEYNAME_DEAD`) | `deadKeys.<id>.name` |

## 6. Scan codes and virtual keys (dll §4.5, §4.6, wb §3, §13)

| item | home |
|---|---|
| scan code without prefix, with `E0`, with `E1` | `positions.<p>.scanCode` (`"1E"`, `"E01D"`, `"E11D"`) |
| the VK of each scan code (any VK on any key) | `targets.windows.keys.<p>.vk` |
| flags `KBDEXT`, `KBDMULTIVK`, `KBDSPECIAL`, `KBDNUMPAD` | `targets.windows.keys.<p>.scanCodeFlags` (`ext`, `multiVk`, `special`, `numpad`) |
| flags `KBDUNICODE`, `KBDINJECTEDVK`, `KBDMAPPEDVK`, `KBDBREAK` (no table uses them, dll §4.5) | the same field (`unicode`, `injectedVk`, `mappedVk`, `break`), for reading only; a writer never sets them by default |
| unused scan codes (VK FF) | positions without `targets.windows.keys.<p>.vk` and without default |
| `bMaxVSCtoVK` | `targets.windows.scanCodeTableSize` |
| key names per scan code | `positions.<p>.name` |
| Enter on both `1C` and `E01C` (the one allowed VK duplicate) | two positions with the same VK |

## 7. `.klc` file (klc §1–§7)

| keyword / item | home |
|---|---|
| encoding, line ends, comments | not data (writer conventions of the tool) |
| `KBD` name | `targets.windows.dllName` |
| `KBD` description | `metadata.name` (and `targets.windows.strings.layoutName`) |
| `COPYRIGHT` | `metadata.copyright` (and `versionInfo.legalCopyright`) |
| `COMPANY` | `metadata.organization` (and `versionInfo.companyName`) |
| `LOCALENAME` | `targets.windows.strings.localeName`; also a candidate for `metadata.id` when reading |
| `LOCALEID` | `targets.windows.registration.langId` (low word; the file's 8 hex digits) |
| `VERSION` | `targets.klc.versionLine`; `metadata.version` when it parses |
| `MODIFIERS` | `customModifiers` + `targets.windows.modifiers.bits` |
| `SHIFTSTATE` | the layers' modifier sets; the order → `targets.windows.modifiers.modNumber`. The exporter always writes 0, 1 and 2 (klc §3: at least two, state 2 required), a state no layer serves with `-1` cells, and reports the rows MSKLC then adds as `klc.impliedRows` (D78) |
| `ATTRIBUTES` `ALTGR`, `SHIFTLOCK`, `LRM_RLM` | `targets.windows.localeFlags`; `settings.capsLockOffBy`, `settings.bidiMarksOnShiftBackspace` |
| `LAYOUT` row `sc vk cap cells` | `positions.<p>.scanCode`, `targets.windows.keys.<p>.vk`, `.attributes` (cap), bindings per layer |
| cap `SGCap`, 0, 1, 4, 5 | `targets.windows.keys.<p>.attributes` and the Caps Lock layers |
| SGCAP continuation line `-1 -1 0 c0 c1` | bindings of the Caps Lock layers |
| cell `-1`, char, `hhhh`, `hhhh@`, `%%`, 5–6 hex digits | none / Text / Text / `{"deadKey"}` / Text of several units (from `LIGATURE`) / Text (supplementary). A `char` is one UTF-16 unit that is not a surrogate (D800–DFFF): a lone surrogate outside `LIGATURE`, given literally or as `hhhh`, makes the file malformed and the reader refuses it (D96). The exporter writes a cell for every `SHIFTSTATE` entry (MSKLC fills cells a short row leaves out, VM-12) and a supplementary character as `%%` with a `LIGATURE` line holding the column index, never as a 5–6 digit cell (MSKLC then makes a ligature with the shift-state value, which types nothing outside columns that coincide; D82) |
| `LIGATURE` `vk col c0…c4` | Text binding of 2–5 units at that position and layer; surrogate halves only here (klc §4.4, §4.6), so a one-unit output that is a lone half has no `.klc` form: `klc.notRepresentable` (D79) |
| `DEADKEY` blocks and `@` results | `deadKeys` (one per dead character); `@` → `{"deadKey"}` result |
| `KEYNAME`, `KEYNAME_EXT` | `positions.<p>.name` (positions created for every named scan code) |
| `KEYNAME_DEAD` | `deadKeys.<id>.name` |
| `DESCRIPTIONS` | `targets.windows.strings.layoutName` (LANGID → Text); `metadata.localizedNames` when the LANGID's tag is known |
| `LANGUAGENAMES` | `targets.windows.strings.languageName` |
| `ENDKBD` | not data |
| row order, section order, comments | not data |
| MSKLC-editor compatibility rules (klc §10.1) | `targets.klc.msklcEditorCompatible` |

## 8. Registration and installation (inst §3, §6, §10)

| item | home |
|---|---|
| KLID | `targets.windows.registration.klid` (absent: the installer allocates `aNNN` + LANGID on the machine, `targets/windows-install.md` §5) |
| `Layout Id` | `registration.layoutId` (absent: allocated on the machine, `00FF` down to `00C0`, `targets/windows-install.md` §5) |
| `Layout Text` | `registration.layoutText` |
| `Layout Display Name` (`@%SystemRoot%\system32\<dll>,-1000`) | derived from `dllName`; no field |
| `Layout File` | `dllName` + `.dll` |
| language (KLID low word, `InstallLayoutOrTip` LANGID) | `registration.langId` |
| `Layout Locale Name` (custom locale `0C00`) | `registration.localeName` |
| `Custom Language Name`, `Custom Language Display Name` | `registration.customLanguageName` (the display name refers to string 1100) |
| `Layout Product Code` (ownership marker) | `registration.productCode` (rule `productCode`, `targets/windows-install.md` §2) |
| enabling for the installing user | `targets.windows.install.enableForUser` (rule `enableForUser`) |
| uninstall entry: name, version, publisher | `targets.windows.install.productName`, `.productVersion`, `.publisher` (rule `uninstallEntry`) |
| sign-in (welcome) screen and new users | `targets.windows.install.enableForSignInAndNewUsers` (rule `enableForSignInAndNewUsers`, default off; `targets/windows-install.md` §7.1) |
| other existing users, default input method | not in 0.1: an installer never changes them (`targets/windows-install.md` §7) |
| what goes where on each machine, upgrade, repair, uninstall | installer behaviour, `targets/windows-install.md` §3–§9 |

## 9. Windows behaviour that is not data

Ctrl+letter fallback, Alt+number-pad entry, Alt stripping, the number-pad Num Lock rule, `VK_PACKET`, the 16
`WM_CHAR` cap, per-HKL dead-key state, `ToAsciiEx` code pages: these are what Windows does with any table. The format
does not hold them; where they make a build differ from the general model, `targets/windows.md` names the loss kind.

## 10. Importer conventions (`.klc` → `.kbl.json`)

So that two importers produce the same file (D28):

1. **Positions**: one per `LAYOUT` row and per `KEYNAME`/`KEYNAME_EXT` code, id from SPEC Appendix A by scan code,
   otherwise `sc` + the scan code in upper-case hex (`sc59`, `scE05E`); `scanCode` as in the file; `name` from the
   key-name sections. Every row's VK goes to `targets.windows.keys.<p>.vk`, its cap to `.attributes`. A position
   that has no row of its own (only a key name) but whose VK, pinned or from Table A, has a row gets that row's
   bindings, because Windows types the row on it (`NumpadEnter` with Enter's row; D77), as the DLL import does.
2. **Layers**: one per `SHIFTSTATE` value, in file order, with `id` `s<value>` (`s0`, `s6`) and one modifier set:
   bit 1 → `shift`, bit 2 → `ctrl`, bit 4 → `alt`. **AltGr** (D41): a file with `ATTRIBUTES ALTGR` **or** a
   `SHIFTSTATE` value 6 or 7 is imported with `targets.windows.localeFlags.altGr: true` pinned (dll §4.8: the new
   tool sets `KLLF_ALTGR` when a Ctrl+Alt column exists or the source asks for it); then the value 6 gets the two
   sets `["altR"]` and `["ctrl", "alt"]` (7: the same with `shift`), because on Windows both reach the column, and
   Alt-only values (4, 5) use `altL` instead of `alt` so that the layers do not overlap; bits from `MODIFIERS` →
   custom `held` components named after the bit name
   in lower camel case (`kana`, `roya`, `loya`, `grpSelTap`). `targets.windows.modifiers.modNumber` and `.bits` are
   pinned from the file.
3. **Caps Lock**: `settings.capsLockFallback` stays `true`. For a `CAPLOK` key the layer `capsS0` (`["caps"]`)
   gets the key's `s1` binding and `capsS1` (`["caps", "shift"]`) its `s0` binding; for `SGCAPS` the same layers get
   the continuation line's cells; for `CAPLOKALTGR` the layers `capsS6` / `capsS7` get the `s7` / `s6` bindings.
   Layers that end up empty are omitted. A `-1` continuation cell under a column whose main cell has a character is
   the explicit nothing `{"output": ""}` (MSKLC writes `WCH_NONE` there, VM-12; D64, D82), and a continuation cell
   with `@` is the character itself, not a dead key, as MSKLC builds it (D81). The same for a `CAPLOK` key whose `s1`
   cell is `-1` (its `capsS0` binding is the explicit nothing: Caps Lock selects that column, wb §5) and for
   `CAPLOKALTGR` with an empty `s7` / `s6` cell (D93).
4. **Dead keys**: one per `DEADKEY` block, id `u` + the dead character in lower-case hex (`u00b4`), `spacing` = the
   dead character, `name` from `KEYNAME_DEAD`, `entries` in file order, `noMatch` absent (`emitBoth`);
   `result` with `@` → `{"deadKey": "u<hex>"}`.
5. **Metadata**: `metadata.id` from `LOCALENAME` (else `und`), `name` from `KBD`'s description, the rest per §7.
6. **Implied rows** (D36): a `.klc` file is written for MSKLC, which adds certain rows to every layout (OBS D16),
   so they are part of what the file means. The importer writes them into the `.kbl.json` explicitly, wherever the
   file leaves the cell empty and declares the state, and reports them once as `klc.impliedRows`:
   Backspace `\b` / `\b` / U+007F, Escape U+001B in all three, Enter (and NumpadEnter, which shares its VK)
   `\r` / `\r` / `\n`, Break (VK CANCEL) U+0003 in all three (base / Shift / Ctrl layers); Tab `\t`, NumpadAdd `+`,
   NumpadDivide `/`, NumpadMultiply `*`, NumpadSubtract `-` in base and Shift; Numpad0–Numpad9 `0`–`9` in base.
   A position made only by a key-name entry is a position of that key like any other: the implied rows apply to it
   (D77). An implied row for a VK no position of the file produces (NumpadDivide's `DIVIDE` when E035 is remapped)
   becomes `targets.windows.extraRows` (D82). The `.klc` exporter leaves a row, or an extra row, out when its cells
   equal exactly these. Nothing else is added: the `.kbl.json`
   build itself adds nothing (D34).
7. **Number-pad rows** (D33): a `LAYOUT` row whose scan code is one of 47–49, 4B–4D, 4F–53 and whose VK is the VK
   Num Lock turns that key into (NUMPAD0–NUMPAD9, DECIMAL; wb §3.2) does not remap the key: the position keeps its
   Table A VK and `numLock: true`, and the row's cells become its bindings.
8. **Normalisation** (D74): Windows types exact code points, so the importer writes `settings.normalization:
   "disabled"` exactly when some imported output (a key cell or ligature, a dead-key result or spacing character, a
   dead-key base) is a Text that NFC (Unicode 18.0.0) would change; otherwise `settings` gets no `normalization`.
   No output is ever rewritten by an import.

## 11. Importing a layout DLL (DLL → `.kbl.json`)

A DLL holds the compiled tables of one build. The importer reads one file (the reference reader of dll §10: export
ordinal 1, the descriptor function of dll §1.4, then §3 and §4), never trusting it: every pointer, count and size is
checked against the file and the limits of dll §1.2 and §4, and a file that fails is `dll.malformed` (fatal; nothing
is written). The goal is a file whose Windows build gives **the same tables again** (same scan-code tables and flags,
same columns, rows, row order, cells, ligatures, dead-key entries, key names, strings and version fields except
`CompanyName` (item 12); not the
same bytes, D53). Conventions, so that two importers write the same file (as §10 does for `.klc`, D28):

1. **Which files**: x64, x86 and WOW64 builds (dll §1, §2: 8-byte or 4-byte pointer slots, told apart by Machine and
   the descriptor shape), and ARM64 / ARM64X files (Machine AA64), read in their native ARM64 view as the file lies
   on disk; the x64 view of an ARM64X file is not read (`dll.containerIgnored`). Whether the tables of the two views
   are the same in every ARM64X file is not established (dll §1.7 and §6.5: the ARM64 view's tables were not walked,
   **[INF]**); in files the tool writes they are the same by construction (the tool's `docs/arm64x.md`).
   Other Machines (IA64, ARM32) are `dll.architectureUnsupported`. `builds` is not pinned (the imported file gets the
   default builds). `metadata.provenance` = `{ "format": "windowsDll", "source": <file name> }`.
2. **Positions**: one per scan code whose VK is not `FF` in `pusVSCtoVK`, `pVSCtoVK_E0`, `pVSCtoVK_E1`, and one per
   scan code in the key-name tables; ids and names as §10 item 1. Every VK is pinned in
   `targets.windows.keys.<p>.vk`, every position's flags in `.scanCodeFlags` (as read), `scanCodeTableSize` is
   pinned, and **`useTableA: false`** is written (D54), so the build holds exactly the DLL's scan codes: no Table A
   row is added for a scan code the DLL does not map, and no position gets a VK the DLL does not give it. A scan code
   whose entry is `FF` **with** flags gets a position with `vk: "_none_"` (VK name of `FF`) and those flags; one
   without flags gets none. Several positions with one VK are kept as they are (no `windows.vkDuplicate` under
   `useTableA: false`, D59).
3. **Layers and modifiers**: one layer per column that some bit combination selects, id `s<lowest state>`, with one
   modifier set per bit combination that selects it, made as §10 item 2 (bit 1 `shift`, 2 `ctrl`, 4 `alt`;
   `KLLF_ALTGR` → `altR` and `ctrl alt` sets for 6 / 7, `altL` for Alt-only states, D41); extra bits become custom
   `held` components named after the bit (`kana`, `roya`, `loya`, `grpSelTap`; bit 40, which has no name, `bit40`)
   on the positions whose VK the `VK_TO_BIT` entry names. `modifiers.bits` and `modifiers.modNumber` are pinned. A
   column no combination selects, and a state that uses a bit no `VK_TO_BIT` entry owns (no key can make it; MSKLC
   writes such states, VM-12): `dll.unreachableColumn`, the state is imported as invalid (D82). A `VK_TO_BIT` entry with no bit has no effect and is
   dropped (`dll.unreachableData`); one with several bits has no home (a custom component is one bit) and is
   dropped as `dll.modifierDropped` (error: typing changes).
4. **Cells**: as the table of §4 read backwards: one unit → Text (CodeUnits when it is not valid text, D5);
   `WCH_NONE` → no binding; `WCH_DEAD` → `{"deadKey": "u<hex>"}` with the dead character from the following row;
   `WCH_LGTR` → the ligature entry for that VK and **column index** (wb §9.1) as Text or CodeUnits. A `WCH_LGTR`
   without entry, or an entry without cell: `dll.ligatureMismatch`. A second row for a VK: `dll.duplicateRow`.
   Data Windows never reaches or the format has no place for (a stray FF row, an empty table, cells of a
   dead-character row outside the dead columns, a second DEADKEY pair for the same dead character and base, a second
   E0/E1 entry for one scan code, a second or empty key name, cells beyond column 15): dropped, `dll.unreachableData`.
   A dead-character row whose VK is not `FF` (Windows reads it anyway, dll §4.2) and an SGCAPS row at the end of a
   table (no Caps Lock row follows) are imported as if well formed (the latter without Caps Lock row):
   `dll.unusualShape`.
5. **Caps Lock and Kana**: `CAPLOK`, `SGCAPS` (with its Caps Lock row) and `CAPLOKALTGR` become Caps Lock layers
   exactly as §10 item 3; `KANALOK` and `GRPSELTAP` are pinned in `.attributes` (every row's attributes are pinned).
   For `KANALOK` rows the importer adds a custom `lock` component `kanaLock` on the position with VK `KANA`, pins
   `modifiers.kanaLockComponent`, and gives its layer the Kana column's cells of those rows. An SGCAPS Caps Lock row
   with `WCH_NONE` in a column where the main row has output types nothing (VM-7 **[VM]**): the Caps Lock layer gets
   the explicit nothing `{"output": ""}` there (D64), which rebuilds to the same `WCH_NONE`. Caps Lock cells the
   layers still cannot say (a `CAPLOK` / `CAPLOKALTGR` key with one partner column empty, Caps Lock cells beyond
   column 1, the Caps Lock row of an extra row): `dll.capsCellUnexpressed`. Only columns 0 and 1 of a Caps Lock row
   are Caps Lock outputs (wb §5: the row is used only without Ctrl and Alt; D65, VM-8). In the shared shape of dll
   §4.2 (one FF row after an SGCAPS row with `WCH_DEAD`), the FF row's cell in every column where the main row has
   `WCH_DEAD` is that dead key's dead character, in any column (an AltGr dead key included); its other cells beyond
   column 1 are never read: `dll.unreachableData` (VM-8 **[VM]**: Caps Lock + AltGr never reads the Caps Lock row,
   D67).
6. **Number pad** (D33): a row for `NUMPAD0`–`NUMPAD9` or `DECIMAL` gives the bindings of the position whose VK
   Num Lock turns into that VK (wb §3.2); the position gets `numLock: true`.
7. **Rows for a VK no position produces**: `targets.windows.extraRows`, with attributes and cells, in table order.
8. **Tables**: widths, grouping and row order pinned in `targets.windows.tables`, one entry per table of the file in
   file order, rows named by PositionId or `{"vk"}`; a pinned table is built as listed (`targets/windows.md` §7).
9. **Dead keys**: one per dead character, id and fields as §10 item 4 (`spacing` = the dead character, `name` from
   `pKeyNamesDead`, `entries` in table order, `DKF_DEAD` → `{"deadKey"}` result, other `uFlags` bits not kept, §5).
10. **Flags and version word**: `localeFlags` and `kbdVersion` pinned; `KLLF_SHIFTLOCK` also gives
    `settings.capsLockOffBy: "shift"`, `KLLF_LRM_RLM` `settings.bidiMarksOnShiftBackspace: true`. Unknown bits of
    locale flags, scan-code flags or row attributes: `dll.unknownFlags`.
11. **Keyboard type**: `dwType` / `dwSubType` are not kept (`dll.keyboardTypeNotTrusted`, dll §3, triage item 12),
    unless the importer is told to keep them (`keyboardType` pinned).
12. **Strings and version**: `strings.layoutName` / `.languageName` (every resource language) and `.localeName`
    pinned; `versionInfo` pinned with the fields it has **except `companyName`**. `metadata.name` = string 1000 in
    the LANGID the importer was given, else in the lowest LANGID present, else `FileDescription`, else the file name;
    `metadata.id` = string 1200 when it is a well-formed BCP 47 tag, else `und`; `CompanyName` goes to
    `metadata.attribution` (the originating entity of the design), never to `metadata.organization` or
    `versionInfo.companyName`, so a rebuilt file does not name the original vendor as its maker (dll §1.6: a false
    statement of origin; D58); `LegalCopyright` to `metadata.copyright` and `versionInfo.legalCopyright` (a statement
    about the data, kept). Other resources and version fields: `dll.resourceDropped`.
13. **Name**: `dllName` = the input file's name without `.dll`, in lower case, when it matches the `dllName`
    pattern; otherwise absent (rule `dllName` applies) and listed in `dll.registrationMissing`.
14. **Registration**: a DLL holds none of it (inst §3: KLID, `Layout Id`, `Layout Text`, product code and the
    custom-language values live in the registry, the language in the KLID). `registration.langId` is written only
    when the importer is given one; everything missing is listed once in `dll.registrationMissing`. The defaults of
    `targets/windows.md` §9 and `targets/windows-install.md` then apply.
15. **Carried data**: `KbdNlsLayerDescriptor` → `targets.windows.nls` (carried, not compiled, §1); a table behind
    export 2 that cannot be read is dropped and the layout still imported (`dll.nlsUnreadable`). The dispatcher
    exports (3, 5, 6, dll §6.3) are code, not tables, so the importer cannot fill `targets.windows.dispatcher` from
    them: `dll.dispatcherNotRead` (the field stays for hand-written files).
16. **Container**: header values, sections, alignment, padding, time stamp, linker version, debug data, relocations,
    signature and the descriptor shape are writer rules (§1): `dll.containerIgnored`.
17. **Nothing is added**: no implied rows (a DLL states every row, D34), `settings.capsLockFallback` stays `true`.
18. **Normalisation**: as §10 item 8 (D74), over the cells, ligatures and dead-key entries read: `disabled` exactly
    when one of them is a Text that NFC would change.
