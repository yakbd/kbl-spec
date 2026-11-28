# Coverage: Keyman `.kmn` keyboard source → `.kbl.json`

Every construct of the Keyman keyboard language, with its home in `.kbl.json` or the loss kind that reports it
(format `kmn`, SPEC §16.11; target `keyman`, route `kmn`, `targets/keyman.md` §9). The touch layout a source names
(`&LAYOUTFILE`) is read with it, by `coverage/keymantouch.md`; its keys take their outputs from the rules below.

**How much of the language the format holds (D250).** Exactly what maps onto hardware layers, dead keys and
transforms: rules without context (bindings), rules whose context is one dead key (dead-key entries), rules whose
context is text, `any()` sets and markers (transforms), and context-only groups chained by `match > use()`
(transform groups). Everything else (options read and written at run time, `notany()`, `nul` contexts, `call()`,
`beep`, `baselayout()`, groups called from inside a rule) is a loss, reported per rule. The file carries the
complexity; the format does not grow a rule language (owner's simple-defaults rule).

## 1. Sources

Keyman's language reference (help.keyman.com, repository keymanapp/help.keyman.com, folder `developer/language`,
commit `30cb1e7d056b6b9214d1daa2d79b61ea3496bf71`, MIT): the guides (rules, strings, constants, virtual keys,
groups, stores, multi-platform) and the reference pages of every statement and system store. The `.kmn` files of
keymanapp/keyboards (commit `46980ce`, MIT; 948 sources, which the reader parses all). What KeymanWeb does with a
rule is measured in the touch venue of `tools/keyman-check` (yakbd-cli; KeymanWeb 18.0.255): a key without a rule
types its US English character, a `T_` key's event carries the modifiers of its layer, a layer whose id is not a
modifier name carries none, a pending deadkey with no matching rule is passed over (the key's own rule runs). Every
source is listed in `CLEAN-ROOM.md` ("Keyman sources").

## 2. Header and stores

| construct | home in `.kbl.json` | loss |
|---|---|---|
| `store(&NAME)` (or the legacy `NAME` line) | `metadata.name` (without it: the file name) | — |
| `store(&KEYBOARDVERSION)` | `metadata.version` | — |
| `store(&COPYRIGHT)` | `metadata.copyright` | — |
| `store(&MESSAGE)` | `metadata.description` | — |
| `store(&ETHNOLOGUECODE)` | `metadata.id`: the first code (lower case); the others `metadata.locales`. A package's languages win (§4 item 5) | `kmn.languageUnknown` when neither names a language (`metadata.id` is `und`) |
| `store(&LAYOUTFILE)` | the touch layout, read from the source's folder (`coverage/keymantouch.md`) | `kmn.touchLayoutMissing` when it cannot be read |
| `store(&SHIFTFREESCAPS)` | `settings.capsLockOffBy: "shift"` | — |
| `store(&CASEDKEYS)`, `&CAPSALWAYSOFF`, `&CAPSONONLY` | none | `kmn.capsRuleDropped` |
| `store(&MNEMONICLAYOUT) '1'` | keys named by character are read as US English positions | `kmn.mnemonicLayout` |
| `&VERSION`, `&TARGETS`, `&BITMAP`, `&VISUALKEYBOARD`, `&HOTKEY`, `&DISPLAYMAP`, `&LANGUAGE`, `&WINDOWSLANGUAGES`, `&LAYOUT`, `&INCLUDECODES`, `&KMW_*`, any other system store | none | `kmn.storeDropped` (one entry listing them) |
| `store(name) …` | read where a rule uses it: `any()` / `index()` sets, `outs()`, named constants `$name` (a store of one character) | — |
| option stores (`if(name = 'v')`) | read at their initial value | `kmn.optionFixed`, once per store |
| `$keyman:`, `$keymanonly:`, `$keymanweb:` line prefixes | the line is read | — |
| `$kmfl:`, `$weaver:` line prefixes | the line is skipped (another compiler's) | — |
| ranges `'a' .. 'z'`, `[K_A] .. [K_Z]` | expanded | — |
| `begin Unicode > use(g)` | `g` is the key group | — |
| `begin ANSI` (used only when there is no `begin Unicode`), `begin NewContext`, `begin PostKeystroke` | none | `kmn.beginDropped` |

## 3. Groups and rules

Rules of a group are tried as Keyman tries them: longest context first, then in file order. The importer evaluates
every key event — each key of the table of §6 in every modifier state the rules name (plus none and Shift), Caps
Lock off and on, and each key of the touch layout on its layer — against them.

| construct | home in `.kbl.json` | loss |
|---|---|---|
| `+ [MODS K_x] > text` (no context) | a binding of position `x` (§6) in the hardware layer of `MODS` | — |
| `CAPS`, `NCAPS` | the layer with / without `caps`; a rule without either serves both states (Caps Lock fallback, SPEC §9.3) | — |
| `ALT`, `CTRL` beside `LALT`/`RALT`/`LCTRL`/`RCTRL` in one file | written for both sides (a layer `["alt"]` beside `["altR"]` would overlap) | — |
| `+ 'c'`, `+ ['c']` (a character key) | the US English key and Shift state that type `c` (with Caps Lock applied to letters) | — |
| `+ any(keys) > index(out, n)` | one binding per element | — |
| a key without a rule | Keyman types the key's US English character (Caps Lock on letters) in the states without Control and Alt, `U_` keys their code points: written as bindings | `kmn.passThroughKeys` (one entry with the count) |
| `> nul` | an explicit nothing (`{"output": ""}`) where another state would fall back | — |
| `> dk(x)` alone, and `dk(x) + key > …` | dead key `x`: each key event whose rule after `dk(x)` gives a result becomes an entry, its base the text that key types without the dead key; `noMatch: emitText` (Keyman passes the pending deadkey over); `spacing` = the result after Space, else empty | `kmn.deadKeyNotExpressible` for a key that types nothing or a marker alone, or two keys of one text with different results |
| `dk(x)` used in any other way | marker `x` (SPEC §13.3) in outputs and transforms | — |
| `context text + key > output` (text, `$c`, `any()`, markers) | a transform of the first simple group: `from` = the context (`any(s)` → `($[s])`, a set variable of the store's characters) followed by the text the key types without context; `to` = the output (`context` → the context, `context(n)` → that position, `index(t, n)` → `$[g:t]`) | `kmn.contextRuleAsTransform` (accept): the transform also applies when another key types the same text after that context |
| `match > use(g)` in the key group, and the chain of groups it reaches | one transform group per context-only group, in chain order, its rules as above without key | `kmn.ruleNotExpressible` for a group that hands over only after a match, or a chained group `using keys` |
| `platform('touch')`, `platform('hardware')`/`'desktop'`, `'mobile'`/`'phone'`, `'tablet'`, `if(&platform = …)` | the rule serves the hardware layers or the touch keys of that platform only | — |
| `layer('x')`, `set(&layer = 'x')` in a rule a touch key reaches | that key's `layerId` | — |
| `notany()`, `nul` in a context, `baselayout()`, platform names of an operating system or browser, `native`, `web`, `call()`, `beep`, `set()`/`save()`/`reset()` of an option, `use()` inside a rule, `nomatch` in the key group, a deadkey with text in an output, a dead key inside a longer context, `index()` that does not match its `any()` element for element | none | `kmn.ruleNotExpressible`, one entry per rule |
| a group nothing reaches by `match`/`nomatch` | none | `kmn.ruleNotExpressible`, one entry per group |

## 4. Importer conventions (`.kmn` → `.kbl.json`)

1. `metadata.provenance` is `{ "format": "kmn", "source": <file name> }`.
2. Hardware layers are named by their modifiers (`base`, `shift`, `caps`, `shift-caps`, `altR`, …); `positions` get
   the scan codes of Appendix A; number-pad positions `numLock: true`.
3. A source that is not the language (an unclosed string or bracket, a line that is neither statement nor rule, no
   `begin`, a begin group that does not exist) is `kmn.malformed`. A begin group that is not `using keys` is read as
   the key group (`kmn.ruleNotExpressible`, one entry).
4. Touch keys: `coverage/keymantouch.md` §3, outputs by the rules of §3 for the key's layer and platform.
5. **Packages.** A package source (`.kps`) holding several keyboards imports as one `.kbl.json` and one loss report
   per keyboard (SPEC §16.11, D150): each `<Keyboard>` is found as `<ID>.kmn` in the `.kps` folder or a folder the
   command names; its first `<Language>` is `metadata.id`, the others `metadata.locales`. A keyboard whose source
   is not found fails alone (`kmn.sourceMissing`). A compiled package (`.kmp`) holds no source and is not read (D253).

## 5. Writing `.kmn`

`convert -to kmn` and `compile -target keyman -route kmn` write one `.kmn` (and, with touch sets, the touch layout of
`coverage/keymantouch.md` §5, with `T_` keys for every key that is not a function key). The writer states every
behaviour, because Keyman's defaults differ from the model's (D251):

| `.kbl.json` | `.kmn` | loss |
|---|---|---|
| metadata | `&NAME`, `&COPYRIGHT`, `&KEYBOARDVERSION` (default `1.0`), `&VERSION '10.0'`, `&TARGETS 'any'`, `&LAYOUTFILE` | `general.metadataDropped` for `id` (languages are the package's), authors, description, licence, localised names |
| hardware layers | for each key of §6 and each modifier state the layers name (plus none and Shift): `+ [MODS K_x] > output` from SPEC §9.3 resolution; `NCAPS`/`CAPS` pairs where Caps Lock changes the result; `> nul` where a state without Control and Alt types nothing | `kmn.layerNotExpressible` for a set with a custom modifier; `kmn.positionNotExpressible` for a position without a Keyman key |
| no hardware layers | no key rules | `kmn.passThroughKeys`: on a hardware keyboard Keyman types US English |
| with touch sets | hardware rules carry `platform('hardware')`; rules of touch function keys `platform('touch')` | — |
| Backspace, Enter, Tab doing their own action | no rule | — |
| the backspace action on another key, CodeUnits that are not text, a non-string variable in an output | none | `kmn.outputNotExpressible` |
| a dead key | `> dk(x)`; per key event: its entry `dk(x) + key > result` (chained results `dk(y)`); otherwise by `noMatch`: `emitBoth` `> spacing text`, `emitSpacing` `> spacing`, `emitNothing` `> nul`, `emitText` no rule (Keyman's own behaviour); Backspace `dk(x) + [K_BKSP] > nul` (the dead key is cancelled, no character deleted) | — |
| markers | `dk(marker)` in outputs and contexts | — |
| `transforms.simple` groups | context-only groups `transforms1`, … chained by `match > use()` (and `nomatch > use()` from the second on); a transform's `from`/`to` in the subset: literal text, `\u{…}`, `\m{…}`, `${string}`, `($[set])` with `$[n:set]` and `$n`; set variables of single characters become stores | `kmn.transformNotExpressible` for other patterns, reorders and backspace transforms |
| a transform that an earlier one always shadows | left out (it never applies) | — |
| a longer pattern after a shorter non-literal one | written; Keyman tries longer contexts first | `kmn.transformOrderChanged` |
| `settings.capsLockOffBy: shift` | `&SHIFTFREESCAPS '1'` | — |
| `settings.bidiMarksOnShiftBackspace` | none | `kmn.settingDropped` |

## 6. Keys

Keyman's common virtual keys (the language reference's table) and their positions: `K_A`…`K_Z` (`KeyA`…), `K_0`…`K_9`
(`Digit0`…), `K_BKQUOTE` `Backquote`, `K_HYPHEN` `Minus`, `K_EQUAL` `Equal`, `K_LBRKT` `BracketLeft`, `K_RBRKT`
`BracketRight`, `K_BKSLASH` `Backslash`, `K_COLON` `Semicolon`, `K_QUOTE` `Quote`, `K_COMMA` `Comma`, `K_PERIOD`
`Period`, `K_SLASH` `Slash`, `K_oE2` `IntlBackslash`, `K_oC1` (also `K_?C1`) `IntlRo`, `K_SPACE` `Space`, `K_BKSP`
`Backspace`, `K_TAB` `Tab`, `K_ENTER` `Enter`, `K_ESC` `Escape`, `K_DEL` `Delete`, `K_NP0`…`K_NP9` `Numpad0`…,
`K_NPSTAR`, `K_NPPLUS`, `K_NPMINUS`, `K_NPDOT`, `K_NPSLASH`, `K_NPENTER` (the number-pad positions). ISO 9995 codes
(`C01`, `E00`, …) name the same keys. Names are read in any case.
