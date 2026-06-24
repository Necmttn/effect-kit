# Observe

Observability in effect-kit has two halves: **Instrument** (add named spans + structured logs to your code) and **Sink** (run Maple locally to receive and visualise them).

> Patterns in this reference are adapted from [Makisuo/skills](https://github.com/Makisuo/skills) (MIT).

---

## Instrument

### Named spans via `Effect.fn`

`Effect.fn` is the idiomatic way to create a named span. Every call site gets a span whose name matches the function label - no extra wrapping required.

```ts
import * as Effect from "effect/Effect"

// "UserService.findById" appears as the span name in Maple
const findById = Effect.fn("UserService.findById")(
  (id: string) =>
    Effect.gen(function* () {
      // ... your logic
    }),
)
```

The label is the span name. Nest `Effect.fn` calls and the spans form a tree automatically.

### Structured logs

Use `Effect.log`, `Effect.logDebug`, `Effect.logInfo`, `Effect.logWarning`, and `Effect.logError` instead of `console.*`. They attach to the current span and carry structured key/value data.

```ts
yield* Effect.logInfo("order placed", { orderId, total })
yield* Effect.logWarning("rate limit close", { remaining: 3 })
yield* Effect.logError("payment failed", { reason })
```

Log level is controlled at the Layer boundary (e.g. `Logger.minimumLogLevel(LogLevel.Info)`) - no scattered `process.env` checks in business logic.

### `Effect.tap` / `Effect.tapError` for span events

Add inline span annotations without breaking the data flow:

```ts
Effect.tap((result) => Effect.logDebug("cache hit", { key, result }))
Effect.tapError((err) => Effect.logError("db query failed", { err }))
```

`tapError` fires only on the error channel; `tap` fires only on success. Both leave the value unchanged.

---

## Sink - Maple Local

Maple is a local OTLP sink with a browser dashboard. It receives spans exported by `MapleObservabilityLive` (from `assets/otel-maple.layer.ts`) and lets you browse traces, spans, and logs without sending data to a cloud service. The layer uses the **v4-native** `Otlp.layerJson` from `effect/unstable/observability` (provided `FetchHttpClient.layer`) - NOT the pre-v4 `@effect/opentelemetry` package.

### Install and start

```sh
brew install Makisuo/tap/maple
maple start
```

Maple binds an OTLP/HTTP receiver at `http://127.0.0.1:4318` and opens its dashboard at **`https://local.maple.dev`**. Trace data persists in `~/.maple/data`.

```sh
maple stop   # graceful shutdown
```

### Wire the layer

Copy `assets/otel-maple.layer.ts` into your app (e.g. `src/layers/maple.ts`), then add it to your root layer:

```ts
import { MapleObservabilityLive } from "./layers/maple"

const AppLive = MainLayer.pipe(Layer.provide(MapleObservabilityLive))
```

The layer is **inert by default** - it exports nothing unless the environment variable is set:

```sh
MAPLE_TRACING=true bun run dev
```

Without `MAPLE_TRACING=true` the layer short-circuits to `Layer.empty` with zero overhead. Set it in your local `.env` or shell profile; never commit it.

### Loop guard - `TracerDisabledWhen`

If your app traces its own HTTP handlers (e.g. a health endpoint or CORS preflight) the OTLP exporter will trace the export request, which traces itself - an infinite loop. Disable the tracer on those routes:

```ts
import { FiberRef, TracerDisabledWhen } from "effect"

// inside the HTTP app middleware:
yield* FiberRef.set(
  TracerDisabledWhen,
  (span) =>
    span.name === "GET /health" ||
    span.name.startsWith("OPTIONS "),
)
```

`TracerDisabledWhen` accepts a predicate over the incoming span. Matched spans are not exported; their children inherit the suppression.

---

## Agent-Observe

**Agent-Observe:** for the running coding agent to QUERY these traces over MCP (health checks, error rates, span trees), use **devkit** - effect-kit Sub-project B.
