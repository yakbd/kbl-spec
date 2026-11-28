# kbl-spec

**The `.kbl.json` keyboard-layout format.** One open JSON file describes a keyboard layout and every choice its
builds need; the [YAKBD](https://yakbd.github.io/) tools turn it into installable layouts and convert it to and from
other keyboard formats. The format is a superset of Unicode CLDR Keyboard 3.0.

| target | in the format |
|---|---|
| Windows (layout DLL, `.klc`) | 0.1, released |
| macOS (`.keylayout` bundle) | 0.2 preview, released |
| Linux (XKB and Compose, Wayland and X11) | 0.2 preview, released |
| Android (physical keyboards; on-screen keyboard) | 0.3 draft |
| iOS (on-screen keyboard) | 0.3 draft |
| ChromeOS (input-method extension) | 0.3 draft |
| Keyman (`.kmp` package; `.kmn` and touch layouts) | 0.3 draft |

0.3 also adds touch layers (rows, key sizes, long-press, multi-tap, flicks) and reads `.kcm`, `.kmn`, Keyman touch
layouts and kbdgen bundles. It is a draft on the branch `spec-0.3` until it is tagged.

## Documentation

The documentation is on the website:

- [The format: why, an example, validating a file](https://yakbd.github.io/spec/)
- [Specification](https://yakbd.github.io/spec/format)
- Target builds: [Windows](https://yakbd.github.io/spec/windows), [macOS](https://yakbd.github.io/spec/macos),
  [Linux (XKB)](https://yakbd.github.io/spec/xkb), [Android](https://yakbd.github.io/spec/android),
  [Android on-screen](https://yakbd.github.io/spec/androidime), [iOS](https://yakbd.github.io/spec/ios),
  [ChromeOS](https://yakbd.github.io/spec/chromeos), [Keyman](https://yakbd.github.io/spec/keyman)
- [Compatibility and versions](https://yakbd.github.io/spec/compatibility) ·
  [status and changelog](https://yakbd.github.io/spec/status)
- [Design decisions](https://yakbd.github.io/spec/decisions)

The JSON Schema is in [`schema/`](schema/), published at
`https://yakbd.github.io/kbl-spec/schema/0.2/kbl.schema.json` (0.1 at `.../schema/0.1/`, the newest version also
at `.../schema/latest/`), and [`examples/`](examples/) holds sample layouts.

## Contributing

See [Contributing](https://yakbd.github.io/contributing). Check a change with `npm ci && npm test` (Node.js 22);
the rules for changing the specification, the schema and the checker are in [`AGENTS.md`](AGENTS.md).

## Licence

MIT-0, see [`LICENSE`](LICENSE). Third-party material keeps its own licence and is listed in [`NOTICE`](NOTICE).
