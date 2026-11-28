# Target `android`: default rules and pinning (0.3 draft, normative)

How a `.kbl.json` file becomes an Android physical-keyboard layout: one `.kcm` key character map in one APK without
code (SPEC §16.6), when `targets.android` is silent. Android facts are cited as **[AOSP]** (Android's public
documentation and the AOSP sources, read for facts only and listed in `CLEAN-ROOM.md`, "Android"; the parser and
lookup in `frameworks/native` `libs/input/KeyCharacterMap.cpp`, the dead keys in `frameworks/base`
`core/java/android/view/KeyCharacterMap.java`, both at the tag `android-15.0.0_r1`), **[AND]** (measured on
GitHub's Linux runners with the Android emulator by the Android check of `yakbd/yakbd-cli`, `tools/android-check/`,
with the run named), or **unmeasured** (this specification's choice, the Android behaviour behind it not yet
measured; §8).

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16): a fixed table and one-line rules, no heuristics, knowingly
   wrong for many layouts. A layout that needs anything else says it in `targets.android`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported** as `androidDefault.<rule>` (SPEC §17.1) with what it decided in
   `detail.value`; policy `accept` by default, `"androidDefault.*": "error"` makes a file fully explicit.
4. **One layout, one APK** (D150): every build takes one `.kbl.json` file and writes one APK with one keyboard layout.
5. What the hardware layers say (SPEC §9.3, §14) is compiled as far as a `.kcm` can express it; the rest is a loss of a
   kind of SPEC §17.3. A `.kcm` types **one UTF-16 unit** per key and modifier state: no strings, nothing outside the
   BMP, and dead keys only through Android's own accents (§4).
6. **The written file must parse.** Android drops a `.kcm` file with a single token it refuses (an unknown key code
   name, a duplicate block, property or `map key` line, a character literal that is not printable ASCII or an
   escape) as a whole and silently keeps the generic map **[AOSP]**; a UTF-8 character inside quotes is such a token
   **[AND run 46135619206]**. A build writes every character outside printable ASCII as `\uXXXX` and only names of
   Android 15.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `packageName` | `org.yakbd.keyboard.` + package slug of `metadata.id` + `.kcm` | `packageName` | 5 |
| `label` | `metadata.name` (`metadata.id` when empty) | `label` | 5 |
| `layoutName` | the package slug of `metadata.id` | `layoutName` | 5 |
| `keyboardLocale` | the language subtag of `metadata.id`, then `metadata.locales`, without repeats | `keyboardLocale` | 5 |
| `versionCode` | as `targets/androidime.md` rule `versionCode`: a × 10000 + b × 100 + c from the leading `a.b.c` digits of `metadata.version`; 1 if that gives 0 or there are none | `versionCode` | 5 |
| `versionName` | `metadata.version`, cut to 64 characters; `1.0` if there is none | `versionName` | 5 |
| `keyCode` | key code per position from `targets/android-default-keycode.tsv` | `keys.<p>.keyCode` | 2 |
| `scanCode` | scan code per position from `targets/android-default-keycode.tsv` | `keys.<p>.scanCode` | 2 |
| `deadKeyAccent` | the combining character of each dead key: the one whose spacing accent is the dead key's `spacing`, else the one that composes the most entries (the lowest on a tie) | `deadKeys.<id>.accent` | 4 |

**Package slug** (rules `packageName`, `layoutName`): as in `targets/androidime.md` §1: `metadata.id` in lower case,
every run of characters outside `a`–`z`, `0`–`9` one `_`, leading and trailing `_` removed, `layout` if nothing is
left, `l` in front of a leading digit: `fo-t-k0-windows` → `org.yakbd.keyboard.fo_t_k0_windows.kcm`. The suffix `.kcm`
keeps this APK apart from the input-method APK of the same layout (`.ime`), so both install side by side.

No rule exists for `keyboardLayoutType`: absent unless given (Android then treats the type as undefined **[AOSP]**).

**Who owns a package name.** As for `androidime` (`targets/androidime.md` §1): Android identifies an app by its package
name and signing key; under developer verification a package name belongs to the verified developer who registers it
with its key's fingerprint first **[AOSP]** (developer.android.com/developer-verification). An organisation sets its
own reverse-DNS `packageName`; the `org.yakbd.keyboard.` names are for one's own builds and tests. The build report
names the package name and the SHA-256 fingerprint of the signing certificate (`apk.signed`), the two values a builder
registers.

## 2. Position table

The default table from position names to the target's codes: `targets/android-default-keycode.tsv` (SPEC §16,
"Position tables"). Per position it gives the Android key code (a `KEYCODE_` name of `KeyEvent`), the Linux input scan
code of the key (Chromium's table of W3C code values), the key code Android's generic key layout `Generic.kl` gives
that scan code, and a class. Android reads a hardware key as scan code → key code (through the device's key layout,
`Generic.kl` for ordinary keyboards; an app cannot ship one **[AOSP]**) and then key code + modifier state → character
(the key character map, which an app can ship) **[AOSP]**.

- **`keyCode`**: a position's key code is `keys.<p>.keyCode`; otherwise the table's; otherwise it has none, and a
  position with bindings and no key code is left out (`android.keyCodeMissing`). A pinned name that Android 15 does not
  know is `android.keyCodeUnknown` (an error: the system would refuse the whole file). Two positions with the same key
  code report `android.keyCodeDuplicate`.
- **`scanCode`**: a position's scan code is `keys.<p>.scanCode`, otherwise the table's; two positions with the same
  scan code report `android.scanCodeDuplicate`.
- **`map key` lines** (no rule; decided by the two above). A position with bindings or a pin, whose key code is not the
  key code the generic key layout gives its scan code, gets the line `map key <scanCode> <keyCode>`; so does one whose
  scan code is not in the table. The table's one row whose key code differs from the generic one is `IntlBackslash`:
  the generic key layout gives its scan code 86 the same key code as `Backslash` (`BACKSLASH`), so the table gives it
  `PLUS`, as 36 of AOSP's 50 layouts do, and a layout that binds `IntlBackslash` gets `map key 86 PLUS` **[AOSP]**. A
  position pinned to another key code (a Dvorak layout that keeps shortcuts on its letters, Caps Lock pinned to
  `KEYCODE_ESCAPE`) gets its line the same way. A position without bindings and without a pin keeps the generic key
  code of its scan code, even when that is the key code of another position (knowingly: the key then types that
  position's bindings).
- **System keys.** The table's class `system` (modifiers, Enter, Backspace, Tab, Escape, navigation, function, media
  and language keys) marks keys the build never writes a block for: Android keeps their own behaviour. A binding there
  that is the control character the key types anyway (U+0008, U+0009, U+000A, U+000D, U+001B, U+007F) reports
  nothing; any other binding reports `android.systemKeyKept`. A pinned key code is a system key when the table gives
  it to a `system` row.

## 3. Modifiers and layers

**States.** A `.kcm` key block lists behaviours per modifier combination **[AOSP]**. The build uses six modifiers:
Shift, Caps Lock, left and right Control, left and right Alt. Their 64 combinations are the build's **states**,
numbered by adding Shift 1, Caps Lock 2, left Control 4, right Control 8, left Alt 16, right Alt 32, and each is the
kbl modifier state (SPEC §7.3) with those keys held (`shift`; `caps`; `ctrlL`, `ctrlR`; `altL`, `altR`, so `altR` is
AltGr). For each position with a block and each state the character is `resolve(P, s)` (SPEC §9.3) as §4 and §5 below
turn it into one UTF-16 unit, with one exception: in a state with Control or left Alt held, the `["other"]` layer
does not apply (as `targets/androidime.md` §3: shortcuts reach the application).

**Lookup.** Android tries a key's behaviours from the last written to the first and takes the first that matches; a
behaviour matches when the event has at least its modifiers and exactly its Control, Alt and Meta keys (a behaviour
naming `ctrl` or `alt` covers either side; one naming a side, only that side) **[AOSP]**. A key with a block types only
what its block says: the block replaces the generic map's block for that key code as a whole **[AOSP]**.

**Blocks.** The build writes, for each position with bindings that is not a system key: the `label` line (§5), then
the generic map's fallbacks the block would otherwise lose (`SPACE`: `alt, meta: fallback SEARCH` and
`ctrl: fallback LANGUAGE_SWITCH`, the shortcut that switches keyboard layouts), then one behaviour per state, in
order of the number of modifiers (then of the state number), wherever Android's lookup of the lines written so far
does not already give the state's character; `none` where it would give a character and the state types nothing.
Consecutive states with the same behaviour share one line (`shift, capslock: 'A'`). The result types exactly the
model's character in each of the 64 states (the build checks it with its own copy of the lookup). With Meta, Sym or
Fn held the key types nothing, as in the generic map; Num Lock and Scroll Lock do not change it.

- **Caps Lock**: a state of its own, filled per key from `resolve()`: `capsLockFallback`, Caps Lock layers of any
  shape and an explicit nothing are expressed exactly.
- **Sides**: exact; a layer for `ctrl` or `alt` covers both sides and both keys held, `ctrlL` / `altL` (and the right
  ones) the one side only.
- **Custom components** cannot be Android modifiers: `android.modifierUnmapped` for each layer whose modifier sets
  need one (those sets never match a build state).
- **Number pad.** A `numLock` position (SPEC §14.1) is built with Num Lock only: `base: fallback <navigation key>` of
  the generic map and `numlock: <its base binding>`; with Num Lock on Shift gives that binding too. Other layers of
  it: `android.numLockKeyReduced`.
- **`capsLockOffBy` `shift`, `bidiMarksOnShiftBackspace`**: `android.settingNotCompiled`.

**Outputs.** One UTF-16 unit is written as a character literal; nothing (no binding, `{"output": ""}`) as no
character. More than one unit: `android.outputMultiCharacter`; one character outside the BMP:
`android.outputOutsideBmp`; U+0000 or a lone surrogate: `android.outputUnencodable`; all three type nothing. One of
the combining characters of §4 makes the key a dead key on Android: `android.combiningIsDeadKey`.

## 4. Dead keys

A `.kcm` has no dead-key table. A key whose character is one of Android's **combining accents** is a dead key: it
shows the accent's spacing form, and the next character is composed with it **[AOSP]**: the same accent or a space
gives the spacing accent; a character that Unicode NFC composes with the combining character into one character
gives that (plus the platform's own stroke pairs: D, G, H, I, L, O, T and their small letters with U+0335); any other
character leaves the accent and follows it. The accents of Android 15 **[AOSP]** (combining character → spacing
accent): U+0300 → U+02CB, U+0301 → U+00B4, U+0302 → U+02C6, U+0303 → U+02DC, U+0304 → U+00AF, U+0306 → U+02D8,
U+0307 → U+02D9, U+0308 → U+00A8, U+0309 → U+02C0, U+030A → U+02DA, U+030B → U+02DD, U+030C → U+02C7,
U+0312 → U+02BB, U+0313 → U+1FBD, U+0314 → U+02BD, U+0315 → U+02BC, U+031B → `'`, U+0323 → `.`, U+0327 → U+00B8,
U+0328 → U+02DB, U+0329 → U+02CC, U+0331 → U+02CD, U+0335 → `-`; one way only U+0340, U+0341, U+0343, U+030D,
U+030E. The spacing accents `` ` ``, `^`, `~`, `'` and `"` stand for U+0300, U+0302, U+0303, U+0301 and U+0308 (so
U+031B, whose accent is `'`, composes as U+0301). AOSP's documentation names five of these (U+0300, U+0301, U+0302,
U+0303, U+0308); the platform source at the Android 15 tag has all of them, and the build follows the source (D168). What the user sees while
a dead key is pending, and the composition itself, are the work of the application's text field (Android's
`EditText` key listener **[AOSP]**; measured there, §8); other text stacks may differ (**unmeasured**).

- **`deadKeyAccent`**: a dead key's accent is `deadKeys.<id>.accent`; otherwise the combining character whose
  spacing accent is its `spacing` (the legacy forms included); otherwise the accent that composes the most of its
  entries (base and result one unit each) to their results, the lowest code point on a tie. None composes any:
  `android.deadKeyNoAccent`, and its keys type its `spacing` when that is one unit, else nothing.
- Entries Android composes differently (a different result, or none: the accent stays and the base follows; a base
  or result that is not one character; a chained dead key): `android.deadKeyEntryDiffers`, one entry per dead key
  with the entries in `detail`. What Android composes beyond the file's entries, and `noMatch`, are not reported
  (knowingly: Android's no-match is always the accent followed by the character, `emitBoth`).

## 5. Files and installation

- **Input:** one `.kbl.json` file. **Output:** one APK (`compile -target android`; `installer -target android`
  writes the same APK, which is its own installer). It holds:
  - `AndroidManifest.xml`: `package` = `packageName`, `versionCode`, `versionName`, `uses-sdk` minimum 34, target 35;
    an `application` with `android:label` = `label` and `android:hasCode="false"`; one `receiver` (`<package>.Layouts`,
    exported, a class that does not exist) with an intent filter for
    `android.hardware.input.action.QUERY_KEYBOARD_LAYOUTS` and the meta-data
    `android.hardware.input.metadata.KEYBOARD_LAYOUTS` naming `res/xml/keyboard_layouts.xml` **[AOSP]**;
  - `res/xml/keyboard_layouts.xml`: one `keyboard-layout` with `android:name` = `layoutName`, `android:label` =
    `label`, `android:keyboardLayout` = `@raw/<layoutName>`, `android:keyboardLocale` = the tags of `keyboardLocale`
    joined by `|`, and `android:keyboardLayoutType` when given **[AOSP]**;
  - `res/raw/<layoutName>.kcm` (`type OVERLAY`, then the `map key` lines, then the key blocks in key-code order);
  - `resources.arsc`; signed with APK signature schemes v1, v2 and v3 with the builder's key (`-key`), or a generated
    test key with a warning (`apk.testKey`).
  The system never runs the receiver: it reads only its meta-data, so the APK needs no code; without
  `android:hasCode="false"` an APK without code is refused **[AND run 46135619206]**.
- **Install:** `adb install <file>.apk`, or open the file on the device with installs from unknown sources allowed.
- **Select:** Settings → System → Keyboard → Physical keyboard → the keyboard → the layout (its `label`). Android 15
  and later store the choice per keyboard, user and on-screen keyboard subtype, and may choose the layout themselves
  when a `keyboardLocale` matches the language of the current on-screen keyboard subtype **[AND run 46135619206]**.
  The layout's descriptor is `<packageName>/<packageName>.Layouts/<layoutName>`.
- **Developer verification.** From 2026 Android checks on certified devices that an app's package name is registered,
  with its signing key's fingerprint, by a verified developer; enforcement started 2026-09-30 in four countries for
  installs from participating stores, and is to reach other installs and all regions from 2027 **[AOSP]**
  (developer.android.com/developer-verification). For a builder of this APK that means: `adb install` stays possible;
  an **organisation** verifies itself (Android Developer Console), registers its own `packageName` with the
  fingerprint the build reports, and its APKs install normally; an **end user** with their own key installs with
  `adb`, through the device's one-time advanced flow, or registers the package under a free limited-distribution
  account. YAKBD registers nothing and signs nothing for anyone.

## 6. Pinning

`yakbd pin -target android` writes into `targets.android` the value of every rule: `packageName`, `label`,
`layoutName`, `keyboardLocale`, `versionCode`, `versionName`, `keys.<p>.keyCode` and `keys.<p>.scanCode` of every
position the build uses, and `deadKeys.<id>.accent` of every dead key a key reaches.

## 7. Carried, not compiled

Touch layer sets and flicks (`general.touchDropped`: target `androidime` builds them); `displays`
(`general.displayDropped`); `tests` (`general.testsDropped`); `extensions` and `cldrSpecial`
(`general.extensionDropped`); metadata other than the names, `locales` and `version` (`general.metadataDropped`);
`transforms` (`android.transformNotCompiled`); with normalisation enabled, outputs are normalised at build time only
(`general.normalizationNotApplied`). The `label` of each key block is derived, not carried: the spacing accent of a
dead key, else the upper case of the base character.

## 8. Measured and unmeasured (informative)

Measured with APKs built by `aapt2` by the Android check (`tools/android-check/`, run 46135619206, 2026-11-28; x86_64
`google_apis` emulator images of API 34, 35 and 36): a code-free APK with `android:hasCode="false"` installs and its
layout is listed and offered for a keyboard on all three; on **API 35 and 36** a layout chosen for a uinput keyboard
(by the settings' own route, by the language of the on-screen keyboard subtype, or written into the system's state
file) types through its `.kcm`: a remapped letter, an AltGr (`ralt`) character and a dead acute composed with the next
key. On **API 34** every route stores the choice but no layout is ever applied (the keyboard keeps the generic map);
the cause is not known. **The tested floor is Android 15 (API 35)**; the APK still declares minimum 34, where it installs
and is listed but, as measured, does not type.

Measured with an APK written by this target (`yakbd compile -target android`, no Android SDK; run 46155692254,
API 35 and 36): it installs, has no `HAS_CODE` flag and its layout is listed; its key blocks type through the
chosen layout: a Caps Lock layer of its own, Shift, and Caps Lock turned off again; a dead diaeresis and a dead
caron (an accent beyond the five of AOSP's documentation, D168) each compose with the next key.

Not yet measured (the run's harness lost the first keys of a long burst): `map key` lines (a swapped pair,
`map key 86 PLUS`), AltGr through `ralt`, the other four documented accents through a build of this target, and an
`android.outputMultiCharacter` key typing nothing.
