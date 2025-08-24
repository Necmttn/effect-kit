import { Effect } from 'effect'
import Handlebars from 'handlebars'

export interface TransformOptions {
  tsx: boolean
  aliases: Record<string, string>
  style: 'default' | 'new-york'
  [key: string]: any
}

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b)
Handlebars.registerHelper('ne', (a, b) => a !== b)
Handlebars.registerHelper('or', (a, b) => a || b)
Handlebars.registerHelper('and', (a, b) => a && b)

export async function transformCode(
  content: string,
  options: TransformOptions
): Promise<string> {
  // Compile Handlebars template
  const template = Handlebars.compile(content)
  
  // Apply template with options
  const rendered = template(options)
  
  // Apply code transformations
  let transformed = rendered
  
  // Transform imports based on aliases
  for (const [alias, path] of Object.entries(options.aliases)) {
    const importRegex = new RegExp(`from ['"]@/${alias}(['"])`, 'g')
    const importPath = path.startsWith('/') ? path : `./${path}`
    transformed = transformed.replace(importRegex, `from '${importPath}$1`)
  }
  
  // Apply style-specific transformations
  if (options.style === 'new-york') {
    transformed = applyNewYorkStyle(transformed)
  }
  
  // Format the code
  transformed = await formatCode(transformed, options.tsx)
  
  return transformed
}

function applyNewYorkStyle(code: string): string {
  // Apply New York style transformations
  // This would include things like different class names, layouts, etc.
  return code
}

async function formatCode(code: string, tsx: boolean): Promise<string> {
  try {
    // Use prettier or similar formatter
    const { format } = await import('prettier')
    
    return format(code, {
      parser: tsx ? 'typescript' : 'babel',
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
      tabWidth: 2,
    })
  } catch {
    // If prettier is not available, return as-is
    return code
  }
}

// Template helpers for common Effect patterns
export const effectTemplates = {
  service: `
import { Effect, Context } from "effect"
{{#if imports}}
{{#each imports}}
import { {{this.name}} } from "{{this.path}}"
{{/each}}
{{/if}}

export class {{serviceName}} extends Context.Tag("{{serviceName}}")<
  {{serviceName}},
  {
    {{#each methods}}
    {{this.name}}: {{this.signature}}
    {{/each}}
  }
>() {
  static Live = Effect.gen(function* () {
    {{#if dependencies}}
    {{#each dependencies}}
    const {{this.name}} = yield* {{this.service}}
    {{/each}}
    {{/if}}
    
    return {
      {{#each methods}}
      {{this.name}}: {{this.implementation}},
      {{/each}}
    }
  })
}
`,

  component: `
{{#if tsx}}
import React from 'react'
{{/if}}
{{#if hasProps}}
import { {{propsType}} } from './types'
{{/if}}
{{#if hasUtils}}
import { cn } from '@/lib/utils'
{{/if}}

{{#if tsx}}
export function {{componentName}}({{#if hasProps}}props: {{propsType}}{{/if}}) {
{{else}}
export function {{componentName}}({{#if hasProps}}props{{/if}}) {
{{/if}}
  return (
    {{componentJsx}}
  )
}
`,

  hook: `
import { Effect, {{#each effectImports}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } from 'effect'
{{#if reactImports}}
import { {{#each reactImports}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } from 'react'
{{/if}}

export function {{hookName}}({{#if params}}{{params}}{{/if}}) {
  {{hookImplementation}}
}
`,
}

export function generateFromTemplate(
  templateName: keyof typeof effectTemplates,
  data: Record<string, any>
): string {
  const template = Handlebars.compile(effectTemplates[templateName])
  return template(data)
}