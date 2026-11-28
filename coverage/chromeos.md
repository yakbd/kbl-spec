# Coverage: ChromeOS input-method extensions

What a ChromeOS input-method extension holds, with its home in `.kbl.json` (target `chromeos`, `targets/chromeos.md`).
The build direction only: **there is no importer**. A ChromeOS input method is an extension whose behaviour is its
own JavaScript; the layout is whatever that code does with key events, not data a converter can read. A program can
only be run, not read back into layers, dead keys and transforms, so `convert` has no `chromeos` input. (The
extension that `yakbd` writes keeps the layout as data in `layout.js`, but that form is the tool's, and the
`.kbl.json` it was built from is the source to keep.)

## 1. Sources

The Chrome extension documentation (`CLEAN-ROOM.md`, "ChromeOS"): the `chrome.input.ime` reference ("This API works
only on ChromeOS"), the manifest pages `input_components`, `name`, `version` and `description`, the extension
service-worker lifecycle and `chrome.storage`. No extension's code was copied.

## 2. Manifest

| manifest member | home in `.kbl.json` |
|---|---|
| `name` (at most 75 characters) | `targets.chromeos.name` (rule `name`: `metadata.name`) |
| `version` (one to four integers 0–65535) | `targets.chromeos.version` (rule `version`: from `metadata.version`) |
| `version_name` | not written (`metadata.version` goes into `version` where it fits) |
| `description` (at most 132 characters) | `targets.chromeos.description` (rule `description`) |
| `permissions` `input`, `storage` | fixed (the runtime's) |
| `background.service_worker` | fixed (`background.js`, the runtime) |
| `minimum_chrome_version` | fixed (`111`) |
| `input_components[0].name` | `targets.chromeos.name` |
| `input_components[0].id` | `targets.chromeos.engineId` |
| `input_components[0].language` | `targets.chromeos.language` |
| `input_components[0].layouts` | `targets.chromeos.systemLayout` |
| `input_components[0].input_view`, `options_page` | not written (no own on-screen keyboard in 0.3: `general.touchDropped`) |
| more `input_components` entries | never (one layout, one input method; D150) |
| `icons`, `default_locale`, `_locales` | not written (localised names: `general.metadataDropped`) |

## 3. Key events

| `chrome.input.ime` | what the runtime does with it |
|---|---|
| `onKeyEvent` `code` | the position, through `targets.chromeos.keys.<p>.code` or `targets/chromeos-default-code.tsv` |
| `shiftKey`, `capsLock`, `ctrlKey`, `altKey`, `altgrKey` | the modifier state (SPEC §7.3), with the left and right keys seen (`targets/chromeos.md` §3) |
| `key` | never read, except for Num Lock on `numLock` positions |
| return `true` / `false`, `keyEventHandled` | handled or passed through (`targets/chromeos.md` §3) |
| `commitText` | final text (key outputs, dead-key results, transform results) |
| `setComposition`, `clearComposition` | the pending dead key and the transform context (`targets/chromeos.md` §4) |
| `onFocus`, `onBlur`, `onReset` | the text field's context id; clear the context and the pending dead key |
| `deleteSurroundingText`, `onSurroundingTextChanged`, `sendKeyEvents` | not used: the context is the runtime's own composition |
| candidates, menus, assistive window | not used |
