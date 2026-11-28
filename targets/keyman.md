# Target `keyman`: default rules and pinning (0.3 draft, normative)

How a `.kbl.json` file becomes a Keyman keyboard package: one `.kmp` holding this one keyboard (SPEC §16.10), when
`targets.keyman` is silent. The build writes the sources, a CLDR keyboard 3.0 file and a package source `.kps`, and
Keyman's own compiler `kmc` turns them into the compiled keyboard `.kmx`, its on-screen view `.kvk` and the package.
`kmc` is an outside tool (MIT, npm `@keymanapp/kmc`), never part of a YAKBD tool. Keyman facts are cited as **[KMC]**
(the source of `kmc` at the tag `release@18.0.255` of keymanapp/keyman, recorded in `CLEAN-ROOM.md`, "Keyman"),
**[CHECK]** (measured by the Keyman check of `yakbd/yakbd-cli`, `tools/keyman-check/`: `kmc` 18.0.255, Keyman
Core's LDML test runner and ibus-keyman 18.0.235 on Linux, in containers) or **unmeasured** (§8).

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16): one-line rules, no heuristics, knowingly wrong for many
   layouts. A layout that needs anything else says it in `targets.keyman`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported** as `keymanDefault.<rule>` (SPEC §17.1) with what it decided in
   `detail.value`; policy `accept` by default, `"keymanDefault.*": "error"` makes a file fully explicit.
4. **One layout, one package** (D150): every build takes one `.kbl.json` file and writes one package with one
   keyboard.
5. **The source is the CLDR writer's** (D190). The keyboard source is what the CLDR conversion of SPEC §16.3 writes
   for a Keyman copy of the layout (§3), so the CLDR losses of that conversion are this build's losses too, with
   their `cldr.*` kinds; `targets.keyman.onLoss` decides them for this build (SPEC §17.2, rule 1).
6. **Desktop Keyman only** (D193). `kmc` 18 compiles a CLDR keyboard into a `.kmx` and a `.kvk` and writes no
   KeymanWeb keyboard (`.js`) **[KMC]** **[CHECK]**, which Keyman for Android, iOS and the web load. So the package
   runs on Keyman for Windows, macOS and Linux, and every build says so (`keyman.desktopOnly`, accept). The touch
   layer sets and flicks of the file are not part of it (`keyman.touchNotCompiled`). Route `kmn` (§9) is the second
   source kind for those platforms, Keyman's own keyboard language with a touch layout, compiled by the same `kmc`.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `keyboardId` | `yakbd_` + slug of `metadata.id`: lower case, each run of characters other than `a`–`z` and `0`–`9` becomes one `_`, no `_` at the start or end | `keyboardId` | 5 |
| `packageId` | the keyboard id | `packageId` | 5 |
| `name` | `metadata.name` | `name` | 5 |
| `version` | the leading one, two or three dot-separated integers of `metadata.version`, padded with `.0` to three; `1.0.0` when it has none | `version` | 3 |
| `copyright` | `metadata.copyright`; without it the package has no copyright line | `copyright` | 5 |
| `languages` | the tag of `metadata.id` up to its first singleton subtag (`-t-`, `-u-`, `-x-`, …), then each of `metadata.locales` the same way, without repeats | `languages` | 5 |
| `form` | `abnt2` when the hardware layers bind `IntlBackslash` and `IntlRo`; else `jis` when they bind `IntlRo` or `IntlYen`; else `iso` when they bind `IntlBackslash`; else `us` | `hardware.formId` | 2 |
| `kmcVersion` | `18.0.255` | `kmcVersion` | 6 |
| `route` | `kmn` when the file has touch layer sets, else `ldml` | `route` (or the command line's `-route`) | 9 |

**Slug.** `fo-FO` gives `yakbd_fo_fo`, `und-Latn-t-k0-kbldemo` gives `yakbd_und_latn_t_k0_kbldemo`. The prefix keeps
the keyboard clear of the ids of Keyman's own keyboard repository, under which an installed keyboard is known.
**Ids.** `kmc` warns about a package whose name is not lower case letters, digits and `_` or starts with a digit
(KM0400E) **[KMC]**; the keyboard id is the base name of the `.kmx`, which Keyman installs and lists the keyboard by
**[CHECK]**. Both fields follow that pattern (SPEC §16.10).
**Integers** of `version` are written without leading zeros (`01.2` gives `1.2.0`).

## 2. Position table

This target has no position table of its own. The CLDR source names keys by the rows of a form (SPEC §6.2), and
`kmc` maps each scan code of the form to a Keyman virtual key by a fixed table of its own **[KMC]**: the scan codes of
the alphanumeric block (positions `Backquote` to `Slash` of the form `us`), `Space`, and `0x56`, `0x73` and `0x7D`
(`IntlBackslash`, `IntlRo`, `IntlYen`; `IntlBackslash` and `IntlYen` get the same virtual key). A form with any other
scan code is refused (KM00009) **[KMC]**. So the forms of CLDR's implied set (`us`, `iso`, `abnt2`, `jis`, `ks`) are
the forms this target writes.

- **`form`**: the form is `hardware.formId` when the file gives one, or when the file defines forms (the CLDR
  writer's choice, SPEC §16.3); otherwise the rule `form` (§1) picks the smallest implied form that holds the
  positions `IntlBackslash`, `IntlRo` and `IntlYen` the layout binds.
- **Control characters.** Every binding that types one control character (U+0000–U+001F, U+007F; what a `.klc`
  import gives Backspace, Tab, Enter, Escape and `Break`, and Control+letter in its Control layer) is left out, on
  any position: the system does those keys itself, and a Control shortcut reaches the application instead of a
  control character. One `keyman.controlKeyLeftOut` entry (accept) lists the positions. Besides, Keyman for Linux
  18 cannot install a package whose on-screen view (`.kvk`) holds a control character (its installer stops with
  "All strings must be XML compatible") **[CHECK]**.
- **Positions outside the form** are left out of the source, with all their other bindings, before it is written:
  Keyman has no key for them and leaves them to the system, which does what it does without a Keyman keyboard (Return
  ends every typed case of the check **[CHECK]**; the number pad follows the system's Num Lock). Each such position with a binding left is
  `keyman.positionUnreachable` (warning), one entry per position: the number pad of a layout whose decimal key types
  `,`, function keys, `IntlBackslash` in a `jis` form. The CLDR writer then never reports `cldr.positionNotInForm`
  for a binding.

## 3. Keyboard source

The keyboard source `source/<keyboardId>.xml` is the CLDR keyboard file (SPEC §16.3) of a **Keyman copy** of the
layout, which differs from the layout as follows (D191). The layout itself is not changed.

| in the copy | why | reported as |
|---|---|---|
| no kbl `<special>` element (`targets.cldr.carryInSpecial` false) and no `cldrSpecial` strings | `kmc` 18's schema of the file refuses every `<special>` element with content (KM01001) **[KMC]** **[CHECK]** | `general.extensionDropped` (accept), for `cldrSpecial` strings; the kbl data the element would carry is reported by its own CLDR kinds |
| no `draft` and no `attribution` | `kmc` refuses `keyboard3/@draft` and `info/@attribution` (KM01001) **[CHECK]** | `general.metadataDropped` (accept), `detail.fields` |
| `version` of rule `version` | `kmc` wants `major.minor.patch` (KM0000D) **[KMC]** | `keymanDefault.version` |
| `name` of rule `name` | the keyboard's name in Keyman | `keymanDefault.name` |
| `hardware.formId` of rule `form`, positions outside it and control-character bindings left out | §2 | `keymanDefault.form`, `keyman.controlKeyLeftOut`, `keyman.positionUnreachable` |
| no touch layer sets and no flicks; the keys only touch layers use are left out (with their display entries), and the others lose their touch members (`flickId`, long-press and multi-tap ids, `hint`, the function `nextKeyboard`) | §0, item 6; `kmc` checks every key a gesture names (KM0000B) **[KMC]** | `keyman.touchNotCompiled` (warning) |
| `description` and `copyright` moved to the package | the `.kps` holds them (§5) | not a loss |
| no `targets` other than `cldr` (`conformsTo` and `locale` kept), no `onLoss` | build choices, not keyboard data | not a loss |

The other CLDR losses (custom modifiers, the Windows-only settings, generated key ids, …) are reported by the CLDR
writer with their `cldr.*` kinds and their default policies (SPEC §17.3), under this target's policy (§0, item 5).
A file without hardware layers has nothing to build: `keyman.noHardwareLayers` (error).

Messages `kmc` gives for a correct source and that are not errors: KM00001 (normalisation disabled is not
recommended), KM00008 (a locale that is not minimal), KM0002B (a string neither NFC nor NFD) **[CHECK]**. They are
printed, not reported.

## 4. Dead keys and transforms

Dead keys and transforms are those of the CLDR source (SPEC §16.3: dead keys become markers and transforms), and
Keyman Core runs them as CLDR specifies **[CHECK]** (the CLDR test files of five CLDR keyboards, round-tripped
through the CLDR writer, pass Keyman Core's own LDML test runner). Nothing here adds to SPEC §16.3.

## 5. Files and installation

`compile -target keyman` writes one folder `<keyboardId>/`, in the layout Keyman's own project template uses:

| file | what |
|---|---|
| `source/<keyboardId>.xml` | the keyboard source (§3) |
| `source/<packageId>.kps` | the package source: `Info` with `Name` (rule `name`), `Version` (rule `version`), `Copyright` (rule `copyright`, left out when empty), `Author` (`metadata.authors` names, joined with `, `), `Description` (`metadata.description`); `Files` with `../build/<keyboardId>.kmx` and `../build/<keyboardId>.kvk`; one `Keyboard` with `Name`, `ID` (rule `keyboardId`), `Version` and `Languages` (rule `languages`) |
| `build/<keyboardId>.kmx`, `build/<keyboardId>.kvk` | written by `kmc build source/<keyboardId>.xml` |
| `build/<packageId>.kmp` | written by `kmc build source/<packageId>.kps`: a zip holding the `.kmx`, the `.kvk` and Keyman's package description `kmp.json` **[KMC]** |

A tool runs `kmc` when it can and otherwise writes the sources and prints the two `kmc` commands. `kmc` runs with
`--no-error-reporting`, so no error report leaves the builder's machine. When `kmc` fails, the build reports
`keyman.compilerRejected` with `kmc`'s error messages and writes nothing.

**Installation**: the `.kmp` is installed with Keyman's own installer on each platform (Keyman Configuration on
Windows and macOS; `km-package-install` on Linux, then the keyboard is selected in the input-method settings:
ibus engines are listed by the installed `.kmx`, `…/<packageId>/<keyboardId>.kmx`) **[CHECK]** for Linux, unmeasured
for Windows and macOS. Nothing is signed: Keyman packages carry no signature.

## 6. Pinning

`pin` is not offered yet; every rule's choice can be written into `targets.keyman` by hand. `kmcVersion` names the
`kmc` a layout was tested with: when a build runs `kmc` and `kmc --version` says another version, it reports
`keyman.kmcVersionUntested` (warning) and builds. The default `18.0.255` is the version this page was measured with.

## 7. Carried, not compiled

- Touch layer sets, flicks, long-press and multi-tap: not in the package (`keyman.touchNotCompiled`). Keyman's own
  keyboard language (`.kmn`) with a touch layout (`.keyman-touch-layout`), which `kmc` compiles to the KeymanWeb
  keyboard of Keyman for Android, iOS and the web, is the second source kind (format `kmn`, SPEC §16.11); when this
  target builds from it, the package holds that keyboard too. Keyman announces CLDR keyboards on those platforms for
  a later Keyman version (19 is in beta; unmeasured).
- The kbl data of the CLDR `<special>` element (`targets.*`, `onLoss`, the 0.3 touch members) is not carried; the
  `.kbl.json` file is the source of truth.

## 8. Measured and unmeasured (informative)

Measured with `kmc` 18.0.255 and Keyman for Linux (ibus-keyman 18.0.235, Debian) **[CHECK]**:
- the CLDR writer's output as it stood before this target was refused by `kmc` for every layout (the kbl
  `<special>`), and built after the changes of §3;
- the package installs with `km-package-install`, the keyboard is selected as an ibus engine and types the
  layout's expected text from key codes, in a GTK window under Xvfb; positions outside the form do what the
  system does with them (the check's X server starts with Num Lock off, so its number pad navigates); a run of nine
  layouts typed 1032 of 1072 cases, the rest being the limits named here and on the cases' own files;
- `IntlRo` (the key left of the right Shift on JIS and ABNT2 keyboards) types nothing on Linux: ibus-keyman maps no
  virtual key to its key code. The build does not report it; it is a limit of Keyman for Linux 18.

Unmeasured: Keyman for Windows and macOS (the same `.kmp`); `IntlYen`; a file's own form; Wayland and fcitx5.

## 9. Route `kmn`: Keyman's keyboard language (0.3)

With `route` `kmn` (rule `route`: when the file has touch layer sets) the build writes, instead of the CLDR keyboard,
a keyboard source in Keyman's own language and, with touch sets, its touch layout, as `convert -to kmn` writes them
(`coverage/kmn.md` §5, `coverage/keymantouch.md` §5; their `kmn.*` and `keymantouch.*` kinds are this build's
losses). `kmc` compiles the source to a `.kmx` (desktop Keyman) and, with a touch layout, to a KeymanWeb `.js`
(Keyman for Android, iOS and the web); the package holds both, one keyboard (D150). `keyman.desktopOnly` and
`keyman.touchNotCompiled` are not reported on this route; `keyman.noHardwareLayers` is not either (a touch-only layout
is a mobile keyboard; on a hardware keyboard Keyman types US English, `kmn.passThroughKeys`). The package rules of
§1 (ids, name, version, copyright, languages, `kmcVersion`) are the same on both routes.

Why every behaviour is written out (D251): a key without a rule types its US English character in Keyman, a pending
deadkey is passed over by a key without a matching rule, and a `T_` key on a layer carries that layer's modifiers.
The model's meaning differs on each point, so the source states it: `nul` where the layout types nothing, the
dead key's `noMatch` per key, the rules of a touch key per layer with that layer's modifiers.

Measured **[CHECK]** (`tools/keyman-check`, touch venue: KeymanWeb 18.0.255 in headless Chromium under phone
emulation, touch events at the keys' rectangles): a layout written by this route types its expected text by touch,
dead key, its noMatch and Backspace cancelling it, and a one-shot Shift layer included. Unmeasured: the `.js` in
Keyman for Android and iOS themselves, long-press, flicks and multi-tap (not driven), the hardware rules of this
route on desktop Keyman.
