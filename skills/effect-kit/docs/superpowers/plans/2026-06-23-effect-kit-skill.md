# effect-kit Skill (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the installable `effect-kit` skill - corpus + opinionated full setup + verify rules + 8-item install checklist + copy-in assets - distributable via `npx skills add necmttn/effect-kit`.

**Architecture:** A skill repo (`SKILL.md` spine + `references/*` topic corpus + `assets/*` copy-in files + `skills.json` manifest). `SKILL.md` drives a deterministic install checklist; assets drop into a target Effect repo. Patterns track Makisuo's MIT skill; setup/verify are effect-kit originals authored as standalone, upstream-portable units. devkit (Sub-project B) is a SEPARATE plan.

**Tech Stack:** Markdown (skill + corpus), bash (`effect-lint-staged.sh`), TypeScript (`otel-maple.layer.ts`, custom oxlint rule), JSON (`tsconfig.snippet.json`, `diagnostics-recipes.json`, `skills.json`), `bun test`.

## Global Constraints

- One opinionated FULL setup - no profiles. tsgo + `@typescript/native-preview` + central-filter gate + `diagnosticSeverity` table + custom oxlint rule.
- Recipe-not-pins: setup resolves current versions via `npx @effect/tsgo setup`; assets use ranges; user pins in-repo.
- Observe uses v4-native `Otlp.layerJson` from `effect/unstable/observability` + `FetchHttpClient.layer` - NEVER `@effect/opentelemetry`.
- v4 idiom: platform/cli/http/sql/rpc/observability under `effect/unstable/*`.
- MIT compliance: retain Makisuo `LICENSE`+copyright in derived files; credit Makisuo in README + SKILL.
- Author originals as self-contained upstream-portable units.
- Home: `github.com/necmttn/effect-kit`; `npx skills add necmttn/effect-kit`.

---

## File Structure

```
effect-kit/
├── SKILL.md                              # spine: when-to-use, 4 pillars, evidence hook, 8-item checklist
├── README.md                             # readme + Makisuo credit + ax evidence line
├── LICENSE                               # MIT (retain Makisuo copyright for derived prose)
├── skills.json                           # npx skills add manifest
├── references/{setup,verify,patterns,testing,observe}.md
├── assets/
│   ├── effect-lint-staged.sh             # central-filter gate
│   ├── lefthook.yml
│   ├── tsconfig.snippet.json             # plugin + ignoreEffectWarningsInTscExitCode + diagnosticSeverity table
│   ├── package.deps.json                 # tsgo toolchain (ranges)
│   ├── diagnostics-recipes.json          # runtime symptom->fix pack
│   ├── otel-maple.layer.ts               # v4 Otlp.layerJson -> Maple Local
│   └── oxlint-effect-rules/no-inline-schema-compile.ts
└── test/{skills-manifest,lint-staged-gate,diagnostics-recipes,otel-maple-layer,skill-spine}.test.ts
```

---

### Task 1: Repo scaffold + skills.json manifest + license
**Files:** Create `package.json`,`skills.json`,`LICENSE`,`.gitignore`,placeholder `SKILL.md`/`README.md`; Test `test/skills-manifest.test.ts`.
**Produces:** `skills.json` `{name,description,version,files[]}` for `npx skills add`.
- [ ] Step 1: write failing test asserting `skills.json` name=effect-kit, semver version, every `files[]` entry exists on disk (`bun test test/skills-manifest.test.ts`).
- [ ] Step 2: run - FAIL (no skills.json).
- [ ] Step 3: create `package.json` (`{name,version:0.1.0,scripts:{test:"bun test"}}`), `skills.json` (files: SKILL.md,README.md,LICENSE), `LICENSE` (MIT © Necmttn + "Portions derived from Makisuo/skills MIT © 2026 Makisuo"), `.gitignore` (node_modules), placeholder SKILL.md/README.md.
- [ ] Step 4: run - PASS.
- [ ] Step 5: commit `chore: scaffold effect-kit skill repo + manifest`.

### Task 2: Central-filter gate (`effect-lint-staged.sh` + `lefthook.yml`)
**Files:** Create `assets/effect-lint-staged.sh`,`assets/lefthook.yml`; Test `test/lint-staged-gate.test.ts`.
**Produces:** gate invoked `effect-lint-staged.sh <file>...`; nearest-tsconfig per file; `npx @typescript/native-preview --noEmit --project`; grep to staged files; **exit 1 only on `error`**.
- [ ] Step 1: failing test - source contains `@typescript/native-preview`, no bare `tsc --noEmit`, greps `(error|warning)`, exit gated on `error`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write the gate (per spec §B central-filter; generalized from quera's `scripts/effect-lint-staged.sh` - strip quera paths): pattern-build from args, per-file tsconfig walk-up, run native-preview per unique tsconfig into a tmp file, `grep -E "($pattern).*: (error|warning) "` to show, then `grep -E "($pattern).*: error " && exit 1`. `lefthook.yml` pre-commit cmd `./effect-lint-staged.sh {staged_files}` glob `*.{ts,tsx}`.
- [ ] Step 4: run - PASS.
- [ ] Step 5: `chmod +x`, add both to skills.json, commit `feat(assets): central-filter tsgo gate + lefthook`.

### Task 3: tsconfig severity table + deps block
**Files:** Create `assets/tsconfig.snippet.json`,`assets/package.deps.json`; extend `test/skills-manifest.test.ts`.
**Produces:** `tsconfig.snippet.json` plugin entry `@effect/language-service` with `ignoreEffectWarningsInTscExitCode:true` + `diagnosticSeverity` map (~30 rules → error).
- [ ] Step 1: failing test - plugin.ignoreEffectWarningsInTscExitCode===true; diagnosticSeverity.missingEffectServiceDependency==="error"; .globalDateInEffect==="error".
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write snippet with the full severity table mined from t3code (importFromBarrel, anyUnknownInErrorContext, unsafeEffectTypeAssertion, instanceOfSchema, deterministicKeys, missingEffectServiceDependency, leakingRequirements, globalErrorInEffectCatch/Failure, unknownInEffectCatch, preferSchemaOverJson, schemaSyncInEffect, cryptoRandomUUID(+InEffect), nodeBuiltinImport, global{Date,Console,Random,Timers,Fetch}(+InEffect) → "error"; strictEffectProvide/lazyEffect:"off"; namespaceImportPackages:["effect"]). `package.deps.json` devDeps ranges: effect ^4.0.0-beta.78, @effect/language-service ^0.85.0, @effect/tsgo ^0.13.0, @typescript/native-preview latest, oxlint+oxlint-tsgolint ^0.11.0, lefthook ^1.7.0, typescript ~6.0.0.
- [ ] Step 4: run - PASS.
- [ ] Step 5: add to skills.json, commit `feat(assets): tsgo severity table + deps (t3code)`.

### Task 4: Runtime diagnostics recipe pack
**Files:** Create `assets/diagnostics-recipes.json`; Test `test/diagnostics-recipes.test.ts`.
**Produces:** quera manifest format `{name,description,version,detect:{dependencies[]},patterns:[{name,match,source,severity,title,action,docs?,example}]}`; NEW `example` fixture per rule.
- [ ] Step 1: failing test - each pattern's `new RegExp(match).test(example)` is true; names include service-not-found, unhandled-defect, circular-layer, rpc-handler-missing.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write all 8 rules (service-not-found-with-location, service-not-found, unhandled-defect, circular-layer, rpc-handler-missing, schema-parse, service-constructor-misuse, fiber-interrupted=info), each with `match` regex (escaped), `title`/`action` ($n backrefs), and a matching `example` fixture. Fix quera's mislabel (use `name` not filename) and anchor the schema-parse regex with `$`.
- [ ] Step 4: run - PASS (every regex hits its fixture).
- [ ] Step 5: add to skills.json, commit `feat(assets): runtime symptom->fix recipe pack with fixtures`.

### Task 5: v4 OTLP→Maple layer (`otel-maple.layer.ts`)
**Files:** Create `assets/otel-maple.layer.ts`; Test `test/otel-maple-layer.test.ts`.
**Produces:** `MapleObservabilityLive: Layer.Layer<never>` - `Otlp.layerJson` from `effect/unstable/observability` → `http://127.0.0.1:4318`, provided `FetchHttpClient.layer`; `Layer.empty` unless `MAPLE_TRACING` config true.
- [ ] Step 1: failing test (text assertions - asset ships to consumer repos): imports `effect/unstable/observability`, uses `Otlp.layerJson`+`FetchHttpClient`, NO `@effect/opentelemetry`, contains `127.0.0.1:4318` + `Layer.empty`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write the layer: `Layer.unwrap(Effect.gen)` reads `Config.boolean("MAPLE_TRACING")` default false → `Layer.empty`; else `Otlp.layerJson({baseUrl,resource:{serviceName,attributes:{}}}).pipe(Layer.provide(FetchHttpClient.layer))`. Comment notes v4-native, verified vs Maple source, inert-when-local.
- [ ] Step 4: run - PASS. (Type-check against real effect@4 happens in the consumer repo smoke step + in devkit Sub-project B.)
- [ ] Step 5: add to skills.json, commit `feat(assets): v4 Otlp.layerJson -> Maple Local`.

### Task 6: Custom oxlint rule (`no-inline-schema-compile`)
**Files:** Create `assets/oxlint-effect-rules/no-inline-schema-compile.ts`; extend `test/skills-manifest.test.ts`.
**Produces:** `@oxlint/plugins` `defineRule` flagging `Schema.{decodeSync,encodeSync,decodeUnknownSync,encodeUnknownSync,is,asserts,decodeUnknownEffect,encodeUnknownEffect}` called inside a function body.
- [ ] Step 1: failing test - source contains `defineRule`, `decodeSync`, `encodeSync`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write rule (modeled on t3code's): COMPILER_METHODS set; `CallExpression` visitor - if callee MemberExpression with method in set AND an ancestor node type matches `/Function/`, `ctx.report` with message "compiles a coder on every call; hoist to module scope".
- [ ] Step 4: run - PASS.
- [ ] Step 5: add to skills.json, commit `feat(assets): custom oxlint rule no-inline-schema-compile`.

### Task 7: Corpus - `references/patterns.md` + `testing.md` (Makisuo MIT, tracked)
**Files:** Create `references/patterns.md`,`references/testing.md`; extend `test/skills-manifest.test.ts`.
**Produces:** Write+Testing corpus sourced from `Makisuo/skills/effect-best-practices`.
- [ ] Step 1: failing test - patterns.md matches /Makisuo/, contains `Effect.Service`, `Schema.TaggedError`, and the namespace-import line `import * as Effect from "effect/Effect"`.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: assemble patterns.md from `gh api repos/Makisuo/skills/contents/effect-best-practices/...` (critical-rules table + service/error/schema/layer/atom/anti-pattern sections + reference files). Top-of-file attribution block (adapted from Makisuo/skills MIT © 2026 Makisuo, tracked upstream). Append t3code Write deltas: namespace-import-only, `Context.Service<Self,Shape>()("tag")` alt, `Effect.fn.Return<A,E>`. Author testing.md from his testing guidance (@effect/vitest, TestClock, layer overrides).
- [ ] Step 4: run - PASS.
- [ ] Step 5: add to skills.json, commit `docs(corpus): patterns + testing (Makisuo MIT) + write deltas`.

### Task 8: Corpus - `references/setup.md` + `verify.md` (effect-kit originals)
**Files:** Create `references/setup.md`,`references/verify.md`; extend `test/skills-manifest.test.ts`.
**Produces:** Setup + Verify corpus (upstream-portable originals).
- [ ] Step 1: failing test - setup.md contains `npx @effect/tsgo setup` + `effect/unstable/`; verify.md contains `effect-language-service diagnostics --format json --severity error` + `ignoreEffectWarningsInTscExitCode` + /effect\/Schema/.
- [ ] Step 2: run - FAIL.
- [ ] Step 3: author setup.md (tsgo bootstrap, asset placement, v4 effect/unstable/* surface, catalog cohesion + effect-tsgo patch prepare hook, run-TS-directly tsconfig stance) + verify.md (diagnostics CLI, severity:error only blocking class, trust exit code, never tsc|grep, the recipe pack, effect/Schema-not-@effect/schema lint, custom oxlint rule).
- [ ] Step 4: run - PASS.
- [ ] Step 5: add to skills.json, commit `docs(corpus): setup + verify (effect-kit originals)`.

### Task 9: `references/observe.md` + SKILL.md spine + 8-item checklist
**Files:** Create `references/observe.md`, rewrite `SKILL.md`; Test `test/skill-spine.test.ts`.
**Consumes:** all assets/references (Tasks 2–8). **Produces:** SKILL.md frontmatter + 4 pillars + evidence hook + literal 8-item checklist; observe.md (instrument=Makisuo patterns, sink=Maple v4 layer, Agent-Observe→devkit pointer).
- [ ] Step 1: failing test - SKILL.md frontmatter name:effect-kit+description; contains `[ ] 1.`…`[ ] 8.`; links setup/verify/patterns/observe.md; contains "Makisuo" + the wedge (`~70`/`0 advisory`).
- [ ] Step 2: run - FAIL.
- [ ] Step 3: write observe.md (two halves + Agent-Observe pointer to devkit) and SKILL.md (frontmatter; evidence hook = ax-measured ~70-turn loop vs quera 0; 4 pillar links; the 8-item checklist verbatim from spec: detect→`@effect/tsgo setup`+deps→tsconfig snippet→gate+`lefthook install`→`diagnostics --project --severity error` exit 0→CLAUDE.md `<!-- effect-kit:start -->` block→optional Maple→smoke check).
- [ ] Step 4: run - PASS.
- [ ] Step 5: add to skills.json, commit `docs(skill): SKILL.md spine + checklist + observe.md`.

### Task 10: README + full-suite green + manifest completeness
**Files:** Modify `README.md`,`skills.json`; extend `test/skills-manifest.test.ts`.
**Produces:** publishable README (install cmd, 4 pillars, Makisuo credit, ax-finding link) + complete `files[]`.
- [ ] Step 1: failing test - skills.json lists every `references/*` + `assets/*` (incl `assets/oxlint-effect-rules/no-inline-schema-compile.ts`) on disk; README contains `npx skills add necmttn/effect-kit` + "Makisuo" + /ax|gist\.github/.
- [ ] Step 2: run `bun test` - FAIL.
- [ ] Step 3: author README (what + install; 4 pillars one line each; "Why" links the ax gist https://gist.github.com/Necmttn/59fffa53dfce94270b45bca42a7f45bf + the measured 0-vs-~70; Credits = Makisuo patterns+Maple MIT + bidirectional-upstream intent). Complete skills.json files[].
- [ ] Step 4: run `bun test` - PASS (whole suite).
- [ ] Step 5: commit `docs: README (credit + evidence) + complete manifest`.

---

## Self-Review

**Spec coverage:** Setup→T3,T8 ✔ · Write→T7 ✔ · Verify→T4,T6,T8 ✔ · Observe→T5,T9 ✔ · 8-item checklist→T9 ✔ · Provenance/credit→T1,T7,T10 ✔ · Distribution→T1,T10 ✔ · devkit (Sub-project B)→separate plan (referenced in observe.md, not built here) ✔.
**Placeholder scan:** no TBD/TODO; Task 7's "assemble from Makisuo/skills via gh api" is a concrete sourcing action, not a placeholder.
**Type consistency:** asset filenames consistent across skills.json / SKILL.md checklist / tests; `MapleObservabilityLive` is the single exported name.
**Follow-ups (out of plan):** (1) after publish, make global `effect-best-practices` a thin pointer to effect-kit; (2) effect-kit.com landing (v2); (3) browseable `effect-kit list/show` CLI (v2); (4) PR Setup/gate/Verify originals upstream into `Makisuo/skills`.
