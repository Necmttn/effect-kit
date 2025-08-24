import { Effect, Console } from 'effect'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs-extra'

interface RemoveOptions {
  yes?: boolean
}

export async function removeCommand(components: string[], options: RemoveOptions) {
  const cwd = process.cwd()
  
  const program = Effect.gen(function* () {
    yield* Console.log('')
    yield* Console.log(chalk.bold('Removing components...'))
    yield* Console.log('')
    
    // Find installed component files
    const filesToRemove: string[] = []
    
    for (const component of components) {
      // Check common locations for component files
      const possiblePaths = [
        path.join(cwd, 'src', 'services', `${component}.ts`),
        path.join(cwd, 'src', 'services', `${component}Service.ts`),
        path.join(cwd, 'src', 'components', `${component}.tsx`),
        path.join(cwd, 'src', 'components', `${component}.ts`),
        path.join(cwd, 'src', 'lib', `${component}.ts`),
        path.join(cwd, 'src', 'hooks', `use${component}.ts`),
      ]
      
      for (const filePath of possiblePaths) {
        if (await fs.pathExists(filePath)) {
          filesToRemove.push(filePath)
        }
      }
    }
    
    if (filesToRemove.length === 0) {
      yield* Console.log(chalk.yellow('No component files found to remove.'))
      return
    }
    
    // Show what will be removed
    yield* Console.log(chalk.bold('The following files will be removed:'))
    yield* Console.log('')
    
    for (const file of filesToRemove) {
      const relativePath = path.relative(cwd, file)
      yield* Console.log(`  ${chalk.red('×')} ${relativePath}`)
    }
    
    yield* Console.log('')
    
    // Confirm removal if not using --yes
    if (!options.yes) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to remove these files?',
          default: false,
        },
      ])
      
      if (!confirm) {
        yield* Console.log('Removal cancelled.')
        return
      }
    }
    
    // Remove files
    const spinner = ora('Removing files...').start()
    
    try {
      for (const file of filesToRemove) {
        await fs.remove(file)
      }
      
      spinner.succeed('Components removed successfully')
      
      yield* Console.log('')
      yield* Console.log(chalk.green('✅ Components removed!'))
      yield* Console.log('')
      yield* Console.log(chalk.yellow('Note: You may need to:'))
      yield* Console.log('  • Remove unused dependencies manually')
      yield* Console.log('  • Update imports in other files')
      yield* Console.log('  • Clean up configuration files')
      
    } catch (error) {
      spinner.fail('Failed to remove some files')
      yield* Effect.fail(error)
    }
  })
  
  await Effect.runPromise(
    program.pipe(
      Effect.catchAll(error => 
        Effect.gen(function* () {
          yield* Console.error(chalk.red('Error:'), error)
          yield* Effect.succeed(process.exit(1))
        })
      )
    )
  )
}