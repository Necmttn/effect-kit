import { z } from 'zod'
import fetch from 'node-fetch'
import { Effect, Schema } from 'effect'

// Registry schemas
export const RegistryItemSchema = z.object({
  name: z.string(),
  type: z.enum(['service', 'component', 'hook', 'utility']),
  description: z.string(),
  dependencies: z.array(z.string()).default([]),
  devDependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.enum(['registry:component', 'registry:ui', 'registry:service', 'registry:hook']),
    target: z.string().optional(),
  })),
  tailwind: z.object({
    config: z.object({
      content: z.array(z.string()).optional(),
      theme: z.record(z.any()).optional(),
      plugins: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
  cssVars: z.record(z.string()).optional(),
  docs: z.string().optional(),
  source: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  chunks: z.array(z.object({
    name: z.string(),
    code: z.string(),
  })).optional(),
})

export const RegistrySchema = z.object({
  name: z.string(),
  type: z.enum(['registry:ui', 'registry:service', 'registry:hook']),
  dependencies: z.array(z.string()),
  devDependencies: z.array(z.string()),
  registryDependencies: z.array(z.string()),
  files: z.array(RegistryItemSchema),
  tailwind: z.object({
    config: z.object({
      content: z.array(z.string()),
      theme: z.record(z.any()),
      plugins: z.array(z.string()),
    }),
  }).optional(),
  cssVars: z.record(z.string()).optional(),
  docs: z.string().optional(),
})

export type RegistryItem = z.infer<typeof RegistryItemSchema>
export type Registry = z.infer<typeof RegistrySchema>

// Effect services for registry operations
export class RegistryService extends Effect.Service<RegistryService>()('RegistryService', {
  effect: Effect.gen(function* () {
    return {
      // Fetch available components from registry
      getIndex: (registryUrl: string) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(`${registryUrl}/index.json`)
            if (!response.ok) {
              throw new Error(`Failed to fetch registry index: ${response.statusText}`)
            }
            const data = await response.json()
            return z.array(z.string()).parse(data)
          },
          catch: (error) => new Error(`Registry fetch failed: ${error}`),
        }),

      // Fetch a specific component
      getItem: (registryUrl: string, name: string) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(`${registryUrl}/${name}.json`)
            if (!response.ok) {
              throw new Error(`Failed to fetch component ${name}: ${response.statusText}`)
            }
            const data = await response.json()
            return RegistryItemSchema.parse(data)
          },
          catch: (error) => new Error(`Component fetch failed: ${error}`),
        }),

      // Search components
      search: (registryUrl: string, query: string) =>
        Effect.gen(function* () {
          const index = yield* this.getIndex(registryUrl)
          const filtered = index.filter(name => 
            name.toLowerCase().includes(query.toLowerCase())
          )
          
          // Fetch details for filtered items
          const items = yield* Effect.all(
            filtered.map(name => this.getItem(registryUrl, name)),
            { concurrency: 5 }
          )
          
          return items
        }),

      // Get component dependencies
      getDependencies: (registryUrl: string, names: string[]) =>
        Effect.gen(function* () {
          const allDeps = new Set<string>()
          const visited = new Set<string>()
          
          const collectDeps = (name: string): Effect.Effect<void> =>
            Effect.gen(function* () {
              if (visited.has(name)) return
              visited.add(name)
              
              const item = yield* this.getItem(registryUrl, name)
              
              // Add registry dependencies
              item.registryDependencies.forEach(dep => allDeps.add(dep))
              
              // Recursively collect dependencies
              yield* Effect.forEach(
                item.registryDependencies,
                collectDeps,
                { concurrency: 3 }
              )
            })
          
          yield* Effect.forEach(names, collectDeps, { concurrency: 3 })
          
          return Array.from(allDeps)
        }),
    }
  }),
}) {}

// Built-in registry items for core services
export const BUILTIN_SERVICES = {
  'auth-jwt': {
    name: 'auth-jwt',
    type: 'service' as const,
    description: 'JWT-based authentication service',
    dependencies: ['jsonwebtoken', '@types/jsonwebtoken'],
    files: [
      {
        path: 'src/services/AuthService.ts',
        content: '', // Will be populated from templates
        type: 'registry:service' as const,
      },
    ],
  },
  'database-postgres': {
    name: 'database-postgres',
    type: 'service' as const,
    description: 'PostgreSQL database service with Effect SQL',
    dependencies: ['@effect/sql-pg', 'pg'],
    devDependencies: ['@types/pg'],
    files: [
      {
        path: 'src/services/DatabaseService.ts',
        content: '',
        type: 'registry:service' as const,
      },
    ],
  },
  'cache-redis': {
    name: 'cache-redis',
    type: 'service' as const,
    description: 'Redis caching service',
    dependencies: ['redis'],
    files: [
      {
        path: 'src/services/CacheService.ts',
        content: '',
        type: 'registry:service' as const,
      },
    ],
  },
} satisfies Record<string, RegistryItem>

// Registry URL patterns
export const REGISTRY_URLS = {
  official: 'https://registry.effectkit.dev',
  github: (repo: string) => `https://raw.githubusercontent.com/${repo}/main/registry`,
  local: (path: string) => `file://${path}`,
} as const