# Target `xkb`: default rules and pinning (0.2 preview, normative)

How a `.kbl.json` file becomes a Linux keyboard layout for Wayland and X11, an XKB symbols file with its registry
entry and a Compose file, when `targets.xkb` (SPEC §16.5) is silent. Facts about Linux are cited by source:
**[LXC]** = libxkbcommon's documentation and source (commit `15b2b4e`, 2026-11-11); **[XKC]** = xkeyboard-config
(commit `f4d3ed8`, 2026-11-06); **[LNX]** = measured in containers by the layout check of `yakbd/yakbd-cli`
(`tools/xkb-check/`, its README "Results", commit `efb2a00`; the generated cases, among them the X11 refusal of
several keysyms per level, commit `8e3b3d9`), with the stack named; **[LAB]** = tried once with
libxkbcommon 1.13.2 and `xkbcomp` (Arch Linux, no display), not yet part of that check; **unmeasured** = this
specification's choice, with the Linux behaviour behind it not yet measured (§8 lists these for the verification
harness). Every source is listed in `CLEAN-ROOM.md` ("Linux (XKB) sources"). Nothing here is taken from a
distribution's own layouts.

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16, D135): a fixed table and one-line rules, no heuristics. They
   are knowingly wrong for many layouts. A layout that needs anything else says it in its own `targets.xkb`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported**, as an entry of kind `xkbDefault.<rule>` (SPEC §17.1) listing what it
   decided (`detail.value`). Its policy defaults to `accept`; `"xkbDefault.*": "error"` makes a file fully explicit.
4. **`pin`** (§6) writes the result of every rule into the file.
5. What the general data says is compiled as far as XKB and a Compose file can express it on every supported stack
   (SPEC §14 is the meaning to keep); everything else is a loss of a kind of SPEC §17.3. Where stacks differ, the
   build writes the form that works on the most of them and reports the rest.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `symbolsName` | symbols file and layout name: `yakbd-` + slug of `metadata.id` | `symbolsName` | 5 |
| `variant` | `basic`: the one section is the file's default, a layout of its own | `variant` | 5 |
| `description` | `metadata.name` | `description` | 5 |
| `shortDescription` | the language subtag of `metadata.id` | `shortDescription` | 5 |
| `characters` | `keysyms`: keysym names and `U` keysyms | `characters` | 3 |
| `keyName` | key name per position from `targets/xkb-default-keyname.tsv` | `keys.<p>.keyName` | 2 |
| `levelThree` | `altR` is the level-3 shift (Right Alt, AltGr) | `modifiers.levelThree` | 3 |
| `keyType` | per key, the first stock type of §3 that gives every state its output; else the closest one (or a yakbd type with `customTypes`) | `keys.<p>.type`, `customTypes` | 3 |
| `deadKeysym` | `dead_` + the dead key's id when that is a dead keysym; else by its `spacing` (§4 table); else the first free spare keysym | `deadKeys.<id>.keysym` | 4 |
| `compose` | a Compose file when the file has dead keys, beginning with `include "%L"` | `compose` | 4 |

**Slug** (rule `symbolsName`): as in `targets/macos.md` §1 (lower case, every run of characters outside `a`–`z`,
`0`–`9` replaced by one `-`, leading and trailing `-` removed, `layout` if nothing is left); the name is cut to 64
characters (`fo-t-k0-windows` → `yakbd-fo-t-k0-windows`). The prefix keeps the name apart from every symbols file of
xkeyboard-config: a user file with a system file's name hides that file, and before libxkbcommon 1.9 a hidden file
without a default section breaks the system layout **[LXC]** (`doc/custom-configuration.md`).

No rule exists for `languages` and `modifiers.levelFive`: absent unless given.

## 2. Position table

The default table from position names to XKB key names: `targets/xkb-default-keyname.tsv` (SPEC §16, "Position
tables"). Its key names are those that xkeyboard-config's evdev keycodes give the X keycode (Linux evdev code + 8)
that Chromium's table of W3C code values lists for the position **[XKC]**; every row says so in its `source`
column. The column `aliases` lists the other names xkeyboard-config's evdev keycodes and `aliases(qwerty)` give the
same key (`AC12` for `BKSL`, `LatQ` for `AD01`): an importer reads them (`coverage/xkb.md` §2), a build never writes
them. The column `keypad` holds the navigation keysym of the number-pad keys (§3, `numLock` positions).

- **`keyName`**: a position's key name is `keys.<p>.keyName`; otherwise the table's name for the position's name;
  otherwise it has none. A position with a binding and no key name is left out: when another target's position
  table (SPEC §16) has a row for it, it is a key this target does not have, `xkb.positionWithoutKey` (a warning);
  otherwise `xkb.keyNameMissing` (an error). Two positions with one key name report `xkb.keyNameDuplicate`.
- `SysRq` and `Break` have no row: XKB gives them no key of their own (they are levels of `<PRSC>` and `<PAUS>` in
  xkeyboard-config's `symbols/pc` **[XKC]**). A file converted from a `.klc` file binds `Break` (the row MSKLC adds
  to every layout, `coverage/windows.md` §10 item 6); the build leaves it out with `xkb.positionWithoutKey` (D145).
  A file that wants such a binding built pins a key name.
- Positions that operate Shift, Caps Lock or a component that is not a level shift (§3) need no key: the
  system's `symbols/pc`, which the rules always put before the layout, gives them their keysyms **[XKC]**
  (`rules/`, `symbols/pc`).

## 3. Modifiers, levels and key types

**States.** XKB selects a key's level from the active modifiers through the key's **type** **[LXC]**
(`doc/keymap-text-format-v1-v2.md`). The build uses four modifiers: Shift, Lock (Caps Lock), LevelThree and
LevelFive. Their combinations are the build's **states**, numbered by adding Shift 1, Lock 2, LevelThree 4,
LevelFive 8; LevelThree takes part when a compiled layer uses the level-3 component, LevelFive when
`modifiers.levelFive` is given and a compiled layer uses it, so a build has 4, 8 or 16 states. Each state is turned
into a kbl modifier state (SPEC §7.3): Shift → `shift`, Lock → `caps`, LevelThree → the level-3 component,
LevelFive → the level-5 component. A state's output for position P is `resolve(P, s)` (SPEC §9.3), written
O(P, s): a text, a dead key, or nothing (an explicit nothing is nothing).

**Level shifts** (rule `levelThree`). The level-3 component is `modifiers.levelThree`, by default `altR` (the right
Alt key, AltGr). `altR`: the key `<RALT>` types `ISO_Level3_Shift` (type `ONE_LEVEL`), as xkeyboard-config's
`level3(ralt_switch)` does **[XKC]**; `alt`: `<LALT>` and `<RALT>` both do; a custom `held` component: each of its
positions does. The level-5 component, `modifiers.levelFive`, works the same with `ISO_Level5_Shift`. The modifier
mapping of these keysyms comes from `symbols/pc` **[XKC]**. The build writes the level-shift keys only when a
compiled layer uses the component.

**Layers the build leaves out.** A modifier set that needs Control (`ctrl`, `ctrlL`, `ctrlR`) or an Alt component
that is not the level-3 component (`alt`, `altL`, and `altR` when the level-3 component is another one) is not
compiled; a layer left with no compiled set is left out (`xkb.controlAltLayerDropped`). Programs on Linux read
Control and Alt shortcuts themselves from the level without those modifiers, so a layout needs no such layers. A
set that needs a custom `held` component other than the two level components reports `xkb.modifierUnmapped`, one
that needs a custom `lock` `xkb.lockUnmapped`; the layer is left out.

**Key types.** A type maps each state to a level, and **consumes** the modifiers it uses, except those it
**preserves** **[LXC]**. When Caps Lock is on and the type does not consume Lock, libxkbcommon and Qt upper-case the
level's keysym themselves, and GTK 4 on X11 does not **[LNX]** (`FOUR_LEVEL`, letters œ and ß). The build therefore
never relies on that upper-casing. The stock types the build uses, all of xkeyboard-config's `types/complete`
**[XKC]** (`types/basic`, `types/extra`, `types/level5`, `types/pc`), give these levels for the states 0 to 7 and 8 to 15; `*`
marks a state with Caps Lock on in which the type does not consume Lock:

| type | states 0–7 | states 8–15 |
|---|---|---|
| `ONE_LEVEL` | 1 1 1* 1* 1 1 1* 1* | 1 1 1* 1* 1 1 1* 1* |
| `TWO_LEVEL` | 1 2 1* 2* 1 2 1* 2* | 1 2 1* 2* 1 2 1* 2* |
| `ALPHABETIC` | 1 2 2 1 1 2 2 1 | 1 2 2 1 1 2 2 1 |
| `FOUR_LEVEL` | 1 2 1* 2* 3 4 3* 4* | 1 2 1* 2* 3 4 3* 4* |
| `CTRL+ALT` | 1 2 1* 2* 3 4 3* 4* | 1 2 1* 2* 3 4 3* 4* |
| `FOUR_LEVEL_ALPHABETIC` | 1 2 2 1 3 4 4 3 | 1 2 2 1 3 4 4 3 |
| `FOUR_LEVEL_SEMIALPHABETIC` | 1 2 2 1 3 4 3* 4* | 1 2 2 1 3 4 3* 4* |
| `FOUR_LEVEL_PLUS_LOCK` | 1 2 5 2 3 4 3 4 | 1 2 5 2 3 4 3 4 |
| `EIGHT_LEVEL` | 1 2 1* 2* 3 4 3* 4* | 5 6 5* 6* 7 8 7* 8* |
| `EIGHT_LEVEL_ALPHABETIC` | 1 2 2 1 3 4 4 3 | 5 6 6 5 7 8 8 7 |
| `EIGHT_LEVEL_SEMIALPHABETIC` | 1 2 2 1 3 4 3* 4* | 5 6 6 5 7 8 7* 8* |

A type **fits** a key P when, for every state s of the build, the level the type gives s holds O(P, s), where each
level holds the output of the lowest state the type maps to it, and in a `*` state that output is also
**case-stable**: nothing, a dead key, or a text none of whose characters has the Unicode property
Changes_When_Uppercased (Unicode 18.0.0, the version of SPEC §5). `CTRL+ALT` (`types/pc`) is `FOUR_LEVEL` with a
fifth level for Control+Alt, which no build state reaches.

**`keyType`.** A key's type is `keys.<p>.type`; otherwise the first type of the table that fits it, where the keys
`<FK01>` to `<FK12>`, `<KPMU>`, `<KPDV>`, `<KPSU>` and `<KPAD>` try `CTRL+ALT` first and the other keys never try it. When none fits:

- `customTypes` `false` (the default): the type of the table that gives the most states their output, the earlier
  on a tie, and `xkb.capsLockNotExpressible` (the states that differ all have Caps Lock on: `FOUR_LEVEL` or
  `EIGHT_LEVEL` always fit the states without it). The usual case is a level-3 letter that Caps Lock must leave
  alone (þ with AltGr and Caps Lock): `FOUR_LEVEL_SEMIALPHABETIC` preserves Lock there and gives Þ **[LNX]**.
- `customTypes` `true`: a **yakbd type**, named `YAKBD_` followed by one digit per state, the level of that state
  (8 digits for the states 0 to 7, or 16 with LevelFive). A state with a modifier the build does not use (LevelThree
  in a build without it) gets the digit of the same state without that modifier. Levels are numbered in the order
  of the states that first need them, state 0 being level 1; states with equal output share a level. Its modifiers
  are Shift, Lock and LevelThree (and LevelFive with 16 digits), every one consumed in every state, so the level
  holds the output exactly. The same
  name always means the same type, whichever layout writes it. More than 8 levels: `xkb.tooManyLevels`. Every build
  that writes one reports `xkb.customKeyType` (installation, §5).

A pinned type gives each level the output of the lowest state that selects it; a state it then does not give its
output reports `xkb.keyTypeNotExact`. A pinned yakbd type is written with the key's levels in the same way.

**Caps Lock and GTK 4 on X11.** A key whose output with Caps Lock alone (state 2) has a character that is not
case-stable (a letter that Caps Lock leaves lower case) types that output in libxkbcommon, Qt, and GTK 4 on Wayland,
and its upper case in GTK 4 on X11, whatever the key type: `FOUR_LEVEL_PLUS_LOCK`, `TWO_LEVEL`, `FOUR_LEVEL`,
`FOUR_LEVEL_SEMIALPHABETIC` and a yakbd type that consumes Lock all gave the capital **[LNX]**. No type avoids it, so
the build reports it (`xkb.capsLockStacks`, one entry per build listing the positions; D148).

**Number-pad keys.** A `numLock` position whose row has a `keypad` keysym is written with xkeyboard-config's
`KEYPAD` type: level 1 the navigation keysym, level 2 (Num Lock on) its base binding; `keys.<p>.type` does not apply
to it. The `KEYPAD` type that `types/complete` brings (`types/numpad`, section `numlock_only_base`, the same in
release 2.49 and commit `f4d3ed8` **[XKC]**) uses Num Lock alone; with Num Lock on, Shift types the binding with xkeyboard-config 2.48 and 2.49 and the
navigation keysym (no text) with 2.42 and 2.46 **[LNX]**. Its other layers are left out (`xkb.numLockKeyReduced`, one entry per
build listing the positions). A `numLock` position without a `keypad`
keysym is built like any other key.

**Keysyms** (rule `characters`). Every level is a list of keysyms: none (`VoidSymbol`, below), one, or several for a text of
several characters (`{ a, b }`), which libxkbcommon and Qt type and GTK 4 types nothing for **[LNX]**; an X11 server
refuses the whole keymap when one level has several keysyms (Xvfb 21.1, `XkbSetMap` fails **[LNX]**), so such a
build also writes the **X11 section** (below) (`xkb.multiCharacterOutput`, one entry per build listing the levels). A dead key is its
`dead_*` keysym (§4). A character c is written, in the symbols file and in the Compose file alike, as:

1. U+0008 `BackSpace`, U+0009 `Tab`, U+000A `Linefeed`, U+000B `Clear`, U+000D `Return`, U+001B `Escape`, U+007F
   `Delete`;
2. U+0020–U+007E and U+00A0–U+00FF: the Latin-1 keysym of that value, by name (`a`, `space`, `udiaeresis`);
3. otherwise a keysym of xorgproto's `keysymdef.h` (release 2026.1) below 0x01000000 whose comment gives the code point as a plain
   `U+XXXX` (not in parentheses, which mark a deprecated mapping, nor in angle brackets, which mark a more specific
   keysym such as a keypad one) and does not begin with `deprecated`: the one with the lowest value, by its first
   listed (canonical) name (`oe` for U+0153, `Lstroke` for U+0141);
4. otherwise `U` followed by the code point in upper-case hexadecimal, at least four digits (`U1E9E`). This is the
   Unicode keysym 0x01000000 + the code point, also where `keysymdef.h` names that value: xorgproto keeps adding such
   names, and an older libxkbcommon reads a newer one as `NoSymbol` (`leftsingleanglequotemark`, U+2039, added in
   2026.1: `NoSymbol` with libxkbcommon 1.7.0 and 1.13.1 **[LNX]**), while every version reads `U2039` (D147).

These are the keysyms libxkbcommon itself gives a character (`xkb_utf32_to_keysym`) **[LXC]**, so the symbols file,
a UTF-8 string and the Compose file all mean the same keysym; Compose sequences match keysyms by value, so a `U`
spelling of a character that has a named keysym would not match the system's sequences. U+0000, other C0 and C1
control characters, and CodeUnits that are not well-formed UTF-16 have no keysym: `xkb.outputUnencodable`.
`characters` `utf8` writes each level of one or more printable characters as a UTF-8 string instead (`"æ"`),
which libxkbcommon 1.9 and later read and both libxkbcommon 1.7 and `xkbcomp` reject **[LNX]**
(`xkb.utf8Characters`).

**Settings.** `settings.capsLockOffBy` `shift` and `settings.bidiMarksOnShiftBackspace` have no form in a symbols
file: `xkb.settingNotCompiled`. **Normalisation** (SPEC §5): XKB does not normalise while typing, so a build does
what a Windows build does (`targets/windows.md` §6): with `normalization` `enabled` every output, dead-key base and
result is NFC-normalised at build time, each changed output reports `general.outputNormalized`, and the build
reports `general.normalizationNotApplied` once. **Markers and transforms** are not compiled:
`xkb.markerNotCompiled` (the output is built without the marker), `xkb.transformNotCompiled` per group.

**The symbols file.**

```
default partial alphanumeric_keys
xkb_symbols "basic" {
    name[Group1] = "<description>";
    key <AC01> { type[Group1] = "FOUR_LEVEL_ALPHABETIC", symbols[Group1] = [ ae, AE, VoidSymbol, VoidSymbol ] };
    key <RALT> { type[Group1] = "ONE_LEVEL", symbols[Group1] = [ ISO_Level3_Shift ] };
};
```

One section, named `variant` (rule `variant`, default `basic`), marked `default` only when it is `basic`. It
includes no other symbols, so a position the file does not bind types nothing, as the model says; the system's
`symbols/pc` still gives the keys it defines (Escape, Return, Backspace, Tab, the arrows, the function keys, Space)
**[XKC]**. Keys are written in the order of the position table, then the other positions in ascending order of
their names; a key is written when some state gives it an output, with every level of its type. A level whose
output is nothing is `VoidSymbol`, never `NoSymbol`: libxkbcommon merges the layout's key with the key of the same
name that `symbols/pc` and the rules' other files define, and fills a `NoSymbol` level from it (Numpad1 bound in the
base layer only: Shift typed `KP_1`; `<LSGT>` has four levels there) **[LNX]**; only level 5 of `CTRL+ALT` stays
`NoSymbol`, so that the system's Control+Alt action of the key stays (D146). The text of `description` is a string literal with `"` and `\` escaped by `\`.

**The X11 section** (D143). When some level has several keysyms, the symbols file gets a second section after the
first, named V + `-x11` (`basic-x11` for the default), never `default`, the same as the first except that each level
of several keysyms is `VoidSymbol`. Wayland sessions select the first section and type everything; X11 sessions load
the X11 section (§5) and type nothing on those levels instead of refusing the layout. The registry does not list the
X11 section. X11 loads it **[LNX]** (Xvfb 21.1); with `NoSymbol` on those levels it did not, because a key whose
levels are all `NoSymbol` keeps a type of several levels and the server refuses the keymap (D146).

## 4. Dead keys

How the dead-key model of SPEC §10 and §14.2 becomes `dead_*` keysyms and Compose sequences (SPEC §14.2, "One model,
every target"). A keymap holds only the keysym a dead key's key types; the composition table is a Compose file,
which every program's input method reads for itself **[LXC]** (`include/xkbcommon/xkbcommon-compose.h`) **[LNX]**.
A Compose file is per user, not per layout: its sequences apply to every layout the user selects. The build writes
only what the file's entries say, and does not try to force `noMatch` onto keys without an entry, which would change
the user's other layouts.

| model (SPEC §10, §14.2) | XKB and Compose |
|---|---|
| dead key D | the keysym of rule `deadKeysym` |
| a binding that is dead key D | the level is D's keysym |
| an entry of D with base text B (one character), result text R | `<kD> <kB> : "R"`, kB the keysym of B (§3, rule `characters`) |
| base `{"deadKey": E}` | `<kD> <kE> : …` (E typed while D is pending) |
| result `{"deadKey": F}` (chained) | the sequences of F, each prefixed by `<kD> <kB>`; F needs no keysym of its own unless a key types it |
| a chain that reaches a dead key already in the sequence (a cycle) | the sequence ends there: `xkb.deadKeyChainCut` |
| entries in order, first match wins | only the first entry per (D, base) is written; later ones are unreachable (`general.duplicateDeadKeyEntry` already says so) |
| a base of several characters | not written: each step of a sequence is one keysym (`xkb.composeBaseNotSingle`) |
| the backspace action (U+0008) as base | `<kD> <BackSpace>` |
| `noMatch` (any value), `spacing` | not compiled: when a key has no sequence, the input method cancels the dead key and decides what the key types (`xkb.deadKeyNoMatchNotCompiled`; libxkbcommon reports the cancel and leaves the rest to the program **[LXC]**); **unmeasured** per stack (§8) |

- **The result** is written as a string with `"` and `\` escaped by `\`; an empty result `""` types nothing
  **[LAB]**. A base E that no key types cannot be pressed, and its entry is not written.
- **`deadKeysym`.** The dead keys a key types, in ascending order of their ids, get their keysym from the first of
  these that another dead key has not already taken: (1) `dead_` + the id, when that is one of the dead keysyms
  below; (2) the keysym the table below gives the dead key's `spacing`; (3) the first spare keysym `dead_lowline`,
  `dead_aboveverticalline`, `dead_belowverticalline`, `dead_longsolidusoverlay`. Step (1) runs for every dead key
  before step (2). None left: `xkb.deadKeysymMissing`. Two dead keys with the same keysym (pins):
  `xkb.deadKeysymDuplicate`.
- **Dead keysyms** (libxkbcommon's `xkbcommon-keysyms.h` **[LXC]**): `dead_grave`, `dead_acute`,
  `dead_circumflex`, `dead_tilde`, `dead_perispomeni`, `dead_macron`, `dead_breve`, `dead_abovedot`,
  `dead_diaeresis`, `dead_abovering`, `dead_doubleacute`, `dead_caron`, `dead_cedilla`, `dead_ogonek`, `dead_iota`,
  `dead_voiced_sound`, `dead_semivoiced_sound`, `dead_belowdot`, `dead_hook`, `dead_horn`, `dead_stroke`,
  `dead_abovecomma`, `dead_psili`, `dead_abovereversedcomma`, `dead_dasia`, `dead_doublegrave`, `dead_belowring`,
  `dead_belowmacron`, `dead_belowcircumflex`, `dead_belowtilde`, `dead_belowbreve`, `dead_belowdiaeresis`,
  `dead_invertedbreve`, `dead_belowcomma`, `dead_currency`, `dead_lowline`, `dead_aboveverticalline`,
  `dead_belowverticalline`, `dead_longsolidusoverlay`, `dead_a`, `dead_A`, `dead_e`, `dead_E`, `dead_i`, `dead_I`,
  `dead_o`, `dead_O`, `dead_u`, `dead_U`, `dead_small_schwa`, `dead_schwa`, `dead_capital_schwa`, `dead_SCHWA`,
  `dead_greek`, `dead_hamza`, `dead_apostrophe`.
- **Spacing table** (step 2), the `spacing` text → keysym: `` ` `` U+0060 and U+0300 `dead_grave`; `´` U+00B4,
  `'` U+0027 and U+0301 `dead_acute`; `^` U+005E, `ˆ` U+02C6 and U+0302 `dead_circumflex`; `~` U+007E, `˜` U+02DC
  and U+0303 `dead_tilde`; `¯` U+00AF and U+0304 `dead_macron`; `˘` U+02D8 and U+0306 `dead_breve`; `˙` U+02D9 and
  U+0307 `dead_abovedot`; `¨` U+00A8, `"` U+0022 and U+0308 `dead_diaeresis`; `˚` U+02DA, `°` U+00B0 and U+030A
  `dead_abovering`; `˝` U+02DD and U+030B `dead_doubleacute`; `ˇ` U+02C7 and U+030C `dead_caron`; `¸` U+00B8 and
  U+0327 `dead_cedilla`; `˛` U+02DB and U+0328 `dead_ogonek`; U+0323 `dead_belowdot`; U+0326 `dead_belowcomma`;
  `¤` U+00A4 `dead_currency`. A `spacing` that is a space followed by one of these, or one of these followed by a
  space, counts as that character.
- **The system's sequences** (rule `compose`). The Compose file begins with `include "%L"` unless
  `compose.includeLocale` is `false`: the user's file replaces the system's file for the locale, and without the
  include every other layout of the user would lose its dead keys **[LXC]** (`src/compose/paths.c`) **[LNX]**. With
  it, the system's sequences for the same dead keysyms also apply where the file has no entry (more compositions
  than the file has), and the file's sequences replace the system's for the same keys, in every layout of the
  user (`xkb.systemComposeSequences`).
- **Stacks.** Every build with dead keys reports `xkb.deadKeyStacks`: the sequences type where the input method
  reads the user's Compose file, which **[LNX]** measured for libxkbcommon, Qt 6 on every stack, and GTK 4 on X11
  and weston; GTK 4 on sway, KWin and mutter hands keys to its Wayland input-method module and, with no input method
  running, drops the dead key (with `GTK_IM_MODULE=simple` it types the sequences). IBus and fcitx5 read Compose
  files of their own (**unmeasured**, §8).

**The Compose file** (rule `compose`, written when `compose.write` is `true`, by default when the file has dead
keys): UTF-8, one sequence per line, in ascending order of the dead keys' ids and then in entry order, a comment
line first that names the layout, then `include "%L"` (rule `compose`), then the sequences:

```
# Dead keys of the XKB layout yakbd-fo-t-k0-demo (yakbd)
include "%L"
<dead_acute> <a> : "á"
<dead_acute> <dead_circumflex> <a> : "ấ"
```

## 5. Files and installation

**The build** writes, for symbols name N and variant V:

```
xkb/symbols/N                 the symbols file (§3; with its X11 section when a level has several keysyms)
xkb/rules/evdev.xml           the registry with this one layout
xkb/types/N-types             only with yakbd types (V not basic: N-V-types)
xkb/rules/evdev.post          only with yakbd types
compose/N.XCompose            only with a Compose file (§4)
```

- **`rules/evdev.xml`** **[LXC]** (`doc/custom-configuration.md`, "Discoverable layouts"): an `xkbConfigRegistry`
  (version 1.1) whose `layoutList` holds one `layout`. With `variant` `basic` its `configItem` has `name` N,
  `shortDescription` (rule `shortDescription`), `description` (rule `description`) and, with `languages`, a
  `languageList` of `iso639Id` elements. With another `variant`, the `layout`'s `configItem` has only `name` N and
  its `variantList` holds one `variant` with `name` V and the same three items; N may be a system layout (the
  registry merges a user's entries into the system's **[LXC]**), but the user's symbols file N then hides the
  system's: libxkbcommon 1.7.0 and 1.13.1 give the variant for N alone, 1.13.2 the system layout **[LNX]**. A build
  with a variant and a symbols name that does not begin with `yakbd-` reports it (`xkb.systemLayoutShadowed`; D149).
- **Yakbd types** **[LAB]**: `types/N-types` holds one `default partial xkb_types "basic"` section with
  `virtual_modifiers LevelThree, LevelFive;` and every yakbd type the layout uses (`modifiers`, one `map` per state
  whose level is not 1, a `level_name` per level). `rules/evdev.post` holds one rule set that adds the types file
  to every keymap with the layout: `! layout[any] = types` and `  N = +N-types` (with a variant:
  `! layout[any] variant[any] = types` and `  N V = +N-V-types`). libxkbcommon reads the `.post` rules files of
  every include path since 1.13 **[LXC]** (`doc/rules-format.md`); older versions ignore them. A key whose type is
  missing falls back to another type: libxkbcommon 1.13.2 warns ("XKB-286", "Using the default type") and
  `xkbcomp` 1.5.0 uses `TWO_LEVEL`, which loses levels 3 and up **[LAB]** (`xkb.customKeyType`).

**Per user, no root** (the release form; Wayland sessions): `~/.config/xkb/` (or `$XDG_CONFIG_HOME/xkb/`) is the
first path libxkbcommon searches **[LXC]** (`doc/custom-configuration.md`, "XKB data locations"); the layout loads
from it in every stack **[LNX]** measured (libxkbcommon 1.7 and 1.13, sway, weston, KWin, mutter). The settings apps
list a layout only through `rules/evdev.xml` **[LXC]**. Several layouts share the user's `rules/evdev.xml`,
`rules/evdev.post` and Compose file, and the variants of one layout N share the symbols file N, so an **install
script** (written by the build tool, run by the user) MUST work with **marked blocks**, each named B: N for the
default section `basic`, `N(V)` for a variant V (D144; neither name can hold `(`, so two builds never share a block):

1. add the build's symbols file to `~/.config/xkb/symbols/N` between the lines `// yakbd B begin` and
   `// yakbd B end`, creating the file when it does not exist, and copy `types/<types>` into `~/.config/xkb/types/`,
   replacing only that file;
2. add the layout's `layout` element (or, for a variant, a `layout` element of N holding its `variant` element) to
   `~/.config/xkb/rules/evdev.xml` between the lines `<!-- yakbd B begin -->` and `<!-- yakbd B end -->`, creating
   the file with an empty registry first when it does not exist; libxkbcommon's registry merges `layout` elements of
   one name and their variants **[LXC]** (`src/registry.c`); likewise the rule set in
   `~/.config/xkb/rules/evdev.post` between `// yakbd B begin` and `// yakbd B end`. Every step replaces an earlier
   block of the same name and never changes other lines;
3. put the Compose sequences where every program finds them, given which files win **[LNX]**: libxkbcommon and Qt
   read the first of `$XCOMPOSEFILE`, `~/.config/XCompose`, `~/.XCompose`; GTK 4 reads `~/.config/gtk-4.0/Compose`,
   else `~/.XCompose`, and never `~/.config/XCompose` nor `$XCOMPOSEFILE` (measured: with only `~/.config/XCompose`,
   GTK 4 on X11 and weston used the system's table); a user file replaces the system's file, so it keeps the system sequences only with `include "%L"`.
   There are two targets: the file libxkbcommon and Qt use (`$XCOMPOSEFILE` when set, else the first existing of
   `~/.config/XCompose` and `~/.XCompose`) and the file GTK 4 uses (`~/.config/gtk-4.0/Compose` when it exists,
   else `~/.XCompose`; D148).
   - A target that has no file: install the build's Compose file as `~/.XCompose` (with its `include "%L"`), which
     both libxkbcommon and GTK read when it is the only one **[LNX]**.
   - A target that has a file: append the sequences (without the include line) between `# yakbd B begin` and
     `# yakbd B end`, after keeping a copy of the file; never change other lines, and never add `include "%L"` to
     the user's own file.;
4. on uninstall, remove exactly its own blocks and the types file, and a symbols file or a Compose file the script
   created once no block is left in it; the other builds' blocks stay;
5. say how to select the layout (below) and that a session restart may be needed for the settings apps to list it.

Selecting the layout: GNOME Settings › Keyboard › Input Sources, or `gsettings set org.gnome.desktop.input-sources
sources` with `('xkb', 'N')` (`'N+V'` for a variant) (**unmeasured**; **[LNX]** measured bare mutter through
`localectl`'s X11 layout); KDE System Settings › Keyboard › Layouts (`LayoutList` in `~/.config/kxkbrc`, **[LNX]**);
sway `input type:keyboard xkb_layout N` (and `xkb_variant V`) **[LNX]**.

**X11 sessions** do not read the user path: the X server's tools have fixed paths **[LXC]**. The layout is loaded
for the running session with `setxkbmap -I$HOME/.config/xkb -layout N [-variant V] -print | xkbcomp
-I$HOME/.config/xkb - $DISPLAY` **[LNX]**, adding `-types complete+N-types` with yakbd types **[LAB]** (compiled
only, no display); a session start script repeats it. `xkbcomp` rejects UTF-8 strings, and the X server refuses a
keymap with a level of several keysyms **[LNX]**: a build with such levels loads its X11 section instead
(`-variant basic-x11`, `-variant V-x11`; §3). X11 programs read `~/.XCompose`.

**System-wide** (later packages, informative): since libxkbcommon 1.13 a package installs its files into
`/usr/share/xkeyboard-config.d/<package>/` (`symbols/`, `types/`, `rules/evdev.xml`, `rules/evdev.post`) and touches
no file of xkeyboard-config; the directory is searched after the user and `/etc/xkb` paths and before the system
data **[LXC]** (`doc/packaging-keyboard-layouts.md`). Compose sequences have no package directory: the user path
(step 3) is still needed for dead keys. X11 sessions need the files in the X server's own path.

**Measured versions** **[LNX]**:

| distribution | libxkbcommon | xkeyboard-config | UTF-8 strings (1.9) | `.post` rules and package directory (1.13) |
|---|---|---|---|---|
| Debian 13 | 1.7.0 | 2.42 | rejected | no |
| Ubuntu 26.04 LTS | 1.13.1 | 2.46 | yes | yes (by version) |
| Fedora 45 | 1.13.1 | 2.48 | yes | yes (by version) |
| Arch Linux | 1.13.2 | 2.49 | yes | yes (by version; `.post` **[LAB]**) |

Desktops measured **[LNX]** (Arch Linux): weston 15.0.1, sway 1.12, KWin 6.8.3, mutter 51.1, GTK 4.24.2, Qt 6.12.1,
Xvfb 21.1. GNOME Shell itself was not measured (§8).

**Release form**: an archive with `xkb/`, `compose/`, the install script (install and uninstall) and a `README`
that says what the script changes, how to select the layout in GNOME, KDE, sway and on X11, and what needs a
session restart. Packages (`.deb`, `.rpm`) for the system-wide form may follow.

## 6. Pinning

`yakbd pin` (target `xkb`) writes into `targets.xkb` every value a rule decided: `symbolsName`, `variant`,
`description`, `shortDescription`, `characters`, `keys.<p>.keyName` for every position the build writes,
`keys.<p>.type` for every key it writes, `modifiers.levelThree` (when a layer uses it), `deadKeys.<id>.keysym`
for every dead key a key types, and `compose.write` and `compose.includeLocale`. It never changes other general
data. After pinning, a build reports no `xkbDefault.*` entry and gives the same files.

## 7. Carried, not compiled

Nothing: every member of `targets.xkb` is compiled. Touch layouts, `displays`, `tests` and `extensions` are not part
of an XKB layout (`general.touchDropped`, `general.displayDropped`, `general.testsDropped`,
`general.extensionDropped`); `metadata` beyond the name and the id reports `general.metadataDropped`. A file
without hardware layers fails with `xkb.noHardwareLayers`.

## 8. Unmeasured (informative)

Cases for the Linux verification harness (`yakbd/yakbd-cli`, `tools/xkb-check/`): (1) yakbd types through
`~/.config/xkb/rules/evdev.post` in sway, KWin and mutter, and Caps Lock with AltGr on such a key in GTK 4 on X11
and Wayland ([LAB]: libxkbcommon 1.13.2 gives þ for `YAKBD_12213434`, where `FOUR_LEVEL_SEMIALPHABETIC` gives Þ);
(2) the same on libxkbcommon 1.7 (expected: the default type) and on X11 with `-types`; (3) what each stack types
for a key without a sequence after a dead key (`noMatch`), and for Backspace; (4) a layout as the second of two
layouts, with yakbd types (`layout[any]`); (5) a variant of a system layout from the user path, listed by the
settings apps; (6) GNOME Shell with IBus: selection through Settings or `gsettings`, dead keys through IBus's own
Compose handling; fcitx5; (7) Compose blocks appended to an existing `~/.config/XCompose` and
`~/.config/gtk-4.0/Compose`, and GTK 4 with only `~/.config/XCompose`; (8) an empty result `""`; (9) every row of rule `characters` against
`xkb_utf32_to_keysym`; (10) the `KEYPAD` type with Shift and Num Lock, and in xkeyboard-config 2.42 (Debian 13);
(11) the X11 section of a build with levels of several keysyms, loaded on X11 (expected: it loads, those levels type
nothing); (12) two variants of one layout installed side by side and one of them removed: both listed by the
settings apps, the other still selectable; the registry keeps the description and languages of the first `layout`
element of a name **[LXC]**, so a variant installed before the default section of the same layout leaves that
layout without its description in the settings apps (expected; rare). A measured result is recorded here with its
run and, where it changes a rule, in `DECISIONS.md`.

Measured since (run of 2026-11-28 and its follow-up, `tools/xkb-check`): (5) the variant is listed and compiles, but
hides the system layout before libxkbcommon 1.13.2 (§5, D149); (7) GTK 4 never reads `~/.config/XCompose` (§5,
D148); (9) one name (`leftsingleanglequotemark`) unknown before 1.13.2 (§3 rule `characters`, D147); (10) Shift with
Num Lock depends on the xkeyboard-config release (§3); (11) the X11 section loads once its emptied levels are
`VoidSymbol` (§3, D146).
