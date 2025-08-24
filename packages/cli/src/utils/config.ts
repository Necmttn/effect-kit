import { cosmiconfig } from 'cosmiconfig'
import { z } from 'zod'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ConfigSchema = z.object({
  $schema: z.string().optional(),
  style: z.enum(['default', 'new-york']).default('default'),
  rsc: z.boolean().default(false),
  tsx: z.boolean().default(true),
  tailwind: z.object({
    config: z.string(),
    css: z.string(),
    baseColor: z.enum(['slate', 'gray', 'zinc', 'neutral', 'stone']).default('slate'),
    cssVariables: z.boolean().default(true),
    prefix: z.string().default(''),
  }),
  aliases: z.object({
    components: z.string(),
    utils: z.string(),
    ui: z.string().optional(),
    lib: z.string().optional(),
    hooks: z.string().optional(),
    services: z.string().optional(),
  }),
  registry: z.object({
    url: z.string().default('https://registry.effectkit.dev'),
    mirrors: z.array(z.string()).default([]),
  }),
  iconLibrary: z.enum(['lucide', 'radix', 'phosphor']).default('lucide'),
})

export type Config = z.infer<typeof ConfigSchema>

const explorer = cosmiconfig('effect-kit', {
  searchPlaces: [
    'effect-kit.config.json',
    'effect-kit.config.js',
    'effect-kit.config.ts',
    'components.json', // shadcn compatibility
  ],
})

export async function getConfig(cwd: string): Promise<Config | null> {
  const result = await explorer.search(cwd)
  
  if (!result) {
    return null
  }

  const config = ConfigSchema.parse(result.config)
  
  // Resolve paths relative to config file
  const configDir = path.dirname(result.filepath)
  
  return {
    ...config,
    tailwind: {
      ...config.tailwind,
      config: path.resolve(configDir, config.tailwind.config),
      css: path.resolve(configDir, config.tailwind.css),
    },
    aliases: {
      ...config.aliases,
      components: path.resolve(configDir, config.aliases.components),
      utils: path.resolve(configDir, config.aliases.utils),
      ...(config.aliases.ui && {
        ui: path.resolve(configDir, config.aliases.ui),
      }),
      ...(config.aliases.lib && {
        lib: path.resolve(configDir, config.aliases.lib),
      }),
      ...(config.aliases.hooks && {
        hooks: path.resolve(configDir, config.aliases.hooks),
      }),
      ...(config.aliases.services && {
        services: path.resolve(configDir, config.aliases.services),
      }),
    },
  }
}

export function getDefaultConfig(): Config {
  return {
    style: 'default',
    rsc: false,
    tsx: true,
    tailwind: {
      config: 'tailwind.config.js',
      css: 'src/styles/globals.css',
      baseColor: 'slate',
      cssVariables: true,
      prefix: '',
    },
    aliases: {
      components: 'src/components',
      utils: 'src/lib/utils',
      ui: 'src/components/ui',
      lib: 'src/lib',
      hooks: 'src/hooks',
      services: 'src/services',
    },
    registry: {
      url: 'https://registry.effectkit.dev',
      mirrors: [],
    },
    iconLibrary: 'lucide',
  }
}

export async function resolveConfigPaths(cwd: string, config: Config) {
  // Ensure all paths are absolute
  return {
    ...config,
    tailwind: {
      ...config.tailwind,
      config: path.resolve(cwd, config.tailwind.config),
      css: path.resolve(cwd, config.tailwind.css),
    },
    aliases: Object.fromEntries(
      Object.entries(config.aliases).map(([key, value]) => [
        key,
        path.resolve(cwd, value),
      ])
    ),
  }
}