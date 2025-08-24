import { Effect, Context, Config, Layer } from "effect"
import * as Sql from "@effect/sql"
import * as Pg from "@effect/sql-pg"

// Configuration
const DatabaseConfig = Config.all({
  url: Config.string("DATABASE_URL"),
  poolSize: Config.number("DB_POOL_SIZE").pipe(
    Config.withDefault(10)
  ),
  connectionTimeout: Config.duration("DB_CONNECTION_TIMEOUT").pipe(
    Config.withDefault("30 seconds")
  ),
  idleTimeout: Config.duration("DB_IDLE_TIMEOUT").pipe(
    Config.withDefault("60 seconds")
  ),
})

// Database client setup
export const DatabaseLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* Config.config(DatabaseConfig)
    
    return Pg.layer({
      url: Config.succeed(config.url),
      poolSize: config.poolSize,
      connectionTimeoutMillis: config.connectionTimeout.value,
      idleTimeoutMillis: config.idleTimeout.value,
    })
  })
)

// Utility service for common database operations
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly transaction: <A, E>(
      effect: Effect.Effect<A, E, Sql.SqlClient>
    ) => Effect.Effect<A, E | Sql.SqlError>
    
    readonly query: <A>(
      sql: Sql.SqlFragment,
      transform?: (rows: readonly any[]) => A
    ) => Effect.Effect<A, Sql.SqlError>
    
    readonly queryOne: <A>(
      sql: Sql.SqlFragment,
      transform?: (row: any) => A
    ) => Effect.Effect<A, Sql.SqlError>
    
    readonly execute: (
      sql: Sql.SqlFragment
    ) => Effect.Effect<void, Sql.SqlError>
    
    readonly insert: <T>(
      table: string,
      data: T
    ) => Effect.Effect<T & { id: string }, Sql.SqlError>
    
    readonly update: <T>(
      table: string,
      id: string,
      data: Partial<T>
    ) => Effect.Effect<T, Sql.SqlError>
    
    readonly findById: <T>(
      table: string,
      id: string
    ) => Effect.Effect<T | null, Sql.SqlError>
    
    readonly findMany: <T>(
      table: string,
      where?: Record<string, any>,
      limit?: number,
      offset?: number
    ) => Effect.Effect<readonly T[], Sql.SqlError>
    
    readonly deleteById: (
      table: string,
      id: string
    ) => Effect.Effect<void, Sql.SqlError>
  }
>() {
  
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const sql = yield* Sql.SqlClient
      
      return {
        transaction: <A, E>(effect: Effect.Effect<A, E, Sql.SqlClient>) =>
          sql.withTransaction(effect),
        
        query: <A>(
          sqlFragment: Sql.SqlFragment,
          transform?: (rows: readonly any[]) => A
        ) =>
          Effect.gen(function* () {
            const result = yield* sql.query(sqlFragment)
            return transform ? transform(result.rows) : result.rows as A
          }),
        
        queryOne: <A>(
          sqlFragment: Sql.SqlFragment,
          transform?: (row: any) => A
        ) =>
          Effect.gen(function* () {
            const result = yield* sql.query(sqlFragment)
            const row = result.rows[0]
            if (!row) {
              yield* Effect.fail(new Sql.SqlError({ message: "No rows found" }))
            }
            return transform ? transform(row) : row as A
          }),
        
        execute: (sqlFragment: Sql.SqlFragment) =>
          Effect.gen(function* () {
            yield* sql.query(sqlFragment)
          }),
        
        insert: <T>(table: string, data: T) =>
          Effect.gen(function* () {
            const columns = Object.keys(data as any).join(", ")
            const placeholders = Object.keys(data as any).map((_, i) => `$${i + 1}`).join(", ")
            const values = Object.values(data as any)
            
            const result = yield* sql.query(
              Sql.fragment`
                INSERT INTO ${Sql.unsafe(table)} (${Sql.unsafe(columns)})
                VALUES (${Sql.join(values.map(v => Sql.param(v)), ", ")})
                RETURNING *
              `
            )
            
            return result.rows[0] as T & { id: string }
          }),
        
        update: <T>(table: string, id: string, data: Partial<T>) =>
          Effect.gen(function* () {
            const setClause = Object.keys(data as any)
              .map((key, i) => `${key} = $${i + 2}`)
              .join(", ")
            const values = Object.values(data as any)
            
            const result = yield* sql.query(
              Sql.fragment`
                UPDATE ${Sql.unsafe(table)}
                SET ${Sql.unsafe(setClause)}
                WHERE id = ${Sql.param(id)}
                RETURNING *
              `
            )
            
            const row = result.rows[0]
            if (!row) {
              yield* Effect.fail(new Sql.SqlError({ message: `Record with id ${id} not found` }))
            }
            
            return row as T
          }),
        
        findById: <T>(table: string, id: string) =>
          Effect.gen(function* () {
            const result = yield* sql.query(
              Sql.fragment`
                SELECT * FROM ${Sql.unsafe(table)}
                WHERE id = ${Sql.param(id)}
                LIMIT 1
              `
            )
            
            return result.rows[0] as T | null
          }),
        
        findMany: <T>(
          table: string,
          where?: Record<string, any>,
          limit?: number,
          offset?: number
        ) =>
          Effect.gen(function* () {
            let query = Sql.fragment`SELECT * FROM ${Sql.unsafe(table)}`
            
            if (where && Object.keys(where).length > 0) {
              const conditions = Object.entries(where)
                .map(([key, value]) => 
                  Sql.fragment`${Sql.unsafe(key)} = ${Sql.param(value)}`
                )
              
              query = Sql.fragment`${query} WHERE ${Sql.join(conditions, " AND ")}`
            }
            
            if (limit) {
              query = Sql.fragment`${query} LIMIT ${Sql.param(limit)}`
            }
            
            if (offset) {
              query = Sql.fragment`${query} OFFSET ${Sql.param(offset)}`
            }
            
            const result = yield* sql.query(query)
            return result.rows as readonly T[]
          }),
        
        deleteById: (table: string, id: string) =>
          Effect.gen(function* () {
            yield* sql.query(
              Sql.fragment`
                DELETE FROM ${Sql.unsafe(table)}
                WHERE id = ${Sql.param(id)}
              `
            )
          }),
      }
    })
  ).pipe(Layer.provide(DatabaseLive))
}