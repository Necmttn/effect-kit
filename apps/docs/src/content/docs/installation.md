---
title: Installation
description: Detailed installation guide for Effect Kit
---

# Installation

This guide will walk you through installing Effect Kit and setting up your development environment.

## System Requirements

Before installing Effect Kit, ensure your system meets these requirements:

- **Node.js** 20.0.0 or higher (recommended: latest LTS)
- **Bun** 1.0.0 or higher (optional but recommended)
- **Git** for version control
- **Docker** (optional, for local database development)

## Package Managers

Effect Kit works with all major package managers:

<Tabs>
  <TabItem label="Bun (Recommended)">
    ```bash
    # Install Bun globally if not already installed
    curl -fsSL https://bun.sh/install | bash
    
    # Create new app
    bunx create-effect-app@latest my-app
    ```
  </TabItem>
  
  <TabItem label="npm">
    ```bash
    npx create-effect-app@latest my-app
    ```
  </TabItem>
  
  <TabItem label="pnpm">
    ```bash
    pnpm create effect-app@latest my-app
    ```
  </TabItem>
  
  <TabItem label="Yarn">
    ```bash
    yarn create effect-app@latest my-app
    ```
  </TabItem>
</Tabs>

## Interactive Setup

When you run the create command, you'll be guided through an interactive setup:

```bash
🚀 Creating your Effect Kit app...

✔ Choose your package manager: › Bun
✔ Include authentication? › Yes
✔ Select database: › PostgreSQL
✔ Include example code? › Yes
✔ Include Docker setup? › Yes
✔ Initialize git repository? › Yes

📦 Installing dependencies...
✨ Your Effect Kit app is ready!

Next steps:
  cd my-app
  bun install
  docker-compose up -d
  bun db:migrate
  bun dev
```

## Configuration Options

### Package Manager

Choose your preferred package manager. We recommend Bun for its speed, but all options work well:

- **Bun** - Fastest installation and runtime
- **npm** - Most compatible
- **pnpm** - Efficient disk usage
- **Yarn** - Good workspace support

### Authentication

Choose whether to include authentication features:

- **Yes** - Includes JWT auth, social login, and session management
- **No** - Minimal setup without auth

### Database

Select your database:

- **PostgreSQL** - Full-featured, recommended for production
- **MySQL** - Alternative SQL database
- **SQLite** - Lightweight, good for development
- **None** - No database setup

### Example Code

- **Yes** - Includes example routes, components, and tests
- **No** - Minimal boilerplate only

### Docker Setup

- **Yes** - Includes docker-compose.yml for local development
- **No** - Manual database setup required

## Manual Installation

If you prefer manual setup or need to customize the installation:

### 1. Clone the Repository

```bash
git clone https://github.com/effectkit/effectkit.git my-app
cd my-app
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/effectkit

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Optional: Social Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 4. Database Setup

Start PostgreSQL with Docker:

```bash
docker-compose up -d
```

Or install PostgreSQL locally and create a database:

```sql
CREATE DATABASE effectkit;
```

Run migrations:

```bash
bun db:migrate
```

### 5. Start Development Server

```bash
bun dev
```

## VS Code Setup

For the best development experience with VS Code:

### 1. Install Recommended Extensions

Open the project and accept the prompt to install recommended extensions, or install manually:

- [Effect Language Service](https://marketplace.visualstudio.com/items?itemName=effect-ts.effect-language-service)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### 2. Configure TypeScript

Select the workspace TypeScript version:

1. Open any TypeScript file
2. Press `Cmd/Ctrl + Shift + P`
3. Select "TypeScript: Select TypeScript Version"
4. Choose "Use Workspace Version"

## Project Structure

After installation, your project will have this structure:

```
my-app/
├── apps/
│   ├── web/                 # Frontend application
│   └── api/                 # Backend API server
├── packages/
│   ├── core/               # Shared business logic
│   ├── database/           # Database layer
│   ├── ui/                 # Shared UI components
│   └── shared/             # Shared types & schemas
├── docker-compose.yml      # Local development services
├── .env.example            # Environment variables template
└── package.json            # Root package.json
```

## Troubleshooting

### Common Issues

#### Port Already in Use

If you see "Port 3000 is already in use":

```bash
# Kill the process using the port
lsof -ti:3000 | xargs kill -9

# Or use different ports
PORT=3002 bun dev
```

#### Database Connection Failed

Check that PostgreSQL is running:

```bash
docker-compose ps

# If not running:
docker-compose up -d
```

#### TypeScript Errors

Ensure you're using the workspace TypeScript version and rebuild:

```bash
bun run build
```

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](/troubleshooting)
2. Search [GitHub Issues](https://github.com/effectkit/effectkit/issues)
3. Ask in [Discord](https://discord.gg/effectkit)
4. Create a [new issue](https://github.com/effectkit/effectkit/issues/new)

## Next Steps

Now that you have Effect Kit installed:

1. **[Quick Start](/quick-start)** - Build your first feature
2. **[Project Structure](/fundamentals/project-structure)** - Understand the architecture
3. **[Configuration](/fundamentals/configuration)** - Customize your setup