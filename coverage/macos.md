# Coverage: macOS `.keylayout` files and bundles → `.kbl.json`

Every element and attribute of the `.keylayout` format and of a keyboard-layout `.bundle`, with its home in
`.kbl.json` or the loss kind that reports it. §2 to §4 are what an importer reads; the build direction is
`targets/macos.md`. Format facts are TN2056's (see §1).

## 1. Sources

- Apple Technical Note TN2056, "Installable Keyboard Layouts" (2009): the DTD and every element and attribute
  below, the bundle shapes, the install folders.
- The `Info.plist` keys of a layout bundle: an openly licensed generated bundle (Kiimo, MIT) and the runs of
  `yakbd/yakbd-cli`'s macOS layout check (`targets/macos.md` §5).
- Every source with its version and licence: `CLEAN-ROOM.md`, "macOS sources". Apple's own layouts are not read.

## 2. `.keylayout` elements and attributes

| element / attribute | `.kbl.json` | notes |
|---|---|---|
| XML declaration, DOCTYPE, comments, white space, attribute order | — | `macos.xmlDetailsIgnored` |
| `keyboard` | the file | |
| `keyboard/@group` | `targets.macos.group` | pinned by the importer |
| `keyboard/@id` | `targets.macos.id` | pinned by the importer |
| `keyboard/@name` | `metadata.name` and `targets.macos.layoutName` | the name is also `metadata.name` |
| `keyboard/@maxout` | `targets.macos.maxout` | pinned when present |
| `layouts` | `targets.macos.hardwareRanges` | §3 |
| `layout/@first`, `@last` | `hardwareRanges[].first`, `.last` | only the layouts that select the imported modifier map and key map set; the others `macos.keyMapSetDropped` |
| `layout/@modifiers`, `@mapSet` | — | which modifier map and key map set are imported (§3); a reference to nothing: `macos.malformed` |
| `modifierMap`, `@id` | `hardware.layers[].modifiers` | §3; the id is the writer's choice |
| `modifierMap/@defaultIndex` | `hardware.layers[].modifiers` | the states no `modifier` names get this key map (§3) |
| `keyMapSelect/@mapIndex` | which layer | §3 |
| `modifier/@keys` | `hardware.layers[].modifiers` | §3 |
| `keyMapSet`, `@id` | `hardware` | one set per file (§3) |
| `keyMap/@index` | a layer | §3 |
| `keyMap/@baseMapSet`, `@baseIndex` | — | resolved: the base map's keys are copied, then overridden; the result is the key map. A missing base or a loop: `macos.malformed` |
| `key/@code` | a position | the position table in reverse (`targets/macos-default-keycode.tsv`, with rule `isoKeys` in reverse: when codes 10 and 50 both have outputs, 10 is `Backquote` and 50 `IntlBackslash`; when only 10 has, it is `IntlBackslash` with a `keyCode` pin of 10); a code no row names becomes the position `MacKey<code>` with `targets.macos.keys.<p>.keyCode` (`macos.keyCodeUnknown`) |
| `key/@output` | a text binding | numeric character references decoded; a lone surrogate reference is `macos.malformed` |
| `key/@action`, inline `key/action` | a binding and dead-key data | §4 |
| `actions`, `action/@id` | `deadKeys` | §4; ids are the writer's choice |
| `when/@state`, `@next`, `@output` | `deadKeys`, bindings | §4 |
| `when/@through`, `@multiplier` | — | `macos.rangeActionDropped` |
| `terminators/when` | `deadKeys.<id>.spacing`, `noMatch` | §4 |

## 3. Modifiers and key maps

- **One set.** A `.kbl.json` file has one hardware layer set. The importer takes the modifier map and key map set of
  the first `<layout>` element (TN2056: it also serves hardware types no range names) and pins as
  `hardwareRanges` every `<layout>` that selects both of them; every other `<layout>` reports
  `macos.keyMapSetDropped` (typically a JIS set).
- **States.** The importer evaluates the modifier map over every combination of TN2056's eight keys (left and
  right Shift, Option and Control, Command, Caps Lock): a `modifier` matches as TN2056 says (a word: pressed; no
  word: not pressed; `?`: either; `any…`: either or both sides), later `keyMapSelect` elements overwrite earlier
  ones, and unmatched combinations get `defaultIndex`. A combination with a right-side key whose key map differs
  from the same combination with the left-side key instead reports `macos.sideModifierDropped`; the left one is
  kept. That leaves the 32 states of `targets/macos.md` §3.
- **Command.** When every state with Command has the key map the build's rule `commandMap` gives it
  (`withoutCommand` or `base`), the importer writes that value and no Command layers. Otherwise it declares the
  custom `held` component `cmd` on `MetaLeft` and `MetaRight`, sets `modifiers.command` to it and imports the
  Command states as layers.
- **Control.** Likewise: when every state with Control has the key map rule `controlMap` gives it, the importer
  writes that value and no Control layers; otherwise Control states become layers.
- **Layers.** One hardware layer per key map that some remaining state uses, in key-map order; its `modifiers` are
  those states as kbl sets (Shift `shift`, Option `alt`, Control `ctrl`, Caps Lock `caps`, Command the `cmd`
  component), and its `bindings` the key map's keys. The importer writes `settings.capsLockFallback: false`, so
  that the Caps Lock layers mean exactly their key maps.
- **Standard keys.** Keys whose output equals the position table's `output` for their code in every state are not
  imported as bindings (rule `standardKeys` builds them again); the importer writes `standardKeys: true` when it
  left any out.

## 4. Actions, states and terminators

- **Dead keys.** Every state other than `none` that some `when` enters through `next` becomes a dead key with the
  state name as its id and as `targets.macos.deadKeys.<id>.state`. Its `spacing` is its terminator's output, with
  `noMatch` `emitBoth`; without a terminator, `spacing` is the empty text and `noMatch` `emitText`.
- **Actions.** For a key whose `action` is A:
  - A's `when state="none"`: `output` B → the binding is B; `next` E → the binding is `{"deadKey": "E"}`.
  - every other `when state="D"`: an entry of D with base B (or `{"deadKey": "E"}`) and result its `output` (or
    `{"deadKey": next}`).
- **Shapes the model cannot say**, one `macos.stateNotExpressible` per import with the cases in `detail`:
  1. a `when` with both `output` and `next` (output, then a pending state): imported as its `output`; the state is
     lost;
  2. an action without a `when state="none"` (the key types nothing until a state is pending): imported as no
     binding; its other `when`s are dropped;
  3. two keys with the same base text whose actions give different results in one state: the entry of the first key
     in ascending key-code order is kept (the model matches dead keys by text, SPEC §14.2);
  4. a key that starts a dead key E pressed in a state D without a `when` for D: macOS emits D's terminator and makes
     E pending; imported as nothing (the model's `noMatch` then applies).
- **Range actions** (`through`, `multiplier`): `macos.rangeActionDropped`; the rest of the action is imported.

## 5. Bundle

| bundle part | `.kbl.json` |
|---|---|
| `<name>.bundle` folder, `CFBundleName` | `targets.macos.bundleName` |
| `CFBundleIdentifier` | `targets.macos.bundleId` |
| `CFBundleShortVersionString`, `CFBundleVersion` | `targets.macos.bundleVersion` (one value for both) |
| `KLInfo_<name>` | one per layout; the `<name>` is `layoutName` |
| `KLInfo_<name>` / `TISInputSourceID` | `targets.macos.inputSourceId` |
| `KLInfo_<name>` / `TISIntendedLanguage` | `targets.macos.language` |
| `KLInfo_<name>` / `TISIconIsTemplate` | `targets.macos.icon.template` |
| `Resources/<name>.keylayout` | the layout (§2) |
| `Resources/<name>.icns` | `targets.macos.icon.icns` |
| `Resources/<tag>.lproj/InfoPlist.strings` | `targets.macos.localizedNames.<tag>` (and `metadata.localizedNames`) |

A bundle may hold several layouts (TN2056); a `.kbl.json` file is one layout, so a bundle imports as one file per
`.keylayout`. Other `Info.plist` keys and `version.plist` have no home (`general.metadataDropped`).

## 6. Importer conventions (`.keylayout` → `.kbl.json`)

1. `metadata.id` is not in a `.keylayout`: the importer takes it from its caller, or else `und` with the private-use
   extension `-x-` and the slug of the name (`und-x-my-layout`); `metadata.provenance.format` is `keylayout`.
2. The importer pins what the build would otherwise decide from defaults: `layoutName`, `group`, `id`, `maxout`
   when present, `hardwareRanges`, `commandMap`, `controlMap`, `deadKeys.<id>.state`.
3. Positions get no `scanCode` (a `.keylayout` has none); a Windows build of the imported file needs them added.
4. A file the importer writes and the build then turns back into a `.keylayout` gives the same key maps, actions and
   terminators up to the details of `macos.xmlDetailsIgnored`, except what the import reported as a loss.
