# Effect.ts maintainer patterns

Good practices harvested from Effect maintainer guidance - GitHub issue replies
(`tim-smart`, `mikearnaldi`, `gcanti`, `fubhy`) and the official `Effect-TS/skills`
skill. Each carries its source so you can read the original reasoning.

These split into **anti-patterns to detect** (the machine catalog) and **positive
techniques to reach for** (the second half of this file).

## Progressive check (fastest tier first)

The catalog `assets/effect-rules.json` tags every anti-pattern with a check tier.
Walk them cheapest-first; only *think* about the last tier:

1. **`oxlint`** - instant, AST. Run the custom rules:
   ```sh
   oxlint --plugin ./node_modules/effect-kit/assets/oxlint-effect-rules src/
   ```
   Rules: `no-plain-error-class`, `no-layer-scoped`, `schema-filter-needs-jsonschema`,
   `no-inline-schema-compile`.
2. **`grep`** - fast regex signals (the `grep` field of each catalog rule). Treat
   hits as candidates to confirm, e.g.:
   ```sh
   rg 'Effect\.runSync\(|Fiber\.join\(|Schema\.optional\(|@effect/schema' src/
   ```
3. **`review`** - semantic; the agent reads the rule's `look_for` and judges. No
   linter can decide these (e.g. "is this `Effect.provide` inside a request handler?").

An agent should run tiers 1–2 in seconds, then scan tier-3 `look_for` signals.

## Anti-patterns (see effect-rules.json for the full catalog)

### Runtime & layers
- **Never `Effect.provide(AppLayer)` per request** - rebuilds + tears down the layer
  (DB pools) every request. Use `ManagedRuntime.make(layer)` once, or
  `HttpApp.toWebHandlerLayer`. *(tim-smart #4210)*
- **Call a layer factory once, bind to a const** - `Layer.mergeAll(makeDb(), makeDb())`
  is two refs → memoized twice → two pools. *(official skill)*
- **Don't `Effect.provide` in business logic** - receive deps via `yield*` at
  construction, compose at the boundary. *(mikearnaldi #5202)*
- **`runFork`/`runMain` are the entrypoint; `runSync` is an edge case** (throws on
  async). *(mikearnaldi #1400)*
- **`Layer.scoped` is gone in v4** - `Layer.effect` accepts a Scope. *(official skill)*

### Errors
- **`class X extends Error {}` collapses structurally** - `A | B | Error` → `Error`,
  catchTag breaks. Use `Data.TaggedError("X")<{...}>`. *(mikearnaldi #3742)*
- **`Effect.tryPromise` sync-throw = typed fail, not defect** (matches `Effect.try`).
  *(mikearnaldi #5648)*

### Schema (gcanti)
- **`Schema.filter` needs `{ jsonSchema: {} }`** or `JSONSchema.make` throws. *(#3915)*
- **`Schema.optional` (`T | undefined`) ≠ `Schema.optionalKey`** (optional property). *(official skill)*
- **Contextual descriptions on `Schema.propertySignature`**, not `.annotations()` on the
  schema. *(#3016)*
- **`Schema.Class` is a transformation** - `Schema.extend` rejects it; extend the
  `encodedSchema` sides. *(#3681)*
- **`Schema.transform` drops brands** on the encoded side - wrap in `Schema.typeSchema`. *(#5953)*
- **`Schema.declare` = new opaque types; conversions use `Schema.transform`.** *(#4894)*

### Concurrency, scope & streams
- **`Stream<A, E, Scope>` is a smell** - use `Stream.scoped(effect)`. *(mikearnaldi #3187)*
- **Construct resources in dependency order** (finalizers run LIFO). *(tim-smart #4215)*
- **`fork` + `awaitAllChildren` races** - prefer `forkScoped`. *(tim-smart #2768)*
- **`Fiber.await` (value-only) vs `Fiber.join`** (inherits FiberRefs incl Scope). *(tim-smart #5992)*
- **Streaming/SSE cleanup belongs in the Stream** (`Stream.ensuring`/`unwrapScoped`),
  not the handler scope. *(tim-smart #5076)*

### Services (silent bugs)
- **Property names can't shadow Tag built-ins** (`context`/`of`/`key`/`identifier`). *(fubhy #2745)*
- **Accessor proxies break `flow()`** - capture the instance or use `pipe`. *(mikearnaldi #5202)*

## Positive techniques to reach for

These aren't anti-patterns to flag - they're the maintainers' recommended tools.

### Error handling
- **`Effect.catchIf(predicate, Effect.die)`** - idiomatic refine-or-die, cleaner than
  `catchAll` + casts. *(tim-smart #3004)*
- **`Effect.sandbox` + `Cause.hasInterrupts`** - retry only typed failures, not
  interrupts:
  ```ts
  effect.pipe(Effect.sandbox, Effect.retry(policy), Effect.catch((cause) =>
    Cause.hasInterrupts(cause) ? Effect.die("interrupted") : Effect.failCause(cause)))
  ```
- **`Schema.Defect` vs `Schema.DefectWithStack`** - default to `Defect` when wrapping a
  foreign error; use `DefectWithStack` only when the stack is part of the contract.

### Retries & schedule
- **`ExecutionPlan`** - provider/layer failover (different layers per phase), vs
  `Schedule` for timing only:
  ```ts
  effect.pipe(Effect.withExecutionPlan(ExecutionPlan.make(
    { provide: FastLayer, attempts: 2, schedule: Schedule.spaced("3 seconds") },
    { provide: FallbackLayer })))
  ```
- **`Effect.retry({ until }) / ({ while })`** - predicate retries.
- **`Schedule.jittered()`** - avoid retry stampedes across workers.
- **`Schedule.addDelay((error) => ...)`** - error-dependent delay (honor Retry-After).
- **`Schedule.fixed`/`windowed` vs `spaced`** - wall-clock-aligned periodic work vs pure cooldown.

### Schema
- **`X.make({...})` over `new X({...})`** for Schema classes (consistent across
  Class/TaggedClass/TaggedError).
- **`Schema.decodeTo` + `SchemaTransformation.transformOrFail`** - derive schemas
  (`pick`/`omit`/`partial`) instead of maintaining parallel `Todo` + `TodoSql`.

### Layers & context
- **`Context.Reference`** - a context value with a default (config knobs, per-request
  metadata) - not a full multi-method service.
- **`Layer.effectDiscard`** - startup side effects (background fiber, init hook) that
  provide no service.

### Observability
- **`Effect.track(metric)`** as `Effect.fn`'s second argument - post-process the
  produced effect with a metric.
- **`Effect.withLogSpan("name")`** - group logs without a full tracing span.

### Testing
- **`it.effect.prop`** supports Schema arbitraries (`it.prop` does not).
- **`flakyTest(effect, "5 seconds")`** - bounded retries for eventually-consistent tests.
- **`layer(L, { excludeTestServices: true })`** - opt out of TestClock/TestConsole for a group.

---

*Sources: Effect-TS/effect issues (#4210, #4215, #5992, #3735, #3004, #5076, #5202,
#3742, #3427, #1400, #3187, #2768, #5648, #2745, #3915, #3016, #3681, #5953, #4894)
and the official Effect-TS/skills `effect-ts` skill. Harvested via [ax](https://github.com/Necmttn/ax).*
