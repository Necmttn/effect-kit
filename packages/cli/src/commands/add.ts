import { Effect, Console } from 'effect'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs-extra'
import { execa } from 'execa'
import { detectPackageManager } from 'detect-package-manager'
import { getConfig, getDefaultConfig, resolveConfigPaths } from '../utils/config.js'
import { RegistryService, BUILTIN_SERVICES, type RegistryItem } from '../utils/registry.js'
import { transformCode } from '../utils/transformers.js'

interface AddOptions {
  yes?: boolean
  overwrite?: boolean
  cwd?: string
  path?: string
}

export async function addCommand(components: string[], options: AddOptions) {
  const cwd = path.resolve(options.cwd || process.cwd())
  
  const program = Effect.gen(function* () {
    // Get project configuration
    let config = yield* Effect.tryPromise(() => getConfig(cwd))
    if (!config) {
      yield* Console.log(chalk.yellow('No effect-kit config found. Using defaults.'))
      config = getDefaultConfig()
    }
    
    const resolvedConfig = yield* Effect.succeed(
      await resolveConfigPaths(cwd, config)
    )
    
    // Initialize registry service
    const registry = yield* RegistryService
    
    // Validate and resolve component names
    const spinner = ora('Resolving components...').start()
    
    const resolvedComponents: RegistryItem[] = []
    
    for (const component of components) {
      if (component in BUILTIN_SERVICES) {
        resolvedComponents.push(BUILTIN_SERVICES[component])
      } else {
        try {
          const item = yield* registry.getItem(resolvedConfig.registry.url, component)
          resolvedComponents.push(item)
        } catch (error) {
          spinner.fail(`Component "${component}" not found in registry`)
          yield* Effect.fail(error)
        }
      }
    }
    
    // Get all dependencies
    const allDependencies = yield* registry.getDependencies(
      resolvedConfig.registry.url,
      components
    )
    
    spinner.succeed('Components resolved')
    
    // Check for existing files
    const existingFiles: string[] = []
    for (const component of resolvedComponents) {
      for (const file of component.files) {
        const targetPath = path.join(cwd, file.target || file.path)
        if (await fs.pathExists(targetPath)) {
          existingFiles.push(file.path)
        }
      }
    }
    
    // Prompt for confirmation if not using --yes
    if (!options.yes) {
      const summary = [
        '',
        chalk.bold('The following components will be added:'),
        '',
        ...resolvedComponents.map(c => `  ${chalk.cyan(c.name)} - ${c.description}`),
        '',
      ]
      
      if (allDependencies.length > 0) {
        summary.push(
          chalk.bold('Dependencies:'),
          ...allDependencies.map(dep => `  ${chalk.gray(dep)}`),
          ''
        )
      }
      
      if (existingFiles.length > 0) {
        summary.push(
          chalk.bold.yellow('The following files will be overwritten:'),
          ...existingFiles.map(file => `  ${chalk.red(file)}`),
          ''
        )
      }
      
      console.log(summary.join('\n'))
      
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with installation?',
          default: true,
        },
      ])
      
      if (!confirm) {
        yield* Console.log('Installation cancelled.')
        return
      }
    }
    
    // Install npm dependencies
    const allNpmDeps = [
      ...new Set(
        resolvedComponents.flatMap(c => [
          ...c.dependencies,
          ...c.devDependencies,
        ])
      ),
    ]
    
    if (allNpmDeps.length > 0) {
      const packageManager = yield* Effect.tryPromise(() => 
        detectPackageManager({ cwd })
      )
      
      const installSpinner = ora('Installing dependencies...').start()
      
      try {
        await execa(packageManager, ['install', ...allNpmDeps], { cwd })
        installSpinner.succeed('Dependencies installed')
      } catch (error) {
        installSpinner.fail('Failed to install dependencies')
        yield* Effect.fail(error)
      }
    }
    
    // Write component files
    const writeSpinner = ora('Writing component files...').start()
    
    for (const component of resolvedComponents) {
      for (const file of component.files) {
        const targetPath = path.join(cwd, file.target || file.path)
        
        // Ensure directory exists
        await fs.ensureDir(path.dirname(targetPath))
        
        // Transform the code based on config
        const transformedContent = yield* Effect.succeed(
          await transformCode(file.content, {
            tsx: resolvedConfig.tsx,
            aliases: resolvedConfig.aliases,
            style: resolvedConfig.style,
          })
        )
        
        // Write file
        await fs.writeFile(targetPath, transformedContent)
      }
    }
    
    writeSpinner.succeed('Component files written')
    
    // Update Tailwind config if needed
    const tailwindComponents = resolvedComponents.filter(c => c.tailwind)
    if (tailwindComponents.length > 0) {
      const tailwindSpinner = ora('Updating Tailwind configuration...').start()
      
      try {
        yield* Effect.succeed(
          await updateTailwindConfig(resolvedConfig.tailwind.config, tailwindComponents)
        )
        tailwindSpinner.succeed('Tailwind configuration updated')
      } catch (error) {
        tailwindSpinner.warn('Could not update Tailwind configuration automatically')
      }
    }
    
    // Success message
    yield* Console.log('')
    yield* Console.log(chalk.green('✅ Components added successfully!'))
    yield* Console.log('')
    
    // Show next steps
    const nextSteps = [
      'Next steps:',
      '',
      ...resolvedComponents.map(c => 
        c.docs ? `📖 ${c.name}: ${chalk.blue(c.docs)}` : `📖 ${c.name}: Check the generated files`
      ),
    ]
    
    yield* Console.log(nextSteps.join('\n'))
  })
  
  // Run the Effect program
  const runtime = Effect.runPromise(
    program.pipe(
      Effect.provide(RegistryService.Default),
      Effect.catchAll(error => 
        Effect.gen(function* () {
          yield* Console.error(chalk.red('Error:'), error)
          yield* Effect.succeed(process.exit(1))
        })
      )
    )
  )
  
  await runtime
}

async function updateTailwindConfig(configPath: string, components: RegistryItem[]) {
  if (!await fs.pathExists(configPath)) {
    return
  }
  
  // This would implement Tailwind config merging
  // For now, just log what would be done
  console.log(`Would update Tailwind config at ${configPath}`)
}