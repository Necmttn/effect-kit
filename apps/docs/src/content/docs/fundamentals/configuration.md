---
title: Configuration
description: Managing configuration in Effect Kit applications
---

# Configuration

Effect Kit uses Effect's powerful configuration system to manage application settings across different environments.

## Configuration Provider

Effect's `ConfigProvider` allows you to load configuration from various sources:

```typescript
import { Config, ConfigProvider, Effect, Layer } from "effect"

// Define configuration schema
const AppConfig = Config.all({
  port: Config.number("PORT").pipe(
    Config.withDefault(3001)
  ),
  database: Config.all({
    url: Config.string("DATABASE_URL"),
    poolSize: Config.number("DB_POOL_SIZE").pipe(
      Config.withDefault(10)
    ),
  }),
  jwt: Config.all({
    secret: Config.secret("JWT_SECRET"),
    expiresIn: Config.string("JWT_EXPIRES_IN").pipe(
      Config.withDefault("7d")
    ),
  }),
})
```

## Environment Variables

### Development Setup

Create a `.env` file in your project root:

```bash
# Application
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/effectkit
DB_POOL_SIZE=10

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# External Services
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Production Configuration

For production, use environment variables directly:

```bash
# Set via hosting provider
DATABASE_URL=${{ secrets.DATABASE_URL }}
JWT_SECRET=${{ secrets.JWT_SECRET }}
```

## Loading Configuration

### In Services

```typescript
export const AppConfigLive = Layer.effect(
  AppConfig.Tag,
  Effect.gen(function* () {
    const config = yield* Config.config(AppConfig)
    
    // Validate configuration
    if (config.database.poolSize > 100) {
      yield* Effect.fail(
        ConfigError("Database pool size must be <= 100")
      )
    }
    
    return config
  })
)
```

### In API Routes

```typescript
const handler = Effect.gen(function* () {
  const config = yield* AppConfig.Tag
  const port = config.port
  
  // Use configuration
  yield* Console.log(`Server running on port ${port}`)
})
```

## Configuration Schemas

Define type-safe configuration schemas:

```typescript
import { Schema } from "effect"

// Database configuration
export const DatabaseConfig = Schema.Struct({
  url: Schema.String,
  poolSize: Schema.Number.pipe(
    Schema.between(1, 100)
  ),
  ssl: Schema.optional(Schema.Boolean),
})

// Feature flags
export const FeatureFlags = Schema.Struct({
  newUI: Schema.Boolean,
  betaFeatures: Schema.Boolean,
  maintenanceMode: Schema.Boolean,
})

// Complete app configuration
export const Configuration = Schema.Struct({
  app: Schema.Struct({
    name: Schema.String,
    version: Schema.String,
    environment: Schema.Literal("development", "staging", "production"),
  }),
  database: DatabaseConfig,
  features: FeatureFlags,
})
```

## Secret Management

Effect provides built-in support for secrets:

```typescript
const SecretConfig = Config.all({
  apiKey: Config.secret("API_KEY"),
  databasePassword: Config.secret("DB_PASSWORD"),
})

// Secrets are redacted in logs
Effect.gen(function* () {
  const config = yield* Config.config(SecretConfig)
  yield* Console.log(config)
  // Output: { apiKey: Secret(<redacted>), databasePassword: Secret(<redacted>) }
})
```

## Configuration Sources

### Environment Variables (Default)

```typescript
// Automatically loaded from process.env
const config = ConfigProvider.fromEnv()
```

### JSON Files

```typescript
const config = ConfigProvider.fromJson({
  PORT: 3001,
  DATABASE_URL: "postgresql://localhost:5432/dev",
})
```

### Remote Configuration

```typescript
const RemoteConfigProvider = ConfigProvider.fromAsync(
  async (path) => {
    const response = await fetch(`https://config.example.com/${path}`)
    return response.json()
  }
)
```

### Layered Configuration

```typescript
// Load from multiple sources with precedence
const config = ConfigProvider.orElse(
  ConfigProvider.fromEnv(),          // First, check environment
  ConfigProvider.fromJson(defaults)   // Then, use defaults
)
```

## Per-Environment Configuration

### Development

```typescript
const DevelopmentConfig = Layer.succeed(
  ConfigProvider.ConfigProvider,
  ConfigProvider.fromJson({
    LOG_LEVEL: "debug",
    PRETTY_LOGS: true,
    DATABASE_URL: "postgresql://localhost:5432/dev",
  })
)
```

### Testing

```typescript
const TestConfig = Layer.succeed(
  ConfigProvider.ConfigProvider,
  ConfigProvider.fromJson({
    LOG_LEVEL: "error",
    DATABASE_URL: "postgresql://localhost:5432/test",
  })
)
```

### Production

```typescript
const ProductionConfig = Layer.succeed(
  ConfigProvider.ConfigProvider,
  ConfigProvider.orElse(
    ConfigProvider.fromEnv(),
    ConfigProvider.fail("Missing required environment variables")
  )
)
```

## Validation

Validate configuration at startup:

```typescript
const validateConfig = Effect.gen(function* () {
  const config = yield* AppConfig.Tag
  
  // Check required fields
  if (!config.database.url) {
    yield* Effect.fail("DATABASE_URL is required")
  }
  
  // Validate URLs
  try {
    new URL(config.database.url)
  } catch {
    yield* Effect.fail("Invalid DATABASE_URL format")
  }
  
  // Check feature compatibility
  if (config.features.newUI && !config.features.betaFeatures) {
    yield* Effect.fail("New UI requires beta features to be enabled")
  }
})
```

## Best Practices

1. **Use schemas** - Define configuration schemas for type safety
2. **Validate early** - Validate configuration at application startup
3. **Use secrets** - Mark sensitive values as secrets
4. **Layer configs** - Use different configurations per environment
5. **Document variables** - Maintain a comprehensive `.env.example`

## Common Patterns

### Feature Toggles

```typescript
const Features = Config.all({
  darkMode: Config.boolean("FEATURE_DARK_MODE").pipe(
    Config.withDefault(false)
  ),
  payments: Config.boolean("FEATURE_PAYMENTS").pipe(
    Config.withDefault(true)
  ),
})

// Use in application
if (yield* features.darkMode) {
  // Enable dark mode
}
```

### Dynamic Reloading

```typescript
const ReloadableConfig = Effect.gen(function* () {
  const ref = yield* Ref.make(yield* loadConfig())
  
  // Reload on SIGHUP
  yield* Effect.addFinalizer(() =>
    process.removeListener("SIGHUP", reload)
  )
  
  process.on("SIGHUP", () =>
    Effect.runFork(
      Ref.set(ref, yield* loadConfig())
    )
  )
  
  return {
    get: Ref.get(ref),
    reload: () => Ref.set(ref, yield* loadConfig()),
  }
})
```

## Next Steps

- Learn about [Services & Layers](/fundamentals/services)
- Understand [Error Handling](/fundamentals/error-handling)
- Explore [Testing](/fundamentals/testing)