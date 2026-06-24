# effect-kit Verification Reference

Headless and agent verification rules for an Effect.ts codebase. Every rule here is machine-executable without a running dev server.

---

## Primary verification tool: effect-language-service diagnostics

The **gating form** (errors-only; use this in CI to block on violations):

```sh
effect-language-service diagnostics --project ./tsconfig.json --severity error
```

The **verbose form** (optional; include to see advisories alongside errors):

```sh
effect-language-service diagnostics \
  --file <path/to/file.ts> \
  --format json \
  --severity error,warning,message
```

**Output contract** (JSON, stdout):

```json
{
  "diagnostics": [
    {
      "file": "src/user.ts",
      "range": { "start": { "line": 12, "character": 4 }, "end": { "line": 12, "character": 20 } },
      "severity": "error",
      "code": "missingEffectServiceDependency",
      "messageText": "Service 'Database' is used but not declared in dependencies"
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "messages": 0 }
}
```

Run it on every file touched in a change set:

```sh
# staged files
git diff --cached --name-only --diff-filter=d | grep '\.ts$' | \
  xargs -I{} effect-language-service diagnostics --file {} --format json --severity error,warning,message
```

### Severity classification

| Severity | Meaning | CI action |
|---|---|---|
| `"error"` | Contract violation - Effect rule that will cause a runtime defect or breaks the type contract | **BLOCK** - fail the check |
| `"warning"` | Advisory - suboptimal but not a defect | Report, never block |
| `"message"` | Informational | Report, never block |

**Only `severity:"error"` findings block CI.** A non-zero `summary.errors` is the only gate condition.

---

## NEVER use `tsc --noEmit | grep`

`tsc` emits advisories on the same flat stdout stream as real errors. Grepping for keywords silently swallows or conflates them. Always use the structured `--format json` output above.

---

## Trust the tsc exit code

With `ignoreEffectWarningsInTscExitCode: true` set in the `@effect/language-service` plugin (shipped in `assets/tsconfig.snippet.json`), `tsc --noEmit` exits **0** when only Effect advisories are present and exits **non-zero** only on real TypeScript errors.

The standard CI check is therefore:

```sh
tsc --noEmit
echo "tsc exit: $?"
```

If exit is 0, real TypeScript is clean. Combine this with the JSON diagnostics run above to surface Effect-specific findings.

---

## Runtime recipe pack

`assets/diagnostics-recipes.json` maps runtime harness output (log lines, error messages) to symptom→fix actions. Load it in your agent or CI script to convert crash output into actionable steps without re-querying the model:

```sh
# match a log line against the recipe pack
node -e "
const recipes = require('./node_modules/effect-kit/assets/diagnostics-recipes.json');
const line = process.argv[1];
const hit = recipes.patterns.find(p => new RegExp(p.match).test(line));
if (hit) console.log(JSON.stringify({ title: hit.title, action: hit.action }));
else console.log(JSON.stringify({ title: 'no match', action: 'inspect manually' }));
" -- 'Service not found: Database'
```

Recipe patterns cover: service-not-found, unhandled-defect, circular-layer, RPC-handler-missing, schema-parse failures, Effect.Service misuse, fiber-interrupt.

---

## Lint rules

### Use `effect/Schema`, not `@effect/schema`

`@effect/schema` was deprecated in Effect 3.10 and removed in v4. Any import from it is a hard compile error.

```typescript
// CORRECT - v4
import * as Schema from "effect/Schema"

// WRONG - removed in v4
import * as Schema from "@effect/schema/Schema"
import { Schema } from "@effect/schema"
```

Detect stale imports in CI:

```sh
rg '@effect/schema' src/ --type ts && echo "STALE @effect/schema import detected" && exit 1 || true
```

### Custom oxlint rule: `no-inline-schema-compile`

`assets/oxlint-effect-rules/no-inline-schema-compile.ts` blocks calling `Schema.decodeSync` / `Schema.encodeSync` inline at the call site with a freshly constructed schema. Inline compilation re-parses the schema on every call, bypassing the memoized decode path.

### All custom oxlint rules

`assets/oxlint-effect-rules/` ships four rules plus an `index.ts` aggregator.
Register the aggregator in `.oxlintrc.json` under **`jsPlugins`** (NOT `plugins` -
that key is for oxlint's built-ins), then enable each rule by its **namespaced id**
`effect-kit/<rule>`:

```json
{
  "jsPlugins": ["./node_modules/effect-kit/assets/oxlint-effect-rules/index.ts"],
  "rules": {
    "effect-kit/no-inline-schema-compile": "error",
    "effect-kit/no-plain-error-class": "error",
    "effect-kit/no-layer-scoped": "error",
    "effect-kit/schema-filter-needs-jsonschema": "error"
  }
}
```

Then run plain `oxlint` (it reads `.oxlintrc.json`). Verified against oxlint 1.71:
the rules fire on the bad patterns and stay silent on the corrected ones.

- `no-inline-schema-compile` - `Schema.decodeSync(...)` compiled inline (re-parses every call); hoist it.
- `no-plain-error-class` - `class X extends Error {}` collapses structurally; use `Data.TaggedError`. *(mikearnaldi #3742)*
- `no-layer-scoped` - `Layer.scoped` was removed in v4; use `Layer.effect`. *(official skill)*
- `schema-filter-needs-jsonschema` - `Schema.filter(p)` without `{ jsonSchema }` throws in `JSONSchema.make`. *(gcanti #3915)*

## Maintainer-pattern progressive check

Beyond the static type/lint pass, `assets/effect-rules.json` is a machine-readable
catalog of ~23 anti-patterns harvested from Effect maintainer guidance (see
`references/guide-maintainer-patterns.md` for the prose + citations). Each rule is
tagged with a **check tier** so an agent verifies fastest-first:

1. **`oxlint`** (instant, AST) - the four custom rules above.
2. **`grep`** (fast, regex) - each catalog rule with `check: "grep"` carries a `grep`
   field; run them in one sweep:
   ```sh
   rg 'Effect\.runSync\(|Fiber\.join\(|Schema\.optional\(|@effect/schema|Stream(\.Stream)?<[^>]*Scope' src/
   ```
   Treat hits as candidates to confirm (these patterns are sometimes correct).
3. **`review`** (judgment) - each catalog rule with `check: "review"` carries a
   `look_for` describing the semantic signal (e.g. "`Effect.provide(AppLayer)` inside
   a request handler"). No linter can decide these; the agent reads and judges.

An agent should run tiers 1–2 in seconds, then scan the tier-3 `look_for` signals
against the changed code. Report `error`/`warning` rule hits; `info` rules are FYI.

---

## Agent verification checklist

Run in order. Stop at the first blocking failure.

1. **Type check** - `tsc --noEmit` → exit must be 0
2. **Effect diagnostics** - `effect-language-service diagnostics --format json --severity error,warning,message` on changed files → `summary.errors` must be 0 (warnings are advisory)
3. **Stale schema import** - `rg '@effect/schema' src/ --type ts` → must return no matches
4. **Oxlint** - `oxlint src/` (with the `jsPlugins` config above) → must exit 0
5. **Maintainer-pattern grep sweep** - run the tier-2 regex sweep above; confirm each hit
6. **Maintainer-pattern review scan** - scan the changed code against the `review`-tier `look_for` signals in `assets/effect-rules.json`
7. **Unit tests** - `bun test` (or `pnpm test`) → must pass

Report all `warning` and `message` diagnostics in the verification summary but do not use them as a gate condition.

## CLAUDE.md managed block (install checklist item 6)

Write this block into the target repo's `CLAUDE.md` so future agent sessions inherit the verify rules and pillar pointers. It is idempotent - overwrite the region between the markers on re-install:

```markdown
<!-- effect-kit:start -->
## Effect.ts (effect-kit)

This repo is set up with [effect-kit](https://github.com/necmttn/effect-kit).

**Verify rule:** to check Effect code, run `effect-language-service diagnostics --project ./tsconfig.json --severity error` (machine-readable, Effect-only). `severity:"error"` is the only blocking class - `warning`/`message` are advisories. Trust the `tsc` exit code (`ignoreEffectWarningsInTscExitCode: true` is set), so `tsc --noEmit; echo $?` is sufficient. NEVER `tsc --noEmit | grep`.

**Pillars:** Setup → `references/setup.md` · Write → `references/patterns.md` · Verify → `references/verify.md` · Observe → `references/observe.md`.
<!-- effect-kit:end -->
```
