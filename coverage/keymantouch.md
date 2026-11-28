# Coverage: Keyman touch layouts (`.keyman-touch-layout`) → `.kbl.json`

Every member of a Keyman touch-layout file, with its home in `.kbl.json` or the loss kind that reports it (format
`keymantouch`, SPEC §16.11). A touch layout describes the on-screen keys of one Keyman keyboard; what most keys type
is decided by the keyboard's `.kmn` rules (`coverage/kmn.md`), so the two are normally imported together, the touch
layout giving `touch` and `keys`, the `.kmn` the outputs. This page says what the touch layout alone gives and where
the rules take over.

## 1. Sources

Keyman's description of the format, `common/schemas/keyman-touch-layout/README.md`, and its JSON Schema
`keyman-touch-layout.spec.json` (format version 2.1.2), at **keymanapp/keyman commit
`1e0a9dd113dd4ee52f09dc583060324a63eb4467`** (2026-11-23, MIT); the `.keyman-touch-layout` files of
keymanapp/keyboards (MIT, commit `46980ce`) for which members are used and how often. Every source is listed in
`CLEAN-ROOM.md` ("Keyman").

## 2. Platforms, layers and rows

| member | home in `.kbl.json` | loss |
|---|---|---|
| root `phone` | a touch layer set with `deviceClass: phone`, no `minDeviceWidth` | — |
| root `tablet` | a touch layer set with `deviceClass: tablet`, `minDeviceWidth: 90` (SPEC §9.4's tablet threshold) | — |
| root `desktop` | none (Keyman does not use it on any platform yet) | `keymantouch.platformDropped` |
| platform `font`, `fontsize`, `displayUnderlying` | none | `keymantouch.presentationDropped` |
| platform `defaultHint` | `longpress`: each key's `hint` is the text of its default (else first) long-press key; `multitap`: of its first multi-tap key; `flick` / `flick-<dir>`: of its first flick clockwise from north / of that flick; `dot` (the default) and `none`: no hint | `keymantouch.presentationDropped` for `dot` |
| `layer[].id` | touch layer `id`: `default` → `base`, others unchanged | — |
| `layer[].id` as a modifier (`shift`, `caps`, `rightalt`, `ctrl`, …; the README's reserved ids) | the layer's `modifiers` (`shift` → `["shift"]`, `caps` → `["caps"]`, `rightalt` → `["altR"]`, `leftctrl-shift` → `["ctrlL","shift"]`, …; `numeric`, `symbol`, `currency` and other ids: none) | — |
| `row[]` | the rows, in order; `row[].id` (a number) is not kept | — |
| a layer whose rows differ in key count | widths as given; SPEC §9.4's widest-row rule is Keyman's own (the README's "standard key width") | — |

A file has no notion of orientation, row heights, a system row (Keyman's bottom row is in the file) or a one-shot
layer (§3, `nextlayer`): each set gets none of them.

## 3. Keys

| member | home in `.kbl.json` | loss |
|---|---|---|
| `id` `U_xxxx[_yyyy…]` | output = those code points | — |
| `id` `K_…` of a character key (`K_A`, `K_1`, `K_QUOTE`, …) | output = what the `.kmn` rules give for that key in the layer's modifier state; imported alone: the US English character of that key in the base or Shift state, as Keyman types it when no rule matches, and nothing on other layers | `keymantouch.noOutput` for a key that gets nothing |
| `id` `T_…` | output = what the `.kmn` rules give; imported alone: none | `keymantouch.noOutput` |
| `id` `K_BKSP`, `K_ENTER`, `K_SPACE`, `K_TAB`, `K_SHIFT`, `K_CAPS`, `K_LOPT` | `function` `backspace`, `enter`, `space` (with output `" "`), `tab`, `shift`, `capsLock`, `nextKeyboard` (K_LOPT is Keyman's globe/menu key) | — |
| `id` `K_ROPT` (hide the keyboard) and other `K_` keys without a character (`K_LCONTROL`, `K_ESC`, arrows, …) | none, except `K_ESC` → `function: escape` | `keymantouch.keyNotExpressible` |
| `text` | `displays.entries` `{ keyId, display }`; a special label `*Shift*`, `*BkSp*`, `*Enter*`, `*Menu*`, `*Tab*`, `*Caps*` stands for the function's symbol and gives no display; other `*…*` labels (`*ZWJ*`, `*AltGr*`, …) no display | `keymantouch.presentationDropped` for the other `*…*` labels |
| `hint` | `hint` | — |
| `nextlayer` | `layerId` (`default` → `base`) | — |
| `layer` (modifier override for the rules) | none | `keymantouch.modifierOverrideDropped` |
| `width` (percent of the standard key) | `width` / 100 | — |
| `pad` (gap to the left, percent) | a `gap` key of width `pad` / 100 before the key | — |
| `sp` `0` | — | — |
| `sp` `1`, `2`, `8` (frame, selected, dead-key styles), `dk` | none (styles only) | `keymantouch.presentationDropped` |
| `sp` `9` (blank), `10` (spacer) | `gap: true` with the key's width | — |
| `sk[]` | `longPressKeyIds`, in order, each subkey a key of its own (its `id`, `text`, `nextlayer`, `hint` as above); `default: true` → `longPressDefaultKeyId` | — |
| `multitap[]` | `multiTapKeyIds` | — |
| the Shift key's built-in double tap (Keyman 15 and later: caps layer) | when the file has a `caps` layer and the `K_SHIFT` key has no `multitap`: `multiTapKeyIds` with a `capsLock` key that switches to `caps` (SPEC §14.4 step 5) | — |
| `flick` (`n`, `ne`, …) | a flick of one-direction segments (SPEC §11.1) | — |
| `font`, `fontsize` | none | `keymantouch.presentationDropped` |

## 4. Importer conventions

1. A touch layout is imported with its keyboard: `convert -from kmn` reads the `.kmn` and the touch layout its
   `&LAYOUTFILE` store names; `convert -from keymantouch` alone gives a file whose outputs are what §3 says without
   rules. `metadata.provenance.format` is `kmn` or `keymantouch`.
2. KeyIds are made from the Keyman id; a Keyman id that types differently on two layers gets one key per layer
   (the layer id in front), so every KeyId has one meaning.
3. A key without `id` and without `sp` 9 or 10 is a gap of its width (it can type nothing).
4. Invalid JSON, or a file the schema of §1 rejects: `keymantouch.malformed`.

## 5. Writing a touch layout

`convert -to keymantouch` (and the `keyman` target when it writes a `.kmn`) writes one platform per touch set:

| `.kbl.json` | touch layout | loss |
|---|---|---|
| touch sets | `phone` and `tablet` by `deviceClass` (derived where absent, `general.deviceClassDerived`); of several sets of one class the one with the smallest `minDeviceWidth` | `keymantouch.setNotExpressible` for the others and for `orientation` |
| touch layers, rows | `layer[]`, `row[]` (`base` → `default`) | — |
| `returnLayerId` | `nextlayer` on every key of the layer that has no `layerId` | — |
| `rowHeights`, `stretch` | none | `keymantouch.geometryDropped` |
| `systemRow: true` | a bottom row written out: `K_LOPT`, the layer-switch key of `targets/androidime.md` §2.1, `K_SPACE`, `K_ENTER` | — |
| key output | `U_` id of its code points; dead keys and markers only through the `.kmn` rules | `keymantouch.outputNeedsRules` when written without a `.kmn` |
| `function` | the `K_` ids of §3, with their special labels | — |
| `gap` | `sp: 10` | — |
| `longPressKeyIds`, `multiTapKeyIds`, flicks | `sk` (with `default`), `multitap`, `flick` | `keymantouch.flickPathDropped` for paths of more than one direction |
| `hint`, `displays` | `hint`, `text` | — |
