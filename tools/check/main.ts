// The repository checks of the .kbl.json specification. Run from the repository root: `npm run check`
// (`npm test` also type-checks and checks that the generated schemas are fresh). For every version V of
// src/schema.ts (0.1, 0.2, 0.3) it checks that
//
//  1. schema/V/kbl.schema.json compiles as a JSON Schema draft 2020-12 schema (meta-schema validation included),
//     has the $id of V, and, for 0.1 and 0.2, still has the pinned SHA-256 (both are frozen; COMPATIBILITY.md);
//  2. every property and every $defs entry of the schema has a description;
//  3. the loss kinds of SPEC.md §17.3 equal the kinds the newest schema accepts in onLoss, and each older schema's
//     kinds are exactly those outside the families and kinds that later versions add; for every target of `targets` below, the default
//     rules of its "Rule index" sections equal the schema's <target>Default.<rule> kinds; every loss kind named in
//     targets/*.md and coverage/*.md is defined in SPEC.md;
//  4. every property name of the schema is mentioned in SPEC.md;
//  5. each target's position table (SPEC §16, "Position tables") is well formed: Table A
//     (targets/windows-default-vk.tsv) with its own columns and known virtual keys, the others in the common shape;
//  6. every examples/*.kbl.json is accepted by the zod schema and by the JSON Schema of the version its `kbl` names,
//     passes the reference checks of SPEC §19 item 1 (a subset), the layer-overlap rule of §7.3, and uses only
//     known virtual keys;
//  7. every testdata/schema/V/valid/*.kbl.json is accepted and every testdata/schema/V/invalid/*.kbl.json is
//     rejected, by the zod schema and by the JSON Schema of V alike;
//  8. each version holds the older ones: every example and valid case of a version, with `kbl` and `$schema`
//     changed to a later version, is accepted by both schemas of that version.
//
// Check 6 also covers the 0.3 touch rules of §19 item 5 (returnLayerId in its set, one rowHeights entry per row).
// The SPEC §19 rules are checked here, not in the schema: they relate parts of a file to each other.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as z from "zod";
import { lossKindsCore03, schemaId, schemaPath, schemas, versions, type Version } from "../../src/schema.ts";

/** SHA-256 of the frozen schema files as published. Change one only for a recorded bug fix of that version, or a new
 * loss kind COMPATIBILITY.md allows within it. */
const frozen: Partial<Record<Version, string>> = {
  "0.1": "9011b8c6bfbe98801a54c98ad75392ca63f2aa07c500308d395cf88270e5ec3e",
  "0.2": "b3a9c236925beb301d1c569c24a7264a4727a923ce6ca0bc81f5c800acd4f992",
};

/** The build targets: the files of their rule indexes and their position tables (SPEC §16). A new target adds a
 * line here. Its position table may be missing until the target writes it. */
const targets = [
  { name: "windows", ruleFiles: ["targets/windows.md", "targets/windows-install.md"] },
  { name: "macos", ruleFiles: ["targets/macos.md"], table: "targets/macos-default-keycode.tsv" },
  { name: "xkb", ruleFiles: ["targets/xkb.md"], table: "targets/xkb-default-keyname.tsv" },
  { name: "android", ruleFiles: ["targets/android.md"], table: "targets/android-default-keycode.tsv" },
  { name: "androidime", ruleFiles: ["targets/androidime.md"] },
  { name: "ios", ruleFiles: ["targets/ios.md"] },
  { name: "chromeos", ruleFiles: ["targets/chromeos.md"], table: "targets/chromeos-default-code.tsv" },
  { name: "keyman", ruleFiles: ["targets/keyman.md"] },
];

/** The loss-kind families each version adds; 0.1 has every other family. */
const familiesSince: Partial<Record<Version, Set<string>>> = {
  "0.2": new Set(["macos", "macosDefault", "xkb", "xkbDefault"]),
  "0.3": new Set([
    "android",
    "androidDefault",
    "androidime",
    "androidimeDefault",
    "chromeos",
    "chromeosDefault",
    "ios",
    "iosDefault",
    "kbdgen",
    "keyman",
    "keymanDefault",
    "keymantouch",
    "kmn",
  ]),
};
/** The kinds a version adds to older families (the touch core of 0.3 in `general` and `cldr`). */
const kindsSince: Partial<Record<Version, Set<string>>> = { "0.3": new Set<string>(lossKindsCore03) };


type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const errs: string[] = [];
const errf = (msg: string) => errs.push(msg);

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    console.error(String(e));
    process.exit(2);
  }
}

function decode(text: string, name: string): Json | undefined {
  try {
    return JSON.parse(text) as Json;
  } catch (e) {
    errf(`${name}: ${(e as Error).message}`);
    return undefined;
  }
}

// Typed views of decoded JSON; a missing or mistyped value gives an empty view.
const obj = (v: Json | undefined): Obj => (v !== null && typeof v === "object" && !Array.isArray(v) ? v : {});
const arr = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : []);
const str = (v: Json | undefined): string => (typeof v === "string" ? v : "");
const isObj = (v: Json | undefined): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const sorted = (o: Obj) => Object.keys(o).sort();
const has = (o: Obj, k: string) => Object.hasOwn(o, k);
const diff = (a: Set<string>, b: Set<string>) => [...a].filter((k) => !b.has(k)).sort();
const glob = (dir: string, suffix: string) => {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(suffix))
      .sort()
      .map((f) => `${dir}/${f}`);
  } catch {
    return [];
  }
};

// ---- schema checks ----

function checkDescriptions(node: Json, path: string) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => checkDescriptions(v, `${path}/${i}`));
  } else if (isObj(node)) {
    const props = obj(node.properties);
    for (const name of sorted(props)) {
      if (!has(obj(props[name]), "description")) errf(`schema: property without description: ${path}/${name}`);
    }
    for (const k of sorted(node)) checkDescriptions(node[k], `${path}/${k}`);
  }
}

function propNames(node: Json, acc: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((v) => propNames(v, acc));
  } else if (isObj(node)) {
    for (const k of Object.keys(obj(node.properties))) acc.add(k);
    for (const v of Object.values(node)) propNames(v, acc);
  }
}

// ---- virtual keys ----

const vkNames = new Set<string>();

function vkOK(vk: string): boolean {
  const v = vk.toUpperCase().replace(/^VK_/, "");
  return vkNames.has(v) || /^[0-9A-Z]$/.test(v) || /^0X[0-9A-F]{2}$/.test(v);
}

function allVKs(node: Json, acc: string[]) {
  if (Array.isArray(node)) {
    node.forEach((v) => allVKs(v, acc));
  } else if (isObj(node)) {
    for (const k of sorted(node)) {
      const v = node[k];
      if (k === "vk" && typeof v === "string") acc.push(v);
      else allVKs(v, acc);
    }
  }
}

// ---- reference checks (SPEC §19 item 1, subset) ----

const implied = (id: string) => /^[0-9A-Za-z]$/.test(id) || id === "space" || id === "gap";
const builtin = new Set(["shift", "ctrl", "ctrlL", "ctrlR", "alt", "altL", "altR", "caps", "other"]);
// Loss kinds of every family SPEC §17.3 or the schema knows; set in main once the families are read.
let reKindInText = /$^/g;

function refs(doc: Obj, name: string, specKinds: Set<string>) {
  const keyBag = obj(doc.keys);
  const dks = obj(doc.deadKeys);
  const pos = obj(doc.positions);
  const flicks = obj(doc.flicks);
  const forms = obj(doc.forms);
  const customs = obj(doc.customModifiers);
  const vars = new Set(arr(doc.variables).map((v) => str(obj(v).id)));
  const keyOK = (k: string, where: string) => {
    if (!has(keyBag, k) && !implied(k)) errf(`${name}: ${where} refers to undefined key ${k}`);
  };
  const dkOK = (d: string, where: string) => {
    if (!has(dks, d)) errf(`${name}: ${where} refers to undefined dead key ${d}`);
  };
  const posOK = (p: string, where: string) => {
    if (!has(pos, p)) errf(`${name}: ${where} uses undefined position ${p}`);
  };
  const marked = (m: Json | undefined, where: string) => {
    for (const it of arr(m)) {
      const o = obj(it);
      if (has(o, "variable") && !vars.has(str(o.variable))) {
        errf(`${name}: ${where} refers to undefined variable ${str(o.variable)}`);
      }
    }
  };
  const binding = (b: Json, where: string) => {
    const o = obj(b);
    if (has(o, "key")) keyOK(str(o.key), where);
    if (has(o, "deadKey")) dkOK(str(o.deadKey), where);
    if (has(o, "output")) marked(o.output, where);
  };
  const mods = (ms: Json | undefined, where: string) => {
    for (const s of arr(ms)) {
      for (const c of arr(s)) {
        if (!has(customs, str(c)) && !builtin.has(str(c))) {
          errf(`${name}: ${where} uses undefined modifier component ${str(c)}`);
        }
      }
    }
  };

  for (const kid of sorted(keyBag)) {
    const k = obj(keyBag[kid]);
    for (const f of ["longPressKeyIds", "multiTapKeyIds"]) {
      for (const x of arr(k[f])) keyOK(str(x), `keys.${kid}.${f}`);
    }
    if (has(k, "deadKey")) dkOK(str(k.deadKey), `keys.${kid}`);
    if (has(k, "flickId") && !has(flicks, str(k.flickId))) errf(`${name}: keys.${kid}.flickId undefined`);
    marked(k.output, `keys.${kid}.output`);
  }
  for (const fid of sorted(flicks)) {
    for (const s of arr(obj(flicks[fid]).segments)) keyOK(str(obj(s).keyId), `flicks.${fid}`);
  }
  for (const fid of sorted(forms)) {
    for (const row of arr(obj(forms[fid]).rows)) {
      for (const p of arr(row)) posOK(str(p), `forms.${fid}`);
    }
  }
  if (isObj(doc.hardware)) {
    const hw = doc.hardware;
    if (has(hw, "formId") && !has(forms, str(hw.formId)))
      errf(`${name}: hardware.formId ${str(hw.formId)} not in forms`);
    arr(hw.layers).forEach((l, i) => {
      const where = `hardware.layers[${i}]`;
      mods(obj(l).modifiers, where);
      const b = obj(obj(l).bindings);
      for (const p of sorted(b)) {
        posOK(p, where);
        binding(b[p], `${where}.${p}`);
      }
    });
  }
  for (const t of arr(doc.touch)) {
    let hasBase = false;
    const ids = new Set(arr(obj(t).layers).map((l) => str(obj(l).id)));
    for (const l of arr(obj(t).layers)) {
      const id = str(obj(l).id);
      hasBase ||= id === "base";
      for (const row of arr(obj(l).rows)) {
        for (const k of arr(row)) keyOK(str(k), `touch layer ${id}`);
      }
      const back = obj(l).returnLayerId;
      if (back !== undefined && !ids.has(str(back)))
        errf(`${name}: touch layer ${id}: returnLayerId ${str(back)} is not a layer of its set`);
      const heights = obj(l).rowHeights;
      if (heights !== undefined && arr(heights).length !== arr(obj(l).rows).length)
        errf(`${name}: touch layer ${id}: rowHeights has ${arr(heights).length} entries for ${arr(obj(l).rows).length} rows`);
    }
    if (!hasBase) errf(`${name}: touch set without layer base`);
  }
  for (const did of sorted(dks)) {
    for (const e of arr(obj(dks[did]).entries)) {
      for (const f of ["base", "result"]) {
        const ref = obj(obj(e)[f]);
        if (has(ref, "deadKey")) dkOK(str(ref.deadKey), `deadKeys.${did}`);
      }
    }
  }
  for (const cid of sorted(customs)) {
    for (const p of arr(obj(customs[cid]).positions)) posOK(str(p), `customModifiers.${cid}`);
  }
  for (const e of arr(obj(doc.displays).entries)) {
    if (has(obj(e), "keyId")) keyOK(str(obj(e).keyId), "displays");
  }
  const win = obj(obj(doc.targets).windows);
  for (const p of sorted(obj(win.keys))) posOK(p, "targets.windows.keys");
  for (const d of sorted(obj(win.deadKeys))) dkOK(d, "targets.windows.deadKeys");
  const mac = obj(obj(doc.targets).macos);
  for (const p of sorted(obj(mac.keys))) posOK(p, "targets.macos.keys");
  for (const d of sorted(obj(mac.deadKeys))) dkOK(d, "targets.macos.deadKeys");
  const cmd = obj(mac.modifiers).command;
  if (cmd !== undefined && obj(customs[str(cmd)]).kind !== "held")
    errf(`${name}: targets.macos.modifiers.command ${str(cmd)} is not a held custom modifier`);
  const xkb = obj(obj(doc.targets).xkb);
  for (const p of sorted(obj(xkb.keys))) posOK(p, "targets.xkb.keys");
  for (const d of sorted(obj(xkb.deadKeys))) dkOK(d, "targets.xkb.deadKeys");
  for (const lv of ["levelThree", "levelFive"]) {
    const c = obj(xkb.modifiers)[lv];
    if (c !== undefined && !["altR", "alt"].includes(str(c)) && obj(customs[str(c)]).kind !== "held")
      errf(`${name}: targets.xkb.modifiers.${lv} ${str(c)} is neither altR, alt nor a held custom modifier`);
  }
  const seen = new Set<string>();
  for (const p of sorted(pos)) {
    const sc = obj(pos[p]).scanCode;
    if (sc !== undefined) {
      const u = str(sc).toUpperCase();
      if (seen.has(u)) errf(`${name}: duplicate scanCode ${u}`);
      seen.add(u);
    }
  }
  for (const tf of arr(doc.tests)) {
    for (const suite of arr(obj(tf).suites)) {
      for (const t of arr(obj(suite).tests)) {
        for (const st of arr(obj(t).steps)) {
          const ks = obj(obj(st).keystroke);
          if (has(ks, "key")) keyOK(str(ks.key), "tests");
          if (has(ks, "position")) posOK(str(ks.position), "tests");
        }
      }
    }
  }
  for (const m of JSON.stringify(doc).matchAll(reKindInText)) {
    if (!specKinds.has(m[1])) errf(`${name}: undefined loss kind ${m[1]}`);
  }
}

// ---- layer overlap (SPEC §7.3) ----

function overlap(doc: Obj, name: string) {
  const customs = obj(doc.customModifiers);
  const atoms = ["shift", "ctrlL", "ctrlR", "altL", "altR", "caps", ...sorted(customs)];

  const matches = (mset: Json[], st: Set<string>): boolean => {
    const need = new Set(mset.map(str));
    if (need.has("other")) return false;
    const ctrl = st.has("ctrlL") || st.has("ctrlR");
    const alt = st.has("altL") || st.has("altR");
    for (const c of need) {
      if (c === "shift" || c === "caps" || has(customs, c)) {
        if (!st.has(c)) return false;
      } else if (c === "ctrl") {
        if (!ctrl) return false;
      } else if (c === "alt") {
        if (!alt) return false;
      } else if (c === "ctrlL" || c === "altL") {
        if (!st.has(c) || st.has(c.slice(0, -1) + "R")) return false;
      } else if (c === "ctrlR" || c === "altR") {
        if (!st.has(c) || st.has(c.slice(0, -1) + "L")) return false;
      }
    }
    for (const c of ["shift", "caps", ...sorted(customs)]) {
      if (st.has(c) && !need.has(c)) return false;
    }
    if (ctrl && !(need.has("ctrl") || need.has("ctrlL") || need.has("ctrlR"))) return false;
    if (alt && !(need.has("alt") || need.has("altL") || need.has("altR"))) return false;
    return true;
  };

  const sets: { label: string; layers: Json[] }[] = [];
  if (isObj(doc.hardware)) sets.push({ label: "hardware", layers: arr(doc.hardware.layers) });
  arr(doc.touch).forEach((t, i) => {
    sets.push({ label: `touch[${i}]`, layers: arr(obj(t).layers).filter((l) => has(obj(l), "modifiers")) });
  });
  for (const s of sets) {
    for (let n = 0; n < 1 << atoms.length; n++) {
      const st = new Set(atoms.filter((_, i) => ((n >> i) & 1) === 1));
      const hit: number[] = [];
      s.layers.forEach((l, j) => {
        if (arr(obj(l).modifiers).some((m) => matches(arr(m), st))) hit.push(j);
      });
      if (hit.length > 1) {
        errf(
          `${name}: ${s.label} layers [${hit.join(" ")}] overlap in state [${atoms.filter((a) => st.has(a)).join(" ")}]`,
        );
        break;
      }
    }
  }
}

// ---- the default VK table ----

function checkDefaultTable() {
  const path = "targets/windows-default-vk.tsv";
  const flags = new Set(["ext", "multiVk", "special", "numpad"]);
  const seenPos = new Set<string>();
  const seenScan = new Set<string>();
  for (const line of read(path).split("\n")) {
    if (line === "" || line.startsWith("#") || line.startsWith("position\t")) continue;
    const f = line.split("\t");
    if (f.length !== 5) {
      errf(`${path}: bad line ${JSON.stringify(line)}`);
      continue;
    }
    const [p, sc, vk, fl, src] = f;
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(p) || seenPos.has(p)) errf(`${path}: bad or duplicate position ${p}`);
    if (!/^([0-9A-F]{2}|E[01][0-9A-F]{2})$/.test(sc) || seenScan.has(sc))
      errf(`${path}: bad or duplicate scan code ${sc}`);
    seenPos.add(p);
    seenScan.add(sc);
    if (!vkOK(vk)) errf(`${path}: unknown VK ${vk}`);
    if (fl !== "-") {
      for (const x of fl.split(",")) if (!flags.has(x)) errf(`${path}: bad flag ${x}`);
    }
    if (src !== "PUB" && src !== "wb §3.1/§3.2") errf(`${path}: bad source ${src}`);
  }
}

// ---- position tables of the other targets (common shape, SPEC §16) ----

function checkPositionTable(path: string) {
  let header: string[] | undefined;
  const seenPos = new Set<string>();
  const seenCode = new Set<string>();
  for (const line of read(path).split("\n")) {
    if (line === "" || line.startsWith("#")) continue;
    const f = line.split("\t");
    if (header === undefined) {
      header = f;
      if (f[0] !== "position" || f.at(-1) !== "source" || f.length < 3)
        errf(`${path}: header must be "position", the target's code, further columns, "source"`);
      continue;
    }
    if (f.length !== header.length) {
      errf(`${path}: bad line ${JSON.stringify(line)}`);
      continue;
    }
    const [p, code] = f;
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(p) || seenPos.has(p)) errf(`${path}: bad or duplicate position ${p}`);
    if (code === "" || seenCode.has(code)) errf(`${path}: empty or duplicate ${header[1]} ${code}`);
    if (f.at(-1) === "") errf(`${path}: position ${p} has no source`);
    seenPos.add(p);
    seenCode.add(code);
  }
  if (header === undefined) errf(`${path}: no header line`);
}

// ---- main ----

const latest = versions[versions.length - 1];
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false }); // `required` under anyOf/not names properties of the parent;
type Validator = ReturnType<typeof ajv.compile>;
const validators = {} as Record<Version, Validator>;
const jsonSchemas = {} as Record<Version, Obj>;

// 1. compile each schema (Ajv validates it against the draft 2020-12 meta-schema first); 2. descriptions
for (const v of versions) {
  const path = schemaPath(v);
  const text = read(path);
  const pin = frozen[v];
  if (pin !== undefined && createHash("sha256").update(text).digest("hex") !== pin)
    errf(`${path} changed: ${v} is frozen (COMPATIBILITY.md); a change to a shared part of src/schema.ts reached ${v}`);
  const schema = obj(decode(text, path));
  if (schema.$id !== schemaId(v)) errf(`${path}: $id is ${JSON.stringify(schema.$id)}, want ${schemaId(v)}`);
  try {
    validators[v] = ajv.compile(schema);
  } catch (e) {
    console.error(`${path}:`, (e as Error).message);
    process.exit(1);
  }
  jsonSchemas[v] = schema;
  checkDescriptions(schema, `${path}#`);
  for (const name of sorted(obj(schema.$defs))) {
    if (!has(obj(obj(schema.$defs)[name]), "description")) errf(`${path}: $defs/${name} without description`);
  }
}
/** The version a document names, if this checker knows it. */
const versionOf = (doc: Json): Version | undefined => versions.find((v) => v === obj(doc).kbl);
const verdicts = (v: Version, doc: Json) => ({
  json: validators[v](doc) === true,
  zod: schemas[v].safeParse(doc).success,
});
const onLossKinds = (v: Version) =>
  arr(obj(obj(obj(obj(obj(jsonSchemas[v].$defs).OnLoss).properties).kinds).propertyNames).enum).map(str);
const family = (k: string) => k.slice(0, k.indexOf("."));

// 3. loss kinds and default rules
const spec = read("SPEC.md");
const specKinds = new Set<string>();
for (const m of spec.matchAll(
  /^\| `([a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*)` \| (?:\*\*fatal\*\*|accept|warning|error)/gm,
)) {
  specKinds.add(m[1]);
}
const families = new Set([...specKinds].map(family));
const rulesOf = new Map<string, Set<string>>(targets.map((t) => [t.name, new Set<string>()]));
const kindsOf = (v: Version) => {
  const kinds = new Set<string>();
  for (const k of onLossKinds(v)) {
    families.add(family(k));
    if (k.endsWith(".*")) continue;
    const t = targets.find((t) => family(k) === `${t.name}Default`);
    if (t) {
      if (v === latest) rulesOf.get(t.name)!.add(k.slice(k.indexOf(".") + 1));
    } else kinds.add(k);
  }
  return kinds;
};
{
  const kinds = kindsOf(latest);
  const [a, b] = [diff(specKinds, kinds), diff(kinds, specKinds)];
  if (a.length + b.length > 0)
    errf(`loss kinds differ: only in SPEC [${a.join(" ")}]; only in the ${latest} schema [${b.join(" ")}]`);
  for (const [i, v] of versions.entries()) {
    const later = versions.slice(i + 1);
    const want = new Set(
      onLossKinds(latest).filter(
        (k) => !later.some((w) => familiesSince[w]?.has(family(k)) || kindsSince[w]?.has(k)),
      ),
    );
    const got = new Set(onLossKinds(v));
    const [c, d] = [diff(want, got), diff(got, want)];
    if (c.length + d.length > 0)
      errf(`${v} loss kinds: missing [${c.join(" ")}]; not allowed in ${v} [${d.join(" ")}] (familiesSince in tools/check)`);
  }
}
reKindInText = new RegExp(`(?:^|[^.\\w])((?:${[...families].filter((f) => !f.endsWith("Default")).sort().join("|")})\\.[a-z][A-Za-z0-9]*)`, "g");
for (const t of targets) {
  const found = new Set<string>();
  for (const path of t.ruleFiles) {
    const index = /\n## 1\. Rule index\n([\s\S]*?)\n## /.exec(read(path));
    if (!index) {
      errf(`${path}: no section "## 1. Rule index"`);
      continue;
    }
    for (const m of index[1].matchAll(/^\| (`[a-zA-Z]+`(?:, `[a-zA-Z]+`)*) \|/gm)) {
      for (const r of m[1].matchAll(/`([a-zA-Z]+)`/g)) {
        if (found.has(r[1])) errf(`${path}: rule ${r[1]} defined twice`);
        found.add(r[1]);
      }
    }
  }
  const rules = rulesOf.get(t.name)!;
  const [a, b] = [diff(rules, found), diff(found, rules)];
  if (a.length + b.length > 0)
    errf(
      `${t.name} default rules differ: only in the schema (${t.name}Default.*) [${a.join(" ")}]; only in the rule indexes [${b.join(" ")}]`,
    );
}
// Defaulted-choice kinds (<target>Default.<rule>) are checked against the rule indexes above, not against SPEC.
const lossFamilies = [...families].filter((f) => !f.endsWith("Default")).sort();
const reKindInDocs = new RegExp(`\`((?:${lossFamilies.join("|")})\\.[a-z][A-Za-z0-9]*)\``, "g");
for (const d of [...glob("targets", ".md"), ...glob("coverage", ".md")].sort()) {
  for (const m of read(d).matchAll(reKindInDocs)) {
    if (!specKinds.has(m[1])) errf(`${d} names undefined loss kind ${m[1]}`);
  }
}

// 4. schema property names in SPEC.md (SPEC.md describes the newest version, which holds every older one)
const names = new Set<string>();
for (const v of versions) propNames(jsonSchemas[v], names);
for (const n of [...names].sort()) {
  if (!spec.includes("`" + n + "`") && !spec.includes(`"${n}"`) && !spec.includes(n + "`") && !spec.includes("." + n)) {
    errf(`SPEC.md does not mention schema property ${n}`);
  }
}

// 5. virtual-key names and the position tables
for (const line of read("targets/windows-vk-names.tsv").split("\n")) {
  if (line !== "" && !line.startsWith("#") && !line.startsWith("name\t"))
    vkNames.add(line.split("\t")[0].toUpperCase());
}
checkDefaultTable();
for (const t of targets) if (t.table !== undefined && existsSync(t.table)) checkPositionTable(t.table);

// 6. examples
const examples = glob("examples", ".kbl.json");
if (examples.length === 0) errf("no examples");
/** The examples and valid cases of each version, checked again as every later version (check 8). */
const validOf = Object.fromEntries(versions.map((v) => [v, [] as { path: string; doc: Json }[]])) as Record<
  Version,
  { path: string; doc: Json }[]
>;
for (const path of examples) {
  const raw = read(path);
  if (raw.startsWith("﻿")) errf(`${path}: byte-order mark`);
  const doc = decode(raw, path);
  if (doc === undefined) continue;
  const v = versionOf(doc);
  if (v === undefined) {
    errf(`${path}: unknown kbl ${JSON.stringify(obj(doc).kbl)}`);
    continue;
  }
  validOf[v].push({ path, doc });
  if (obj(doc).$schema !== undefined && obj(doc).$schema !== schemaId(v)) errf(`${path}: $schema is not ${schemaId(v)}`);
  const validate = validators[v];
  if (!validate(doc)) errf(`${path}: ${ajv.errorsText(validate.errors)}`);
  const parsed = schemas[v].safeParse(doc);
  if (!parsed.success) errf(`${path}: zod:\n${z.prettifyError(parsed.error)}`);
  refs(obj(doc), path, specKinds);
  overlap(obj(doc), path);
  const vks: string[] = [];
  allVKs(obj(doc).targets ?? null, vks);
  for (const vk of vks) if (!vkOK(vk)) errf(`${path}: unknown virtual key ${vk}`);
}

// 7. schema test cases, per version
let nValid = 0;
let nInvalid = 0;
for (const v of versions) {
  const cases = {
    valid: glob(`testdata/schema/${v}/valid`, ".kbl.json"),
    invalid: glob(`testdata/schema/${v}/invalid`, ".kbl.json"),
  };
  if (cases.valid.length === 0 || cases.invalid.length === 0) errf(`no schema test cases in testdata/schema/${v}`);
  nValid += cases.valid.length;
  nInvalid += cases.invalid.length;
  for (const [kind, files] of Object.entries(cases)) {
    for (const path of files) {
      const doc = decode(read(path), path);
      if (doc === undefined) continue;
      const r = verdicts(v, doc);
      const want = kind === "valid";
      if (r.json !== want) errf(`${path}: the ${v} JSON Schema ${r.json ? "accepts" : "rejects"} it`);
      if (r.zod !== want) errf(`${path}: the ${v} zod schema ${r.zod ? "accepts" : "rejects"} it`);
      if (want) validOf[v].push({ path, doc });
    }
  }
}

// 8. each version holds the older ones
for (const [i, v] of versions.entries()) {
  for (const w of versions.slice(i + 1)) {
    for (const { path, doc } of validOf[v]) {
      const up: Obj = { ...obj(doc), kbl: w };
      if (has(up, "$schema")) up.$schema = schemaId(w);
      const r = verdicts(w, up);
      if (!r.json || !r.zod)
        errf(`${path}: valid in ${v} but, as ${w}, rejected by the ${w} ${r.json ? "zod" : "JSON"} schema`);
    }
  }
}

for (const e of errs) console.log("ERROR", e);
console.log(
  `${versions.length} schema versions, ${examples.length} example(s), ${nValid} valid and ${nInvalid} invalid schema case(s), ${errs.length} error(s)`,
);
if (errs.length > 0) process.exit(1);
