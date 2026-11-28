# Coverage: Linux XKB symbols and Compose files → `.kbl.json`

Every part of an XKB symbols file, the key types it uses, the registry entry and rules that install it, and the
Compose file of its dead keys, with its home in `.kbl.json` or the loss kind that reports it. §2 to §5 are what an
importer reads; the build direction is `targets/xkb.md`. Sources are cited as there ([LXC], [XKC], [LNX], [LAB]).

## 1. Sources

- libxkbcommon's text-format pages (`doc/keymap-text-format-v1-v2.md`, `doc/compatibility.md`,
  `doc/rules-format.md`, `doc/custom-configuration.md`, `doc/packaging-keyboard-layouts.md`,
  `doc/keysym-encoding.md`), its Compose API header and Compose file lookup (`src/compose/paths.c`), and its
  character-to-keysym function (`src/keysym-utf.c`): every construct below.
- xkeyboard-config's `types/`, `keycodes/evdev`, `keycodes/aliases`, `symbols/pc`, `symbols/level3`,
  `symbols/level5`, `symbols/keypad`: the stock types, key names and level shifts.
- xorgproto's `keysymdef.h` (release 2026.1): keysym names and their code points.
- Every source with its version and licence: `CLEAN-ROOM.md`, "Linux (XKB) sources". No distribution's own layout
  was copied; xkeyboard-config's symbols files are a permitted corpus for import tests (`CLEAN-ROOM.md`).

## 2. Symbols

| construct | `.kbl.json` | notes |
|---|---|---|
| comments, white space, line breaks | — | `xkb.syntaxDetailsIgnored` |
| section flags (`default`, `partial`, `hidden`, `alphanumeric_keys`, `modifier_keys`, `keypad_keys`, `function_keys`, `alternate_group`) | — | `default` decides which section is read when none is named (§6); the rest `xkb.syntaxDetailsIgnored` |
| `xkb_symbols "<section>"` | the file; `targets.xkb.variant` | one section is imported per `.kbl.json` file; the file name is `targets.xkb.symbolsName` |
| `name[GroupN] = "…"` | `metadata.name` and `targets.xkb.description` | group 1 only; other groups `xkb.groupDropped` |
| `include "file(section)"`, `augment`, `override`, `replace`, merge modes `+` and `\|` in an include string | the included keys, merged as libxkbcommon merges them (override replaces a level, augment fills only empty ones) | `general.importInlined`; a file or section the importer was not given: `xkb.includeUnresolved` |
| `key <NAME> { … }` | a position (§2 of `targets/xkb.md` in reverse: `keyName` or one of the `aliases`) | a name no row has: the position `Xkb` + the name with every character outside `A`–`Z`, `a`–`z`, `0`–`9` replaced by `_`, and a `keys.<p>.keyName` pin (`xkb.keyNameUnknown`) |
| `[ … ]`, `symbols[GroupN] = [ … ]` | the bindings of the key per state (§3) | group 1 only; `symbols[Group2]` and further `[ … ], [ … ]` lists `xkb.groupDropped` |
| `type = "…"`, `type[GroupN] = "…"` | which level each state gets (§3); `targets.xkb.keys.<p>.type` when it is a type of `targets/xkb.md` §3 | |
| `key.type = "…"`, `key.type[GroupN] = "…"` (a default for the keys after it in the section) | the type of each later key without one of its own (§3) | other `key.…` defaults (`key.repeat`, …) `xkb.actionsDropped` |
| a keysym name (`a`, `udiaeresis`, `oe`), `U` + hex, a hex number `0x…` | a character of a text binding, by xorgproto's `keysymdef.h` and the Unicode keysym range **[LXC]** (`keysym-encoding.md`) | an unknown name is `NoSymbol` (libxkbcommon does the same) |
| a UTF-8 string (`"æ"`, libxkbcommon 1.9 and later) | the text | |
| `{ k1, k2 }` (several keysyms on one level) | a text of several characters | a build writes it back, and empty in its X11 section (`targets/xkb.md` §3) |
| `NoSymbol`, `{}` | nothing at that level | |
| a `dead_*` keysym | `{"deadKey": <id>}` (§4) | |
| `ISO_Level3_Shift`, `ISO_Level5_Shift` | the level-shift components (§3) | |
| `BackSpace`, `Tab`, `Return`, `Escape`, `Delete`, `Linefeed`, `Clear` | U+0008, U+0009, U+000D, U+001B, U+007F, U+000A, U+000B | the build writes them back by `targets/xkb.md` §3 |
| other keysyms without a character: function keys, navigation, `XF86…`, `VoidSymbol`, modifier keysyms other than the level shifts | — | `xkb.keysymNotText`; the level is no binding |
| `actions[GroupN]`, `virtualMods`, `vmods`, `repeat`, `locks`, `overlay1`/`overlay2`, `radiogroup`, `allownone` | — | `xkb.actionsDropped` |
| `modifier_map <Mod> { … }` | — | for the level-shift keys the mapping comes from `symbols/pc` again; any other `xkb.actionsDropped` |
| `xkb_keymap { … }` (a complete keymap) | its `xkb_symbols` and `xkb_types` are read as a symbols file with its types | its keycodes, compat and geometry `xkb.syntaxDetailsIgnored` |
| a syntax error, an unterminated block or string, invalid UTF-8 | — | `xkb.malformed` |

## 3. Key types and levels

- **The type** of a key is its `type` (an `xkb_types` definition the importer was given, or a stock type of
  `targets/xkb.md` §3, or `KEYPAD`); without one, the `key.type` default in force at that point of the section
  (26 of xkeyboard-config's symbols files set one); without that, the type libxkbcommon gives it **[LXC]**
  (`keymap-text-format-v1-v2.md`, "Type"): 1 keysym `ONE_LEVEL`; 2 keysyms `ALPHABETIC` when the first is a
  lower-case and the second an upper-case letter, `KEYPAD` when one is a number-pad keysym, else `TWO_LEVEL`; 3 or 4
  keysyms `FOUR_LEVEL_ALPHABETIC` when both pairs are lower/upper-case letters, `FOUR_LEVEL_SEMIALPHABETIC` when
  only the first pair is, `FOUR_LEVEL_KEYPAD` when one of the first two is a number-pad keysym, else `FOUR_LEVEL`;
  more than 4 keysyms `ONE_LEVEL` (libxkbcommon warns). Trailing `NoSymbol` levels are dropped before this, as
  libxkbcommon 1.9 and later do. A type name the importer has no definition for: `xkb.keyTypeUnknown`, read as if
  the key had none.
- **States.** The importer evaluates the type for each of the 16 states of `targets/xkb.md` §3 (Shift, Lock,
  LevelThree, LevelFive) and takes the level's keysyms. In a state with Caps Lock on where the type does not consume
  Lock, it upper-cases each character with the Unicode simple uppercase mapping (UnicodeData.txt, Unicode 18.0.0),
  as libxkbcommon does **[LXC]** (libxkbcommon 1.13 also maps ß to ẞ, which 1.7 does not **[LNX]**; the importer
  follows Unicode). States with modifiers other than these four (Control, Alt, NumLock, …) are not imported
  (`xkb.typeModifierDropped`).
- **Layers.** One hardware layer per state that some key gives an output: the base `[[]]`, `[["shift"]]`,
  `[["altR"]]` (LevelThree), …, with Lock as `caps` and LevelFive as the level-5 component. The importer writes
  `settings.capsLockFallback` `true` and puts a key into a Caps Lock layer only where the Caps Lock state's output
  differs from the same state without Caps Lock; where Caps Lock gives nothing but the plain state gives text, the
  binding is the explicit nothing `{"output": ""}`.
- **Level shifts.** `ISO_Level3_Shift` on `<RALT>` (xkeyboard-config's `level3(ralt_switch)`) is the component
  `altR`, the default of rule `levelThree`. On other keys it is the custom `held` component `level3` on those
  positions, with `modifiers.levelThree` `level3`. `ISO_Level5_Shift` is the custom `held` component `level5`, with
  `modifiers.levelFive` `level5`. A file that has both on `<RALT>` and elsewhere imports the custom component.
- **`KEYPAD` types** (`KEYPAD`, `FOUR_LEVEL_KEYPAD`, `FOUR_LEVEL_MIXED_KEYPAD`): the position is a `numLock`
  position, its binding the Num Lock level; the navigation level is the position table's `keypad` keysym and is not
  imported (`xkb.typeModifierDropped` when it differs from the table).
- **Pins.** The importer pins `keys.<p>.type` when the key's type is a type of `targets/xkb.md` §3 (stock or
  yakbd), so that a build gives it the same type; for another type it writes no pin, and the build's rule `keyType`
  chooses one for the imported layers.

## 4. Compose

| construct | `.kbl.json` | notes |
|---|---|---|
| comments, white space, the order of lines | — | `xkb.syntaxDetailsIgnored` |
| `include "%L"` | `targets.xkb.compose.includeLocale` `true` | the system's sequences are not imported; other includes `xkb.syntaxDetailsIgnored` |
| `<dead_X> <k> : "R"` (also with a keysym after the string, or a keysym alone) | an entry of the dead key of `dead_X`, base the character of `k`, result R (the keysym's character when there is no string) | |
| `<dead_X> <dead_Y> : "R"` | an entry with base `{"deadKey": <id of dead_Y>}` | |
| longer sequences `<dead_X> <k1> <k2> … : "R"` | chained dead keys: the entry of `dead_X` for `k1` has the result `{"deadKey": "<X>-<k1>"}`, a dead key whose entries continue the sequence | the generated ids join the dead keys' ids and the keysym names of the steps with `-` |
| a sequence with `Multi_key`, one that does not start with a dead keysym the layout types, one with a keysym no key types, one whose result has no character | — | `xkb.composeSequenceDropped` |
| a symbols file with dead keysyms and no Compose file | the dead keys, without entries | `xkb.deadKeyNoCompose` |

- **Dead keys.** Each `dead_*` keysym a key types is a dead key whose id is the keysym name without `dead_`
  (`dead_acute` → `acute`), with the pin `targets.xkb.deadKeys.<id>.keysym`. Its `spacing` is the result of the
  sequence `<dead_X> <space>` when the Compose file has one, otherwise the first character the spacing table of
  `targets/xkb.md` §4 gives that keysym, otherwise the empty text. A generated chained dead key gets the `spacing`
  of the dead keys it joins, in order.
- **`noMatch`.** The importer writes `emitNothing`: libxkbcommon reports a cancelled sequence and leaves the key to
  the program, and the check's typer drops it **[LNX]**; what each toolkit types is **unmeasured**
  (`targets/xkb.md` §8).

## 5. Rules and registry (installation)

| part | `.kbl.json` |
|---|---|
| `rules/evdev.xml` `layout/configItem/name` | `targets.xkb.symbolsName` |
| `variant/configItem/name` | `targets.xkb.variant` (the layout's own entry: `basic`) |
| `configItem/description` | `metadata.name` and `targets.xkb.description` |
| `configItem/shortDescription` | `targets.xkb.shortDescription` |
| `configItem/languageList/iso639Id` | `targets.xkb.languages` |
| `countryList`, `vendor`, `hwList`, `popularity`, the registry of other layouts | `general.metadataDropped` |
| `rules/evdev.post`, a `types` file | the yakbd types they name (§3); other rules `xkb.syntaxDetailsIgnored` |

## 6. Importer conventions (XKB → `.kbl.json`)

1. The importer reads one section: the one its caller names, else the one marked `default`, else the first. Its
   name is `targets.xkb.variant` when the section is not the file's default, else `basic`; the file name is
   `targets.xkb.symbolsName`.
2. `metadata.id` is not in a symbols file: the importer takes it from its caller, or else `und` with the
   private-use extension `-x-` and the slug of the symbols file name (`targets/xkb.md` §1), each `-`-separated part
   cut to 8 characters; `metadata.provenance.format` is `xkb`.
3. The importer writes `settings.normalization: "disabled"`: XKB types its keysyms exactly.
4. Includes are resolved against the files the importer was given (a copy of xkeyboard-config's symbols for the
   corpus) and inlined (`general.importInlined`); the result is the layout as libxkbcommon would compile it, minus
   `symbols/pc`, which every keymap has anyway.
5. The importer pins what the build would otherwise decide from defaults: `symbolsName`, `variant`,
   `description`, `keys.<p>.type` (§3), `keys.<p>.keyName` for positions named `Xkb…`, `modifiers.levelThree` when
   it is not `altR`, `modifiers.levelFive`, `deadKeys.<id>.keysym`, and `compose.includeLocale` when a Compose file
   was read. `characters` is not pinned: the spelling of keysyms is not layout data.
6. Positions get no `scanCode` (a symbols file has none); a Windows build of the imported file needs them added.
7. A file the importer writes and the build then turns back into a symbols file gives the same levels per state
   for every key it imported, up to `xkb.syntaxDetailsIgnored`, except what the import reported as a loss and
   except Caps Lock states that a stock type then cannot hold (`xkb.capsLockNotExpressible`).
