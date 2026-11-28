# Target `ios`: default rules and pinning (0.3 draft, normative)

How a `.kbl.json` file becomes an iOS on-screen keyboard: one app with one keyboard extension for this one layout
(SPEC §16.8), when `targets.ios` is silent. The build compiles the layout into a touch runtime file
(`targets/touch-runtime.md`) and writes a folder with the YAKBD runtime's sources, that file and an Xcode project for
the app and its extension; a Mac with Xcode builds it, and the builder signs it with their own Apple team. This target
has no position table: touch keys are KeyIds (SPEC §16), and it compiles only the touch layers. iOS facts are cited
as **[APL]** (Apple's public developer documentation, recorded in `CLEAN-ROOM.md`, "iOS") or **unmeasured** (this
specification's choice, the iOS behaviour behind it not yet measured; §7).

## 0. Principles

1. **The rules are few, fixed and mechanical** (D16), knowingly wrong for many layouts; a layout that needs anything
   else says it in `targets.ios`.
2. **Every rule can be overridden** by the field named in its row; the field always wins.
3. **Every use of a rule is reported** as `iosDefault.<rule>` (SPEC §17.1) with its value in `detail.value`; policy
   `accept` by default, `"iosDefault.*": "error"` makes a file fully explicit.
4. **One layout, one app** (D150): every build takes one `.kbl.json` file and writes one app with one keyboard
   extension, the layout embedded in it. The extension does not ask for full access.
5. What the touch model says is compiled as the touch runtime file can say it; the rest is a loss of SPEC §17.3.

## 1. Rule index

| rule | decides | overridden by | § |
|---|---|---|---|
| `appName` | `metadata.name` | `appName` | 4 |
| `bundleId` | `org.yakbd.keyboard.` + slug of `metadata.id` | `bundleId` | 4 |
| `extensionBundleId` | `bundleId` + `.extension` | `extensionBundleId` | 4 |
| `language` | the language subtag of `metadata.id` | `language` | 4 |
| `bundleVersion` | the leading `a`, `a.b` or `a.b.c` digits of `metadata.version`; `1.0` if there are none | `bundleVersion` | 4 |
| `touchFromHardware` | a file without touch layer sets gets one, derived from its hardware layers, as `targets/androidime.md` §2.2 | `touch` in the file | 2 |
| `systemRow` | the bottom row of a set with `systemRow`: `layerSwitch`, `nextKeyboard`, `space`, `enter`, as `targets/androidime.md` §2.1 | `systemRow` | 2 |
| `nextKeyboardKey` | a layer of a set without `systemRow` that places no key with `function` `nextKeyboard` gets one (width 1) at the start of its last row | a `nextKeyboard` key in the layer | 2 |
| `returnKeyLabels` | `default` ⏎ (U+23CE), `go` Go, `google` Google, `join` Join, `next` Next, `route` Route, `search` Search, `send` Send, `yahoo` Yahoo, `done` Done, `emergencyCall` Emergency, `continue` Continue | `returnKeyLabels` (per action) | 2 |
| `popupColumns` | 8 | `popupColumns` | 2 |

**Slug** (rule `bundleId`): as in `targets/macos.md` §1 (lower case, every run of characters outside `a`–`z`, `0`–`9`
replaced by one `-`, leading and trailing `-` removed, `layout` if nothing is left): `fo-t-k0-windows` →
`org.yakbd.keyboard.fo-t-k0-windows`. A bundle identifier is letters, digits, hyphens and dots **[APL]**. An app
extension's bundle identifier must begin with its app's identifier and a dot, or the app does not install **[APL]**:
a file whose `extensionBundleId` does not reports `ios.extensionBundleIdNotPrefixed` (an error).

**Who owns a bundle id.** An App ID is registered by an Apple developer team; a team registers the ids of the apps it
signs. An organisation publishing keyboards sets its own reverse-DNS `bundleId`; the default `org.yakbd.keyboard.`
ids are for one's own builds and tests. The Apple team id is the builder's: it is an option of the build,
never part of the layout file.

## 2. Touch layout

The touch layer sets are compiled as `targets/touch-runtime.md` §2–§3 say; the runtime chooses the set by width and
orientation (an iPad counts about a fifth narrower than it is, §2.1 there: a set meant for iPads only should use a
`minDeviceWidth` of at most 100).

- **System row** (rule `systemRow`): as `targets/androidime.md` §2.1.
- **Next-keyboard key** (rule `nextKeyboardKey`). iOS asks a custom keyboard to offer a key that switches to the next
  keyboard whenever `needsInputModeSwitchKey` is true **[APL]**, and App Review expects one. A layer of a set without
  `systemRow` that has none gets one at the start of its last row; the runtime hides it when the system does not ask
  for it (`targets/touch-runtime.md` §3.2).
- **A touch layout from the hardware layers** (rule `touchFromHardware`): as `targets/androidime.md` §2.2, with
  `ios.layerNotDerived` and `ios.noTouchLayout`. A file with touch sets and hardware layers builds its touch sets
  only: `ios.hardwareDropped` (iOS keyboard extensions do not serve physical keyboards **[APL]**).
- **Return key**: the label is `returnKeyLabels` for the field's `returnKeyType` **[APL]**; the key inserts U+000A.
- **Popups**: long-press choices, `popupColumns` per row, are drawn inside the keyboard's own view; an extension
  cannot draw above it **[APL]**.
- **Escape**: a keyboard extension cannot send Escape; a key with `function` `escape` and no output does nothing
  (`ios.functionNotSupported`).
- **Fields iOS keeps for its own keyboard**: secure text fields and phone-pad fields always get the system keyboard
  **[APL]**; nothing the file can change.

## 3. Dead keys and transforms

`deadKeys` and the machine of SPEC §14.2 are compiled unchanged into the touch runtime file and run by the runtime on
the text it inserts through the text document proxy (`insertText`, `deleteBackward`; `targets/touch-runtime.md` §4).
Every part of the model is kept; a pending dead key shows nothing in the field. Transforms run as literal rules on
the runtime's own context, seeded from the proxy's text before the insertion point (§5 there):
`ios.transformNotCompiled`, `ios.tooManyMarkers` as for Android. With normalisation enabled, outputs are normalised
at build time only (`general.normalizationNotApplied`).

## 4. Files and installation

- **Input:** one `.kbl.json` file and a runtime source folder (`-runtime <dir>`) whose manifest
  (`yakbd-runtime.json`, `targets/touch-runtime.md` §7) lists the touch runtime version the build writes.
- **Output:** a folder `<name>-ios/` with the runtime's sources, the touch runtime file at the manifest's
  `layoutPath`, and an Xcode project: an app (`CFBundleDisplayName` `appName`, `CFBundleIdentifier` `bundleId`) that
  embeds one keyboard extension (`CFBundleDisplayName` `appName`, `CFBundleIdentifier` `extensionBundleId`,
  `NSExtensionPointIdentifier` `com.apple.keyboard-service`, `NSExtensionAttributes` with `PrimaryLanguage`
  `language` and `RequestsOpenAccess` false) **[APL]**; both with
  `bundleVersion`. The team id, when the builder gives one, is written into the project's signing settings.
- **What a builder needs** **[APL]**: a Mac with Xcode. Without an Apple account: build and run in the simulator.
  With a free Apple ID: install on one's own devices, valid for 7 days. With a paid Apple Developer Program
  membership: TestFlight, the App Store, and installs that do not expire; each builder under their own team.
- **Enable and select** (**unmeasured**, §7): Settings → General → Keyboard → Keyboards → Add New Keyboard → the
  app's keyboard; then the globe key switches to it.

## 5. Pinning

`yakbd pin -target ios` writes into `targets.ios` the value of every rule that has a field: `appName`, `bundleId`,
`extensionBundleId`, `language`, `bundleVersion`, `systemRow`, `returnKeyLabels`, `popupColumns`; rule
`touchFromHardware` pins as on Android (`targets/androidime.md` §6); rule `nextKeyboardKey` pins by writing the key
(id `hw.nextKeyboard`, `function` `nextKeyboard`) into the layers' rows.

## 6. Carried, not compiled

The hardware layers when touch sets exist (`ios.hardwareDropped`); touch layer `modifiers`; `deviceClass`; flick paths
of more than one direction (`ios.flickPathDropped`); `tests`, `extensions`, `cldrSpecial` (`general.testsDropped`,
`general.extensionDropped`).

## 7. Measured and unmeasured (informative)

Not yet measured, for the simulator cases of the runtime (GitHub's macOS runners, unsigned builds): the app with its
extension builds without signing and installs in the simulator; the keyboard is enabled headless (the
`AppleKeyboards` preference of the simulated device) and reached with the globe key; taps on the keys, found by their
accessibility identifiers (placement ids), type the expected text into a text field of the test app; the
next-keyboard key follows `needsInputModeSwitchKey`. What waits for an Apple account: installs on devices beyond 7
days, TestFlight, the App Store.
