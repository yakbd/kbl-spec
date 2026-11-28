# Status

Format version: **0.1 preview**; 0.2 (macOS, Linux XKB) in draft on the branch `spec-0.2`. Last update: 2026-11-28.

## In short

- **What it is**: version 0.1 of the `.kbl.json` format, released as a preview. The specification (`SPEC.md`), the
  Windows target documents, the JSON Schema `schema/0.1/kbl.schema.json` and the examples are complete and agree with
  each other; `npm test` checks that.
- **What you can rely on**: within 0.1 a valid file stays valid and keeps its meaning. New minor versions get their
  own schema path. The rules, and when 1.0 comes, are in [`COMPATIBILITY.md`](COMPATIBILITY.md).
- **Targets**: today Windows only (layout DLLs for x86, x64, WOW64 and ARM64X, and their installation). Conversions
  to and from `.klc` and CLDR Keyboard 3.0 are specified. YAKBD aims at every layout format: the official formats
  of other operating systems (macOS, Linux XKB and others) are planned next, then third-party formats such as
  Keyman (D107). They are not specified yet; D105 checks on paper that macOS and XKB fit 0.x.
- **Tested**: layouts built from these files load, type and install correctly on Windows 10 and Windows 11 virtual
  machines (x64, x86, ARM64 in an emulated guest); see "Verified on Windows" below. Not tested: a physical ARM64 PC.
- **Implementation**: the `yakbd` tool ([`yakbd/yakbd-cli`](https://github.com/yakbd/yakbd-cli)) implements this
  specification.
- **Changes**: every change to the shape of the format (schema, `targets.windows`, loss kinds, default rules) is
  listed in the changelog at the end of this file, with the commit.

## Details

The rest of this file is the detailed record: the state of each part, what was verified on Windows (the VM test
numbers refer to `targets/windows-vm-tests.md`, the D numbers to `DECISIONS.md`), and the changelog.

| part | state |
|---|---|
| `SPEC.md` | complete first draft. **Stable**: file rules, Text / CodeUnits / MarkedText / Pattern, top-level shape, `metadata`, `settings`, `positions`, `forms`, modifier sets and matching, `keys`, `hardware` / `touch` layers and bindings, resolution (§9.3), `deadKeys` and the dead-key machine (§14.2), `variables` / `transforms` (CLDR verbatim), `tests`, `targets.*` field names, loss report and `onLoss` resolution. **May still grow**: the loss-kind list (§17.3: new kinds are added, existing ids keep their meaning) |
| `targets/windows.md` | complete first draft, following the owner's rule D16 (simple, fixed defaults; each use reported as `windowsDefault.<rule>`). **Stable**: rule names, Table A, cell encoding, Caps Lock attributes, dead-key encoding incl. the multi-unit recipe, pinning, the four builds and where they go (§2.1, D45). **Settled**: Table A = `targets/windows-default-vk.tsv` (D29), LANGID required (D30). **Settled [VM]**: `arm64x` in yakbd's default build set (gate D44 passed, VM-6, D66). **Settled [VM]**: Caps Lock rows hold columns 0 and 1 only (D65, VM-8, D67) |
| `targets/windows-install.md` | normative: fields and rules (`productCode`, `enableForUser`, `enableForSignInAndNewUsers`, `uninstallEntry`), machine kinds and refusals (D46), KLID / Layout Id allocation (D47), languages, enabling, upgrade, uninstall. **Stable for the tool**: everything; the custom-language route is confirmed for enabling (VM-5), settled with its uninstall (VM-5); the sign-in screen and new users (§7.1, D87, D94, D97–D99) verified on Windows 11 (VM-18 to VM-27). Container and signing settled by the owner (D76): unsigned `.exe` only, behaving like `msiexec`; no MSI |
| `schema/0.2/kbl.schema.json` | draft (D108); generated from the same source, holds 0.1 (`SPEC.md` §1.1) |
| `schema/0.1/kbl.schema.json` | stable (see above); frozen, its hash pinned by `npm test`; closed objects, descriptions everywhere; generated from the zod source `src/schema.ts` (D70), checked by `npm test` |
| `examples/` | (a) `minimal-qwerty`, (b) `latin-altgr-deadkeys`, (c) `cldr-pt-abnt2` (from CLDR release-49), (d) `windows-features` (now with `install`), (e) `dll-import-shape` (the shape the DLL importer writes); all validate |
| `coverage/cldr-keyboard3.md`, `coverage/windows.md` | complete first drafts; `coverage/windows.md` §11 (DLL import conventions, D53–D55) |
| `DECISIONS.md` D1–D107, `OPEN-QUESTIONS.md` Q1–Q15 closed | current |
| CI | `.github/workflows/validate.yml`: push to `main` (paths filter) and manual runs only; Node 22, `npm ci`, `npm test` |

**Verified on Windows** (yakbd VM runs 1 to 5, `targets/windows-vm-tests.md`; disposable guests: Windows 11 25H2
build 26200 x64, Windows 11 26H2 build 26300.9457 ARM64 under emulation, Windows 10 22H2 x64 and x86, Windows 11 Pro 25H2 build 26200.8037 x64):

- DLL builds `x64`, `wow64` and `arm64x` (shape `arm64x-x64`) load and type in native ARM64, x64 and x86 processes,
  also after sign-in with `ctfmon.exe` (VM-6); writer rules W-1, W-2; VM-1 to VM-9 settled.
- The installer: install, enable, typing in every process kind, reinstall, upgrade in place, repair of a lost KLID,
  foreign-file refusal, several layouts of one language, the payload shape check and re-enabling after a repair
  that takes a new Layout Id (VM run 3, x64 only; D68, D69), the custom-language route (VM-5), uninstall leaving
  nothing; on x64 and on ARM64 (cold boot included).
- Native 32-bit Windows: the `x86` build from an x86-only installer, the x64-only installer refused, the installer
  scenarios and typing (VM-10, 53/53); Windows 10 x64 the same, including a layout file whose deletion is deferred to
  the restart (VM-11, 87/87).
- Real-user paths on Windows 11 (VM-13): double-click with UAC consent and over-the-shoulder elevation by a standard
  user (enabled for that user only), the repair seen by a second user at sign-in and the only-layout repair (D69),
  a deletion deferred to the restart. The `msiexec` command line and exit codes, restarts included (VM-14, 21/21).
- Uninstall through Settings by an administrator and by a standard user (VM-16, by hand): elevation prompt first,
  `/x {product code}`, exit 0, entry, KLID key and files gone; every signed-in user's own entries are removed whoever runs the uninstaller
  (VM-13 run 2, the same code path); a session keeps the layout loaded until sign-out.
- Sign-in screen and new users (VM-18, VM-21, VM-22, Windows 11 x64; D87, D97) for a layout whose language the sign-in
  screen and the Default profile already have, and (VM-25) for one whose language they lack, taken from the installing
  user or (VM-27) through `InstallLayoutOrTip` as LocalSystem, with the display language unchanged: install with enabling off, the sign-in list before and after a restart,
  a new account with the layout loaded and typing, repair and override, uninstall (also after Windows' own copy).
- CLDR `release-49` test cases a Windows build can express (VM-24, 13/0 in 64- and 32-bit processes).
- Rule `vk` after D86 (VM-17, 33/0 in both process kinds; Slash kept in `e0-used`).
- MSKLC comparison (VM-12): yakbd's builds of the cases type as expected (32/32); yakbd imports MSKLC's DLLs exactly
  where they build; every remaining difference is a predicted MSKLC behaviour or a recorded convention (VM-15,
  D81–D86).
- DLL import: every Windows layout file of the x64 guest round-trips (216/216 x64 view, 215/215 WOW64 view).

**Not verified**: a physical ARM64 PC (only an emulated guest); other ARM64X
shapes after sign-in; for the sign-in screen and new users (D97): Windows 10 (only Windows 11 x64 was tested); a place whose `Languages` is empty (D99); other existing users, which 0.1 installers do not enable.

Notes for the tool (answers to the tool's development notes of 2026-11-22):

- **Defaulted entries** have the shape of any report entry: `kind` = `windowsDefault.<rule>` (rule names in
  `targets/windows.md` §1), `severity` from `onLoss` (default `accept`), `detail.value` = the chosen value. A
  `-strict-defaults` build equals `"onLoss": {"kinds": {"windowsDefault.*": "error"}}`.
- **Every default has a field** in `targets.windows` (`targets/windows.md` §1 lists rule → field). Standard rows
  (control characters, number-pad rows) are **not** added by the kbl build (D16, `coverage/windows.md` §10 item 6):
  a file says them, or gets `windows.frameKeyWithoutText`. The number-pad rule is SPEC §14.1 + `targets/windows.md` §5.
- **One default table** for both repos: `targets/windows-default-vk.tsv` (135 rows, your rows plus position names;
  D29). Generate `target/windows/vk` from it or check against it; do not keep rows of your own.

What a tool can implement now: reading/writing `.kbl.json` per the schema; the reference checks of SPEC §19 (a
subset is in `tools/check`); `.klc` ↔ `.kbl.json` per `coverage/windows.md` §7; CLDR ↔ `.kbl.json` per
`coverage/cldr-keyboard3.md`; the Windows build per `targets/windows.md` (files must give `registration.langId`); `pin`.
Round 2: the installer per `targets/windows-install.md` (stable; VM-5 settled); DLL import per
`coverage/windows.md` §11 (stable; VM-7 settled, D64); ARM64X writer per `targets/windows.md` §2.1, which
is in the default build set since VM-6 passed (D44, D66); D65 settled by VM-8 (D67). Q11 (container) and Q12 (signing) closed by the owner (D76).

## Changelog

- 2026-11-28 (branch `spec-0.2`, draft): version 0.2 opened (D108): `kbl` `"0.2"`, schema `schema/0.2/kbl.schema.json` generated next to the unchanged 0.1 schema from the one source `src/schema.ts`; a 0.2 reader also reads 0.1 files, tools write the lowest version that holds a file (SPEC §1.1). New in 0.2: `targets.macos` and `targets.xkb` (placeholders holding only `onLoss`, SPEC §16.4, §16.5), loss-kind families `macos.*`, `macosDefault.*`, `xkb.*`, `xkbDefault.*` (wildcards only so far), provenance formats `keylayout` and `xkb`. Position tables per target (D109, SPEC §16), one dead-key model for every target (D110, SPEC §14.2), clean-room rule for macOS and Linux (D111, `CLEAN-ROOM.md`). Stub pages `targets/macos.md`, `targets/xkb.md`, `coverage/macos.md`, `coverage/xkb.md`. Schema test cases now per version (`testdata/schema/<version>/`). No change to 0.1.

- 2026-11-27: 0.1 preview. No change to the format's shape. `COMPATIBILITY.md` (0.x policy; `SPEC.md` wins over the schema, Q13 closed, D101); owner decisions D100 (public repository `yakbd/kbl-spec`, `$id` unchanged), D102 (no catalogue), D103 (other operating systems later), D104 (the tool's own setup program signed, layout installers unsigned); D105 (macOS and XKB targets fit 0.x, on paper); D107 (all layout formats: other operating systems' official formats next, then third-party formats such as Keyman; supersedes D103's "by demand"); contributing guide with the clean-room clause (organisation-wide, in `yakbd/.github`), issue templates.

- 2026-11-26 (round 5, S5, end): VM-27 (D98 LocalSystem route, 7/7); D99. Round 5 in sum: field `install.enableForSignInAndNewUsers` with rule and `SIGNIN` (D87, D94, D97, D98), loss kind `windows.noHardwareLayers` (D89), CLDR marker dead keys over sets (D88, D95), test files on hardware targets (D92, D95), VK names up to 32 characters (D96); VM-18 to VM-27.

- 2026-11-26 (round 5, S5, VM run 5 rerun): VM-25, VM-26 recorded, VM-20 and VM-23 completed, VM-27 open; D98 (as LocalSystem, `InstallLayoutOrTip` gives the tag, the installer writes the D97 shape; enabling never changes the display language, §6); Q14, Q15 closed.

- 2026-11-26 (round 5, S5, VM run 5): VM-18 to VM-24 recorded; D97 changes §7.1 (System Backup required, a missing language gets the whole shape Windows' copy writes or the option fails, DWORD = next in the subkey, enabling before §7.1 in the same process; uninstall removes a tag it added); Q14 opened.

- 2026-11-26 (round 5, S5, TF notes): schema VK-name pattern 1–32 characters (was 24), every name of `targets/windows-vk-names.tsv` valid; `.klc` cell `char` excludes surrogates (D96).

- 2026-11-26 (round 5, S5, TW and TC notes): D94 (§7.1/§9 details: unload failure not a failure, Default profile path, empty System Backup keys deleted, first tag, only-layout refusal for `.DEFAULT` only); D95 (coverage §3.6 rule 3 ignores `\m{.}(.)` → `$1`; §3.7 PositionId order).

- 2026-11-26 (round 5, S5, TC notes): new loss kind `windows.noHardwareLayers` (error, D89); CLDR import expands marker dead keys over a set variable or a mapped set (D88, `coverage/cldr-keyboard3.md` §3.6); test files on hardware targets, `coverage/cldr-keyboard3.md` §3.7 (D92); `klc.notRepresentable` also for a Ctrl+Alt column without `altGr` (D93); D90, D91 confirm D34, D85.

- 2026-11-26 (round 5, S5): new field `targets.windows.install.enableForSignInAndNewUsers` and default rule `enableForSignInAndNewUsers` (`false`; loss kind `windowsDefault.enableForSignInAndNewUsers`); `windows.registrationInvalid` also covers that field `true` with `langId` `0C00`; `targets/windows-install.md` §7.1 (direct writes into `.DEFAULT`, `S-1-5-19`, `S-1-5-20`, the Default profile), §9 (uninstall always cleans those first), §10 (`SIGNIN=0|1`); D87; VM-18 to VM-23 open.

- 2026-11-26 (round 4, S4): VM-16 (uninstall through Settings, administrator and standard user, by hand; per-user entries removed for every signed-in user, VM-13 run 2), VM-17 (D86 typing, 33/0 and 33/0).

- 2026-11-26 (round 4, S4): VM-15 (MSKLC comparison run 2); D85 settles D83 (MSKLC's extra scan codes stay out of Table A); D86 replaces the explicit-remap exception of D35/D37: rule `vk` adds every Table A row whose scan code no position uses, without `windows.vkDuplicate` against the file's positions (`targets/windows.md` §5, SPEC §17.3).

- 2026-11-26 (round 4, S4): VM-13 (Windows 11 real-user paths, 15/17, both failures the test's Settings automation), VM-14 (`msiexec` command line, 21/21 and 3/3 after restart); D69 (b) settled by VM-13.

- 2026-11-26 (round 4, S4): VM-10 (Windows 10 x86, 53/53), VM-11 (Windows 10 x64, 87/87, deferred deletion), VM-12 (MSKLC comparison); D81 (`@` in a `.klc` SGCAP continuation line is a character, as MSKLC builds it), D82 (`.klc` conventions measured against MSKLC; DLL import of states with unowned bits), D83 (MSKLC's scan-code tables are not format data; open until the differing codes are listed).

- 2026-11-26 (round 4, S4): TM note 4: the `.klc` exporter always writes states 0, 1, 2 and reports MSKLC's implied rows (D78), a one-unit lone surrogate is `klc.notRepresentable` (D79). TX contract: `targets/windows-install.md` §10 (yakbd's installers: unsigned `.exe`, `msiexec` command line and exit codes, tool `docs/installer-cli.md`), no downgrade (D80, §8).

- 2026-11-26 (round 4, S4, TM notes): `.klc` import of named keys (D77, `coverage/windows.md` §10 items 1 and 6): key-name-only positions get the implied rows and the bindings of their VK's row.

- 2026-11-26 (round 4, S4): Q11 and Q12 closed (D76): installers are unsigned `.exe` programs only (MSI abandoned, for yakbd and the installers it makes), taking `msiexec`'s command line, exit codes, logging, upgrade and repair behaviour; the format stays container-neutral.

- 2026-11-26 (round 4, S4, TN notes): normalisation (D71–D75): Unicode 18.0.0 (CLDR 49); with `enabled` a Windows build NFC-normalises key outputs, dead-key results, spacing texts and bases, never CodeUnits or `targets.windows` data; new loss kind `general.outputNormalized` (accept), `general.normalizationNotApplied` reworded (typing across keystrokes is not normalised); `.klc`/DLL importers write `normalization: "disabled"` exactly when an imported output is not NFC; example (b) now says `disabled`. Schema: one new `onLoss` kind.

- 2026-11-26 (round 4, S4): the schema's source is `src/schema.ts` (TypeScript, zod 4.6.7), `schema/0.1/kbl.schema.json` is generated from it and committed, the checker is TypeScript (`npm test`), Go code removed (D70). The JSON Schema accepts the same files as before; 50 invalid schema cases in `testdata/schema/`.

- 2026-11-22 (round 3): installer notes of TI3 settled: D68 (shape check of every payload file, ARM64X shape = one that passed the gate, damaged installer = failed run), D69 (repair with a new Layout Id re-enables for the running user; VM-9 settled in VM run 3: one plain add keeps the old HKL, remove and add passes, 18/18 on the rerun; the only layout is added only, then sign-out).

- 2026-11-22 (round 2, final VM run 2 results): full import 216/216 and 215/215; installer 13/13 on x64 and passing on ARM64 after a cold boot; "Verified on Windows" / "Not verified" lists in this file.

- 2026-11-22 (round 2): VM-8 settled (D67): Caps Lock + AltGr never reads an SGCAPS Caps Lock row; `targets/windows.md` §6 rule 1 stays at columns 0 and 1; D65 settled; KBDINUK3 round-trips.

- 2026-11-22 (round 2): VM-6 passed for the `arm64x-x64` shape (D66): `arm64x` is in yakbd's default build set; D65 provisional until VM-8 (KBDINUK3 passes with the tool's other reading).

- 2026-11-22 (round 2): TD KBDINUK3 note: D65 (Caps Lock rows stay at columns 0 and 1; the shared FF row gives AltGr dead characters); VM-8 defined (Caps Lock + AltGr on SGCAPS keys).

- 2026-11-22 (round 2, VM run 2 reruns): VM-5 settled; VM-7 settled (D64: `{"output": ""}` is an explicit nothing, `WCH_NONE`; imports of SGCAPS `WCH_NONE` cells use it); VM-6 still open (ARM64 sign-in: 1 of 7 layouts in the native session); TI items 16–18 triaged.

- 2026-11-22 (round 2, VM run 2): results recorded in `targets/windows-vm-tests.md`; D63: VM-4 settled (writer rule W-2), right-Shift RLM settled, VM-5 enabling confirmed (uninstall residue open), VM-6 first part passed (sign-in part open, `arm64x` still skipped), VM-7 open.

- 2026-11-22 (round 2, sixth batch): TD after ab5f7f7: `dll.resourceDropped` covers unreadable resources; `klc.notRepresentable` names `useTableA: false`; CompanyName and `vkDuplicate` answers restated (D58, D59).

- 2026-11-22 (round 2, fifth batch): TI items 14, 15 (D62: refuse while the target file awaits deletion at restart; no enabling from another account).

- 2026-11-22 (round 2, fourth batch, review): D61 (product code from `metadata.id` + `dllName`, test vectors; uninstall scope reason; `dll.modifierDropped`; dispatcher not importable); `_none_` build rule in `targets/windows.md` §5; `vkDuplicate` exceptions in SPEC §17.3; example (e) `dll-import-shape`.

- 2026-11-22 (round 2, third batch): TA and TD notes triaged. D58 (imported CompanyName → `metadata.attribution`), D59 (no `vkDuplicate` under `useTableA: false`; `_none_` VK; pinned `tables` built as listed, `targets/windows.md` §7), D60 (loss kinds `dll.unreachableData`, `dll.unusualShape`, `dll.capsCellUnexpressed`, `dll.nlsUnreadable`, `dll.dispatcherNotRead`; ARM64/ARM64X import from the native view). VM-7 open.

- 2026-11-22 (round 2, second batch): TI notes triaged: D56 (single-build installer per machine kind), D57 (fixed Layout Id collides per language; KLID high word `A000`–`AFFE`; uninstall: current and loaded users, refuse only for an only layout).

- 2026-11-22 (round 2, first batch, agent S2): ARM64X: `targets/windows.md` §2.1 (builds, where they go, which
  processes they serve; gate D44 for `arm64x` in the default set; no plain ARM64 build, D45). Installation: new
  `targets/windows-install.md`, schema `targets.windows.install` (`enableForUser`, `productName`, `productVersion`,
  `publisher`), rules `windowsDefault.productCode` / `.enableForUser` / `.uninstallEntry`, loss kinds
  `windows.registrationInvalid`, `windows.installerMachinesMissing` (D46–D52). DLL import: `coverage/windows.md`
  §11, schema `targets.windows.useTableA`, loss kinds `dll.*` (D53–D55). Open: Q11 (container), Q12 (signing);
  VM-5 (custom language), VM-6 (ARM64X gate). The checker reads the rule indexes of both target files.

- 2026-11-22 (ninth batch): LRM/RLM rule stated in `targets/windows.md` §3; VM-4 (SGCAPS with a dead key only in the Caps Lock line) open; runner-environment note.
- 2026-11-22 (eighth batch): VM run 1 results (`targets/windows-vm-tests.md`, writer rule W-1 in `targets/windows.md` §12, D43).
- 2026-11-22 (seventh batch, tool phase 2 notes): D37 (Table A rows yield only to explicit remaps), D38 (no `vkDuplicate` for Table A's own twins), D39 (default `builds` = what the tool can make; listed unsupported build = error), D40 (`capsUnmatched` in every column), D41 (`.klc` AltGr inferred from states 6/7), D42 (loss kinds for SPEC §19: eight new `general.*` kinds).
- 2026-11-22 (sixth batch): `.klc` implied rows (D36, loss kind `klc.impliedRows`, `coverage/windows.md` §10 item 6).
- 2026-11-22 (fifth batch): triage of the tool notes (D33–D35): rule `vk` skips Table A rows whose VK the file uses; `.klc` number-pad rows give characters; no standard rows are added; `targets/windows-vm-tests.md` lists the Windows tests still needed.
- 2026-11-22 (fourth batch): the repository checker is Go (`go run ./tools/check`, D32); no Python in this repo.
- 2026-11-22 (third batch): Table A is the data file `targets/windows-default-vk.tsv`, complete for the standard
  keys from Microsoft's public pages (D29); all open questions closed (D29–D31).
- 2026-11-22 (second batch): `customModifiers.<k>.fallback` (locks fall back like Caps Lock, SPEC §9.3, D26);
  test keystrokes name the Shift side (`shiftL`, `shiftR`); one character row per VK (`windows.sharedVkRowConflict`,
  D27); new loss kinds `windows.sharedVkRowConflict`, `windows.deadKeyFirstUnitComposes`; caps-only layers report
  `windows.capsNotExpressible`; `.klc` import conventions (`coverage/windows.md` §10, D28); VK names checked
  against `targets/windows-vk-names.tsv`.
- 2026-11-22: first complete draft (this commit series). `targets.windows.builds` (not `architectures`), default
  rules reported as `windowsDefault.<rule>`, schema `$id` `https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json`,
  licence MIT-0.
