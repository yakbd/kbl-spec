# Coverage: Unicode CLDR Keyboard 3.0 → `.kbl.json`

Every element and attribute of CLDR Keyboard 3.0, of CLDR's keyboard test format, and of the hardware forms and
scan codes CLDR publishes, with what it means (in our words) and its home in `.kbl.json`. Paths are JSON paths into a
`.kbl.json` file; "§" refers to `SPEC.md`.

## 1. Sources

CLDR release **49** (tag `release-49`, published 2026-10-21), the latest release on 2026-11-22.

| file | URL |
|---|---|
| keyboard DTD | https://github.com/unicode-org/cldr/blob/release-49/keyboards/dtd/ldmlKeyboard3.dtd |
| keyboard XSD | https://github.com/unicode-org/cldr/blob/release-49/keyboards/dtd/ldmlKeyboard3.xsd |
| test DTD | https://github.com/unicode-org/cldr/blob/release-49/keyboards/dtd/ldmlKeyboardTest3.dtd |
| test XSD | https://github.com/unicode-org/cldr/blob/release-49/keyboards/dtd/ldmlKeyboardTest3.xsd |
| implied forms (scan codes) | https://github.com/unicode-org/cldr/blob/release-49/keyboards/import/scanCodes-implied.xml |
| implied keys | https://github.com/unicode-org/cldr/blob/release-49/keyboards/import/keys-Latn-implied.xml |
| shared keys | https://github.com/unicode-org/cldr/blob/release-49/keyboards/import/keys-Zyyy-punctuation.xml , `keys-Zyyy-currency.xml` |
| transform grammar | https://github.com/unicode-org/cldr/tree/release-49/keyboards/abnf |
| specification | UTS #35 Part 7, https://www.unicode.org/reports/tr35/tr35-keyboards.html (source at the tag: `docs/ldml/tr35-keyboards.md`) |

The row list below was generated from every `<!ELEMENT>` and `<!ATTLIST>` line of both DTDs and checked against the
element and attribute names of both XSDs (they agree; the XSDs add no name). Items that live only in the prose of
the specification follow in §3.

## 2. Elements and attributes

### 2.1 Keyboard file (`ldmlKeyboard3.dtd`)

| element / attribute | meaning | home in `.kbl.json` |
|---|---|---|
| `keyboard3` | root element of a keyboard | the file's root object |
| `keyboard3/@locale` | BCP 47 id of the keyboard, primary language first | `metadata.id`; `targets.cldr.locale` if a CLDR export must differ |
| `keyboard3/@conformsTo` | lowest CLDR version (45–49) needed to read the file | `metadata.provenance.cldrConformsTo` (read); `targets.cldr.conformsTo` (write) |
| `keyboard3/@xmlns` | CLDR keyboard namespace URI | implied by `conformsTo`; the writer emits `https://schemas.unicode.org/cldr/<n>/keyboard3`. A different value read is kept in `metadata.provenance.notes` |
| `keyboard3/@draft` | approval status of the whole file | `metadata.draft` |
| `import` | pulls elements from a CLDR or local file into the parent | inlined by the importer (self-containment, D2); the paths in `metadata.provenance.cldrImports`; report `general.importInlined` |
| `import/@path` | the imported file (CLDR version prefix when `base="cldr"`) | `metadata.provenance.cldrImports[]` |
| `import/@base` | `cldr` or absent (local) | `metadata.provenance.cldrImports[]` holds `cldr:` + path for CLDR imports, the bare path for local ones |
| `locales` | container of further locales | `metadata.locales` |
| `locale` | one further supported language | an item of `metadata.locales` |
| `locale/@id` | its BCP 47 id | the item's value |
| `version` | version of the layout data | `metadata.version` |
| `version/@number` | Semantic Version | `metadata.version` |
| `version/@cldrVersion` | fixed by the DTD (49), not written in files | not stored; derived from `targets.cldr.conformsTo` on export |
| `info` | descriptive properties | `metadata` |
| `info/@name` | the keyboard's name | `metadata.name` |
| `info/@author` | author of the file | `metadata.authors[0].name` (more authors: export joins them, `general.metadataDropped` for e-mail/URL) |
| `info/@layout` | layout pattern (QWERTY, …) | `metadata.layoutPattern` |
| `info/@indicator` | short switcher label | `metadata.indicator` |
| `info/@attribution` | originating entity | `metadata.attribution` |
| `settings` | layout settings | `settings` |
| `settings/@normalization` | `disabled` turns normalisation off | `settings.normalization` (`disabled`; absent = `enabled`) |
| `displays` | key-cap display data | `displays` |
| `display` | one key-cap rule | an item of `displays.entries` |
| `display/@output` | output whose keys get this cap (may hold markers, variables, `\u{}`) | `displays.entries[].output` (MarkedText: escapes decoded, `\m{x}` → `{"marker": "x"}`, `${v}` → `{"variable": "v"}`) |
| `display/@keyId` | key that gets this cap | `displays.entries[].keyId` |
| `display/@display` | the text to show | `displays.entries[].display` (MarkedText) |
| `displayOptions` | display options | `displays.baseCharacter` |
| `displayOptions/@baseCharacter` | base for combining marks instead of U+25CC | `displays.baseCharacter` |
| `special` | extension content, any XML | `cldrSpecial` at the parent's object (§18 of SPEC) |
| `keys` | bag of key definitions | `keys` (object KeyId → Key) |
| `key` | one key: output plus gestures | `keys.<id>` |
| `key/@id` | its id | the property name in `keys` |
| `key/@flickId` | its flicks | `keys.<id>.flickId` |
| `key/@gap` | empty space | `keys.<id>.gap` |
| `key/@output` | emitted text (escapes, markers, variables) | `keys.<id>.output` (MarkedText). An output that is only a marker used as a dead key may instead become `keys.<id>.deadKey` (§3.6) |
| `key/@longPressKeyIds` | long-press choices | `keys.<id>.longPressKeyIds` (array) |
| `key/@longPressDefaultKeyId` | default long-press choice | `keys.<id>.longPressDefaultKeyId` |
| `key/@multiTapKeyIds` | multi-tap sequence | `keys.<id>.multiTapKeyIds` (array) |
| `key/@stretch` | may stretch in a touch row | `keys.<id>.stretch` |
| `key/@layerId` | switches to that touch layer | `keys.<id>.layerId` |
| `key/@width` | width in key units | `keys.<id>.width` |
| `flicks` | container of flicks | `flicks` |
| `flick` | one set of flick gestures | `flicks.<id>` |
| `flick/@id` | its id | the property name in `flicks` |
| `flickSegment` | one flick path and its result | an item of `flicks.<id>.segments` |
| `flickSegment/@directions` | path of compass directions | `segments[].directions` (array) |
| `flickSegment/@keyId` | the resulting key | `segments[].keyId` |
| `forms` | container of hardware forms | `forms` |
| `form` | one hardware arrangement | `forms.<id>` |
| `form/@id` | its id | the property name in `forms` |
| `scanCodes` | one row of the form, as scan codes | an item of `forms.<id>.rows`: each scan code becomes the PositionId whose `positions.<p>.scanCode` it is (Appendix A names; unknown codes get `sc<hex>` ids) |
| `scanCodes/@codes` | the scan codes of the row (hex bytes) | `positions.<p>.scanCode` of each position in the row |
| `layers` | one layer set for a form (hardware) or `touch` | `formId="touch"`: an item of `touch`; otherwise `hardware` |
| `layers/@formId` | form id or `touch` | `hardware.formId`; `touch` is implied by the `touch` array |
| `layers/@minDeviceWidth` | minimum device width in mm | `hardware.minDeviceWidth` / `touch[].minDeviceWidth` |
| `layer` | one layer | `hardware.layers[]` or `touch[].layers[]` |
| `layer/@id` | layer id (required for touch) | `…layers[].id` |
| `layer/@modifiers` | comma-separated modifier sets | `…layers[].modifiers`: array of sets, each an array of components; `none` → `[]`, `other` → `["other"]` |
| `row` | one row of a layer | hardware: the row's keys are put on the form row's positions in order → `hardware.layers[].bindings`; touch: an item of `touch[].layers[].rows` |
| `row/@keys` | key ids of the row | hardware: binding of position *i* of the form row = key *i* (a `gap` key → no binding; an implied key other than `gap` → Text binding; any other key → `{"key": id}`, which keeps the key id for tests, displays and a lossless round trip); touch: the array of KeyIds |
| `variables` | container of variables | `variables` (array, document order) |
| `string` | string variable | `{"type": "string", …}` item |
| `string/@id`, `string/@value` | id and value | `variables[].id`, `variables[].value` (Pattern, verbatim) |
| `set` | list-of-strings variable | `{"type": "set", …}` item |
| `set/@id`, `set/@value` | id and value | `variables[].id`, `.value` |
| `uset` | UnicodeSet variable | `{"type": "uset", …}` item |
| `uset/@id`, `uset/@value` | id and value | `variables[].id`, `.value` |
| `transforms` | transforms of one type | `transforms.simple` or `transforms.backspace` |
| `transforms/@type` | `simple` or `backspace` | the property name |
| `transformGroup` | a group, processed as a unit | an item of the array (Group) |
| `transform` | one rule | an item of `Group.transforms` |
| `transform/@from` | match pattern | `.from` (Pattern, verbatim) |
| `transform/@to` | replacement (absent = delete) | `.to` (absent = delete) |
| `reorder` | one reordering rule | an item of `Group.reorders` |
| `reorder/@from` | characters matched | `.from` |
| `reorder/@before` | required preceding context | `.before` |
| `reorder/@order` | primary weights | `.order` (integer, or array for a space-separated list) |
| `reorder/@tertiary` | tertiary weights | `.tertiary` |
| `reorder/@tertiaryBase` | may carry tertiary characters | `.tertiaryBase` (boolean or array) |
| `reorder/@preBase` | typed before the base | `.preBase` (boolean or array) |

### 2.2 Test file (`ldmlKeyboardTest3.dtd`, technical preview)

| element / attribute | meaning | home in `.kbl.json` |
|---|---|---|
| `keyboardTest3` | root of a test file | an item of `tests` (TestFile) |
| `keyboardTest3/@conformsTo` | fixed `techpreview` | implied; written back as `techpreview` |
| `info` | test file description | `tests[].info` |
| `info/@keyboard` | file name of the tested keyboard | `tests[].info.keyboard` |
| `info/@author` | author | `tests[].info.author` |
| `info/@name` | test file name | `tests[].info.name` |
| `repertoire` | characters that must be typeable | an item of `tests[].repertoires` |
| `repertoire/@chars` | the characters, UnicodeSet (with `\uXXXX`) | `.chars` (verbatim) |
| `repertoire/@type` | how they must be typeable | `.type` |
| `repertoire/@name` | name | `.name` |
| `tests` | a suite | an item of `tests[].suites` |
| `tests/@name` | suite name | `.name` |
| `test` | one test | an item of `suites[].tests` |
| `test/@name` | test name | `.name` |
| `startContext` | text before the insertion point | `tests[…].startContext` |
| `startContext/@to` | the text (with `\u{}`) | `.startContext` (Text, escapes decoded) |
| `keystroke` | press a key, optionally with a gesture | step `{"keystroke": {"key": …}}` |
| `keystroke/@key` | the key id | `keystroke.key` |
| `keystroke/@flick` | flick path | `keystroke.flick` (array) |
| `keystroke/@longPress` | long-press choice (0 = default) | `keystroke.longPress` (integer) |
| `keystroke/@tapCount` | number of taps | `keystroke.tapCount` (integer) |
| `emit` | input text directly | step `{"emit": text}` |
| `emit/@to` | the text | the step's value |
| `backspace` | press backspace | step `{"backspace": true}` |
| `check` | check the context | step `{"check": text}` |
| `check/@result` | expected text | the step's value |
| `special` | extension content | `cldrSpecial` of the TestFile, Suite or Test |

The test format is the basis of the format's own test vectors; `.kbl.json` adds hardware keystrokes
(`{"keystroke": {"position", "modifiers", "locks"}}`) so that Windows-derived files without CLDR key ids can carry
tests too (SPEC §15).

## 3. Items that live in the specification text

| item | meaning | home in `.kbl.json` |
|---|---|---|
| modifier components `none`, `alt`, `altL`, `altR`, `caps`, `ctrl`, `ctrlL`, `ctrlR`, `shift`, `other` | the vocabulary of `layer/@modifiers` and its matching rules (exact match, no overlap, `other` last, left/right rules) | SPEC §7.1, §7.3 (same names, same rules); `none` = `[]` |
| unmatched modifier state | no output when no layer and no `other` matches | SPEC §9.3 (`settings.capsLockFallback` `false` gives exactly CLDR's rule; importers set it, D11) |
| implied keys `0`–`9`, `A`–`Z`, `a`–`z`, `space`, `gap` | keys every file has without defining them | SPEC §8 "Implied keys" (the same rule, stated by the spec; no import) |
| implied forms `us`, `iso`, `abnt2`, `jis`, `ks` and `touch` | the standard hardware forms and the touch pseudo-form | `forms.<id>` inlined from SPEC Appendix A; `touch` is the `touch` array |
| scan codes (`scanCodes-implied.xml`) | the set-1 scan codes of the non-frame keys of each form, row by row | `positions.<p>.scanCode`; the translation table is SPEC Appendix A |
| frame keys | Shift, Enter, Backspace and other keys outside the form rows, which CLDR does not list | `positions` may list them (with scan codes and names); bindings may give them outputs |
| escapes `\u{…}` in outputs, displays, transforms, variables | code point escapes | outputs and displays: decoded into JSON Text; Patterns and variable values: kept verbatim |
| UnicodeSet escapes in `transform`/`reorder` `from`/`before` and test `chars` | UnicodeSet syntax | verbatim in Patterns / `chars` |
| markers `\m{id}`, `\m{.}` | invisible context items, the CLDR dead-key mechanism | outputs: `{"marker": id}` items of MarkedText; Patterns: verbatim; or converted to `deadKeys` (§3.6) |
| normalisation (NFC output, NFD matching, markers glued to characters) | how text is normalised | `settings.normalization` and SPEC §13.3 (CLDR's rules apply unchanged) |
| default backspace transform | delete one character and adjacent markers when no backspace transform matches | SPEC §13.2, §14.3 |
| `transformGroup` processing order, first match per group | transform semantics | SPEC §13.2 (CLDR's) |
| reorder algorithm, mapped sets `$[1:var]` | CLDR transform features | kept verbatim in Patterns; semantics CLDR's |
| `draft` values | approval states | `metadata.draft` |
| keyboard ids (`-t-k0-` subtags) | naming principles | `metadata.id` (unchanged) |
| platform behaviours in edge cases (informative table) | what platforms do on unmatched states, keys and transforms | SPEC §9.3, §14.2 (`noMatch`) state the behaviour explicitly per file |
| `special` at every level | extensibility | `cldrSpecial` (SPEC §18) |

### 3.6 Markers as dead keys (importer rule)

A CLDR keyboard writes a dead key as a key whose output is a marker plus `simple` transforms `\m{m}X → Y`. An
importer MAY convert it to a `deadKeys` entry when **all** of these hold, and otherwise keeps the marker and the
transforms unchanged (both are full members of the format):

1. the marker `m` occurs in key outputs only as the whole output of keys (no other text);
2. every transform whose `from` mentions `\m{m}` is in one group and has one of these forms (D88):
   - `\m{m}` followed by literal text (a Text with no pattern syntax), with a literal `to` without markers,
     variables or `$` references;
   - `\m{m}($[v])` (one capture of one set variable), with `to` = `$1` followed by literal text, or `to` = a mapped
     set `$[1:w]` (`v` and `w` of the same length, as CLDR requires);
3. no other transform, reorder or backspace transform mentions `\m{m}` or `\m{.}`, except a transform `\m{.}(.)` →
   `$1` or `\m{.}` → nothing in a later group: that is what `noMatch` `emitText` says, so it is left in the file
   and does not block the conversion (D95).

A set form is expanded into one (member, result) pair per member of `v` in set order (set variables inside `v`
expanded in place): `$1` + literal gives member + literal, `$[1:w]` the member of `w` at the same index. The dead key
gets id `m`, `entries` = the (literal, to) pairs in transform order, a pair whose literal an earlier pair already has
left out (CLDR takes the first transform that matches, so it could never match), `spacing` = the `display` of `\m{m}` when the
file has one, else the marker id; `noMatch` = `emitText` (a CLDR marker that matches nothing disappears and leaves
only the next key's text, D12); keys with output `\m{m}` become `{"deadKey": "m"}`. The CLDR writer does the
reverse: `deadKey` → key output `\m{id}`, `entries` → one group of transforms, and for `noMatch` `emitBoth` an extra
transform `\m{id}(.)` → spacing + `$1` at the end of that group (`emitSpacing`: → spacing; `emitNothing`: → nothing).

The CLDR writer writes expanded entries back as literal transforms, so a CLDR → `.kbl.json` → CLDR trip gives an
equivalent file, not the same text; `.kbl.json` → CLDR → `.kbl.json` is exact. Results are not normalised by the
importer: the build's NFC step (SPEC §13.3, D72, D73) turns `e\u{301}` into `é` and reports
`general.outputNormalized`; a result with no one-unit form stays a Windows dead-key loss as for any entry.

### 3.7 Running a CLDR test file on a hardware target (D92)

- A keystroke `{"key": k}` presses one position that binds `k` in a hardware layer the target can type, with that
  layer's modifier set held: the first such layer in `hardware.layers` order, its first modifier set, and the first
  such position in PositionId order (code-unit order of the ids; JSON object order is not kept, D95). Any other binding position gives the same text by definition, so a runner
  that picks another is not wrong; this choice makes runs comparable. A key bound on no typeable hardware layer
  makes the test not runnable on that target (skipped and listed, not failed).
- `startContext` is text already before the insertion point. A runner either places it there (pasted, not typed) or,
  on a target whose typing never reads the existing text (Windows: no transform runs, a dead key looks only at the
  next key), types into an empty field and compares only what follows the context; the two are the same there.
- `emit` inserts its text as text, not as keystrokes. `backspace` presses the target's Backspace key.
- `check` compares the text before the insertion point: with `settings.normalization` `enabled`, both sides in
  NFC (CLDR's output is NFC; Windows does not normalise across keys, D73), else code unit by code unit.
- A test whose steps need something the target cannot express (a transform or marker the build reports as not
  compiled, a gesture) is skipped and listed with the loss kind that explains it, never counted as passed.

## 4. Writing CLDR from `.kbl.json`

What CLDR elements cannot hold is written, when `targets.cldr.carryInSpecial` is true, into one root-level
`<special>` element in the namespace `https://yakbd.github.io/kbl-spec/ns/0.1` with the JSON of the properties
concerned (`settings.capsLockOffBy`, `settings.bidiMarksOnShiftBackspace`, `customModifiers` and the layers that use
them, CodeUnits bindings, `positions` names and `numLock`, `metadata` fields beyond `info`, `targets`,
`extensions`); a reader of `.kbl.json`-written CLDR files restores them. Report kinds: `cldr.windowsOnlyDropped`,
`cldr.customModifierDropped` (the layers themselves cannot be written as CLDR layers), `cldr.capsFallbackExpanded`,
`cldr.positionNotInForm`, `cldr.customForm`, `cldr.keyIdGenerated`, `general.metadataDropped`.
