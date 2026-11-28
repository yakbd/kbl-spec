# Design decisions

Numbered; an entry is never renumbered. A later entry that changes an earlier one says so. "Owner" marks a decision
the owner made; the others are the spec author's, open to review.

**D1. JSON, one file, `.kbl.json`.** JSON is read by every language's standard library (the tool is Go, standard
library only) and validated by JSON Schema. Reason: the format must be implementable by anyone with only this repo.

**D2. Self-contained files.** A file never refers to CLDR import data or other files; importers inline what they
import and record the paths in `metadata.provenance.cldrImports`. Reason: brief; a consumer needs only the file.

**D3. Closed objects, one extension slot.** Unknown properties are errors everywhere except `extensions` and
`cldrSpecial`. Reason: typos must not silently change meaning, and validation of the examples must prove something.

**D4. Order only in arrays.** Object property order carries no meaning (Go maps, most JSON libraries lose it);
everything ordered (layers, variables, dead-key entries, transforms, tests, rows) is an array.

**D5. Text excludes lone surrogates; CodeUnits for the rest.** Go's `encoding/json` replaces an invalid surrogate by
U+FFFD (Go documentation of `Unmarshal`), and Windows can emit lone surrogates and `F000`–`F002` (wb §6, §8).
Text is therefore Unicode text only, and `{"utf16": [...]}` carries any unit sequence.

**D6. CLDR patterns verbatim.** Transform and reorder patterns and variable values keep CLDR's syntax unchanged.
Reason: lossless round trip, and the semantics stay CLDR's; re-encoding a regex dialect is error-prone. Outputs and
displays, which are plain text, are decoded into JSON strings instead (MarkedText for markers and variables).

**D7. Superset by construction.** Every CLDR element has a named home (`coverage/cldr-keyboard3.md`), every Windows
table feature has one (`coverage/windows.md`). Where CLDR and Windows model the same thing differently, the general
part follows CLDR and `targets.windows` holds the Windows shape.

**D8. Positions are not keys.** `positions` are physical keys (scan code, name); `keys` is CLDR's bag of outputs and
gestures. CLDR rows place keys on positions; Windows tables are per scan code. Keeping both apart lets one file hold
both models exactly.

**D9. Implied keys are a rule of the spec.** `0`–`9`, `A`–`Z`, `a`–`z`, `space`, `gap` are implied as in CLDR, by
this specification itself, so files stay short and self-contained without importing `keys-Latn-implied.xml`.

**D10. Hardware layers bind positions directly.** `hardware.layers[].bindings` maps PositionId → Binding, with a
Text shorthand. Reason: Windows layouts and hand-written files are per key position; CLDR rows are converted
through the form (row *i*, column *j* → position).

**D11. Caps Lock fallback, off for CLDR imports.** `settings.capsLockFallback` (default `true`) lets Caps Lock layers
list only the keys Caps Lock changes, which is how Windows behaves (attribute 0) and keeps `.klc`-derived files
short. CLDR's rule (no layer matches → no output) is the value `false`, which CLDR importers write.

**D12. Dead keys first-class, CLDR markers kept too.** Dead keys are the common case on every platform and the only
one Windows compiles; markers plus transforms remain available for everything else. `noMatch` makes the no-match
behaviour explicit per dead key; default `emitBoth` (Windows' behaviour, wb §6.2); a CLDR marker that matches nothing
vanishes, so CLDR imports get `emitText`.

**D13. Dead key after dead key.** Without an entry, the second dead key is treated as its spacing text under
`noMatch` and does not become pending (Windows' rule, wb §6.2). Another behaviour can be had with an entry whose
base is `{"deadKey": …}`.

**D14. Number-pad keys.** A `numLock` position's bindings apply with Num Lock on and Shift up; otherwise it is a
navigation key. This is what Windows does (wb §3.2) and what users expect elsewhere; it avoids a `numLock` modifier
component that CLDR does not have.

**D15. Loss kinds are a closed list with default policies.** Tools and files talk about the same ids;
`accept` never hides an entry. Fatal kinds cannot be accepted. Reason: brief ("every conversion reports exactly what
was dropped"; files decide error/warning/accepted).

**D16 (owner, 2026-11-22). Default rules are extremely simple, overridable, reported.** The spec states default
rules **and** `targets.windows` may override any of them; `pin` writes the defaults into the file (mainly as a
starting point for editing). The rules are a fixed table plus a few one-line rules, with no heuristics and no
per-language or per-script cases; they are knowingly wrong for many layouts, which keeps maintenance in the files
and out of the spec. Every build lists each choice that came from a default as an entry `windowsDefault.<rule>`;
policy can make "used a default" an error (`"windowsDefault.*": "error"`). Applied in `targets/windows.md` §0–§10
and SPEC §16.1, §17.1. (Owner's question number: Q5.)

**D17. The default VK table has two kinds of entries only (superseded in part by D29: the [PUB] rows were added).** Table A of `targets/windows.md` holds (a) the standard
uses the reference specification measured (wb §3.1, §3.2) and (b) keys whose windows-sys VK name names the key
(`KeyA` → `A`, `Escape` → `ESCAPE`). Punctuation and national keys have no default (Q1). Reason: clean room: the
reference specification does not keep the measured US table (dll §4.5), and nothing is filled in from memory.

**D18 (owner, 2026-11-22). One installer per platform with every build.** By default one installer per platform
contains every build (x64, WOW64, x86, ARM64X, any later Windows architecture) and installs the right files on the
machine it runs on; an option may make a single-build installer; never a folder of per-architecture installers.
Hence `targets.windows.builds` (list of builds, default all) instead of one file per architecture, and the
registration data lives once in `targets.windows.registration`. Installer generation itself is next round.

**D19 (owner, 2026-11-22). Licence MIT-0.** Both yakbd repositories are MIT-0 (MIT No Attribution, "Copyright 2026
The YAKBD contributors"), not CC0 as first briefed. Third-party material keeps its licence (`NOTICE`).

**D20 (owner, 2026-11-22). Reference specification relicensed; final repository name.** The owner relicensed the
reference specification to MIT-0 for the yakbd repositories, so its text may be copied where useful (still cited by
section). The content moves later to the public `yakbd/kbl-spec`; the schema `$id` is therefore
`https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json`, and normative text avoids the prototype's name.

**D21. Windows builds compile `deadKeys` only.** Markers and transforms are never pattern-matched into Windows dead
keys by the build (D16: no smart rules); the CLDR importer may convert the simple marker pattern into `deadKeys`
(`coverage/cldr-keyboard3.md` §3.6), and the author sees the result in the file.

**D22. Columns from layers, ascending state.** `modNumber` defaults to one column per distinct Windows state of the
hardware layers, in ascending state value, plus one for `other`. Reason: one-line rule; MSKLC's customary
`SHIFTSTATE` order (0, 1, 2, 6, 7) is ascending as well.

**D23. Pins win, with a warning.** A pinned value is used even when it contradicts the general data, and the build
reports `windows.pinOverridesModel`. Reason: the file's explicit choice is the point of `targets.windows`; the report
keeps the contradiction visible.

**D24. Position names from W3C UI Events.** Recommended position ids are the W3C `code` values (a public,
platform-neutral naming of physical keys); scan codes are stated per position in the file. Appendix A is informative
and never consulted by a build (Table A of the Windows target is the only built-in table).

**D25. Tests extend CLDR's test format.** `tests` holds CLDR's keyboard test files, plus keystrokes by position and
modifiers so that every file (also Windows-derived ones without CLDR key ids) can carry test vectors.

**D26. Custom locks fall back** (closes Q3). `customModifiers.<k>.fallback` (default `true`) gives custom locks the
same fallback as `settings.capsLockFallback`; Caps Lock falls back first, then custom locks in name order (SPEC
§9.3). Reason: Windows' Kana lock (`KANALOK`) changes only some rows, and without fallback every other key would type
nothing.

**D27. One Windows row per VK.** Positions that share a VK (Enter and number-pad Enter) share one character row; the
lowest scan code wins and differences are reported (`windows.sharedVkRowConflict`). Reason: the DLL tables are per
VK (dll §4.2); a silent difference would break the rule that every difference is reported.

**D28. Fixed `.klc` import conventions** (`coverage/windows.md` §10): ids of layers, dead keys and positions, how
Caps Lock attributes become Caps Lock layers. Reason: two tools importing the same `.klc` must write the same file,
so that diffs between files mean something.

**D29 (coordinator for the owner, 2026-11-22; closes Q1, Q10; changes D17).** Microsoft's public documentation pages
("Virtual-Key Codes" and the scan-code table of "About Keyboard Input") are acceptable sources, cited by URL as [PUB],
facts only (key, scan code, VK), no copied prose. Table A takes the US standard keyboard's rows from them, so every
standard key has a default VK. There is one table, `targets/windows-default-vk.tsv`; the spec is its source and the
tool generates from or checks against it. Keys no public page assigns a VK to (Japanese and Brazilian extra keys,
`NumpadComma`, `NumpadEqual`) stay without default.

**D30 (closes Q2).** `targets.windows.registration.langId` stays required; a tool may suggest a value from the public
[MS-LCID] document when it pins.

**D31 (closes Q4, Q6, Q7, Q8, Q9).** Accepted as recommended: `arm64x` stays in the default builds and is reported
as unsupported until tested; rule `tables` stays width/scan-code ordered; one key name per position; the product code
is next round's installer work; local paths are neutralised when the content moves to the public repository.

**D32 (owner, 2026-11-22). No Python; checker in Go.** The repository holds no Python. The checker is a Go program
(`tools/check`, Go 1.26, `go run ./tools/check`) doing what the earlier script did: schema compilation and validation
of every example (JSON Schema draft 2020-12), descriptions, loss-kind and default-rule consistency, schema property
names in SPEC.md, layer overlaps, references, virtual-key names and the default-VK table. Its only dependency beyond
the standard library is `github.com/santhosh-tekuri/jsonschema/v6` (Apache-2.0, dev-only, in `NOTICE`). CI uses
`actions/setup-go` and runs only on push to `main` with a paths filter.

**D33. Number-pad rows of a `.klc` file are characters, not a remapping** (tool note 7). A `LAYOUT` row whose scan
code is a number-pad key and whose VK is the one Num Lock turns it into (wb §3.2) gives the key's characters; the
position keeps its Table A VK and `numLock: true` (`coverage/windows.md` §10 item 7). Reason: read literally, the
row would remap the key and lose its navigation function; this one-line import rule keeps both.

**D34. No standard rows are added** (tool note 8). Neither the `.klc` importer nor the Windows build adds
control-character, Tab, Space or number-pad rows that a file does not give (D16); the build warns with
`windows.frameKeyWithoutText`. A file that wants them says them. One path for all: `.klc` → `.kbl.json` → DLL.

**D35. A default row yields to the file's VK** (tool note 9). Rule `vk` adds a Table A row only when neither its
scan code nor its VK is used by a position of the file (`targets/windows.md` §5). Reason: the file's VK is
explicit; keeping the default as well would give `windows.vkDuplicate` for an ordinary remap.

**D36 (coordinator, 2026-11-22; refines D34).** D34 stays for `.kbl.json`: the build adds nothing and warns. A `.klc`
file, however, is written for MSKLC, which adds control-character, Tab and number-pad rows to every layout (OBS D16),
so those rows are part of what a `.klc` file means. The `.klc` importer therefore writes them into the `.kbl.json`
explicitly (reported once as `klc.impliedRows`), and the `.klc` exporter leaves them out again when they equal what
MSKLC would add (`coverage/windows.md` §10 item 6).

**D37 (corrects D35; tool note 13).** A Table A row yields only to an **explicit remap**: a file position whose VK is
not its own Table A VK and equals the row's VK. Reason: read literally, D35 dropped the navigation block (E047–E053)
from every `.klc` conversion, because the implied number-pad rows (D36) give `Numpad7` its own Table A VK `HOME`.

**D38 (tool note 1).** `windows.vkDuplicate` is not reported for VKs that Table A itself gives to two positions
(Enter/NumpadEnter, the number-pad keys and their navigation twins, SysRq/PrintScreen) as long as both positions keep
their Table A VK. Reason: otherwise every file with a number pad fails; the pairs are Windows' standard shape.

**D39 (coordinator; tool note 2).** The default of rule `builds` is "every build the tool can make": a defaulted
build the tool cannot make yet (ARM64X in 0.1) is skipped and listed once in `windowsDefault.builds`; a build the
file **lists** explicitly and the tool cannot make is `windows.architectureUnsupported` (error). Supersedes the part
of D31 that kept `arm64x` in the default as an error. Example (d) no longer lists `arm64x`.

**D40 (tool note 3).** Caps Lock giving nothing where the non-Caps column gives something is
`windows.capsUnmatched` (warning, one entry per build) in **every** column, not only base/Shift; `capsNotExpressible`
is reserved for real differences. Reason: CLDR imports have Caps Lock layers up to Shift only, so every AltGr key
would otherwise be an error although Windows simply types the AltGr character.

**D41 (tool notes 4, 14).** `.klc` import pins `localeFlags.altGr: true` when the file has `ATTRIBUTES ALTGR` or a
`SHIFTSTATE` value 6 or 7; then states 6/7 get both `["altR"]` and `["ctrl", "alt"]` sets and Alt-only states use
`altL`. Basis: the reference rule for the new tool, dll §4.8 **[YAKBD]** ("sets KLLF_ALTGR only when a column for
Ctrl+Alt exists or the source asks for it"). (MSKLC's own behaviour, OBS D25/D26, is broader — also for states 8 and
12 — and is not copied.)

**D42 (tool note 7).** The checks of SPEC §19 items 2 to 6 have loss kinds: `general.modifierSetInvalid` (fatal),
`general.duplicateScanCode` (fatal), `general.duplicateVariableId` (fatal), `general.longPressDefaultInvalid`,
`general.multiTapSelf`, `general.bindingOnModifier`, `general.touchBaseMissing` (error),
`general.codeUnitsAreText` (warning). Mixing `ctrl` with `ctrlL` is `general.modifierSetInvalid`, not
`general.layerOverlap`.

**D43 (yakbd VM run 1, 2026-11-22).** VM-1 to VM-3 are settled **[VM]**: the 32-bit descriptor address needs its
HIGHLOW relocation (writer rule W-1, `targets/windows.md` §12); linker version and stack/heap sizes are free. The
LRM/RLM observation of the run matches wb §11 and SPEC §14.1; no change.

**D44 (round 2, ARM64X).** A tool may count `arm64x` among the builds it can make (rule `builds`, D39) only after
its ARM64X writer has passed the test of dll §11 item 9 against the table of inst §2.4: a file it wrote, installed
with the `wow64` build, loads and types in native ARM64, emulated x64 and x86 processes, after sign-in and with
`ctfmon.exe` running; the result is recorded **[VM]** in `targets/windows-vm-tests.md`. Until then `arm64x` stays
skipped (D39) and listing it is `windows.architectureUnsupported`. Reason: dll §1.7 says how to write an ARM64X file
is not established and inst §2.4 forbids installing one outside a test VM before it passes; a gate stated in the
spec lets the default change without touching any file.

**D45.** The build list stays `x86`, `x64`, `wow64`, `arm64x` (`targets/windows.md` §2.1). A plain ARM64 file is not
a build of the format: x64 processes that load it themselves fail with 193 (inst §2.4 **[VM]**); a tool may write
one only as a test control. ARM32 and IA64 have no build (inst §2.4: no `SysArm32` on build 26300). ARM64X is asked
for or left out per file through `builds` alone, with no separate switch: listing it makes a tool that cannot make it
fail, listing the others leaves it out. Reason: one field, already there.

**D46 (round 2, installer).** An installer refuses, changing nothing, on a machine for which it lacks a build of
`targets/windows-install.md` §3: ARM64 without `arm64x` (or without `wow64`), x64 without `x64` or `wow64`, x86
without `x86`, any other machine. Reason: inst §2.4 forbids any non-AA64 file in an ARM64 `System32` (an x64 file
failed with 193 and crashed processes and `ctfmon.exe`), inst §10 says never to fall back to another architecture,
and a `wow64`-only install serves x86 processes alone (126 elsewhere) with untested sign-in behaviour. A visible
refusal is fixed by a newer installer; a half-working layout is not. The build reports the refused machines
(`windows.installerMachinesMissing`).

**D47.** KLID and Layout Id are **not default rules**: absent, the installer allocates them on the machine (KLID: the
first `aNNN<langId>` created atomically, skipping referenced KLIDs, inst §3.1, §10; Layout Id: the highest free id
from `00FF` down to `00C0`, inst §10), so nothing is reported or pinned for them and a pinned file still reports no
`windowsDefault.*`. Given in the file they are demands: used exactly, or the install is refused if another product
holds them. Range: the sequence of inst §10, which inst §3.3 also recommends (count down from `00FF`); ids above
`00FF`, which inst §3.3 calls safer, would be invisible to tools that scan only `00C0`–`00FF`. Reason: values that
depend on the machine cannot be known when the file is built.

**D48.** Rule `productCode`: UUID version 5 (RFC 9562) of the namespace `52711d5d-5dcb-4d0b-b8bb-9852abd899ea` and the
lower-case `dllName`. Reason: deterministic from the file, so a rebuild upgrades in place (inst §7, §10; closes the
rest of Q8) without a pin, and keyed on the name that already identifies the layout on disk (inst §2.3). Renaming the
DLL makes a new product unless the old code is pinned; `pin` writes it.

**D49.** Rule `enableForUser`: `true`, the installing user only, never other users, the welcome screen, new users, or
the default input method. The call runs as that user in that user's session and its result is verified (inst §4.3
**[VM]**: the return value proves nothing, and an elevation with another account writes the wrong hive). A failed
enabling leaves the machine part installed and is reported as such. Reason: a person who runs a layout installer
wants the layout in their list (MSKLC's packages do the same, inst §7 M5d); inst §4.7 calls the welcome screen and
new-user copies risky, so 0.1 has no field for them.

**D50.** Rule `uninstallEntry`: name `metadata.name`, version = the resolved `versionInfo.productVersion`, publisher
`metadata.organization` (absent when absent). The entry is per machine (inst §7 M4) and keyed by the product code
(inst §10); its registry value names belong to the container, not the format. Custom languages (`langId` `0C00`)
are enabled through the language tag and its transient LANGID (inst §6 requirement 2; inst §6 item 4 **[VM]**: the
`0C00` LANGID enables nothing), untested by yakbd (VM-5). Container and signing were owner questions (Q11, Q12; closed by D76); the
format stays container-neutral.

**D51.** New loss kinds `windows.registrationInvalid` (error: a `klid` not of `langId`, a `layoutId` outside
`0001`–`0FFF`, a per-user or unspecified LANGID, inst §3.3, §6) and `windows.installerMachinesMissing` (warning).

**D52.** Uninstall follows inst §10 `UNINSTALL` and its refusal policy unchanged (remove from every profile, refuse
while it is a profile's default or only layout, delayed deletion of files in use), plus removing a language tag only
when the installer added it. Reason: the reference's sequence is complete; restating it would be a second source.

**D53 (round 2, DLL import).** Fixed import conventions for DLLs (`coverage/windows.md` §11), like D28 for `.klc`:
everything Windows-specific is pinned (VKs, flags, columns, attributes, tables, strings, version), the general data
is what the tables mean (layers per column, Caps Lock layers as for `.klc`, dead keys per dead character), and the
goal is the same tables after a rebuild, not the same bytes. Registration data is not in a DLL
(`dll.registrationMissing`). Reason: TD's round trip and comparable imports.

**D54.** `targets.windows.useTableA` (default `true`): `false` turns Table A off for the file, so its VKs are exactly
its pins and no default row is added. Reason: without it, rule `vk` would add the Table A rows of scan codes a DLL does
not map (and give a named position the VK the DLL denies it), so an imported DLL could never rebuild to the same
tables. The DLL importer writes it.

**D55.** Loss kinds of the DLL importer get their own prefix `dll.` (`dll.*` policy): `malformed` (fatal),
`architectureUnsupported` (error), `containerIgnored`, `keyboardTypeNotTrusted` (accept), `resourceDropped`,
`unreachableColumn`, `duplicateRow`, `ligatureMismatch`, `unknownFlags`, `registrationMissing` (warning). Reason: like
`klc.*`, they describe a source format, not a target.

**D56 (TI note 4).** A single-build installer is made per **machine kind**, never per file: x86 = `x86`; x64 = `x64` +
`wow64`; ARM64 = `arm64x` + `wow64`. Reason: inst §2.1 requires the WOW64 copy on every 64-bit Windows, so an x64 or
ARM64 installer without it would only refuse (D46).

**D57 (TI notes 6–10; changes D52).** A fixed `layoutId` is refused only when a KLID of the same LANGID uses it (inst
§3.3 **[VM]** T7: only then do the HKLs collide); allocation still avoids every used id (inst §10). The KLID high
word runs from `A000` to `AFFE` (inst §10). Uninstall touches the current user and the other loaded user hives only,
and refuses only while the layout is a profile's **only** layout: where Windows keeps a profile's default input
method is not in the reference, and `.DEFAULT`, the Default profile and offline profiles never get the layout from a
0.1 installer, while stale references there are ignored at sign-in (inst §4.7 **[VM]**). Reason: the owner's
simplicity rule; each dropped step either has no clean fact behind it or guards a state 0.1 never creates.

**D58 (TD note 4).** The DLL importer puts `CompanyName` into `metadata.attribution`, never into
`metadata.organization` or `versionInfo.companyName`; `LegalCopyright` is kept. Reason: a rebuilt file is made by
yakbd, and naming the original vendor as its company is a false statement of origin (dll §1.6); the attribution
keeps the fact where it is true, and the copyright notice is a statement about the data.

**D59 (TD notes 2, 3, 7).** Under `useTableA: false` every VK is explicit, so `windows.vkDuplicate` is not reported
(rows are still one per VK, `windows.sharedVkRowConflict`); an `FF` scan-code entry with flags is a position with
`vk: "_none_"`. A pinned `tables` is built as listed (each entry one table, order, widths and empty rows kept),
because Windows' own files group rows in ways the width rule does not reproduce (dll §8).

**D60 (TD notes 1, 5, 8, 9).** Five more `dll.*` kinds, all warnings: `unreachableData`, `unusualShape` (folding
TD's `deadRowShape`, `modifierUnnamed` and the SGCAPS-at-end case), `capsCellUnexpressed` (open test VM-7),
`nlsUnreadable`, `dispatcherNotRead` (dispatcher exports are code; changes `coverage/windows.md` §11 item 15). Second
or empty key names and rows wider than 15 go under `unreachableData` rather than kinds of their own. ARM64 and
ARM64X files are imported from their native view; bit 40 is the component `bit40`.

**D61 (review of round 2; amends D48, D57, D60).** (1) Rule `productCode` hashes `metadata.id`, a space and
`dllName` (lower case), not `dllName` alone: two layouts whose default DLL names collide after the 8-character cut
must get different codes, so that the second installer refuses the taken file name (inst §2.3) instead of upgrading
over the first; test vectors in `targets/windows-install.md` §2. (2) D57's uninstall scope rests on inst §4.7 **[VM]**
(stale references to a deleted layout are ignored at sign-in, and Windows removed them from `.DEFAULT`), not on the
claim that other profiles never get the layout: a signed-out user may have added it in Settings (inst §1). The "every
profile" requirement of inst §7 is knowingly dropped for 0.1; such a profile keeps an ignored stale entry. (3) A
`VK_TO_BIT` entry with several bits is `dll.modifierDropped` (error), not `dll.unusualShape`, because dropping it
changes typing; an entry with no bit is `dll.unreachableData`. (4) Imported dispatcher DLLs fill nothing: their list
sits behind code with no public prototype (dll §6.3), so `targets.windows.dispatcher` is hand-written only.

**D62 (TI notes 14, 15).** An installer whose target file is scheduled for deletion at the next restart (left by an
uninstall of a file in use) refuses and asks for a restart, instead of cancelling the pending deletion. An installer
that runs under an account other than the session user's and cannot reach that user's process does not enable (an
enabling failure, `targets/windows-install.md` §7). Reason: both are the simplest safe behaviour; editing the
pending-rename list or enabling from the wrong account would change state the reference does not describe or
write the wrong hive (inst §4.3 **[VM]**).

**D63 (yakbd VM run 2, 2026-11-22).** VM-4 is settled **[VM]**: a `WCH_DEAD` in the Caps Lock row of an SGCAPS key
takes its dead character from the row after the Caps Lock row, so a dead key only in the Caps Lock row is
expressible with an FF row after the Caps Lock row (writer rule W-2; `windows.sgcapsDeadKey` now only for the other
combinations). The right-Shift case of `KLLF_LRM_RLM` (U+200F; U+200E with both Shift keys) matches wb §11. VM-5:
the custom-language route enables the layout, so the "registered, not enabled" interim of D57/TI item 11 ends;
an uninstall residue is open. VM-6: all ARM64X candidates pass in native ARM64 and x64 and the WOW64 file in x86;
the after-sign-in and `ctfmon.exe` part is still to run, so `arm64x` stays out of the default build set (D44).
VM-7 is not settled (no result line returned).

**D64 (VM-7, yakbd VM run 2).** `{"output": ""}` is an **explicit nothing** (SPEC §9.2): resolution stops at it, so
no Caps Lock or lock fallback applies, and the key emits nothing. In the Windows build it is `WCH_NONE` and counts as
a real Caps Lock output (an SGCAPS key with `WCH_NONE` in its Caps Lock row), while a missing binding keeps D40.
Reason: VM-7 **[VM]** showed that a `WCH_NONE` Caps Lock cell of an SGCAPS key types nothing, with no fallback to the
main row; without a way to say "nothing with Caps Lock" while `capsLockFallback` is on, an imported DLL could not
rebuild to the same behaviour. It reuses a form the schema already accepts instead of adding one. VM-5 is settled
(the custom-language route enables and uninstalls; `CachedLanguageName` is Windows' own). VM-6 stays open (after
sign-in, only 1 of 7 layouts was in the native ARM64 session).

**D65 (TD's KBDINUK3 note; provisional by D66, settled by D67).** `targets/windows.md` §6 rule 1 stays at columns 0 and 1: the reference says the SGCAPS
row is used only for states without Ctrl and Alt (wb §5), and its emulator reproduced every Windows layout with that
rule, `KBDINUK3` included. The import therefore reads the FF row of the shared shape as the dead characters of every
column whose main-row cell is `WCH_DEAD` (AltGr columns included, dll §4.2), not as Caps Lock forms of the AltGr
columns. VM-8 tests Caps Lock + AltGr on both shapes; if Windows does read the Caps Lock row there, rule 1 is extended
then. Reason: a rule change must rest on a [VM] result or the reference, not on counts that a second explanation
(dead characters in AltGr columns) also fits.

**D66 (VM-6, yakbd VM run 2).** The ARM64X gate of D44 is passed for yakbd's shipped shape `arm64x-x64` (tool
`docs/arm64x.md` §5): installed with its `wow64` file and enabled, it was in the session after sign-in with
`ctfmon.exe` running and typed through `ToUnicodeEx` and real input in native ARM64, x64 and x86 processes
(`targets/windows-vm-tests.md` VM-6). So yakbd can make `arm64x`, and by D39 it is in yakbd's default build set; a
file that lists it no longer fails, and default installers serve ARM64 machines. Another writer or shape passes the
gate again. **D65 is provisional**: with the tool's other reading (Caps Lock cells above column 1 of an SGCAPS key
carried, tool b5f5fac) `KBDINUK3` passes, while the D65 reading has not run; VM-8 decides, and §6 rule 1 and
`coverage/windows.md` §11 item 5 follow its result.

**D67 (VM-8, yakbd VM run 2).** D65 is settled **[VM]**: Caps Lock with AltGr (with or without Shift) types the main
row's cells of an SGCAPS key, never its Caps Lock row's, in the two-row and in the shared-FF shape; in the shared
shape an AltGr dead key keeps its dead character from the FF row with and without Caps Lock, and FF-row cells beyond
column 1 that are no dead characters are never typed. `targets/windows.md` §6 rule 1 stays at columns 0 and 1, and
the DLL importer reads the shared FF row as D65 says (`KBDINUK3` round-trips with that reading). `CAPLOKALTGR`
behaved as wb §5 says. This matches wb §5; the tool's other reading (Caps Lock cells above column 1) is dropped.

**D68 (TI3 note 1, round 3).** The installer's shape check (`targets/windows-install.md` §3) covers every file the
machine gets, before anything is written, and the tool runs it on every file when it makes an installer. (a) For
`arm64x` the accepted shape is one that passed the gate of D44 for the writer of the file; the format names no
shape, and yakbd accepts only `arm64x-x64` (D66), so an `arm64x-ec` file is refused: VM-6 covered that shape for
loading only, not after sign-in. (b) A failing file is a damaged installer, a failed run with nothing changed
(§0 item 5), not a §3 refusal and not an enabling failure; exit codes stay the container's (§0 item 1), so yakbd's
exit code 1 fits. At build time it is a tool error, not a loss kind: a file the writer produced wrongly is a defect
no `onLoss` policy may accept. Reason: inst §10 step 1 and §2.4 ask for the check, and D44 already ties ARM64X to
the shapes that passed.

**D69 (TI3 note 2, round 3).** A repair that has to take a new Layout Id (the recorded one now used by another KLID
of the same LANGID, D57) re-enables the layout for the user who runs it, when that user's hive named the KLID, by
calling `InstallLayoutOrTip("<LLLL>:<KLID>", 0)` again for each of that user's `User Profile` values, from that
user's own process (§7). Other users, loaded or offline (c, as D57), are not changed and are told to sign out and
in again. Reason: the KLID stays, so `Preload`, `Substitutes` and `User Profile` stay right (inst §4.1, §4.2); only
the CTF state holds the HKL (inst §4.5 [I]), Windows rebuilds it from `User Profile` at sign-in (inst §4.1 [S]),
`InstallLayoutOrTipUserReg` cannot reach it (inst §4.3 [VM]), and the reference names no persistent way to set it
other than `InstallLayoutOrTip` (inst §4.5). This narrows inst §10's "every profile that had it" knowingly, as
D57/D61(2) did for uninstall. Open:
(a) whether the call loads the new HKL for a layout already in the list is VM-9 (yakbd VM run 3,
scenario `repair-new-layout-id-reenables`); until then a missing new HKL is reported as
"sign out and sign in again", not an enabling failure, and if VM-9 fails, removing and adding the layout is next;
(b) whether another user's sign-in picks up the new HKL is not measured, and no yakbd run tests it yet.
**Settled by VM run 3 (VM-9 [VM])**: one plain add left the session on the old HKL, so the sequence is remove
(`ILOT_UNINSTALL`) and add again; with it the new HKL was in a new process and typed, and after a cold boot and
sign-in too. The user's only layout is not removed: it is added only and the user signs out. (b) stays unmeasured.
Re-enabling does not depend on rule `enableForUser`; a run-time switch that turns enabling off turns it off too.

**D70 (owner, 2026-11-25). The schema's source and the checker are TypeScript with zod; replaces D32's Go checker.**
`src/schema.ts` (zod 4.6.7) is the source of `schema/0.1/kbl.schema.json`, which stays the published artifact with
the same `$id` and is generated (`z.toJSONSchema`, draft 2020-12) and committed; CI fails when it is stale.
`tools/check` is the D32 checker ported to TypeScript; it also parses every example with zod and runs the schema
cases of `testdata/schema/`. Node 22 LTS, npm, exact pins and a lockfile; the Go code and `go.mod` are gone, and
there is still no Python. JSON Schema keywords zod does not generate (`uniqueItems`, `not`, `required` under
`anyOf`/`oneOf`/`not`) are written with `.meta()` and mirrored by a `.refine()`, so the zod and the JSON Schema
accept the same files; SPEC §19 stays outside both. The generated schema accepts the same files as the hand-written
one did (gate in the commits that added it); the generator drops the safe-integer bounds ±(2⁵³−1) that `z.int()`
adds, so only zod itself rejects integers JavaScript cannot hold exactly. Reason: owner request; one typed source instead of hand-written JSON, and the tool keeps reading plain
JSON Schema (its validator accepts the generated file).

**D71 (TN note 1, round 4). Normalisation follows Unicode 18.0.0.** `settings.normalization` means NFC / NFD as UAX #15
defines them for Unicode 18.0.0, the Unicode version of CLDR release 49 (its release note: "Updated for Unicode 18"),
which this spec follows; implementations use the 18.0.0 UCD and pass its `NormalizationTest.txt`. A code point
unassigned in 18.0.0 is left as it is. Reason: one fixed version makes a build reproducible; normalisation is stable
across versions for assigned characters (UAX #15 stability policy), so moving with a later CLDR release changes only
characters that are new there. The version moves with the CLDR release the spec follows, by a new decision.

**D72 (TN note 2, round 4). What a build normalises.** With `normalization` `enabled` (the default), a target that
does not normalise while typing (Windows) NFC-normalises at build time, each output as a whole: key outputs after
resolution (Text and MarkedText bindings, `{"key"}` outputs, variable values; for Windows after markers are dropped),
dead-key results and `spacing` texts, and dead-key bases, so that a base still matches the normalised output of the
key that types it (CLDR's NFD matching compares canonically equivalent strings, which NFC on both sides also does).
Not normalised: CodeUnits values (exact units by definition, SPEC §2.2), the Windows data of `targets.windows`
(`extraRows` cells, dead characters: already target data), names, displays and tests. Transforms are not compiled
for Windows (`windows.transformNotCompiled`); a target that compiles them applies CLDR's rules. Converters
(`.kbl.json` ↔ `.klc` ↔ CLDR) never normalise; the `.klc` export writes the outputs the Windows build makes, which
are normalised when the file says `enabled`. Reason: this is what CLDR's NFC output means for a target that types
fixed strings, and every output of the file is treated alike.

**D73 (TN note 3, round 4). Loss kinds of normalisation.** New kind `general.outputNormalized` (accept): an output was
changed by NFC, one entry per output with its path, before and after. A length change has no kind of its own: NFC can
make an output longer (U+0344 → U+0308 U+0301) or shorter (`a` U+0301 → U+00E1), and the normalised output then goes
through the target's usual rules, whose kinds report any limit it hits (for Windows `windows.ligatureTooLong`,
`windows.ligatureTruncatedTyped`, `windows.deadKeyResultUnencodable`, ...). `general.normalizationNotApplied`
stays and Windows keeps reporting it once per build with `enabled`: build-time NFC covers each output, not text that
several keystrokes make together (a key output followed by a combining mark from another key), which CLDR would
normalise. TN proposed the name `general.normalized`; `outputNormalized` says what changed, like the other
`general.*Dropped` names. Reason: the author sees each rewritten output, and the run-time difference stays
visible.

**D74 (TN note 4, round 4). Importers never rewrite an output.** The `.klc` and DLL importers write
`settings.normalization: "disabled"` exactly when some imported output (key cell or ligature, dead-key result or
spacing character, dead-key base) is a Text that NFC (D71) would change, and leave the default otherwise
(`coverage/windows.md` §10 item 8, §11 item 18). The CLDR reader keeps CLDR's attribute as it is. Reason: Windows
types exact code points, so the imported file must too; DLL → `.kbl.json` → DLL and the MSKLC comparison stay
exact, and an NFC-clean file stays free of the setting ("always `disabled`" was
the alternative, simpler to state but it would stop later edits from being normalised).

**D75 (TN note 5, round 4). Example (b) says `normalization: "disabled"`.** `examples/latin-altgr-deadkeys.kbl.json`
demonstrates the Windows multi-unit recipe (`a` + U+0301 as an output and as a dead-key base, `ä` + U+0301 as a
result), which exists only for exact code points: with NFC the base becomes one unit with a two-unit result
(`windows.deadKeyResultUnencodable`). The example now disables normalisation and says why. Reason: TN's option (a);
the others make the build inconsistent (base not matching the key output) or drop what the example is for.

**D76 (owner, 2026-11-25 and 2026-11-26; closes Q11, Q12). Installers are unsigned `.exe` programs that behave like
`msiexec`.** Unsigned, as MSKLC's installers are (Q12; an unsigned installer is blocked where Smart App Control is on,
inst §11 T12, and that is accepted). `.exe` only: MSI is abandoned for yakbd and for the installers it makes (Q11;
the owner's answer of 2026-11-25, "both `.exe` and `.msi`, MSI deferred", was replaced on 2026-11-26). The `.exe`
takes `msiexec`'s command line, exit codes, logging, upgrade and repair behaviour, as the tool's
`docs/installer-cli.md` states. The format stays container-neutral (`targets/windows-install.md` §0 item 1): no field
names a container or a signature. Reason: owner decisions; MSKLC's users get the same unsigned double-click
installer, and administrators get the command line they already script.

**D77 (TM notes 1–3, round 4). `.klc` import of named keys.** (1) A position made only by a `KEYNAME` /
`KEYNAME_EXT` entry gets the implied rows of D36 like a position made by a row (`coverage/windows.md` §10 item 6; the
tool already does so). (2) A position without a row of its own whose VK has a row gets that row's bindings (§10 item
1): Windows types the row on every scan code with that VK, the DLL import binds it so, and a `.klc` import and a DLL
import of its build then agree without a comparison rule. (3) `metadata.name` stays as §10 item 5 and §11 item 12
say (`KBD`'s description for `.klc`, string 1000 for a DLL); when the two differ, the imports differ there, which is
metadata only (no typing change). Reason: the file says what the keys type on Windows; the name rule is not worth a
special case.

**D78 (TM note 4, round 4). The `.klc` exporter always writes states 0, 1 and 2.** klc §3 requires at least two
`SHIFTSTATE` entries and state 2, so a file without a Ctrl layer gets state 2 with `-1` cells. MSKLC fills empty cells
of declared states with its implied rows (OBS D16 via D36: Ctrl+Backspace U+007F, Ctrl+Enter `\n`, Escape, Break), so
the exported `.klc` then types more than the source; the exporter reports that as `klc.impliedRows` (accept), the
same kind the importer uses, with the gained cells in `detail`. Reason: a `.klc` that the reader (and MSKLC) refuses
is no export; the gain is MSKLC's own convention and visible in the report.

**D79 (TM note 4, round 4). A lone surrogate half as a one-unit output is `klc.notRepresentable`.** A `.klc` allows
surrogate halves only inside `LIGATURE` lines (klc §4.6), and a ligature has 2 to 5 units (klc §4.4), so a CodeUnits
output of one lone half (`windows-features` has `d800`) cannot be written; the exporter leaves the cell `-1` and
reports `klc.notRepresentable` (error by default). Halves inside a 2–5 unit output are written as a ligature. Reason:
the DLL can hold such a cell, the `.klc` cannot; nothing is silently changed.

**D80 (TX contract, round 4; amends `targets/windows-install.md` §8). No downgrade.** An installer whose version is
older than the installed version of the same product (first three fields compared) refuses with nothing changed
(exit code 1638); uninstall first. The same or a newer version upgrades in place, as before. Reason: the owner's
"msiexec's upgrade behaviour" (D76) and the tool's `docs/installer-cli.md` §6; §8 said "any version" before.

**D81 (TM note 6, VM-12). `@` in an SGCAP continuation line is a character, as MSKLC builds it.** MSKLC stores the
character of a continuation cell `hhhh@` and makes no dead key of it (yakbd VM run 4, VM-12, cases
`sgcaps-dead-cont`, `-cont2`). A `.klc` file means what MSKLC builds (the reasoning of D36), so the reader takes
such a cell as Text. The Caps Lock-only dead key of writer rule W-2 (D63) therefore has no `.klc` form: the exporter
writes the character and reports `klc.notRepresentable`. W-2 itself is unchanged; it is a DLL rule, reached from
`.kbl.json` and DLL import. This replaces the round 2 triage line that accepted such dead keys from continuation
lines. Reason: an exported or imported `.klc` must build the same in MSKLC and in yakbd.

**D82 (TM note 5, VM-12). `.klc` conventions measured against MSKLC.** (1) A `-1` continuation cell under a
character is the explicit nothing (D64; MSKLC writes `WCH_NONE`). (2) An implied row (D36) for a VK no position
produces becomes `targets.windows.extraRows`, reported as `klc.impliedRows`; the exporter leaves an extra row out
when it is exactly an implied row. (3) The exporter writes a supplementary character as `%%` with a `LIGATURE` line
holding the column index, and a cell for every `SHIFTSTATE` entry. (4) The DLL importer writes a state that uses a
modifier bit no `VK_TO_BIT` entry owns as invalid, `dll.unreachableColumn`. All in `coverage/windows.md` §7, §10,
§11. What MSKLC's compiler puts into cells a row leaves out was measured only as far as VM-12 (Ctrl + Space gave a
space); that is for the reference specification's observations, not this repository.

**D83 (TM note 7, VM-12; open). MSKLC's scan-code tables are not format data.** MSKLC's `pusVSCtoVK` and E0 tables
differ from yakbd's in every comparable DLL, with no typing difference. The format does not carry MSKLC's table:
a `.klc` import gives the positions the file names, and the build fills the rest from Table A (D29, Microsoft's
public pages). A difference on a scan code the `.klc` does not name is therefore expected and recorded, not fixed;
one on a scan code the file names would be a defect. The next TM bundle prints the differing scan codes; they will
be compared with Table A and this entry settled. **Settled by D85** (VM-15).

**D84 (VM-13, VM-14).** D69 (b) is settled **[VM]**: a second user signed in during a repair that takes a new Layout
Id picks up the new HKL at that user's next sign-in, and the only-layout repair works as D69 says. The double-click
path (consent and over-the-shoulder elevation, enabling only for the user who runs the installer) and the deferred
deletion behave as `targets/windows-install.md` §7 and §9 say on Windows 11 and Windows 10. A pending deletion is
registered with the `System32` path, never `Sysnative` (Windows 11 stores a `Sysnative` path as `SysWOW64`,
VM-13 run 1); that is a tool rule, recorded in `targets/windows-install.md` §9. The command-line contract of D76
passes (VM-14). Open: uninstall through Settings (the test's automation failed, not the installer).

**D85 (settles D83; VM-15).** Table A stays as D29 made it: the keys Microsoft's public pages assign a VK to. The 18
scan codes MSKLC's tables have in addition (59, 5A–5F, 62, 63, 6F, 71, 73 and three more of the main table; E021,
E06B, E06D) are left out. A file that needs them names the position and pins its `vk`; a `.klc` that names them
gets them from its rows. Consequence, recorded: on a keyboard with such a key (legacy terminal keys, the Brazilian
key 73, launch keys), a layout built by yakbd from a `.klc` that does not name the key sends no VK where MSKLC's
build does. Reason: the only source for these defaults would be MSKLC's or Windows' own tables, which this
repository does not copy (D29, clean room), and no corpus layout names them; typing on standard keyboards is the
same (VM-15).

**D86 (VM-15; replaces the explicit-remap exception of D35 and D37).** Rule `vk` adds every Table A row whose scan code
no position of the file uses, whatever VKs the file's positions have; such a row and a file position with the same
VK share the VK's row and do not report `windows.vkDuplicate`. The added rows stay listed in `windowsDefault.vk`;
`vk: "_none_"` on the position removes one. Reason: VM-15 `e0-used` (E035 remapped to OEM_2): the exception
dropped scan code 35, so Slash typed nothing for a real user, while Windows and MSKLC keep it; one rule without
exceptions is also simpler (D37's navigation-block fix becomes unnecessary).


**D87 (round 5, item 3; changes D49 and D57).** New field `targets.windows.install.enableForSignInAndNewUsers`, rule
`enableForSignInAndNewUsers`, **default `false`** (inst §4.7: risky, opt-in); a tool MAY override it at run time (yakbd:
`SIGNIN=0|1`). With it the installer writes, for its own KLID only, the entries T8 measured for Windows' own copy into
`HKU\.DEFAULT`, `S-1-5-19`, `S-1-5-20` and the Default profile: `Preload`/`Substitutes` by `InstallLayoutOrTipUserReg`,
the `User Profile` value beside them, the `User Profile System Backup` value in the three system hives
(`targets/windows-install.md` §7.1). The route is direct writes, not the measured copy, and this departs from the
round brief's "prefer the measured route". Reasons: the copy carries every input method of the account that runs it
(only `UserID="Current"`), so uninstall could not undo it and it would overwrite an administrator's choice; after
over-the-shoulder elevation it copies the administrator's list; and with enabling off it carries nothing. Each piece
of the direct route is measured on its own (inst §4.3 **[VM]**, T8's shape). The whole is not, and VM-18 tests it;
if VM-18 fails, the fallback is the copy. Not applied on ARM64 (klc2arm64's unbootable report, inst §2.4) and for
`0C00` layouts (per-user transient LANGID, inst §6); a file asking for it with `0C00` fails to build
(`windows.registrationInvalid`). Where the layout's language is not in a place, only `Preload`/`Substitutes` are written
there and no language is added (the tag comes only from Windows' own mapping; VM-19 measures it). The option runs in
the elevated part, before the user's enabling. Uninstall always cleans the four places first, whether or not the install applied the
option. Windows' own "Copy settings" can put the layout there after a plain install, and T8 shows that Windows
removes stale entries from `.DEFAULT` only. This changes D57's "never touched". Offline user profiles stay untouched
(stale references are ignored, inst §4.7 **[VM]**). Upgrade and repair keep the recorded state unless the override
says otherwise. D49's "never the welcome screen or new users" now reads "only by this opt-in".

**D88 (TC note 1; extends coverage §3.6 rule 2).** A CLDR marker dead key whose transforms are `\m{m}($[v])` → `$1` +
literal, or → a mapped set `$[1:w]`, is imported as a `deadKeys` entry per member of `v`, in set order, a later
duplicate left out (`coverage/cldr-keyboard3.md` §3.6). Reason: CLDR's `fr` writes every dead key that way, and
without the expansion the Windows build loses them all; the expansion is exact (a set variable is a finite list),
it puts the complexity into the file, not into a build rule, and the build's NFC step and dead-key loss kinds
already cover the results. The CLDR writer writes the entries back as literal transforms.

**D89 (TC note 2).** A file without hardware layers fails the Windows build with the new kind `windows.noHardwareLayers`
(error). Reason: the DLL would hold only Table A's rows, which looks like a layout and types nothing of the
file's. `onLoss` can accept it for a test that wants the empty DLL.

**D90 (TC note 3; confirms D34).** The five `windows.frameKeyWithoutText` warnings of every CLDR keyboard stay. Neither
the CLDR importer nor the build adds Enter, Backspace, Tab or Escape characters (CLDR does not hold them; D34: a file
that wants them says them). Reason: the warning is true, because many applications need those characters (SPEC §17.3), and
a default that adds characters is the kind of rule D16 and the owner's Q5 keep out. The conformance run accepts
the kind.

**D91 (TC note 4; confirms D85).** IntlRo and IntlYen keep no Table A row; a CLDR `abnt2` or `jis` keyboard builds for
Windows only after its file pins `targets.windows.keys.IntlRo.vk` (and `IntlYen`). The conformance run accepts
`windows.vkMissing` for them. Reason: D85; the only sources for those VKs are tables this repository does not copy.

**D92 (TC notes 5, 6).** How a test file runs on a hardware target is the spec's rule (`coverage/cldr-keyboard3.md`
§3.7, SPEC §15): a key-id keystroke presses the first binding position, taking the first layer in `hardware.layers`
order, then its first modifier set, then the first position in `positions` order. `startContext` is
existing text, `emit` is inserted text, `check` compares in NFC when normalisation is enabled, and a test needing
something the target cannot express is skipped and listed with the loss kind. Reason: the tool's interim choices,
made deterministic. TC note 7 (CLDR `ja-Latn` row 1 one key short) is CLDR's data read as coverage §2.1 says: no rule.

**D93 (TC notes 8–10, records).** (1) `.klc` export: a Ctrl+Alt column without `localeFlags.altGr` is
`klc.notRepresentable`, because MSKLC gives every Ctrl+Alt column `KLLF_ALTGR` (D41), so the `.klc` would mean another
layout. (2) `.klc` import: a `CAPLOK` key with a `-1` Shift cell gives the explicit nothing in its Caps Lock layer
(wb §5; D64), the same for `CAPLOKALTGR` (`coverage/windows.md` §10 item 3). (3) `general.touchDropped` is also
reported for `longPressKeyIds` / `multiTapKeyIds` on a file without touch layers, as SPEC §17.3 already defines it.

**D94 (TW notes 1–7; refines D87).** (1) A Default-profile unload that fails is reported and is not a failure. A later
run that finds the load name still loaded uses that hive and unloads it at the end. (2) The Default profile is
`NTUSER.DAT` in the folder `GetDefaultUserProfileDirectoryW` names, and it must exist before `RegLoadKey`, which would
create it. (3) A failed §7.1 step takes back exactly what the run wrote; uninstall removes every entry naming the KLID.
(4) Uninstall deletes `User Profile System Backup` keys that it leaves empty. (5) With several `User Profile` subkeys of
one LANGID, the first in enumeration order is used. (6) The only-layout refusal in §9 step 1 applies to `.DEFAULT`
only. `S-1-5-19`, `S-1-5-20` and the Default profile may have no keyboard list before the install, and the refusal
would then block every uninstall. VM-18's baseline readback shows whether they do. Reason: TW's readings are the
simple ones and lose nothing that the reference measured (`targets/windows-install.md` §7.1, §9).

**D95 (TC notes 11, 12; refines D88 and D92).** (1) Coverage §3.6 rule 3 ignores a transform `\m{.}(.)` → `$1`
(or `\m{.}` → nothing) in a later group. It says what `noMatch` `emitText` says, so it stays in the file and the
markers before it convert. The losses that follow in `fr` (`windows.deadKeyResultUnencodable` for results with no
one-unit NFC form, `windows.deadCharacterInvalid` where a marker's `display` is not one unit) are true and stay
errors. A file that wants them gone pins `deadKeys.<id>.character` or drops the entries, and the conformance run
accepts them. (2) D92's "first position" is in PositionId order (code-unit order), not document order. JSON object
order is not something a reader must keep.

**D96 (TF notes 1, 2).** (1) In a `.klc` cell, `char` excludes the surrogates D800–DFFF, like `hhhh` (klc §4.6). A lone
surrogate outside `LIGATURE` makes the file malformed (`coverage/windows.md` §7). Reason: the writer could never write
it back, and klc §4.6 already refuses the hex form. (2) The schema's VK-name pattern grows from 24 to 32 characters,
so that every name of `targets/windows-vk-names.tsv` is valid (the longest, `GAMEPAD_RIGHT_THUMBSTICK_BUTTON`, has 31).
SPEC §16.1 already allowed every name of that table, so the 24-character limit was a schema bug (Q13 interim rule).
`0xNN` stays valid for every VK, so files that already use it are unchanged.

**D97 (VM-18 to VM-23; changes D87).** (1) The `User Profile System Backup` value is required in `.DEFAULT`: at the restart Windows
rebuilt `.DEFAULT` and removed every entry of ours without one, including a layout that had its `User Profile` value
(VM-23 **[VM]**). The layout that had it stayed, and the sign-in screen listed it. (2) For a language a place does not
have, the step-1-only rule of D87 is withdrawn. Its layout was loaded for a new account, but Windows removed it from
`.DEFAULT` at the restart (VM-19). The installer writes the whole shape Windows' copy writes (tag in `Languages`,
subkeys, `Preload` `0000<LLLL>`) or nothing. The tag comes only from a user hive where Windows filed that LANGID. No
such hive makes the option fail (Q14), and uninstall removes a tag the installer added. (3) The `User Profile` DWORD is
1 + the highest in its subkey, not the `Preload` index (VM-19: `fo` = 1 with `Preload` 2). (4) Order: the elevated
process enables for the user first when it is the user's account (inst §4.3 **[VM]** T3), then writes the §7.1
places. (5) The lock-screen entry "Faeroese keyboard" for the `0438` layout is Windows' name for the `Preload` KLID
`00000438`, which is also Windows' own Faroese KLID (inst §3.1, §4.2). Nothing shows which file the sign-in session
loaded, so no rule rests on it. D87's direct route stands for languages the places already have: install, restart,
new account, repair, override and uninstall all passed (Windows 11 x64).

**D98 (VM-25, VM-26; closes Q14 and Q15; extends D97).** (1) Q14: when no loaded user hive has the layout's language
and the installer runs as LocalSystem, it calls `InstallLayoutOrTip("<LLLL>:<KLID>", 0)` itself. As LocalSystem that
call files the language in `.DEFAULT` under Windows' own tag (VM-26: `fo`). The installer reads the tag back and
writes the D97 shape in all four places, the `System Backup` values included, because the call alone wrote none and its
entries were gone after a restart. No tag is derived: `LCIDToLocaleName(0x0438)` is `fo-FO`, Windows filed `fo`, and
for `0407` Windows filed `de-DE` (inst §6 item 4), so no simple rule fits both. Other installs without a user who has
the language still fail the option (D97). Not measured: the combined LocalSystem route (VM-27). (2) Q15: no option
for "add the language without changing the display language". Enabling already adds the input language and never
the display language (§6). VM-25 saw the display language unchanged through install, restart and a new account.
After the uninstall the user's hive gained `PreferredUILanguages=en-US`, the display language it already had, with
no change in effect. The installer's log shows no such write: Windows wrote it, most likely when removing the layout
took `fo` out of the user's list (the readbacks have no snapshot between the restart, the new account and the
uninstall, so which step it was is not shown). Checkers compare the effective display language, not the value's
presence. (3) VM-23: with `System Backup` values, entries written into `.DEFAULT` alone survive the restart, and the
lock screen lists the layout, so `S-1-5-19`/`S-1-5-20` are not needed for the sign-in screen. §7.1 keeps writing
them because Windows' copy does, and uninstall cleans them anyway.

**D99 (VM-27; TW note 8).** D98's LocalSystem route is settled **[VM]** (VM-27, 7 of 7). TW note 8: the installer only
ever appends a tag to the end of a `Languages` value and never writes `PreferredUILanguages`. A place with an empty or
missing `Languages` would get the tag as its only entry. No baseline had one (all four places held `en-US` in every
run), so no rule is added for it.

**D100 (owner, 2026-11-27). Public repository name and schema `$id` unchanged.** When the specification goes public
it moves to the repository `yakbd/kbl-spec`, and the schema `$id` stays
`https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json`, served by that repository's GitHub Pages site. The tool
moves to `yakbd/yakbd-cli` (the binary stays `yakbd`; that name is the owner's, where the review had proposed
`yakbd/yakbd`). Reason for the spec name and `$id` (the review): every example's `$schema` line already
uses that address, and once outside files copy it, it can never change; keeping the name means nothing has to be
rewritten and no published link breaks.

**D101 (owner, 2026-11-27; closes Q13). 0.x compatibility policy; SPEC.md wins over the schema.** No 1.0 freeze yet.
The release is "0.1 preview", under the policy in `COMPATIBILITY.md`: within 0.1 a valid file stays valid and keeps
its meaning, default rules and the default VK table included (fixes that bring the schema in line with SPEC or a
rule in line with its text excepted, and the loss-kind list may grow); a new minor
version (0.2, …) gets its own `kbl` value and its own schema path `schema/0.N/`, while earlier paths stay
published unchanged; every change to the format's shape is announced in the `STATUS.md` changelog. 1.0 comes after
one implementation outside this project, or six months after the first public release, whichever is first. When
`SPEC.md` and the schema accept different files, `SPEC.md` wins and the schema is the bug (Q13, as its interim
answer already said). Reason (the review): a freeze before anyone outside has implemented or used the format would
lock in guesses, while outside readers still need a written promise; the changelog discipline already does most of
the work.

**D102 (owner, 2026-11-27). No layout catalogue: CLDR is the registry.** This project keeps no catalogue or
registry of layouts. YAKBD builds CLDR keyboards for Windows and contributes fixes upstream to CLDR; a `.kbl.json`
layout that is not in CLDR can live in its author's own repository. Reason (the review): CLDR is building the
shared home for keyboard layouts (its keyboard working group's repository on LDML Part 7); a second registry would
compete with it and need moderating for good, which one owner cannot carry.

**D103 (owner, 2026-11-27). Other operating systems later, by demand (superseded in part by D107: other operating systems are planned, not chosen by demand).** Windows stays the only build target of 0.1.
macOS and Linux (XKB) targets are chosen after the public release from what users ask for; D105 checks on paper
that they would fit 0.x. Reason (the review): free tools already serve macOS and Linux authors (Ukelele, kalamine,
Keyman), while for Windows a free tool that builds native layout DLLs for current Windows does not exist; depth
where the project is unique comes before breadth.

**D104 (owner, 2026-11-27; changes D76 for the tool's own installer only; superseded by D112). The tool's setup program is signed; layout
installers stay unsigned.** `yakbd-setup.exe`, which installs the `yakbd` tool, will be signed through a free
open-source signing programme (SignPath Foundation), built on GitHub-hosted runners, each release approved by hand,
and published as an immutable release with build attestations. The installers that `yakbd` builds for layouts stay
unsigned, as D76 says, and the format still has no signing field (a certificate is not layout data). Reason: the
owner chose the review's option C over its recommendation (keep D76 for everything and add guidance, a plain zip
and checksums). The review gave for C: Smart App Control blocks an unsigned installer in the Downloads folder (inst
§11 T12), signed tools get through it and build SmartScreen reputation; against it, a signing process, an identity
check and a dependency on a third party. Layout installers are built by their authors and stay unsigned either way.

**D105 (paper check, 2026-11-27). `targets.macos` and `targets.xkb` would fit 0.x without a breaking change.** No
schema change now. Read for it: Apple's archived technical note TN2056 ("Installing and Using Keyboard Layouts",
the `.keylayout` XML format) and libxkbcommon's keymap text format and Compose documentation (public pages).
What fits the 0.1 model as it is:
(1) Layers, modifier sets and bindings: a `.keylayout` `keyMapSelect` (one key map per set of `modifier keys="…"`)
and an XKB key type (modifier combinations → shift levels) are both "modifier set → table", as `hardware.layers`
is. Shift, Control, Caps Lock map to `shift`, `ctrl`, `caps`; Option to `alt`; the AltGr layer (`altR`) to XKB's
LevelThree.
(2) Dead keys: `.keylayout` actions with states are a dead-key machine; a chained dead key (§10) is a state whose
`next` is another state, and a `<terminators>` output is `noMatch: emitBoth` with the dead key's `spacing`. XKB
keymaps only carry `dead_*` keysyms; the composition table belongs in a Compose file (a separate, locale-dependent
format), which a build would write from `deadKeys`.
(3) Outputs longer than one character: `.keylayout` `output` is a UTF-16 string; xkbcommon allows several keysyms
or a string per level (an extension X11 tools do not support, so an XKB build reports a loss there).
(4) Key codes: neither target uses PC scan codes as such (`.keylayout` uses decimal virtual key codes; XKB names
keys `<AE01>` and gives each a keycode, evdev's plus 8). They would sit per position in the target section, as
`targets.windows.keys.<p>.vk` does (`targets.macos.keys.<p>.keyCode`, `targets.xkb.keys.<p>.name`), with a fixed
default table from position names like Table A (D16, D29).
(5) Command (macOS) and LevelFive, Super, Hyper (XKB): no built-in component, but `customModifiers` (`held`, with
its positions) can declare them; the target section would name which component is which, as
`targets.windows.modifiers.kanaLockComponent` does.
What would need new fields, all of them additive (new optional members or enum values, no existing field changed,
no valid 0.1 file made invalid): the two target objects themselves in `targets` (a closed object, D3); their
target-only data (`.keylayout` `group`, `id`, `maxout` and the hardware-type `layouts` → key map sets, which `forms`
do not select; XKB type names, `preserve`, a keysym per dead key); new loss-kind families (`macos.*`, `xkb.*`, and
importer kinds) in §17.3 and in the closed `onLoss` kind list; `metadata.provenance.format` values for the new
importers (until then `other`). Known losses, not model gaps: `.keylayout` range actions (`through` /
`multiplier`, e.g. hex input) have no counterpart and an importer would expand or report them; one `.kbl.json` file
is one layout, so an XKB keymap with several groups imports as several files; a layer for the right Shift key only
(`rightShift`) needs a custom component, since `shift` does not distinguish sides (§7.1). Because a 0.1 reader
rejects unknown properties (D3), these fields come with a minor version (0.2 or later, own schema path, D101).

**D106 (owner, 2026-11-27). The repository's site serves only the schema, plus a moving `latest`.** GitHub Pages
for this repository publishes only `schema/`, through `.github/workflows/pages.yml`; the other files are no longer
rendered as web pages (the documentation is read in the repository and on https://yakbd.github.io/). The workflow
also writes `schema/latest/kbl.schema.json`, a byte-identical copy of the newest `schema/<version>/` folder's
schema (by version order), at deploy time rather than as a second committed copy. Its `$id` stays the versioned
URL, because it is that schema (D100). `latest` moves to each new minor version: files and tools that need
stability name the versioned path (`COMPATIBILITY.md`). Reason: the `$id` must keep resolving byte for byte while
the README and specification stop appearing as unstyled pages next to the website, and a convenience address for
"the current schema" must not drift from the file it copies.

**D107 (owner, 2026-11-27; supersedes the "by demand" part of D103). YAKBD is for every keyboard-layout format;
operating systems' official formats first, third-party formats later.** `.kbl.json` is the one open format, and the
tool converts it to and from the layout formats of operating systems and keyboard tools and builds native,
installable layouts. The order: Windows first (today: `.klc`, CLDR XML, DLL import, native DLL builds and
installers); next the official formats of other operating systems (macOS `.keylayout`, Linux XKB, and others such
as ChromeOS or Android where they have one); later third-party formats such as Keyman. MSKLC migration stays a main
use case, as one way in, not as the project's definition. This replaces D103's "chosen after the public release
from what users ask for": other operating systems are planned, not waiting for demand. D103's other facts stand:
Windows is the only build target of 0.1. D105's paper check stands unchanged and is the starting point for the
macOS and XKB sections; as D105 says, they come with a minor version (0.2 or later, own schema path, D101).
Reason (the owner): YAKBD's aim is that a custom or minority-language layout can be made, shared and kept up to date
by anyone, on every platform, without depending on a single vendor's tool.

**D108 (2026-11-28; carries out D101 and D107 for the macOS and XKB targets). Version 0.2: own `kbl`, own schema,
holds 0.1.** The macOS and Linux XKB targets come together in one minor version, 0.2: `kbl` `"0.2"`, schema
`schema/0.2/kbl.schema.json`, `$id` `https://yakbd.github.io/kbl-spec/schema/0.2/kbl.schema.json`. Each schema
accepts only its own `kbl` value and a file is checked against the version it names (SPEC §1.1). 0.2 only adds
(`targets.macos`, `targets.xkb`, the loss-kind families `macos`, `macosDefault`, `xkb`, `xkbDefault`, the provenance
formats `keylayout` and `xkb`), so a valid 0.1 file with its `kbl` changed is a valid 0.2 file with the same meaning;
the checker tests this on every 0.1 example and valid 0.1 case. A reader rejects a `kbl` it does not implement (as
D3 rejects unknown members: never guess), so a 0.1 reader rejects 0.2 files, and a 0.2 reader MUST read 0.1 files.
A tool writes the lowest version that holds what it writes, so files that use nothing new stay readable by 0.1
tools. Both schemas come from the one source `src/schema.ts`: the parts that differ (the onLoss kind list, the
provenance formats, `targets`, `kbl`, `$id`) are built per version, the rest is shared, and the checker pins the
SHA-256 of the generated 0.1 file (changed only for what `COMPATIBILITY.md` allows within 0.1), so a shared edit that reaches 0.1 fails `npm test` instead of silently
republishing 0.1 (D100, D106). 0.2 is a draft until it is tagged. Reason: one minor version per set of new targets is
what D101 and D105 planned; the superset rule spares tools a second code path for 0.1, and a frozen copy of the 0.1
source was rejected because two copies of 1,200 lines would drift; the hash makes the freeze mechanical.

**D109 (2026-11-28; generalises D16 and D29). One position table per target, one target pattern.** Table A
(position name → Windows virtual key, `targets/windows-default-vk.tsv`) becomes the first of one fixed default table
per target whose native format has its own key codes: `targets/macos-default-keycode.tsv` (`.keylayout` key code),
`targets/xkb-default-keyname.tsv` (XKB key name), later ones by the same pattern. Each table is a tab-separated file
with comment lines citing its sources, a header `position`, the target's code, further columns, `source`; positions
and codes unique, every row sourced. The target's document `targets/<target>.md` names its table in a "Position
table" section. Drift: this repository's checker checks every table's shape; a tool embeds an unchanged copy and a
test compares it byte for byte with the file at the release tag the tool names (as the Windows tool already does for
Table A). Table A keeps its name and columns. Every build target also has a `## 1. Rule index` in its document
(rules reported as `<target>Default.<rule>`, checked against the schema) and a coverage page `coverage/<target>.md`
(SPEC §16). Reason: the format names physical keys only by position (D8), so each target needs exactly one mapping to
its own codes, and the Windows mechanism (fixed table, one copy, a byte test) has already kept tool and specification
in step.

**D110 (2026-11-28; extends D12). One dead-key model feeds every target.** `deadKeys` (SPEC §10) and the dead-key
machine of §14.2 are the only dead-key model. Each target builds its own form from it (Windows dead-key tables,
`.keylayout` actions and states, XKB `dead_*` keysyms with Compose sequences) and documents the mapping in a
dead-key section of its `targets/<target>.md`, with a loss kind for each part of the model its form cannot express. No
target adds a second model; its section holds only what its form needs beyond the model (as `targets.windows.deadKeys`
holds the dead character). Reason: a layout typed the same way on every platform needs one
source of truth; D105 found that both new forms are views of the same machine (chained states, `noMatch`, spacing).

**D111 (owner, 2026-11-28). Clean room for macOS and Linux: any public source, no copied code.** For macOS and
Linux facts, any public source may be read: documentation, specifications, public repositories and source code of
any licence (GPL included), public mirrors of headers, and reference tools for their behaviour. Code and long prose
are never copied; text and code are written from understanding. Every source read is recorded in `CLEAN-ROOM.md`,
in the subsection of its platform (URL, what for, licence). Fixtures come only from openly licensed corpora; layouts
owned by the platform are read on the platform and never committed. The Windows rules are unchanged (the reference
specification and Microsoft's public documentation only).

**D112 (owner, 2026-11-28; supersedes D104). Releases are not code-signed.** The free open-source signing programme
D104 relied on found that the project does not qualify, and no other free signing is available, so signing is dropped
until further notice, as for most software on GitHub. No file of a release is signed: not the tool's or the editor's
installers, not the programs they install, not the macOS and Linux downloads. D76 applies to the tool's own
installer again, as it always did to the layout installers; the format still has no signing field. Releases are
checked with their `SHA256SUMS` file and build provenance attestations. The text of D104 is kept as it was.

**D120 (2026-11-28; carries out D105 and D109 for macOS). The macOS target: fields and default rules.**
`targets.macos` (SPEC §16.4) holds what a `.keylayout` and its bundle need beyond the general data: the names and
ids of the bundle (`layoutName`, `bundleName`, `bundleId`, `inputSourceId`, `language`, `localizedNames`,
`bundleVersion`, `icon`), the `keyboard` attributes D105 named (`group`, `id`, `maxout`), the hardware ranges, a key
code per position (`keys.<p>.keyCode`, D105's name), the choices for states no layer serves (`standardKeys`,
`commandMap`, `controlMap`), which custom component is Command (`modifiers.command`, as D105 proposed) and a
state name per dead key. Seventeen default rules (`targets/macos.md` §1), each one line, reported as
`macosDefault.<rule>`; 21 loss kinds `macos.*` (SPEC §17.3). The icon is held in the file as base64 because a file
is self-contained (SPEC §1, D2). Reason: the Windows pattern (D16) has worked; the file carries the complexity, the
rules stay knowingly simple.

**D121 (2026-11-28). The macOS position table and the ISO keys.** `targets/macos-default-keycode.tsv` takes its 119
key codes from the Mac column of Chromium's table of W3C code values, each checked against the `kVK_*` constant of
the same value in Apple's `Events.h`, and the standard outputs of Return, Tab, the arrows, the number pad and the
function keys from an MIT-licensed generated layout (Kiimo); sources per row. macOS delivers codes 10 and 50 swapped
from ISO keyboards (SDL's table, Mozilla bug 1263302), so rule `isoKeys` swaps the two codes of `Backquote` and
`IntlBackslash` when the file binds `IntlBackslash`, and leaves the table's (ANSI) codes otherwise. Rejected: one key
map set per hardware type (ANSI, ISO, JIS), which would make every build carry three sets for one key pair; a file
that needs exact codes on both kinds of keyboard pins them. Not measurable on the runners (they type by key code).

**D122 (2026-11-28). One key map per distinct state; Caps Lock per key is not a loss.** The build enumerates the
32 combinations of `anyShift`, `anyOption`, `anyControl`, `command`, `caps`, resolves every key in each (SPEC §9.3)
and lets equal tables share a key map, each state written as an explicit `<modifier>`. A Caps Lock state has its
own key map filled key by key, so the planned loss "Caps Lock can only select a whole table" never happens: Caps Lock
on one key and not another, `capsLockFallback` and explicit nothings are all exact. Sides (`ctrlL`, `altR`, …) are
built with the "any" words and reported (`macos.sideModifierWidened`) because whether right-hand states reach a
layout is not measured; Option is `alt`, so a Windows AltGr layer (`altR`) becomes the Option layer.

**D123 (2026-11-28). Command and Control states no layer serves.** Without rules, a layout drawn without Control or
Command layers would type nothing with those keys held, which breaks shortcuts and control characters. Rule
`commandMap` (default `withoutCommand`: the same state without Command) and rule `controlMap` (default
`controlCharacters`: the state without Control, letters turned into U+0001–U+001A, as Windows does) fill exactly the
states no layer serves; a layer that serves a state always wins. Rule `standardKeys` gives unbound standard keys
their table outputs (as Table A rows do on Windows, D86).

**D124 (2026-11-28; carries out D110 for macOS). Dead keys become one `.keylayout` state machine.** Each dead key is a
state; an entry is a `when` in the action of every key whose output is its base; a chained result is `next`; the
terminator is the spacing under `emitBoth` and `emitSpacing`. Where macOS would act differently from SPEC §14.2 (a
second dead key while one is pending starts the second one; `emitSpacing` and `emitNothing` would still type the
key), the build writes explicit `when`s that give the model's result (`macos.deadKeyNoMatchExpanded`). Files are
written as XML 1.1, because the C0 controls of standard keys are character references that XML 1.0 forbids.

**D125 (2026-11-28). Bundle names and ids by rule.** Bundle id `org.yakbd.keyboardlayout.` + slug of `metadata.id`,
input-source id = bundle id + slug of the layout name (a source id that extends the bundle id, as the measured
check bundles and Kiimo do), `group` 126 and a negative `id` from an FNV-1a hash of the input-source id (TN2056:
Unicode layouts are group 126 with negative ids; the hash keeps it the same on every build). An author who owns a
domain pins `bundleId`.

**D126 (owner, 2026-11-28; measured). macOS release form and installation.** The release form is a zip with the
bundle and a README (owner); an installer package may follow. Measured on GitHub's macOS 15 and 26 runners
(`targets/macos.md` §5): no sign-out is needed for a scripted install (register, then the `AppleEnabledInputSources`
entry, then select from a new process), and an unsigned bundle is not blocked. The by-hand path through System
Settings is not measured yet; the README tells the user to sign out and in if the layout does not appear.

**D127 (2026-11-28). `.keylayout` import keeps one key map set.** One `.kbl.json` file is one hardware layer set,
so the importer takes the first `<layout>`'s modifier map and key map set and reports the others
(`macos.keyMapSetDropped`); it evaluates modifier maps over all combinations, folds right-hand states into the left
(`macos.sideModifierDropped`), writes Command and Control layers only where rules `commandMap` and `controlMap`
would not give the same tables, and writes `capsLockFallback: false` so that Caps Lock layers mean exactly their key
maps (`coverage/macos.md`). Range actions have no home and are dropped (`macos.rangeActionDropped`), as D105 said.

**D128 (2026-11-28; measured; changes D120's rule `maxout`). `maxout` counts each output on its own.** Rule
`maxout` gives the longest single output (a terminator, a key or a `when` output), no longer the longest terminator
plus the longest output. Measured on macOS 15 and 26 (`targets/macos.md` §5, §8 item 7): with `maxout` 2 a
terminator of one unit and a key output of two units are both typed in one key press, so macOS applies `maxout` to
each output. `macos.outputBeyondMaxout` is reported when one output is longer than a pinned `maxout`.

**D129 (2026-11-28; measured; changes D124 for `emitNothing`). An empty output is `output=""`.** A `when` that
emits nothing is written `<when state="D" output=""/>`. Written as `<when state="D" next="none"/>`, the layout was
rejected as a whole (never listed, no reason logged); a `when` whose only `next` names a state that no `when` or
terminator defines was rejected too, and `output=""` was listed and typed nothing (`targets/macos.md` §4, §8 item 2).
TN2056 allows either form; macOS does not.

**D130 (2026-11-28; measured). Facts measured on the runners.** Right Shift and Right Option reach a layout as the
left-hand state, so the "any" words are right and D122's widening (`macos.sideModifierWidened`) stays; this was
measured with posted events carrying the right-hand device bit, not with real hardware. A localised name is read
from a hyphenated `.lproj` folder (`en-US.lproj`) and from a UTF-8 `InfoPlist.strings`. A key with no output while a
dead key is pending makes macOS emit the terminator and return to the base state, where the model (SPEC §14.2) keeps
the dead key pending; the build does not yet compile around this (`targets/macos.md` §4, §8 item 1).

**D131 (2026-11-28; carries out D130). A key without output that ends a pending dead key is reported.** The build
still writes nothing for a key code that types nothing in a key map, so on macOS such a key ends a pending dead key
(the terminator is typed) where the model keeps it pending. The build reports `macos.deadKeyEndedByEmptyKey`, a
warning, once per build when a dead key is reached and a key code of the position table that is not a modifier, or
a pinned code, has no output in some key map; the dead keys are in `detail`. The simple rule reports almost every
layout with dead keys, which is the honest default; a file can accept it or make it an error. Compiling such keys
as `<when state="D" next="D"/>` (which might keep D pending) waits for a measurement (`targets/macos.md` §8 item 8).

**D135 (2026-11-28; carries out D105 and D109 for Linux). The XKB target: fields and default rules.** `targets.xkb`
(SPEC §16.5) holds what a symbols file, its registry entry and its Compose file need beyond the general data: the
names (`symbolsName`, `variant`, `description`, `shortDescription`, `languages`), how characters are written
(`characters`), a key name and a key type per position (`keys.<p>.keyName`, `keys.<p>.type`, D105's names), whether
yakbd key types may be written (`customTypes`), which components shift levels 3 and 5 (`modifiers`), a keysym per
dead key and the Compose choices. Ten default rules (`targets/xkb.md` §1), reported as `xkbDefault.<rule>`; 35 loss
kinds `xkb.*` (SPEC §17.3). The default symbols name is `yakbd-` + slug of `metadata.id`, so that a user file never
hides a file of xkeyboard-config (before libxkbcommon 1.9 that breaks the system layout). Reason: the pattern of D16
and D120; the rules stay simple and the file carries the rest.

**D136 (2026-11-28). The XKB position table.** `targets/xkb-default-keyname.tsv` joins the XKB column of Chromium's
table of W3C code values (the X keycode, evdev + 8) with the key names xkeyboard-config's evdev keycodes give those
codes: every Table A position except `SysRq` and `Break`, which XKB has only as levels of `<PRSC>` and `<PAUS>` (the
checker wants unique codes), plus the positions of Appendix A that Table A lacks and `Lang1`, `Lang2`, so that ISO,
ABNT2 and JIS layouts build. It also lists each key's aliases (for importers) and the navigation keysym of the
number-pad keys (for `numLock` positions).

**D137 (2026-11-28). Key types: exact where the stock types reach, yakbd types only on request.** The build resolves
every key in every combination of Shift, Caps Lock and the two level shifts (SPEC §9.3) and takes the first stock
type that gives each combination its output, without ever relying on the upper-casing that libxkbcommon and Qt apply
when a type leaves Lock unconsumed (GTK 4 on X11 does not, measured). For Caps Lock on letters this is exact except
where the file wants Caps Lock to leave a level-3 letter alone: no stock type does that (FOUR_LEVEL_SEMIALPHABETIC
preserves Lock and gives Þ, measured). Such keys get the closest stock type and `xkb.capsLockNotExpressible` by
default. With `customTypes` the build writes a yakbd type named by its level map (`YAKBD_12213434`, every modifier
consumed, so one name always means one type), installed through a types file and a `rules/evdev.post` rule set.
Rejected: yakbd types by default, as macOS makes Caps Lock exact by default (D122), because the `.post` rules need
libxkbcommon 1.13 and Debian 13 ships 1.7.0 (measured), where the key silently gets its automatic type, and because
the user's `rules/evdev.post` is a file all layouts share.

**D138 (2026-11-28). One function from character to keysym.** Characters are written as keysym names and `U`
keysyms by default, because libxkbcommon before 1.9 (Debian 13: 1.7.0) and `xkbcomp` reject UTF-8 strings
(measured); `characters: "utf8"` writes strings and reports `xkb.utf8Characters`. The keysym of a character is the
one libxkbcommon itself gives it (the named keysym of xorgproto's `keysymdef.h` where one exists, else `U` +
hex), in the symbols file and the Compose file alike: Compose matches keysyms by value, and a `U0153` key would not
meet the system's `oe` sequences.

**D139 (2026-11-28; carries out D110 for Linux). Dead keys become `dead_*` keysyms and the file's Compose
sequences, nothing more.** Each dead key a key types gets a `dead_*` keysym (`dead_` + its id, else by its spacing,
else a spare one); each entry becomes a sequence, a chained result a longer sequence, a cycle is cut
(`xkb.deadKeyChainCut`). `noMatch` is not compiled (`xkb.deadKeyNoMatchNotCompiled`): a Compose file is per user,
not per layout, so sequences that force `noMatch` onto every other key would change the user's other layouts, and
what a program types for an unmatched sequence is its input method's choice. The file begins with `include "%L"`
so the user's other layouts keep the system's sequences (`xkb.systemComposeSequences` says what that adds). GTK 4
under sway, KWin and mutter without an input method drops dead keys (measured): `xkb.deadKeyStacks` on every build
with dead keys.

**D140 (2026-11-28). Linux installation: the user path, merged with care.** The release form is an archive with the
files of `targets/xkb.md` §5 and an install script for `~/.config/xkb/` (no root; every Wayland stack measured reads
it). The registry `rules/evdev.xml`, the `rules/evdev.post` rules and the Compose files are shared by all of a
user's layouts, so the script adds and removes marked blocks and never rewrites the user's lines; when the user has
no Compose file it installs `~/.XCompose`, which GTK and libxkbcommon both read (measured), otherwise it appends the
sequences to each Compose file that wins for some toolkit (measured order: GTK `~/.config/gtk-4.0/Compose` first,
libxkbcommon and Qt `~/.config/XCompose` before `~/.XCompose`). X11 sessions load the layout with
`setxkbmap -I … | xkbcomp -I …` (measured). The package directory `/usr/share/xkeyboard-config.d/` (libxkbcommon
1.13) is described for later `.deb` and `.rpm` packages.

**D141 (2026-11-28). Control and Alt layers are left out; Num Lock keys use `KEYPAD`.** XKB levels serve text;
programs read Control and Alt shortcuts from the levels themselves. So modifier sets with Control, or with an Alt
key that is not the level-3 shift, are not compiled (`xkb.controlAltLayerDropped`), and a `held` custom component
must be the level-3 or level-5 shift (`xkb.modifierUnmapped`). `numLock` positions are written with the `KEYPAD`
type and the table's navigation keysym (`xkb.numLockKeyReduced`).

**D142 (2026-11-28). XKB import conventions.** One section per `.kbl.json` file; includes inlined from the files the
importer is given; levels read per state through the key's type (or libxkbcommon's automatic type), upper-casing
where the type leaves Lock unconsumed; Caps Lock layers only where they differ (`capsLockFallback: true`); level
shifts on other keys than `<RALT>` become custom components; dead keys named after their keysym, longer Compose
sequences become chained dead keys, `noMatch` `emitNothing`; `normalization: "disabled"`; the importer pins the
rule-decided values (`coverage/xkb.md` §6).

**D143 (2026-11-28; measured). Levels of several characters: an X11 section.** An X11 server
refuses the whole keymap when one level has several keysyms (Xvfb 21.1, `XkbSetMap` fails); the text said such a
level just became empty. Making the loss an error would fail every layout with a ligature key, although Wayland,
libxkbcommon and Qt type it. So a build with such levels writes the symbols file as before and adds a second section,
`<variant>-x11`, the same with those levels `NoSymbol`; the X11 instructions load that section. `xkb.multiCharacterOutput`
stays a warning and says so. Whether X11 loads the section is a harness case (`targets/xkb.md` §8 item 11).

**D144 (2026-11-28; changes D140). Install blocks per layout and variant; the symbols file in blocks.** The variants of
one layout share the symbols file and the registry `layout` of that name, so blocks named by the layout alone let one
variant's install or uninstall remove another's. Every marked block is named N for the default section and `N(V)` for
a variant (names cannot hold `(`), and the symbols file itself is assembled from blocks: each build adds its
section(s) to `~/.config/xkb/symbols/N` between markers, and uninstall removes the file only when no block is left.
Registry blocks are self-contained `layout` elements; libxkbcommon's registry merges elements of one name.

**D145 (2026-11-28). Positions a target has no key for are left out with a warning.** Every `.kbl.json` converted from a
`.klc` file binds `Break` (the Control+Break row MSKLC adds to every layout, D36), which neither the macOS nor the XKB
table has; `keyCodeMissing` / `keyNameMissing` made every such layout fail. The rule stays mechanical: a bound position
without a code that has a row in another target's position table (SPEC §16) is a key the target does not have, reported
as `macos.positionWithoutKey` / `xkb.positionWithoutKey` (warning) and left out; a position no table names still needs a
pin (`keyCodeMissing` / `keyNameMissing`, error).

**D146 (2026-11-28; measured; changes D143). Nothing is `VoidSymbol`; `CTRL+ALT` for the keys that carry it.**
libxkbcommon merges a layout's key with the key of the same name that `symbols/pc` and the rules' other files define,
and fills every `NoSymbol` level from it: a Numpad1 bound in the base layer only typed `KP_1` with Shift, and
`<LSGT>` has four levels there. A level that types nothing is therefore `VoidSymbol` and every level of the key's
type is written. F1 to F12 and the number-pad operators have the type `CTRL+ALT` there (five levels, the fifth for
Control+Alt: switching the virtual terminal, grabs); on the operators that level carries actions, so a key written
with a type of fewer levels makes an X11 server refuse the whole keymap (every converted `.klc` file binds them).
Rule `keyType` tries `CTRL+ALT` first for those sixteen keys and writes its fifth level `NoSymbol`, which keeps the
system's action. The X11 section of D143 empties levels as `VoidSymbol` too: a key whose levels were all `NoSymbol`
kept its five-level type and the server refused the section.

**D147 (2026-11-28; measured). Unicode keysyms are written `U` + hex.** xorgproto keeps naming Unicode keysym values
(0x01000000 + code point): `leftsingleanglequotemark` for U+2039 is new in 2026.1, and libxkbcommon 1.7.0 and 1.13.1
read it as `NoSymbol`. The value is the same either way, so rule `characters` writes such a keysym as `U2039`, which
every version reads; step 3 takes only named keysyms below 0x01000000.

**D148 (2026-11-28; measured). Compose for GTK; Caps Lock in GTK on X11.** GTK 4 reads `~/.config/gtk-4.0/Compose`, else
`~/.XCompose`, and never `~/.config/XCompose`: with only that file present, a layout's appended sequences reached
libxkbcommon and Qt but not GTK. The install script's GTK target is therefore `~/.config/gtk-4.0/Compose` when it
exists, else `~/.XCompose`, created with `include "%L"` when missing. Separately, GTK 4 on X11 types the upper case
of a letter that Caps Lock should leave lower case with every key type tried, stock and yakbd; no type avoids it, so
the build reports it (`xkb.capsLockStacks`) instead of changing the rules.

**D149 (2026-11-28; measured). A variant of a system layout is reported.** A user symbols file N that holds only a
variant hides the system's N: libxkbcommon 1.7.0 and 1.13.1 then give the variant for N alone (1.13.2 the system
layout). No file in the user path can include the system's N (the name resolves to the user file), so the build
reports `xkb.systemLayoutShadowed` for a variant whose symbols name does not begin with `yakbd-`. The build also
accepts a real U+FFFD (keysym `UFFFD`); only code units that are not well-formed UTF-16 are `xkb.outputUnencodable`.

**D150 (2026-11-28; carries out D101, D107 and D108 for Android, iOS, ChromeOS and Keyman). Version 0.3: own `kbl`,
own schema, holds 0.2; the names of five targets and four formats.** Android (physical and on-screen), iOS, ChromeOS,
Keyman and the touch geometry they share come together in one minor version, 0.3: `kbl` `"0.3"`, schema
`schema/0.3/kbl.schema.json`, `$id` `https://yakbd.github.io/kbl-spec/schema/0.3/kbl.schema.json`, the same rules as
D108 (each schema accepts only its own `kbl`, a reader rejects a version it does not implement and reads every older
one as the newer file it becomes, a writer writes the lowest version that holds the file). 0.2 is now frozen like
0.1: the checker pins the SHA-256 of both generated files, and every example and valid case of a version is checked
again as each later version. The names are a public contract from now on: targets `android` (a `.kcm` key character
map for physical keyboards, in an APK without code), `androidime` (an on-screen input-method APK), `ios` (an app with
one keyboard extension), `chromeos` (a `chrome.input.ime` extension), `keyman` (a `.kmp` package); conversion
formats `kcm`, `kbdgen`, `kmn`, `keymantouch` (SPEC §16.11), which are also their `metadata.provenance.format`
values. Each target is a closed object of its own in `targets` that starts with only `onLoss`; loss-kind families
`android`, `androidime`, `ios`, `chromeos`, `keyman` with their `<target>Default` kinds, and `kbdgen`, `kmn`,
`keymantouch` for the formats (the `.kcm` importer reports under `android`, as the `.keylayout` importer does under
`macos`); every wildcard is accepted from the start so that a file can set a policy before the kinds exist. One
`.kbl.json` file is one layout: a target builds exactly one installable keyboard from it, and an importer of a
bundle or package that holds several layouts writes one file and one report per layout. Reason: two Android targets,
not one, because the two builds have different inputs (hardware layers by key code, touch layers by KeyId), different
default rules and different loss kinds, and both APKs of one layout install side by side; `androidime` reads as
"Android input method" and does not collide with Android's own term for physical layouts. Format names follow the
file suffix (`kcm`, `kmn`) or the tool's own name (`kbdgen`); `keymantouch` names the `.keyman-touch-layout` file, a
format of its own next to `.kmn`.

**D151 (2026-11-28; extends D109). Touch-only targets have no position table.** An on-screen keyboard names keys by
KeyId in the rows of `touch`; positions name physical keys only (D8). So `androidime` and `ios` have no position
table and no position-keyed `keys` member, and no coverage page of their own (the build writes an app, not a file of
a native format; the compiled form the runtimes read is documented with those targets). The Android input method's
physical-key mode reuses the `android` table and the pins `targets.android.keys`, so both Android builds of one file
map positions to key codes the same way. A target page or coverage page may be named after its native format where
that has a name of its own (`coverage/kcm.md` for `android`). Reason: one mapping per kind of key code (D109);
a second Android table would be a second source of truth for the same `KEYCODE_*` names.

**D152 (2026-11-28). The touch core of 0.3: what two platforms share, nothing more.** Added, all optional and all
0.3-only: on a key `hint`; on a touch layer `rowHeights` and `returnLayerId`; on a touch set `orientation`,
`deviceClass` and `systemRow`; the `function` value `nextKeyboard` (D153). The test for a member was that at least
two of the touch platforms and formats of this version carry the concept (Android's own keyboard and Divvun's
keyboards, the iOS keyboard extension, Keyman touch layouts, kbdgen bundles): row heights (Android rows, iOS keys,
Keyman rows implicitly equal), orientation (Android resource qualifiers, iOS), device classes (kbdgen, Keyman),
corner hints (Android, Keyman, kbdgen), one-shot layers (Keyman's next layer, Android's one-shot shift), the
runtime's bottom row (iOS, kbdgen templates). Left to the targets: return-key labels per input field, popup
column counts, fonts, themes, sounds, number-row hints. Not added: a per-key height (one platform; a key never
spans rows), a shift-state field (D155), `symbols` and `spacer` functions (a layer switch key is a key with
`layerId`; a spacer is a `gap`), an `emoji` function (no shared behaviour: one platform's emoji keyboard is the
system's, another's is the app's own). Every addition is exportable: CLDR keyboard 3.0 has no attribute for any of
them (its `key` element has only id, flickId, gap, output, longPressKeyIds, longPressDefaultKeyId, multiTapKeyIds,
stretch, layerId and width; LDML Part 7), so the CLDR writer carries them in its `<special>` element and reports `cldr.touchDataDropped`, and 0.3 stays
a superset of CLDR. Defaults are the plain ones (rows equal, no return, both orientations, no system row, no hint),
which are what a 0.2 file means, so no default is reported except the derived device class (D154). Reason: the
format holds what a build needs across platforms; one platform's detail belongs in its own target section.

**D153 (2026-11-28). One new key function: `nextKeyboard`.** The key that switches to the system's next keyboard
or input method (the globe key) has no output and no layer, and every touch platform needs to know it: iOS requires
it when the system asks for one, Android and Keyman have the same action. It is the only new `function` value.
Reason: D152's test; the other candidate kinds are already expressible or not shared.

**D154 (2026-11-28). `minDeviceWidth` keeps CLDR's meaning; orientation selects; the device class is a label.**
CLDR defines `minDeviceWidth` as the minimum width of the touch surface in millimetres and chooses the set with the
greatest width that is met (LDML Part 7). That stays the rule for every version, so an imported CLDR file means what
it meant. 0.3 adds `orientation` as a second filter: a set naming an orientation is only a candidate in that
orientation, and of two sets with the same width the one naming the current orientation wins. So a file that wants
a phone in landscape to keep its phone layout says so with orientations rather than with widths. Sets are distinct
per width and orientation. `deviceClass` (`phone`, `tablet`) never changes the selection; a writer of a format
that sorts layouts by device class derives a missing class (`tablet` from 90 mm, about a 7-inch tablet's narrow
side) and reports `general.deviceClassDerived`. Reason: no change to an existing meaning (0.3 is a superset of CLDR
and holds 0.2); the label exists only for formats that need it, and the derivation is deliberately crude and
reported. A first draft of this entry, pushed briefly, made the width the screen's shorter side; that would have
changed the meaning of CLDR files and was withdrawn before any tool used it.

**D155 (2026-11-28). Shift and caps lock on touch keyboards: one-shot layers and multi-tap, no shift state.** A
layer with `returnLayerId` is left after one key that has no `layerId` of its own; that is one-shot shift. Caps
lock is a double tap of the shift key, written with the existing `multiTapKeyIds`: the second tap presses a
`capsLock` key that switches to a caps layer which does not return. For that, SPEC §14.4 says that a multi-tap
sequence continues on the same place after the first tap switched layers (a 0.3 rule; for 0.1 and 0.2 files the
sequence is CLDR's, on one key). Reason: no new state machine; the file says exactly which layer each tap reaches, and a layout that wants no
caps lock, or a different one, writes that.

**D156 (2026-11-28). The system bottom row is the target's when the file says so.** `systemRow: true` on a touch set
means its rows leave out the bottom row (next keyboard, layer switch, space, enter) and the target adds its
platform's own; the default `false` means the rows are the whole layout, as in CLDR and in every 0.2 file. What the
added row holds, and what a target does when the file has no next-keyboard key that the platform requires, is the
target's (its document, reported as its default). Reason: kbdgen bundles and iOS templates leave that row to the app,
CLDR files include it; the flag lets both import without inventing keys.

**D200 (2026-11-28). The on-screen targets compile to a touch runtime file; the compiler resolves, the runtime
runs.** `compile -target androidime|ios` writes one JSON file (`targets/touch-runtime.md`, schema
`schema/touch-runtime/1/touch-runtime.schema.json`) and embeds it in an app built around a prebuilt YAKBD runtime;
the runtimes never read `.kbl.json`. The file has its own integer version `touchRuntime` (1), independent of `kbl`;
any change of shape or meaning is a new version, a runtime declares the versions it reads in a manifest
(`assets/yakbd/runtime.json` in an APK, `yakbd-runtime.json` in a source folder), and the compiler refuses a runtime
that does not list the version it writes. Version 1 stays a draft until 0.3 is tagged. Reason: one resolver (the Go
tool) instead of three (Go, Kotlin, Swift) that would drift; the file is an internal contract, never carried by
users, so it needs no compatibility promise beyond "the pinned runtime reads it". The other choice, runtimes reading
`.kbl.json` directly, would put a full resolver for defaults, implied keys, variables and SPEC §9.3 into each
runtime.

**D201 (2026-11-28). Geometry, labels and ids are resolved at build time.** The runtime file gives each placed key
its left edge and width as fractions of the keyboard width and each row its top and height as fractions of the
keyboard height, computed with SPEC §9.4's widest-row and stretch rule after the system row is added; a final label
per key (displays, dead-key display, output, layer id); and a placement id (KeyId, `KeyId#n` for repeats in one
layer) that the iOS runtime uses as accessibility identifier and the Android runtime in its key-rectangle report.
Keys the compiler makes have ids beginning with `@`. The one geometry step left to a runtime is hiding a
next-keyboard key the platform does not want (its width goes to the row's space key). The set is chosen at run
time (the screen is known only then), by SPEC §14.4 with the width in millimetres reckoned as dp or points × 25.4 /
160 on both platforms (iOS reports no physical size; iPads count about a fifth narrower). Reason: Kotlin and Swift
place keys alike and test harnesses know where every key is.

**D202 (2026-11-28). Transforms become literal suffix rules; markers are noncharacters; no normalisation at run
time.** The compiler expands each CLDR transform whose pattern uses only literals, variables, finite classes, one
capture group around a class, `$1` and `$[1:set]` into at most 1024 literal rules; quantifiers, alternation,
negated classes, anchors and `reorders` are left out (`<target>.transformNotCompiled`). Markers are written as the
noncharacters U+FDD0–U+FDEF (at most 32, `<target>.tooManyMarkers`) and live only in the runtime's own context,
seeded from the text before the insertion point and reset when the text or selection changes without it. Outputs are
NFC-normalised at build time, as on Windows (D73). Reason: a runtime then needs suffix comparison only, no pattern
engine; the common CLDR uses (dead-key-like transforms over a vowel set, markers as pending accents) still compile;
what does not is reported.

**D203 (2026-11-28). Android's physical-key mode is a table per modifier state.** For the five modifiers Android key
events tell apart for this purpose (Shift, Caps Lock, Control, left Alt, right Alt) the compiler resolves SPEC §9.3
for all 32 states and writes, per state that has keys, key code name → input; the runtime looks up the exact state
and passes everything else to the application. In a state with Control or left Alt the `["other"]` layer does not
apply, so shortcuts reach applications. Key codes come from the `android` target's table and pins (D151). Custom
modifiers are not compiled (`androidime.modifierUnmapped`). Reason: no resolution logic in the runtime; the table is
small.

**D204 (2026-11-28). Names and ids of the on-screen builds come from the layout file, with simple defaults.**
`targets.androidime`: `packageName` (default `org.yakbd.keyboard.<slug with _>.ime`; Android package segments allow
no hyphen), `appName`, `language`, `versionCode`, `versionName`; `targets.ios`: `appName`, `bundleId` (default
`org.yakbd.keyboard.<slug>`), `extensionBundleId` (default `<bundleId>.extension`; it must begin with `bundleId.`,
`ios.extensionBundleIdNotPrefixed`), `language`, `bundleVersion`. The Apple team id and the Android signing key are
the builder's and are options of the build, never fields of the file. Reason: one layout file gives one keyboard per
platform (D150); names that identify an app belong to the layout's publisher, who registers them (developer
verification, App IDs); the defaults are for one's own builds and are reported.

**D205 (2026-11-28). Presentation fields are few and shared: Return-key labels, popup columns, the system row.**
`returnKeyLabels` (per field action of the platform: Android's editor actions, iOS's return key types; default
English words and ⏎), `popupColumns` (default 8) and `systemRow` (the keys of the bottom row added to a set with
`systemRow`: `layerSwitch`, `nextKeyboard`, `space`, `enter` or a key of the file; default those four). There are no
theme, font, sound or haptic fields: the runtimes follow the system's appearance. Reason: these are the per-target
choices both platforms need to build a usable keyboard (cut to what a build
cannot do without); everything else is the runtime's.

**D206 (2026-11-28). A file without touch sets gets a crude one (`touchFromHardware`); iOS inserts a next-keyboard
key.** Both on-screen targets derive one set (system row, base and one-shot shift layers, four rows of positions
from the digit row to the bottom letter row, Shift and Backspace in the last row) from the hardware layers without
modifiers and with Shift; other hardware layers are reported (`<target>.layerNotDerived`); a file with no layers at
all cannot be built (`<target>.noTouchLayout`). On iOS a layer without a next-keyboard key and without the system
row gets one at the start of its last row (rule `nextKeyboardKey`), since iOS asks for one; Android has no such rule.
iOS builds touch sets only (`ios.hardwareDropped` when the file has both). Reason: the owner's rule of knowingly
simple, reported defaults; every hardware-only layout still gives a working keyboard on both platforms.

**D207 (2026-11-28). kbdgen bundles: one pinned commit, one layout per file, iOS sections first.** `coverage/kbdgen.md`
follows kbdgen 3.0.0-beta.5 at `7a93e95` (its Rust model is the only definition of the format). A bundle imports as
one `.kbl.json` per layout file; bundle data with a home (names, ids, versions) is copied into each, data without
one (signing and store credentials, speller dependencies, resources) is reported in each as
`kbdgen.bundleDataDropped` and never copied. The hardware layers come from the `windows` section, else `macOS`, else
`chromeOS` (differences reported); the touch sets from the `iOS` sections when there are any (they carry widths and
more layers), else from `android`; every imported set has `systemRow: true`, since kbdgen's templates add the bottom
row; the device blocks get widths in the millimetres of `targets/touch-runtime.md` §2.1 (`tablet-600` 95,
`iPad-9in` 100, `iPad-12in` 150). Reason: the owner's one-layout rule; kbdgen keeps several copies of the same
layout per platform, a `.kbl.json` holds one of each, so the importer picks one by a fixed order and reports the
rest.

**D208 (2026-11-28). Keyman touch layouts are imported with their rules.** A `.keyman-touch-layout` gives the touch
sets, keys, gestures and labels; what a `K_` or `T_` key types comes from the keyboard's `.kmn` rules
(`coverage/kmn.md`), so `convert -from kmn` reads both. Alone, a touch layout gives `U_` outputs and the US base and
Shift characters of `K_` keys, which is what Keyman types when no rule matches, and reports the rest
(`keymantouch.noOutput`). `phone` and `tablet` become sets labelled with that device class, the tablet one with
`minDeviceWidth` 90 (SPEC §9.4's threshold); `defaultHint` becomes explicit hints; Keyman's built-in Shift double
tap becomes the caps-lock multi-tap of D155. Reason: the touch layout is a view of a keyboard whose behaviour lives in
the rules; importing it alone is still useful for layouts that use `U_` ids, and the report says exactly which keys
lost their output.

**D209 (2026-11-28). A transform's `from` is kept as written in the touch runtime file.** With normalisation
enabled the compiler puts outputs, dead-key values and `to` in NFC, but never a `from` (`targets/touch-runtime.md`
§5). Reason: the runtime matches `from` against its own context, which holds what the key presses emitted, and
is not normalised at run time (D202); a normalised `from` such as "á" for "a\u{301}" would never match the presses
a and U+0301. ChromeOS keeps `from` as written for the same reason (D182).

**D180 (2026-11-28). ChromeOS: a fixed runtime and the layout as data, deciding by position.** A ChromeOS build is one
Manifest V3 input-method extension for one layout (D150): a runtime service worker that is the same for every layout
of a tool version, and the layout compiled into data beside it (`targets/chromeos.md` §5). The runtime finds the
position from the event's `code` and never reads its `key`, which comes from the system layout under the input method
(the one exception is Num Lock on `numLock` positions, which no flag carries). `engineId` is the input component's id,
not Chrome's extension id, which Chrome derives itself. Reason: generated code per layout would make every layout a
program to review; data in a fixed runtime keeps the runtime checkable once, and `code` is the one value that does not
depend on the system layout.

**D181 (2026-11-28). ChromeOS: the runtime owns the layout's keys; shortcuts go to the system layout.** A position with
a binding in some compiled layer is handled when it types, and also where it resolves to nothing without Control and
Alt, so the system layout never types its own character there; a press with Control or Alt that resolves to nothing
(a Control layer of control characters included) is passed through, so the system's shortcuts work, with the letters of the system layout (`systemLayout`, default `us`), which the build reports
where they differ from the layout (`chromeos.shortcutsFollowSystemLayout`). Control and Alt layers of the file are
compiled, since `commitText` types in every state. Reason: the only alternative for shortcuts, sending synthetic key
events, is meant for virtual keyboards and untested; the US letters are what a ChromeOS user gets from most input
methods, and the file can pin another system layout.

**D182 (2026-11-28). ChromeOS: dead keys and transforms as composition, the context is the composition.** A pending
dead key and the part of the text that a transform may still change are shown as composition and committed when no
compiled rule can change them any more; the transform context is that composition, never text read from the field.
Transforms are expanded into literal rules exactly as for the on-screen runtimes (`targets/touch-runtime.md` §5,
D202), without markers and with each `from` as written, never normalised, since the context is not. Reason: committed text is never taken back, so the runtime needs neither
`deleteSurroundingText` nor the field's surrounding text, whose reliability differs between apps; for one group of
literal rules the result is exactly CLDR's, and the window is the shortest that keeps it so.

**D183 (2026-11-28). ChromeOS: the runtime's state survives a restart of its service worker.** A Manifest V3 service
worker stops after 30 seconds without events and loses its globals, and `onKeyEvent` carries no context id, so the
runtime keeps the focused field's context id, the pending dead key, the composition and the custom locks in
`chrome.storage.session` and answers each key event with `keyEventHandled` after reading them. Reason: without it a
user who pauses for half a minute types nothing until the field loses and regains focus.

**D184 (2026-11-28). ChromeOS: no importer.** A ChromeOS input method is its own program; there is no data to read back
into a `.kbl.json` (`coverage/chromeos.md`). Reason: the format converts native data, not code.

**D190 (2026-11-28). Keyman: the keyboard source is the CLDR writer's output, compiled by Keyman's own compiler.** A
Keyman build writes a CLDR keyboard 3.0 file and a package source, and `kmc` (Keyman's MIT compiler, an outside tool
that a YAKBD tool runs when it finds it and never bundles) compiles them into one `.kmp` with this one keyboard
(D150; `targets/keyman.md`). The file is what SPEC §16.3 writes for a Keyman copy of the layout, so the CLDR losses
are this build's, reported with their `cldr.*` kinds and decided by `targets.keyman.onLoss`. Reason: the CLDR writer
already holds everything CLDR can say; a second writer would say it twice and drift. Keyman reads CLDR keyboards
natively, and its own tests of them pass on our output.

**D191 (2026-11-28). Keyman: what the copy changes, and what the package holds.** The Keyman copy has no `<special>`
element, no `draft` and no `attribution`, a three-part version, a form that holds the bound positions, and no touch
data; the package source carries the name, version, copyright, authors, description and languages. Each change is
reported (`general.extensionDropped`, `general.metadataDropped`, `keymanDefault.*`, `keyman.*`). Reason: `kmc` 18
refuses each of those parts of a CLDR file (measured on every layout of the Keyman check); dropping them and saying
so keeps the layout buildable without a Keyman-only variant of the CLDR writer.

**D192 (2026-11-28). Keyman: positions outside the form are left to the system.** `kmc` maps only the scan codes of
the alphanumeric block, the space bar and three ISO/JIS/ABNT2 keys to Keyman keys and refuses any other in a form, so
Backspace, Tab, Enter, the number pad and the function keys cannot be part of the keyboard. Their bindings are left
out and Keyman passes those keys to the system. Positions whose bindings all type one control character (what every
`.klc` import gives Backspace, Tab, Enter and Escape) are reported once, `keyman.controlKeyLeftOut` (accept); every
other one is `keyman.positionUnreachable` (warning). The rule `form` picks the smallest implied CLDR form holding the
ISO, JIS and ABNT2 keys a layout binds. Reason: the error the CLDR conversion gives for these positions would stop
every `.klc` import, though the system does what most of those bindings say; the report still names each position
whose binding differs.

**D193 (2026-11-28). Keyman: route A reaches desktop Keyman only, and says so on every build.** `kmc` 18 compiles a
CLDR keyboard into a `.kmx` and `.kvk` and writes no KeymanWeb keyboard, which Keyman for Android, iOS and the web
load. Every build reports `keyman.desktopOnly` (accept); a file with touch data also gets `keyman.touchNotCompiled`
(warning). Touch comes from the second source kind, Keyman's keyboard language with a touch layout (format `kmn`),
which `kmc` compiles to KeymanWeb. Reason: a package that installs on a phone app but has no keyboard there would
fail silently; an `accept` entry makes the fact visible without stopping desktop builds.

**D194 (2026-11-28). Keyman: ids from the layout, prefixed; the tested `kmc` version is pinned.** The keyboard id is
`yakbd_` plus a slug of `metadata.id`, the package id the same; both are lower case letters, digits and `_`, not
starting with a digit, which `kmc` asks of package names and which are file names. `kmcVersion` (default the measured
18.0.255) names the compiler a layout was tested with; another version builds with a warning
(`keyman.kmcVersionUntested`), and a `kmc` failure is fatal (`keyman.compilerRejected`). Reason: as for macOS and
ChromeOS, a prefix keeps a built keyboard clear of the ids of Keyman's own repository; `kmc` changes what it accepts
between versions, so a build must say when it ran with an untested one.

**D165 (2026-11-28). Android physical keyboards: one code-free APK with one `.kcm`, names from the layout file.**
`targets.android` holds `packageName`, `label`, `layoutName`, `keyboardLocale`, `keyboardLayoutType`, `versionCode`,
`versionName`, `keys` (key code and scan code per position) and `deadKeys` (the accent per dead key), each with a
one-line default (`targets/android.md` §1) except `keyboardLayoutType`. The package default is
`org.yakbd.keyboard.<slug>.kcm`, the slug and version rules those of `androidime`, so both APKs of one layout install
side by side. The APK has `android:hasCode="false"` and a receiver whose class does not exist. Reason: the system only
reads the receiver's meta-data (measured: such an APK installs and its layout is listed; without the attribute it is
refused); the same slug and version rules as the input method keep one layout's two Android builds alike.

**D166 (2026-11-28). The `.kcm` build is checked against Android's own lookup over 64 states.** The build states are
Shift, Caps Lock and both sides of Control and Alt (64 combinations); each key block is written so that a Go copy of
the platform's lookup (last behaviour first, subset match, Control/Alt/Meta exact) gives SPEC §9.3's character in
every state, and the build checks it. As in `androidime`, the `["other"]` layer does not apply with Control or left
Alt held. A block replaces the generic map's whole key, so the build adds back the generic fallbacks of `SPACE` and
of the number pad. Reason: a `.kcm` property list is not a table of states; writing behaviours against the lookup
makes Caps Lock, sides and explicit nothing exact without rules of their own.

**D167 (2026-11-28). The Android position table: key code, scan code, generic key code, class.** One row per
position: the `KEYCODE_` name, the Linux scan code (Chromium's table), the key code Android 15's `Generic.kl` gives
that scan code, and `character` or `system`. A `map key` line is written exactly where a position's key code is not
the generic one of its scan code. `IntlBackslash` (scan code 86, generic `BACKSLASH` like `Backslash`) gets `PLUS`, as
36 of AOSP's 50 layouts map it, because the table's codes must be unique; F13–F24 and `BrowserStop` have no row.
System keys are never written. The same table serves `androidime`'s physical-key mode (D151). Reason: one source
for both Android targets; remaps (Dvorak keeping shortcuts on letters, Caps Lock as Escape) are pins, not rules.

**D168 (2026-11-28). Dead keys follow the platform source, not the five accents of the documentation.** AOSP's
documentation names five combining accents; `KeyCharacterMap.java` at Android 15 makes a dead key of 28 combining
characters, composing by NFC (plus its own stroke pairs). The build and the importer use the source's table; rule
`deadKeyAccent` picks a dead key's accent by its `spacing`, else by the most entries composed; entries composed
differently are reported per dead key. The emulator cases include an accent beyond the five. Reason: the source
decides what the device does; the documentation is older than it.

**D169 (2026-11-28). `.kcm` import reads behaviour, not syntax.** The importer asks the lookup for each key's
character in each state (both-sided states left out), groups states into layers, sets `capsLockFallback` to `false`,
turns combining accents into dead keys with every composition Android makes, and keeps `map key` lines as pins.
Labels, numbers, HID usage maps and fallbacks other than the build's own are reported, not kept. Reason: the property
lines of a `.kcm` overlap; only the lookup says what a key types, and a build of the import must type the same.

**D170 (2026-11-28). The `.kcm` target's tested floor is Android 15 (API 35).** The APK declares minimum 34 (it
installs and is listed there), but on API 34 no chosen layout was ever applied in measurement, while on 35 and 36 it
typed through its `.kcm`. Pinned key code names must be names Android 15 knows. Reason: what was measured; API 34
stays documented as not working until a measurement says otherwise.
