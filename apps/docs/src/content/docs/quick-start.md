---
title: Quick Start
description: Get your first Effect Kit application running in minutes
---

# Quick Start

Get your first Effect Kit application up and running in just 5 minutes!

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20+** or **Bun 1.0+** installed
- **Git** for version control
- A code editor (we recommend VS Code)

## Create Your First App

### 1. Initialize a New Project

```bash
npx create-effect-app@latest my-app
```

You'll be prompted to configure your project:

```
🚀 Creating your Effect Kit app...

? Choose your package manager: › Bun (recommended)
? Include authentication? › Yes
? Select database: › PostgreSQL
? Include example code? › Yes
? Initialize git repository? › Yes

✨ Your Effect Kit app is ready!
```

### 2. Navigate to Your Project

```bash
cd my-app
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Set Up Your Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Run migrations
bun db:migrate

# Seed example data (optional)
bun db:seed
```

### 5. Start the Development Server

```bash
bun dev
```

Your application is now running!

- 🌐 **Frontend**: [http://localhost:3000](http://localhost:3000)
- 🚀 **API**: [http://localhost:3001](http://localhost:3001)
- 📚 **API Docs**: [http://localhost:3001/docs](http://localhost:3001/docs)

## What You Get

Your new Effect Kit application includes:

### 🏗️ Project Structure

```
my-app/
├── apps/
│   ├── web/                 # Frontend with TanStack Start
│   │   ├── src/
│   │   │   ├── routes/      # Page routes
│   │   │   ├── components/  # React components
│   │   │   └── hooks/       # Custom hooks
│   │   └── package.json
│   │
│   └── api/                 # Backend API server
│       ├── src/
│       │   ├── routes/      # API routes
│       │   ├── services/    # Business logic
│       │   └── index.ts     # Server entry
│       └── package.json
│
├── packages/
│   ├── core/               # Shared Effect services
│   ├── database/           # Database layer
│   └── shared/             # Shared types & schemas
│
└── docker-compose.yml      # Local development services
```

### ✨ Built-in Features

- **Authentication** - Login, register, and session management
- **Database** - Type-safe queries with migrations
- **API Routes** - RESTful endpoints with validation
- **RPC** - Type-safe client-server communication
- **UI Components** - Pre-built with Tailwind CSS
- **Error Handling** - Comprehensive error management
- **Testing** - Unit and integration test setup
- **Docker** - Local development environment

## Your First Feature

Let's add a simple todo list to understand how Effect Kit works:

### 1. Define the Schema

Create `packages/shared/src/schemas/todo.ts`:

```typescript
import { Schema } from "effect"

export const Todo = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String,
  completed: Schema.Boolean,
  userId: Schema.UUID,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
})

export type Todo = Schema.Schema.Type<typeof Todo>
```

### 2. Create the Database Table

Create `apps/api/src/migrations/002_create_todos.sql`:

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
```

Run the migration:

```bash
bun db:migrate
```

### 3. Create a Service

Create `apps/api/src/services/TodoService.ts`:

```typescript
import { Effect, Context } from "effect"
import { SqlClient } from "@effect/sql"
import { Todo } from "@effect-kit/shared/schemas"

export class TodoService extends Context.Tag("TodoService")<
  TodoService,
  {
    create: (data: {
      title: string
      userId: string
    }) => Effect.Effect<Todo>
    
    findByUser: (userId: string) => Effect.Effect<readonly Todo[]>
    
    update: (id: string, data: {
      completed?: boolean
      title?: string
    }) => Effect.Effect<Todo>
  }
>() {
  static Live = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    
    return {
      create: (data) =>
        sql`
          INSERT INTO todos (title, user_id)
          VALUES (${data.title}, ${data.userId})
          RETURNING *
        `.pipe(
          Effect.map(([todo]) => todo),
          Effect.withSchema(Todo)
        ),
        
      findByUser: (userId) =>
        sql`
          SELECT * FROM todos
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `.pipe(
          Effect.withSchema(Schema.Array(Todo))
        ),
        
      update: (id, data) =>
        sql`
          UPDATE todos
          SET 
            title = COALESCE(${data.title}, title),
            completed = COALESCE(${data.completed}, completed),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `.pipe(
          Effect.map(([todo]) => todo),
          Effect.withSchema(Todo)
        ),
    }
  })
}
```

### 4. Create API Routes

Create `apps/api/src/routes/todos.ts`:

```typescript
import { Effect } from "effect"
import { api } from "@effect-kit/core"
import { TodoService } from "../services/TodoService"
import { Todo } from "@effect-kit/shared/schemas"

export const todosRouter = api.group("/todos", {
  middleware: [api.auth.required()],
  
  routes: {
    list: api.get("/")
      .handle(({ user }) =>
        Effect.gen(function* () {
          const todos = yield* TodoService
          return yield* todos.findByUser(user.id)
        })
      ),
      
    create: api.post("/")
      .body(Schema.Struct({
        title: Schema.String,
      }))
      .handle(({ body, user }) =>
        Effect.gen(function* () {
          const todos = yield* TodoService
          return yield* todos.create({
            title: body.title,
            userId: user.id,
          })
        })
      ),
      
    update: api.patch("/:id")
      .params(Schema.Struct({
        id: Schema.UUID,
      }))
      .body(Schema.Struct({
        title: Schema.optional(Schema.String),
        completed: Schema.optional(Schema.Boolean),
      }))
      .handle(({ params, body }) =>
        Effect.gen(function* () {
          const todos = yield* TodoService
          return yield* todos.update(params.id, body)
        })
      ),
  },
})
```

### 5. Add Frontend UI

Create `apps/web/src/routes/todos.tsx`:

```tsx
import { Effect } from "effect"
import { useQuery, useMutation } from "@effect-kit/react"
import { client } from "../lib/client"

export default function TodosPage() {
  const todos = useQuery(() => 
    client.todos.list()
  )
  
  const createTodo = useMutation((title: string) =>
    client.todos.create({ title })
  )
  
  const updateTodo = useMutation((id: string, completed: boolean) =>
    client.todos.update({ id }, { completed })
  )
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Todos</h1>
      
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const input = form.elements.namedItem("title") as HTMLInputElement
          createTodo.mutate(input.value)
          form.reset()
        }}
        className="mb-6"
      >
        <input
          name="title"
          type="text"
          placeholder="Add a new todo..."
          className="px-4 py-2 border rounded"
          required
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Todo
        </button>
      </form>
      
      <ul className="space-y-2">
        {todos.data?.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => 
                updateTodo.mutate(todo.id, e.target.checked)
              }
            />
            <span className={todo.completed ? "line-through" : ""}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## What's Next?

Congratulations! You've just built your first feature with Effect Kit. Here's what to explore next:

### 📚 Learn More

- [Project Structure](/fundamentals/project-structure) - Understand the architecture
- [Services & Layers](/fundamentals/services) - Deep dive into Effect patterns
- [Authentication](/features/auth/overview) - Customize auth flows
- [Database](/features/database/overview) - Advanced database features

### 🚀 Build More

- Add real-time updates with WebSockets
- Implement file uploads
- Create background jobs
- Add payment processing

### 🤝 Get Help

- [Discord Community](https://discord.gg/effectkit) - Ask questions
- [GitHub Discussions](https://github.com/effectkit/effectkit/discussions) - Share ideas
- [Stack Overflow](https://stackoverflow.com/questions/tagged/effect-kit) - Find answers

Happy building with Effect Kit! 🎉