# Coverage: kbdgen bundles (`.kbdgen`) → `.kbl.json`

Every part of a kbdgen bundle, with its home in `.kbl.json` or the loss kind that reports it (format `kbdgen`,
SPEC §16.11). Importer and writer: `yakbd convert -from kbdgen` / `-to kbdgen`. A bundle may hold several layouts; one
`.kbl.json` holds one, so an import writes one file and one loss report per `layouts/<tag>.yaml`, and an export writes
a bundle with exactly that one layout (D150, D207).

## 1. Sources

kbdgen has no formal schema; its Rust data model is the definition. This page follows **kbdgen 3.0.0-beta.5 at
commit `7a93e952849295a8bd4e9b21f57e6d43028289cf`** (2026-11-19; github.com/divvun/kbdgen, MIT OR Apache-2.0):
`src/bundle/project.rs`, `src/bundle/target/mod.rs`, `src/bundle/layout/*.rs` (the structures), `src/util/iso_key.rs`
with the key maps of `src/build/*/keymap.rs` (the order of hardware rows), `src/build/android/generate_android.rs`
(special keys), and the special key names of kbdgen's iOS template, `Keyboard/Models/KeyDefinition.swift` of
divvun/giellakbd-ios at commit `d877da4` (MIT OR Apache-2.0). Bundles of the giellalt `keyboard-*` repositories (MIT) are the corpus; `keyboard-sme` at commit
`c2b103b` was read for the shapes below. A newer kbdgen that changes the model is a change of this page. Every
source is listed in `CLEAN-ROOM.md` ("kbdgen").

## 2. Bundle files

A bundle is a folder `<name>.kbdgen` with `project.yaml`, `targets/<target>.yaml`, `layouts/<tag>.yaml` and
`resources/`.

| part | home in `.kbl.json` | loss |
|---|---|---|
| `project.yaml` `locales.<tag>.name` / `.description` | the project's name and description in the layout's own language (or `en`) → `metadata.description`; others dropped | `general.metadataDropped` |
| `project.yaml` `author`, `email` | `metadata.authors[0]` `name`, `email` | — |
| `project.yaml` `copyright` | `metadata.copyright` | — |
| `project.yaml` `organisation` | `metadata.organization` | — |
| `project.yaml` `dependencies` (other bundles) | none | `kbdgen.bundleDataDropped` |
| `targets/android.yaml` `packageId` | `targets.androidime.packageName` (kbdgen's Android build is an on-screen keyboard) | — |
| `targets/android.yaml` `version`, `build` | `targets.androidime.versionName`, `versionCode` | — |
| `targets/android.yaml` store and signing data (`keyStore`, `keyAlias`, `storePassword`, `keyPassword`, `playStoreAccount`, `playStoreP12`) | none; never copied | `kbdgen.bundleDataDropped` |
| `targets/ios.yaml` `packageId`, `bundleName`, `version` | `targets.ios.bundleId`, `appName`, `bundleVersion` | — |
| `targets/ios.yaml` `build`, `codeSignId`, `teamId`, `provisioningProfileId`, `sentryDsn`, `appStoreKeyJson`, `match*`, `fastlane*` | none; signing belongs to the builder (D204) | `kbdgen.bundleDataDropped` |
| `targets/macos.yaml` `packageId`, `bundleName`, `version` | `targets.macos.bundleId`, `bundleName`, `bundleVersion` | — |
| `targets/macos.yaml` `codeSignId`, `build` | none | `kbdgen.bundleDataDropped` |
| `targets/windows.yaml`, `targets/chrome.yaml` (`appName`, `version`, `url`, `uuid`, `build`, `appId`) | none (installer data of kbdgen's own builds) | `kbdgen.bundleDataDropped` |
| `resources/` (icons, readme, background) | none | `kbdgen.bundleDataDropped` |

Bundle-level data is copied into every layout's file where it has a home, and reported in every layout's report
where it has none (`kbdgen.bundleDataDropped`, `detail` naming the file and member, never the value).

## 3. Layout files

`layouts/<tag>.yaml`, one per layout.

| member | home in `.kbl.json` | loss |
|---|---|---|
| file name `<tag>` (`languageTag`) | `metadata.id` (the tag, with `-t-k0-kbdgen` added when it has no `-t-` part, so the id is a keyboard id) | — |
| `displayNames` | the name in the layout's own language (the autonym, else `en`) → `metadata.name`; the others → `metadata.localizedNames` | — |
| `decimal` | none (the number pad's decimal separator of kbdgen's builds) | `kbdgen.layoutDataDropped` |
| `keyNames.space`, `keyNames.return` | `displays.entries` for the space key and the enter key of every touch layer | — |
| `longpress` (key text → choices) | `longPressKeyIds` of every touch key whose output is that text (one key per choice, with that output) | — |
| `transforms` (tree) | `deadKeys` (§3.3) | — |
| `windows`, `macOS`, `chromeOS` | the hardware layers (§3.1); their `config` (`locale`, `id`, `xkbLayout`) | `kbdgen.layoutDataDropped` for `config` |
| `android`, `iOS` | touch layer sets (§3.2); their `config` (`spellerPackageKey`, `spellerPath`) | `kbdgen.layoutDataDropped` for `config` |

### 3.1 Hardware sections

A hardware layer is a string of whitespace-separated key texts in kbdgen's ISO order: `E00`–`E12`, `D01`–`D12`,
`C01`–`C12`, `B00`–`B10`, which are the positions `Backquote`, `Digit1` … `Equal`, `KeyQ` … `BracketRight`, `KeyA` …
`Backslash`, `IntlBackslash`, `KeyZ` … `Slash` (`src/build/chromeos/keymap.rs`). `\u{…}` escapes are decoded. Layer
names → modifier sets: `default` `[]`, `shift` `["shift"]`, `caps` `["caps"]`, `caps+shift` `["caps","shift"]`,
`alt` `["altR"]`, `alt+shift` `["altR","shift"]`, `alt+caps` `["altR","caps"]`, `ctrl` `["ctrl"]`.

- **One hardware layer set per file.** The layers come from `windows` when the layout has it, else `macOS`, else
  `chromeOS`. A section whose layers type differently from the chosen one reports `kbdgen.hardwareSectionsDiffer`
  (per differing key and layer, in `detail`).
- macOS `cmd`, `cmd+shift`, `cmd+alt`, `cmd+alt+shift` layers: Command layers have no home (SPEC §16.4 offers a
  Command component only as a custom modifier): `kbdgen.layerUnmapped`.
- macOS `space` (layer → text): the binding of `Space` in that layer.
- `deadKeys` (layer → list of texts): in that layer, the key whose text is listed is a dead key (§3.3).

### 3.2 Touch sections

A touch layer is a string of rows (one per line) of whitespace-separated keys: a text, or a special key
`\s{name}` / `\s{name:width}`.

| section | touch layer set |
|---|---|
| `android` `primary` | `deviceClass: phone`, no `minDeviceWidth` |
| `android` `tablet-600` | `deviceClass: tablet`, `minDeviceWidth: 95` (600 dp, `targets/touch-runtime.md` §2.1) |
| `iOS` `primary` | `deviceClass: phone`, no `minDeviceWidth` |
| `iOS` `iPad-9in` | `deviceClass: tablet`, `minDeviceWidth: 100` (an iPad's 768 points count 122 mm) |
| `iOS` `iPad-12in` | `deviceClass: tablet`, `minDeviceWidth: 150` (1024 points count 162 mm) |

Every set gets `systemRow: true`: kbdgen's templates add the bottom row (next keyboard, symbols, space, return), the
bundle never holds it. When a layout has both `iOS` and `android` sections, the `iOS` sections become the touch sets
(they hold widths and more layers) and the `android` sections, where they type differently, report
`kbdgen.touchSectionDropped`; with only one of them, its sections become the sets.

Layer names → touch layers, written in this order: `default` → `base`; `shift` → `shift` (`returnLayerId: base`);
`caps` → `caps`; `symbols-1`, `symbols-2` → `symbols1`, `symbols2`; `alt`, `alt+shift` → `alt`, `altShift`. So the
layer-switch key of the system row (`targets/androidime.md` §2.1) reaches `symbols1`. kbdgen's iOS app reaches `alt`
with a key of its own template that the bundle does not hold; a layer that no key of the set and no system-row key
switches to is kept (for export) and reported as `kbdgen.layerUnreachable`.

| key | Key (SPEC §8) |
|---|---|
| a text | output = the text; a text listed in `deadKeys` of the section's layer, or a first-level key of `transforms`, is a dead key |
| `\s{shift}` | `function: shift`; on `base` `layerId` `shift` (and `multiTapKeyIds` the caps-lock key where the section has a `caps` layer), on `shift` and `caps` `base`, on `alt` `altShift`, on `altShift` `alt` |
| `\s{caps}` | `function: capsLock`, `layerId` `caps` (on `caps`: `base`) |
| `\s{shiftSymbols}` | `layerId` `symbols2` (on `symbols2`: `symbols1`) |
| `\s{symbols}` | `layerId` `symbols1` (on `symbols1` and `symbols2`: `base`) |
| `\s{keyboard}` | `function: nextKeyboard` |
| `\s{spacebar}` | the key `space` |
| `\s{comma}`, `\s{fullstop}` | output `,`, `.` |
| `\s{backspace}` | `function: backspace` |
| `\s{return}` | `function: enter` |
| `\s{tab}` | `function: tab` |
| `\s{spacer}` | `gap: true` |
| `:width` | `width` |
| `\s{keyboardMode}` (iPad split and floating modes) and any other `\s{…}` | left out: `kbdgen.specialKeyDropped` |

### 3.3 Transforms and dead keys

`transforms` is a tree: its first level is the dead key's text (its `spacing`), each level below one further input;
a string leaf is the result, a deeper map a chained dead key. Each first-level entry becomes a dead key (id
`dk` + the hex code points of its text) with `entries` in the tree's order and `noMatch` `emitBoth`; the entry for
`" "` is an ordinary entry. A first-level entry that no layer marks as dead (on touch) is still imported as a dead
key and the keys typing its text become dead keys.

## 4. Importer conventions (`.kbdgen` → `.kbl.json`)

1. One output per `layouts/*.yaml`, `metadata.provenance` `{ format: "kbdgen", source: "<bundle>/layouts/<tag>.yaml" }`;
   the report names the bundle and the layout file, `path` a YAML path inside it (`/iOS/primary/layers/shift`).
2. Key ids are made from the text (`a`, `U+00E1` as `u00e1` when not an implied id), dead keys from their spacing.
3. A layout without any touch section gives a file without `touch`; the on-screen targets then use their rule
   `touchFromHardware`.
4. YAML features: the bundles use block mappings, block sequences, flow sequences of strings, plain, quoted and
   literal block (`|`) scalars and comments; an importer MAY refuse anything else as `kbdgen.malformed`.

## 5. Writing a bundle

`convert -to kbdgen` writes `<id>.kbdgen/` with `project.yaml` (from `metadata`), `targets/*.yaml` for the targets
whose fields exist (`android` from `targets.androidime`, `ios` from `targets.ios`, `macos` from `targets.macos`), and
one `layouts/<tag>.yaml`. Adding it to an existing multi-layout bundle is the author's step.

| `.kbl.json` | bundle | loss |
|---|---|---|
| hardware layers | `windows`, `macOS` and `chromeOS` sections with the same layers | `kbdgen.layerNotExpressible` for a layer whose modifier set has no kbdgen name (§3.1), or a position outside the ISO order |
| touch sets | `iOS` and `android` sections by device class and width: the widest phone set → `primary`; tablet sets → `iPad-9in` (narrower) and `iPad-12in`, and `tablet-600` (the narrowest tablet set); Android needs `tablet-600`, so it repeats `primary` when there is no tablet set | `kbdgen.setNotExpressible` for further sets and for sets with `orientation` |
| touch layers | by name, as §3.2 backwards; Android keeps `default` and `shift` only | `kbdgen.layerNotExpressible` |
| keys | text or `\s{…}`; widths on iOS only | `kbdgen.geometryDropped` for `rowHeights`, `stretch`, `hint`, Android widths and any key the row strings cannot place (a key whose text contains white space is written with `\u{…}` escapes) |
| `longPressKeyIds` | `longpress` by the key's text; keys with the same text and different choices keep the first | `kbdgen.gestureDropped` for the rest, and for `multiTapKeyIds` and `flickId` |
| `deadKeys` | `transforms` tree and the `deadKeys` lists | `kbdgen.deadKeyNotExpressible` for `noMatch` other than `emitBoth`, `name`, `display`, and results that are dead keys in a cycle |
| `transforms` (CLDR) | none | `kbdgen.transformNotExpressible` |
| `systemRow: false` sets | the rows as they are; kbdgen's templates add their own bottom row below | `kbdgen.geometryDropped` |
| everything else (`tests`, `displays` other than space/return, `variables`, `extensions`) | none | the `general.*` kinds of SPEC §17.3 |

A pinned kbdgen (this page's commit, unmodified) building the Android APK and the SVG previews from an exported
bundle in CI is the check of this page (`yakbd/yakbd-cli`, `docs/kbdgen.md`).
