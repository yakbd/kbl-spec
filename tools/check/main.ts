// The repository checks of the .kbl.json specification. Run from the repository root: `npm run check`
// (`npm test` also type-checks and checks that the generated schema is fresh). It checks that
//
//  1. schema/0.1/kbl.schema.json compiles as a JSON Schema draft 2020-12 schema (meta-schema validation included);
//  2. every property and every $defs entry of the schema has a description;
//  3. the loss kinds of SPEC.md §17.3 equal the kinds the schema accepts in onLoss, the default rules of the
//     "Rule index" sections of targets/windows.md and targets/windows-install.md equal the schema's
//     windowsDefault.<rule> kinds, and every loss kind named in targets/*.md and coverage/*.md is defined in SPEC.md;
//  4. every property name of the schema is mentioned in SPEC.md;
//  5. targets/windows-default-vk.tsv is well formed and uses only known virtual keys;
//  6. every examples/*.kbl.json is accepted by the zod schema and by the JSON Schema, passes the reference checks
//     of SPEC §19 item 1 (a subset), the layer-overlap rule of §7.3, and uses only known virtual keys;
//  7. every testdata/schema/valid/*.kbl.json is accepted and every testdata/schema/invalid/*.kbl.json is rejected,
//     by the zod schema and by the JSON Schema alike.
//
// The SPEC §19 rules are checked here, not in the schema: they relate parts of a file to each other.
import { readFileSync, readdirSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as z from "zod";
import { KblFile } from "../../src/schema.ts";

const schemaPath = "schema/0.1/kbl.schema.json";
const schemaId = "https://yakbd.github.io/kbl-spec/schema/0.1/kbl.schema.json";

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
const reKindInText = /(?:^|[^.\w])((?:general|windows|klc|cldr)\.[a-z][A-Za-z0-9]*)/g;

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
    for (const l of arr(obj(t).layers)) {
      const id = str(obj(l).id);
      hasBase ||= id === "base";
      for (const row of arr(obj(l).rows)) {
        for (const k of arr(row)) keyOK(str(k), `touch layer ${id}`);
      }
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

// ---- main ----

// 1. compile the schema (Ajv validates it against the draft 2020-12 meta-schema first)
const schemaText = read(schemaPath);
const schema = obj(decode(schemaText, schemaPath));
if (schema.$id !== schemaId) errf(`schema: $id is ${JSON.stringify(schema.$id)}, want ${schemaId}`);
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false }); // `required` under anyOf/not names properties of the parent;
let validate: ReturnType<typeof ajv.compile>;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error("schema:", (e as Error).message);
  process.exit(1);
}
const verdicts = (doc: Json) => ({ json: validate(doc) === true, zod: KblFile.safeParse(doc).success });

// 2. descriptions
checkDescriptions(schema, "#");
for (const name of sorted(obj(schema.$defs))) {
  if (!has(obj(obj(schema.$defs)[name]), "description")) errf(`schema: $defs/${name} without description`);
}

// 3. loss kinds and default rules
const spec = read("SPEC.md");
const specKinds = new Set<string>();
for (const m of spec.matchAll(
  /^\| `([a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*)` \| (?:\*\*fatal\*\*|accept|warning|error)/gm,
)) {
  specKinds.add(m[1]);
}
const onLossKinds = arr(obj(obj(obj(obj(obj(schema.$defs).OnLoss).properties).kinds).propertyNames).enum);
const schemaKinds = new Set<string>();
const rules = new Set<string>();
for (const k of onLossKinds.map(str)) {
  if (k.endsWith(".*")) continue;
  if (k.startsWith("windowsDefault.")) rules.add(k.slice("windowsDefault.".length));
  else schemaKinds.add(k);
}
{
  const [a, b] = [diff(specKinds, schemaKinds), diff(schemaKinds, specKinds)];
  if (a.length + b.length > 0)
    errf(`loss kinds differ: only in SPEC [${a.join(" ")}]; only in schema [${b.join(" ")}]`);
}
const winRules = new Set<string>();
for (const path of ["targets/windows.md", "targets/windows-install.md"]) {
  const index = /\n## 1\. Rule index\n([\s\S]*?)\n## /.exec(read(path));
  if (!index) {
    errf(`${path}: no section "## 1. Rule index"`);
    continue;
  }
  for (const m of index[1].matchAll(/^\| (`[a-zA-Z]+`(?:, `[a-zA-Z]+`)*) \|/gm)) {
    for (const t of m[1].matchAll(/`([a-zA-Z]+)`/g)) {
      if (winRules.has(t[1])) errf(`${path}: rule ${t[1]} defined twice`);
      winRules.add(t[1]);
    }
  }
}
{
  const [a, b] = [diff(rules, winRules), diff(winRules, rules)];
  if (a.length + b.length > 0)
    errf(`default rules differ: only in schema [${a.join(" ")}]; only in the rule indexes [${b.join(" ")}]`);
}
for (const d of [...glob("targets", ".md"), ...glob("coverage", ".md")].sort()) {
  for (const m of read(d).matchAll(/`((?:general|windows|klc|cldr|dll)\.[a-z][A-Za-z0-9]*)`/g)) {
    if (!specKinds.has(m[1])) errf(`${d} names undefined loss kind ${m[1]}`);
  }
}

// 4. schema property names in SPEC.md
const names = new Set<string>();
propNames(schema, names);
for (const n of [...names].sort()) {
  if (!spec.includes("`" + n + "`") && !spec.includes(`"${n}"`) && !spec.includes(n + "`") && !spec.includes("." + n)) {
    errf(`SPEC.md does not mention schema property ${n}`);
  }
}

// 5. virtual-key names and the default table
for (const line of read("targets/windows-vk-names.tsv").split("\n")) {
  if (line !== "" && !line.startsWith("#") && !line.startsWith("name\t"))
    vkNames.add(line.split("\t")[0].toUpperCase());
}
checkDefaultTable();

// 6. examples
const examples = glob("examples", ".kbl.json");
if (examples.length === 0) errf("no examples");
for (const path of examples) {
  const raw = read(path);
  if (raw.startsWith("﻿")) errf(`${path}: byte-order mark`);
  const doc = decode(raw, path);
  if (doc === undefined) continue;
  if (!validate(doc)) errf(`${path}: ${ajv.errorsText(validate.errors)}`);
  const parsed = KblFile.safeParse(doc);
  if (!parsed.success) errf(`${path}: zod:\n${z.prettifyError(parsed.error)}`);
  refs(obj(doc), path, specKinds);
  overlap(obj(doc), path);
  const vks: string[] = [];
  allVKs(obj(doc).targets ?? null, vks);
  for (const vk of vks) if (!vkOK(vk)) errf(`${path}: unknown virtual key ${vk}`);
}

// 7. schema test cases
const cases = {
  valid: glob("testdata/schema/valid", ".kbl.json"),
  invalid: glob("testdata/schema/invalid", ".kbl.json"),
};
if (cases.valid.length === 0 || cases.invalid.length === 0) errf("no schema test cases in testdata/schema");
for (const [kind, files] of Object.entries(cases)) {
  for (const path of files) {
    const doc = decode(read(path), path);
    if (doc === undefined) continue;
    const v = verdicts(doc);
    const want = kind === "valid";
    if (v.json !== want) errf(`${path}: the JSON Schema ${v.json ? "accepts" : "rejects"} it`);
    if (v.zod !== want) errf(`${path}: the zod schema ${v.zod ? "accepts" : "rejects"} it`);
  }
}

for (const e of errs) console.log("ERROR", e);
console.log(
  `${examples.length} example(s), ${cases.valid.length} valid and ${cases.invalid.length} invalid schema case(s), ${errs.length} error(s)`,
);
if (errs.length > 0) process.exit(1);
