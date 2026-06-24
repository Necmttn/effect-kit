# Effect at Scale - Large-Codebase Architecture Guide

Senior companion to the single-pattern guides. Code-shape-first. Every section cites its PR or spec source.

---

## Schema & module architecture

**`Schema.Struct` + same-name `interface` - NOT `Schema.Class` for shared DTOs.**
v4 structurally compares and hashes plain records, so they work as LayerMap/Data.equal/hash keys with dedup. `Schema.Class` adds nominal identity that BREAKS that. Use `Schema.Class` only for identity/behavior-bearing domain objects.

```ts
export interface Prompt extends Schema.Schema.Type<typeof Prompt> {}
export const Prompt = Schema.Struct({ text: Schema.String }).annotate({ identifier: "Prompt" })
// call sites: Prompt.make({...}) or plain object literals, NOT new Prompt({...})
```
*(Kit Langton, PR #33571; opencode specs/effect/schema.md)*

**Dependency-free canonical schema package.**
Domain schemas live in a package that depends ONLY on `effect`; every other package depends on it, never on each other for types. Foundation for SDK/protocol generation; kills import cycles. Core re-exports for back-compat:

```ts
export const Info = Agent.Info
```
*(PR #33571)*

**Forwarding-facade anti-pattern - delete it.**
Modules whose only job is re-exporting schemas add an indirection hop with no benefit. Import canonical schemas directly; keep the behavior module, kill the facade.
*(PR #33577)*

---

## Architecture & service-boundary decisions

**Store intent cheaply, validate at execution.**
A mutation records the requested reference without booting heavy services; the runner resolves it against the live catalog and fails with a typed error if unavailable.
*(PR #33377)*

**Two distinct observable state transitions → two events.**
e.g. `PromptAdmitted` (accepted/pending, replayable into an inbox) vs `Prompted` (made model-visible). Project derived state from both; don't collapse into one event.
*(PR #33443)*

**No premature distributed-coordination state (YAGNI).**
Process-local execution lanes are correct until you actually support multi-server. Don't add durable interrupt sequencing, demand queues, or `awaitIdle` before then.
*(PR #33388)*

**Canonical rows preserved; experimental projections disposable.**
Never write a compatibility shim that produces incorrect data - "a compatibility shim that produces incorrect data is worse than a clean reset." Migrate canonical user data; reset disposable derived/event projections.
*(PR #33404)*

---

## Runtime & layer composition

**Share ONE `memoMap` across `ManagedRuntime` AND `HttpRouter`** - otherwise heavy services (DB/Auth/Provider) instantiate twice (runtime path vs request path).

```ts
export const memoMap = Layer.makeMemoMapUnsafe()
const rt = ManagedRuntime.make(AppLayer, { memoMap })
const handler = HttpRouter.toWebHandler(routes, { memoMap })
```

**`LayerNode` typed dependency DAG** - explicit deps with compile-time `CheckDependencies`, instead of nested `Layer.provide(A, Layer.provide(B, C))` chains:

```ts
const Database = { node: LayerNode.make(Database.layer, [FSUtil.node, Git.node]) }
const app = LayerNode.group([Database.node, Session.node, ...])
const routes = Layer.provide(routeLayer, LayerNode.buildLayer(app))
```

**`ScopedCache`-backed per-tenant state (`InstanceState`)** - initializer runs once per key; subscriptions, finalizers, and forked background fibers live inside the scope and are disposed on invalidation. Rule: don't add `started` flags; don't fork inside the initializer to return early - fork at the bootstrap boundary.

---

## Concurrency & atomicity

**`Effect.uninterruptibleMask` for atomic succeed-and-publish.**
Run the interruptible work via `restore(...)`, keep only the final publish uninterruptible; never publish partial/oversized state before its bounded form.
*(PR #30999)*

```ts
Effect.uninterruptibleMask((restore) =>
  restore(tools.settle({...})).pipe(
    Effect.catchCause((cause) =>
      Cause.hasInterrupts(cause)
        ? Effect.failCause(cause)
        : Effect.succeed(errorResult)
    ),
    Effect.flatMap((settlement) => publish(...))
  )
)
```

**`Deferred`-based single-flight load coalescing** inside `uninterruptibleMask` - concurrent loads await the SAME deferred; complete it (with failure if boot throws) even on interrupt, and remove the cache entry on failure.

**`KeyedMutex`** - users-counted `Map<Key, {semaphore, users}>`: same-key queues, different-key parallel; delete the entry only when `users` hits 0. Lighter pure-Semaphore option.

**`TxReentrantLock` + `RcMap`** - per-file read/write locks, `idleTimeToLive: 0`. STM-based and composable; use when you need composability over raw Semaphore.

---

## HttpApi (`effect/unstable/httpapi`)

**Group handler - yield services once, close over them:**

```ts
HttpApiBuilder.group(Api, "session", (handlers) =>
  Effect.gen(function* () {
    const db = yield* Database
    const auth = yield* Auth
    return handlers
      .handle("get", Effect.fn("Session.get")((req) => db.find(req.path.id)))
      .handle("create", Effect.fn("Session.create")((req) => db.insert(req.payload)))
  })
)
```
No per-request re-acquire; each `Effect.fn(name)` call = a named span.

**`HttpApiMiddleware.Service` with `requires`** for per-request context injection - load + `Effect.provideService` an `InstanceRef` per request; stack via `.middleware(A).middleware(B)`.

**`HttpApiMiddleware.layerSchemaErrorTransform`** - intercept schema-decode failures, truncate the reason (~1024 chars), log + return a typed error; prevents dumping request payloads (secrets) into error bodies.

**SSE streaming:**

```ts
// subscribe BEFORE the body fiber starts
const queue = yield* Queue.unbounded<Event>()
yield* pubsub.subscribe(queue)

const stream = Stream.fromQueue(queue)
const heartbeat = Stream.tick("10 seconds")
yield* Stream.merge(stream, heartbeat, { haltStrategy: "left" })
  .pipe(Stream.map(Sse.encode()), HttpServerResponse.stream)
```

**Retry transient errors once on the client layer:**

```ts
HttpClient.retryTransient({
  retryOn: "errors-and-responses",
  times: 2,
  schedule: Schedule.exponential(200).pipe(Schedule.jittered),
})
```

---

## SQL & persistence

**Drizzle-ORM bridged into Effect** (a private `effect-drizzle-sqlite` satisfying `effect/unstable/sql/SqlClient`) rather than `@effect/sql` tagged templates - keeps Drizzle's type-safe query builder. WAL PRAGMAs on boot:

```ts
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;
```

Shared `Timestamps` spread onto every table; JSON columns as `text({ mode: "json" }).$type<T>()`.

**TypeScript migration files:**

```ts
export default {
  id: "0001_initial",
  up(tx): Effect.Effect<void> {
    return tx.execute(sql`CREATE TABLE ...`)
  },
} satisfies Migration
```

Runner with its OWN `migration` table: boots full schema from `schema.gen.ts` on empty DB (inserts all migration IDs at once), then applies only pending migrations sequentially inside `db.transaction()`, guarded by `Semaphore.makeUnsafe(1)`.

---

## Error modeling

**Transport-agnostic services - translate at route boundaries.**
Service/domain modules NEVER import HTTP types (`HttpApiError`, status codes). Tiny helpers at the boundary:

```ts
Effect.mapError((e) => ApiError.notFound(e.message))
```

Use `Schema.TaggedErrorClass` for domain errors (tagged `_tag`); use `Schema.ErrorClass` for public HTTP error bodies whose wire shape intentionally differs. Don't grow a generic error middleware into a registry of domain-error name checks.
*(opencode specs/effect/errors.md)*

**JSON-encode structured errors before provider/wire lowering.**
`String(obj)` yields `"[object Object]"` (model-unreadable). Encode structured error objects to JSON at the lowering boundary; leave primitive/plain-string errors as-is.
*(PR #33405)*

---

*Harvested from anomalyco/opencode (incl. specs/effect/) and Kit Langton PRs (#33571, #33577, #33377, #33443, #33388, #33404, #30999, #33405), via ax.*
