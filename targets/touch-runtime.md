# The touch runtime file (`touchRuntime` 1; 0.3 draft, normative)

`yakbd compile -target androidime` and `yakbd compile -target ios` compile one `.kbl.json` file into one **touch
runtime file** and embed it in the app they build: an input-method APK (`targets/androidime.md`) or an Xcode project
with one keyboard extension (`targets/ios.md`). The on-screen keyboard runtimes of YAKBD read it. The file is an
internal contract between the compiler and a runtime of a pinned version: users never write or carry it, and it is
not a `.kbl.json` file. Its schema is `schema/touch-runtime/1/touch-runtime.schema.json` (source
`src/touch-runtime.ts`); the runtime manifest of §7 has `schema/touch-runtime/runtime-manifest.schema.json`. This
document is the normative text; where it and the schemas accept different files, this document wins.

The split (D200): **the compiler resolves, the runtime runs.** Everything that can be decided from the layout file is
decided by the compiler: default rules, implied keys, key-cap labels, geometry, the system row, variables, transform
patterns, the hardware resolution of SPEC §9.3. A runtime chooses a layer set for the screen it is on, draws keys at
the positions it is given, and runs one small machine: the dead keys of SPEC §14.2 and literal transforms. It needs
no pattern engine and no knowledge of the `.kbl.json` format.

## 1. Versions

- `touchRuntime` is an integer, independent of the format version `kbl`. This document defines **1**.
- A compiler writes exactly one version and only the members its schema defines. A runtime lists the versions it
  reads in its manifest (§7) and MUST refuse a file of any other version. The compiler MUST refuse a runtime whose
  manifest does not list the version it writes (D200).
- Any change to the shape or meaning of the file is a new version: there are no optional additions within a version,
  so a runtime never meets a member it does not know. A runtime MAY read several versions.
- While spec 0.3 is a draft, version 1 is a draft too and may still change; it is frozen when 0.3 is tagged.

## 2. The file and its sets

Top level (all members required except `hardware`):

| member | meaning |
|---|---|
| `touchRuntime` | `1` |
| `target` | `androidime` or `ios`: the target that compiled the file (the system row and the defaults differ) |
| `layout` | `id` (`metadata.id`), `name` (the target's `appName`), `language` (the target's `language`, BCP 47), `version` (`metadata.version`, when there is one) |
| `ui` | `returnKeyLabels`: the Return key's label per action of the text field, complete for the target's actions; `popupColumns`: long-press choices per popup row |
| `keys` | object KeyId → Key (§3): every key that a placement, a long press, a multi-tap or a flick names, and no other |
| `sets` | the touch layer sets, in the order of the layout file (§2.1) |
| `deadKeys` | object DeadKeyId → `{ spacing, entries, noMatch }`, SPEC §10 with every value resolved (§4) |
| `transforms` | `{ simple, backspace }`: arrays of groups, each a non-empty array of literal rules `{ from, to }` (§5) |
| `hardware` | `androidime` only, when physical-key mode is on: the physical-key map (§6) |

### 2.1 Sets

A set is `{ minDeviceWidth, orientation, layers }`:

- `minDeviceWidth`: integer millimetres, `0` when the layout file gives none;
- `orientation`: `portrait`, `landscape`, or `any` when the layout file gives none;
- `layers`: one of them has the id `base`. A layer is `{ id, returnLayer?, rows }`; `returnLayer` is SPEC §9.4's
  `returnLayerId`. A row is `{ y, h, keys }`, its top edge and height as fractions of the keyboard's height; its
  keys are placements `{ id, key, x, w }`, left edge and width as fractions of the keyboard's width, left to right.
  Gaps are not placed: the space between placements is empty.

**Choosing the set** (the runtime; SPEC §14.4 step 1). W is the keyboard's current width in millimetres, reckoned
as its width in density-independent pixels (Android) or points (iOS) × 25.4 / 160. This is exact for Android's
nominal density and for iPhones to a few per cent; it makes iPads about a fifth narrower than they are (iOS reports
no physical size). The candidates are the sets with `minDeviceWidth` ≤ W and `orientation` equal to the current
orientation or `any`; the one with the largest `minDeviceWidth` wins, and of two with the same width the one that
names the orientation. With no candidate, the runtime takes the first set. The choice is made again whenever the
keyboard's width or the orientation changes, and the layer then starts again at `base`.

**Keyboard height** is the runtime's: the platform's usual keyboard height for the device and orientation. The rows
share it as their `y` and `h` say.

## 3. Keys

A Key has:

| member | meaning |
|---|---|
| `label` | the key-cap text. Absent: the runtime draws its own symbol for `function` (shift, caps lock, backspace, next keyboard, tab, escape; for `enter` the label of `ui.returnKeyLabels` for the field's action; for `space` an empty bar or the layout's name), or nothing |
| `hint` | SPEC §8 `hint`, drawn small |
| `function` | SPEC §8 `function`: the key's identity, for its symbol and for §3.2 |
| `input` | what a press feeds into the machine of §4: `{ "text": s }`, `{ "deadKey": id }` or `{ "action": a }` with `a` one of `backspace`, `enter`, `escape`, `nextKeyboard`. Absent: the press only switches layers |
| `layer` | after the input, switch to this layer of the current set |
| `longPress`, `longPressDefault` | long-press choices in order (KeyIds), and the index of the preselected one |
| `multiTap` | the keys pressed by the 2nd, 3rd, … quick tap |
| `flicks` | `{ direction, key }`: a flick in `direction` (`n`, `ne`, `e`, `se`, `s`, `sw`, `w`, `nw`) presses `key` |

### 3.1 What the compiler resolves

- **Ids.** KeyIds and layer ids are those of the layout file. Keys the compiler makes itself (system row, rule
  `touchFromHardware`, rule `nextKeyboardKey`) have ids beginning with `@` (`@space`, `@enter`, `@layerSwitch`,
  `@nextKeyboard`, `@shift`, `@backspace`, `@hw.<layer>.<position>`); a KeyId of the file that begins with `@` gets
  one more `@` in front, so the two never meet. A placement's `id` is its KeyId; the second, third, … placement of
  the same key in one layer is `<KeyId>#2`, `<KeyId>#3`, … . Placement ids name keys to test harnesses: the iOS
  runtime uses them as accessibility identifiers, the Android runtime in its key-rectangle report.
- **Implied keys** (SPEC §8) become keys like any other.
- **Inputs.** `output` → `text` (markers as §5; variables substituted; NFC as §5); `deadKey` → `deadKey`; a key
  without either: `function` `backspace` → action `backspace`, `enter` → action `enter`, `escape` → action
  `escape`, `nextKeyboard` → action `nextKeyboard`, `space` → text `" "`, `tab` → text U+0009; `shift` and
  `capsLock` → no input. A `gap` key is never placed.
- **Labels.** In order: the `displays` entry for the key's id; the `displays` entry whose `output` equals the key's
  output; for a dead key its `display`, else its `spacing`; the output without markers, unless that is empty or only
  white space; for a key with a `layerId` and nothing else, the id of that layer; else none. A label that is only
  combining marks stands on `displays.baseCharacter`, else on U+25CC (SPEC §12).
- **Long press** keeps the order of `longPressKeyIds`; `longPressDefault` is the index of `longPressDefaultKeyId`.
- **Flicks**: each segment of the key's flick with exactly one direction; a longer path is left out
  (`<target>.flickPathDropped`).
- **Geometry** (SPEC §9.4, done here so that both runtimes place keys alike). For each layer, after the system row
  (rule `systemRow` of the target) and any inserted key are added: the total width of a row is the sum of its keys'
  `width` (default 1, gaps included); U is the largest row total of the layer. In a row of total T < U the leftover
  U − T goes to its `stretch` keys in proportion to their widths, or, without any, half before and half after the
  row. Then x and w are the key-unit positions divided by U. Row heights: with H the sum of `rowHeights` (default 1
  each), a row's `h` is its height / H and its `y` the sum of the rows above / H. Numbers are written with at most 6
  decimals.

### 3.2 Next-keyboard keys

A runtime hides every placement of a key with `function` `nextKeyboard` while the platform says that the keyboard
need not offer one (iOS `needsInputModeSwitchKey` false; Android `shouldOfferSwitchingToNextInputMethod` false). The
hidden placement's width goes to the key of the same row with `function` `space`, else to its right neighbour, else
to its left neighbour.

## 4. Pressing keys

A press of key K (a tap, or the key chosen by a long press, multi-tap or flick, whose own gestures are then ignored)
does, in order (SPEC §14.4 step 3):

1. **Input.** `text` and `deadKey` go into the dead-key machine of SPEC §14.2, unchanged; `text` `""` is an explicit
   nothing. `{ "action": "backspace" }` is input to the machine as well: an entry whose `base` text is U+0008
   applies, otherwise `noMatch` with the backspace action as T; when the action reaches the application it runs the
   backspace transforms (§5), and without a match it is the platform's own backspace (Android: a `KEYCODE_DEL` key
   event; iOS: `deleteBackward`). `enter`, `escape` and `nextKeyboard` first end a pending dead key D as `noMatch`
   of D with T = nothing (`emitBoth` and `emitSpacing` emit `spacing`; the others nothing), then act: `enter` is the
   field's Return action (Android: the editor action, or a newline where the field asks for one; iOS: insert
   U+000A); `escape` sends Escape (Android `KEYCODE_ESCAPE`; iOS cannot, the compiler reports
   `ios.functionNotSupported`); `nextKeyboard` switches to the next keyboard or input method and ends the press.
2. **Emitting** text (the machine's output) appends it to the context (§5), runs the simple transforms and then
   sends the text without markers to the application (Android `commitText`; iOS `insertText`).
3. **Layer switch.** To K's `layer` when it has one; otherwise to the current layer's `returnLayer` when that is set;
   otherwise the layer stays.

A pending dead key is not shown in the text field; a runtime MAY mark it on the key cap.

**Long press** (SPEC §14.4 step 4): after the platform's long-press delay the runtime shows `longPress` in a popup
inside the keyboard's own area, `popupColumns` choices per row, with `longPressDefault` preselected; releasing on a
choice presses it, releasing outside presses nothing. **Multi-tap** (step 5): taps on the same placement, or after a
layer switch on a placement at the same place, within 400 ms of each other form one sequence; the n-th tap first
deletes what the previous tap of the sequence sent to the application, then presses `multiTap[n − 2]`; past the end
of the list the sequence starts again with K. **Flicks**: a touch that moves away from its key by more than half the
key's height, and ends there, is a flick in the nearest of the eight directions; a direction without a flick is a
plain tap.

## 5. Transforms and markers

**Markers** (SPEC §13.3) are written in the file as the noncharacters U+FDD0 … U+FDEF: the compiler numbers the
markers of the layout in the order of their first use, at most 32 (more: `<target>.tooManyMarkers`, the outputs and
transforms that use the others are built without them). A runtime never sends a noncharacter of that range to the
application.

**Context.** The runtime keeps its own context C: the text before the insertion point as it knows it, markers
included. When typing starts in a field, and whenever the text or the selection changes in a way the runtime did not
cause, C is reset to the last 64 characters before the insertion point that the platform reports (no markers). What
the runtime emits is appended to C, and what it deletes is removed from C and from the application alike. The
platform's own backspace removes the last character of C together with the markers next to it.

**Rules.** After each emission, the groups of `simple` run in order; in each group the first rule whose `from` is a
suffix of C applies: the runtime deletes from the application as many characters (Unicode scalar values) as the
match holds outside markers, removes the match from C, and appends `to` to C and its characters outside markers to
the application; then the next group runs. On the backspace action, the groups of `backspace` run the same way; if
no rule of any group applied, the platform's own backspace happens. Matching compares code points exactly; there is
no normalisation at run time.

**What the compiler expands** (D202). A CLDR transform becomes literal rules when its `from` is a sequence of
literal characters, `\u{…}` escapes, `${string variable}`, markers `\m{id}` and `\m{.}` (each marker), character
classes and `$[set variable]` with finitely many single-character members, and at most one capture group `( … )`
around one such class; and its `to` is literal text, `${string variable}`, markers, `$1` (the captured
character) and `$[1:set variable]` (the member of that set at the index of the captured character in its own set).
Every combination becomes one rule, in the order of the class members, the transform's rules in the order of the
transforms, at most 1024 rules per transform. Anything else (quantifiers, `.`, alternation, negated classes,
anchors, several groups, a `reorders` group) is left out and reported as `<target>.transformNotCompiled`. With
`settings.normalization` `enabled` every text of the file (outputs, dead-key values, `from`, `to`) is put in NFC when
compiled (`general.outputNormalized` where that changes it) and the build reports `general.normalizationNotApplied`
(D73): text that several key presses make together is not normalised.

## 6. The physical-key map (`androidime`)

With `targets.androidime.physicalKeys` (`targets/androidime.md` §3) the file has `hardware`: `{ states }`, each state
`{ mods, keys, numLock? }`.

- `mods` is exactly the set of modifiers on, from `shift`, `caps` (Caps Lock on), `ctrl` (either Control), `altL`,
  `altR` (left and right Alt). No two states have the same set; a state without any key is left out.
- `keys` maps Android key code names (`KEYCODE_A`, the names of `KeyEvent.keyCodeToString`) to an Input (§3);
  `text` `""` is an explicit nothing (the event is swallowed).
- `numLock` lists the codes of `keys` that apply only while Num Lock is on (SPEC §14.1); with Num Lock off they are
  passed to the application.

**Runtime.** On a key-down event from a physical keyboard the runtime computes `mods` from the event's meta state
(`META_SHIFT_ON`, `META_CAPS_LOCK_ON`, `META_CTRL_ON`, `META_ALT_LEFT_ON`, `META_ALT_RIGHT_ON`), finds the state with
exactly those mods and the event's key code in it, and presses that Input as §4 says (no layer switch), consuming the
key down and its key up. Everything else (no such state, no such code, modifier keys, repeats of a key it did not
consume) goes to the application unchanged, so shortcuts and navigation keys keep working.

**Compiler.** For each of the 32 combinations of the five modifiers it resolves every position with SPEC §9.3, with
§7.3's matching over these five (`ctrlL`/`ctrlR` widened to `ctrl`, `androidime.sideModifierWidened`; a layer that
needs a custom component is not compiled, `androidime.modifierUnmapped`), with one exception: in a state with `ctrl`
or `altL` on, the `["other"]` layer does not apply. A position's key code is the target's rule `keyCode`. A binding
becomes an Input as §3.1 says for keys (`{"key": id}` as that key's input; the backspace text U+0008 as action
`backspace`; CodeUnits as text when they are well-formed UTF-16, otherwise `androidime.outputUnencodable`).

## 7. Runtime manifest and file places

Every runtime carries a manifest `{ touchRuntime, target, version, layoutPath }` (schema
`schema/touch-runtime/runtime-manifest.schema.json`): the touch runtime versions it reads, its target, its own
version, and where the compiler puts the touch runtime file.

| runtime | manifest | touch runtime file |
|---|---|---|
| Android input-method APK (`-runtime runtime.apk`) | asset `assets/yakbd/runtime.json` | asset at `layoutPath`, `assets/yakbd/layout.json` |
| iOS runtime source folder (`-runtime <dir>`) | `yakbd-runtime.json` at the folder's root | `layoutPath` inside the generated project, a resource of the keyboard extension |

The compiler reads the manifest first and stops with an error when the runtime's `target` is not the build's or its
`touchRuntime` list lacks the version it writes. The build report names the runtime's `version`.

## 8. Reference rules

A touch runtime file is valid when its schema accepts it and: every KeyId named by a placement, `longPress`,
`multiTap` or a flick is in `keys`; every `deadKey` of an Input or a dead-key entry is in `deadKeys`; each set has a
layer `base` and distinct layer ids; a `returnLayer`, and the `layer` of every key placed in a set, names a layer of
that set; `longPressDefault` is an index of `longPress`; placement ids are distinct within a layer; an `ios` file has
no `hardware`; hardware states have distinct `mods`. The checker of this repository checks them on the cases of
`testdata/touch-runtime/` (check 9); the compiler's output must meet them.

## 9. What stays the runtime's (informative)

Drawing (fonts, colours, light and dark appearance follow the system; the file has no theme), key previews, sounds
and haptics, the long-press delay, the keyboard height, and the key-rectangle report of a debug build (for test
harnesses: each placement's id, layer and rectangle in screen pixels).
