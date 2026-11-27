# kbl-spec: the `.kbl.json` keyboard-layout format

`.kbl.json` is an open JSON file format for keyboard layouts. One file holds everything needed to build one
layout: what each key types with each combination of modifier keys, the dead keys (accent keys that change the next
key pressed), and the exact choices a build for each target needs. It is the open format of YAKBD ("Yet Another
KeyBoard layout Designer", https://github.com/yakbd), an open-source keyboard layout designer. People design a
layout once, in this format, and YAKBD turns it into native, installable layouts for each operating system and
keyboard tool, and converts existing layouts from their formats. Its aim is that a custom or minority-language
layout can be made, shared and kept up to date by anyone, on every platform, without depending on a single vendor's
tool.

## Why it exists

Every operating system has its own format for keyboard layouts: on Windows a layout is a small DLL, usually made
from a `.klc` file with Microsoft's Keyboard Layout Creator (MSKLC); macOS uses `.keylayout` files; Linux uses XKB.
Keyboard tools such as Keyman have formats of their own. Each can express things the others cannot, and a layout
made for one is hard to move to another.

The Unicode Common Locale Data Repository (CLDR) has a good keyboard format, CLDR Keyboard 3.0 ([LDML Part
7][ldml]). But a CLDR keyboard describes the layout of a language in a platform-neutral way. It does not say how
to build that layout for a given system: on Windows, which key codes to use, what the DLL is called, how Caps Lock
behaves on each key.

A `.kbl.json` file describes one concrete layout. Its main part is platform-neutral, like CLDR's, and can hold
every piece of data a CLDR 3.0 keyboard holds: the format is a superset of CLDR Keyboard 3.0. Next to it, a section
per target (`targets.*`) holds the choices only that target's build needs. Where that section is silent, a small
set of documented default rules decides, so a program that reads the file needs only the file and this
specification, not someone else's code.

Windows is the first target, and its section can hold every choice a Windows layout DLL or a `.klc` file can
express. That matters most for MSKLC users: MSKLC is no longer developed, runs only on Windows, and its `.klc` files
cannot express everything a layout DLL can do. Sections for the official formats of other operating systems (macOS,
Linux XKB and others) are planned next, and later third-party formats such as Keyman ([`DECISIONS.md`](DECISIONS.md)
D107). D105 checks on paper that macOS and XKB sections fit this format without a breaking change.

Some other choices:

- **Conversions report their losses.** When the tool converts a file to a format that cannot hold all of it, or
  builds it for a platform that cannot do all of it, it lists exactly what was dropped or changed, by kind of loss.
  The file can say, per kind, whether such a loss is an error, a warning or acceptable (its `onLoss` member).
- **Files are self-contained.** The layout data never refers to another file. When a CLDR keyboard uses CLDR's
  shared key data, the tool's CLDR importer copies that data into the `.kbl.json` file.
- **Defaults can be written into the file.** The tool's `pin` command writes the result of every Windows default
  rule into the file. The file then states every choice itself and is a starting point for editing them.

## A small example

This is an excerpt of [`examples/minimal-qwerty.kbl.json`](examples/minimal-qwerty.kbl.json), a short US-QWERTY
layout, reformatted and shortened (`…` marks what is left out). The full file validates against the schema.

```text
{
  "$schema": "https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json",
  "kbl": "0.1",
  "metadata": {
    "id": "en-t-k0-kblmin",
    "name": "Minimal QWERTY (example)",
    "version": "0.1.0",
    "license": "MIT-0",
    …
  },
  "positions": {
    "Escape": { "scanCode": "01", "name": "Esc" },
    "Digit1": { "scanCode": "02" },
    …
  },
  "hardware": {
    "layers": [
      …
      {
        "id": "shift",
        "modifiers": [["shift"]],
        "bindings": { "Digit1": "!", …, "KeyQ": "Q", …, "Space": " ", … }
      },
      …
    ]
  },
  "targets": {
    "windows": {
      "registration": { "langId": "0409" }
    }
  }
}
```

What it shows:

- `metadata.id` is a BCP 47 language tag, the same kind of identifier CLDR uses for its keyboards.
- `positions` names the physical keys (the names of the W3C `KeyboardEvent.code` values) and gives each one the
  scan code the keyboard hardware sends.
- `hardware.layers` lists the layers of a physical keyboard (touch keyboards have their own list). Each layer says
  which modifier sets select it (each inner array is one set of modifiers that must be active together;
  `[["shift"]]` is Shift, and the `base` layer, left out above, has `[[]]`, no modifier) and what each key types there.
- `targets.windows` holds only the Windows language id (`langId`, four hex digits; `0409` is US English).
  Everything else a Windows build needs (Windows key codes, DLL name, flags) comes from the default rules in
  [`targets/windows.md`](targets/windows.md), and the build reports each default it used.

The other files in [`examples/`](examples/) show AltGr and dead keys, a layout imported from CLDR, most Windows
features including installation, and the file the tool writes when it reads an existing layout DLL back.

## Using it

The JSON Schema (draft 2020-12) is [`schema/0.1/kbl.schema.json`](schema/0.1/kbl.schema.json). Its `$id`,
`https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json`, is the address where it is published; you can as well
validate against the file in this repository.
`https://yakbd.github.io/kbl-spec/schema/latest/kbl.schema.json` serves the schema of the newest version, byte for
byte the same file; its `$id` stays the versioned address, because it is that schema. `latest` moves to each new
minor version, so name the versioned address in a file's `$schema` and wherever you need it to stay the same
(`COMPATIBILITY.md`, D106). Any draft 2020-12 validator works, for example:

    npx ajv-cli@5.0.0 validate --spec=draft2020 -s schema/0.1/kbl.schema.json -d my-layout.kbl.json

The schema checks the structure of a file. Some rules relate parts of a file to each other: for example, a key
that names a dead key needs that dead key to be defined in the same file. They are listed in
[`SPEC.md`](SPEC.md) §19 ("Validation rules beyond the schema") and checked by `yakbd validate`.

To convert layouts (`.klc`, CLDR XML, `.kbl.json`) and to compile them into Windows layout DLLs and installers, use
the `yakbd` tool, repository [`yakbd/yakbd-cli`](https://github.com/yakbd/yakbd-cli). Its
README explains how to build it and its commands, for example `yakbd compile layout.kbl.json`.

## Status

This is the **0.1 preview** of the format. It is complete enough to implement and to write layouts in, but not
frozen: [`COMPATIBILITY.md`](COMPATIBILITY.md) says what stays stable in 0.x, how changes are announced, and when
1.0 comes. Windows is the only build target so far. The official formats of other operating systems are planned
next, then third-party formats such as Keyman (D107); each new target comes with a new minor version. Layouts built from these files have been tested on Windows 10 and Windows 11 virtual machines (x64, x86, and
ARM64 in an emulated guest): they load, type as expected, and install and uninstall cleanly. A physical ARM64 PC has
not been tested. Details and the changelog are in [`STATUS.md`](STATUS.md).

## Documents

| document | what it covers |
|---|---|
| [`SPEC.md`](SPEC.md) | the format: every field, what it means, the list of loss kinds, the validation rules |
| [`targets/windows.md`](targets/windows.md) | how a file becomes a Windows layout DLL: the default rules and pinning |
| [`targets/windows-install.md`](targets/windows-install.md) | how a layout is installed, enabled, upgraded and removed on Windows |
| [`coverage/cldr-keyboard3.md`](coverage/cldr-keyboard3.md) | every part of CLDR Keyboard 3.0 and where it goes in `.kbl.json` |
| [`coverage/windows.md`](coverage/windows.md) | everything a Windows layout DLL and a `.klc` file can express, and where it goes |
| [`DECISIONS.md`](DECISIONS.md) | the design decisions, numbered, each with its reason |
| [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) | questions put to the project's owner, with their answers |
| [`COMPATIBILITY.md`](COMPATIBILITY.md) | what 0.x promises and how changes are announced |

## Contributing

Questions, schema bugs and pull requests are welcome; the organisation's
[`CONTRIBUTING.md`](https://github.com/yakbd/.github/blob/main/CONTRIBUTING.md) explains how, including
the clean-room rule every contribution follows. Check a change with `npm ci && npm test` (Node.js 22). The rules
for changing the specification, the schema and the checker, for people and coding agents alike, are in
[`AGENTS.md`](AGENTS.md). YAKBD keeps no catalogue of layouts of its own: the Unicode CLDR collects keyboard
layouts, and layouts for CLDR are best contributed there.

## Licence

MIT-0 (MIT No Attribution), see [`LICENSE`](LICENSE). Third-party material keeps its own licence and is listed in
[`NOTICE`](NOTICE).

[ldml]: https://www.unicode.org/reports/tr35/tr35-keyboards.html
