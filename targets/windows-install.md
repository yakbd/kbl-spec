# Target `windows`: installation (0.1 draft, normative)

What a `.kbl.json` file says about installing its Windows layout, the default rules where it is silent, and what an
installer built from it does on each kind of machine and when it is uninstalled. Facts about Windows are cited from
the reference specification, revision 10, topic `installation` ("inst §10" = `spec/installation/README.md` §10), and
`dll-format` ("dll §1.7"). Where this document says only "as inst §10", the reference's sequence is the rule and is
not repeated here. The DLL itself is `targets/windows.md`.

## 0. Principles

1. **Container-neutral.** Nothing here depends on how an installer is packaged (a self-contained program, an MSI
   package, …) or whether it is signed; those are tool choices (yakbd's: an unsigned `.exe` that behaves like
   `msiexec`, D76). "Installer" means
   whatever a tool produces from one `.kbl.json` file that installs and uninstalls the layout on Windows.
2. **One installer per platform with every build** (D18): an installer carries the builds of `targets.windows.builds`
   (`targets/windows.md` §2.1) and installs the ones the machine needs (§3). A tool MAY offer to make an installer
   for fewer machines; the unit is the **machine kind** of §3, never a single file (D56): an installer for x86
   carries `x86`, for x64 `x64` + `wow64`, for ARM64 `arm64x` + `wow64`.
3. **Same default discipline as the DLL** (D16): the rules of §1 are one line each, knowingly often wrong, every use
   is reported as `windowsDefault.<rule>` when the installer is built, and `yakbd pin` writes their results into the
   file. Values that are chosen **on the machine** at install time (KLID, Layout Id, §5) are not rules: they cannot
   be known when the file is built, so nothing is reported and nothing is pinned for them (D47).
4. **Supported Windows**: Windows 10 and later (the range of inst). What an installer does on older versions is not
   specified; it MAY refuse.
5. **Every step is checked; a failing step fails visibly and undoes the machine part** (inst §7, "Further
   requirements"; inst §3.4). An installer never reports success when nothing was registered.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `productCode` | the product GUID: ownership marker of the KLID, key of the uninstall entry, upgrade identity | `registration.productCode` | 2 |
| `enableForSignInAndNewUsers` | whether the installer also puts the layout on the sign-in screen and into the profile new accounts are made from | `install.enableForSignInAndNewUsers` | 7.1 |
| `enableForUser` | whether the installer adds the layout to the installing user's input list | `install.enableForUser` | 7 |
| `uninstallEntry` | product name, version and publisher of the uninstall entry | `install.productName`, `install.productVersion`, `install.publisher` | 8 |

The registry values `Layout Text` and the custom-language values come from rule `registration` of
`targets/windows.md` §9; `langId` has no default (D30).

## 2. What a file says

All fields are in `targets.windows` (SPEC §16.1). Every one is optional except `registration.langId`.

| field | meaning | when absent |
|---|---|---|
| `registration.langId` | LANGID the layout is filed under: low word of the KLID, the LANGID of the enabling call (inst §3.1, §4.3). `0C00` = a language Windows has no LCID for (§6) | build fails, `windows.langIdMissing` |
| `registration.klid` | a fixed KLID (8 hex digits; high word `A000`–`AFFF` recommended, inst §3.1). Its low word MUST equal `langId` | allocated on the machine (§5) |
| `registration.layoutId` | a fixed `Layout Id` (`0001`–`0FFF`, inst §3.3) | allocated on the machine (§5) |
| `registration.layoutText` | `Layout Text` (inst §3.2) | rule `registration`: `metadata.name` |
| `registration.localeName` | `Layout Locale Name` and the language tag enabled for a `0C00` layout (§6) | rule `registration`: `strings.localeName` |
| `registration.customLanguageName` | `Custom Language Name` (§6) | rule `registration`: the `languageName` string |
| `registration.productCode` | product GUID, `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}` | rule `productCode` (below) |
| `install.enableForUser` | add the layout to the installing user's list (§7) | rule `enableForUser`: `true` |
| `install.enableForSignInAndNewUsers` | also add it to the sign-in screen and to accounts created later (§7.1) | rule `enableForSignInAndNewUsers`: `false` |
| `install.productName` | display name of the uninstall entry | rule `uninstallEntry`: `metadata.name` |
| `install.productVersion` | version of the uninstall entry (free text) | rule `uninstallEntry`: the resolved `versionInfo.productVersion` (`targets/windows.md` §2) |
| `install.publisher` | publisher of the uninstall entry | rule `uninstallEntry`: `metadata.organization`; absent when that is absent (never another vendor's name) |

`Layout File` is `dllName` + `.dll`, `Layout Display Name` is `@%SystemRoot%\system32\<dllName>.dll,-1000`
(REG_EXPAND_SZ), as inst §3.2 and §10; they have no field.

**Rule `productCode`**: the name-based UUID (version 5, SHA-1, RFC 9562 §5.5) of the namespace
`52711d5d-5dcb-4d0b-b8bb-9852abd899ea` (fixed by this document) and the UTF-8 bytes of `metadata.id` in lower case,
one space (U+0020) and the resolved `dllName` in lower case, written in upper case in braces. Test vectors:
`pt-t-k0-abnt2 pttk0abn` → `{706CBB9E-9327-5859-A4F1-8241F5A4002A}`, `fo-t-k0-kblwin kbltour` →
`{2BC7A0C6-F16B-5CCE-9C63-4360BD88AF79}`. Reason (D48, as amended by D61): it is the same for every rebuild of a
file, so a new version upgrades the installed one in place (inst §7, §10) without a pin; and two different layouts
whose default DLL names collide after the 8-character cut (`fr-t-k0-azerty`, `fr-t-k0-azertyx` → `frtk0aze`) get
different codes, so the second installer finds the file name taken and refuses (inst §2.3) instead of upgrading over
the first. Changing `metadata.id` or `dllName` therefore makes a new product; a file that renames either and wants
to upgrade pins `registration.productCode` first (`yakbd pin` writes it).

**Checks when building** (`windows.registrationInvalid`, error): `klid` whose low word is not `langId`; `layoutId`
`0000` or above `0FFF` (inst §3.3: only 12 bits reach the HKL); `langId` `1000`, `1400` or a transient LANGID
(`2000`, `2400`, … `4C00`), which Windows assigns per user and may reassign (inst §6); `install.enableForSignInAndNewUsers`
`true` with `langId` `0C00` (§7.1: no measured route puts a custom-language layout into those profiles).

**Machines the installer will refuse** (`windows.installerMachinesMissing`, warning, one entry per installer listing
them): every machine kind of §3 for which the installer lacks a build. A default installer of a tool that cannot make
`arm64x` (`targets/windows.md` §2.1) reports ARM64 here; yakbd can make it since VM-6 (D66).

## 3. Machine kinds

The installer takes the machine's architecture from the **native machine** returned by `IsWow64Process2`, never from
its own process or from Windows Installer properties (inst §2.2), and writes to the native `System32` as inst §2.2
says (`Sysnative` or redirection off in a 32-bit process).

| native machine | `System32` gets | `SysWOW64` gets | without those builds |
|---|---|---|---|
| x86 (014C) | `x86` | – | refuse |
| x64 (8664) | `x64` | `wow64` | refuse, also when only `wow64` is missing |
| ARM64 (AA64) | `arm64x` | `wow64` (the same file as on x64) | refuse, also when only `arm64x` or only `wow64` is missing |
| anything else | – | – | refuse |

"Refuse" means: change nothing on the machine and say, in the installer's own words, which build is missing (for
ARM64 without `arm64x`: that the layout has no build for Windows on ARM yet).

**Shape check** (D68). Before it writes anything, the installer checks every file this machine gets (files for other
machine kinds are not looked at) for the expected Machine and shape: `x86` 014C with 4-byte pointers, `x64` 8664,
`wow64` 014C with the 8-byte slots, `arm64x` AA64 with ARM64X metadata (inst §10 step 1, §2.4); an ARM64
`System32` never gets a file whose Machine is not AA64 (inst §2.4). For `arm64x` the shape is one that passed the gate
of `targets/windows.md` §2.1 for the tool that wrote the file (D44, D66); for yakbd that is `arm64x-x64` only, so
an `arm64x-ec` file is refused (VM-6 covered it for loading, not after sign-in). A file that fails makes a **damaged
installer**: the run fails before any change and says so (§0 item 5); it is neither a refusal of this section nor
an enabling failure (§7), and its exit code is the container's (§0 item 1). The tool runs the same check on every
file when it makes the installer and makes none when one fails; that is a tool error, not a loss kind, so no
`onLoss` policy can accept it.

**ARM64 without `arm64x`: refuse** (D46). The reference rules out every other choice: an x64 file in an ARM64
`System32` does not load in native processes (193) and crashed processes and `ctfmon.exe` in the run (inst §2.4,
table), and inst §10 says never to fall back to another architecture. Installing only the `wow64` file would serve
x86 processes alone (126 for native and x64 processes, inst §2.4), with sign-in behaviour untested. A refusal is
visible and is repaired by a newer installer; a half-working layout is not. The same reasoning refuses x64 or ARM64
without `wow64`: inst §2.1 requires the WOW64 copy on every 64-bit Windows.

## 4. Install

The installer needs administrator rights for the machine part (inst §1 objects 1–3) and does, in this order,
inst §10 `INSTALL`:

1. **Find its own installation**: a KLID under `Keyboard Layouts` whose `Layout Product Code` is the product code,
   or the KLID its uninstall entry records (inst §10, M7). If found: **upgrade in place** (§8) and stop here.
2. **Files** (inst §2.1, §3.4, §10 step 1): copy each build of §3 to its directory under `<dllName>.dll`. A file of
   that name that does not belong to this product (not recorded in this product's uninstall entry) is never
   overwritten: refuse (inst §2.3). A target file that an earlier uninstall scheduled for deletion at the next
   restart (inst §5, §10) is a refusal too: the user restarts first (D62); the installer never edits the list of
   pending deletions.
3. **Registration** (inst §3, §10 step 2): KLID and Layout Id by §5; values `Layout File` first, then `Layout Text`,
   `Layout Display Name`, `Layout Id`, `Layout Product Code` = the product code, and for `langId` `0C00` the
   values of §6. On any failure the KLID key and then the files are removed (inst §3.4).
4. **Uninstall entry** (§8), per machine, so that every administrator sees and can remove it (inst §7 M4).
5. **Enable** for the installing user when `enableForUser` (§7), in that user's process (the elevated process when
   it is that user's account).
6. **Sign-in screen and new users** when `enableForSignInAndNewUsers` (§7.1), in the elevated part, after step 5
   when the same process does both.
7. Tell the user to sign out if the layout does not appear (inst §5).

## 5. KLID and Layout Id

- **KLID** (inst §3.1, §10): with `registration.klid`, exactly that KLID: if its key exists and carries this
  product code, it is this product's (upgrade); if it exists otherwise, refuse; else create it. Without it: the
  first `<high word><langId>`, high word ascending from `A000` to `AFFE` (the bound of inst §10), that the installer
  creates as a new key by an atomic create, skipping KLIDs that any loaded profile still references (inst §3.1,
  §10); none left: refuse.
- **Layout Id** (inst §3.3, §10): read every subkey's `Layout Id` the way Windows parses it (hex of any length, with
  or without `0x`, either case; a value that does not parse counts as 0). With `registration.layoutId`, that id
  unless another KLID **of the same LANGID** uses it (only then do the HKLs collide, inst §3.3 **[VM]** T7), else
  refuse. Without it: the **highest id from `00FF` down to `00C0` that no KLID of any language uses** (the global set
  of inst §10); none free: refuse. Written as four hex digits (D57).
- Range decision (D47): inst §3.3 calls ids above `00FF` the safest place for a new tool but recommends counting down
  from `00FF`, and the sequence of inst §10 scans `00FF` down to `00C0`. The installer follows the sequence: tools that
  scan only `00C0`–`00FF` still see the id, and Windows allocates upward from `00A0`.
- Repair and upgrade keep both (inst §7, §10 `UPGRADE_IN_PLACE`). When the repair recreates a lost KLID key (§8) and
  another KLID **of the same LANGID** now has the recorded Layout Id (the collision rule above, D57), the installer
  allocates a new one by the rule above (a fixed `registration.layoutId`: refuse) and re-enables the layout (D69):
  - **Who**: the user who runs the repair, when that user's hive named the KLID before the repair; the call is made
    as in §7 (that user's own process, never from another account). Every user's `Preload`, `Substitutes` and
    `User Profile` entries name the KLID, which stays, so they are still right (inst §4.1, §4.2); what holds the old
    HKL is the CTF state (inst §4.5 [I]). Other users, loaded or offline, are not changed: Windows rebuilds the CTF
    state from `User Profile` at sign-in (inst §4.1 [S], not measured after a Layout Id change), and
    `InstallLayoutOrTipUserReg` writes only `Preload`/`Substitutes`, which need no change (inst §4.3 **[VM]**). The
    installer tells the person running it that other users sign out and in again if the layout does not work for
    them. This narrows inst §10's "every profile that had it" as D57 narrows uninstall.
  - **How** (VM-9 **[VM]**): for each `<LLLL>:<KLID>` value of the user's `User Profile` (for a `0C00` layout, the
    transient LANGID of §6), remove the layout (`InstallLayoutOrTip` with `ILOT_UNINSTALL`) and add it again
    (`InstallLayoutOrTip(..., 0)`). One plain add is not enough: the session keeps the old HKL, as a loaded layout
    stays loaded until sign-out (inst §5). When the layout is the user's **only** layout it is not removed first:
    the installer adds it only and tells the user to sign out and in again. Removing an LCID language's only input
    method removes the language, and adding brings it back (inst §6 item 4). Afterwards the installer reads
    `User Profile` back and looks for the new HKL in `GetKeyboardLayoutList` of a process started after the calls;
    a missing HKL is reported ("sign out and sign in again"), not an enabling failure.
  - Re-enabling restores what the user had, so it does not depend on rule `enableForUser`; a run-time switch that
    turns enabling off (§7) turns it off too.
- A fixed `klid` or `layoutId` in a file is therefore a demand, not a preference: an installer never picks another
  value for it. Fixed values collide on machines that already use them (inst §8, "Patterns to avoid"); most files
  should leave both out.

## 6. Languages

- `langId` with an LCID: the KLID's low word is `langId`, and enabling with `<langId>:<KLID>` adds the language to
  the user's list if it is missing, with the layout as its only input method; removing the layout removes that
  language again (inst §6 item 4 **[VM]**). The installer does nothing else for the language: it adds an **input**
  language and never sets or changes the display (UI) language (D98; VM-25: the display language stayed as it was
  through install, restart and new accounts).
- `langId` `0C00` (inst §6 requirements 2, 3): the KLID's low word is `0C00`; the values `Layout Locale Name` =
  `registration.localeName`, `Custom Language Name` = `registration.customLanguageName`, `Custom Language Display
  Name` = `@%SystemRoot%\system32\<dllName>.dll,-1100` are written. `<0C00>:<KLID>` enables nothing (inst §6 item 4
  **[VM]**), so enabling (§7) adds the tag `registration.localeName` to the user's language list by read-modify-write
  of the list (never a new list, inst §4.4), reads the transient LANGID Windows gave the tag (`TransientLangId`,
  inst §6), and enables `<transient>:<KLID>`. If Windows gives no transient LANGID (inst §6: 4 to 12 per user),
  enabling fails (§7). The installer records that it added the tag and removes the tag on uninstall only then. This
  route follows inst §6 requirement 2 and was confirmed for enabling **[VM]** in yakbd VM run 2
  (`targets/windows-vm-tests.md` VM-5: tag `qaa-Latn`, transient LANGID 2000, the layout loaded); installers
  implement it. Windows also gives a newly added tag its own default input method; the installer leaves it, and it
  goes with the tag on uninstall. Whether uninstall leaves a trace in the user's language settings is still open
  (VM-5).

## 7. Enabling (rule `enableForUser`)

**Default `true`** (D49): the person who runs a keyboard-layout installer wants to type with it, and MSKLC's packages
enable the layout for the installing user too (inst §7 M5d). Only that user: the installer never changes other
existing users, changes the sign-in screen and the profile of new users only by the opt-in of §7.1 (inst §4.7: risky,
opt-in), and never makes the layout the default input method. A tool MAY let the person running the installer override the
file's value.

- The call is `InstallLayoutOrTip("<LLLL>:<KLID>", 0)`, with upper-case hex and no prefix, as Windows stores it
  (inst §4.3, §10), made **as the installing user in that user's session**: from the elevated process only when the
  elevation kept the same account (UAC split token); after "over-the-shoulder" elevation with another account's
  credentials, from an unelevated process of the original user (inst §4.3 **[VM]**, §10 notes).
- If the installer's account is not the account of the session's user (over-the-shoulder elevation, or UAC starting
  the program elevated with other credentials) and it cannot reach a process of that user, it does not enable:
  that is an enabling failure (below), never a call that writes the wrong hive.
- The return value proves nothing (inst §4.3 **[VM]**). Afterwards the installer checks that the layout is in the
  user's layout list (`GetKeyboardLayoutList`) or loads it.
- If enabling fails, the machine part stays installed (the user can still add the layout in Settings), and the
  installer says so and ends with a failure result distinct from a failed install.

### 7.1 Sign-in screen and new users (rule `enableForSignInAndNewUsers`)

**Default `false`** (D87): inst §4.7 calls a layout on the sign-in screen risky (one that fails to load there leaves
the sign-in box with a fallback layout or worse) and asks for it to be opt-in. A file turns it on with
`install.enableForSignInAndNewUsers`; a tool MAY let the person running the installer override the file's value
(yakbd: property `SIGNIN`, §10). It is independent of `enableForUser` (VM-18: `SIGNIN=1 ENABLE=0` worked), except that a
language the places do not have needs a user hive that has it (below).

**The places** (inst §4.7 **[VM]** T8): the sign-in screen reads `HKU\.DEFAULT` (S-1-5-18); Windows' own copy also
writes `HKU\S-1-5-19` and `HKU\S-1-5-20`; new accounts are made from the Default profile,
`C:\Users\Default\NTUSER.DAT`. These four are "the §7.1 places". The installer never touches existing accounts' hives
here (other users stay as §7 says).

**Route: the entries are written directly** (D87), in the shape T8 measured for Windows' own copy, not by running
that copy. Windows' copy (`intl.cpl` with `CopySettingsToSystemAcct` / `CopySettingsToDefaultUserAcct`, or
`Copy-UserInternationalSettingsToSystem`) is the measured route, but it copies **every** input method of the account
that runs it (only `UserID="Current"` is supported, inst §4.7), so it would replace what an administrator chose for the
sign-in screen, it copies an administrator's list after over-the-shoulder elevation (inst §4.3 **[VM]**), and it
carries nothing when the layout is not enabled for that account. What it wrote is measured, so the installer writes
the same entries for its own KLID only. In each place, as the elevated process:

1. **`Preload` and `Substitutes`** by `InstallLayoutOrTipUserReg(<hive name>, NULL, NULL, "<LLLL>:<KLID>", 0)` with
   the hive's key name under `HKEY_USERS` (`.DEFAULT`, `S-1-5-19`, `S-1-5-20`, the load name of the Default profile;
   inst §4.3 **[VM]**: that call writes only these two keys and works on a hand-loaded hive). T8 shape: `Preload`
   `<n> = d<NNN><LLLL>`, `Substitutes` `d<NNN><LLLL> = <klid>`.
2. **`Control Panel\International\User Profile\<tag>`**: the value `<LLLL>:<KLID>` (upper case, as §7), REG_DWORD,
   data = 1 + the highest data of the values already in that subkey, 1 in an empty one (D97: T8 gave `en-US` 2 and 3
   next to `0409:00000409` = 1; VM-19's copy gave a new `fo` subkey 1 although `Preload` got 2).
3. In `.DEFAULT`, `S-1-5-19` and `S-1-5-20` only: the same value under
   `Control Panel\International\User Profile System Backup\<tag>`. **Required** (D97): at the restart Windows
   rebuilt `.DEFAULT` and removed every entry of ours that had no `System Backup` value, also one with a `User Profile`
   value (VM-18, VM-23 **[VM]**); the layout with it stayed and the sign-in screen listed it.

`<tag>` is the subkey of that hive's `User Profile` that already holds a `<LLLL>:` value (a layout of the same
language); with several such subkeys, the first in enumeration order (D94). If the hive has none (the language is not
in that profile, the usual case for a layout of another language than Windows'), the installer writes the whole shape
Windows' own copy wrote in that case (VM-19 **[VM]**), or nothing in that place (D97):

- the tag appended to `User Profile` `Languages` (read-modify-write, inst §4.4) and, in the three system hives, to
  `User Profile System Backup` `Languages`; the subkey `<tag>` under each of those keys; then steps 1 to 3 (step 1 then
  gives `Preload` `<n> = 0000<LLLL>`, `Substitutes` `0000<LLLL> = <klid>`, the first layout of a language, inst §4.2);
- `<tag>` is the tag under which Windows itself filed the LANGID in a loaded user hive (`HKU\S-1-5-21-*`, the
  installing user's first): a `User Profile` subkey that holds a `<LLLL>:` value. Windows' mapping is not a rule this
  document can state (inst §6 item 4 **[VM]**: `0438` became `fo`, `0407` became `de-DE`), so no table and no API
  gives it here;
- no loaded user hive has the language and the installer runs **as LocalSystem** (a deployment): it calls
  `InstallLayoutOrTip("<LLLL>:<KLID>", 0)` itself. As LocalSystem that call writes `.DEFAULT` and files the language
  there under Windows' own tag, with `Languages` appended (VM-26 **[VM]**: `0438` → `fo`). The installer reads that
  tag back and completes the whole shape above in all four places (the `System Backup` values included: the call
  writes none, and without them Windows removed its entries at the restart, VM-26). Windows chooses the tag, so no
  mapping is derived (`LCIDToLocaleName` gives `fo-FO`, not the `fo` Windows filed; D98);
- no loaded user hive has the language and the installer is not LocalSystem (enabling off, over-the-shoulder
  elevation before the user's enabling): a failure of the option (below), saying that the sign-in screen needs a
  user who has the language, and that a repair with the run-time override on (yakbd: `/f SIGNIN=1`) after the user's
  enabling applies it;
- the uninstall entry records, per place, that the installer added the tag (§8, §9).

Step 1 alone is not enough: such a layout was loaded for an account made from the Default profile (VM-19), but
Windows removed it from `.DEFAULT` at the restart, and the account's language list does not show it, a state Windows
may rebuild (inst §4.2, §4.3 **[VM]**).

Before writing, the installer reads each place and writes only the entries that are missing, so a second run adds
nothing. `HKU\S-1-5-19` or `HKU\S-1-5-20` not loaded: skipped and logged.

**The Default profile** is the file `NTUSER.DAT` in the folder `GetDefaultUserProfileDirectoryW` names (Microsoft's
public documentation; inst §4.7: `C:\Users\Default\NTUSER.DAT`); the installer checks that the file exists first,
because `RegLoadKey` would create a missing one. It is loaded with `RegLoadKey` under a name no other key under
`HKEY_USERS` has (yakbd: `YAKBD-<product code>`), and unloaded on every path, success or failure, after the installer
has closed every handle into it. An unload that fails is reported in the end message and the log and is **not** a
failure (D94): the option counts as applied, an uninstall goes on, and the hive stays loaded until the restart; a
later run that finds its load name still loaded uses that hive as it is and unloads it at the end. A missing file or a
load that fails (for example because another program holds the file) is a failure of the option.

**Not applied** (the run says so, logs it, and records the option as off): on ARM64 (inst §2.4: klc2arm64 reports an
unbootable machine after a layout on the sign-in screen and advises against it; not reproduced, and yakbd's VM runner
has no ARM64 guest with a snapshot for it); for a `0C00` layout, whose transient LANGID is per user (inst §6), so no
measured route puts it into these profiles (a file that asks for it fails to build, `windows.registrationInvalid`, §2;
the run-time property can still ask, and is told no). Neither is a failure: the result is that of the rest of the run.

**Failure** of any step: the installer removes exactly what it wrote into the §7.1 places in this run (entries that
were there before stay), keeps the machine part,
records the option as off, still enables for the user (§7), says so, and ends with the failure result of an enabling
(§7; 1603 in yakbd's installers, §10).

**Order and timing** (D97). In the elevated part, after registration and the uninstall entry, and **after the user's
enabling** whenever the elevated process is the user's own account: an elevated process of the signed-in user enables
for that user directly (inst §4.3 **[VM]** T3: that user's hive, loaded at once), so it enables first and then
reads the tag from that user's hive. Only when the elevated process runs as another account (over-the-shoulder
elevation) does the user's enabling come later, from the user's process (§7), and a missing language then fails as above. T8 saw the entries
take effect at once (the sign-in screen's switcher listed the layouts after a lock; an account created afterwards had
them at its first sign-in); `Copy-UserInternationalSettingsToSystem`'s documentation says "after restart" (inst §5).
The installer tells the person that a restart may be needed before the sign-in screen shows the layout.

**Upgrade and repair** (§8). Without a run-time override, an upgrade or repair keeps the recorded state: recorded on,
the missing entries are written again (a repair restores what Windows or a person removed); recorded off, nothing is
added. The file's field decides only a fresh install. With the override, the override wins: on applies the option
and records it, off removes the layout from the §7.1 places as uninstall does (§9) and records it off.

**Measured** (`targets/windows-vm-tests.md` VM-18 to VM-23, Windows 11 x64): the direct shape for a language the
places already have gives the sign-in list before and after a restart and a loaded, typing layout for a new account;
a second run adds nothing; repair, override and uninstall (also after Windows' own copy) behave as written. **Not
measured**: the missing-language shape written by the installer (only Windows' copy of it, VM-19); what Windows keeps in
`S-1-5-19` and `S-1-5-20` after a restart; Windows 10; a new account's first sign-in after an uninstall (VM-20 incomplete).

## 8. Uninstall entry, upgrade, repair

- **Uninstall entry** (rule `uninstallEntry`): one per product, per machine, keyed by the product code (inst §10),
  showing `install.productName`, `install.productVersion`, `install.publisher` and a way to start the uninstaller,
  and recording what the installer chose: KLID, Layout Id, the files it wrote, whether it added a language tag
  (§6), whether §7.1 was applied, and in which §7.1 places it added a language tag. Its registry value names belong to the container and Microsoft's public documentation of uninstall entries,
  not to this format.
- **Upgrade in place** (inst §7, §10 `UPGRADE_IN_PLACE`): same product code, the same or a newer version (an older
  version over a newer one is refused with nothing changed, D80): same KLID and Layout Id,
  files replaced (a file in use is replaced at the next restart, inst §5, §10), values rewritten, recorded files the
  new version no longer has removed, the uninstall entry rewritten, per-user state unchanged. No uninstall first.
  §7.1 state: see §7.1 "Upgrade and repair".
- **Repair** is the same as an upgrade with the same files. If the KLID key is missing (feature updates are reported
  to drop it, inst §4.6, §7 M7), it is recreated from the uninstall entry with the recorded KLID and Layout Id; when
  that Layout Id is taken, §5 gives the new one and the re-enabling, and the uninstall entry records the new id.

## 9. Uninstall

As inst §10 `UNINSTALL`, simplified (D57, as changed by D87); administrator rights. "The layout" is every KLID with
this product's `Layout Product Code`, and the recorded one.

1. **The §7.1 places first** (inst §4.7: remove it from `.DEFAULT` and the Default profile *first*), **always**: whether
   or not the install applied §7.1, and whatever a run-time property says (a property has no effect on uninstall).
   The layout can be there without the option: an administrator may have used Windows' own copy ("Copy settings",
   inst §4.7) after a plain install, and T8 shows that Windows removes stale entries from `.DEFAULT` only, never from
   the Default profile or `S-1-5-19`/`S-1-5-20` (no such removal in its record, inst §4.7 **[VM]**). In each of
   `.DEFAULT`, `S-1-5-19`, `S-1-5-20` (when loaded) and the Default profile (loaded as §7.1 says):
   `InstallLayoutOrTipUserReg(<hive name>, NULL, NULL, "<LLLL>:<KLID>", 1)` for every `<LLLL>:<KLID>` value found
   under `User Profile` (and the KLID's own LANGID), then the `<LLLL>:<KLID>` values under `User Profile\*` and
   `User Profile System Backup\*` (case-insensitive), and a `Substitutes` value that still names the KLID with its
   `Preload` entry (renumbered `1..n`, the fallback of inst §10). A `User Profile System Backup\<tag>` key, and the
   `User Profile System Backup` key itself, that the removal leaves empty is deleted (D94). A tag the uninstall entry records as
   added in that place is removed from both `Languages` values with its subkeys when no `<LLLL>:` value is left in
   them (D97); other languages are left as they are. The uninstaller reads each place back afterwards.
   - The layout is the **only** layout of `.DEFAULT` (where a person types at the sign-in screen): refuse, as for a
     user (inst §10 refusal policy); a tool MAY offer to force it (yakbd: `FORCE=1`). In `S-1-5-19`, `S-1-5-20` and
     the Default profile it is removed without that check (D94): they may have had no keyboard list before the
     install, which would make every later uninstall refuse.
   - The Default profile cannot be loaded: the uninstall goes on and says so (stale entries there are ignored at
     sign-in and by accounts made from it, inst §4.7 **[VM]**); every other failure in a place that was loaded is a
     failure of the uninstall (§0 item 5).
2. **Users**: removed from the current user (`InstallLayoutOrTip` with `ILOT_UNINSTALL`) and from the other **loaded**
   user hives (`InstallLayoutOrTipUserReg` plus the `User Profile` value, inst §4.3 **[VM]**). The uninstaller refuses
   while the layout is the **only** layout of one of those profiles (a tool MAY offer to force it). Offline profiles
   are not touched, also those of accounts created while §7.1 was applied: stale references to a deleted layout are
   ignored at sign-in (inst §4.7 **[VM]**).
3. Then the KLID keys are deleted, the files are deleted (in use: at the next restart, registered with the `System32`
   path, never `Sysnative`, which Windows 11 stores as `SysWOW64`, VM-13; and the user is told to sign out or
   restart, inst §5), a language tag the installer added for the user (§6) is removed, and the uninstall entry is
   deleted last.

Every refusal is checked before anything is removed, so a refused uninstall changes nothing.

## 10. yakbd's installers (container, informative)

The format stays container-neutral (§0 item 1). yakbd's installers are unsigned `.exe` programs, never MSI (D76),
that take `msiexec`'s command line and return Windows Installer's exit codes; the contract is the tool's
`docs/installer-cli.md` (tool commit 191900f). In its terms: install and upgrade in place (§4, §8) are `/i`, repair
(§8) is `/f`, uninstall (§9) is `/x`; a refusal or failure of §0 item 5, §5 or §9 is 1603, a machine kind the
installer does not carry (§3) 1633, a damaged installer (§3) 1620, a newer installed version (D80) 1638, a file left
for the next restart 3010 (1641 when the installer restarted Windows itself: `/quiet` without `/norestart`). An
enabling that failed (§7) is 1603 with the machine part kept; an enabling skipped by design (the program runs as
another account than the session's user, §7) is 0. Versions are compared by their first three fields.
The run-time override of §7.1 is the property `SIGNIN=0|1` (beside `ENABLE=0|1` for §7; other values 1639), read
by `/i` and `/f` and ignored by `/x` (uninstall always cleans the §7.1 places, §9). `SIGNIN=1` on ARM64 or for a
`0C00` layout is not applied and is not a failure (§7.1, exit code that of the rest of the run); a failed §7.1 step is
1603 with the machine part kept, as a failed enabling. The uninstall entry records the §7.1 state.
The registry values of the uninstall entry (§8) are those of that document, §9.

