#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { addCommand } from './commands/add.js'
import { initCommand } from './commands/init.js'
import { listCommand } from './commands/list.js'
import { removeCommand } from './commands/remove.js'
import { updateCommand } from './commands/update.js'
import { diffCommand } from './commands/diff.js'

const program = new Command()

program
  .name('effect-kit')
  .description('CLI for building Effect.ts applications')
  .version('0.0.1')

program
  .command('init')
  .description('Initialize a new Effect Kit project')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-d, --dir <directory>', 'Directory to create project in')
  .action(initCommand)

program
  .command('add')
  .description('Add a service or component to your project')
  .argument('<components...>', 'Components to add')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('-o, --overwrite', 'Overwrite existing files')
  .option('-c, --cwd <cwd>', 'Working directory')
  .option('-p, --path <path>', 'Path to add component to')
  .action(addCommand)

program
  .command('remove')
  .alias('rm')
  .description('Remove a service or component from your project')
  .argument('<components...>', 'Components to remove')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(removeCommand)

program
  .command('list')
  .alias('ls')
  .description('List available services and components')
  .option('-a, --all', 'Show all components including installed')
  .option('-i, --installed', 'Show only installed components')
  .option('-r, --registry <registry>', 'Registry to list from')
  .action(listCommand)

program
  .command('update')
  .description('Update installed components')
  .argument('[components...]', 'Components to update (all if none specified)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(updateCommand)

program
  .command('diff')
  .description('Show diff between local and registry versions')
  .argument('<component>', 'Component to diff')
  .action(diffCommand)

// Handle unknown commands
program.on('command:*', () => {
  console.error(
    chalk.red(`Invalid command: ${program.args.join(' ')}`),
    '\n'
  )
  console.log('See --help for a list of available commands.')
  process.exit(1)
})

// Show help by default
if (!process.argv.slice(2).length) {
  program.outputHelp()
}

program.parse()