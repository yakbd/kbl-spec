---
name: Schema bug
about: The JSON Schema accepts a file the specification forbids, or rejects one it allows
title: ""
labels: ["schema bug"]
---

**The file or fragment** (as small as possible):

```json
```

**What the schema does** (accepts / rejects, and the validator's message):

**What `SPEC.md` says** (section and rule):

**Validator and version** (for example `ajv-cli 5.0.0 --spec=draft2020`):

<!-- SPEC.md wins over the schema: a difference is fixed in src/schema.ts and the generated schema. -->
