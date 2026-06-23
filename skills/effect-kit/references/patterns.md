> Patterns in this file are adapted from [Makisuo/skills](https://github.com/Makisuo/skills)
> `effect-best-practices` (MIT, © 2026 Makisuo) and tracked upstream. effect-kit additions:
> the namespace-import convention and v4 `effect/unstable/*` notes (see setup.md).

# Effect-TS Patterns Reference

Condensed from `Makisuo/skills/effect-best-practices` (MIT). Covers services, errors, schema, layers, atoms, and anti-patterns. effect-kit write deltas are appended at the bottom.

---

## Quick Reference: Critical Rules

| Category | DO | DON'T |
|----------|-----|-------|
| Services | `Effect.Service` with `accessors: true` | `Context.Tag` for business logic |
| Dependencies | `dependencies: [Dep.Default]` in service | Manual `Layer.provide` at usage sites |
| Layers | `Layer.mergeAll` for flat composition | Deeply nested `Layer.provide` chains |
| Layer Chaining | `Layer.provideMerge` for incremental composition | Multiple `Layer.provide` (creates nested types) |
| Errors | `Schema.TaggedError` with `message` field | Plain classes or generic Error |
| Error Specificity | `UserNotFoundError`, `SessionExpiredError` | Generic `NotFoundError`, `BadRequestError` |
| Error Handling | `catchTag`/`catchTags` | `catchAll` or `mapError` |
| IDs | `Schema.UUID.pipe(Schema.brand("@App/EntityId"))` | Plain `string` for entity IDs |
| Functions | `Effect.fn("Service.method")` | Anonymous generators |
| Logging | `Effect.log` with structured data | `console.log` |
| Config | `Config.*` with validation | `process.env` directly |
| Options | `Option.match` with both cases | `Option.getOrThrow` |
| Nullability | `Option<T>` in domain types | `null`/`undefined` |
| Atoms | `Atom.make` outside components | Creating atoms inside render |
| Atom State | `Atom.keepAlive` for global state | Forgetting keepAlive for persistent state |
| Atom Updates | `useAtomSet` in React components | `Atom.update` imperatively from React |
| Atom Cleanup | `get.addFinalizer()` for side effects | Missing cleanup for event listeners |
| Atom Results | `Result.builder` with `onErrorTag` | Ignoring loading/error states |

---

## Service Patterns

### Effect.Service (Preferred)

Always use `Effect.Service` for business logic services. Provides automatic accessors, built-in `Default` layer, and explicit dependency declaration.

```typescript
import * as Effect from "effect/Effect"

export class UserService extends Effect.Service<UserService>()("UserService", {
    accessors: true,
    dependencies: [UserRepo.Default, CacheService.Default],
    effect: Effect.gen(function* () {
        const repo = yield* UserRepo
        const cache = yield* CacheService

        const findById = Effect.fn("UserService.findById")(function* (id: UserId) {
            const cached = yield* cache.get(id)
            if (Option.isSome(cached)) return cached.value
            const user = yield* repo.findById(id)
            yield* cache.set(id, user)
            return user
        })

        const create = Effect.fn("UserService.create")(function* (data: CreateUserInput) {
            const user = yield* repo.create(data)
            yield* Effect.log("User created", { userId: user.id })
            return user
        })

        return { findById, create }
    }),
}) {}
```

**Critical:** Declare all dependencies in the `dependencies` array - never leak them to call sites.

### Effect.fn for Tracing

Wrap all service methods with `Effect.fn`. Use `ServiceName.methodName` as the span name.

```typescript
const findById = Effect.fn("UserService.findById")(function* (id: UserId) {
    yield* Effect.annotateCurrentSpan("userId", id)
    return yield* repo.findById(id)
})
```

### Context.Tag (Infrastructure Only)

`Context.Tag` is acceptable only for runtime-injected infrastructure (e.g., Cloudflare KV bindings, factory patterns).

```typescript
export class KVNamespace extends Context.Tag("KVNamespace")<
    KVNamespace,
    CloudflareKVNamespace
>() {}
```

### Return Types

Services return `Effect` types, never `Promise`.

```typescript
// CORRECT
const findById = Effect.fn("UserService.findById")(
    function* (id: UserId): Effect.Effect<User, UserNotFoundError> { ... }
)
// WRONG
const findById = async (id: UserId): Promise<User> => { ... }
```

---

## Error Patterns

### Schema.TaggedError (Required)

Always use `Schema.TaggedError` for domain errors. Makes errors serializable for RPC and provides a `_tag` discriminator for `catchTag`.

```typescript
import * as Schema from "effect/Schema"
// v4: the HTTP/platform surface lives under `effect/unstable/*`, not `@effect/platform` (see setup.md).
import { HttpApiSchema } from "effect/unstable/httpapi"

export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
    "UserNotFoundError",
    {
        userId: UserId,
        message: Schema.String,
    },
    HttpApiSchema.annotations({ status: 404 }),
) {}

export class SessionExpiredError extends Schema.TaggedError<SessionExpiredError>()(
    "SessionExpiredError",
    {
        sessionId: SessionId,
        expiredAt: Schema.DateTimeUtc,
        message: Schema.String,
    },
    HttpApiSchema.annotations({ status: 401 }),
) {}
```

Every error must have `message: Schema.String` plus relevant context fields (IDs, etc.).

### Error Naming Conventions

| Pattern | Example |
|---------|---------|
| `{Entity}NotFoundError` | `UserNotFoundError`, `ChannelNotFoundError` |
| `{Entity}{Action}Error` | `UserCreateError`, `MessageUpdateError` |
| `{Feature}Error` | `SessionExpiredError`, `RateLimitExceededError` |
| `Invalid{Field}Error` | `InvalidEmailError`, `InvalidPasswordError` |

### catchTag / catchTags (Required)

Never use `catchAll` or `mapError` when `catchTag`/`catchTags` is applicable.

```typescript
// CORRECT
yield* effect.pipe(
    Effect.catchTags({
        DatabaseError: (err) => Effect.fail(new UserNotFoundError({ userId: id, message: err.message })),
        ValidationError: (err) => Effect.fail(new InvalidEmailError({ email: input.email, message: err.message })),
    }),
)

// FORBIDDEN
yield* effect.pipe(Effect.catchAll(() => Effect.fail(new GenericError({ message: "failed" }))))
```

### Preserve Specific Errors

Never collapse specific domain errors into generic HTTP error types - the frontend and downstream handlers need the discriminated `_tag`.

---

## Schema Patterns

### Branded IDs

Brand all entity IDs with `@Namespace/EntityName` format:

```typescript
import * as Schema from "effect/Schema"

export const UserId = Schema.UUID.pipe(Schema.brand("@App/UserId"))
export type UserId = Schema.Schema.Type<typeof UserId>

export const OrganizationId = Schema.UUID.pipe(Schema.brand("@App/OrganizationId"))
export type OrganizationId = Schema.Schema.Type<typeof OrganizationId>
```

### Schema.Struct for Domain Types

```typescript
export const User = Schema.Struct({
    id: UserId,
    email: Schema.String,
    name: Schema.String,
    organizationId: OrganizationId,
    role: Schema.Literal("admin", "member", "viewer"),
    createdAt: Schema.DateTimeUtc,
})
export type User = Schema.Schema.Type<typeof User>
```

### Schema.Class (When Methods Needed)

```typescript
export class User extends Schema.Class<User>("User")({
    id: UserId,
    email: Schema.String,
    name: Schema.String,
    role: Schema.Literal("admin", "member", "viewer"),
    createdAt: Schema.DateTimeUtc,
}) {
    get isAdmin() { return this.role === "admin" }
    get displayName() { return this.name || this.email.split("@")[0] }
}
```

### Transforms

```typescript
export const PositiveNumber = Schema.transformOrFail(
    Schema.Number,
    Schema.Number.pipe(Schema.brand("PositiveNumber")),
    {
        decode: (n, _, ast) =>
            n > 0
                ? ParseResult.succeed(n as Schema.Schema.Type<typeof PositiveNumber>)
                : ParseResult.fail(new ParseResult.Type(ast, n, "Must be positive")),
        encode: ParseResult.succeed,
    }
)
```

### Option Over null/undefined

```typescript
// CORRECT
const User = Schema.Struct({ bio: Schema.Option(Schema.String) })
// WRONG
type User = { bio: string | null }
```

---

## Layer Patterns

### Declare Dependencies in Service

```typescript
export class OrderService extends Effect.Service<OrderService>()("OrderService", {
    accessors: true,
    dependencies: [UserService.Default, ProductService.Default],
    effect: Effect.gen(function* () {
        const users = yield* UserService
        const products = yield* ProductService
        return { /* methods */ }
    }),
}) {}
```

### Layer.mergeAll (Flat Composition)

```typescript
const ServicesLive = Layer.mergeAll(
    UserService.Default,
    OrderService.Default,
    ProductService.Default,
)
const AppLive = ServicesLive.pipe(Layer.provide(DatabaseLive))
```

### Layer.provideMerge (Incremental Chaining)

Use `Layer.provideMerge` instead of chained `Layer.provide` - it produces flatter types that don't slow the LSP.

```typescript
const MainLive = DatabaseLive.pipe(
    Layer.provideMerge(ConfigServiceLive),
    Layer.provideMerge(LoggerLive),
    Layer.provideMerge(CacheLive),
)
```

### Layer Deduplication

Layers memoize construction. `Effect.provide` does not - it creates new instances per call. Always compose layers, not effects, to avoid duplicate connections.

### layerConfig Pattern

For config-dependent services:

```typescript
static readonly layerConfig = (
    config: Config.Config.Wrap<ServiceConfig>,
): Layer.Layer<MyService, ConfigError.ConfigError> =>
    Layer.unwrapEffect(
        Config.unwrap(config).pipe(
            Effect.map((cfg) => Layer.succeed(MyService, new MyServiceImpl(cfg)))
        )
    )
```

### Testing Layers

```typescript
export const UserServiceTest = Layer.succeed(
    UserService,
    UserService.of({
        findById: (id) => Effect.succeed(mockUser),
        create: (input) => Effect.succeed({ ...mockUser, ...input }),
    })
)
```

---

## Effect Atom Patterns (Frontend)

### Define Atoms Outside Components

```typescript
import { Atom } from "@effect-atom/atom-react"

const countAtom = Atom.make(0)
const userPrefsAtom = Atom.make({ theme: "dark" }).pipe(Atom.keepAlive)
```

### React Hooks

```typescript
const count = useAtomValue(countAtom)     // Read only
const setCount = useAtomSet(countAtom)    // Write only
const [val, setVal] = useAtom(countAtom) // Read + write
```

### Result.builder for Effectful Atoms

```typescript
return Result.builder(userResult)
    .onInitial(() => <div>Loading...</div>)
    .onErrorTag("NotFoundError", () => <div>Not found</div>)
    .onError((error) => <div>Error: {error.message}</div>)
    .onSuccess((user) => <div>Hello, {user.name}</div>)
    .render()
```

### Cleanup with addFinalizer

```typescript
const scrollYAtom = Atom.make((get) => {
    const onScroll = () => get.setSelf(window.scrollY)
    window.addEventListener("scroll", onScroll)
    get.addFinalizer(() => window.removeEventListener("scroll", onScroll))
    return window.scrollY
}).pipe(Atom.keepAlive)
```

---

## Anti-Patterns (Forbidden)

| Anti-Pattern | Reason | Fix |
|---|---|---|
| `Effect.runSync`/`runPromise` inside services | Breaks composition, loses tracing | Use `yield*` in `Effect.gen` |
| `throw` inside `Effect.gen` | Bypasses error channel | `yield* Effect.fail(new DomainError(...))` |
| `catchAll` losing types | Collapses error discrimination | `catchTag`/`catchTags` |
| `any`/`unknown` casts | Bypasses type safety | `Schema.decodeUnknown` |
| `Promise` in service signatures | Loses Effect composition | `Effect.Effect<A, E>` return type |
| `console.log` | Not structured, lost in telemetry | `Effect.log(...)` |
| `process.env` directly | No validation, fails silently | `Config.string("KEY")` |
| `Config.secret` (deprecated) | Replaced by `Config.redacted` | `Config.redacted("KEY")` |
| `null`/`undefined` in domain types | Error-prone absence semantics | `Option<T>` |
| `Option.getOrThrow` | Throws exceptions, bypasses error channel | `Option.match` with both cases |
| `Context.Tag` for business services | More boilerplate, no built-in accessors | `Effect.Service` |
| `Effect.orDie` except for true defects | Converts recoverable errors to defects | Handle with `catchTag` |
| `mapError` | Narrows to a single error type, making downstream discrimination (catchTag) impossible | `catchTag` |
| `Date.now()` / `new Date()` directly | Non-deterministic, untestable | `Clock.currentTimeMillis` |
| Mutable state without `Ref` | Race conditions, not composable | `Ref.make` + `Ref.update` |

---

## effect-kit Write Deltas

The following patterns are additions specific to the effect-kit opinionated setup (mined from t3code). They extend or override defaults from the Makisuo upstream.

### 1. Namespace-Import-Only (Enforced by LS Rule)

**Always** import Effect modules via deep namespace paths. The `importFromBarrel` oxlint rule flags barrel imports.

```typescript
// CORRECT - namespace imports from deep paths
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Config from "effect/Config"
import * as Ref from "effect/Ref"

// FORBIDDEN - barrel import
import { Effect, Schema, Layer } from "effect"
```

Enforced by `@effect/language-service` `importFromBarrel` diagnostic rule (set to `"error"` in `tsconfig.snippet.json`). The rule fires on any `import { ... } from "effect"` (the barrel).

### 2. Context.Service Split-Interface Variant

An alternative to `Effect.Service`+`accessors` when you need the public type contract split from the implementation. Use when the service shape is a `Shape` interface you want visible to callers without coupling to the class.

```typescript
import * as Context from "effect/Context"

interface UserServiceShape {
    readonly findById: (id: UserId) => Effect.Effect<User, UserNotFoundError>
    readonly create: (data: CreateUserInput) => Effect.Effect<User, never>
}

// Tag string uses the namespace convention: "@Domain/ServiceName"
class UserService extends Context.Service<UserService, UserServiceShape>()(
    "@App/UserService"
) {}

// Implementation live layer constructed separately
const UserServiceLive = Layer.effect(
    UserService,
    Effect.gen(function* () {
        const repo = yield* UserRepo
        return {
            findById: Effect.fn("UserService.findById")(function* (id) {
                return yield* repo.findById(id)
            }),
            create: Effect.fn("UserService.create")(function* (data) {
                return yield* repo.create(data)
            }),
        }
    })
)
```

Use `Effect.Service` by default. Prefer this split-interface form when:
- The service contract is consumed by multiple implementations (e.g., test vs prod)
- You want to keep the public `Shape` type importable without the implementation module

### 3. Effect.fn.Return Explicit Return Annotation

Use `Effect.fn.Return<A, E>` as the return type on service methods to prevent deep-instantiation inference blowups that slow the TypeScript LSP.

```typescript
import * as Effect from "effect/Effect"

const findById = Effect.fn("UserService.findById")(
    function* (id: UserId): Effect.fn.Return<User, UserNotFoundError> {
        const user = yield* repo.findById(id)
        return user
    }
)

const processOrder = Effect.fn("OrderService.processOrder")(
    function* (orderId: OrderId): Effect.fn.Return<Order, OrderNotFoundError | PaymentError> {
        const order = yield* orderRepo.findById(orderId)
        yield* paymentService.charge(order)
        return order
    }
)
```

`Effect.fn.Return<A, E>` = `Effect.Effect<A, E>` but resolved as the generator's return type, avoiding complex inferred union types that accumulate as generator yield points grow. Prefer it on any method with 3+ `yield*` expressions. (v4-beta API - verify the exact name against your installed `effect` version; it may be renamed before stable release.)
