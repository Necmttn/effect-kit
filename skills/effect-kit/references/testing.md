> Testing guidance adapted from [Makisuo/skills](https://github.com/Makisuo/skills)
> `effect-review-v4/references/test-patterns.md` (MIT, © 2026 Makisuo).
> effect-kit additions: bun:test compat note, `it.layer` scope pattern.

# Effect-TS Testing Reference

Effect code is tested with `@effect/vitest`. The patterns below cover the core toolkit: `it.effect`, `it.layer`, `TestClock`, and layer overrides for swapping services in tests.

---

## 1. `it.effect` - Run Effect Tests

Use `it.effect` instead of wrapping `Effect.runPromise`/`Effect.runSync` inside a plain `it`. The body is an `Effect.gen` thunk.

```typescript
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

describe("UserService", () => {
  it.effect("returns the user", () =>
    Effect.gen(function* () {
      const service = yield* UserService
      const user = yield* service.findById(id)
      assert.strictEqual(user.name, "Alice")
    }),
  )
})
```

**Never** call `Effect.runSync` / `Effect.runPromise` inside a plain `it` body - it loses structured error reporting and test-clock integration.

---

## 2. Import `assert` from `@effect/vitest`

Inside `it.effect` bodies, use `assert.*` (from `@effect/vitest`), not vitest's `expect`. Both coexist in the same file, but `assert` is the correct choice inside Effect gen blocks.

```typescript
// CORRECT inside it.effect
import { assert, describe, it } from "@effect/vitest"
assert.strictEqual(actual, expected)
assert.deepStrictEqual(rows, expectedRows)
assert.isTrue(condition)

// ALSO OK at the top of the file for non-Effect assertions
import { expect } from "vitest"
expect(manifest.name).toBe("effect-kit")
```

---

## 3. Provide a Test Layer via `Effect.provide`

For a one-off test that needs a service, pipe `Effect.provide(TestLayer)` onto the effect returned from `it.effect`.

```typescript
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const UserServiceTest = Layer.succeed(
  UserService,
  UserService.of({
    findById: (_id) => Effect.succeed({ id: "1", name: "Alice", email: "alice@example.com" }),
    create: (input) => Effect.succeed({ id: "2", ...input }),
  }),
)

describe("UserService", () => {
  it.effect("finds user by id", () =>
    Effect.gen(function* () {
      const user = yield* UserService.findById("1")
      assert.strictEqual(user.name, "Alice")
    }).pipe(Effect.provide(UserServiceTest)),
  )
})
```

---

## 4. `it.layer` - Shared Dependency Scope

When multiple tests in a `describe` block share the same service dependencies, provide them once with `it.layer(...)` instead of repeating `Effect.provide` on every test. The layer is constructed once per suite.

```typescript
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const TestLayer = Layer.mergeAll(
  UserServiceTest,
  OrderServiceTest,
)

describe("OrderService", () => {
  it.layer(TestLayer)((it) => {
    it.effect("creates an order", () =>
      Effect.gen(function* () {
        const order = yield* OrderService.create({ userId: "1", productId: "p1" })
        assert.strictEqual(order.status, "pending")
      }),
    )

    it.effect("rejects duplicate order", () =>
      Effect.gen(function* () {
        const result = yield* OrderService.create({ userId: "1", productId: "p1" }).pipe(
          Effect.flip,
        )
        assert.strictEqual(result._tag, "DuplicateOrderError")
      }),
    )
  })
})
```

---

## 5. `TestClock` - Deterministic Time

Tests that depend on time (timeouts, delays, scheduled work) use `TestClock` to advance the clock without real wall-clock waiting. Production code must read time via `Clock`, never `Date.now()`.

```typescript
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Exit from "effect/Exit"
import * as TestClock from "effect/TestClock"

it.effect("times out after 5 seconds", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(
      slowEffect.pipe(Effect.timeout("5 seconds")),
    )
    // Advance virtual clock - no real sleep
    yield* TestClock.adjust("5 seconds")
    const exit = yield* Fiber.await(fiber)
    assert.isTrue(Exit.isFailure(exit))
  }),
)
```

`TestClock.adjust` advances the virtual clock by a duration string. Combine with `Effect.fork` + `Fiber.await` to observe the outcome after the clock advance.

---

## 6. Swapping a Service in Tests

Override a single service in an otherwise-real layer using `Layer.succeed` + `Layer.provide`:

```typescript
const MockEmailService = Layer.succeed(
  EmailService,
  EmailService.of({
    send: (_to, _subject, _body) => Effect.succeed(void 0), // no-op in tests
  }),
)

// Swap only EmailService; keep everything else real
const TestApp = AppLive.pipe(Layer.provide(MockEmailService))

it.layer(TestApp)((it) => {
  it.effect("sends a welcome email on signup", () =>
    Effect.gen(function* () {
      const user = yield* UserService.create({ email: "a@example.com", name: "A" })
      assert.strictEqual(user.email, "a@example.com")
      // MockEmailService swallowed the send - no SMTP in CI
    }),
  )
})
```

---

## 7. bun:test Compatibility Note

effect-kit projects use `bun:test` as the runtime. `@effect/vitest` works via the vitest adapter - install both `vitest` and `@effect/vitest` and configure `vitest.config.ts` to use the bun pool:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    pool: "forks", // or "threads"; bun test runner wraps vitest
  },
})
```

Alternatively, for pure bun projects without vitest, use `Effect.runPromise` wrapped in `bun:test`'s `it` - but you lose `it.layer` scoping and the convenient clock-advance integration that `@effect/vitest` provides. Note: `TestClock` itself is runtime-agnostic and works in any Effect program that provides `TestServices`; only the `it.layer` suite-level scoping and automatic `TestClock` wiring are vitest-specific. Prefer `@effect/vitest` when Effect-native test helpers are needed.

---

## 8. Coverage Gaps to Flag in Review

When reviewing a diff, flag missing coverage for:

- New public service methods with no `it.effect` test
- Error paths - each `Schema.TaggedError` a method can fail with should have at least one test exercising `Effect.flip` or `Effect.catchTag`
- New branded-type validators / schema decoders without a decode/encode round-trip test
- Services that depend on time without a `TestClock` test for boundary conditions
