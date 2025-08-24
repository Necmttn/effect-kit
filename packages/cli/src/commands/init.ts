import { Effect, Console } from 'effect'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs-extra'
import { execa } from 'execa'
import { detectPackageManager } from 'detect-package-manager'

interface InitOptions {
  template?: string
  dir?: string
}

const TEMPLATES = {
  basic: {
    name: 'Basic',
    description: 'Minimal Effect Kit setup with essential services',
    dependencies: [
      'effect',
      '@effect/platform',
      '@effect/platform-node',
      '@effect/sql',
    ],
    devDependencies: [
      'typescript',
      '@types/node',
      'tsx',
    ],
    services: ['database-postgres'],
  },
  fullstack: {
    name: 'Full-stack',
    description: 'Complete full-stack setup with auth, database, and frontend',
    dependencies: [
      'effect',
      '@effect/platform',
      '@effect/platform-node',
      '@effect/sql',
      '@effect/sql-pg',
      '@tanstack/react-router',
      '@tanstack/start',
      'react',
      'react-dom',
    ],
    devDependencies: [
      'typescript',
      '@types/node',
      '@types/react',
      '@types/react-dom',
      'tsx',
      'vite',
    ],
    services: ['auth-jwt', 'database-postgres'],
  },
  api: {
    name: 'API Only',
    description: 'Backend API with database and authentication',
    dependencies: [
      'effect',
      '@effect/platform',
      '@effect/platform-node',
      '@effect/sql',
      '@effect/sql-pg',
    ],
    devDependencies: [
      'typescript',
      '@types/node',
      'tsx',
    ],
    services: ['auth-jwt', 'database-postgres', 'cache-redis'],
  },
}

export async function initCommand(options: InitOptions) {
  const program = Effect.gen(function* () {
    yield* Console.log('')
    yield* Console.log(chalk.bold.blue('🚀 Effect Kit Project Setup'))
    yield* Console.log('')
    
    // Prompt for project details
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is your project name?',
        default: options.dir || 'my-effect-app',
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required'
          if (!/^[a-z0-9-_]+$/i.test(input)) return 'Project name must be alphanumeric'
          return true
        },
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        default: options.template || 'basic',
        choices: Object.entries(TEMPLATES).map(([key, template]) => ({
          name: `${template.name} - ${template.description}`,
          value: key,
        })),
      },
      {
        type: 'list',
        name: 'packageManager',
        message: 'Which package manager?',
        choices: ['bun', 'npm', 'pnpm', 'yarn'],
        default: 'bun',
      },
      {
        type: 'confirm',
        name: 'git',
        message: 'Initialize git repository?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'install',
        message: 'Install dependencies?',
        default: true,
      },
    ])
    
    const template = TEMPLATES[answers.template as keyof typeof TEMPLATES]
    const projectPath = path.resolve(answers.projectName)
    
    // Check if directory exists
    if (await fs.pathExists(projectPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${answers.projectName} already exists. Overwrite?`,
          default: false,
        },
      ])
      
      if (!overwrite) {
        yield* Console.log('Setup cancelled.')
        return
      }
      
      await fs.remove(projectPath)
    }
    
    // Create project directory
    const setupSpinner = ora('Creating project structure...').start()
    
    await fs.ensureDir(projectPath)
    
    // Create basic project structure
    const structure = [
      'src',
      'src/services',
      'src/lib',
      'src/types',
      'tests',
    ]
    
    for (const dir of structure) {
      await fs.ensureDir(path.join(projectPath, dir))
    }
    
    // Create package.json
    const packageJson = {
      name: answers.projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        test: 'vitest',
        typecheck: 'tsc --noEmit',
      },
      dependencies: Object.fromEntries(
        template.dependencies.map(dep => [dep, 'latest'])
      ),
      devDependencies: Object.fromEntries(
        template.devDependencies.map(dep => [dep, 'latest'])
      ),
    }
    
    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 })
    
    // Create TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022', 'DOM'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        declaration: true,
        outDir: './dist',
        rootDir: './src',
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }
    
    await fs.writeJSON(path.join(projectPath, 'tsconfig.json'), tsConfig, { spaces: 2 })
    
    // Create effect-kit config
    const effectKitConfig = {
      $schema: 'https://effectkit.dev/schema.json',
      style: 'default',
      rsc: false,
      tsx: true,
      tailwind: {
        config: 'tailwind.config.js',
        css: 'src/styles/globals.css',
        baseColor: 'slate',
        cssVariables: true,
      },
      aliases: {
        components: 'src/components',
        utils: 'src/lib/utils',
        ui: 'src/components/ui',
        lib: 'src/lib',
        hooks: 'src/hooks',
        services: 'src/services',
      },
    }
    
    await fs.writeJSON(path.join(projectPath, 'effect-kit.config.json'), effectKitConfig, { spaces: 2 })
    
    // Create basic files
    const indexTs = `import { Effect, Console } from "effect"

const program = Effect.gen(function* () {
  yield* Console.log("🚀 Effect Kit app started!")
})

Effect.runPromise(program)
`
    
    await fs.writeFile(path.join(projectPath, 'src', 'index.ts'), indexTs)
    
    // Create environment example
    const envExample = `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/effectkit

# Authentication (if using auth services)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Redis (if using cache services)
REDIS_URL=redis://localhost:6379
`
    
    await fs.writeFile(path.join(projectPath, '.env.example'), envExample)
    
    // Create .gitignore
    const gitignore = `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
Thumbs.db
`
    
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore)
    
    setupSpinner.succeed('Project structure created')
    
    // Initialize git if requested
    if (answers.git) {
      const gitSpinner = ora('Initializing git repository...').start()
      try {
        await execa('git', ['init'], { cwd: projectPath })
        await execa('git', ['add', '.'], { cwd: projectPath })
        await execa('git', ['commit', '-m', 'Initial commit'], { cwd: projectPath })
        gitSpinner.succeed('Git repository initialized')
      } catch {
        gitSpinner.warn('Could not initialize git repository')
      }
    }
    
    // Install dependencies if requested
    if (answers.install) {
      const installSpinner = ora('Installing dependencies...').start()
      try {
        await execa(answers.packageManager, ['install'], { cwd: projectPath })
        installSpinner.succeed('Dependencies installed')
      } catch (error) {
        installSpinner.fail('Failed to install dependencies')
        yield* Console.log(chalk.yellow('You can install them manually by running:'))
        yield* Console.log(chalk.cyan(`  cd ${answers.projectName}`))
        yield* Console.log(chalk.cyan(`  ${answers.packageManager} install`))
      }
    }
    
    yield* Console.log('')
    yield* Console.log(chalk.green('✅ Project created successfully!'))
    yield* Console.log('')
    yield* Console.log(chalk.bold('Next steps:'))
    yield* Console.log(`  ${chalk.cyan(`cd ${answers.projectName}`)}`)
    
    if (!answers.install) {
      yield* Console.log(`  ${chalk.cyan(`${answers.packageManager} install`)}`)
    }
    
    if (template.services.length > 0) {
      yield* Console.log(`  ${chalk.cyan(`effect-kit add ${template.services.join(' ')}`)}`)
    }
    
    yield* Console.log(`  ${chalk.cyan(`${answers.packageManager} dev`)}`)
    yield* Console.log('')
    yield* Console.log(`📖 Documentation: ${chalk.blue('https://effectkit.dev')}`)
    yield* Console.log(`💬 Community: ${chalk.blue('https://discord.gg/effectkit')}`)
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