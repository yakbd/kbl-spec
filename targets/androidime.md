# Target `androidime`: default rules and pinning (0.3 draft, normative)

How a `.kbl.json` file becomes an Android on-screen keyboard: one input-method APK for this one layout (SPEC §16.7),
when `targets.androidime` is silent. The build compiles the layout into a touch runtime file
(`targets/touch-runtime.md`) and repackages a prebuilt YAKBD runtime APK around it: the file as an asset, the package
name and app label from this page's rules, signed with the builder's own key. This target has no position table:
touch keys are KeyIds; its physical-key mode uses the table of `android` (SPEC §16, D151). Android facts are cited
as **[AOSP]** (Android's public developer documentation and AOSP source, recorded in `CLEAN-ROOM.md`, "Android") or
**unmeasured** (this specification's choice, the Android behaviour behind it not yet measured; §8).

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16): one-line rules, no heuristics, knowingly wrong for many
   layouts. A layout that needs anything else says it in `targets.androidime`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported** as `androidimeDefault.<rule>` (SPEC §17.1) with what it decided in
   `detail.value`; policy `accept` by default, `"androidimeDefault.*": "error"` makes a file fully explicit.
4. **One layout, one APK** (D150): every build takes one `.kbl.json` file and writes one APK holding one input method
   with one subtype. Two layouts give two APKs with two package names, installable side by side.
5. What the touch model says (SPEC §9.4, §14.4) is compiled as the touch runtime file can say it; the rest is a loss
   of a kind of SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `packageName` | `org.yakbd.keyboard.` + package slug of `metadata.id` + `.ime` | `packageName` | 5 |
| `appName` | `metadata.name` | `appName` | 5 |
| `language` | the language subtag of `metadata.id` | `language` | 5 |
| `versionCode` | from the leading `a.b.c` digits of `metadata.version`: a × 10000 + b × 100 + c (b and c at most 99); 1 if that gives 0 or there are none | `versionCode` | 5 |
| `versionName` | `metadata.version`, cut to 64 characters; `1.0` if there is none | `versionName` | 5 |
| `touchFromHardware` | a file without touch layer sets gets one, derived from its hardware layers (§2.2) | `touch` in the file | 2 |
| `systemRow` | the bottom row of a set with `systemRow`: `layerSwitch`, `nextKeyboard`, `space`, `enter` (§2.1) | `systemRow` | 2 |
| `returnKeyLabels` | `default` ⏎ (U+23CE), `go` Go, `search` Search, `send` Send, `next` Next, `done` Done, `previous` Previous | `returnKeyLabels` (per action) | 2 |
| `popupColumns` | 8 | `popupColumns` | 2 |
| `physicalKeys` | `true` when the file has hardware layers, else `false` | `physicalKeys` | 3 |
| `keyCode` | key code per position from `targets.android.keys`, else the table of `android` (`targets/android-default-keycode.tsv`) | `targets.android.keys.<p>` | 3 |

**Package slug** (rule `packageName`): `metadata.id` in lower case, every run of characters outside `a`–`z`, `0`–`9`
replaced by one `_`, leading and trailing `_` removed, `layout` if nothing is left, and `l` put in front when it
starts with a digit: `fo-t-k0-windows` → `org.yakbd.keyboard.fo_t_k0_windows.ime`. An Android package name is
segments of letters, digits and `_` that start with a letter, joined by dots **[AOSP]**; a hyphen is not allowed, so
the slug of `targets/macos.md` does not fit. The suffix `.ime` keeps the APK apart from the physical-keyboard APK of
the same layout (`targets/android.md`), so both install side by side.

**Who owns a package name.** Android identifies an app by its package name and signing key. Under Android's developer
verification, a package name belongs to the verified developer who registers it with its key's fingerprint first
**[AOSP]** (developer.android.com/developer-verification). An organisation that publishes keyboards sets its own
reverse-DNS `packageName` and registers it; the default `org.yakbd.keyboard.` names are for one's own builds and
tests. The build report names the package name and the SHA-256 fingerprint of the signing certificate, the two
values a builder registers.

## 2. Touch layout

The touch layer sets of the file (SPEC §9.4) are compiled as `targets/touch-runtime.md` §2–§3 say; the runtime
chooses the set for its screen (§2.1 there).

### 2.1 System row (rule `systemRow`)

A set with `systemRow: true` gets one more row at the bottom of every layer, of height 1 (in `rowHeights` units),
holding the keys of `systemRow` left to right (default `layerSwitch`, `nextKeyboard`, `space`, `enter`):

- `layerSwitch`, width 1.5. The set's *letter layers* are `base` and every layer that a key with `function`
  `shift` or `capsLock` switches to; its other layers are *symbol layers*. On a letter layer the key switches to
  the first symbol layer in file order (label `123`), on a symbol layer to `base` (label `ABC`). A set without
  symbol layers gets no layer-switch key.
- `nextKeyboard`, width 1: `function` `nextKeyboard` (hidden when the system offers its own switch,
  `targets/touch-runtime.md` §3.2).
- `space`, width 5, `stretch`: output `" "`, `function` `space`.
- `enter`, width 1.5: `function` `enter`; its label follows the field's action (rule `returnKeyLabels`).
- `{ "keyId": id }`: the file's key `id`.

The row takes part in the geometry of its layer like any other row (it may be the widest one).

### 2.2 A touch layout from the hardware layers (rule `touchFromHardware`)

A file without `touch` gets one set: no `minDeviceWidth`, no orientation, `systemRow: true`, and two layers, `base`
from the hardware state without modifiers and `shift` (with `returnLayerId: base`) from the state with Shift
(each resolved with SPEC §9.3). The rows are four rows of positions, each position that has a binding in that state
becoming a key of width 1 with the binding's output or dead key:

1. `Digit1` … `Digit0`, `Minus`, `Equal`;
2. `KeyQ` … `KeyP`, `BracketLeft`, `BracketRight`;
3. `KeyA` … `KeyL`, `Semicolon`, `Quote`, `Backslash`;
4. `IntlBackslash`, `KeyZ` … `KeyM`, `Comma`, `Period`, `Slash`;

with a Shift key (width 1.5; on `base` to `shift`, on `shift` to `base`) at the start of row 4 and a Backspace key
(width 1.5) at its end. A row without any bound position is left out. Every hardware layer that serves another state
(AltGr, Caps Lock, …) is not on the touch keyboard: `androidime.layerNotDerived`. A file with neither touch sets nor
hardware layers cannot be built (`androidime.noTouchLayout`). The rule is knowingly crude: no caps lock, no symbols
layer, the digits always in the first row.

### 2.3 Return key, popups, special keys

- The Return key's label is `returnKeyLabels` for the action the field asks for (`EditorInfo` `IME_ACTION_*`;
  `default` for none and unspecified) **[AOSP]**; the runtime performs that action, or types a newline where the
  field is multi-line or asks for no action (`IME_FLAG_NO_ENTER_ACTION`).
- Long-press popups show `popupColumns` choices per row, inside the keyboard's own window.

## 3. Physical keys

With `physicalKeys` (default: when the file has hardware layers), the APK also types the hardware layers when a
physical keyboard is used while this input method is active: the runtime receives the key events before the
application and types what the file's layers say, as the touch runtime file's `hardware` map gives it
(`targets/touch-runtime.md` §6). This lifts the limits of a `.kcm` (strings, every dead key, characters outside the
BMP) for users who install the input method; the physical-keyboard layout chosen in the system settings still
decides what reaches applications whose keys the runtime passes on.

- **Key codes** (rule `keyCode`, D151): a position's Android key code is its pin `targets.android.keys.<p>`, else the
  row of `targets/android-default-keycode.tsv`, the table of the physical-keyboard target, so one layout file maps
  positions to key codes alike in both Android builds. A position with bindings and no code: `androidime.keyCodeMissing`.
- **Modifiers.** Shift, Caps Lock, Control and left and right Alt (`altR` is AltGr) are read from the event's meta
  state; `ctrlL`/`ctrlR` are widened (`androidime.sideModifierWidened`); custom components are not compiled
  (`androidime.modifierUnmapped`); `capsLockOffBy` `shift` and `bidiMarksOnShiftBackspace` are not compiled
  (`androidime.settingNotCompiled`).
- Events in a state with Control or left Alt that no layer names explicitly reach the application (shortcuts).

## 4. Dead keys and transforms

`deadKeys` and the machine of SPEC §14.2 are compiled unchanged into the touch runtime file and run by the runtime on
the text it sends through the input connection (`targets/touch-runtime.md` §4): every part of the model (`spacing`,
`entries` in order, chained results, `noMatch`, the backspace action) is kept. A pending dead key shows nothing in
the field. Transforms run as literal rules on the runtime's own context (§5 there): what cannot be expanded into
literal rules, and `reorders`, report `androidime.transformNotCompiled`; markers beyond 32
`androidime.tooManyMarkers`. With normalisation enabled, outputs are normalised at build time only
(`general.normalizationNotApplied`).

## 5. Files and installation

- **Input:** one `.kbl.json` file and a runtime APK (`-runtime runtime.apk`) whose manifest
  (`assets/yakbd/runtime.json`, `targets/touch-runtime.md` §7) lists the touch runtime version the build writes.
- **Output:** one APK: the runtime with the touch runtime file as `assets/yakbd/layout.json`, the package name
  `packageName` (also in names derived from it, such as permissions and provider authorities), the label `appName`,
  `versionCode` and `versionName`, signed (APK signature schemes v2 and v3) with the builder's key (`-key`), or with a
  generated test key and a warning. The input method's one subtype has the locale `language` and is registered by
  the runtime when it starts **[AOSP]**. No network permission, no data collection.
- **Install** (**unmeasured**, §8): `adb install`; or the file opened on the device, with installs from unknown
  sources allowed. Under developer verification, installs through `adb` stay possible; other installs on certified
  devices need a package name registered with the key's fingerprint, by an organisation (Android Developer Console)
  or an end user (a free limited-distribution account, or the device's advanced flow) **[AOSP]**.
- **Enable and select** (**unmeasured**): Settings → System → Keyboard → On-screen keyboard, switch it on, then choose
  it with the keyboard switch key or the system's keyboard picker; headless: `adb shell ime enable <package>/<service>`
  and `adb shell ime set <package>/<service>`.

## 6. Pinning

`yakbd pin -target androidime` writes into `targets.androidime` the value of every rule that has a field:
`packageName`, `appName`, `language`, `versionCode`, `versionName`, `systemRow`, `returnKeyLabels`, `popupColumns`,
`physicalKeys`; the `keyCode` rule pins into `targets.android.keys`; rule `touchFromHardware` pins by writing the
derived set into `touch` and its keys into `keys` (ids `hw.<layer>.<position>`, `hw.shift`, `hw.backspace`).

## 7. Carried, not compiled

Touch layer `modifiers` (shown nowhere); `deviceClass` (a label; the runtime chooses by width and orientation);
flick paths of more than one direction (`androidime.flickPathDropped`); `tests` (`general.testsDropped`);
`extensions` and `cldrSpecial` (`general.extensionDropped`); `displays` entries for keys that are not placed.

## 8. Measured and unmeasured (informative)

Not yet measured, for the emulator cases of the runtime: the APK installs on API 34–36 and two such APKs with
different package names install side by side; `ime enable` / `ime set` select it headless; taps at the rectangles
the runtime reports type the expected text through the touch layers; physical key events from a `uinput` keyboard
reach the runtime and type the hardware layers; the next-keyboard key follows
`shouldOfferSwitchingToNextInputMethod`.
