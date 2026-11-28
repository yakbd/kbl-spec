# Target `xkb`: default rules and pinning (0.2 draft, normative)

How a `.kbl.json` file becomes a Linux XKB layout (XKB symbols and a Compose file, for Wayland and X11) when `targets.xkb` (SPEC §16) is silent. To be written with
the target; until then this page has its headings only.

## 0. Principles

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `symbolsName` | symbols file and layout name: `yakbd-` + slug of `metadata.id` | `symbolsName` | 5 |
| `variant` | no variant: the one section is `basic`, the file's default | `variant` | 5 |
| `description` | `metadata.name` | `description` | 5 |
| `shortDescription` | the language subtag of `metadata.id` | `shortDescription` | 5 |
| `characters` | `keysyms`: keysym names and `U` keysyms | `characters` | 3 |
| `keyName` | key name per position from `targets/xkb-default-keyname.tsv` | `keys.<p>.keyName` | 2 |
| `levelThree` | `altR` is the level-3 shift (Right Alt, AltGr) | `modifiers.levelThree` | 3 |
| `keyType` | per key, the first stock type of §3 that gives every state its output; else the closest one (or a yakbd type with `customTypes`) | `keys.<p>.type`, `customTypes` | 3 |
| `deadKeysym` | `dead_` + the dead key's id when that is a dead keysym; else by its `spacing` (§4 table); else the first free spare keysym | `deadKeys.<id>.keysym` | 4 |
| `compose` | a Compose file when the file has dead keys, beginning with `include "%L"` | `compose` | 4 |

## 2. Position table

The default table from position names to the target's XKB key names: `targets/xkb-default-keyname.tsv` (SPEC §16, "Position tables").

## 3. Modifiers and layers

## 4. Dead keys

How the dead-key model of SPEC §10 and §14.2 becomes XKB `dead_*` keysyms and Compose sequences (SPEC §14.2, "One model, every target").

## 5. Files and installation

## 6. Pinning

## 7. Carried, not compiled
