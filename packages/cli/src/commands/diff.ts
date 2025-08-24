import { Effect, Console } from 'effect'
import chalk from 'chalk'

export async function diffCommand(component: string) {
  const program = Effect.gen(function* () {
    yield* Console.log('')
    yield* Console.log(chalk.bold('🚧 Diff functionality coming soon!'))
    yield* Console.log('')
    yield* Console.log(`This will show differences between your local ${component} and the registry version.`)
    yield* Console.log('')
    yield* Console.log('This feature will help you:')
    yield* Console.log('  • See what has changed in newer versions')
    yield* Console.log('  • Review your local modifications')
    yield* Console.log('  • Decide whether to update or keep local changes')
  })
  
  await Effect.runPromise(program)
}