# Coverage: Android `.kcm` key character maps → `.kbl.json`

Every element of the `.kcm` format and of its APK, with its home in `.kbl.json` or the loss kind that reports it (target
`android`, `targets/android.md`). The format is read as Android 15's own parser reads it (AOSP `frameworks/native`
`libs/input/KeyCharacterMap.cpp` at `android-15.0.0_r1`; `CLEAN-ROOM.md`, "Android"): a file it would refuse is refused
here too.

## 1. Sources

- AOSP: the parser and lookup (`KeyCharacterMap.cpp`), the key code names (`InputEventLabels.cpp`), the dead keys
  (`core/java/android/view/KeyCharacterMap.java`), the generic maps (`data/keyboards/Generic.kl`, `Generic.kcm`), the
  receiver and meta-data (`KeyboardLayoutManager.java`, `core/res/res/values/attrs.xml`), and the documentation page
  "Key character map files" (source.android.com). All Apache-2.0, read for facts.
- Corpus: the 50 layouts of AOSP `frameworks/base` `packages/InputDevices/res/raw` (commit 1cdfff555f4a, Apache-2.0),
  kept unmodified as fixtures of the tool repository; each imports and builds back to the same characters in every
  state of §4.

## 2. `.kcm` elements

| element | home | notes |
|---|---|---|
| `#` comments, blank lines, white space | none | not kept |
| `type OVERLAY` | none | a layout in an APK must say it; every written file says it |
| `type FULL`, `ALPHA`, `NUMERIC`, `PREDICTIVE`, `SPECIAL_FUNCTION` | none | a device's base map; imported as an overlay (`android.kcmNotOverlay`) |
| `map key <scan code> <key code>` | the position of the scan code (table, else `Scan<n>` with a `targets.android.keys.<p>.scanCode` pin) and, when its key code is not the table's, a `targets.android.keys.<p>.keyCode` pin | rebuilt by the `map key` rule of `targets/android.md` §2 |
| `map key usage <usage> <key code>` | none | `android.kcmUsageMapDropped` |
| `key <key code> { … }` | the bindings of one position in the layers of §4 | position: the one a `map key` line gives that key code; else the table's row whose generic key code it is (when no `map key` line moved its scan code); else a position named `KEYCODE_<name>` with a `keyCode` pin and no scan code |
| `label:` | none | derived by a build; a different one is `android.kcmLabelDropped` |
| `number:` | none | Android derives it; `android.kcmLabelDropped` |
| `base:`, `shift:`, `capslock:`, `lctrl:` … and their `+` combinations | bindings in the layers of the states they reach (§4) | read through Android's lookup, never property by property |
| `rshift` (differing from left Shift), `meta`, `lmeta`, `rmeta`, `sym`, `fn`, `numlock`, `scrolllock` | none | `android.kcmModifierDropped` when they change what the key types; `numlock` on a key whose `base` types nothing makes a `numLock` position (SPEC §14.1) with the Num Lock character as its binding |
| a character literal (`'a'`, `'\n'`, `'\t'`, `'\\'`, `'\''`, `'\"'`, `'\uXXXX'`) | a Text binding of that character | a combining accent of `targets/android.md` §4 becomes a dead-key binding |
| `none` | no binding in that state (`settings.capsLockFallback` is `false`) | |
| `fallback <key code>`, `replace <key code>` | none | `android.kcmFallbackDropped`, except those a build writes itself (`SPACE`'s, the number pad's) |

## 3. The APK

| element | home |
|---|---|
| `manifest@package` | `targets.android.packageName` |
| `versionCode`, `versionName` | `targets.android.versionCode`, `versionName` |
| `application@label`, `keyboard-layout@label` | `targets.android.label` |
| `keyboard-layout@name`, `res/raw/<name>.kcm` | `targets.android.layoutName` |
| `keyboard-layout@keyboardLocale` | `targets.android.keyboardLocale` (split at `|` and `,`) |
| `keyboard-layout@keyboardLayoutType` | `targets.android.keyboardLayoutType` |
| `keyboard-layout@vendorId`, `productId` (hidden attributes) | none |
| several `keyboard-layout` elements | one file per layout (D150) |
| the signature | none: the builder signs |

The tool reads `.kcm` files; it has no APK importer (an APK's `.kcm` can be taken out of the zip and read).

## 4. Importer conventions (`.kcm` → `.kbl.json`)

- **States.** For each key block, the character Android's lookup gives in each of the 64 states of
  `targets/android.md` §3 (Shift as left Shift). States with both Control keys or both Alt keys held are left out
  (a modifier set cannot say "both"; `android.kcmModifierDropped` when a key types something there).
- **Layers.** States in which every key types the same are one layer, its modifier sets one per state (for example
  `[["shift"], ["caps"]]`), in order of the lowest state; a state in which no key types anything gets no layer.
  `settings.capsLockFallback` is `false` and `settings.normalization` `disabled`: the layers say every state exactly.
- **Dead keys.** Each combining accent a key types becomes the dead key `u<hex>` (`u0301`): `spacing` the spacing
  accent, entries for space and the accent itself (the spacing accent) and every character Android composes with it
  (§4 of the target page), `targets.android.deadKeys.<id>.accent` pinned.
- **Metadata.** `metadata.name` is the file's name without `.kcm`, `metadata.id` `und-x-` + its slug (subtags cut to 8
  characters), `provenance.format` `kcm`; `targets.android.layoutName` the file's name when it is a resource name.
- A build of the imported file types what the original types in every state of §4, with the same `map key` lines
  (tested on the whole corpus).
