# kbl-spec

**The `.kbl.json` keyboard-layout format.** One open JSON file describes a keyboard layout and every choice its
builds need; the [YAKBD](https://yakbd.github.io/) tools turn it into installable layouts and convert it to and from
other keyboard formats. The format is a superset of Unicode CLDR Keyboard 3.0.

| target | in the format |
|---|---|
| Windows (layout DLL, `.klc`) | 0.1, released |
| macOS (`.keylayout` bundle) | 0.2, draft |
| Linux (XKB and Compose, Wayland and X11) | 0.2, draft |
| Android, iOS, ChromeOS, Keyman | planned |

## Documentation

The documentation is on the website:

- [The format: why, an example, validating a file](https://yakbd.github.io/spec/)
- [Specification](https://yakbd.github.io/spec/format)
- Target builds: [Windows](https://yakbd.github.io/spec/windows), [macOS](https://yakbd.github.io/spec/macos),
  [Linux (XKB)](https://yakbd.github.io/spec/xkb)
- [Compatibility and versions](https://yakbd.github.io/spec/compatibility) ·
  [status and changelog](https://yakbd.github.io/spec/status)
- [Design decisions](https://yakbd.github.io/spec/decisions)

The JSON Schema is in [`schema/`](schema/) (0.1 is published at
`https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json`; 0.2 is a draft and not published yet), and
[`examples/`](examples/) holds sample layouts.

## Contributing

See [Contributing](https://yakbd.github.io/contributing). Check a change with `npm ci && npm test` (Node.js 22);
the rules for changing the specification, the schema and the checker are in [`AGENTS.md`](AGENTS.md).

## Licence

MIT-0, see [`LICENSE`](LICENSE). Third-party material keeps its own licence and is listed in [`NOTICE`](NOTICE).
