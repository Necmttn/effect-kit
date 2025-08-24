# Effect Kit

> Build Effect.ts applications with confidence

<p align="center">
  <img src="./assets/logo.svg" width="200" alt="Effect Kit Logo" />
  <br />
  <br />
  <strong>The CLI-driven boilerplate for Effect.ts applications</strong>
  <br />
  <br />
  <a href="https://effectkit.dev">Documentation</a> •
  <a href="https://github.com/effectkit/effectkit/tree/main/examples">Examples</a> •
  <a href="https://discord.gg/effectkit">Discord</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-effect-app"><img src="https://img.shields.io/npm/v/create-effect-app.svg" alt="NPM Version" /></a>
  <a href="https://github.com/effectkit/effectkit/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/effectkit.svg" alt="License" /></a>
  <a href="https://discord.gg/effectkit"><img src="https://img.shields.io/discord/123456789.svg" alt="Discord" /></a>
</p>

---

## 🎯 Philosophy

**Effect Kit** is a CLI-driven boilerplate system inspired by shadcn/ui. Instead of an opinionated framework, it provides:

- **Copy, don't install** - Services are copied to your project, giving you full ownership
- **Composable by design** - Mix and match services to build exactly what you need  
- **Community-driven** - Anyone can contribute services to the registry
- **Type-safe throughout** - Leverage Effect's powerful type system across the entire stack

## ✨ Features

- 🛠️ **CLI-first** - Add services and components with simple commands
- 🔧 **Fully customizable** - Own your code, modify as needed
- 🏗️ **Production-ready** - Services designed for real-world applications
- 🌟 **Best practices** - Built with Effect patterns and conventions
- 📦 **Zero-config** - Sensible defaults that just work
- 🎨 **Modern stack** - Latest Effect, TypeScript, and tooling

## 🚀 Quick Start

```bash
# Create a new project
npx create-effect-app@latest my-app
cd my-app

# Add services from the registry
npx effect-kit add auth-jwt
npx effect-kit add database-postgres
npx effect-kit add cache-redis

# Start developing
npm run dev
```

## 📦 Available Services

### Authentication
- `auth-jwt` - JWT-based authentication with bcrypt
- `auth-oauth` - OAuth integration (Google, GitHub, Discord)
- `auth-magic-link` - Passwordless magic link authentication

### Database
- `database-postgres` - PostgreSQL with Effect SQL
- `database-mysql` - MySQL with Effect SQL  
- `database-sqlite` - SQLite for development
- `database-prisma` - Prisma ORM integration

### Caching & Storage
- `cache-redis` - Redis caching service
- `cache-memory` - In-memory caching
- `storage-s3` - AWS S3 file storage
- `storage-local` - Local file storage

### Communication
- `email-resend` - Email service with Resend
- `email-sendgrid` - SendGrid email integration
- `notifications-push` - Push notifications
- `websockets` - Real-time WebSocket service

### External APIs
- `payments-stripe` - Stripe payment processing
- `ai-openai` - OpenAI API integration
- `analytics-posthog` - PostHog analytics
- `search-typesense` - Typesense search engine

## 🎯 Example: Building a SaaS Application

```bash
# Initialize project
npx create-effect-app@latest my-saas --template fullstack

# Add authentication and database
npx effect-kit add auth-jwt database-postgres

# Add payments and emails  
npx effect-kit add payments-stripe email-resend

# Add caching and analytics
npx effect-kit add cache-redis analytics-posthog
```

Your services are now ready to use:

```typescript
import { Effect } from "effect"
import { AuthService } from "./services/AuthService"
import { DatabaseService } from "./services/DatabaseService"
import { PaymentsService } from "./services/PaymentsService"

const registerUser = Effect.gen(function* () {
  const auth = yield* AuthService
  const db = yield* DatabaseService
  const payments = yield* PaymentsService
  
  // Create user account
  const { user, token } = yield* auth.register({
    email: "user@example.com",
    password: "secure-password",
    name: "John Doe"
  })
  
  // Save to database
  yield* db.insert("users", user)
  
  // Create Stripe customer
  const customer = yield* payments.createCustomer({
    email: user.email,
    name: user.name
  })
  
  return { user, token, customer }
})
```

## 📚 CLI Commands

```bash
# Project initialization
npx create-effect-app <project-name>    # Create new project
npx create-effect-app --template api     # Use specific template

# Service management  
npx effect-kit add <service>             # Add a service
npx effect-kit remove <service>          # Remove a service
npx effect-kit list                      # List available services
npx effect-kit list --installed          # Show installed services

# Updates and maintenance
npx effect-kit update [service]          # Update services
npx effect-kit diff <service>            # Show differences
```

## 🏗️ Project Structure

Effect Kit creates a clean, scalable structure:

```
my-app/
├── src/
│   ├── services/           # Effect services (added via CLI)
│   ├── lib/               # Utility functions
│   ├── types/             # TypeScript types
│   └── index.ts           # Application entry point
├── tests/                 # Test files
├── effect-kit.config.json # Effect Kit configuration
├── package.json
└── tsconfig.json
```

## 🌍 Community Registry

Effect Kit thrives on community contributions. Anyone can publish services:

### Publishing a Service

```bash
# Create your service
effect-kit create service my-awesome-service

# Test locally
effect-kit add ./local/my-awesome-service

# Publish to registry
effect-kit publish my-awesome-service
```

### Service Structure

```typescript
// services/my-service.ts
import { Effect, Context } from "effect"

export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: () => Effect.Effect<string>
  }
>() {
  static Live = Effect.gen(function* () {
    return {
      doSomething: () => Effect.succeed("Hello from my service!")
    }
  })
}
```

### Registry Metadata

```json
{
  "name": "my-awesome-service",
  "type": "service",
  "description": "An awesome service that does amazing things",
  "dependencies": ["effect"],
  "devDependencies": ["@types/node"],
  "files": [
    {
      "path": "src/services/MyService.ts",
      "type": "registry:service"
    }
  ],
  "docs": "https://github.com/me/my-service#readme",
  "category": "utilities"
}
```

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

1. **Add services** - Create useful services for the community
2. **Improve CLI** - Enhance the developer experience
3. **Write docs** - Help others learn Effect Kit
4. **Report bugs** - Help us improve quality

### Development Setup

```bash
# Clone the repository
git clone https://github.com/effectkit/effectkit.git
cd effectkit

# Install dependencies
bun install

# Start development
bun dev

# Test CLI locally
cd packages/cli
bun link
effect-kit --help
```

## 📖 Documentation

- **[Getting Started](https://effectkit.dev/docs/quick-start)** - Your first Effect Kit app
- **[Service Reference](https://effectkit.dev/docs/services)** - All available services
- **[CLI Reference](https://effectkit.dev/docs/cli)** - Complete CLI documentation
- **[Contributing Guide](https://effectkit.dev/docs/contributing)** - How to contribute
- **[Examples](https://github.com/effectkit/effectkit/tree/main/examples)** - Real-world examples

## 🌟 Showcase

Companies and projects using Effect Kit:

- 🏢 **Acme Corp** - Internal developer platform
- 🚀 **StartupXYZ** - Multi-tenant SaaS application  
- 📊 **DataViz Pro** - Real-time analytics dashboard
- 🛒 **ShopFlow** - E-commerce platform

[Add your project →](https://github.com/effectkit/effectkit/edit/main/README.md)

## 💎 Gold Sponsors

<p align="center">
  <a href="https://effect.website">
    <img src="https://effect.website/logo.svg" width="200" alt="Effect" />
  </a>
</p>

## 🤝 Community & Support

- **[Discord](https://discord.gg/effectkit)** - Join our community
- **[GitHub Discussions](https://github.com/effectkit/effectkit/discussions)** - Ask questions
- **[Twitter](https://twitter.com/effectkit)** - Follow for updates
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/effect-kit)** - Get help

## 📄 License

Effect Kit is [MIT licensed](LICENSE).

---

<p align="center">
  <strong>Built with ❤️ by the Effect community</strong>
  <br />
  <br />
  <a href="https://effectkit.dev">effectkit.dev</a>
</p>