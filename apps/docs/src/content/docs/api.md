---
title: API Reference
description: Complete API reference for Effect Kit
tableOfContents: false
---

# API Reference

Complete API documentation for all Effect Kit packages.

## Core Package

The `@effect-kit/core` package provides essential services and utilities.

### Services

- [`AuthService`](/api/core/auth-service) - Authentication and authorization
- [`CacheService`](/api/core/cache-service) - Caching with Redis/memory backends
- [`EmailService`](/api/core/email-service) - Email sending with templates
- [`QueueService`](/api/core/queue-service) - Background job processing
- [`StorageService`](/api/core/storage-service) - File storage abstraction

### HTTP

- [`api`](/api/core/api) - HTTP route builder
- [`middleware`](/api/core/middleware) - Common middleware functions
- [`validation`](/api/core/validation) - Request validation utilities

## Database Package

The `@effect-kit/database` package provides type-safe database access.

- [`Client`](/api/database/client) - Database client setup
- [`Migrations`](/api/database/migrations) - Migration utilities
- [`Queries`](/api/database/queries) - Query builder helpers
- [`Transactions`](/api/database/transactions) - Transaction management

## UI Package

The `@effect-kit/ui` package contains reusable React components.

### Components

- [`Button`](/api/ui/button) - Button component
- [`Card`](/api/ui/card) - Card container
- [`Form`](/api/ui/form) - Form components
- [`Input`](/api/ui/input) - Input fields
- [`Modal`](/api/ui/modal) - Modal dialogs
- [`Table`](/api/ui/table) - Data tables

### Hooks

- [`useEffect`](/api/ui/use-effect) - Effect integration for React
- [`useQuery`](/api/ui/use-query) - Data fetching with Effect
- [`useMutation`](/api/ui/use-mutation) - Mutations with Effect

## Shared Package

The `@effect-kit/shared` package contains shared types and schemas.

### Schemas

- [`User`](/api/shared/user-schema) - User data schema
- [`Common`](/api/shared/common-schemas) - Common data types
- [`Errors`](/api/shared/error-schemas) - Error type definitions

### Utilities

- [`dates`](/api/shared/dates) - Date utilities
- [`strings`](/api/shared/strings) - String manipulation
- [`validation`](/api/shared/validation) - Validation helpers

## Effect Integration

Effect Kit is built on top of Effect. See the [Effect documentation](https://effect.website/docs/introduction) for:

- Effect core APIs
- Effect Platform
- Effect Schema
- Effect RPC

## TypeScript API

All APIs are fully typed. Use your IDE's IntelliSense for:

- Parameter types
- Return types  
- Available methods
- Configuration options

## Examples

Find working examples in our [GitHub repository](https://github.com/effectkit/effectkit/tree/main/examples):

- [REST API](/examples/rest-api)
- [GraphQL Server](/examples/graphql)
- [Real-time Chat](/examples/chat)
- [E-commerce](/examples/ecommerce)

## Need Help?

- [Discord Community](https://discord.gg/effectkit)
- [GitHub Discussions](https://github.com/effectkit/effectkit/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/effect-kit)