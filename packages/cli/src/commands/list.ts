import { Effect, Console } from 'effect'
import chalk from 'chalk'
import { getConfig, getDefaultConfig } from '../utils/config.js'
import { RegistryService, BUILTIN_SERVICES } from '../utils/registry.js'

interface ListOptions {
  all?: boolean
  installed?: boolean
  registry?: string
}

export async function listCommand(options: ListOptions) {
  const cwd = process.cwd()
  
  const program = Effect.gen(function* () {
    // Get project configuration
    let config = yield* Effect.tryPromise(() => getConfig(cwd))
    if (!config) {
      config = getDefaultConfig()
    }
    
    const registryUrl = options.registry || config.registry.url
    const registry = yield* RegistryService
    
    yield* Console.log('')
    yield* Console.log(chalk.bold('Available Services & Components'))
    yield* Console.log(chalk.gray(`Registry: ${registryUrl}`))
    yield* Console.log('')
    
    // Show built-in services
    yield* Console.log(chalk.bold.blue('Built-in Services:'))
    for (const [name, service] of Object.entries(BUILTIN_SERVICES)) {
      const status = options.installed ? 
        (await isInstalled(name, cwd) ? chalk.green('✓') : chalk.gray('○')) :
        chalk.blue('◆')
      
      yield* Console.log(`  ${status} ${chalk.cyan(name)} - ${service.description}`)
    }
    
    yield* Console.log('')
    
    // Fetch registry services
    try {
      const availableComponents = yield* registry.getIndex(registryUrl)
      
      if (availableComponents.length > 0) {
        yield* Console.log(chalk.bold.green('Registry Services:'))
        
        // Group by category
        const categorized: Record<string, Array<{ name: string; description: string }>> = {}
        
        for (const name of availableComponents) {
          try {
            const item = yield* registry.getItem(registryUrl, name)
            const category = item.category || 'Other'
            
            if (!categorized[category]) {
              categorized[category] = []
            }
            
            categorized[category].push({
              name: item.name,
              description: item.description,
            })
          } catch {
            // Skip items that fail to load
          }
        }
        
        // Display by category
        for (const [category, items] of Object.entries(categorized)) {
          yield* Console.log(`\n  ${chalk.bold.yellow(category)}:`)
          
          for (const item of items) {
            const status = options.installed ? 
              (await isInstalled(item.name, cwd) ? chalk.green('✓') : chalk.gray('○')) :
              chalk.green('◆')
            
            yield* Console.log(`    ${status} ${chalk.cyan(item.name)} - ${item.description}`)
          }
        }
      }
    } catch (error) {
      yield* Console.log(chalk.yellow('Could not fetch registry components'))
      yield* Console.log(chalk.gray(`Error: ${error}`))
    }
    
    yield* Console.log('')
    yield* Console.log(chalk.bold('Usage:'))
    yield* Console.log(`  ${chalk.cyan('effect-kit add <component>')} - Add a component`)
    yield* Console.log(`  ${chalk.cyan('effect-kit remove <component>')} - Remove a component`)
    yield* Console.log('')
    
    if (!options.installed) {
      yield* Console.log(chalk.gray('Use --installed to see only installed components'))
    }
  })
  
  // Run the Effect program
  await Effect.runPromise(
    program.pipe(
      Effect.provide(RegistryService.Default),
      Effect.catchAll(error => 
        Effect.gen(function* () {
          yield* Console.error(chalk.red('Error:'), error)
        })
      )
    )
  )
}

async function isInstalled(componentName: string, cwd: string): Promise<boolean> {
  // Check if component files exist
  // This would check the actual file system for installed components
  const fs = await import('fs-extra')
  const path = await import('path')
  
  // Common locations where components might be installed
  const possiblePaths = [
    path.join(cwd, 'src', 'services', `${componentName}.ts`),
    path.join(cwd, 'src', 'components', `${componentName}.tsx`),
    path.join(cwd, 'src', 'lib', `${componentName}.ts`),
  ]
  
  for (const filePath of possiblePaths) {
    if (await fs.pathExists(filePath)) {
      return true
    }
  }
  
  return false
}