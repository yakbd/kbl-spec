// The touch runtime file and the runtime manifest, in zod 4 (targets/touch-runtime.md is the normative text). This
// file is the source of schema/touch-runtime/<N>/touch-runtime.schema.json and
// schema/touch-runtime/runtime-manifest.schema.json (`npm run gen` writes them with the .kbl.json schemas).
//
// The touch runtime file is not a .kbl.json file: `yakbd compile -target androidime|ios` writes it from one layout and
// embeds it in the app it builds; the on-screen keyboard runtimes read it. Its version is the integer `touchRuntime`,
// independent of the format version (D200). Conventions as in src/schema.ts: every object strict, every exclusive
// choice a z.xor, every schema and property with a description.

import * as z from "zod";

/** The touch runtime file versions this source generates. */
export const touchRuntimeVersions = [1] as const;
export type TouchRuntimeVersion = (typeof touchRuntimeVersions)[number];

export const touchRuntimePath = (n: TouchRuntimeVersion) => `schema/touch-runtime/${n}/touch-runtime.schema.json`;
export const touchRuntimeId = (n: TouchRuntimeVersion) =>
  `https://yakbd.github.io/kbl-spec/schema/touch-runtime/${n}/touch-runtime.schema.json`;
export const manifestPath = "schema/touch-runtime/runtime-manifest.schema.json";
export const manifestId = "https://yakbd.github.io/kbl-spec/schema/touch-runtime/runtime-manifest.schema.json";

const Targets = z.enum(["androidime", "ios"]).meta({ description: "The build target: androidime or ios." });

const Str = z.string().meta({
  description:
    "Text: a JSON string of Unicode scalar values; markers are the noncharacters U+FDD0-U+FDEF (targets/touch-runtime.md §5).",
});

const RId = z
  .string()
  .regex(/^[^\s,]{1,72}$/u)
  .meta({ id: "RuntimeId", description: "A KeyId, LayerId or DeadKeyId of the runtime file (targets/touch-runtime.md §3)." });

const Fraction = z.number().min(0).max(1);

const Input = z
  .xor([
    z
      .strictObject({ text: Str.meta({ description: "Text to emit; empty: an explicit nothing (swallow the event)." }) })
      .meta({ description: "Emit text." }),
    z.strictObject({ deadKey: RId.meta({ description: "The dead key pressed." }) }).meta({ description: "A dead key." }),
    z
      .strictObject({
        action: z
          .enum(["backspace", "enter", "escape", "nextKeyboard"])
          .meta({ description: "backspace action, the field's Return action, Escape, or switch to the next keyboard." }),
      })
      .meta({ description: "An action without text." }),
  ])
  .meta({ id: "Input", description: "What a key press feeds into the dead-key machine (targets/touch-runtime.md §4)." });

const DeadIn = z
  .xor([
    z.strictObject({ text: Str.meta({ description: "Text; U+0008 alone is the backspace action." }) }).meta({
      description: "Text.",
    }),
    z.strictObject({ deadKey: RId.meta({ description: "A dead key." }) }).meta({ description: "A dead key." }),
  ])
  .meta({ id: "DeadIn", description: "A dead-key entry's base or result (SPEC §10)." });

const Direction = z
  .enum(["n", "ne", "e", "se", "s", "sw", "w", "nw"])
  .meta({ description: "A flick direction." });

const Key = z
  .strictObject({
    label: Str.meta({ description: "The key cap text; absent: the runtime's own symbol for `function`, else nothing." }).optional(),
    hint: Str.meta({ description: "Small secondary label (SPEC §8 hint)." }).optional(),
    function: z
      .enum(["backspace", "enter", "tab", "escape", "shift", "capsLock", "space", "nextKeyboard"])
      .meta({ description: "The key's identity, for its symbol and for hiding next-keyboard keys (SPEC §8)." })
      .optional(),
    input: Input.meta({ description: "What pressing the key feeds in; absent: only the layer switch." }).optional(),
    layer: RId.meta({ description: "Switch to this layer of the current set after the input." }).optional(),
    longPress: z
      .array(RId.meta({ description: "A key of `keys`." }))
      .min(1)
      .meta({ description: "Long-press choices, in order." })
      .optional(),
    longPressDefault: z
      .int()
      .min(0)
      .meta({ description: "Index into `longPress` of the preselected choice; absent: none." })
      .optional(),
    multiTap: z
      .array(RId.meta({ description: "A key of `keys`." }))
      .min(1)
      .meta({ description: "Keys pressed by the 2nd, 3rd, ... quick tap." })
      .optional(),
    flicks: z
      .array(
        z
          .strictObject({
            direction: Direction,
            key: RId.meta({ description: "The key a flick in that direction presses." }),
          })
          .meta({ description: "One flick." }),
      )
      .min(1)
      .meta({ description: "One-direction flicks." })
      .optional(),
  })
  .meta({ id: "RuntimeKey", description: "A resolved key (targets/touch-runtime.md §3)." });

const Placement = z
  .strictObject({
    id: z
      .string()
      .regex(/^[^\s,]{1,72}(#[0-9]{1,3})?$/u)
      .meta({ description: "Placement id: the KeyId, or KeyId#n for its n-th place in the layer (n >= 2)." }),
    key: RId.meta({ description: "The key of `keys` placed here." }),
    x: Fraction.meta({ description: "Left edge, as a fraction of the keyboard width." }),
    w: Fraction.meta({ description: "Width, as a fraction of the keyboard width." }),
  })
  .meta({ id: "Placement", description: "One key in a row." });

const Row = z
  .strictObject({
    y: Fraction.meta({ description: "Top edge, as a fraction of the keyboard height." }),
    h: Fraction.meta({ description: "Height, as a fraction of the keyboard height." }),
    keys: z.array(Placement).meta({ description: "The keys of the row, left to right; gaps are not placed." }),
  })
  .meta({ id: "Row", description: "One row of a layer." });

const Layer = z
  .strictObject({
    id: RId.meta({ description: "Layer id; one layer of each set is `base`." }),
    returnLayer: RId.meta({
      description: "After a key without `layer` is pressed, switch to this layer (SPEC §9.4 returnLayerId).",
    }).optional(),
    rows: z.array(Row).min(1).meta({ description: "Rows, top to bottom." }),
  })
  .meta({ id: "RuntimeLayer", description: "One layer." });

const TouchSet = z
  .strictObject({
    minDeviceWidth: z
      .int()
      .min(0)
      .max(999)
      .meta({ description: "Minimum surface width in millimetres from which the set applies; 0: none given." }),
    orientation: z
      .enum(["portrait", "landscape", "any"])
      .meta({ description: "The orientation the set is for; any: both." }),
    layers: z.array(Layer).min(1).meta({ description: "The layers of the set." }),
  })
  .meta({ id: "RuntimeSet", description: "One touch layer set (targets/touch-runtime.md §2)." });

const Rule = z
  .strictObject({
    from: Str.min(1).meta({ description: "Literal text (with markers) matched at the end of the context." }),
    to: Str.meta({ description: "Replacement text (with markers)." }),
  })
  .meta({ id: "Rule", description: "One literal transform rule." });

const Groups = z
  .array(z.array(Rule).min(1).meta({ description: "One group: the first matching rule applies." }))
  .meta({ description: "Groups, run in order." });

const HardwareState = z
  .strictObject({
    mods: z
      .array(z.enum(["shift", "caps", "ctrl", "altL", "altR"]).meta({ description: "A modifier that is on." }))
      .refine((m) => new Set(m).size === m.length, { error: "items must be unique" })
      .meta({ uniqueItems: true, description: "Exactly the modifiers on in this state." }),
    keys: z
      .record(
        z
          .string()
          .regex(/^KEYCODE_[A-Z0-9_]+$/u)
          .meta({ description: "An Android KeyEvent key code name." }),
        Input,
      )
      .meta({ description: "What each key code does in this state; a code not listed is passed to the application." }),
    numLock: z
      .array(z.string().regex(/^KEYCODE_[A-Z0-9_]+$/u).meta({ description: "A number-pad key code name." }))
      .meta({ description: "Key codes listed in `keys` that apply only with Num Lock on (SPEC §14.1)." })
      .optional(),
  })
  .meta({ id: "HardwareState", description: "One modifier state of the physical-key map." });

export function touchRuntimeFile(n: TouchRuntimeVersion) {
  return z
    .strictObject({
      touchRuntime: z.literal(n).meta({ description: "Touch runtime file version." }),
      target: Targets,
      layout: z
        .strictObject({
          id: z.string().min(1).meta({ description: "metadata.id of the layout." }),
          name: Str.min(1).meta({ description: "The keyboard's name as the app shows it (the target's appName)." }),
          language: z.string().min(1).meta({ description: "BCP 47 tag of the keyboard's language (the target's language)." }),
          version: z.string().meta({ description: "metadata.version, if any." }).optional(),
        })
        .meta({ description: "The layout this file was compiled from." }),
      ui: z
        .strictObject({
          returnKeyLabels: z
            .record(
              z.string().regex(/^[a-zA-Z]{1,32}$/u).meta({ description: "A return-key action of the target." }),
              Str,
            )
            .meta({ description: "Label of the Return key per action of the field (the target's returnKeyLabels)." }),
          popupColumns: z.int().min(1).max(16).meta({ description: "Long-press popup: choices per row." }),
        })
        .meta({ description: "Presentation choices." }),
      keys: z.record(RId, Key).meta({ description: "Every key that a placement, long press, multi-tap or flick names." }),
      sets: z.array(TouchSet).min(1).meta({ description: "Touch layer sets, in the file's order." }),
      deadKeys: z
        .record(
          RId,
          z
            .strictObject({
              spacing: Str.meta({ description: "What the dead key stands for when it does not combine." }),
              entries: z
                .array(z.strictObject({ base: DeadIn.meta({ description: "The input that combines." }), result: DeadIn.meta({ description: "What it gives." }) }).meta({ description: "One entry." }))
                .meta({ description: "Composition table, first match wins." }),
              noMatch: z
                .enum(["emitBoth", "emitText", "emitSpacing", "emitNothing"])
                .meta({ description: "What happens when the next input has no entry (SPEC §14.2)." }),
            })
            .meta({ description: "One dead key (SPEC §10)." }),
        )
        .meta({ description: "Dead keys." }),
      transforms: z
        .strictObject({
          simple: Groups.meta({ description: "Run after every input that emitted text." }),
          backspace: Groups.meta({ description: "Run on the backspace action." }),
        })
        .meta({ description: "Literal transform groups (targets/touch-runtime.md §5)." }),
      hardware: z
        .strictObject({
          states: z.array(HardwareState).meta({ description: "The states with at least one key; mods sets distinct." }),
        })
        .meta({ description: "androidime only: the physical-key map (targets/touch-runtime.md §6)." })
        .optional(),
    })
    .meta({
      $id: touchRuntimeId(n),
      title: `YAKBD touch runtime file, version ${n} (draft)`,
      description:
        "What yakbd compile -target androidime|ios embeds for the on-screen keyboard runtime. Normative text: targets/touch-runtime.md.",
    });
}

/** The runtime manifest: how a runtime APK or runtime source folder says which touch runtime versions it reads. */
export const RuntimeManifest = z
  .strictObject({
    touchRuntime: z
      .array(z.int().min(1).meta({ description: "A touch runtime file version." }))
      .min(1)
      .refine((m) => new Set(m).size === m.length, { error: "items must be unique" })
      .meta({ uniqueItems: true, description: "The touch runtime file versions this runtime reads." }),
    target: Targets,
    version: z.string().min(1).meta({ description: "The runtime's own version." }),
    layoutPath: z
      .string()
      .min(1)
      .meta({ description: "Where the compiler puts the touch runtime file, relative to the APK root or the source folder." }),
  })
  .meta({
    $id: manifestId,
    title: "YAKBD on-screen keyboard runtime manifest",
    description: "assets/yakbd/runtime.json in a runtime APK, yakbd-runtime.json in a runtime source folder (targets/touch-runtime.md §7).",
  });

export const touchRuntimeSchemas = { 1: touchRuntimeFile(1) } as const;
