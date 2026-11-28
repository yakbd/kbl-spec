# The `.kbl.json` keyboard-layout format, version 0.2 (draft)

Status: **0.2 draft**, not yet released; the released version is 0.1 preview. What stays stable in 0.x is in
`COMPATIBILITY.md`. Normative unless a section says "informative". The key words MUST, MUST NOT, SHOULD, SHOULD NOT
and MAY are used as in RFC 2119. Decisions behind the rules are numbered in `DECISIONS.md` ("D7" = decision 7);
questions put to the owner are in `OPEN-QUESTIONS.md` ("Q3"). The JSON Schema `schema/0.2/kbl.schema.json` checks
the structure of a 0.2 file, `schema/0.1/kbl.schema.json` that of a 0.1 file (§1.1); this document also states the
rules a schema cannot check (§17). When this document and the schema accept different files, this document wins
(D101).

A `.kbl.json` file holds one keyboard layout: a platform-neutral part that can hold every piece of data a CLDR
Keyboard 3.0 keyboard holds, and one section per target in `targets` (§16) with the choices only that target's
build needs. This version defines three build targets, Windows (`targets.windows`, `targets/windows.md`), macOS
(`targets.macos`, `targets/macos.md`) and Linux XKB (`targets.xkb`, `targets/xkb.md`), plus the conversion sections
`klc` and `cldr`. The macOS and XKB sections are being written; until they are, their objects hold only `onLoss`.
Sections for the official formats of further operating systems, and later for third-party formats such as Keyman,
are planned (D107) and come with later minor versions.

Contents: 1 File · 2 Text values · 3 Top level · 4 `metadata` · 5 `settings` · 6 `positions` and `forms` ·
7 Modifiers · 8 `keys` · 9 Layers and bindings · 10 `deadKeys` · 11 Gestures · 12 `displays` · 13 `variables` and
`transforms` · 14 Event processing · 15 `tests` · 16 `targets` · 17 Losses · 18 Extensions · 19 Validation rules ·
Appendix A position names and scan codes.

---

## 1. File

- A `.kbl.json` file is one JSON object (RFC 8259), encoded as UTF-8 without a byte-order mark. The file name
  SHOULD end in `.kbl.json`.
- Property names are lowerCamelCase. **No property is allowed that this document does not define**, except inside
  `extensions` (§18) and inside the free-form `detail` of a loss report. Readers MUST reject unknown properties
  (D3).
- The order of properties inside a JSON object carries **no meaning**. Wherever order matters, the format uses an
  array (D4).
- A file is **self-contained**: it never refers to another file, to CLDR import data or to a tool's built-in data
  other than what this specification and its target documents (`targets/*.md` and the tables they name) define
  (D2).
- The property `kbl` gives the format version, `"0.2"` for this document.

### 1.1 Versions

Each minor version has its own `kbl` value and its own JSON Schema, at `schema/<version>/kbl.schema.json` with the
`$id` `https://yakbd.github.io/kbl-spec/schema/<version>/kbl.schema.json` (D101, D108). This document defines
**0.2**: `kbl` `"0.2"`, schema `schema/0.2/kbl.schema.json`. Version 0.1 is the released 0.1 preview; its schema
`schema/0.1/kbl.schema.json` is not changed by 0.2 (only by what `COMPATIBILITY.md` allows within 0.1).

- **A file is valid against the version it names.** A 0.1 file is checked with the 0.1 schema and a 0.2 file with
  the 0.2 schema; each schema accepts only its own `kbl` value. A `$schema` member, when present, SHOULD be the
  `$id` of that version.
- **0.2 holds 0.1.** 0.2 only adds: `targets.macos` and `targets.xkb` (§16), their loss kinds (§17.3) and the
  provenance formats `keylayout` and `xkb` (§4). A valid 0.1 file with `kbl` (and `$schema`) changed to 0.2 is a
  valid 0.2 file and **means the same**: the Windows default rules and Table A are those of 0.1.
- **Reading.** A reader MUST reject a file whose `kbl` names a version it does not implement; it never guesses (D3).
  So a 0.1 reader rejects every 0.2 file. A 0.2 reader MUST accept 0.1 files as well, and reads a 0.1 file exactly
  as the 0.2 file it becomes when its `kbl` is changed.
- **Writing.** A tool SHOULD write the lowest version that holds what it writes, so that a file without any
  0.2-only member stays readable by 0.1 tools: a file is written as 0.2 only when it uses `targets.macos`,
  `targets.xkb`, a loss kind of a 0.2-only family (`macos`, `macosDefault`, `xkb`, `xkbDefault`) or a 0.2
  provenance format. A tool MAY write a higher version when its user asks for one. Raising the version changes
  `kbl` and `$schema` and nothing else.
- While 0.2 is a draft (until it is tagged, `COMPATIBILITY.md`), it may still change in any way; 0.1 does not.

## 2. Text values

### 2.1 Text

A **Text** is a JSON string holding a sequence of Unicode scalar values. It MUST NOT contain a lone surrogate
(an unpaired `\uD800`–`\uDFFF` escape): common JSON readers, Go's `encoding/json` among them, silently replace it by
U+FFFD (D5). Control characters, U+0000 and noncharacters are allowed and are written with JSON escapes
(`"\u0000"`, `"\b"`, `"\r"`). A Text has no escape syntax of its own: `\` and `$` are ordinary characters.

Where this document says "unit" it means a UTF-16 code unit; "character" means a Unicode scalar value.

### 2.2 CodeUnits

A **CodeUnits** value is an object `{"utf16": [ "D83D", "DE00" ]}`: a non-empty array of UTF-16 code units, each
written as exactly four hexadecimal digits (either case). It exists for the Windows targets, which can emit
sequences that are not valid Unicode text (a lone surrogate, the values `F000`–`F002`). Wherever a Text may contain
a whole character, write the character as Text; CodeUnits SHOULD be used only for a value a Text cannot hold
(validation warns otherwise, §19).

### 2.3 MarkedText

A **MarkedText** is either a Text, or an array whose items are each

- a Text (literal text),
- `{"marker": "<markerId>"}`: a CLDR marker (§13.3), or
- `{"variable": "<variableId>"}`: the value of a `string` variable (§13.1), inserted at that point.

The array form exists because CLDR allows markers and variables inside key outputs and displays. An array of only
Texts is equal to their concatenation; writers SHOULD use the plain Text form then.

### 2.4 Pattern

A **Pattern** is a JSON string in CLDR's transform syntax: the `from` and `to` syntax of UTS #35 Part 7, section
"transform" (regular-expression subset, `\u{…}` escapes, `\m{…}` markers, `${…}` and `$[…]` variables, `$1`–`$9`),
and the `from`/`before` syntax of `reorder`. Patterns are kept **verbatim** in CLDR syntax so that a CLDR file
round-trips without rewriting (D6). Variable values (§13.1) are Patterns as well. The JSON layer adds only JSON
escaping: the CLDR text `\u{300}` is written `"\\u{300}"` in the file.

### 2.5 Identifiers

| kind | pattern | notes |
|---|---|---|
| PositionId | `^[A-Za-z][A-Za-z0-9_]{0,63}$` | §6; names of Appendix A are RECOMMENDED |
| KeyId, FlickId, LayerId, DeadKeyId, MarkerId, FormId | `^[^\s,]{1,64}$` | CLDR uses XML NMTOKENs; any non-blank token without a comma is accepted |
| VariableId | `^[0-9A-Za-z_]{1,32}$` | as CLDR |
| ModifierComponent | `^[A-Za-z][A-Za-z0-9]{0,31}$` | §7 |
| loss kind | `^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$` | §17 (also the defaulted-choice kinds) |

## 3. Top level

| property | type | req. | meaning |
|---|---|---|---|
| `$schema` | string | no | the schema URL; informative |
| `kbl` | `"0.2"` | **yes** | format version (§1.1; `"0.1"` for a 0.1 file) |
| `metadata` | object | **yes** | §4 |
| `settings` | object | no | §5 |
| `positions` | object PositionId → Position | no | §6.1, the physical keys |
| `forms` | object FormId → Form | no | §6.2, hardware arrangements |
| `customModifiers` | object component → CustomModifier | no | §7.2 |
| `keys` | object KeyId → Key | no | §8, CLDR's bag of keys |
| `hardware` | object | no | §9.1, the layers of the physical keyboard |
| `touch` | array of TouchLayerSet | no | §9.4, touch layouts |
| `deadKeys` | object DeadKeyId → DeadKey | no | §10 |
| `flicks` | object FlickId → Flick | no | §11.1 |
| `displays` | object | no | §12 |
| `variables` | array of Variable | no | §13.1 |
| `transforms` | object | no | §13.2 |
| `tests` | array of TestFile | no | §15 |
| `targets` | object | no | §16: `windows`, `macos`, `xkb`, `klc`, `cldr` |
| `onLoss` | object | no | §17.2 |
| `extensions` | object | no | §18 |
| `cldrSpecial` | array of string | no | §18 |

A file needs at least one of `hardware` or `touch` to describe a usable layout; a file with neither is valid (for
example a dead-key library under construction) but every build reports `general.noLayers`.

## 4. `metadata`

| property | type | req. | meaning |
|---|---|---|---|
| `id` | string | **yes** | BCP 47 language tag identifying this keyboard, as CLDR's `keyboard3/@locale`, for example `fr-t-k0-azerty`, `pt-t-k0-abnt2`. Its language part is the primary locale |
| `locales` | array of string | no | further BCP 47 tags of languages this keyboard intentionally supports (CLDR `locales/locale/@id`); in order |
| `name` | Text | **yes** | the keyboard's name (CLDR `info/@name`); the default display name everywhere |
| `localizedNames` | object BCP 47 → Text | no | the name in further languages (Windows: one string 1000 per language, `.klc` `DESCRIPTIONS`) |
| `description` | Text | no | free text |
| `authors` | array of Author | no | `{ "name": Text, "email"?: string, "url"?: string }`; CLDR `info/@author` is one string |
| `attribution` | Text | no | originating entity of the design, if not the author (CLDR `info/@attribution`) |
| `layoutPattern` | string | no | the layout pattern, such as `QWERTY`, `AZERTY`, `INSCRIPT` (CLDR `info/@layout`); not localised |
| `indicator` | string | no | short identifier for a layout switcher, such as `FR` (CLDR `info/@indicator`) |
| `version` | string | no | version of the layout data; SHOULD be a Semantic Versioning 2.0.0 string (CLDR `version/@number`) |
| `license` | string | no | SPDX licence expression for the layout data, for example `CC0-1.0`, `MIT`, `Unicode-3.0` |
| `copyright` | Text | no | copyright statement (`.klc` `COPYRIGHT`) |
| `organization` | Text | no | publishing organisation (`.klc` `COMPANY`) |
| `draft` | `approved`, `contributed`, `provisional`, `unconfirmed` | no | CLDR `keyboard3/@draft` |
| `provenance` | object | no | informative record of where the data came from: `source` (string, e.g. a file name), `format` (`cldr`, `klc`, `windowsDll`, `kbl`, `keylayout` (macOS, 0.2), `xkb` (0.2), `other`), `cldrConformsTo` (integer), `cldrImports` (array of string: the CLDR import paths that were inlined), `notes` (Text). Never changes behaviour |

## 5. `settings`

| property | type | default | meaning |
|---|---|---|---|
| `normalization` | `enabled`, `disabled` | `enabled` | CLDR `settings/@normalization`. `enabled`: output, matching and context are normalised as CLDR describes (NFC output, NFD matching); `disabled`: exact code points everywhere. Normalisation is that of UAX #15 for **Unicode 18.0.0**, the version of CLDR release 49 (D71). A target that does not normalise while typing (Windows) normalises each output at build time instead (D72, `targets/windows.md` §6); CodeUnits values are never normalised |
| `capsLockFallback` | boolean | `true` | §9.3: when Caps Lock is on and the layer for the full state has no binding for the key, resolve again without Caps Lock. CLDR has no such rule (its value for imported CLDR files is `false`, D11) |
| `capsLockOffBy` | `capsLock`, `shift` | `capsLock` | what turns Caps Lock off: pressing Caps Lock again, or pressing Shift ("Shift Lock", typewriter rule). Not in CLDR; Windows `KLLF_SHIFTLOCK` |
| `bidiMarksOnShiftBackspace` | boolean | `false` | left Shift + Backspace types U+200E LEFT-TO-RIGHT MARK and right Shift + Backspace U+200F RIGHT-TO-LEFT MARK, whatever else is held, without disturbing a pending dead key. Not in CLDR; Windows `KLLF_LRM_RLM` |

## 6. Physical keys

### 6.1 `positions`

A **position** is one physical key of a hardware keyboard. It is not the same as a CLDR `key` (§8), which is an
output with gestures that rows place on positions (D8).

| property | type | req. | meaning |
|---|---|---|---|
| `scanCode` | string | no | PC scan code (set 1 make code) as 2 hex digits (`"1E"`), or 4 with the prefix `E0` (`"E01D"`) or `E1` (`"E11D"`). Upper- or lower-case. Unique among positions |
| `name` | Text | no | the key's name as a user interface shows it (`Esc`, `Num Enter`); Windows key-name tables, `.klc` `KEYNAME` / `KEYNAME_EXT` |
| `numLock` | boolean | no | `true`: the key is a number-pad key subject to Num Lock (§14.1). Default `false` |
| `description` | Text | no | free text |

Positions SHOULD be named with the `code` values of the W3C "UI Events KeyboardEvent code Values" specification;
Appendix A lists them with their scan codes. A file MAY use other ids. A position with no binding anywhere is
still meaningful: it can carry a scan code, a name and target data (for example Escape or F1 on Windows).

### 6.2 `forms`

A **form** is a hardware arrangement: rows of positions, top to bottom, each row left to right (CLDR `form`,
whose rows are lists of scan codes; here the scan code lives on the position).

| property | type | req. | meaning |
|---|---|---|---|
| `rows` | array of array of PositionId | **yes** | the rows; positions only of the non-frame keys, as CLDR |
| `cldrSpecial` | array of string | no | §18 |

The form ids `us`, `iso`, `abnt2`, `jis` and `ks` mean CLDR's implied forms. A file that uses one MUST include it
in `forms` (self-containment), with the rows of CLDR's `scanCodes-implied.xml` translated to positions; Appendix A
gives the translation. The id `touch` is reserved and MUST NOT be a form id.

## 7. Modifiers

### 7.1 Components

A **modifier set** is an array of modifier components that must be active together. The empty array means "no
modifier" (CLDR `none`); the array `["other"]` means "no other layer matches" (CLDR `other`).

Built-in components (CLDR's): `shift`, `ctrl`, `ctrlL`, `ctrlR`, `alt`, `altL`, `altR`, `caps`, and the two special
values `none` (written as the empty array) and `other`. Their meaning is CLDR's:

- `shift`: either Shift key held. Left and right Shift are not distinguished (except by
  `bidiMarksOnShiftBackspace`).
- `ctrl`: either Control key held; `ctrlL` / `ctrlR`: that key held and the other one not. Same for `alt`, `altL`,
  `altR`.
- `caps`: Caps Lock is on (a lock state, not a held key).
- A set may not mix `ctrl` with `ctrlL`/`ctrlR`, `alt` with `altL`/`altR`, or a left with a right variant; `other`
  stands alone.

Further components are declared in `customModifiers`.

### 7.2 `customModifiers`

Object from component name to CustomModifier. The name MUST NOT be a built-in component.

| property | type | req. | meaning |
|---|---|---|---|
| `kind` | `held`, `lock` | **yes** | `held`: active while one of its positions is held (like Shift); `lock`: toggled by pressing one of its positions (like Caps Lock) |
| `positions` | array of PositionId | **yes** | the keys that operate it; a position MAY operate one `held` and one `lock` component at once (Japanese Kana) |
| `fallback` | boolean | no | `lock` only: with the lock on and no binding in the matched layer, resolve again without the lock (§9.3), as `settings.capsLockFallback` does for Caps Lock. Default `true` |
| `description` | Text | no | |

A position that operates a modifier produces no text of its own; a binding on it is an error (§19).

### 7.3 Matching

The **modifier state** S of a key event is: which of Shift, left/right Control, left/right Alt are held, whether
Caps Lock is on, and which custom components are active. A modifier set M **matches** S when every component of M is
active in S and every component not in M is inactive, where

- `shift`, `caps`, a custom component: active as defined above;
- `ctrl` is satisfied by either Control; `ctrlL` requires left held and right not held (likewise `ctrlR`, `alt`,
  `altL`, `altR`);
- "every other component inactive" means: no Shift if `shift` is absent; no Control at all if none of
  `ctrl`/`ctrlL`/`ctrlR` is present; the same for Alt; Caps Lock off if `caps` is absent; every custom component not
  in M inactive.

The empty set matches only the state with nothing active. `["other"]` is never matched directly (§9.3).

Within one layer set (§9) no two modifier sets of different layers may match the same state (CLDR's no-overlap
rule); a validator reports `general.layerOverlap`.

## 8. `keys`

Object from KeyId to Key: CLDR's "bag of keys". A Key is an output definition with gestures and touch properties.
Hardware layers may refer to keys (§9.2); touch rows always do.

| property | type | meaning |
|---|---|---|
| `output` | MarkedText | the text emitted when the key is pressed (CLDR `key/@output`) |
| `deadKey` | DeadKeyId | the key is that dead key (§10); excludes `output` |
| `gap` | `true` | the key is an empty space of `width` (CLDR `key/@gap`); excludes every property except `width` |
| `width` | number 0.01–100 | width in key units, default 1 (CLDR `key/@width`) |
| `stretch` | `true` | a touch layout may stretch the key (CLDR `key/@stretch`) |
| `layerId` | LayerId | pressing switches the touch layout to that layer, after the output if any (CLDR `key/@layerId`; ignored for hardware) |
| `flickId` | FlickId | the key's flicks (§11.1) |
| `longPressKeyIds` | array of KeyId | long-press choices, in order (CLDR `key/@longPressKeyIds`) |
| `longPressDefaultKeyId` | KeyId | the default long-press choice; MUST be in `longPressKeyIds` |
| `multiTapKeyIds` | array of KeyId | key emitted by 2, 3, … quick taps (CLDR `key/@multiTapKeyIds`); MUST NOT contain the key itself |
| `function` | `backspace`, `enter`, `tab`, `escape`, `shift`, `capsLock`, `space` | informative identity of a touch key that CLDR cannot express ("this key is Backspace"). A key with `function: "backspace"` and no `output` performs the backspace action (§14.3) |

A key with none of `output`, `deadKey`, `gap`, `layerId`, `function` is an error (CLDR requires one of the first
four).

**Implied keys** (as CLDR, D9): a KeyId that is not defined in `keys` but is used is implied when it is a single
character in `0`–`9`, `A`–`Z`, `a`–`z` (output = the id), `space` (output `" "`, `stretch: true`) or `gap`
(`gap: true`). These are rules of this specification, not imported data. A file MAY define a key with such an id;
the definition wins.

## 9. Layers and bindings

### 9.1 `hardware`

The layers of the physical keyboard (at most one hardware layer set, as CLDR).

| property | type | req. | meaning |
|---|---|---|---|
| `formId` | FormId | no | the form the layout was designed on (CLDR `layers/@formId`); MUST be in `forms` when given |
| `minDeviceWidth` | integer 1–999 | no | CLDR `layers/@minDeviceWidth` |
| `layers` | array of HardwareLayer | **yes** | |
| `cldrSpecial` | array of string | no | §18 |

HardwareLayer:

| property | type | req. | meaning |
|---|---|---|---|
| `id` | LayerId | no | layer id (CLDR `layer/@id`) |
| `modifiers` | array of modifier set | **yes** | the states this layer serves; CLDR's comma-separated list (§7) |
| `bindings` | object PositionId → Binding | **yes** | what each position does in this layer; a position not listed does nothing in this layer |
| `cldrSpecial` | array of string | no | §18 |

### 9.2 Bindings

A **Binding** is one of:

| form | meaning |
|---|---|
| a non-empty Text | the key emits this text. Shorthand for `{"output": text}` |
| `{"output": MarkedText}` | the key emits this text (with markers/variables) |
| `{"key": KeyId}` | the key behaves as that Key of `keys` (or an implied key) |
| `{"deadKey": DeadKeyId}` | the key is that dead key |
| CodeUnits `{"utf16": [...]}` | the key emits exactly these UTF-16 units (Windows only; §2.2) |

An empty output, `{"output": ""}`, is an **explicit nothing**: resolution (§9.3) stops at it, so Caps Lock and lock
fallback do not apply, and the key emits no text (it does not disturb a pending dead key, §14.2). Where fallback
should apply, write no binding instead (D64). A text binding consisting of the single character
U+0008 is the backspace action (§14.3).

### 9.3 Resolution

Given a position P and a modifier state S, the binding of P is found as follows:

```
resolve(P, S):
  L := the layer whose modifier sets match S (at most one; §7.3)
  if L exists and L.bindings has P:            return L.bindings[P]
  if S has caps and settings.capsLockFallback:  return resolve(P, S without caps)
  for each custom lock K active in S, in ascending name order:
      if K.fallback (default true):             return resolve(P, S without K)
  if L exists:                                  return nothing
  if a layer with ["other"] exists:             return its binding for P, or nothing
  return nothing
```

`nothing` means the key event produces no text and does not disturb a pending dead key (§14.2).

Caps Lock falls back first, then the custom locks with `fallback` (§7.2). A file that wants a lock to give nothing
for unlisted keys sets its `fallback` (or `settings.capsLockFallback`) to `false`.

### 9.4 `touch`

Array of TouchLayerSet, each a touch layout for devices at least `minDeviceWidth` millimetres wide (CLDR
`layers formId="touch"`). At most one set may omit `minDeviceWidth`; widths are distinct.

| property | type | req. | meaning |
|---|---|---|---|
| `minDeviceWidth` | integer 1–999 | no | |
| `layers` | array of TouchLayer | **yes** | one of them has `id` `base` |
| `cldrSpecial` | array of string | no | |

TouchLayer: `id` (LayerId, **required**), `modifiers` (array of modifier set, optional), `rows` (**required**:
array of rows, each an array of KeyId), `cldrSpecial`. Layer switching is by keys with `layerId`. When no touch set
fits, an implementation MAY show the hardware layers as a touch layout, with the layer whose modifier set is empty
as the base layer (CLDR rule).

## 10. `deadKeys`

Dead keys are first-class (D12). Object from DeadKeyId to DeadKey:

| property | type | req. | meaning |
|---|---|---|---|
| `spacing` | Text or CodeUnits | **yes** | what the dead key stands for when it does not combine: emitted by `noMatch: emitBoth` and `emitSpacing`, shown by default on the key cap. Windows: the dead character, by default (`targets/windows.md`, rule `deadCharacter`) |
| `name` | Text | no | the dead key's name (Windows dead-key names, `.klc` `KEYNAME_DEAD`) |
| `entries` | array of Entry | **yes** (may be empty) | the composition table, in order; the first matching entry wins |
| `noMatch` | `emitBoth`, `emitText`, `emitSpacing`, `emitNothing` | no | what happens when the next input has no entry (§14.2). Default `emitBoth` |
| `display` | MarkedText | no | key-cap text when it should differ from `spacing` |

Entry: `{ "base": Text | {"deadKey": DeadKeyId} | CodeUnits, "result": Text | {"deadKey": DeadKeyId} | CodeUnits }`.

- `base` is the text a key event produced (exact match, after Caps Lock has been applied), or another dead key
  pressed while this one is pending.
- `result` Text: the text emitted. It may have any length. `{"deadKey": id}`: the result is that dead key, which is
  now pending (chained dead keys; any depth, cycles allowed).
- Two entries with the same base are allowed; the later one is unreachable and a validator warns
  (`general.duplicateDeadKeyEntry`).

## 11. Gestures

### 11.1 `flicks`

Object FlickId → Flick: `{ "segments": [ { "directions": ["ne", "s"], "keyId": KeyId } ], "cldrSpecial"?: [...] }`.
`directions` is a non-empty path of `n`, `e`, `s`, `w`, `ne`, `nw`, `se`, `sw`. A flick along that path emits the
key `keyId` (whose own gestures are ignored). A key uses flicks through `flickId`.

### 11.2 Long press and multi-tap

On the Key: `longPressKeyIds`, `longPressDefaultKeyId`, `multiTapKeyIds` (§8). Gestures of the keys they refer to are
ignored. Behaviour past the end of a multi-tap list is implementation-defined (as CLDR).

## 12. `displays`

| property | type | meaning |
|---|---|---|
| `entries` | array of `{ "output"?: MarkedText, "keyId"?: KeyId, "display": MarkedText }` | key-cap text: for any key whose output equals `output`, or for the key `keyId` (exactly one of the two). A non-spacing mark in `display` stands on U+25CC (CLDR rule) |
| `baseCharacter` | Text | hint: show combining marks on this character instead of U+25CC (CLDR `displayOptions/@baseCharacter`) |
| `cldrSpecial` | array of string | §18 |

## 13. Variables, transforms, markers

These are CLDR's mechanisms, kept with their syntax and meaning (UTS #35 Part 7, "variables", "transforms",
"markers", "reorder", "backspace transforms").

### 13.1 `variables`

Array of `{ "id": VariableId, "type": "string" | "set" | "uset", "value": Pattern }`, in order: a value may refer
only to variables earlier in the array. Ids are unique across all types. `string`: a string usable in patterns, key
outputs and displays; `set`: a whitespace-separated list of strings; `uset`: a UnicodeSet (CLDR's subset, no
properties, no multi-character strings).

### 13.2 `transforms`

`{ "simple"?: [Group], "backspace"?: [Group], "cldrSpecial"?: { "simple"?: [string], "backspace"?: [string] } }`.

A Group is either `{ "transforms": [ {"from": Pattern, "to"?: Pattern} ] }` or
`{ "reorders": [ Reorder ] }`, never both and never empty, with an optional `cldrSpecial`.

Reorder: `from` (Pattern, required), `before` (Pattern), `order` (integer −128…127 or array of them), `tertiary`
(the same), `tertiaryBase` (boolean or array of booleans), `preBase` (boolean or array of booleans). An array gives
one value per matched element; the last value repeats (CLDR rule).

Semantics (CLDR's): the groups of `simple` run in order after every key event that put text or a marker into the
context; inside a group the first transform whose `from` matches at the end of the context replaces the match by
`to` and processing moves to the next group. A `reorders` group sorts the context's last run as CLDR's reorder
algorithm says. `backspace` groups run when the backspace action happens (§14.3); without a match the default
backspace removes the last character together with markers adjacent to it.

### 13.3 Markers

A marker is an invisible item in the input context, created by a MarkedText `{"marker": id}` or by `\m{id}` in a
Pattern `to`, matched by `\m{id}` or `\m{.}` in a `from`. Markers never reach the application and are discarded when
the insertion point moves. Normalization treats them as CLDR describes ("Normalization and Markers").

## 14. Event processing

This section fixes the meaning of a key event, so that every target and converter agrees on what a file means.

### 14.1 Key event

A key event is a press of position P in modifier state S (§7.3), or a touch gesture on a Key.

1. Modifier and lock positions (Shift, Control, Alt, Caps Lock, custom modifiers) only change S.
2. A `numLock` position: when Num Lock is on and Shift is not held, its binding is `resolve(P, S)`; otherwise it is a
   navigation key that produces no text (D14).
3. If `settings.bidiMarksOnShiftBackspace` and P is the Backspace position (a position whose base-layer binding is
   the backspace action) and a Shift key is held: emit U+200E (left Shift held) or U+200F (only right Shift),
   leave a pending dead key pending, and stop.
4. Otherwise the binding `resolve(P, S)` (§9.3) gives the input: text, a dead key, or nothing.

### 14.2 Dead keys

The dead-key machine runs before transforms. State: the pending dead key D, or none.

```
on input X:
  if X is nothing:                      (D unchanged) stop
  if no D:
      if X is dead key E:               D := E; stop
      else:                             emit X; stop
  # a dead key D is pending
  entry := first entry of D whose base equals X     (X a dead key E: base {"deadKey": E})
  if entry:
      if entry.result is {"deadKey": F}: D := F; stop
      D := none; emit entry.result; stop
  D := none
  T := X, or spacing(E) when X is dead key E      (E does not become pending)
  noMatch(D_old):  emitBoth  → emit spacing(D_old) then T
                   emitText  → emit T
                   emitSpacing → emit spacing(D_old)
                   emitNothing → emit nothing
```

"Emit" passes text (with markers) to the transforms (§13.2) and then to the application, normalised per
`settings.normalization`. The backspace action with a pending dead key is input like any other: if D has an entry
with base U+0008 it applies; otherwise `noMatch` applies with T = the backspace action. A key-up never changes D.

**One model, every target** (D110). `deadKeys` (§10) and this machine are the only dead-key model of the format.
Every target builds its own native form from it: Windows its dead-key tables (`targets/windows.md` §8), macOS
`.keylayout` actions and states (`targets/macos.md`), XKB `dead_*` keysyms with Compose sequences
(`targets/xkb.md`), and later targets their own forms. No target adds a second dead-key model; a target
section holds what its form needs beyond the model (as `targets.windows.deadKeys` holds the Windows dead
character). Each target document has a dead-key section that maps every
part of the model (`spacing`, `entries` in order, chained results, `noMatch`, the backspace action) to its form, and
names the loss kind for each part its form cannot express.

### 14.3 Backspace action

The backspace action is a binding whose text is exactly U+0008, or a Key with `function: "backspace"` and no output.
When it reaches the application (after §14.2) it runs `transforms.backspace` on the context; if that changes
nothing, the last character before the insertion point is deleted (CLDR default backspace). A target that delivers
U+0008 to the application instead (Windows) is equivalent for applications that treat it as Backspace.

### 14.4 Touch

A touch key press emits the Key's output or dead key, then switches layers if `layerId` is set. Flicks, long-presses
and multi-taps emit the chosen Key the same way.

## 15. `tests`

Array of TestFile: a CLDR keyboard test file (technical preview in CLDR) held in the file it tests, extended with
hardware keystrokes.

TestFile: `info` (`{ "name": string (required), "author"?: Text, "keyboard"?: string }`, CLDR `info`),
`repertoires` (array), `suites` (array), `cldrSpecial` (array of string).

Repertoire: `{ "name": string, "chars": string, "type"?: "default"|"simple"|"gesture"|"flick"|"longPress"|"multiTap"|"hardware" }`
where `chars` is a UnicodeSet in CLDR test syntax (verbatim; note it uses `\uXXXX`, not `\u{…}`). Meaning: every
character of the set can be typed by the means `type` names (CLDR).

Suite: `{ "name": string, "tests": [Test], "cldrSpecial"?: [...] }`. Test: `{ "name": string, "startContext"?: Text,
"steps": [Step], "cldrSpecial"?: [...] }`. Steps run in order with cumulative effect; tests are independent.

| Step | meaning |
|---|---|
| `{ "keystroke": { "key": KeyId, "flick"?: [direction], "longPress"?: integer ≥ 0, "tapCount"?: integer ≥ 2 } }` | CLDR keystroke: press the Key (at most one gesture). `longPress` 0 = the default choice |
| `{ "keystroke": { "position": PositionId, "modifiers"?: [component], "locks"?: [component] } }` | kbl extension: press a hardware position with these modifiers held and these locks on (`caps`, custom `lock` components). Held modifiers name a side: `shiftL`, `shiftR`, `ctrlL`, `ctrlR`, `altL`, `altR`, or a custom `held` component; `shift`, `ctrl`, `alt` mean the left key. (`shiftL`/`shiftR` exist only here, for `bidiMarksOnShiftBackspace`.) |
| `{ "emit": Text }` | input this text as if a key produced it (CLDR `emit`) |
| `{ "backspace": true }` | the backspace action |
| `{ "check": Text }` | the text before the insertion point (including `startContext`) must equal this |

A key-id keystroke on a hardware target, `startContext`, `emit` and `check` on such a target: `coverage/cldr-keyboard3.md` §3.7.

## 16. `targets`

`targets` holds, per target or format, the explicit choices for a build or conversion. Every property of a target is
optional; where it is silent the target's default rules apply. **Pinning** means writing the defaults into the file
so that the build no longer depends on those rules (`targets/windows.md` §10).

| property | defined in |
|---|---|
| `windows` | §16.1 (fields) and `targets/windows.md` (default rules) |
| `klc` | §16.2 |
| `cldr` | §16.3 |
| `macos` | §16.4 (fields) and `targets/macos.md` (default rules); 0.2 |
| `xkb` | §16.5 (fields) and `targets/xkb.md` (default rules); 0.2 |

Every build target follows the same pattern (D16, D109): a document `targets/<target>.md` with its default rules
(a `## 1. Rule index` table, rules reported as `<target>Default.<rule>`, §17.1), its loss kinds in §17.3 under the
family `<target>`, a coverage page `coverage/<target>.md` that gives every element of the native format a home,
and a position table.

**Position tables** (D109). Position names (§6.1) are the format's one way to name a physical key. A target whose
native format names keys by its own codes has one fixed **default table** from position names to those codes,
used where the file does not pin a code for a position (`targets.<target>.keys.<p>`). Table A of the Windows target
(`targets/windows-default-vk.tsv`, position → virtual key) was the first; each target has its own:

| target | table | code |
|---|---|---|
| `windows` | `targets/windows-default-vk.tsv` (Table A) | virtual key, scan-code flags |
| `macos` | `targets/macos-default-keycode.tsv` | `.keylayout` key code |
| `xkb` | `targets/xkb-default-keyname.tsv` | XKB key name |

Every table is a tab-separated text file in this repository, normative over any summary of it, with `#` comment
lines first that cite its sources, then a header line whose first column is `position`, second column the target's
code and last column `source`; one row per position, positions and codes unique, every row naming its source.
Table A keeps its own columns, written before this pattern. A table is part of its version: within a minor version
its rows keep their meaning (`COMPATIBILITY.md`). Two tests keep it from drifting: this repository's checker
(`npm test`) checks every table's shape; a tool embeds an unchanged copy of each table it uses and has a test that
compares the copy byte for byte with the file in this repository at the release tag the tool names, so a tool can
never carry rows of its own.

### 16.1 `targets.windows`

The default rules are deliberately few and mechanical (a fixed table and one-line rules, D16): they are knowingly
wrong for many layouts, and a layout that needs something else says so here. **Any** default rule can be overridden
by the field it names. Every build lists each choice that came from a default rule as a report entry of kind
`windowsDefault.<rule>` (§17.1), so an author sees what to make explicit; a file that wants to be fully explicit sets
`"windowsDefault.*": "error"` in `onLoss`.

| property | type | meaning (default rule in `targets/windows.md`) |
|---|---|---|
| `dllName` | string `^[A-Za-z][A-Za-z0-9_]{0,7}$` | file name without `.dll` (rule `dllName`) |
| `builds` | array of `x86`, `x64`, `wow64`, `arm64x` | the DLL builds to make, each one file; one installer per platform carries all of them and installs the right ones (D18). Default: every build the tool can make (rule `builds`, D39); a listed build the tool cannot make is an error. What each build is and where it goes, and when a tool may make `arm64x`: `targets/windows.md` §2.1 |
| `useTableA` | boolean | `false`: rule `vk` uses no Table A at all, so the file's VKs are exactly its `keys.<p>.vk` pins and no default row is added (written by the DLL importer, D54). Default `true` |
| `localeFlags` | `{ "altGr"?: bool, "shiftLock"?: bool, "lrmRlm"?: bool }` | `KLLF_ALTGR`, `KLLF_SHIFTLOCK`, `KLLF_LRM_RLM` (rules `altGr`, `shiftLock`, `lrmRlm`) |
| `kbdVersion` | integer 0–65535 | high word of `fLocaleFlags` (rule `kbdVersion`) |
| `keyboardType` | `{ "type": integer, "subType": integer }` | `dwType`, `dwSubType` (rule `keyboardType`) |
| `modifiers` | object | `bits` (array of `{ "vk": VK, "bit": integer, "component": string }`), `modNumber` (array of integer 0–14 or null, index = bit combination), `kanaLockComponent` (string) (rules `modifierBits`, `modNumber`) |
| `keys` | object PositionId → WindowsKey | per position: `vk` (VK), `scanCodeFlags` (array of `ext`, `multiVk`, `special`, `numpad`, `unicode`, `injectedVk`, `mappedVk`, `break`), `attributes` (array of `CAPLOK`, `SGCAPS`, `CAPLOKALTGR`, `KANALOK`, `GRPSELTAP`) (rules `vk`, `scanCodeFlags`, `attributes`) |
| `scanCodeTableSize` | integer 1–255 | `bMaxVSCtoVK` (rule `scanCodeTableSize`) |
| `tables` | array of `{ "width": integer 1–15, "rows": [PositionId or {"vk": VK}] }` | the character tables and their row order (rule `tables`) |
| `extraRows` | array of `{ "vk": VK, "attributes"?: [...], "cells": [Cell] }` | character rows for a virtual key that no position produces (no default: none). Cell = Text, CodeUnits, `{"deadKey": id}` or null |
| `deadKeys` | object DeadKeyId → `{ "character": Text or CodeUnits }` | the Windows dead character of each dead key (rule `deadCharacter`) |
| `strings` | `{ "layoutName"?: LangIdText, "languageName"?: LangIdText, "localeName"?: string }` | DLL strings 1000, 1100, 1200; LangIdText = object LANGID (4 hex digits) → Text (rule `strings`) |
| `versionInfo` | `{ "fileVersion"?: "a.b.c.d", "productVersion"?: "a.b.c.d", "companyName"?: Text, "legalCopyright"?: Text, "fileDescription"?: Text }` | the version resource (rule `versionInfo`) |
| `registration` | `{ "klid"?: 8 hex, "langId"?: 4 hex, "layoutId"?: 4 hex, "layoutText"?: Text, "localeName"?: string, "customLanguageName"?: Text, "productCode"?: GUID }` | the registry data an installer writes (rule `registration`; `productCode`: rule `productCode`; `klid` and `layoutId`, when given, are fixed demands, otherwise the installer allocates them on the machine: `targets/windows-install.md` §2, §5) |
| `install` | `{ "enableForUser"?: bool, "enableForSignInAndNewUsers"?: bool, "productName"?: Text, "productVersion"?: string, "publisher"?: Text }` | installer choices: add the layout to the installing user's list (rule `enableForUser`, default `true`), also to the sign-in screen and to accounts created later (rule `enableForSignInAndNewUsers`, default `false`), the uninstall entry's name, version and publisher (rule `uninstallEntry`); `targets/windows-install.md` |
| `nls` | object | **carried, not compiled**: the `KbdNlsLayerDescriptor` table: `oemIdentifier`, `layoutInformation`, `vkToF` (array of `{ "vk", "procType", "procCurrent", "procSwitch", "proc": [8 × {"index","param"}], "procAlt": [8 × …] }`), `mouseVKeys` (array of `{ "vk", "flags"? }`) |
| `dispatcher` | object | **carried, not compiled**: multi-table data of a dispatcher DLL: `tables` (array of `{ "dllName", "type", "subType" }`), `realDllFile` (string) |
| `onLoss` | OnLoss | loss policy for this target (§17.2) |

VK is a virtual-key name of `targets/windows-vk-names.tsv` (a copy of the reference specification's table,
generated from windows-sys; without `VK_`, any case, at most 32 characters, D96; `0`–`9`, `A`–`Z`) or `0xNN`.

### 16.2 `targets.klc`

| property | type | meaning |
|---|---|---|
| `msklcEditorCompatible` | boolean | write only what the MSKLC editor keeps (reference `klc-format` §10.1), reporting the rest as `klc.*` losses. Default `false` |
| `versionLine` | string | the text of the `VERSION` line, kept from a read file |
| `onLoss` | OnLoss | |

Every other `.klc` value is taken from `targets.windows` and the Windows default rules (a `.klc` file describes a
Windows layout).

### 16.3 `targets.cldr`

| property | type | meaning |
|---|---|---|
| `conformsTo` | integer ≥ 45 | `keyboard3/@conformsTo` to write. Default: the lowest value that supports the data, at least 45 |
| `locale` | string | `keyboard3/@locale` when it must differ from `metadata.id` |
| `carryInSpecial` | boolean | write kbl-only data into a `<special>` element (`coverage/cldr-keyboard3.md` §4) so a round trip loses nothing. Default `true` |
| `onLoss` | OnLoss | |

### 16.4 `targets.macos` (0.2)

macOS keyboard layouts: a `.keylayout` file in a `.bundle` (`targets/macos.md`, `coverage/macos.md`). Being
written; until then the object holds only:

| property | type | meaning |
|---|---|---|
| `onLoss` | OnLoss | |

### 16.5 `targets.xkb` (0.2)

Linux keyboard layouts for Wayland and X11: XKB symbols and a Compose file (`targets/xkb.md`, `coverage/xkb.md`).
Being written; until then the object holds only:

| property | type | meaning |
|---|---|---|
| `onLoss` | OnLoss | |

## 17. Losses

### 17.1 Loss reports

Every conversion and build returns a **loss report**: a list of entries

```json
{ "kind": "windows.altOnlyLayer", "severity": "warning", "path": "/hardware/layers/4",
  "message": "…", "detail": { } }
```

Besides losses, a build reports every **defaulted choice**: an entry whose kind is `<target>Default.<rule>`
(for Windows `windowsDefault.dllName`, …, the rule names of `targets/windows.md`; for macOS `macosDefault.<rule>` and
for XKB `xkbDefault.<rule>`, the rule indexes of `targets/macos.md` and `targets/xkb.md`), with the chosen value in
`detail.value`. Defaulted entries follow the same policy mechanism; their default policy is `accept`, so a file
can turn them into warnings or errors (`"windowsDefault.*": "error"`).

`kind` is a loss kind of §17.3 or a defaulted-choice kind; `severity` is the resolved policy (§17.2); `path` is a JSON Pointer into the source
file (or a format-specific locator such as a `.klc` line number for imports); `message` is the tool's own text;
`detail` is free-form. A tool also prints a human summary (count per kind and severity). A build or conversion
**fails** when any entry has severity `error`, and writes nothing.

### 17.2 `onLoss` policy

OnLoss: `{ "default"?: policy, "kinds"?: { <kind or prefix.*>: policy } }`, policy = `error`, `warning`, `accept`.
`accept` still lists the entry in the report, with severity `accept`; it never hides it.

The policy of a loss of kind K in target T is the first that applies:

1. `targets.T.onLoss.kinds[K]`
2. `onLoss.kinds[K]`
3. `targets.T.onLoss.kinds["<prefix>.*"]`, then `onLoss.kinds["<prefix>.*"]` (prefix = part of K before the dot)
4. `targets.T.onLoss.default`, then `onLoss.default`
5. the default policy of K in §17.3.

Kinds marked **fatal** are always `error`, whatever the file says.

### 17.3 Loss kinds

| kind | default | when |
|---|---|---|
| `windowsDefault.<rule>` | accept | a Windows build used the default rule `<rule>` of `targets/windows.md` (one entry per rule, the affected items in `detail`) |
| `macosDefault.<rule>` | accept | a macOS build used the default rule `<rule>` of `targets/macos.md` (0.2; as for Windows) |
| `xkbDefault.<rule>` | accept | an XKB build used the default rule `<rule>` of `targets/xkb.md` (0.2; as for Windows) |
| `general.noLayers` | warning | the file has neither `hardware` nor `touch` |
| `general.layerOverlap` | **fatal** | two layers of one set match the same state (§7.3) |
| `general.unresolvedReference` | **fatal** | a KeyId, DeadKeyId, FlickId, FormId, PositionId, VariableId or component is used but not defined (and not implied) |
| `general.duplicateDeadKeyEntry` | warning | an entry of a dead key is unreachable |
| `general.modifierSetInvalid` | **fatal** | a modifier set mixes `ctrl` with `ctrlL`/`ctrlR`, `alt` with `altL`/`altR`, a left with a right variant, or `none`/`other` with anything (§7.1) |
| `general.duplicateScanCode` | **fatal** | two positions have the same `scanCode` |
| `general.duplicateVariableId` | **fatal** | two variables have the same id |
| `general.longPressDefaultInvalid` | error | `longPressDefaultKeyId` is not in `longPressKeyIds` |
| `general.multiTapSelf` | error | a key is in its own `multiTapKeyIds` |
| `general.bindingOnModifier` | error | a position that operates a modifier or lock has a binding |
| `general.touchBaseMissing` | error | a touch layer set has no layer `base` |
| `general.codeUnitsAreText` | warning | a CodeUnits value is valid text and should be a Text |
| `general.importInlined` | accept | an importer inlined imported data (CLDR `import`, implied forms) |
| `general.metadataDropped` | accept | metadata the output format has no field for (authors beyond the first, licence, localised names, description, provenance) |
| `general.normalizationNotApplied` | accept | `settings.normalization` is `enabled` and the target does not normalise while typing: each output was NFC-normalised at build time, but text that several keystrokes make together is not (D73) |
| `general.outputNormalized` | accept | an output was changed by build-time NFC (D72, D73): one entry per changed output, its path and the text before and after in `detail`; a Windows limit the normalised output then exceeds reports its own kind |
| `general.touchDropped` | accept | touch layer sets, flicks, long-press and multi-tap are not part of the output |
| `general.displayDropped` | accept | `displays` not part of the output |
| `general.testsDropped` | accept | `tests` not part of the output |
| `general.extensionDropped` | accept | `extensions` or `cldrSpecial` not part of the output |
| `windows.vkMissing` | error | a position needs a virtual key and has none (no pin, no default) |
| `windows.noHardwareLayers` | error | the file has no hardware layers (a touch-only keyboard): the DLL would hold only Table A's default rows (D89) |
| `windows.vkDuplicate` | error | two positions get the same virtual key, except where Table A gives both positions that VK and both keep it (D38), between a position of the file and a Table A row added for a scan code no position uses (D86), in a file with `useTableA: false`, and for `_none_` (D59) |
| `windows.scanCodeMissing` | error | a position with bindings has no `scanCode` |
| `windows.scanCodeUnsupported` | error | a scan code Windows tables cannot hold (an `E1` scan code other than `E11D`) |
| `windows.sideModifierWidened` | warning | a layer for `ctrlL`/`ctrlR`/`altL` (or `altR` without AltGr) also answers the other side on Windows |
| `windows.altGrConflict` | error | with AltGr, `altR` and Ctrl+Alt states need different outputs in one column |
| `windows.altOnlyLayer` | warning | a layer is reached only with Alt and without Ctrl: Windows never reaches it |
| `windows.tooManyColumns` | error | more than 15 shift-state columns are needed |
| `windows.modifierUnmapped` | error | a custom modifier has no Windows bit or no usable virtual key |
| `windows.lockUnmapped` | error | a custom lock other than the pinned Kana lock |
| `windows.capsNotExpressible` | error | the Caps Lock outputs of a key cannot be expressed by CAPLOK, SGCAPS or CAPLOKALTGR |
| `windows.capsUnmatched` | warning | in some column the file gives nothing with Caps Lock on (no fallback) where it gives something without; Windows types the output without Caps Lock (one entry per build, D40) |
| `windows.kanaLockNotExpressible` | error | Kana-lock outputs of a key are neither those of the Kana layer nor of the base (KANALOK) |
| `windows.ctrlLetterFallback` | accept | Windows types control characters U+0001–U+001A for Ctrl+letter keys that the file leaves without output |
| `windows.unreachableState` | warning | a layer serves only states that Windows maps to no column (for example states above `wMaxModBits`) |
| `windows.sgcapsDeadKey` | error | a key is SGCAPS and dead in a shape Windows cannot express (reference `dll-format` §4.2) |
| `windows.sgcapsLigature` | error | an SGCAPS Caps Lock output needs more than one unit |
| `windows.outputUnencodable` | error | an output Windows cannot emit from a key (U+F000 alone; an empty CodeUnits) |
| `windows.sharedVkRowConflict` | warning | two positions with the same VK (Enter and number-pad Enter) need different cells; Windows has one row per VK, the position with the lower scan code wins |
| `windows.deadKeyFirstUnitComposes` | warning | a pending dead key meets a multi-unit output that has no entry of its own while an entry exists for its first unit: Windows composes the first unit (wb §6.2), the file says `noMatch` |
| `windows.ligatureTooLong` | error | an output of more than 125 units |
| `windows.ligatureTruncatedTyped` | warning | an output of 17 to 125 units: `ToUnicodeEx` returns it, typing delivers only the first 16 units |
| `windows.markerNotCompiled` | warning | a binding emits a marker that is not a recognised dead-key pattern |
| `windows.transformNotCompiled` | warning | a transform, reorder or backspace transform that is not compiled into dead keys |
| `windows.deadCharacterInvalid` | error | a dead character is not exactly one unit |
| `windows.deadCharacterCollision` | error | two dead keys get the same dead character |
| `windows.deadKeyBaseUnencodable` | error | an entry's base is not one unit and not a multi-unit output whose first unit can carry it (`targets/windows.md` §6) |
| `windows.deadKeyResultUnencodable` | error | an entry's result cannot be encoded (`targets/windows.md` §6) |
| `windows.deadKeyNoMatchExpanded` | accept | `noMatch: emitText` was compiled by adding an entry per reachable character |
| `windows.deadKeyNoMatchNotExpressible` | error | `noMatch` `emitSpacing` or `emitNothing`, or `emitText` for inputs that cannot be enumerated |
| `windows.bidiMarksConflict` | warning | `bidiMarksOnShiftBackspace` hides other Shift+Backspace outputs |
| `windows.numpadShiftUnreachable` | warning | a `numLock` position has outputs in Shift layers; Windows turns Shift+number-pad into navigation |
| `windows.frameKeyWithoutText` | warning | Enter, Backspace, Tab or Escape has no base-layer text; many applications need the character |
| `windows.nlsNotCompiled` | warning | `targets.windows.nls` is carried but not built |
| `windows.dispatcherNotCompiled` | warning | `targets.windows.dispatcher` is carried but not built |
| `windows.architectureUnsupported` | error | the file lists a build in `targets.windows.builds` that the tool cannot make yet (`arm64x` for a tool whose ARM64X writer has not passed the test of `targets/windows.md` §2.1, D44; yakbd's has, D66). Defaulted builds the tool cannot make are skipped and listed in `windowsDefault.builds` (D39) |
| `windows.registrationInvalid` | error | `registration` values that cannot work: a `klid` whose low word is not `langId`, a `layoutId` of `0000` or above `0FFF`, a `langId` of `1000`, `1400` or a transient LANGID; `install.enableForSignInAndNewUsers` `true` with `langId` `0C00` (`targets/windows-install.md` §2) |
| `windows.installerMachinesMissing` | warning | an installer lacks the builds for some machine kind (x86, x64, ARM64) and will refuse to install there (`targets/windows-install.md` §3); one entry per installer listing the machine kinds |
| `windows.wow64Missing` | warning | `builds` has `x64` or `arm64x` without `wow64`: 32-bit programs on 64-bit Windows cannot load the layout (reference `installation` §2.1) |
| `windows.pinOverridesModel` | warning | a pinned value makes the Windows layout behave differently from the general data (for example pinned `attributes` that contradict the Caps Lock layers); the pin wins |
| `windows.langIdMissing` | error | no LANGID for registration or strings, and none can be derived (Q2) |
| `windows.stringLanguageUnmapped` | warning | a localised name whose language has no LANGID |
| `windows.versionUnrepresentable` | warning | `metadata.version` does not fit four 16-bit numbers |
| `windows.sizeLimit` | **fatal** | the DLL would exceed 262,144 bytes |
| `klc.nameTooLong` | error | DLL name or description beyond the `.klc` limits (8 / 255) |
| `klc.notRepresentable` | error | a Windows table feature a `.klc` cannot write (scan-code flags other than the defaults, `modNumber` with several states in one column, `extraRows`, keyboard type, version word, ligature beyond 5 units, a one-unit output that is a lone surrogate half (D79), `tables` order, `useTableA: false` when it changes the tables, a Ctrl+Alt column without `localeFlags.altGr`, which MSKLC always gives `KLLF_ALTGR`, D93) |
| `klc.editorDropped` | warning | with `msklcEditorCompatible`: something the MSKLC editor would drop or refuse (chained dead keys, E0 scan codes, 5-unit ligatures, keywords in texts) |
| `klc.impliedRows` | accept | the `.klc` importer wrote the rows MSKLC adds to every layout (D36), or the exporter left them out because they equal those rows, or the exported file gains them: a cell the source leaves empty in a state the `.klc` declares (states 0, 1 and 2 always, D78) is one MSKLC fills, so the `.klc` types more than the source (one entry per export, the cells in `detail`) |
| `dll.malformed` | **fatal** | the input is not a readable layout DLL: not a PE file, no `KbdLayerDescriptor`, a descriptor function of no shape of reference `dll-format` §1.4, a pointer, count or size outside the file or beyond the limits of `dll-format` §1.2 and §4, a loop, a dead-key cell without its following row (`coverage/windows.md` §11) |
| `dll.architectureUnsupported` | error | a Machine the importer does not read (IA64, ARM32; `coverage/windows.md` §11 item 1) |
| `dll.containerIgnored` | accept | PE details that are the writer's choices and not layout data (header values, sections, alignment, padding, time stamp, linker version, debug data, relocations, signature, the shape of the descriptor function) are not kept |
| `dll.resourceDropped` | warning | a resource that cannot be read (skipped, the layout is still imported), resources other than the strings 1000, 1100, 1200 and the version resource, and version-resource fields without a home in `versionInfo` (product name, internal and original file name, comments, trademarks, further translations) |
| `dll.keyboardTypeNotTrusted` | accept | `dwType` / `dwSubType` were read and not kept (reference `dll-format` §3: not to be trusted in a file one did not write); kept in `keyboardType` only when the importer is told to |
| `dll.unreachableColumn` | warning | a column of the character tables that no bit combination selects (`ModNumber`); its cells are dropped |
| `dll.duplicateRow` | warning | a second character row for a VK that already has one; only the first is kept (a file holds one row per VK, D27) |
| `dll.ligatureMismatch` | warning | a `WCH_LGTR` cell without a ligature entry (imported as no output), or a ligature entry no cell refers to (dropped) |
| `dll.unknownFlags` | warning | bits outside the defined sets: scan-code flag bits other than the eight of SPEC §16.1, row attribute bits other than the five, locale-flag bits other than the three; dropped |
| `dll.unreachableData` | warning | data the importer drops because Windows never reaches it or the format has no place for it (stray FF rows, empty tables, dead-row cells outside dead columns, second DEADKEY pairs, second E0/E1 entries, second or empty key names, cells beyond column 15; `coverage/windows.md` §11 item 4) |
| `dll.unusualShape` | warning | a shape other writers do not produce, imported as if well formed: a dead-character row whose VK is not `FF`, an SGCAPS row at the end of a table |
| `dll.modifierDropped` | error | a `VK_TO_BIT` entry with several bits, which no custom component can express (one bit each); dropped, so the rebuilt layout types differently with that key held |
| `dll.capsCellUnexpressed` | warning | a Caps Lock cell the layers cannot say: a `CAPLOK` / `CAPLOKALTGR` key with one partner column empty, Caps Lock cells beyond column 1, the Caps Lock row of an extra row (`coverage/windows.md` §11 item 5; an SGCAPS `WCH_NONE` cell is the explicit nothing, D64) |
| `dll.nlsUnreadable` | warning | export 2 (`KbdNlsLayerDescriptor`) points at a table that cannot be read; it is dropped, the layout is imported |
| `dll.dispatcherNotRead` | warning | the DLL has dispatcher exports (3, 5, 6), which are code; nothing is carried into `targets.windows.dispatcher` |
| `dll.registrationMissing` | warning | registration data that no DLL contains and the importer was not given: `langId`, and always `klid`, `layoutId`, `layoutText`, `productCode`, the custom-language values; one entry listing them |
| `cldr.customModifierDropped` | error | a custom modifier or lock, which CLDR cannot express |
| `cldr.capsFallbackExpanded` | accept | `capsLockFallback` was expressed by writing Caps Lock layers explicitly |
| `cldr.windowsOnlyDropped` | warning | Windows-only data (`settings.capsLockOffBy` `shift`, `bidiMarksOnShiftBackspace`, CodeUnits outputs, `targets.windows`) not representable in CLDR elements; carried in `<special>` when `carryInSpecial` |
| `cldr.positionNotInForm` | error | a bound position has no place in the hardware form's rows |
| `cldr.customForm` | warning | the form is not one of CLDR's implied forms (CLDR's repository refuses such files) |
| `cldr.keyIdGenerated` | accept | key ids were invented for bindings that had none |

A tool MUST NOT invent kinds outside this list for its version; a loss that fits none is reported as the closest kind with
an explanatory `message`, and the gap is a defect of this specification. The kinds of the families `macos` and
`xkb` (0.2) are added as their targets are written, each family as one block of rows at the end of the table; a
0.1 file cannot name them, and the 0.1 schema does not accept them (§1.1).

## 18. Extensions and CLDR `special`

- `extensions`: object whose property names are absolute URIs or reverse-DNS names owned by the writer
  (`org.example.mytool`), each with any JSON value. Readers keep it on round trips through `.kbl.json`; other
  outputs report `general.extensionDropped`.
- `cldrSpecial`: an array of strings, each the complete XML text of one CLDR `<special>` element, kept in document
  order at the object that corresponds to the element's parent: the root (`keyboard3`), `displays`, `forms` and each
  Form, `hardware` and each TouchLayerSet (`layers`), each layer, each Flick, each Group (`transformGroup`),
  `transforms.cldrSpecial.simple` / `.backspace` (`transforms`), each TestFile, Suite and Test. The `special`
  children of `keys`, `flicks`, `forms` and `variables`, which have no object of their own here, are kept in the root
  `cldrSpecial`, each string beginning with the XML comment `<!--kbl:parent=keys-->` (or `flicks`, `forms`, `variables`). The
  CLDR writer puts every one back in place; other outputs report `general.extensionDropped`.

## 19. Validation rules beyond the schema

A validator MUST check, and report with the kinds given:

1. every reference resolves (`general.unresolvedReference`): `{"key"}`, `{"deadKey"}`, `layerId`, `flickId`,
   `longPress*`, `multiTapKeyIds`, `displays.entries[].keyId`, forms' and bindings' PositionIds, components in
   modifier sets, `{"variable"}` items, `hardware.formId`, `targets.windows.keys`/`tables`/`deadKeys` keys;
2. no layer overlap (§7.3) (`general.layerOverlap`) and no modifier set mixing `ctrl` with `ctrlL`/`ctrlR`, `alt`
   with `altL`/`altR`, left with right, or `none`/`other` with anything (`general.modifierSetInvalid`);
3. unique `scanCode`s (`general.duplicateScanCode`), unique variable ids (`general.duplicateVariableId`),
   `longPressDefaultKeyId` inside `longPressKeyIds` (`general.longPressDefaultInvalid`), a key not in its own
   `multiTapKeyIds` (`general.multiTapSelf`);
4. no binding on a position that operates a modifier (`general.bindingOnModifier`);
5. a touch set has a layer `base` (`general.touchBaseMissing`);
6. a CodeUnits value that is a valid sequence of whole characters should be a Text (`general.codeUnitsAreText`).

---

## Appendix A. Position names and scan codes (informative)

Position names are W3C UI Events `code` values. Scan codes are the "Scan 1 Make" codes of Microsoft's "About
Keyboard Input" page (see `NOTICE`). Importers use this table to turn CLDR scan codes into positions; writers to fill
`scanCode`. A file always states its own `scanCode`s; this table is never consulted at build time. The Windows target's
default table `targets/windows-default-vk.tsv` lists further positions (media keys, `SysRq`, `Break`) with the same
names and scan codes. The position tables of the other targets (§16) use the same names.

| position | scan | position | scan | position | scan | position | scan |
|---|---|---|---|---|---|---|---|
| Escape | 01 | Digit1 | 02 | Digit2 | 03 | Digit3 | 04 |
| Digit4 | 05 | Digit5 | 06 | Digit6 | 07 | Digit7 | 08 |
| Digit8 | 09 | Digit9 | 0A | Digit0 | 0B | Minus | 0C |
| Equal | 0D | Backspace | 0E | Tab | 0F | KeyQ | 10 |
| KeyW | 11 | KeyE | 12 | KeyR | 13 | KeyT | 14 |
| KeyY | 15 | KeyU | 16 | KeyI | 17 | KeyO | 18 |
| KeyP | 19 | BracketLeft | 1A | BracketRight | 1B | Enter | 1C |
| ControlLeft | 1D | KeyA | 1E | KeyS | 1F | KeyD | 20 |
| KeyF | 21 | KeyG | 22 | KeyH | 23 | KeyJ | 24 |
| KeyK | 25 | KeyL | 26 | Semicolon | 27 | Quote | 28 |
| Backquote | 29 | ShiftLeft | 2A | Backslash | 2B | KeyZ | 2C |
| KeyX | 2D | KeyC | 2E | KeyV | 2F | KeyB | 30 |
| KeyN | 31 | KeyM | 32 | Comma | 33 | Period | 34 |
| Slash | 35 | ShiftRight | 36 | NumpadMultiply | 37 | AltLeft | 38 |
| Space | 39 | CapsLock | 3A | F1 | 3B | F2 | 3C |
| F3 | 3D | F4 | 3E | F5 | 3F | F6 | 40 |
| F7 | 41 | F8 | 42 | F9 | 43 | F10 | 44 |
| NumLock | 45 | ScrollLock | 46 | Numpad7 | 47 | Numpad8 | 48 |
| Numpad9 | 49 | NumpadSubtract | 4A | Numpad4 | 4B | Numpad5 | 4C |
| Numpad6 | 4D | NumpadAdd | 4E | Numpad1 | 4F | Numpad2 | 50 |
| Numpad3 | 51 | Numpad0 | 52 | NumpadDecimal | 53 | IntlBackslash | 56 |
| F11 | 57 | F12 | 58 | NumpadEqual | 59 | F13 | 64 |
| F14 | 65 | F15 | 66 | F16 | 67 | F17 | 68 |
| F18 | 69 | F19 | 6A | F20 | 6B | F21 | 6C |
| F22 | 6D | F23 | 6E | KanaMode | 70 | IntlRo | 73 |
| F24 | 76 | Convert | 79 | NonConvert | 7B | IntlYen | 7D |
| NumpadComma | 7E | NumpadEnter | E01C | ControlRight | E01D | NumpadDivide | E035 |
| PrintScreen | E037 | AltRight | E038 | Home | E047 | ArrowUp | E048 |
| PageUp | E049 | ArrowLeft | E04B | ArrowRight | E04D | End | E04F |
| ArrowDown | E050 | PageDown | E051 | Insert | E052 | Delete | E053 |
| MetaLeft | E05B | MetaRight | E05C | ContextMenu | E05D | Pause | E11D |

`Backslash` (2B) is also the key left of Enter on ISO keyboards (CLDR forms `iso`, `abnt2`, `jis`). Pause sends
`E1 1D 45`; Windows looks up `E1 1D` (reference `windows-behaviour` §3.1), hence `E11D`.

CLDR's implied forms, translated (rows top to bottom):

| form | row 1 | row 2 | row 3 | row 4 | row 5 |
|---|---|---|---|---|---|
| `us` | Backquote Digit1…Digit0 Minus Equal | KeyQ…KeyP BracketLeft BracketRight Backslash | KeyA…KeyL Semicolon Quote | KeyZ…KeyM Comma Period Slash | Space |
| `iso` | as `us` | KeyQ…KeyP BracketLeft BracketRight | KeyA…KeyL Semicolon Quote Backslash | IntlBackslash KeyZ…KeyM Comma Period Slash | Space |
| `abnt2` | as `us` | as `iso` | as `iso` | IntlBackslash KeyZ…KeyM Comma Period Slash IntlRo | Space |
| `jis` | as `us`, then IntlYen | as `iso` | as `iso` | KeyZ…KeyM Comma Period Slash IntlRo | Space |
| `ks` | as `us`, then Backslash | as `iso` | KeyA…KeyL Semicolon Quote | as `us` | Space |

("KeyQ…KeyP" is the letter row in QWERTY order: KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP; likewise
KeyA…KeyL and KeyZ…KeyM.)
