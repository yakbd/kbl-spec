// The .kbl.json schema, versions 0.1, 0.2 and 0.3, in zod 4. This file is the source of
// schema/<version>/kbl.schema.json (`npm run gen` writes all three; CI checks that they are fresh). Normative text:
// SPEC.md. Each version adds to the one before only (0.2: targets.macos, targets.xkb; 0.3: five more targets, the
// touch core, their loss kinds, provenance formats; COMPATIBILITY.md): the parts that differ are built per version
// by kblFile() at the end (and by the factories it calls), everything else is shared. 0.1 and 0.2 are frozen, and
// tools/check pins the hashes of their generated files, so an edit to a shared part that changes them fails
// `npm test`.
//
// Every object is a strictObject (JSON Schema `additionalProperties: false`), every exclusive choice a z.xor
// (`oneOf`), and every schema carries a description. A schema with a metadata `id` becomes an entry of `$defs`.
//
// zod does not generate four JSON Schema forms the format needs: `uniqueItems`, a `not` on a property name, and
// `required` combinations under `anyOf`/`oneOf`/`not`. Each is written into the JSON Schema with .meta() and
// enforced in zod by a .refine() that checks the same thing (helpers below), so zod and the JSON Schema accept the
// same files. The cross-reference rules of SPEC §19 are not schema rules; tools/check checks them (a subset).

import * as z from "zod";

/** True when no two items are equal (JSON Schema `uniqueItems`; the items here are strings). */
const allDifferent = (items: readonly unknown[]) => new Set(items.map((i) => JSON.stringify(i))).size === items.length;

/** An array whose items are all different: `uniqueItems: true` in the JSON Schema, a refinement in zod. */
function unique<T extends z.ZodArray<z.ZodType>>(schema: T) {
  return schema.refine(allDifferent, { error: "items must be unique" }).meta({ uniqueItems: true });
}

/** Whether a JSON object has the member `key` (JSON Schema `required: [key]`). */
const has = (o: object, key: string) => Object.hasOwn(o, key);

/** The CLDR <special> elements kept verbatim for one parent element (SPEC §18). */
const cldrSpecial = (parent: string) =>
  z.array(z.string().meta({ description: "The XML text of one <special> element." })).meta({
    description: `Complete XML text of each CLDR <special> element whose parent corresponds to ${parent}, in document order (SPEC §18).`,
  });

export const Text = z
  .string()
  .meta({ id: "Text", description: "Text (SPEC §2.1): a JSON string of Unicode scalar values; no lone surrogates." });

export const CodeUnits = z
  .strictObject({
    utf16: z
      .array(
        z
          .string()
          .regex(/^[0-9A-Fa-f]{4}$/u)
          .meta({ description: "One UTF-16 code unit." }),
      )
      .min(1)
      .meta({ description: "The UTF-16 code units, each four hex digits." }),
  })
  .meta({
    id: "CodeUnits",
    description: "CodeUnits (SPEC §2.2): exact UTF-16 code units, for values a Text cannot hold (Windows).",
  });

export const TextOrUnits = z
  .xor([Text, CodeUnits])
  .meta({ id: "TextOrUnits", description: "A Text or a CodeUnits value." });

export const Id = z
  .string()
  .regex(/^[^\s,]{1,64}$/u)
  .meta({ id: "Id", description: "A KeyId, FlickId, LayerId, DeadKeyId, MarkerId or FormId (SPEC §2.5)." });

export const VariableId = z
  .string()
  .regex(/^[0-9A-Za-z_]{1,32}$/u)
  .meta({ id: "VariableId", description: "A variable id (SPEC §13.1)." });

export const MarkedText = z
  .xor([
    Text,
    z
      .array(
        z
          .xor([
            Text,
            z
              .strictObject({
                marker: Id.meta({ description: "The marker id." }),
              })
              .meta({ description: "A CLDR marker (SPEC §13.3)." }),
            z
              .strictObject({
                variable: VariableId.meta({ description: "The variable id." }),
              })
              .meta({ description: "The value of a string variable (SPEC §13.1)." }),
          ])
          .meta({ description: "One item." }),
      )
      .min(1)
      .meta({ description: "Items concatenated in order." }),
  ])
  .meta({
    id: "MarkedText",
    description: "MarkedText (SPEC §2.3): a Text, or an array of Texts, markers and string variables.",
  });

export const Pattern = z.string().meta({
  id: "Pattern",
  description: "A CLDR transform/reorder pattern or variable value, verbatim in CLDR syntax (SPEC §2.4).",
});

export const PositionId = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u)
  .meta({
    id: "PositionId",
    description: "A position id (SPEC §2.5, §6.1); W3C UI Events code values are recommended.",
  });

/** A modifier component; not a $defs entry because the old schema inlined it. */
const ModifierComponent = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9]{0,31}$/u)
  .meta({
    description:
      "A modifier component: shift, ctrl, ctrlL, ctrlR, alt, altL, altR, caps, other, or a name declared in customModifiers (SPEC §7).",
  });

export const ModifierSet = unique(z.array(ModifierComponent)).meta({
  id: "ModifierSet",
  description:
    'A modifier set (SPEC §7.1): components active together; [] means none, ["other"] means no other layer matches.',
});

export const Modifiers = z.array(ModifierSet).min(1).meta({
  id: "Modifiers",
  description: "The modifier sets a layer serves (CLDR's comma-separated layer/@modifiers).",
});

export const Binding = z
  .xor([
    z.string().min(1).meta({ description: "Shorthand: the key emits this Text." }),
    z
      .strictObject({
        output: MarkedText.meta({ description: "The emitted text." }),
      })
      .meta({ description: "The key emits this MarkedText." }),
    z
      .strictObject({
        key: Id.meta({ description: "The KeyId." }),
      })
      .meta({ description: "The key behaves as this Key of `keys` (or an implied key)." }),
    z
      .strictObject({
        deadKey: Id.meta({ description: "The DeadKeyId." }),
      })
      .meta({ description: "The key is this dead key." }),
    CodeUnits,
  ])
  .meta({ id: "Binding", description: "What a position does in a layer (SPEC §9.2)." });

export const DeadKeyRef = z
  .strictObject({
    deadKey: Id.meta({ description: "The DeadKeyId." }),
  })
  .meta({ id: "DeadKeyRef", description: "Another dead key." });

export const Policy = z.enum(["error", "warning", "accept"]).meta({
  id: "Policy",
  description: "error: the build or conversion fails; warning: reported; accept: reported as accepted.",
});

/** The loss kinds of 0.1 (SPEC §17.3), prefix wildcards and windowsDefault.<rule> kinds. 0.1 is frozen: a kind
 * added here is added to 0.1 and 0.2 alike, as COMPATIBILITY.md allows. */
const lossKinds01 = [
  "cldr.*",
  "cldr.capsFallbackExpanded",
  "cldr.customForm",
  "cldr.customModifierDropped",
  "cldr.keyIdGenerated",
  "cldr.positionNotInForm",
  "cldr.windowsOnlyDropped",
  "dll.*",
  "dll.architectureUnsupported",
  "dll.capsCellUnexpressed",
  "dll.containerIgnored",
  "dll.dispatcherNotRead",
  "dll.duplicateRow",
  "dll.keyboardTypeNotTrusted",
  "dll.ligatureMismatch",
  "dll.malformed",
  "dll.modifierDropped",
  "dll.nlsUnreadable",
  "dll.registrationMissing",
  "dll.resourceDropped",
  "dll.unknownFlags",
  "dll.unreachableColumn",
  "dll.unreachableData",
  "dll.unusualShape",
  "general.*",
  "general.displayDropped",
  "general.duplicateDeadKeyEntry",
  "general.extensionDropped",
  "general.importInlined",
  "general.layerOverlap",
  "general.metadataDropped",
  "general.noLayers",
  "general.normalizationNotApplied",
  "general.outputNormalized",
  "general.bindingOnModifier",
  "general.codeUnitsAreText",
  "general.duplicateScanCode",
  "general.duplicateVariableId",
  "general.longPressDefaultInvalid",
  "general.modifierSetInvalid",
  "general.multiTapSelf",
  "general.touchBaseMissing",
  "general.testsDropped",
  "general.touchDropped",
  "general.unresolvedReference",
  "klc.*",
  "klc.editorDropped",
  "klc.impliedRows",
  "klc.nameTooLong",
  "klc.notRepresentable",
  "windows.*",
  "windows.altGrConflict",
  "windows.altOnlyLayer",
  "windows.architectureUnsupported",
  "windows.bidiMarksConflict",
  "windows.capsNotExpressible",
  "windows.capsUnmatched",
  "windows.ctrlLetterFallback",
  "windows.deadCharacterCollision",
  "windows.deadCharacterInvalid",
  "windows.deadKeyBaseUnencodable",
  "windows.deadKeyFirstUnitComposes",
  "windows.deadKeyNoMatchExpanded",
  "windows.deadKeyNoMatchNotExpressible",
  "windows.deadKeyResultUnencodable",
  "windows.dispatcherNotCompiled",
  "windows.frameKeyWithoutText",
  "windows.installerMachinesMissing",
  "windows.kanaLockNotExpressible",
  "windows.langIdMissing",
  "windows.ligatureTooLong",
  "windows.ligatureTruncatedTyped",
  "windows.lockUnmapped",
  "windows.markerNotCompiled",
  "windows.modifierUnmapped",
  "windows.nlsNotCompiled",
  "windows.noHardwareLayers",
  "windows.numpadShiftUnreachable",
  "windows.outputUnencodable",
  "windows.pinOverridesModel",
  "windows.registrationInvalid",
  "windows.scanCodeMissing",
  "windows.scanCodeUnsupported",
  "windows.sgcapsDeadKey",
  "windows.sgcapsLigature",
  "windows.sharedVkRowConflict",
  "windows.sideModifierWidened",
  "windows.sizeLimit",
  "windows.stringLanguageUnmapped",
  "windows.tooManyColumns",
  "windows.transformNotCompiled",
  "windows.unreachableState",
  "windows.versionUnrepresentable",
  "windows.vkDuplicate",
  "windows.vkMissing",
  "windows.wow64Missing",
  "windowsDefault.*",
  "windowsDefault.altGr",
  "windowsDefault.attributes",
  "windowsDefault.builds",
  "windowsDefault.deadCharacter",
  "windowsDefault.dllName",
  "windowsDefault.enableForSignInAndNewUsers",
  "windowsDefault.enableForUser",
  "windowsDefault.kbdVersion",
  "windowsDefault.keyboardType",
  "windowsDefault.lrmRlm",
  "windowsDefault.modNumber",
  "windowsDefault.modifierBits",
  "windowsDefault.productCode",
  "windowsDefault.registration",
  "windowsDefault.scanCodeFlags",
  "windowsDefault.scanCodeTableSize",
  "windowsDefault.shiftLock",
  "windowsDefault.strings",
  "windowsDefault.tables",
  "windowsDefault.uninstallEntry",
  "windowsDefault.versionInfo",
  "windowsDefault.vk",
] as const;

// The loss kinds that 0.2 adds. Each platform target appends its own kinds to its own list, sorted, and its
// defaulted-choice kinds `<target>Default.<rule>` (SPEC §17.1); the wildcards are there from the start.

/** 0.2: the macOS target's kinds (targets/macos.md). */
const lossKindsMacos = [
  "macos.*",
  "macos.deadKeyEndedByEmptyKey",
  "macos.deadKeyNoMatchExpanded",
  "macos.keyCodeDuplicate",
  "macos.keyCodeMissing",
  "macos.keyCodeUnknown",
  "macos.keyMapSetDropped",
  "macos.lockUnmapped",
  "macos.malformed",
  "macos.markerNotCompiled",
  "macos.modifierUnmapped",
  "macos.noHardwareLayers",
  "macos.numLockIgnored",
  "macos.outputBeyondMaxout",
  "macos.outputUnencodable",
  "macos.positionWithoutKey",
  "macos.rangeActionDropped",
  "macos.settingNotCompiled",
  "macos.sideModifierDropped",
  "macos.sideModifierWidened",
  "macos.stateNameDuplicate",
  "macos.stateNotExpressible",
  "macos.transformNotCompiled",
  "macos.xmlDetailsIgnored",
  "macosDefault.*",
  "macosDefault.bundleId",
  "macosDefault.bundleName",
  "macosDefault.bundleVersion",
  "macosDefault.commandMap",
  "macosDefault.controlMap",
  "macosDefault.group",
  "macosDefault.hardwareRanges",
  "macosDefault.inputSourceId",
  "macosDefault.isoKeys",
  "macosDefault.keyCode",
  "macosDefault.keyboardId",
  "macosDefault.language",
  "macosDefault.layoutName",
  "macosDefault.localizedNames",
  "macosDefault.maxout",
  "macosDefault.standardKeys",
  "macosDefault.stateName",
] as const;

/** 0.2: the XKB target's kinds (targets/xkb.md). */
const lossKindsXkb = [
  "xkb.*",
  "xkb.actionsDropped",
  "xkb.capsLockNotExpressible",
  "xkb.capsLockStacks",
  "xkb.composeBaseNotSingle",
  "xkb.composeSequenceDropped",
  "xkb.controlAltLayerDropped",
  "xkb.customKeyType",
  "xkb.deadKeyChainCut",
  "xkb.deadKeyNoCompose",
  "xkb.deadKeyNoMatchNotCompiled",
  "xkb.deadKeyStacks",
  "xkb.deadKeysymDuplicate",
  "xkb.deadKeysymMissing",
  "xkb.groupDropped",
  "xkb.includeUnresolved",
  "xkb.keyNameDuplicate",
  "xkb.keyNameMissing",
  "xkb.keyNameUnknown",
  "xkb.keyTypeNotExact",
  "xkb.keyTypeUnknown",
  "xkb.keysymNotText",
  "xkb.lockUnmapped",
  "xkb.malformed",
  "xkb.markerNotCompiled",
  "xkb.modifierUnmapped",
  "xkb.multiCharacterOutput",
  "xkb.noHardwareLayers",
  "xkb.numLockKeyReduced",
  "xkb.outputUnencodable",
  "xkb.positionWithoutKey",
  "xkb.settingNotCompiled",
  "xkb.syntaxDetailsIgnored",
  "xkb.systemComposeSequences",
  "xkb.systemLayoutShadowed",
  "xkb.tooManyLevels",
  "xkb.transformNotCompiled",
  "xkb.typeModifierDropped",
  "xkb.utf8Characters",
  "xkbDefault.*",
  "xkbDefault.characters",
  "xkbDefault.compose",
  "xkbDefault.deadKeysym",
  "xkbDefault.description",
  "xkbDefault.keyName",
  "xkbDefault.keyType",
  "xkbDefault.levelThree",
  "xkbDefault.shortDescription",
  "xkbDefault.symbolsName",
  "xkbDefault.variant",
] as const;

// The loss kinds that 0.3 adds (D150). As in 0.2, each new target or format appends its own kinds to its own list,
// sorted, with its defaulted-choice kinds `<target>Default.<rule>`; the wildcards are there from the start. The kinds
// that 0.3 adds to the older families (`general`, `cldr`) for the touch core are in `lossKindsCore03`.

/** 0.3: kinds of the touch core (SPEC §9.4, §14.4) in the families `general` and `cldr`. Owner: the spec core. */
export const lossKindsCore03 = [
  "cldr.touchDataDropped",
  "general.deviceClassDerived",
  "general.rowHeightsMismatch",
] as const;

/** 0.3: the Android physical-keyboard target (`.kcm`; targets/android.md, coverage/kcm.md). Owner: the kcm work. */
const lossKindsAndroid = ["android.*", "androidDefault.*"] as const;

/** 0.3: the Android on-screen keyboard target (targets/androidime.md). Owner: the touch-target work. */
const lossKindsAndroidime = [
  "androidime.*",
  "androidime.flickPathDropped",
  "androidime.keyCodeMissing",
  "androidime.layerNotDerived",
  "androidime.modifierUnmapped",
  "androidime.noTouchLayout",
  "androidime.outputUnencodable",
  "androidime.settingNotCompiled",
  "androidime.sideModifierWidened",
  "androidime.tooManyMarkers",
  "androidime.transformNotCompiled",
  "androidimeDefault.*",
  "androidimeDefault.appName",
  "androidimeDefault.keyCode",
  "androidimeDefault.language",
  "androidimeDefault.packageName",
  "androidimeDefault.physicalKeys",
  "androidimeDefault.popupColumns",
  "androidimeDefault.returnKeyLabels",
  "androidimeDefault.systemRow",
  "androidimeDefault.touchFromHardware",
  "androidimeDefault.versionCode",
  "androidimeDefault.versionName",
] as const;

/** 0.3: the iOS on-screen keyboard target (targets/ios.md). Owner: the touch-target work. */
const lossKindsIos = [
  "ios.*",
  "ios.extensionBundleIdNotPrefixed",
  "ios.flickPathDropped",
  "ios.functionNotSupported",
  "ios.hardwareDropped",
  "ios.layerNotDerived",
  "ios.noTouchLayout",
  "ios.outputUnencodable",
  "ios.tooManyMarkers",
  "ios.transformNotCompiled",
  "iosDefault.*",
  "iosDefault.appName",
  "iosDefault.bundleId",
  "iosDefault.bundleVersion",
  "iosDefault.extensionBundleId",
  "iosDefault.language",
  "iosDefault.nextKeyboardKey",
  "iosDefault.popupColumns",
  "iosDefault.returnKeyLabels",
  "iosDefault.systemRow",
  "iosDefault.touchFromHardware",
] as const;

/** 0.3: the ChromeOS input-method target (targets/chromeos.md). Owner: the ChromeOS work. */
const lossKindsChromeos = [
  "chromeos.*",
  "chromeos.codeDuplicate",
  "chromeos.codeMissing",
  "chromeos.controlCharacterDropped",
  "chromeos.markerNotCompiled",
  "chromeos.modifierUnmapped",
  "chromeos.noHardwareLayers",
  "chromeos.positionWithoutCode",
  "chromeos.reorderNotCompiled",
  "chromeos.settingNotCompiled",
  "chromeos.shortcutsFollowSystemLayout",
  "chromeos.transformNotCompiled",
  "chromeosDefault.*",
  "chromeosDefault.code",
  "chromeosDefault.description",
  "chromeosDefault.engineId",
  "chromeosDefault.language",
  "chromeosDefault.name",
  "chromeosDefault.systemLayout",
  "chromeosDefault.version",
] as const;

/** 0.3: the Keyman target (targets/keyman.md). Owner: the Keyman package work. */
const lossKindsKeyman = ["keyman.*", "keymanDefault.*"] as const;

/** 0.3: the conversion formats `kbdgen` (coverage/kbdgen.md), `kmn` (coverage/kmn.md) and `keymantouch`
 * (coverage/keymantouch.md). Each owner appends to its own family. */
const lossKindsKbdgen = [
  "kbdgen.*",
  "kbdgen.bundleDataDropped",
  "kbdgen.deadKeyNotExpressible",
  "kbdgen.geometryDropped",
  "kbdgen.gestureDropped",
  "kbdgen.hardwareSectionsDiffer",
  "kbdgen.layerNotExpressible",
  "kbdgen.layerUnmapped",
  "kbdgen.layerUnreachable",
  "kbdgen.layoutDataDropped",
  "kbdgen.malformed",
  "kbdgen.setNotExpressible",
  "kbdgen.specialKeyDropped",
  "kbdgen.touchSectionDropped",
  "kbdgen.transformNotExpressible",
] as const;
const lossKindsKmn = ["kmn.*"] as const;
const lossKindsKeymantouch = [
  "keymantouch.*",
  "keymantouch.flickPathDropped",
  "keymantouch.geometryDropped",
  "keymantouch.keyNotExpressible",
  "keymantouch.malformed",
  "keymantouch.modifierOverrideDropped",
  "keymantouch.noOutput",
  "keymantouch.outputNeedsRules",
  "keymantouch.platformDropped",
  "keymantouch.presentationDropped",
  "keymantouch.setNotExpressible",
] as const;

/** The OnLoss schema of one version: the same shape, a different closed list of kinds. */
function onLoss(kinds: readonly [string, ...string[]], defaultedKind: string) {
  return z
    .strictObject({
      default: Policy.meta({ description: "Policy for kinds not listed in `kinds`." }).optional(),
      kinds: z
        .partialRecord(
          z
            .enum(kinds)
            .meta({ description: `A loss kind of SPEC §17.3, a prefix wildcard, or ${defaultedKind}.` }),
          Policy,
        )
        .meta({
          description: `Policy per loss kind, per \`<prefix>.*\`, or per defaulted-choice kind \`${defaultedKind}\`.`,
        })
        .optional(),
    })
    .meta({ id: "OnLoss", description: "Loss policy (SPEC §17.2)." });
}

const OnLoss01 = onLoss(lossKinds01, "windowsDefault.<rule>");
const OnLoss02 = onLoss([...lossKinds01, ...lossKindsMacos, ...lossKindsXkb], "<target>Default.<rule>");
const OnLoss03 = onLoss(
  [
    ...lossKinds01,
    ...lossKindsMacos,
    ...lossKindsXkb,
    ...lossKindsCore03,
    ...lossKindsAndroid,
    ...lossKindsAndroidime,
    ...lossKindsIos,
    ...lossKindsChromeos,
    ...lossKindsKeyman,
    ...lossKindsKbdgen,
    ...lossKindsKmn,
    ...lossKindsKeymantouch,
  ],
  "<target>Default.<rule>",
);

export const Version4 = z
  .string()
  .regex(/^\d{1,5}\.\d{1,5}\.\d{1,5}\.\d{1,5}$/u)
  .meta({ id: "Version4", description: "A Windows four-part version a.b.c.d (each 0–65535)." });

export const LangIdText = z
  .record(
    z
      .string()
      .regex(/^[0-9A-Fa-f]{4}$/u)
      .meta({ description: "A LANGID." }),
    Text,
  )
  .meta({ id: "LangIdText", description: "Text per Windows LANGID (four hex digits)." });

export const WinCell = z.xor([Text, CodeUnits, DeadKeyRef, z.null().meta({ description: "No character." })]).meta({
  id: "WinCell",
  description: "A Windows table cell of an extra row: Text, CodeUnits, a dead key, or null (WCH_NONE).",
});

/** Where the data came from; the list of source formats grows with the importers of each version. */
const metadataProvenance = (formats: readonly [string, ...string[]]) =>
  z
    .strictObject({
      source: z.string().meta({ description: "Source file name or description." }).optional(),
      format: z
        .enum(formats)
        .meta({ description: "Format of the source." })
        .optional(),
      cldrConformsTo: z.int().min(45).meta({ description: "conformsTo of the CLDR source." }).optional(),
      cldrImports: z
        .array(z.string().meta({ description: "One import path." }))
        .meta({ description: "CLDR import paths that were inlined (cldr: prefix for base=cldr)." })
        .optional(),
      notes: Text.meta({ description: "Free text." }).optional(),
    })
    .meta({ description: "Informative record of where the data came from; never changes behaviour." });

const metadata = (formats: readonly [string, ...string[]]) =>
  z
    .strictObject({
      id: z.string().min(1).meta({
        description: "BCP 47 tag identifying this keyboard (CLDR keyboard3/@locale); its language is the primary locale.",
      }),
      locales: z
        .array(z.string().min(1).meta({ description: "A BCP 47 tag." }))
        .meta({ description: "Further BCP 47 tags of supported languages, in order (CLDR locales)." })
        .optional(),
      name: Text.meta({ description: "The keyboard's name (CLDR info/@name)." }),
      localizedNames: z
        .record(z.string(), Text)
        .meta({ description: "The name in further languages, per BCP 47 tag." })
        .optional(),
      description: Text.meta({ description: "Free text." }).optional(),
      authors: z
        .array(
          z
            .strictObject({
              name: Text.meta({ description: "Name." }),
              email: z.string().meta({ description: "E-mail address." }).optional(),
              url: z.string().meta({ description: "Web address." }).optional(),
            })
            .meta({ description: "An author." }),
        )
        .meta({ description: "Authors of the layout." })
        .optional(),
      attribution: Text.meta({ description: "Originating entity of the design (CLDR info/@attribution)." }).optional(),
      layoutPattern: z.string().meta({ description: "Layout pattern such as QWERTY (CLDR info/@layout)." }).optional(),
      indicator: z.string().meta({ description: "Short switcher label (CLDR info/@indicator)." }).optional(),
      version: z
        .string()
        .meta({ description: "Version of the layout data; Semantic Versioning recommended (CLDR version/@number)." })
        .optional(),
      license: z.string().meta({ description: "SPDX licence expression for the layout data." }).optional(),
      copyright: Text.meta({ description: "Copyright statement (.klc COPYRIGHT)." }).optional(),
      organization: Text.meta({ description: "Publishing organisation (.klc COMPANY)." }).optional(),
      draft: z
        .enum(["approved", "contributed", "provisional", "unconfirmed"])
        .meta({ description: "CLDR approval status (keyboard3/@draft)." })
        .optional(),
      provenance: metadataProvenance(formats).optional(),
    })
    .meta({ description: "Descriptive data (SPEC §4)." });

const Settings = z
  .strictObject({
    normalization: z
      .enum(["enabled", "disabled"])
      .meta({ description: "CLDR normalisation: enabled (default) or disabled." })
      .optional(),
    capsLockFallback: z
      .boolean()
      .meta({
        description:
          "With Caps Lock on and no binding in the matched layer, resolve again without Caps Lock (default true).",
      })
      .optional(),
    capsLockOffBy: z
      .enum(["capsLock", "shift"])
      .meta({ description: "What turns Caps Lock off: capsLock (default) or shift (Shift Lock)." })
      .optional(),
    bidiMarksOnShiftBackspace: z
      .boolean()
      .meta({ description: "Left/right Shift + Backspace type LRM/RLM (default false)." })
      .optional(),
  })
  .meta({ description: "Behaviour settings (SPEC §5)." });

const PositionsEntry = z
  .strictObject({
    scanCode: z
      .string()
      .regex(/^([0-9A-Fa-f]{2}|[Ee][01][0-9A-Fa-f]{2})$/u)
      .meta({ description: "Set-1 scan code: 2 hex digits, or E0xx / E1xx." })
      .optional(),
    name: Text.meta({ description: "The key's display name (Windows key names, .klc KEYNAME)." }).optional(),
    numLock: z
      .boolean()
      .meta({ description: "The key is a number-pad key subject to Num Lock (SPEC §14.1)." })
      .optional(),
    description: Text.meta({ description: "Free text." }).optional(),
  })
  .meta({ description: "A physical key (SPEC §6.1)." });

const Positions = z
  .record(PositionId, PositionsEntry)
  .meta({ description: "Physical keys by PositionId (SPEC §6.1)." });

const FormsEntry = z
  .strictObject({
    rows: z
      .array(z.array(PositionId).meta({ description: "One row." }))
      .min(1)
      .meta({ description: "Rows top to bottom, each a list of positions left to right." }),
    cldrSpecial: cldrSpecial("this form").optional(),
  })
  .meta({ description: "A hardware form (SPEC §6.2)." });

const Forms = z
  .record(Id.meta({ not: { const: "touch" } }), FormsEntry)
  .refine((forms) => !has(forms, "touch"), { error: 'a FormId must not be "touch"' })
  .meta({ description: "Hardware forms by FormId (SPEC §6.2)." });

const CustomModifiersEntry = z
  .strictObject({
    kind: z.enum(["held", "lock"]).meta({ description: "held: active while held; lock: toggled." }),
    positions: unique(z.array(PositionId).min(1)).meta({ description: "The positions that operate it." }),
    fallback: z
      .boolean()
      .meta({
        description:
          "lock only: with the lock on and no binding in the matched layer, resolve again without it (SPEC §9.3). Default true.",
      })
      .optional(),
    description: Text.meta({ description: "Free text." }).optional(),
  })
  .meta({ description: "A custom modifier component (SPEC §7.2)." });

/** Names a custom modifier component cannot take (SPEC §7.2). */
const reservedComponents = ["none", "other", "shift", "ctrl", "ctrlL", "ctrlR", "alt", "altL", "altR", "caps"];

const CustomModifiers = z
  .record(
    ModifierComponent.refine((name) => !reservedComponents.includes(name), {
      error: "a built-in component name cannot be redefined",
    }).meta({ not: { enum: reservedComponents } }),
    CustomModifiersEntry,
  )
  .meta({ description: "Custom modifier components (SPEC §7.2)." });

/** Whether version `v` has the touch core of 0.3 (SPEC §8, §9.4, §14.4; D152). */
const touchCore = (v: string) => v !== "0.1" && v !== "0.2";

/** The `function` values of a key: 0.3 adds `nextKeyboard` (D153). */
const keyFunctions01 = ["backspace", "enter", "tab", "escape", "shift", "capsLock", "space"] as const;
const keyFunctions03 = [...keyFunctions01, "nextKeyboard"] as const;

/** A key of `keys` in version `v`; 0.3 adds `hint` and the `function` value `nextKeyboard`. */
const keysEntry = (v: string) =>
  z
    .strictObject({
      output: MarkedText.meta({ description: "Emitted text (CLDR key/@output)." }).optional(),
      deadKey: Id.meta({ description: "The key is this dead key." }).optional(),
      gap: z.literal(true).meta({ description: "The key is empty space (CLDR key/@gap)." }).optional(),
      width: z
        .number()
        .min(0.01)
        .max(100)
        .meta({ description: "Width in key units, default 1 (CLDR key/@width)." })
        .optional(),
      stretch: z.literal(true).meta({ description: "May be stretched in a touch row (CLDR key/@stretch)." }).optional(),
      layerId: Id.meta({ description: "Switches the touch layout to this layer (CLDR key/@layerId)." }).optional(),
      flickId: Id.meta({ description: "The key's flicks (CLDR key/@flickId)." }).optional(),
      longPressKeyIds: z.array(Id).min(1).meta({ description: "Long-press choices in order." }).optional(),
      longPressDefaultKeyId: Id.meta({ description: "Default long-press choice." }).optional(),
      multiTapKeyIds: z.array(Id).min(1).meta({ description: "Keys for 2, 3, … taps." }).optional(),
      function: z
        .enum(touchCore(v) ? keyFunctions03 : keyFunctions01)
        .meta({ description: "Informative identity of a touch key." })
        .optional(),
      ...(touchCore(v)
        ? {
            hint: Text.meta({
              description: "0.3: a small secondary label on the touch key cap, such as its long-press default.",
            }).optional(),
          }
        : {}),
    })
    .refine((key) => ["output", "deadKey", "gap", "layerId", "function"].some((k) => has(key, k)), {
      error: "a key needs output, deadKey, gap, layerId or function",
    })
    .refine((key) => !(has(key, "output") && has(key, "deadKey")), {
      error: "a key has output or deadKey, not both",
      path: ["deadKey"],
    })
    .meta({
      description: "A CLDR key: an output with gestures (SPEC §8).",
      anyOf: [
        { required: ["output"] },
        { required: ["deadKey"] },
        { required: ["gap"] },
        { required: ["layerId"] },
        { required: ["function"] },
      ],
      not: { required: ["output", "deadKey"] },
    });

const keys = (v: string) =>
  z.record(Id, keysEntry(v)).meta({ description: "CLDR's bag of keys by KeyId (SPEC §8)." });

const HardwareLayers = z
  .strictObject({
    id: Id.meta({ description: "Layer id (CLDR layer/@id)." }).optional(),
    modifiers: Modifiers.meta({ description: "The modifier sets this layer serves." }),
    bindings: z
      .record(PositionId, Binding)
      .meta({ description: "Binding per position; an absent position does nothing in this layer." }),
    cldrSpecial: cldrSpecial("this layer").optional(),
  })
  .meta({ description: "A hardware layer (SPEC §9.1)." });

const Hardware = z
  .strictObject({
    formId: Id.meta({ description: "The form the layout was designed on (CLDR layers/@formId)." }).optional(),
    minDeviceWidth: z
      .int()
      .min(1)
      .max(999)
      .meta({ description: "CLDR layers/@minDeviceWidth, millimetres." })
      .optional(),
    layers: z.array(HardwareLayers).min(1).meta({ description: "The layers." }),
    cldrSpecial: cldrSpecial("the hardware layers element").optional(),
  })
  .meta({ description: "The physical keyboard's layers (SPEC §9.1)." });

/** A touch layer in version `v`; 0.3 adds `rowHeights` and `returnLayerId`. */
const touchLayers = (v: string) =>
  z
    .strictObject({
      id: Id.meta({ description: "Layer id; one layer of a set is base." }),
      modifiers: Modifiers.meta({ description: "Optional modifier sets." }).optional(),
      rows: z
        .array(z.array(Id).meta({ description: "One row." }))
        .min(1)
        .meta({ description: "Rows of KeyIds." }),
      cldrSpecial: cldrSpecial("this layer").optional(),
      ...(touchCore(v)
        ? {
            rowHeights: z
              .array(
                z.number().min(0.01).max(100).meta({ description: "Height of one row, relative to the others." }),
              )
              .min(1)
              .meta({ description: "0.3: the height of each row, in order, relative to each other; default 1 each." })
              .optional(),
            returnLayerId: Id.meta({
              description: "0.3: after a key of this layer without a layerId of its own, switch to this layer.",
            }).optional(),
          }
        : {}),
    })
    .meta({ description: "A touch layer (SPEC §9.4)." });

/** A touch layer set in version `v`; 0.3 adds `orientation`, `deviceClass` and `systemRow`. */
const touch = (v: string) =>
  z
    .strictObject({
      minDeviceWidth: z.int().min(1).max(999).meta({ description: "Minimum device width in millimetres." }).optional(),
      layers: z.array(touchLayers(v)).min(1).meta({ description: "The layers." }),
      cldrSpecial: cldrSpecial("this layers element").optional(),
      ...(touchCore(v)
        ? {
            orientation: z
              .enum(["portrait", "landscape"])
              .meta({ description: "0.3: the screen orientation this set is for; default both." })
              .optional(),
            deviceClass: z
              .enum(["phone", "tablet"])
              .meta({ description: "0.3: the device class this set is for, a label for formats that name one." })
              .optional(),
            systemRow: z
              .boolean()
              .meta({
                description: "0.3: true: the rows leave out the bottom row and the target adds its own. Default false.",
              })
              .optional(),
          }
        : {}),
    })
    .meta({ description: "A touch layer set." });

const DeadKeysEntry = z
  .strictObject({
    spacing: TextOrUnits.meta({
      description: "Text the dead key stands for when it does not combine; default Windows dead character.",
    }),
    name: Text.meta({ description: "Name of the dead key (.klc KEYNAME_DEAD)." }).optional(),
    entries: z
      .array(
        z
          .strictObject({
            base: z
              .xor([Text, DeadKeyRef, CodeUnits])
              .meta({ description: "The input that composes: text, another dead key, or code units." }),
            result: z
              .xor([Text, DeadKeyRef, CodeUnits])
              .meta({ description: "The result: text, a chained dead key, or code units." }),
          })
          .meta({ description: "A dead-key table entry (SPEC §10)." }),
      )
      .meta({ description: "Composition table in order; first match wins." }),
    noMatch: z
      .enum(["emitBoth", "emitText", "emitSpacing", "emitNothing"])
      .meta({ description: "Behaviour when the next input has no entry (default emitBoth)." })
      .optional(),
    display: MarkedText.meta({ description: "Key-cap text if different from spacing." }).optional(),
  })
  .meta({ description: "A dead key (SPEC §10)." });

const DeadKeys = z.record(Id, DeadKeysEntry).meta({ description: "Dead keys by DeadKeyId (SPEC §10)." });

const FlicksEntry = z
  .strictObject({
    segments: z
      .array(
        z
          .strictObject({
            directions: z
              .array(z.enum(["n", "e", "s", "w", "ne", "nw", "se", "sw"]).meta({ description: "A direction." }))
              .min(1)
              .meta({ description: "Path of directions." }),
            keyId: Id.meta({ description: "The resulting key." }),
          })
          .meta({ description: "One flick segment." }),
      )
      .min(1)
      .meta({ description: "Flick paths and their results." }),
    cldrSpecial: cldrSpecial("this flick").optional(),
  })
  .meta({ description: "A flick set (SPEC §11.1)." });

const Flicks = z.record(Id, FlicksEntry).meta({ description: "Flicks by FlickId (SPEC §11.1)." });

const Displays = z
  .strictObject({
    entries: z
      .array(
        z
          .strictObject({
            output: MarkedText.meta({ description: "Output whose keys get this cap." }).optional(),
            keyId: Id.meta({ description: "The key that gets this cap." }).optional(),
            display: MarkedText.meta({ description: "Text to show." }),
          })
          .refine((rule) => has(rule, "output") !== has(rule, "keyId"), { error: "a rule has output or keyId" })
          .meta({
            description: "One rule: for keys with this output, or for the key keyId.",
            oneOf: [{ required: ["output"] }, { required: ["keyId"] }],
          }),
      )
      .meta({ description: "Display rules." })
      .optional(),
    baseCharacter: Text.meta({ description: "Base for combining marks instead of U+25CC." }).optional(),
    cldrSpecial: cldrSpecial("displays").optional(),
  })
  .meta({ description: "Key-cap display data (SPEC §12)." });

const TransformGroup = z
  .strictObject({
    transforms: z
      .array(
        z
          .strictObject({
            from: Pattern.meta({ description: "Match pattern." }),
            to: Pattern.meta({ description: "Replacement; absent deletes." }).optional(),
          })
          .meta({ description: "A transform." }),
      )
      .min(1)
      .meta({ description: "Rules in order; the first match applies." }),
    cldrSpecial: cldrSpecial("this transformGroup").optional(),
  })
  .meta({ description: "A group of transforms." });

const Reorder = z
  .strictObject({
    from: Pattern.meta({ description: "Characters matched." }),
    before: Pattern.meta({ description: "Required preceding context." }).optional(),
    order: z
      .xor([
        z.int().min(-128).max(127).meta({ description: "One value for all." }),
        z
          .array(z.int().min(-128).max(127).meta({ description: "A weight." }))
          .min(1)
          .meta({ description: "One value per element; the last repeats." }),
      ])
      .meta({ description: "Primary weights." })
      .optional(),
    tertiary: z
      .xor([
        z.int().min(-128).max(127).meta({ description: "One value for all." }),
        z
          .array(z.int().min(-128).max(127).meta({ description: "A weight." }))
          .min(1)
          .meta({ description: "One value per element; the last repeats." }),
      ])
      .meta({ description: "Tertiary weights." })
      .optional(),
    tertiaryBase: z
      .xor([
        z.boolean().meta({ description: "One value for all." }),
        z
          .array(z.boolean().meta({ description: "A value." }))
          .min(1)
          .meta({ description: "One value per element; the last repeats." }),
      ])
      .meta({ description: "May carry tertiary characters." })
      .optional(),
    preBase: z
      .xor([
        z.boolean().meta({ description: "One value for all." }),
        z
          .array(z.boolean().meta({ description: "A value." }))
          .min(1)
          .meta({ description: "One value per element; the last repeats." }),
      ])
      .meta({ description: "Typed before the base." })
      .optional(),
  })
  .meta({ description: "A reorder rule." });

const ReorderGroup = z
  .strictObject({
    reorders: z.array(Reorder).min(1).meta({ description: "Reorder rules." }),
    cldrSpecial: cldrSpecial("this transformGroup").optional(),
  })
  .meta({ description: "A group of reorders." });

const TransformsSpecial = z
  .strictObject({
    simple: cldrSpecial("transforms type=simple").optional(),
    backspace: cldrSpecial("transforms type=backspace").optional(),
  })
  .meta({ description: "special children of the transforms elements." });

const Transforms = z
  .strictObject({
    simple: z
      .array(
        z
          .xor([TransformGroup, ReorderGroup])
          .meta({ description: "A transform group: transforms or reorders, never both (SPEC §13.2)." }),
      )
      .meta({ description: "Groups applied after each input." })
      .optional(),
    backspace: z
      .array(
        z
          .xor([TransformGroup, ReorderGroup])
          .meta({ description: "A transform group: transforms or reorders, never both (SPEC §13.2)." }),
      )
      .meta({ description: "Groups applied on the backspace action." })
      .optional(),
    cldrSpecial: TransformsSpecial.optional(),
  })
  .meta({ description: "CLDR transforms (SPEC §13.2)." });

const KeyPress = z
  .strictObject({
    key: Id.meta({ description: "KeyId." }),
    flick: z
      .array(z.enum(["n", "e", "s", "w", "ne", "nw", "se", "sw"]).meta({ description: "A direction." }))
      .min(1)
      .meta({ description: "Flick path." })
      .optional(),
    longPress: z.int().min(0).meta({ description: "Long-press choice; 0 = default." }).optional(),
    tapCount: z.int().min(2).meta({ description: "Number of taps, at least 2." }).optional(),
  })
  .refine((press) => ["flick", "longPress", "tapCount"].filter((k) => has(press, k)).length <= 1, {
    error: "at most one of flick, longPress, tapCount",
  })
  .meta({
    description: "Press a Key.",
    not: {
      anyOf: [
        { required: ["flick", "longPress"] },
        { required: ["flick", "tapCount"] },
        { required: ["longPress", "tapCount"] },
      ],
    },
  });

const PositionPress = z
  .strictObject({
    position: PositionId.meta({ description: "The position." }),
    modifiers: unique(z.array(ModifierComponent))
      .meta({
        description:
          "Held modifiers, by side: shiftL, shiftR, ctrlL, ctrlR, altL, altR (shift, ctrl, alt = left), custom held components.",
      })
      .optional(),
    locks: unique(z.array(ModifierComponent))
      .meta({ description: "Locks on: caps, custom lock components." })
      .optional(),
  })
  .meta({ description: "Press a hardware position." });

const KeystrokeStep = z
  .strictObject({
    keystroke: z
      .xor([KeyPress, PositionPress])
      .meta({ description: "A CLDR key press with optional gesture, or a hardware position press." }),
  })
  .meta({ description: "A keystroke." });

const Test = z
  .strictObject({
    name: z.string().meta({ description: "Name." }),
    startContext: Text.meta({ description: "Text before the insertion point." }).optional(),
    steps: z
      .array(
        z
          .xor([
            KeystrokeStep,
            z
              .strictObject({
                emit: Text.meta({ description: "The text." }),
              })
              .meta({ description: "Input text directly." }),
            z
              .strictObject({
                backspace: z.literal(true).meta({ description: "Always true." }),
              })
              .meta({ description: "The backspace action." }),
            z
              .strictObject({
                check: Text.meta({ description: "Expected text before the insertion point." }),
              })
              .meta({ description: "Check the context." }),
          ])
          .meta({ description: "One test step (SPEC §15)." }),
      )
      .meta({ description: "Steps in order." }),
    cldrSpecial: cldrSpecial("this test").optional(),
  })
  .meta({ description: "A test." });

const TestSuite = z
  .strictObject({
    name: z.string().meta({ description: "Name." }),
    tests: z.array(Test).min(1).meta({ description: "Tests." }),
    cldrSpecial: cldrSpecial("this suite").optional(),
  })
  .meta({ description: "A suite." });

const Tests = z
  .strictObject({
    info: z
      .strictObject({
        name: z.string().meta({ description: "Name." }),
        author: Text.meta({ description: "Author." }).optional(),
        keyboard: z.string().meta({ description: "File name of the tested keyboard." }).optional(),
      })
      .meta({ description: "Test file information." }),
    repertoires: z
      .array(
        z
          .strictObject({
            name: z.string().meta({ description: "Name." }),
            chars: z.string().meta({ description: "UnicodeSet in CLDR test syntax." }),
            type: z
              .enum(["default", "simple", "gesture", "flick", "longPress", "multiTap", "hardware"])
              .meta({ description: "How the characters must be typeable." })
              .optional(),
          })
          .meta({ description: "A repertoire test." }),
      )
      .meta({ description: "Repertoire tests." })
      .optional(),
    suites: z.array(TestSuite).meta({ description: "Test suites." }).optional(),
    cldrSpecial: cldrSpecial("this test file").optional(),
  })
  .meta({ description: "A test file (SPEC §15)." });

const TargetsWindowsModifiers = z
  .strictObject({
    bits: z
      .array(
        z
          .strictObject({
            vk: z
              .string()
              .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
              .meta({ description: "The modifier VK." }),
            bit: z
              .literal([1, 2, 4, 8, 16, 32, 64, 128])
              .meta({ description: "Its modifier bit (1, 2, 4, 8, 16, 32, 64, 128)." }),
            component: z
              .string()
              .regex(/^[A-Za-z][A-Za-z0-9]{0,31}$/u)
              .meta({ description: "The kbl component it stands for." }),
          })
          .meta({ description: "One entry." }),
      )
      .min(1)
      .meta({ description: "VK_TO_BIT entries in order." })
      .optional(),
    modNumber: z
      .array(
        z
          .xor([
            z.int().min(0).max(14).meta({ description: "Column." }),
            z.null().meta({ description: "SHFT_INVALID." }),
          ])
          .meta({ description: "Column index or null." }),
      )
      .min(1)
      .max(256)
      .meta({ description: "ModNumber: column per bit combination (index), null = SHFT_INVALID." })
      .optional(),
    kanaLockComponent: z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9]{0,31}$/u)
      .meta({ description: "The custom lock that is Windows' Kana lock (KANALOK)." })
      .optional(),
  })
  .meta({ description: "MODIFIERS (rules modifierBits, modNumber)." });

const TargetsWindowsKeysEntry = z
  .strictObject({
    vk: z
      .string()
      .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
      .meta({ description: "Virtual key of the position (rule vk)." })
      .optional(),
    scanCodeFlags: unique(
      z.array(
        z.enum(["ext", "multiVk", "special", "numpad", "unicode", "injectedVk", "mappedVk", "break"]).meta({
          description: "KBDEXT, KBDMULTIVK, KBDSPECIAL, KBDNUMPAD, KBDUNICODE, KBDINJECTEDVK, KBDMAPPEDVK, KBDBREAK.",
        }),
      ),
    )
      .meta({ description: "Scan-code flags (rule scanCodeFlags)." })
      .optional(),
    attributes: unique(
      z.array(
        z.enum(["CAPLOK", "SGCAPS", "CAPLOKALTGR", "KANALOK", "GRPSELTAP"]).meta({ description: "One attribute." }),
      ),
    )
      .meta({ description: "Row attributes (rule attributes)." })
      .optional(),
  })
  .meta({ description: "Windows data of one position." });

const TargetsWindowsKeys = z
  .record(PositionId, TargetsWindowsKeysEntry)
  .meta({ description: "Windows data per position." });

const TargetsWindowsTables = z
  .strictObject({
    width: z.int().min(1).max(15).meta({ description: "Number of columns of the table." }),
    rows: z
      .array(
        z
          .xor([
            PositionId,
            z
              .strictObject({
                vk: z
                  .string()
                  .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
                  .meta({ description: "The VK." }),
              })
              .meta({ description: "A VK of extraRows." }),
          ])
          .meta({ description: "A row." }),
      )
      .meta({ description: "Rows in order: a position, or a VK of extraRows." }),
  })
  .meta({ description: "One table." });

const TargetsWindowsExtraRows = z
  .strictObject({
    vk: z
      .string()
      .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
      .meta({ description: "The row's VK." }),
    attributes: unique(
      z.array(
        z.enum(["CAPLOK", "SGCAPS", "CAPLOKALTGR", "KANALOK", "GRPSELTAP"]).meta({ description: "One attribute." }),
      ),
    )
      .meta({ description: "Row attributes." })
      .optional(),
    cells: z.array(WinCell).min(1).max(15).meta({ description: "Cells per column." }),
  })
  .meta({ description: "One row." });

const TargetsWindowsRegistration = z
  .strictObject({
    klid: z
      .string()
      .regex(/^[0-9A-Fa-f]{8}$/u)
      .meta({ description: "KLID, 8 hex digits." })
      .optional(),
    langId: z
      .string()
      .regex(/^[0-9A-Fa-f]{4}$/u)
      .meta({ description: "LANGID, 4 hex digits (no default)." })
      .optional(),
    layoutId: z
      .string()
      .regex(/^[0-9A-Fa-f]{4}$/u)
      .meta({ description: "Layout Id, 4 hex digits." })
      .optional(),
    layoutText: Text.meta({ description: "Layout Text." }).optional(),
    localeName: z.string().meta({ description: "Layout Locale Name (custom locales)." }).optional(),
    customLanguageName: Text.meta({ description: "Custom Language Name." }).optional(),
    productCode: z
      .string()
      .regex(/^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/u)
      .meta({
        description:
          "Product GUID, {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}: ownership marker, uninstall-entry key, upgrade identity (rule productCode, targets/windows-install.md §2).",
      })
      .optional(),
  })
  .meta({ description: "Registry data for the installer (rule registration)." });

const TargetsWindowsInstall = z
  .strictObject({
    enableForUser: z
      .boolean()
      .meta({ description: "Add the layout to the installing user's input list (rule enableForUser, default true)." })
      .optional(),
    enableForSignInAndNewUsers: z
      .boolean()
      .meta({
        description:
          "Also add the layout to the sign-in screen and to accounts created later (rule enableForSignInAndNewUsers, default false; targets/windows-install.md §7.1).",
      })
      .optional(),
    productName: Text.meta({ description: "Display name of the uninstall entry (rule uninstallEntry)." }).optional(),
    productVersion: z
      .string()
      .min(1)
      .meta({ description: "Version shown in the uninstall entry, free text (rule uninstallEntry)." })
      .optional(),
    publisher: Text.meta({ description: "Publisher of the uninstall entry (rule uninstallEntry)." }).optional(),
  })
  .meta({ description: "Installer choices (targets/windows-install.md)." });

const TargetsWindowsNlsVkToF = z
  .strictObject({
    vk: z
      .string()
      .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
      .meta({ description: "Vk." }),
    procType: z.int().min(0).max(2).meta({ description: "NLSFEProcType 0–2." }),
    procCurrent: z.int().min(0).max(255).meta({ description: "NLSFEProcCurrent." }),
    procSwitch: z.int().min(0).max(255).meta({ description: "NLSFEProcSwitch." }),
    proc: z
      .array(
        z
          .strictObject({
            index: z.int().min(0).max(15).meta({ description: "NLSFEProcIndex, 0–15." }),
            param: z.int().min(0).max(4294967295).meta({ description: "NLSFEProcParam." }),
          })
          .meta({ description: "A VK_FPARAM entry." }),
      )
      .min(8)
      .max(8)
      .meta({ description: "NLSFEProc[8]." }),
    procAlt: z
      .array(
        z
          .strictObject({
            index: z.int().min(0).max(15).meta({ description: "NLSFEProcIndex, 0–15." }),
            param: z.int().min(0).max(4294967295).meta({ description: "NLSFEProcParam." }),
          })
          .meta({ description: "A VK_FPARAM entry." }),
      )
      .min(8)
      .max(8)
      .meta({ description: "NLSFEProcAlt[8]." }),
  })
  .meta({ description: "One VK_F entry." });

const TargetsWindowsNls = z
  .strictObject({
    oemIdentifier: z.int().min(0).max(65535).meta({ description: "OEMIdentifier." }).optional(),
    layoutInformation: z.int().min(0).max(65535).meta({ description: "LayoutInformation." }).optional(),
    vkToF: z.array(TargetsWindowsNlsVkToF).meta({ description: "VK_F entries." }).optional(),
    mouseVKeys: z
      .array(
        z
          .strictObject({
            vk: z
              .string()
              .regex(/^([A-Za-z0-9_]{1,32}|0[xX][0-9A-Fa-f]{2})$/u)
              .meta({ description: "Vk." }),
            flags: unique(z.array(z.enum(["ext", "multiVk", "special", "numpad"]).meta({ description: "A flag." })))
              .meta({ description: "Flags." })
              .optional(),
          })
          .meta({ description: "One entry." }),
      )
      .meta({ description: "pusMouseVKey entries." })
      .optional(),
  })
  .meta({ description: "KbdNlsLayerDescriptor table: carried, not compiled." });

const TargetsWindowsDispatcher = z
  .strictObject({
    tables: z
      .array(
        z
          .strictObject({
            dllName: z.string().meta({ description: "Layout DLL file name." }),
            type: z.int().min(0).meta({ description: "dwType." }),
            subType: z.int().min(0).meta({ description: "dwSubType." }),
          })
          .meta({ description: "One entry." }),
      )
      .max(8)
      .meta({ description: "KBDTABLE_DESC entries (at most 8)." })
      .optional(),
    realDllFile: z.string().meta({ description: "File name returned by KbdLayerRealDllFile." }).optional(),
  })
  .meta({ description: "Multi-table dispatcher data: carried, not compiled." });

type OnLossSchema = ReturnType<typeof onLoss>;

const targetsWindows = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      dllName: z
        .string()
        .regex(/^[A-Za-z][A-Za-z0-9_]{0,7}$/u)
        .meta({ description: "DLL file name without .dll (rule dllName)." })
        .optional(),
      builds: unique(z.array(z.enum(["x86", "x64", "wow64", "arm64x"]).meta({ description: "One build." })).min(1))
        .meta({ description: "DLL builds to make (rule builds)." })
        .optional(),
      useTableA: z
        .boolean()
        .meta({
          description:
            "false: rule vk uses no Table A at all, the file's VKs are exactly its pins (default true; targets/windows.md §5).",
        })
        .optional(),
      localeFlags: z
        .strictObject({
          altGr: z.boolean().meta({ description: "KLLF_ALTGR (rule altGr)." }).optional(),
          shiftLock: z.boolean().meta({ description: "KLLF_SHIFTLOCK (rule shiftLock)." }).optional(),
          lrmRlm: z.boolean().meta({ description: "KLLF_LRM_RLM (rule lrmRlm)." }).optional(),
        })
        .meta({ description: "fLocaleFlags low word." })
        .optional(),
      kbdVersion: z
        .int()
        .min(0)
        .max(65535)
        .meta({ description: "High word of fLocaleFlags (rule kbdVersion)." })
        .optional(),
      keyboardType: z
        .strictObject({
          type: z.int().min(0).max(4294967295).meta({ description: "dwType." }),
          subType: z.int().min(0).max(4294967295).meta({ description: "dwSubType." }),
        })
        .meta({ description: "dwType and dwSubType (rule keyboardType)." })
        .optional(),
      modifiers: TargetsWindowsModifiers.optional(),
      keys: TargetsWindowsKeys.optional(),
      scanCodeTableSize: z
        .int()
        .min(1)
        .max(255)
        .meta({ description: "bMaxVSCtoVK (rule scanCodeTableSize)." })
        .optional(),
      tables: z.array(TargetsWindowsTables).meta({ description: "Character tables in order (rule tables)." }).optional(),
      extraRows: z.array(TargetsWindowsExtraRows).meta({ description: "Rows for VKs no position produces." }).optional(),
      deadKeys: z
        .record(
          z.string(),
          z
            .strictObject({
              character: TextOrUnits.meta({
                description: "The dead character, one unit (rule deadCharacter).",
              }).optional(),
            })
            .meta({ description: "Windows data of one dead key." }),
        )
        .meta({ description: "Windows data per dead key." })
        .optional(),
      strings: z
        .strictObject({
          layoutName: LangIdText.meta({ description: "String 1000 per LANGID." }).optional(),
          languageName: LangIdText.meta({ description: "String 1100 per LANGID." }).optional(),
          localeName: z.string().meta({ description: "String 1200, a locale name." }).optional(),
        })
        .meta({ description: "DLL strings (rule strings)." })
        .optional(),
      versionInfo: z
        .strictObject({
          fileVersion: Version4.meta({ description: "FileVersion." }).optional(),
          productVersion: Version4.meta({ description: "ProductVersion." }).optional(),
          companyName: Text.meta({ description: "CompanyName." }).optional(),
          legalCopyright: Text.meta({ description: "LegalCopyright." }).optional(),
          fileDescription: Text.meta({ description: "FileDescription." }).optional(),
        })
        .meta({ description: "Version resource (rule versionInfo)." })
        .optional(),
      registration: TargetsWindowsRegistration.optional(),
      install: TargetsWindowsInstall.optional(),
      nls: TargetsWindowsNls.optional(),
      dispatcher: TargetsWindowsDispatcher.optional(),
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "Windows build choices (SPEC §16.1, targets/windows.md)." });

// ---- 0.2 targets ----
// Each platform target has its own object here, `TargetsMacos` (SPEC §16.4, targets/macos.md) and `TargetsXkb`
// (SPEC §16.5, targets/xkb.md), and its own loss-kind list near OnLoss above. Nothing else in this file is per
// platform.

/** 0.2: a `.keylayout` state name (TN2056 `when/@state`, an XML NMTOKEN); `none` is the base state. */
const MacosStateName = z
  .string()
  .regex(/^[A-Za-z0-9._:-]{1,64}$/u)
  .meta({ description: "A .keylayout state name: an XML NMTOKEN of 1–64 characters; none is the base state (macos.stateNameDuplicate)." });

/** 0.2: a reverse-DNS name (bundle identifier, input-source id). */
const MacosReverseDns = z.string().regex(/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/u).max(255);

/** 0.2: a name used as a file name inside the bundle (no slash, colon or control character). */
const MacosFileName = z.string().regex(/^[^/:\x00-\x1f\x7f]{1,128}$/u);

/** 0.2: macOS `.keylayout` build choices; `OnLoss` is that of the file's version. */
const targetsMacos = (OnLoss: OnLossSchema) =>
  z
  .strictObject({
    layoutName: MacosFileName.meta({
      description:
        "Layout name: keyboard/@name, the .keylayout and .icns file names, the KLInfo_<name> key (rule layoutName).",
    }).optional(),
    bundleName: MacosFileName.meta({
      description: "Bundle folder name without .bundle, and CFBundleName (rule bundleName).",
    }).optional(),
    bundleId: MacosReverseDns.meta({ description: "CFBundleIdentifier (rule bundleId)." }).optional(),
    inputSourceId: MacosReverseDns.meta({
      description: "TISInputSourceID, the input-source id the system selects by (rule inputSourceId).",
    }).optional(),
    language: z
      .string()
      .regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/u)
      .meta({ description: "TISIntendedLanguage, a BCP 47 tag (rule language)." })
      .optional(),
    localizedNames: z
      .record(
        z
          .string()
          .regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/u)
          .meta({ description: "A BCP 47 tag: the <tag>.lproj folder." }),
        Text,
      )
      .meta({ description: "Localised layout names, one InfoPlist.strings per language (rule localizedNames)." })
      .optional(),
    bundleVersion: z
      .string()
      .regex(/^[0-9]{1,9}(\.[0-9]{1,9}){0,2}$/u)
      .meta({ description: "CFBundleShortVersionString and CFBundleVersion (rule bundleVersion)." })
      .optional(),
    icon: z
      .strictObject({
        icns: z
          .string()
          .regex(/^[A-Za-z0-9+/]+={0,2}$/u)
          .meta({ description: "The .icns file, base64 (RFC 4648 §4, no line breaks)." }),
        template: z
          .boolean()
          .meta({ description: "TISIconIsTemplate: the icon is a template image the system tints. Default false." })
          .optional(),
      })
      .meta({ description: "The layout's icon, Resources/<layoutName>.icns (no default: the system's generic icon)." })
      .optional(),
    group: z
      .int()
      .min(0)
      .max(32767)
      .meta({ description: "keyboard/@group, the script code; 126 = Unicode (rule group)." })
      .optional(),
    id: z
      .int()
      .min(-2147483648)
      .max(2147483647)
      .meta({ description: "keyboard/@id; Unicode layouts use negative ids (rule keyboardId)." })
      .optional(),
    maxout: z
      .int()
      .min(1)
      .max(65535)
      .meta({ description: "keyboard/@maxout: most UTF-16 units of one output; a terminator and a key output count separately (rule maxout)." })
      .optional(),
    hardwareRanges: z
      .array(
        z
          .strictObject({
            first: z.int().min(0).max(255).meta({ description: "layout/@first, first hardware keyboard type." }),
            last: z.int().min(0).max(255).meta({ description: "layout/@last, last hardware keyboard type." }),
          })
          .meta({ description: "One <layout> element." }),
      )
      .min(1)
      .meta({ description: "The <layout> elements, in order, all selecting the one key map set (rule hardwareRanges)." })
      .optional(),
    keys: z
      .record(
        PositionId,
        z
          .strictObject({
            keyCode: z.int().min(0).max(255).meta({ description: "Virtual key code, key/@code (rule keyCode)." }),
          })
          .meta({ description: "macOS data of one position." }),
      )
      .meta({ description: "macOS data per position." })
      .optional(),
    standardKeys: z
      .boolean()
      .meta({
        description:
          "true: unbound standard keys (Return, Tab, arrows, …) get the outputs of the position table (rule standardKeys, default true).",
      })
      .optional(),
    commandMap: z
      .enum(["withoutCommand", "base"])
      .meta({
        description:
          "States with Command that no layer serves: the table of the same state without Command, or the base table (rule commandMap).",
      })
      .optional(),
    controlMap: z
      .enum(["controlCharacters", "withoutControl", "nothing"])
      .meta({
        description:
          "States with Control that no layer serves: the table without Control with ASCII letters turned into U+0001–U+001A, that table unchanged, or no output (rule controlMap).",
      })
      .optional(),
    modifiers: z
      .strictObject({
        command: z
          .string()
          .regex(/^[A-Za-z][A-Za-z0-9]{0,31}$/u)
          .meta({ description: "The custom held component that is the Command key." })
          .optional(),
      })
      .meta({ description: "Which custom components are macOS modifier keys." })
      .optional(),
    deadKeys: z
      .record(
        z.string(),
        z
          .strictObject({
            state: MacosStateName.meta({ description: "The dead key's state name (rule stateName)." }).optional(),
          })
          .meta({ description: "macOS data of one dead key." }),
      )
      .meta({ description: "macOS data per dead key." })
      .optional(),
    onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
  })
  .meta({ description: "macOS build choices (SPEC §16.4, targets/macos.md)." });

/** 0.2: an XKB symbols file or section name (rules symbolsName, variant). */
const XkbFileName = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/u);

/** 0.2: an XKB key type: a stock type of targets/xkb.md §3, or a yakbd type named by its level map. */
const XkbKeyType = z
  .xor([
    z
      .enum([
        "ONE_LEVEL",
        "TWO_LEVEL",
        "ALPHABETIC",
        "FOUR_LEVEL",
        "CTRL+ALT",
        "FOUR_LEVEL_ALPHABETIC",
        "FOUR_LEVEL_SEMIALPHABETIC",
        "FOUR_LEVEL_PLUS_LOCK",
        "EIGHT_LEVEL",
        "EIGHT_LEVEL_ALPHABETIC",
        "EIGHT_LEVEL_SEMIALPHABETIC",
      ])
      .meta({ description: "A stock key type of xkeyboard-config (targets/xkb.md §3)." }),
    z
      .string()
      .regex(/^YAKBD_[1-8]{8}([1-8]{8})?$/u)
      .meta({
        description:
          "A yakbd key type: YAKBD_ and the level of each of the 8 (or 16, with LevelFive) states, Lock always consumed (targets/xkb.md §3).",
      }),
  ])
  .meta({ description: "An XKB key type name (rule keyType)." });

/** 0.2: a modifier component that drives an XKB level shift (a built-in Alt component or a custom held one). */
const XkbLevelComponent = z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,31}$/u);

/** 0.2: Linux XKB build choices; `OnLoss` is that of the file's version. */
const targetsXkb = (OnLoss: OnLossSchema) =>
  z
  .strictObject({
    symbolsName: XkbFileName.meta({
      description: "The symbols file name and the layout name in rules/evdev.xml (rule symbolsName).",
    }).optional(),
    variant: XkbFileName.meta({
      description:
        "The section name: basic (default) is the file's default section and a layout of its own; any other name is a variant of the layout symbolsName (rule variant).",
    }).optional(),
    description: Text.meta({
      description: "The layout's name: name[Group1] and the registry's <description> (rule description).",
    }).optional(),
    shortDescription: z
      .string()
      .regex(/^[^\x00-\x1f\x7f]{1,16}$/u)
      .meta({ description: "The registry's <shortDescription>, the short label of the layout (rule shortDescription)." })
      .optional(),
    languages: unique(
      z
        .array(z.string().regex(/^[a-z]{3}$/u).meta({ description: "An ISO 639-2 or 639-3 language code." }))
        .min(1),
    )
      .meta({ description: "The registry's <languageList>, three-letter codes; no default (none written)." })
      .optional(),
    characters: z
      .enum(["keysyms", "utf8"])
      .meta({
        description:
          "How characters are written in the symbols file: keysym names and Uxxxx (any libxkbcommon, xkbcomp) or UTF-8 strings (libxkbcommon 1.9 and later only) (rule characters).",
      })
      .optional(),
    keys: z
      .record(
        PositionId,
        z
          .strictObject({
            keyName: z
              .string()
              .regex(/^[0-9A-Za-z_+-]{1,4}$/u)
              .meta({ description: "The XKB key name, without the angle brackets (rule keyName)." })
              .optional(),
            type: XkbKeyType.meta({ description: "The key type of this key (rule keyType)." }).optional(),
          })
          .meta({ description: "XKB data of one position." }),
      )
      .meta({ description: "XKB data per position." })
      .optional(),
    customTypes: z
      .boolean()
      .meta({
        description:
          "true: a key no stock type fits gets a yakbd key type, installed with the layout (needs libxkbcommon 1.13 or a types option on X11); default false (rule keyType).",
      })
      .optional(),
    modifiers: z
      .strictObject({
        levelThree: XkbLevelComponent.meta({
          description: "The component that is the level-3 shift: altR, alt or a custom held component (rule levelThree).",
        }).optional(),
        levelFive: XkbLevelComponent.meta({
          description: "The component that is the level-5 shift: a custom held component or altR; no default (no level 5).",
        }).optional(),
      })
      .meta({ description: "Which components shift XKB levels." })
      .optional(),
    deadKeys: z
      .record(
        z.string(),
        z
          .strictObject({
            keysym: z
              .string()
              .regex(/^dead_[A-Za-z0-9_]{1,40}$/u)
              .meta({ description: "The dead_* keysym the dead key's key types (rule deadKeysym)." })
              .optional(),
          })
          .meta({ description: "XKB data of one dead key." }),
      )
      .meta({ description: "XKB data per dead key." })
      .optional(),
    compose: z
      .strictObject({
        write: z
          .boolean()
          .meta({ description: "Write a Compose file with the dead-key sequences (default: when the file has dead keys)." })
          .optional(),
        includeLocale: z
          .boolean()
          .meta({ description: 'Start the Compose file with include "%L", keeping the system sequences (default true).' })
          .optional(),
      })
      .meta({ description: "The Compose file of the build (rule compose)." })
      .optional(),
    onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
  })
  .meta({ description: "Linux XKB build choices (SPEC §16.5, targets/xkb.md)." });

// ---- 0.3 targets ----
// Five new targets, each a closed object of its own (D150). Each starts as a placeholder holding only `onLoss`; the
// work on that target adds its fields here (SPEC §16.6–§16.10, its targets/<name>.md) and nowhere else. The touch
// model they read (SPEC §8, §9.4, §14.4) is shared and edited only by the spec core.

/** 0.3: Android physical keyboards, a `.kcm` key character map in a code-free APK (SPEC §16.6). */
const targetsAndroid = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "Android physical-keyboard build choices (SPEC §16.6, targets/android.md)." });

// The two on-screen keyboard targets share the shape of their presentation fields (targets/touch-runtime.md).

/** 0.3: a BCP 47 language tag of an on-screen keyboard (Android subtype locale, iOS PrimaryLanguage). */
const TouchLanguage = z.string().regex(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/u);

/** 0.3: the bottom row a touch target adds to a set with systemRow (targets/androidime.md §2, targets/ios.md §2). */
const SystemRow = z
  .array(
    z
      .xor([
        z
          .enum(["layerSwitch", "nextKeyboard", "space", "enter"])
          .meta({ description: "A key the target makes: layer switch (123/ABC), next keyboard, space or enter." }),
        z
          .strictObject({ keyId: Id.meta({ description: "A key of `keys` (or an implied key)." }) })
          .meta({ description: "A key of the file." }),
      ])
      .meta({ description: "One key of the system row." }),
  )
  .min(1);

/** 0.3: the long-press popup's choices per row. */
const PopupColumns = z.int().min(1).max(16);

/** 0.3: Return-key labels per field action of one target. */
const returnKeyLabels = (actions: readonly [string, ...string[]], what: string) =>
  z
    .partialRecord(z.enum(actions).meta({ description: `${what} of the text field.` }), Text)
    .meta({ description: "The Return key's label per action of the text field (rule returnKeyLabels)." });

/** 0.3: an Android on-screen keyboard, one input-method APK for this layout (SPEC §16.7). */
const targetsAndroidime = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      packageName: z
        .string()
        .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/u)
        .max(255)
        .meta({ description: "The APK's package name, the application id a builder registers (rule packageName)." })
        .optional(),
      appName: Text.meta({
        description: "The app label and the input method's name in the system settings (rule appName).",
      }).optional(),
      language: TouchLanguage.meta({
        description: "The language of the input method's one subtype, a BCP 47 tag (rule language).",
      }).optional(),
      versionCode: z
        .int()
        .min(1)
        .max(2100000000)
        .meta({ description: "android:versionCode; a newer build of the same package needs a higher one (rule versionCode)." })
        .optional(),
      versionName: z
        .string()
        .regex(/^[^\x00-\x1f\x7f]{1,64}$/u)
        .meta({ description: "android:versionName, shown to users (rule versionName)." })
        .optional(),
      physicalKeys: z
        .boolean()
        .meta({
          description:
            "true: a physical keyboard typing while this input method is active types the hardware layers (rule physicalKeys).",
        })
        .optional(),
      returnKeyLabels: returnKeyLabels(
        ["default", "go", "search", "send", "next", "done", "previous"],
        "An Android editor action (EditorInfo IME_ACTION_*; default: none or unspecified)",
      ).optional(),
      popupColumns: PopupColumns.meta({ description: "Long-press popup: choices per row (rule popupColumns)." }).optional(),
      systemRow: SystemRow.meta({
        description: "The keys of the bottom row added to a touch set with systemRow, left to right (rule systemRow).",
      }).optional(),
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "Android on-screen keyboard build choices (SPEC §16.7, targets/androidime.md)." });

/** 0.3: an iOS bundle identifier. */
const IosBundleId = z.string().regex(/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/u).max(155);

/** 0.3: an iOS on-screen keyboard, one app with one keyboard extension for this layout (SPEC §16.8). */
const targetsIos = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      appName: Text.meta({
        description: "CFBundleDisplayName of the app and of the keyboard extension, the keyboard's name in Settings (rule appName).",
      }).optional(),
      bundleId: IosBundleId.meta({ description: "The app's CFBundleIdentifier (rule bundleId)." }).optional(),
      extensionBundleId: IosBundleId.meta({
        description: "The keyboard extension's CFBundleIdentifier; begins with bundleId and a dot (rule extensionBundleId).",
      }).optional(),
      language: TouchLanguage.meta({
        description: "PrimaryLanguage of the keyboard extension, a BCP 47 tag (rule language).",
      }).optional(),
      bundleVersion: z
        .string()
        .regex(/^[0-9]{1,9}(\.[0-9]{1,9}){0,2}$/u)
        .meta({ description: "CFBundleShortVersionString and CFBundleVersion of app and extension (rule bundleVersion)." })
        .optional(),
      returnKeyLabels: returnKeyLabels(
        ["default", "go", "google", "join", "next", "route", "search", "send", "yahoo", "done", "emergencyCall", "continue"],
        "An iOS return key type (UIReturnKeyType)",
      ).optional(),
      popupColumns: PopupColumns.meta({ description: "Long-press popup: choices per row (rule popupColumns)." }).optional(),
      systemRow: SystemRow.meta({
        description: "The keys of the bottom row added to a touch set with systemRow, left to right (rule systemRow).",
      }).optional(),
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "iOS keyboard build choices (SPEC §16.8, targets/ios.md)." });

/** 0.3: ChromeOS, a Manifest V3 input-method extension (SPEC §16.9). */
const targetsChromeos = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      name: z
        .string()
        .regex(/^[^\x00-\x1f\x7f]{1,75}$/u)
        .meta({
          description:
            "The extension's name and the input method's name in the ChromeOS settings: manifest name and input_components name, at most 75 characters (rule name).",
        })
        .optional(),
      engineId: z
        .string()
        .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u)
        .meta({
          description:
            "The input component's id (input_components id), the engine id chrome.input.ime names; not Chrome's extension id (rule engineId).",
        })
        .optional(),
      version: z
        .string()
        .regex(/^(0|[1-9][0-9]{0,4})(\.(0|[1-9][0-9]{0,4})){0,3}$/u)
        .meta({
          description:
            "The manifest version: one to four dot-separated integers 0-65535 without leading zeros; Chrome also refuses all zeros (rule version).",
        })
        .optional(),
      language: TouchLanguage.meta({
        description: "The input component's language, a BCP 47 tag (rule language).",
      }).optional(),
      description: z
        .string()
        .regex(/^[^\x00-\x1f\x7f]{1,132}$/u)
        .meta({ description: "The manifest description, at most 132 characters (rule description)." })
        .optional(),
      systemLayout: z
        .string()
        .regex(/^[A-Za-z0-9][A-Za-z0-9:()_+-]{0,63}$/u)
        .meta({
          description:
            "The input component's layouts entry: the system keyboard layout ChromeOS keeps under the input method, which gives the keys the layout leaves to the system, Control and Alt shortcuts among them (rule systemLayout).",
        })
        .optional(),
      keys: z
        .record(
          PositionId,
          z
            .strictObject({
              code: z
                .string()
                .regex(/^[A-Za-z][A-Za-z0-9]{0,63}$/u)
                .meta({ description: "The DOM KeyboardEvent code of the position (rule code)." }),
            })
            .meta({ description: "One position's ChromeOS key." }),
        )
        .meta({ description: "Per position: its DOM code (rule code, targets/chromeos-default-code.tsv)." })
        .optional(),
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "ChromeOS input-method build choices (SPEC §16.9, targets/chromeos.md)." });

/** 0.3: Keyman, a keyboard package `.kmp` with this one keyboard (SPEC §16.10). */
const targetsKeyman = (OnLoss: OnLossSchema) =>
  z
    .strictObject({
      onLoss: OnLoss.meta({ description: "Loss policy for this target." }).optional(),
    })
    .meta({ description: "Keyman package build choices (SPEC §16.10, targets/keyman.md)." });

// ---- the file, per version ----

/** The format versions this source generates, oldest first. Each schema accepts only its own `kbl` value. */
export const versions = ["0.1", "0.2", "0.3"] as const;
export type Version = (typeof versions)[number];

/** Where the generated JSON Schema of a version lives, and its `$id`. */
export const schemaPath = (v: Version) => `schema/${v}/kbl.schema.json`;
export const schemaId = (v: Version) => `https://yakbd.github.io/kbl-spec/schema/${v}/kbl.schema.json`;

/** The source formats of `metadata.provenance.format` per version. */
const formats01 = ["cldr", "klc", "windowsDll", "kbl", "other"] as const;
const formats02 = ["cldr", "klc", "windowsDll", "kbl", "keylayout", "xkb", "other"] as const;
const formats03 = [
  "cldr",
  "klc",
  "windowsDll",
  "kbl",
  "keylayout",
  "xkb",
  "kcm",
  "kbdgen",
  "kmn",
  "keymantouch",
  "other",
] as const;

function kblFile(v: Version) {
  const OnLoss = { "0.1": OnLoss01, "0.2": OnLoss02, "0.3": OnLoss03 }[v];
  const targets = {
    windows: targetsWindows(OnLoss).optional(),
    klc: z
      .strictObject({
        msklcEditorCompatible: z
          .boolean()
          .meta({ description: "Write only what the MSKLC editor keeps (default false)." })
          .optional(),
        versionLine: z.string().meta({ description: "Text of the VERSION line." }).optional(),
        onLoss: OnLoss.meta({ description: "Loss policy for .klc conversion." }).optional(),
      })
      .meta({ description: ".klc conversion choices (SPEC §16.2)." })
      .optional(),
    cldr: z
      .strictObject({
        conformsTo: z.int().min(45).meta({ description: "keyboard3/@conformsTo to write." }).optional(),
        locale: z.string().meta({ description: "keyboard3/@locale if different from metadata.id." }).optional(),
        carryInSpecial: z
          .boolean()
          .meta({ description: "Carry kbl-only data in a <special> element (default true)." })
          .optional(),
        onLoss: OnLoss.meta({ description: "Loss policy for CLDR conversion." }).optional(),
      })
      .meta({ description: "CLDR conversion choices (SPEC §16.3)." })
      .optional(),
  };
  const targets02 = { ...targets, macos: targetsMacos(OnLoss).optional(), xkb: targetsXkb(OnLoss).optional() };
  const targets03 = {
    ...targets02,
    android: targetsAndroid(OnLoss).optional(),
    androidime: targetsAndroidime(OnLoss).optional(),
    ios: targetsIos(OnLoss).optional(),
    chromeos: targetsChromeos(OnLoss).optional(),
    keyman: targetsKeyman(OnLoss).optional(),
  };
  const Targets = z
    .strictObject({ "0.1": targets, "0.2": targets02, "0.3": targets03 }[v])
    .meta({ description: "Per-target choices (SPEC §16)." });

  return z
    .strictObject({
      $schema: z.string().meta({ description: "Schema URL; informative." }).optional(),
      kbl: z.literal(v).meta({ description: "Format version." }),
      metadata: metadata({ "0.1": formats01, "0.2": formats02, "0.3": formats03 }[v]),
      settings: Settings.optional(),
      positions: Positions.optional(),
      forms: Forms.optional(),
      customModifiers: CustomModifiers.optional(),
      keys: keys(v).optional(),
      hardware: Hardware.optional(),
      touch: z.array(touch(v)).meta({ description: "Touch layouts (SPEC §9.4)." }).optional(),
      deadKeys: DeadKeys.optional(),
      flicks: Flicks.optional(),
      displays: Displays.optional(),
      variables: z
        .array(
          z
            .strictObject({
              id: VariableId.meta({ description: "Unique id." }),
              type: z.enum(["string", "set", "uset"]).meta({ description: "string, set or uset." }),
              value: Pattern.meta({ description: "Value in CLDR syntax." }),
            })
            .meta({ description: "A CLDR variable (SPEC §13.1)." }),
        )
        .meta({ description: "CLDR variables in order (SPEC §13.1)." })
        .optional(),
      transforms: Transforms.optional(),
      tests: z.array(Tests).meta({ description: "Test files (SPEC §15)." }).optional(),
      targets: Targets.optional(),
      onLoss: OnLoss.meta({ description: "Loss policy for every target (SPEC §17.2)." }).optional(),
      extensions: z
        .record(
          z
            .string()
            .regex(/^([a-z][a-z0-9+.-]*:.+|[a-z0-9-]+(\.[a-z0-9-]+)+)$/u)
            .meta({ description: "An absolute URI or reverse-DNS name." }),
          z.unknown(),
        )
        .meta({ description: "Data of other tools, by URI or reverse-DNS name (SPEC §18)." })
        .optional(),
      cldrSpecial: cldrSpecial("keyboard3 (and keys, flicks, variables with a kbl:parent comment)").optional(),
    })
    .meta({
      $id: schemaId(v),
      title: `.kbl.json keyboard layout, version ${v} (draft)`,
      description:
        "A YAKBD keyboard-layout file. Normative text: SPEC.md; this schema checks structure only (SPEC §19 lists further rules).",
    });
}

/** The 0.1 schema. Frozen: tools/check pins the SHA-256 of its generated JSON Schema. */
export const KblFile01 = kblFile("0.1");

/** The 0.2 schema. Frozen as published: tools/check pins the SHA-256 of its generated JSON Schema. */
export const KblFile02 = kblFile("0.2");

/** The 0.3 schema (draft until it is tagged). */
export const KblFile03 = kblFile("0.3");

/** The schema of each version. */
export const schemas = { "0.1": KblFile01, "0.2": KblFile02, "0.3": KblFile03 } as const;

/** The newest version's schema. */
export const KblFile = KblFile03;

/** A parsed .kbl.json file of the newest version. */
export type KblFile = z.infer<typeof KblFile>;
