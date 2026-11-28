# Target `chromeos`: default rules and pinning (0.3 draft, normative)

How a `.kbl.json` file becomes a ChromeOS input method: one Manifest V3 extension for this one layout, using
`chrome.input.ime` (SPEC §16.9, coverage `coverage/chromeos.md`), when `targets.chromeos` is silent. The extension
is a fixed, small runtime (a service worker written by the tool, the same for every layout) and the layout compiled
into data beside it. ChromeOS facts are cited as **[CRX]** (Chrome's public extension documentation: the
`chrome.input.ime` reference, the manifest pages `input_components`, `name`, `version` and `description`, the
service-worker lifecycle and `chrome.storage`; recorded in `CLEAN-ROOM.md`, "ChromeOS"), **[FAKE]** (measured by the
ChromeOS check of `yakbd/yakbd-cli`, `tools/chromeos-check/`: the runtime driven through a fake of `chrome.input.ime`,
which checks the runtime against this page, not ChromeOS) or **unmeasured** (this specification's choice, the
ChromeOS behaviour behind it not yet measured on a Chromebook; §8).

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16): a fixed table and one-line rules, no heuristics, knowingly
   wrong for many layouts. A layout that needs anything else says it in `targets.chromeos`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported** as `chromeosDefault.<rule>` (SPEC §17.1) with what it decided in
   `detail.value`; policy `accept` by default, `"chromeosDefault.*": "error"` makes a file fully explicit.
4. **One layout, one extension** (D150): every build takes one `.kbl.json` file and writes one extension with one
   input component.
5. **The runtime decides by position, never by character.** It reads only the event's `code` and modifier flags,
   never its `key`, which comes from the system layout below the input method (§3) **[CRX]**. What the general data
   says is compiled as far as the runtime can type it with `commitText` and show it with `setComposition`; the
   rest is a loss of a kind of SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `name` | `metadata.name`, cut to 75 characters | `name` | 5 |
| `engineId` | `yakbd-` + slug of `metadata.id` (as `targets/macos.md` §1), cut to 64 characters | `engineId` | 5 |
| `version` | the leading `a`, `a.b`, `a.b.c` or `a.b.c.d` digits of `metadata.version` when each is 0–65535, has no leading zero and not all are 0; `1.0` otherwise | `version` | 5 |
| `language` | the language subtag of `metadata.id` | `language` | 5 |
| `description` | `metadata.description`, else `metadata.name`; cut to 132 characters | `description` | 5 |
| `systemLayout` | `us` | `systemLayout` | 3 |
| `code` | the DOM code per position from `targets/chromeos-default-code.tsv` | `keys.<p>.code` | 2 |

**Cutting** a name or description to n characters keeps its first n characters (scalar values). Manifest limits:
`name` at most 75 characters, `description` at most 132, `version` one to four dot-separated integers 0–65535,
"non-zero integers can't start with 0", not all zero **[CRX]**.

**`engineId` is not the extension id.** Chrome gives an unpacked extension an id of its own (from its folder, or from
the key it is published with); `engineId` is the `id` of the one entry of `input_components`, which
`chrome.input.ime` passes as `engineID` and the settings remember the input method by **[CRX]**.

## 2. Position table

The default table from position names to DOM `KeyboardEvent.code` values: `targets/chromeos-default-code.tsv`
(SPEC §16, "Position tables"). Position names are W3C code values (SPEC §6.1), so the table is the identity on the
positions it lists; it says which positions ChromeOS reports a code for.

- **`code`**: a position's code is `keys.<p>.code`; otherwise the table's code for the position's name; otherwise it
  has none. A position with a binding and no code is left out: when another target's position table has a row for
  it, it is a key this target does not have, `chromeos.positionWithoutCode` (a warning; `SysRq` and `Break`, which
  a `.klc` import binds, D145); otherwise `chromeos.codeMissing` (an error). Two positions with one code report
  `chromeos.codeDuplicate`.

## 3. Modifiers, layers and the keys the runtime handles

**System layout** (rule `systemLayout`). ChromeOS keeps a system keyboard layout under an input method, the
`layouts` entry of its input component ("ChromeOS only supports one layout per input method") **[CRX]**. The runtime
types every key the layout owns itself; the system layout gives only what the runtime passes through (below): the
keys the layout leaves alone, and every Control and Alt shortcut. The default `us` gives the US letters to
shortcuts. A builder whose users expect shortcuts on other letters pins another value; its spelling is ChromeOS's
own and is written as given (unmeasured beyond `us`).

**States.** The runtime computes the modifier state of SPEC §7.3 for each key press from the event's flags and from
the modifier keys it has seen go down and up: Shift from `shiftKey`; Caps Lock from `capsLock`; left and right
Control and Alt from the `ControlLeft`, `ControlRight`, `AltLeft` and `AltRight` presses it has seen, where `ctrlKey`
with neither seen counts as left Control, `altgrKey` as right Alt, and `altKey` with neither seen as left Alt
**[CRX]** (the flags; that `AltRight` reaches the input method with `us` is unmeasured). A custom `held` component
(SPEC §7.2) is active while one of its positions is held, a custom `lock` toggles on each press of one; the runtime
swallows those presses. A build compiles at most four custom components; the layers of a modifier set with a
further one are left out (`chromeos.modifierUnmapped`). Then the binding is `resolve(P, S)` (SPEC §9.3): Control
and Alt layers of the file are compiled like any other, since `commitText` types in every state.

**Handled and passed through.** For each key press the runtime either handles it (returns `true`: the system does
nothing more with it) or passes it through (returns `false`: the system types or acts on it with its own layout)
**[CRX]**:

1. A position **the layout owns** (one with a binding in some compiled layer) is handled when it resolves to text, a
   dead key or the backspace action (also in a state with Control or Alt: the file's Control and Alt layers type).
2. In a state with Control or an Alt component that **no layer names** in a modifier set (directly or through the
   Caps Lock fallback; `["other"]` does not count, so an `["other"]` layer never takes Control or Alt presses),
   and where the key resolves to nothing (an explicit nothing, no binding, no layer): in a state with Control or
   an Alt component the press is a **shortcut** and is passed through, so the system's shortcuts work; in any other state
   it is handled, so the system layout never types its own character on the layout's keys. Shortcut letters are the
   system layout's: where the base layer types another ASCII letter than `us` has at the position (`KeyQ` types
   `a`), a shortcut follows the key cap of `us`, not of the layout (`chromeos.shortcutsFollowSystemLayout`, a
   warning listing those positions, reported only with the system layout `us`). Exceptions to "handled": the
   backspace action with nothing to delete in the context (§4), and a control character on its own key (below).
3. Every other key (arrows, function keys, the modifier keys themselves) is passed through.

**Number pad** (`numLock` positions, SPEC §14.1). The event carries no Num Lock flag; the runtime takes Num Lock as on
when the event's `key` is one character, the one place it reads `key` (unmeasured). With Num Lock off or Shift held,
the key is passed through (navigation); otherwise it resolves as usual.

**Control characters.** A binding whose text is U+0008 is the backspace action (§4). A binding that is exactly U+000D
or U+000A on `Enter` or `NumpadEnter`, U+0009 on `Tab`, U+001B on `Escape` or U+007F on `Backspace` is passed through, after the dead-key machine has
taken it as input (SPEC §14.2), so the system does Return, Tab and Escape. In a state with Control, an output that is one control character is nothing, so the press is the system's
shortcut (U+0003 on `KeyC` is what Control+C means), without a loss. Any other output with a control character
(U+0000–U+001F, U+007F–U+009F) is built as nothing (`chromeos.controlCharacterDropped`): `commitText` has no defined
meaning for it (unmeasured). CodeUnits that are not text (a lone surrogate) are built as nothing
(`chromeos.outputUnencodable`).

**Settings.** `bidiMarksOnShiftBackspace` is compiled: a press of a position whose base-layer binding is the
backspace action, with Shift held, types U+200E (left Shift) or U+200F (right Shift only) and leaves a pending dead key
pending. `capsLockOffBy: shift` is not: Caps Lock is the system's (`chromeos.settingNotCompiled`).

## 4. Dead keys and transforms

Both run in the runtime as **composition state**: text that is not final is shown underlined in the text field with
`setComposition` and replaced or committed with `commitText` when it is **[CRX]**.

**Dead keys** follow SPEC §14.2 exactly: one pending dead key D; entries in order, first match wins; chained results
make the next dead key pending; `noMatch` as given; the backspace action is input like any other (an entry with base
U+0008 applies; otherwise `noMatch` with the backspace action as T). While D is pending the composition ends with
D's `display`, else its `spacing`. A pass-through key that resolves to nothing leaves D pending (SPEC §14.2); a
pass-through shortcut does too.

**Context.** The runtime keeps the context of SPEC §13.2 itself: the text it emitted that is still in the composition.
Text leaves the context, committed, as soon as no compiled transform can still match it: after each input the
runtime keeps as composition only the longest end of the context that is a proper beginning of some `from` of a
simple transform, or a beginning (the whole included) of some `from` of a backspace transform, and commits the text
before it. The context is cleared, without committing, when the input method is reset or the text field loses
focus (`onReset`, `onBlur`, `onFocus`) **[CRX]**, and committed when a key is passed through, since the insertion
point may then move. So text typed before the field got focus, or before a click, is never part of the context.

**Transforms compiled.** A transform is compiled when the build can expand it into literal rules exactly as
`targets/touch-runtime.md` §5 says ("What the compiler expands", D202: literal characters, `\u{…}` escapes, string
variables, finite character classes and set variables, at most one capture group around one class; `to` with
literal text, string variables, `$1` and `$[1:set]`; at most 1024 rules per transform), except that this target
compiles no markers: a transform whose `from` or `to` has a marker is left out like any other it cannot expand
(`chromeos.transformNotCompiled`, one entry per transform). After each emitted text, the groups of `simple` run in
order; in each group the first rule whose `from` is an end of the context replaces it by its `to`, then the next
group runs. A backspace action runs the groups of `backspace` the same way; when no rule applied it deletes the last
character of the context, or, with an empty context, is passed through so the system deletes. With several groups, a
later group sees only the context that the earlier ones left in the composition (an informative consequence of the
window above).

`reorders` groups are not compiled (`chromeos.reorderNotCompiled`, per group). Markers are not compiled: an output's
markers are dropped (`chromeos.markerNotCompiled`). `settings.normalization` `enabled`: key outputs, dead-key values and each `to` are put in NFC at build time
(`general.outputNormalized` for a key output that changes), and text that several keystrokes make together is not
(`general.normalizationNotApplied`). Unlike `targets/touch-runtime.md` §5, each `from` stays as written: the context
is the keystrokes' text, not normalised, so `a\u{301}` must match the keys `a` and U+0301 as typed.

## 5. Files and installation

A build writes one folder, named `engineId`, and the installer the same files as a zip without a folder:

- `manifest.json`: `manifest_version` 3, `name`, `version`, `description`, `minimum_chrome_version` `111` (the
  Promise form of `chrome.input.ime`) **[CRX]**, `permissions` `input` and `storage`, `background.service_worker`
  `background.js`, and one `input_components` entry: `name` = `name`, `id` = `engineId`, `language` = [`language`],
  `layouts` = [`systemLayout`] **[CRX]**.
- `background.js`: the runtime, the same file for every layout of one tool version. It loads the layout
  synchronously and registers its listeners at its top level, since a Manifest V3 service worker stops after 30
  seconds without events and starts again for the next one, losing its globals **[CRX]**; it keeps the focused
  field's context id, the pending dead key, the context and the custom locks in `chrome.storage.session` and
  handles each key event after reading them, answering with `keyEventHandled` **[CRX]**.
- `layout.js`: the layout as data (per code and state the value of `resolve`, the dead keys, the expanded
  transforms, the settings); its form is the tool's, not part of this specification.

**Install routes.** (1) Unpacked: `chrome://extensions`, developer mode on, "Load unpacked", the folder; then the
input method is added in the ChromeOS settings (Keyboard and inputs, Add input methods) and selected (unmeasured: the
names of the settings pages). (2) The Chrome Web Store, with the zip, by the publisher's own developer account.
(3) Managed devices: force-installed by the administrator's policy. The build never signs or publishes anything.

## 6. Pinning

`pin -target chromeos` writes every value a rule decided into `targets.chromeos`: `name`, `engineId`, `version`,
`language`, `description`, `systemLayout` and `keys.<p>.code` of every built position. A pinned file builds the same
extension with any later table, and reports no `chromeosDefault.*`.

## 7. Carried, not compiled

Touch layer sets, flicks, long-press and multi-tap (`general.touchDropped`): an own on-screen keyboard
(`input_components` `input_view`) is not built in 0.3. `displays` (`general.displayDropped`), `tests`
(`general.testsDropped`), extensions and CLDR `special` (`general.extensionDropped`), and metadata beyond the name,
description and version (`general.metadataDropped`). Scan codes and the positions' `name` are not used.

## 8. Measured and unmeasured (informative)

Checked with the fake of `chrome.input.ime` **[FAKE]**: the runtime types what `resolve` and the dead-key machine
say for generated cases (every state of every built key, every dead key with its bases, compiled transforms), with
`AltRight` reported as `altgrKey` and as `altKey`, after a restart of the service worker between focus and typing, and
with a `key` value that no layout types (so a runtime that read `key` would fail).

Unmeasured, to be checked on a Chromebook (the steps are in `tools/chromeos-check/README.md`): whether `AltRight`
and custom modifier positions reach the input method under `us`; whether system shortcuts (Search, Alt+Tab) are taken
before the input method; Num Lock from `key`; what Chrome does with an uncommitted composition on a click or focus
change; `commitText` of a control character; and the settings pages' names.
