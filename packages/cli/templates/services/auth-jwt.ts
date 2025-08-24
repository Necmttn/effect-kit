import { Effect, Context, Config, ConfigError } from "effect"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

// Configuration
const AuthConfig = Config.all({
  jwtSecret: Config.secret("JWT_SECRET"),
  jwtExpiresIn: Config.string("JWT_EXPIRES_IN").pipe(
    Config.withDefault("7d")
  ),
  bcryptRounds: Config.number("BCRYPT_ROUNDS").pipe(
    Config.withDefault(12)
  ),
})

// Types
export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

// Errors
export class AuthError extends ConfigError.ConfigError {
  readonly _tag = "AuthError"
  constructor(readonly message: string) {
    super()
  }
}

export class InvalidCredentialsError extends AuthError {
  readonly _tag = "InvalidCredentialsError"
  constructor() {
    super("Invalid email or password")
  }
}

export class UserNotFoundError extends AuthError {
  readonly _tag = "UserNotFoundError"
  constructor(readonly email: string) {
    super(`User with email ${email} not found`)
  }
}

export class TokenExpiredError extends AuthError {
  readonly _tag = "TokenExpiredError"
  constructor() {
    super("Token has expired")
  }
}

export class InvalidTokenError extends AuthError {
  readonly _tag = "InvalidTokenError"
  constructor() {
    super("Invalid or malformed token")
  }
}

// Service Interface
export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly login: (credentials: LoginCredentials) => Effect.Effect<
      { user: User; token: string },
      AuthError
    >
    readonly register: (data: RegisterData) => Effect.Effect<
      { user: User; token: string },
      AuthError
    >
    readonly verify: (token: string) => Effect.Effect<User, AuthError>
    readonly refresh: (token: string) => Effect.Effect<string, AuthError>
    readonly hashPassword: (password: string) => Effect.Effect<string, AuthError>
    readonly comparePassword: (
      password: string,
      hashedPassword: string
    ) => Effect.Effect<boolean, AuthError>
    readonly generateToken: (payload: JwtPayload) => Effect.Effect<string, AuthError>
  }
>() {
  
  static Live = Effect.gen(function* () {
    const config = yield* Config.config(AuthConfig)
    
    const hashPassword = (password: string) =>
      Effect.tryPromise({
        try: () => bcrypt.hash(password, config.bcryptRounds),
        catch: () => new AuthError("Failed to hash password"),
      })

    const comparePassword = (password: string, hashedPassword: string) =>
      Effect.tryPromise({
        try: () => bcrypt.compare(password, hashedPassword),
        catch: () => new AuthError("Failed to compare passwords"),
      })

    const generateToken = (payload: JwtPayload) =>
      Effect.try({
        try: () => jwt.sign(payload, config.jwtSecret.value, {
          expiresIn: config.jwtExpiresIn,
        }),
        catch: () => new AuthError("Failed to generate token"),
      })

    const verifyToken = (token: string): Effect.Effect<JwtPayload, AuthError> =>
      Effect.try({
        try: () => {
          const decoded = jwt.verify(token, config.jwtSecret.value)
          if (typeof decoded === "string") {
            throw new Error("Invalid token format")
          }
          return decoded as JwtPayload
        },
        catch: (error: any) => {
          if (error.name === "TokenExpiredError") {
            return new TokenExpiredError()
          }
          return new InvalidTokenError()
        },
      })

    return {
      login: (credentials) =>
        Effect.gen(function* () {
          // This would typically fetch user from database
          // For now, return a mock implementation
          const user: User = {
            id: "user-1",
            email: credentials.email,
            name: "John Doe",
            role: "user",
          }
          
          const token = yield* generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
          })
          
          return { user, token }
        }),

      register: (data) =>
        Effect.gen(function* () {
          const hashedPassword = yield* hashPassword(data.password)
          
          // This would typically save user to database
          const user: User = {
            id: `user-${Date.now()}`,
            email: data.email,
            name: data.name,
            role: "user",
          }
          
          const token = yield* generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
          })
          
          return { user, token }
        }),

      verify: (token) =>
        Effect.gen(function* () {
          const payload = yield* verifyToken(token)
          
          // This would typically fetch fresh user data from database
          const user: User = {
            id: payload.userId,
            email: payload.email,
            name: "John Doe", // Would be fetched from DB
            role: payload.role,
          }
          
          return user
        }),

      refresh: (token) =>
        Effect.gen(function* () {
          const payload = yield* verifyToken(token)
          
          // Generate new token with fresh expiration
          return yield* generateToken(payload)
        }),

      hashPassword,
      comparePassword,
      generateToken,
    }
  })
}