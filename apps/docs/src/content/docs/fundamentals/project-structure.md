---
title: Project Structure
description: Understanding the Effect Kit project structure and architecture
---

# Project Structure

Effect Kit uses a monorepo structure to organize code and maximize code reuse across your application.

## Directory Overview

```
effect-kit/
├── apps/                    # Applications
│   ├── web/                # Frontend application (TanStack Start)
│   ├── api/                # Backend API server
│   └── docs/               # Documentation site (you are here!)
│
├── packages/               # Shared packages
│   ├── core/              # Core business logic & Effect services
│   ├── database/          # Database layer with @effect/sql
│   ├── ui/                # Shared UI components
│   └── shared/            # Shared types, schemas, and utilities
│
├── config/                 # Shared configuration files
├── scripts/                # Build and utility scripts
└── docker-compose.yml      # Local development services
```

## Apps Directory

### `apps/web` - Frontend Application

The frontend is built with TanStack Start and React:

```
apps/web/
├── src/
│   ├── routes/            # Page routes (file-based routing)
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and client setup
│   └── styles/            # Global styles
├── public/                # Static assets
└── package.json
```

### `apps/api` - Backend API

The backend API uses Effect's HTTP server:

```
apps/api/
├── src/
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── middleware/        # HTTP middleware
│   ├── migrations/        # Database migrations
│   └── index.ts          # Server entry point
└── package.json
```

## Packages Directory

### `packages/core` - Core Services

Contains the core Effect services and business logic:

```typescript
// packages/core/src/services/AuthService.ts
export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    login: (credentials: LoginCredentials) => Effect.Effect<User, AuthError>
    logout: (token: string) => Effect.Effect<void>
    verify: (token: string) => Effect.Effect<User, AuthError>
  }
>() {}
```

### `packages/database` - Database Layer

Provides type-safe database access:

```typescript
// packages/database/src/client.ts
export const DatabaseLive = Layer.succeed(
  SqlClient.SqlClient,
  SqlClient.make({
    // Configuration
  })
)
```

### `packages/shared` - Shared Code

Contains schemas, types, and utilities used across the application:

```typescript
// packages/shared/src/schemas/user.ts
import { Schema } from "effect"

export const User = Schema.Struct({
  id: Schema.UUID,
  email: Schema.Email,
  name: Schema.String,
})
```

### `packages/ui` - Component Library

Reusable UI components built with React and Tailwind:

```tsx
// packages/ui/src/components/Button.tsx
export function Button({ variant = "primary", ...props }) {
  return <button className={buttonStyles[variant]} {...props} />
}
```

## Configuration Files

### Root Configuration

- **`tsconfig.json`** - TypeScript configuration with project references
- **`package.json`** - Root package.json with workspace configuration
- **`.gitignore`** - Git ignore patterns
- **`.vscode/`** - VS Code workspace settings

### Environment Variables

```bash
# .env.example
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/effectkit
JWT_SECRET=your-secret-key
API_URL=http://localhost:3001
```

## Monorepo Benefits

1. **Code Sharing** - Share types, schemas, and utilities across apps
2. **Type Safety** - End-to-end type safety from database to frontend
3. **Single Version** - Manage dependencies in one place
4. **Atomic Changes** - Make changes across multiple packages atomically
5. **Better Testing** - Test integration between packages easily

## Development Workflow

### Starting Development

```bash
# Install dependencies
bun install

# Start all apps in development
bun dev

# Or start specific apps
bun run --filter @effect-kit/api dev
bun run --filter @effect-kit/web dev
```

### Building for Production

```bash
# Build all packages and apps
bun build

# Build specific workspace
bun run --filter @effect-kit/api build
```

### Adding Dependencies

```bash
# Add to root (dev dependencies)
bun add -d typescript

# Add to specific package
bun add effect --filter @effect-kit/core

# Add to all packages
bun add effect --filter '*'
```

## Best Practices

1. **Keep packages focused** - Each package should have a single responsibility
2. **Use workspace protocol** - Reference local packages with `workspace:*`
3. **Maintain clear boundaries** - Don't create circular dependencies
4. **Document exports** - Clearly document what each package exports
5. **Version together** - Keep all packages at the same version

## Next Steps

- Learn about [Services & Layers](/fundamentals/services)
- Understand [Configuration](/fundamentals/configuration)
- Explore [Testing](/fundamentals/testing)