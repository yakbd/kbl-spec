# Open questions for the owner

Q16 is open; the others are closed and the record stays for reference.

Short, each with a recommendation. Until an answer comes, the recommendation (or the stated interim) is what the draft
does.

**Q1. Default VKs of the punctuation and national keys.** The reference specification does not keep the measured
scan-code → VK table of a standard keyboard (dll §4.5: "anyone can read it from the US layout file of their own
Windows"). Table A of `targets/windows.md` therefore has no default for `Backquote`, `Minus`, `Equal`, the brackets,
`Backslash`, `Semicolon`, `Quote`, `Comma`, `Period`, `Slash`, `IntlBackslash`, `IntlRo`, `IntlYen`,
`NumpadComma`, `NumpadEqual`, `KanaMode`, `Convert`, `NonConvert`; a file must pin them, or the build fails with
`windows.vkMissing`. This also blocks `.klc` files that rely on kbdutool-style defaults for unmentioned keys.
*Recommendation*: have the specification side add the measured table (127 + 38 E0 entries, already compared in OBS
D20) to `spec-v11` as a clean data file; then Table A takes it over unchanged and Q1 closes. Interim: pin. Note: the
tool (its development notes, item 1) built a fuller table from Microsoft's public "Virtual-Key Codes" page;
if the owner accepts that page as a source, Table A can take those rows instead (one decision for both repos).
*Closed 2026-11-22 (coordinator, D29)*: Microsoft's public pages are accepted; Table A is now complete for every US/ISO standard key (`targets/windows-default-vk.tsv`), one table for the spec and the tool.

**Q2. BCP 47 tag → LANGID.** Registration (KLID low word, `InstallLayoutOrTip`) and the DLL strings need a LANGID.
The reference specification gives examples only (`0409`, `0438`, `0C00`). *Recommendation*: no table in the spec
(D16: no per-language rules); `targets.windows.registration.langId` stays required, and the tool may *suggest* a value
from the public [MS-LCID] document when it pins. Interim: required, `windows.langIdMissing` otherwise.
*Closed 2026-11-22 (D30)*: accepted as recommended.

**Q3. Locks without fallback.** *Closed by D26*: custom locks fall back like Caps Lock (`customModifiers.<k>.fallback`,
default `true`), because otherwise a Kana lock makes every unlisted key type nothing and no Windows layout can
express that.

**Q4. ARM64X.** `builds` includes `arm64x` by default, but how to write an ARM64X layout file from scratch is not
established (dll §1.7, §11 item 9). *Recommendation*: keep it in the default; tools report
`windows.architectureUnsupported` until a VM test passes, so files need not change later.
*Closed 2026-11-22 (D31)*: accepted as recommended.

**Q5. Defaults vs pins.** *Answered by the owner 2026-11-22*: both, extremely simple defaults, every default
reported, `pin` as a starting point (D16).

**Q6. Reverse-lookup order.** Windows' own layouts put the number-pad table last, so `VkKeyScanEx` finds main-block
keys first (dll §4.2, wb §14). Rule `tables` orders by width and scan code only, which can prefer a number-pad key
for a digit. *Recommendation*: accept (D16); a file that cares pins `tables`.
*Closed 2026-11-22 (D31)*: accepted as recommended.

**Q7. Localised key names.** Windows key-name tables hold one language; `positions.<p>.name` is one Text.
*Recommendation*: keep one name in 0.1; add `localizedNames` per position only when a target can use them.
*Closed 2026-11-22 (D31)*: accepted as recommended.

**Q8. Ownership marker and product code.** The installer needs a stable `registration.productCode` to find its KLIDs
again (inst §10). *Recommendation*: next round (installer); `pin` should then write a generated GUID so that rebuilds
upgrade in place.
*Closed 2026-11-22 (D31)*: accepted as recommended.

**Q9. Local paths before publication.** The briefs and `CLEAN-ROOM.md` named local folders and the private reference
repository. The content is to move to the public `yakbd/kbl-spec`. *Recommendation*: keep them here; on the move,
replace paths by neutral wording and keep the reference by tag and tree hash only.
*Closed 2026-11-22 (D31)*: accepted as recommended.

**Q10. Microsoft's scan-code page as a source.** SPEC Appendix A takes scan codes from the public "About Keyboard
Input" page (the reference specification cites the same page in wb §3.1). Appendix A is informative and files state
their own scan codes. *Recommendation*: accept; otherwise replace the column by CLDR's `scanCodes-implied.xml`
(which covers only the non-frame keys).

*Closed 2026-11-22 (D29)*: accepted.
**Q11. Installer container.** `targets/windows-install.md` is container-neutral. The choice is the tool's and the
owner's: a self-contained Windows program (one file to double-click, built by `yakbd` with no toolchain) or an MSI
package (enterprise deployment, repair by Windows Installer; inst §2.2 notes that Windows Installer properties hide
ARM64, so an MSI must find the architecture itself). *Coordinator's default (interim)*: a self-contained `.exe`, with
the container behind an interface so that an MSI writer can be added. Nothing in the format changes either way.

*Closed 2026-11-26 by the owner (D76)*: installers are `.exe` only. MSI is abandoned, for yakbd itself and for the
installers it makes; the `.exe` takes `msiexec`'s command line, exit codes, logging, upgrade and repair behaviour
(the tool's `docs/installer-cli.md`). (An earlier answer of 2026-11-25, "both `.exe` and `.msi`, MSI deferred", is
replaced.) The format stays container-neutral.

**Q12. Signing.** MSKLC signs nothing (inst §7 M5c); unsigned installers trigger SmartScreen and "unknown publisher"
prompts (M8). With Smart App Control on, an unsigned layout DLL loads and types, but an unsigned installer program
in the Downloads folder is blocked (inst §11 T12 **[VM]**), so an unsigned `.exe` installer does not run on such
machines. *Coordinator's default (interim)*: unsigned for
now, with a documented point in the tool where a signing step fits. The format has no signing field and needs none
(a certificate is not layout data).

*Closed 2026-11-25 by the owner (D76)*: installers stay unsigned, as MSKLC's are. The Smart App Control block of an
unsigned installer (T12) is accepted.

**Q13. Which text wins when `SPEC.md` and the schema disagree.** `SPEC.md` calls itself normative and says the
schema checks the structure; no text says which one decides when the two accept different files (the checker
makes such a mismatch unlikely, but cannot rule it out for constraints only the prose states). *Recommendation*:
`SPEC.md` wins; a schema that disagrees with it is a bug, fixed in `src/schema.ts` with a STATUS changelog line.
Interim: as recommended.

*Closed 2026-11-27 by the owner (D101)*: `SPEC.md` wins; a schema that disagrees with it is a bug. The rule is part of the 0.x compatibility policy, `COMPATIBILITY.md`.

**Q14. Sign-in screen for a layout whose language Windows does not have yet, installed with no user.** `targets/windows-install.md`
§7.1 needs the language tag Windows uses for the layout's LANGID (`0438` → `fo`, `0407` → `de-DE`, inst §6 item 4).
Only a user hive where Windows already filed that LANGID gives it. A deployment as LocalSystem, or with enabling
off, fails the option for such a layout (D97). Two ways out, each with a cost: (a) a file field
`install.signInLanguageTag`, so the file carries the tag (simple, but a wrong tag adds a second language entry and
is not measured); (b) a VM test of `InstallLayoutOrTip("<LLLL>:<KLID>", 0)` called as LocalSystem, which writes
`HKU\.DEFAULT` (inst §4.3 **[VM]** T3), for a LANGID that `.DEFAULT` lacks: if Windows adds the language there as
it does for a user, the installer can use it and copy the result. *Recommendation*: (b) first, as VM-24 in the next
round; (a) only if (b) fails. Interim: the option fails visibly, and a repair with `SIGNIN=1` after a user's enabling applies it.

*Being measured (2026-11-26, a rerun)*: (b) `InstallLayoutOrTip` as LocalSystem for a LANGID
that `.DEFAULT` lacks. Also measured: whether the tag Windows files for `0438` equals what `LCIDToLocaleName` and
`ResolveLocaleName` return. If it does, the installer could derive the tag itself instead of failing. Ruling after the
results.

**Q15. Owner (2026-11-26): offer "add the language without changing the display language", so that the layout works
after installing?** What 0.1 already does: enabling (§6, §7) adds the layout's language to the installing user's
**input** languages when it is missing (inst §6 item 4 **[VM]**: `InstallLayoutOrTip` with a LANGID the user lacks
adds it), and it never sets the display (UI) language. No new option is therefore needed for the installing user. The
gap is the sign-in screen and new users when no user has the language (D97, Q14). *Recommendation*: no separate
option. Keep "enabling adds the input language, never the display language" as the rule, and state it in §6. A rerun
checks that the display language stays unchanged after an install that adds a language, and the Q14
measurement decides the sign-in case. Interim: as now; ruling after the rerun.

*Q14 closed 2026-11-26 (D98)*: as LocalSystem the installer lets `InstallLayoutOrTip` file the language in `.DEFAULT`, reads the tag Windows chose, and writes the D97 shape; elsewhere the option still fails. No tag is derived (`fo-FO` vs `fo`).

*Q15 closed 2026-11-26 (D98)*: no separate option; enabling adds the input language and never the display language (`targets/windows-install.md` §6), measured in VM-25.

**Q16. Which version does a tool write once 0.2 exists?** SPEC §1.1 (D108) says a tool SHOULD write the lowest
version that holds the file: 0.1 unless the file uses `targets.macos`, `targets.xkb`, a `macos`/`xkb` loss kind or a
0.2 provenance format. The other choice is "always write the newest version the tool implements", which is simpler
for tools but makes every saved file unreadable by 0.1 tools (the released editor and tool). *Recommendation*: keep
the lowest-version rule; the check is a short list of members. Interim: as written.

**Q17. Default bundle id of a macOS layout.** Rule `bundleId` (`targets/macos.md` §1, D125) gives every layout without
a pin the bundle id `org.yakbd.keyboardlayout.<slug of metadata.id>`, so layouts made by anyone carry YAKBD's
domain, and two authors' layouts with the same `metadata.id` collide on one Mac. The other choice is no default
(the build fails until the author gives `bundleId`), or a prefix that says "unregistered", such as
`local.keyboardlayout.`. *Recommendation*: keep `org.yakbd.keyboardlayout.`, since layouts are made with YAKBD and
the default rules are knowingly simple; the report lists the defaulted id, and an author with a domain pins it.
Interim: as written.

**Q18. Which position a `.keylayout` importer gives key codes 10 and 50.** macOS delivers the key left of `1` as 10
and the key next to the left Shift as 50 from ISO keyboards, and the key left of `1` as 50 from ANSI keyboards
(D121). `coverage/macos.md` §2 imports a file that has outputs on both codes as an ISO layout (10 = `Backquote`,
50 = `IntlBackslash`). Many layouts drawn on ANSI keyboards also fill code 10 (for ISO users), so they import as
ISO layouts and their Windows build gains an `IntlBackslash` binding. The other choice is to import 50 as
`Backquote` always and 10 as `IntlBackslash`, which turns ISO layouts around. *Recommendation*: keep the ISO reading;
it is right for ISO layouts and harmless for ANSI ones (one extra key). Interim: as written.
