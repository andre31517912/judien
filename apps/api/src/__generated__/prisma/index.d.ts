
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Event
 * 
 */
export type Event = $Result.DefaultSelection<Prisma.$EventPayload>
/**
 * Model RSVP
 * 
 */
export type RSVP = $Result.DefaultSelection<Prisma.$RSVPPayload>
/**
 * Model Comment
 * 
 */
export type Comment = $Result.DefaultSelection<Prisma.$CommentPayload>
/**
 * Model ReminderRule
 * 
 */
export type ReminderRule = $Result.DefaultSelection<Prisma.$ReminderRulePayload>
/**
 * Model MessageLog
 * 
 */
export type MessageLog = $Result.DefaultSelection<Prisma.$MessageLogPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const Role: {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

export type Role = (typeof Role)[keyof typeof Role]


export const RSVPStatus: {
  GOING: 'GOING',
  MAYBE: 'MAYBE',
  NO: 'NO'
};

export type RSVPStatus = (typeof RSVPStatus)[keyof typeof RSVPStatus]


export const MessageChannel: {
  SMS: 'SMS',
  EMAIL: 'EMAIL'
};

export type MessageChannel = (typeof MessageChannel)[keyof typeof MessageChannel]


export const MessageStatus: {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus]

}

export type Role = $Enums.Role

export const Role: typeof $Enums.Role

export type RSVPStatus = $Enums.RSVPStatus

export const RSVPStatus: typeof $Enums.RSVPStatus

export type MessageChannel = $Enums.MessageChannel

export const MessageChannel: typeof $Enums.MessageChannel

export type MessageStatus = $Enums.MessageStatus

export const MessageStatus: typeof $Enums.MessageStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.event`: Exposes CRUD operations for the **Event** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Events
    * const events = await prisma.event.findMany()
    * ```
    */
  get event(): Prisma.EventDelegate<ExtArgs>;

  /**
   * `prisma.rSVP`: Exposes CRUD operations for the **RSVP** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RSVPS
    * const rSVPS = await prisma.rSVP.findMany()
    * ```
    */
  get rSVP(): Prisma.RSVPDelegate<ExtArgs>;

  /**
   * `prisma.comment`: Exposes CRUD operations for the **Comment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Comments
    * const comments = await prisma.comment.findMany()
    * ```
    */
  get comment(): Prisma.CommentDelegate<ExtArgs>;

  /**
   * `prisma.reminderRule`: Exposes CRUD operations for the **ReminderRule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ReminderRules
    * const reminderRules = await prisma.reminderRule.findMany()
    * ```
    */
  get reminderRule(): Prisma.ReminderRuleDelegate<ExtArgs>;

  /**
   * `prisma.messageLog`: Exposes CRUD operations for the **MessageLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MessageLogs
    * const messageLogs = await prisma.messageLog.findMany()
    * ```
    */
  get messageLog(): Prisma.MessageLogDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Event: 'Event',
    RSVP: 'RSVP',
    Comment: 'Comment',
    ReminderRule: 'ReminderRule',
    MessageLog: 'MessageLog'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "user" | "event" | "rSVP" | "comment" | "reminderRule" | "messageLog"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Event: {
        payload: Prisma.$EventPayload<ExtArgs>
        fields: Prisma.EventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          findFirst: {
            args: Prisma.EventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          findMany: {
            args: Prisma.EventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>[]
          }
          create: {
            args: Prisma.EventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          createMany: {
            args: Prisma.EventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>[]
          }
          delete: {
            args: Prisma.EventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          update: {
            args: Prisma.EventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          deleteMany: {
            args: Prisma.EventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.EventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EventPayload>
          }
          aggregate: {
            args: Prisma.EventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEvent>
          }
          groupBy: {
            args: Prisma.EventGroupByArgs<ExtArgs>
            result: $Utils.Optional<EventGroupByOutputType>[]
          }
          count: {
            args: Prisma.EventCountArgs<ExtArgs>
            result: $Utils.Optional<EventCountAggregateOutputType> | number
          }
        }
      }
      RSVP: {
        payload: Prisma.$RSVPPayload<ExtArgs>
        fields: Prisma.RSVPFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RSVPFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RSVPFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          findFirst: {
            args: Prisma.RSVPFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RSVPFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          findMany: {
            args: Prisma.RSVPFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>[]
          }
          create: {
            args: Prisma.RSVPCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          createMany: {
            args: Prisma.RSVPCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RSVPCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>[]
          }
          delete: {
            args: Prisma.RSVPDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          update: {
            args: Prisma.RSVPUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          deleteMany: {
            args: Prisma.RSVPDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RSVPUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RSVPUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RSVPPayload>
          }
          aggregate: {
            args: Prisma.RSVPAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRSVP>
          }
          groupBy: {
            args: Prisma.RSVPGroupByArgs<ExtArgs>
            result: $Utils.Optional<RSVPGroupByOutputType>[]
          }
          count: {
            args: Prisma.RSVPCountArgs<ExtArgs>
            result: $Utils.Optional<RSVPCountAggregateOutputType> | number
          }
        }
      }
      Comment: {
        payload: Prisma.$CommentPayload<ExtArgs>
        fields: Prisma.CommentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CommentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CommentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          findFirst: {
            args: Prisma.CommentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CommentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          findMany: {
            args: Prisma.CommentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>[]
          }
          create: {
            args: Prisma.CommentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          createMany: {
            args: Prisma.CommentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CommentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>[]
          }
          delete: {
            args: Prisma.CommentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          update: {
            args: Prisma.CommentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          deleteMany: {
            args: Prisma.CommentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CommentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CommentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CommentPayload>
          }
          aggregate: {
            args: Prisma.CommentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateComment>
          }
          groupBy: {
            args: Prisma.CommentGroupByArgs<ExtArgs>
            result: $Utils.Optional<CommentGroupByOutputType>[]
          }
          count: {
            args: Prisma.CommentCountArgs<ExtArgs>
            result: $Utils.Optional<CommentCountAggregateOutputType> | number
          }
        }
      }
      ReminderRule: {
        payload: Prisma.$ReminderRulePayload<ExtArgs>
        fields: Prisma.ReminderRuleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ReminderRuleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ReminderRuleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          findFirst: {
            args: Prisma.ReminderRuleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ReminderRuleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          findMany: {
            args: Prisma.ReminderRuleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>[]
          }
          create: {
            args: Prisma.ReminderRuleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          createMany: {
            args: Prisma.ReminderRuleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ReminderRuleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>[]
          }
          delete: {
            args: Prisma.ReminderRuleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          update: {
            args: Prisma.ReminderRuleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          deleteMany: {
            args: Prisma.ReminderRuleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ReminderRuleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ReminderRuleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ReminderRulePayload>
          }
          aggregate: {
            args: Prisma.ReminderRuleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateReminderRule>
          }
          groupBy: {
            args: Prisma.ReminderRuleGroupByArgs<ExtArgs>
            result: $Utils.Optional<ReminderRuleGroupByOutputType>[]
          }
          count: {
            args: Prisma.ReminderRuleCountArgs<ExtArgs>
            result: $Utils.Optional<ReminderRuleCountAggregateOutputType> | number
          }
        }
      }
      MessageLog: {
        payload: Prisma.$MessageLogPayload<ExtArgs>
        fields: Prisma.MessageLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MessageLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MessageLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          findFirst: {
            args: Prisma.MessageLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MessageLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          findMany: {
            args: Prisma.MessageLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>[]
          }
          create: {
            args: Prisma.MessageLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          createMany: {
            args: Prisma.MessageLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MessageLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>[]
          }
          delete: {
            args: Prisma.MessageLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          update: {
            args: Prisma.MessageLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          deleteMany: {
            args: Prisma.MessageLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MessageLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MessageLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageLogPayload>
          }
          aggregate: {
            args: Prisma.MessageLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMessageLog>
          }
          groupBy: {
            args: Prisma.MessageLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<MessageLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.MessageLogCountArgs<ExtArgs>
            result: $Utils.Optional<MessageLogCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    events: number
    rsvps: number
    comments: number
    messageLogs: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    events?: boolean | UserCountOutputTypeCountEventsArgs
    rsvps?: boolean | UserCountOutputTypeCountRsvpsArgs
    comments?: boolean | UserCountOutputTypeCountCommentsArgs
    messageLogs?: boolean | UserCountOutputTypeCountMessageLogsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EventWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountRsvpsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RSVPWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCommentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommentWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountMessageLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageLogWhereInput
  }


  /**
   * Count Type EventCountOutputType
   */

  export type EventCountOutputType = {
    rsvps: number
    comments: number
    reminderRules: number
    messageLogs: number
  }

  export type EventCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    rsvps?: boolean | EventCountOutputTypeCountRsvpsArgs
    comments?: boolean | EventCountOutputTypeCountCommentsArgs
    reminderRules?: boolean | EventCountOutputTypeCountReminderRulesArgs
    messageLogs?: boolean | EventCountOutputTypeCountMessageLogsArgs
  }

  // Custom InputTypes
  /**
   * EventCountOutputType without action
   */
  export type EventCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EventCountOutputType
     */
    select?: EventCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EventCountOutputType without action
   */
  export type EventCountOutputTypeCountRsvpsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RSVPWhereInput
  }

  /**
   * EventCountOutputType without action
   */
  export type EventCountOutputTypeCountCommentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommentWhereInput
  }

  /**
   * EventCountOutputType without action
   */
  export type EventCountOutputTypeCountReminderRulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReminderRuleWhereInput
  }

  /**
   * EventCountOutputType without action
   */
  export type EventCountOutputTypeCountMessageLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageLogWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    phoneE164: string | null
    displayName: string | null
    preferredLanguage: string | null
    role: $Enums.Role | null
    notificationsMuted: boolean | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    phoneE164: string | null
    displayName: string | null
    preferredLanguage: string | null
    role: $Enums.Role | null
    notificationsMuted: boolean | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    passwordHash: number
    phoneE164: number
    displayName: number
    preferredLanguage: number
    role: number
    notificationsMuted: number
    createdAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    phoneE164?: true
    displayName?: true
    preferredLanguage?: true
    role?: true
    notificationsMuted?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    phoneE164?: true
    displayName?: true
    preferredLanguage?: true
    role?: true
    notificationsMuted?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    phoneE164?: true
    displayName?: true
    preferredLanguage?: true
    role?: true
    notificationsMuted?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName: string | null
    preferredLanguage: string
    role: $Enums.Role
    notificationsMuted: boolean
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    phoneE164?: boolean
    displayName?: boolean
    preferredLanguage?: boolean
    role?: boolean
    notificationsMuted?: boolean
    createdAt?: boolean
    events?: boolean | User$eventsArgs<ExtArgs>
    rsvps?: boolean | User$rsvpsArgs<ExtArgs>
    comments?: boolean | User$commentsArgs<ExtArgs>
    messageLogs?: boolean | User$messageLogsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    phoneE164?: boolean
    displayName?: boolean
    preferredLanguage?: boolean
    role?: boolean
    notificationsMuted?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    phoneE164?: boolean
    displayName?: boolean
    preferredLanguage?: boolean
    role?: boolean
    notificationsMuted?: boolean
    createdAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    events?: boolean | User$eventsArgs<ExtArgs>
    rsvps?: boolean | User$rsvpsArgs<ExtArgs>
    comments?: boolean | User$commentsArgs<ExtArgs>
    messageLogs?: boolean | User$messageLogsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      events: Prisma.$EventPayload<ExtArgs>[]
      rsvps: Prisma.$RSVPPayload<ExtArgs>[]
      comments: Prisma.$CommentPayload<ExtArgs>[]
      messageLogs: Prisma.$MessageLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      passwordHash: string
      phoneE164: string
      displayName: string | null
      preferredLanguage: string
      role: $Enums.Role
      notificationsMuted: boolean
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    events<T extends User$eventsArgs<ExtArgs> = {}>(args?: Subset<T, User$eventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findMany"> | Null>
    rsvps<T extends User$rsvpsArgs<ExtArgs> = {}>(args?: Subset<T, User$rsvpsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findMany"> | Null>
    comments<T extends User$commentsArgs<ExtArgs> = {}>(args?: Subset<T, User$commentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany"> | Null>
    messageLogs<T extends User$messageLogsArgs<ExtArgs> = {}>(args?: Subset<T, User$messageLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly phoneE164: FieldRef<"User", 'String'>
    readonly displayName: FieldRef<"User", 'String'>
    readonly preferredLanguage: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'Role'>
    readonly notificationsMuted: FieldRef<"User", 'Boolean'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.events
   */
  export type User$eventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    where?: EventWhereInput
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    cursor?: EventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * User.rsvps
   */
  export type User$rsvpsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    where?: RSVPWhereInput
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    cursor?: RSVPWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RSVPScalarFieldEnum | RSVPScalarFieldEnum[]
  }

  /**
   * User.comments
   */
  export type User$commentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    where?: CommentWhereInput
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    cursor?: CommentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommentScalarFieldEnum | CommentScalarFieldEnum[]
  }

  /**
   * User.messageLogs
   */
  export type User$messageLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    where?: MessageLogWhereInput
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    cursor?: MessageLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageLogScalarFieldEnum | MessageLogScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Event
   */

  export type AggregateEvent = {
    _count: EventCountAggregateOutputType | null
    _avg: EventAvgAggregateOutputType | null
    _sum: EventSumAggregateOutputType | null
    _min: EventMinAggregateOutputType | null
    _max: EventMaxAggregateOutputType | null
  }

  export type EventAvgAggregateOutputType = {
    feeAmount: Decimal | null
  }

  export type EventSumAggregateOutputType = {
    feeAmount: Decimal | null
  }

  export type EventMinAggregateOutputType = {
    id: string | null
    createdById: string | null
    coverImageUrl: string | null
    title_en: string | null
    title_zh: string | null
    description_en: string | null
    description_zh: string | null
    location_en: string | null
    location_zh: string | null
    startAt: Date | null
    endAt: Date | null
    timezone: string | null
    feeAmount: Decimal | null
    feeCurrency: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EventMaxAggregateOutputType = {
    id: string | null
    createdById: string | null
    coverImageUrl: string | null
    title_en: string | null
    title_zh: string | null
    description_en: string | null
    description_zh: string | null
    location_en: string | null
    location_zh: string | null
    startAt: Date | null
    endAt: Date | null
    timezone: string | null
    feeAmount: Decimal | null
    feeCurrency: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EventCountAggregateOutputType = {
    id: number
    createdById: number
    coverImageUrl: number
    title_en: number
    title_zh: number
    description_en: number
    description_zh: number
    location_en: number
    location_zh: number
    startAt: number
    endAt: number
    timezone: number
    feeAmount: number
    feeCurrency: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type EventAvgAggregateInputType = {
    feeAmount?: true
  }

  export type EventSumAggregateInputType = {
    feeAmount?: true
  }

  export type EventMinAggregateInputType = {
    id?: true
    createdById?: true
    coverImageUrl?: true
    title_en?: true
    title_zh?: true
    description_en?: true
    description_zh?: true
    location_en?: true
    location_zh?: true
    startAt?: true
    endAt?: true
    timezone?: true
    feeAmount?: true
    feeCurrency?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EventMaxAggregateInputType = {
    id?: true
    createdById?: true
    coverImageUrl?: true
    title_en?: true
    title_zh?: true
    description_en?: true
    description_zh?: true
    location_en?: true
    location_zh?: true
    startAt?: true
    endAt?: true
    timezone?: true
    feeAmount?: true
    feeCurrency?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EventCountAggregateInputType = {
    id?: true
    createdById?: true
    coverImageUrl?: true
    title_en?: true
    title_zh?: true
    description_en?: true
    description_zh?: true
    location_en?: true
    location_zh?: true
    startAt?: true
    endAt?: true
    timezone?: true
    feeAmount?: true
    feeCurrency?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type EventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Event to aggregate.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Events
    **/
    _count?: true | EventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EventMaxAggregateInputType
  }

  export type GetEventAggregateType<T extends EventAggregateArgs> = {
        [P in keyof T & keyof AggregateEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEvent[P]>
      : GetScalarType<T[P], AggregateEvent[P]>
  }




  export type EventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EventWhereInput
    orderBy?: EventOrderByWithAggregationInput | EventOrderByWithAggregationInput[]
    by: EventScalarFieldEnum[] | EventScalarFieldEnum
    having?: EventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EventCountAggregateInputType | true
    _avg?: EventAvgAggregateInputType
    _sum?: EventSumAggregateInputType
    _min?: EventMinAggregateInputType
    _max?: EventMaxAggregateInputType
  }

  export type EventGroupByOutputType = {
    id: string
    createdById: string
    coverImageUrl: string | null
    title_en: string
    title_zh: string
    description_en: string
    description_zh: string
    location_en: string
    location_zh: string
    startAt: Date
    endAt: Date | null
    timezone: string
    feeAmount: Decimal | null
    feeCurrency: string
    createdAt: Date
    updatedAt: Date
    _count: EventCountAggregateOutputType | null
    _avg: EventAvgAggregateOutputType | null
    _sum: EventSumAggregateOutputType | null
    _min: EventMinAggregateOutputType | null
    _max: EventMaxAggregateOutputType | null
  }

  type GetEventGroupByPayload<T extends EventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EventGroupByOutputType[P]>
            : GetScalarType<T[P], EventGroupByOutputType[P]>
        }
      >
    >


  export type EventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdById?: boolean
    coverImageUrl?: boolean
    title_en?: boolean
    title_zh?: boolean
    description_en?: boolean
    description_zh?: boolean
    location_en?: boolean
    location_zh?: boolean
    startAt?: boolean
    endAt?: boolean
    timezone?: boolean
    feeAmount?: boolean
    feeCurrency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    rsvps?: boolean | Event$rsvpsArgs<ExtArgs>
    comments?: boolean | Event$commentsArgs<ExtArgs>
    reminderRules?: boolean | Event$reminderRulesArgs<ExtArgs>
    messageLogs?: boolean | Event$messageLogsArgs<ExtArgs>
    _count?: boolean | EventCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["event"]>

  export type EventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdById?: boolean
    coverImageUrl?: boolean
    title_en?: boolean
    title_zh?: boolean
    description_en?: boolean
    description_zh?: boolean
    location_en?: boolean
    location_zh?: boolean
    startAt?: boolean
    endAt?: boolean
    timezone?: boolean
    feeAmount?: boolean
    feeCurrency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["event"]>

  export type EventSelectScalar = {
    id?: boolean
    createdById?: boolean
    coverImageUrl?: boolean
    title_en?: boolean
    title_zh?: boolean
    description_en?: boolean
    description_zh?: boolean
    location_en?: boolean
    location_zh?: boolean
    startAt?: boolean
    endAt?: boolean
    timezone?: boolean
    feeAmount?: boolean
    feeCurrency?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type EventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    rsvps?: boolean | Event$rsvpsArgs<ExtArgs>
    comments?: boolean | Event$commentsArgs<ExtArgs>
    reminderRules?: boolean | Event$reminderRulesArgs<ExtArgs>
    messageLogs?: boolean | Event$messageLogsArgs<ExtArgs>
    _count?: boolean | EventCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $EventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Event"
    objects: {
      createdBy: Prisma.$UserPayload<ExtArgs>
      rsvps: Prisma.$RSVPPayload<ExtArgs>[]
      comments: Prisma.$CommentPayload<ExtArgs>[]
      reminderRules: Prisma.$ReminderRulePayload<ExtArgs>[]
      messageLogs: Prisma.$MessageLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      createdById: string
      coverImageUrl: string | null
      title_en: string
      title_zh: string
      description_en: string
      description_zh: string
      location_en: string
      location_zh: string
      startAt: Date
      endAt: Date | null
      timezone: string
      feeAmount: Prisma.Decimal | null
      feeCurrency: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["event"]>
    composites: {}
  }

  type EventGetPayload<S extends boolean | null | undefined | EventDefaultArgs> = $Result.GetResult<Prisma.$EventPayload, S>

  type EventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<EventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: EventCountAggregateInputType | true
    }

  export interface EventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Event'], meta: { name: 'Event' } }
    /**
     * Find zero or one Event that matches the filter.
     * @param {EventFindUniqueArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EventFindUniqueArgs>(args: SelectSubset<T, EventFindUniqueArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Event that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {EventFindUniqueOrThrowArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EventFindUniqueOrThrowArgs>(args: SelectSubset<T, EventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Event that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindFirstArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EventFindFirstArgs>(args?: SelectSubset<T, EventFindFirstArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Event that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindFirstOrThrowArgs} args - Arguments to find a Event
     * @example
     * // Get one Event
     * const event = await prisma.event.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EventFindFirstOrThrowArgs>(args?: SelectSubset<T, EventFindFirstOrThrowArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Events that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Events
     * const events = await prisma.event.findMany()
     * 
     * // Get first 10 Events
     * const events = await prisma.event.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const eventWithIdOnly = await prisma.event.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EventFindManyArgs>(args?: SelectSubset<T, EventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Event.
     * @param {EventCreateArgs} args - Arguments to create a Event.
     * @example
     * // Create one Event
     * const Event = await prisma.event.create({
     *   data: {
     *     // ... data to create a Event
     *   }
     * })
     * 
     */
    create<T extends EventCreateArgs>(args: SelectSubset<T, EventCreateArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Events.
     * @param {EventCreateManyArgs} args - Arguments to create many Events.
     * @example
     * // Create many Events
     * const event = await prisma.event.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EventCreateManyArgs>(args?: SelectSubset<T, EventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Events and returns the data saved in the database.
     * @param {EventCreateManyAndReturnArgs} args - Arguments to create many Events.
     * @example
     * // Create many Events
     * const event = await prisma.event.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Events and only return the `id`
     * const eventWithIdOnly = await prisma.event.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EventCreateManyAndReturnArgs>(args?: SelectSubset<T, EventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Event.
     * @param {EventDeleteArgs} args - Arguments to delete one Event.
     * @example
     * // Delete one Event
     * const Event = await prisma.event.delete({
     *   where: {
     *     // ... filter to delete one Event
     *   }
     * })
     * 
     */
    delete<T extends EventDeleteArgs>(args: SelectSubset<T, EventDeleteArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Event.
     * @param {EventUpdateArgs} args - Arguments to update one Event.
     * @example
     * // Update one Event
     * const event = await prisma.event.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EventUpdateArgs>(args: SelectSubset<T, EventUpdateArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Events.
     * @param {EventDeleteManyArgs} args - Arguments to filter Events to delete.
     * @example
     * // Delete a few Events
     * const { count } = await prisma.event.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EventDeleteManyArgs>(args?: SelectSubset<T, EventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Events.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Events
     * const event = await prisma.event.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EventUpdateManyArgs>(args: SelectSubset<T, EventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Event.
     * @param {EventUpsertArgs} args - Arguments to update or create a Event.
     * @example
     * // Update or create a Event
     * const event = await prisma.event.upsert({
     *   create: {
     *     // ... data to create a Event
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Event we want to update
     *   }
     * })
     */
    upsert<T extends EventUpsertArgs>(args: SelectSubset<T, EventUpsertArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Events.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventCountArgs} args - Arguments to filter Events to count.
     * @example
     * // Count the number of Events
     * const count = await prisma.event.count({
     *   where: {
     *     // ... the filter for the Events we want to count
     *   }
     * })
    **/
    count<T extends EventCountArgs>(
      args?: Subset<T, EventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Event.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EventAggregateArgs>(args: Subset<T, EventAggregateArgs>): Prisma.PrismaPromise<GetEventAggregateType<T>>

    /**
     * Group by Event.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EventGroupByArgs['orderBy'] }
        : { orderBy?: EventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Event model
   */
  readonly fields: EventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Event.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    rsvps<T extends Event$rsvpsArgs<ExtArgs> = {}>(args?: Subset<T, Event$rsvpsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findMany"> | Null>
    comments<T extends Event$commentsArgs<ExtArgs> = {}>(args?: Subset<T, Event$commentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany"> | Null>
    reminderRules<T extends Event$reminderRulesArgs<ExtArgs> = {}>(args?: Subset<T, Event$reminderRulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findMany"> | Null>
    messageLogs<T extends Event$messageLogsArgs<ExtArgs> = {}>(args?: Subset<T, Event$messageLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Event model
   */ 
  interface EventFieldRefs {
    readonly id: FieldRef<"Event", 'String'>
    readonly createdById: FieldRef<"Event", 'String'>
    readonly coverImageUrl: FieldRef<"Event", 'String'>
    readonly title_en: FieldRef<"Event", 'String'>
    readonly title_zh: FieldRef<"Event", 'String'>
    readonly description_en: FieldRef<"Event", 'String'>
    readonly description_zh: FieldRef<"Event", 'String'>
    readonly location_en: FieldRef<"Event", 'String'>
    readonly location_zh: FieldRef<"Event", 'String'>
    readonly startAt: FieldRef<"Event", 'DateTime'>
    readonly endAt: FieldRef<"Event", 'DateTime'>
    readonly timezone: FieldRef<"Event", 'String'>
    readonly feeAmount: FieldRef<"Event", 'Decimal'>
    readonly feeCurrency: FieldRef<"Event", 'String'>
    readonly createdAt: FieldRef<"Event", 'DateTime'>
    readonly updatedAt: FieldRef<"Event", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Event findUnique
   */
  export type EventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event findUniqueOrThrow
   */
  export type EventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event findFirst
   */
  export type EventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Events.
     */
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event findFirstOrThrow
   */
  export type EventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter, which Event to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Events.
     */
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event findMany
   */
  export type EventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter, which Events to fetch.
     */
    where?: EventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Events to fetch.
     */
    orderBy?: EventOrderByWithRelationInput | EventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Events.
     */
    cursor?: EventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Events from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Events.
     */
    skip?: number
    distinct?: EventScalarFieldEnum | EventScalarFieldEnum[]
  }

  /**
   * Event create
   */
  export type EventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * The data needed to create a Event.
     */
    data: XOR<EventCreateInput, EventUncheckedCreateInput>
  }

  /**
   * Event createMany
   */
  export type EventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Events.
     */
    data: EventCreateManyInput | EventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Event createManyAndReturn
   */
  export type EventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Events.
     */
    data: EventCreateManyInput | EventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Event update
   */
  export type EventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * The data needed to update a Event.
     */
    data: XOR<EventUpdateInput, EventUncheckedUpdateInput>
    /**
     * Choose, which Event to update.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event updateMany
   */
  export type EventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Events.
     */
    data: XOR<EventUpdateManyMutationInput, EventUncheckedUpdateManyInput>
    /**
     * Filter which Events to update
     */
    where?: EventWhereInput
  }

  /**
   * Event upsert
   */
  export type EventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * The filter to search for the Event to update in case it exists.
     */
    where: EventWhereUniqueInput
    /**
     * In case the Event found by the `where` argument doesn't exist, create a new Event with this data.
     */
    create: XOR<EventCreateInput, EventUncheckedCreateInput>
    /**
     * In case the Event was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EventUpdateInput, EventUncheckedUpdateInput>
  }

  /**
   * Event delete
   */
  export type EventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    /**
     * Filter which Event to delete.
     */
    where: EventWhereUniqueInput
  }

  /**
   * Event deleteMany
   */
  export type EventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Events to delete
     */
    where?: EventWhereInput
  }

  /**
   * Event.rsvps
   */
  export type Event$rsvpsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    where?: RSVPWhereInput
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    cursor?: RSVPWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RSVPScalarFieldEnum | RSVPScalarFieldEnum[]
  }

  /**
   * Event.comments
   */
  export type Event$commentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    where?: CommentWhereInput
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    cursor?: CommentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CommentScalarFieldEnum | CommentScalarFieldEnum[]
  }

  /**
   * Event.reminderRules
   */
  export type Event$reminderRulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    where?: ReminderRuleWhereInput
    orderBy?: ReminderRuleOrderByWithRelationInput | ReminderRuleOrderByWithRelationInput[]
    cursor?: ReminderRuleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ReminderRuleScalarFieldEnum | ReminderRuleScalarFieldEnum[]
  }

  /**
   * Event.messageLogs
   */
  export type Event$messageLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    where?: MessageLogWhereInput
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    cursor?: MessageLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageLogScalarFieldEnum | MessageLogScalarFieldEnum[]
  }

  /**
   * Event without action
   */
  export type EventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
  }


  /**
   * Model RSVP
   */

  export type AggregateRSVP = {
    _count: RSVPCountAggregateOutputType | null
    _min: RSVPMinAggregateOutputType | null
    _max: RSVPMaxAggregateOutputType | null
  }

  export type RSVPMinAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    status: $Enums.RSVPStatus | null
    updatedAt: Date | null
  }

  export type RSVPMaxAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    status: $Enums.RSVPStatus | null
    updatedAt: Date | null
  }

  export type RSVPCountAggregateOutputType = {
    id: number
    eventId: number
    userId: number
    status: number
    updatedAt: number
    _all: number
  }


  export type RSVPMinAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    status?: true
    updatedAt?: true
  }

  export type RSVPMaxAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    status?: true
    updatedAt?: true
  }

  export type RSVPCountAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    status?: true
    updatedAt?: true
    _all?: true
  }

  export type RSVPAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RSVP to aggregate.
     */
    where?: RSVPWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RSVPS to fetch.
     */
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RSVPWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RSVPS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RSVPS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RSVPS
    **/
    _count?: true | RSVPCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RSVPMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RSVPMaxAggregateInputType
  }

  export type GetRSVPAggregateType<T extends RSVPAggregateArgs> = {
        [P in keyof T & keyof AggregateRSVP]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRSVP[P]>
      : GetScalarType<T[P], AggregateRSVP[P]>
  }




  export type RSVPGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RSVPWhereInput
    orderBy?: RSVPOrderByWithAggregationInput | RSVPOrderByWithAggregationInput[]
    by: RSVPScalarFieldEnum[] | RSVPScalarFieldEnum
    having?: RSVPScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RSVPCountAggregateInputType | true
    _min?: RSVPMinAggregateInputType
    _max?: RSVPMaxAggregateInputType
  }

  export type RSVPGroupByOutputType = {
    id: string
    eventId: string
    userId: string
    status: $Enums.RSVPStatus
    updatedAt: Date
    _count: RSVPCountAggregateOutputType | null
    _min: RSVPMinAggregateOutputType | null
    _max: RSVPMaxAggregateOutputType | null
  }

  type GetRSVPGroupByPayload<T extends RSVPGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RSVPGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RSVPGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RSVPGroupByOutputType[P]>
            : GetScalarType<T[P], RSVPGroupByOutputType[P]>
        }
      >
    >


  export type RSVPSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    status?: boolean
    updatedAt?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rSVP"]>

  export type RSVPSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    status?: boolean
    updatedAt?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rSVP"]>

  export type RSVPSelectScalar = {
    id?: boolean
    eventId?: boolean
    userId?: boolean
    status?: boolean
    updatedAt?: boolean
  }

  export type RSVPInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type RSVPIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $RSVPPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RSVP"
    objects: {
      event: Prisma.$EventPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventId: string
      userId: string
      status: $Enums.RSVPStatus
      updatedAt: Date
    }, ExtArgs["result"]["rSVP"]>
    composites: {}
  }

  type RSVPGetPayload<S extends boolean | null | undefined | RSVPDefaultArgs> = $Result.GetResult<Prisma.$RSVPPayload, S>

  type RSVPCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RSVPFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RSVPCountAggregateInputType | true
    }

  export interface RSVPDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RSVP'], meta: { name: 'RSVP' } }
    /**
     * Find zero or one RSVP that matches the filter.
     * @param {RSVPFindUniqueArgs} args - Arguments to find a RSVP
     * @example
     * // Get one RSVP
     * const rSVP = await prisma.rSVP.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RSVPFindUniqueArgs>(args: SelectSubset<T, RSVPFindUniqueArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RSVP that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RSVPFindUniqueOrThrowArgs} args - Arguments to find a RSVP
     * @example
     * // Get one RSVP
     * const rSVP = await prisma.rSVP.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RSVPFindUniqueOrThrowArgs>(args: SelectSubset<T, RSVPFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RSVP that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPFindFirstArgs} args - Arguments to find a RSVP
     * @example
     * // Get one RSVP
     * const rSVP = await prisma.rSVP.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RSVPFindFirstArgs>(args?: SelectSubset<T, RSVPFindFirstArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RSVP that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPFindFirstOrThrowArgs} args - Arguments to find a RSVP
     * @example
     * // Get one RSVP
     * const rSVP = await prisma.rSVP.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RSVPFindFirstOrThrowArgs>(args?: SelectSubset<T, RSVPFindFirstOrThrowArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RSVPS that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RSVPS
     * const rSVPS = await prisma.rSVP.findMany()
     * 
     * // Get first 10 RSVPS
     * const rSVPS = await prisma.rSVP.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rSVPWithIdOnly = await prisma.rSVP.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RSVPFindManyArgs>(args?: SelectSubset<T, RSVPFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RSVP.
     * @param {RSVPCreateArgs} args - Arguments to create a RSVP.
     * @example
     * // Create one RSVP
     * const RSVP = await prisma.rSVP.create({
     *   data: {
     *     // ... data to create a RSVP
     *   }
     * })
     * 
     */
    create<T extends RSVPCreateArgs>(args: SelectSubset<T, RSVPCreateArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RSVPS.
     * @param {RSVPCreateManyArgs} args - Arguments to create many RSVPS.
     * @example
     * // Create many RSVPS
     * const rSVP = await prisma.rSVP.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RSVPCreateManyArgs>(args?: SelectSubset<T, RSVPCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RSVPS and returns the data saved in the database.
     * @param {RSVPCreateManyAndReturnArgs} args - Arguments to create many RSVPS.
     * @example
     * // Create many RSVPS
     * const rSVP = await prisma.rSVP.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RSVPS and only return the `id`
     * const rSVPWithIdOnly = await prisma.rSVP.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RSVPCreateManyAndReturnArgs>(args?: SelectSubset<T, RSVPCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RSVP.
     * @param {RSVPDeleteArgs} args - Arguments to delete one RSVP.
     * @example
     * // Delete one RSVP
     * const RSVP = await prisma.rSVP.delete({
     *   where: {
     *     // ... filter to delete one RSVP
     *   }
     * })
     * 
     */
    delete<T extends RSVPDeleteArgs>(args: SelectSubset<T, RSVPDeleteArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RSVP.
     * @param {RSVPUpdateArgs} args - Arguments to update one RSVP.
     * @example
     * // Update one RSVP
     * const rSVP = await prisma.rSVP.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RSVPUpdateArgs>(args: SelectSubset<T, RSVPUpdateArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RSVPS.
     * @param {RSVPDeleteManyArgs} args - Arguments to filter RSVPS to delete.
     * @example
     * // Delete a few RSVPS
     * const { count } = await prisma.rSVP.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RSVPDeleteManyArgs>(args?: SelectSubset<T, RSVPDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RSVPS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RSVPS
     * const rSVP = await prisma.rSVP.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RSVPUpdateManyArgs>(args: SelectSubset<T, RSVPUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RSVP.
     * @param {RSVPUpsertArgs} args - Arguments to update or create a RSVP.
     * @example
     * // Update or create a RSVP
     * const rSVP = await prisma.rSVP.upsert({
     *   create: {
     *     // ... data to create a RSVP
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RSVP we want to update
     *   }
     * })
     */
    upsert<T extends RSVPUpsertArgs>(args: SelectSubset<T, RSVPUpsertArgs<ExtArgs>>): Prisma__RSVPClient<$Result.GetResult<Prisma.$RSVPPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RSVPS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPCountArgs} args - Arguments to filter RSVPS to count.
     * @example
     * // Count the number of RSVPS
     * const count = await prisma.rSVP.count({
     *   where: {
     *     // ... the filter for the RSVPS we want to count
     *   }
     * })
    **/
    count<T extends RSVPCountArgs>(
      args?: Subset<T, RSVPCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RSVPCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RSVP.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RSVPAggregateArgs>(args: Subset<T, RSVPAggregateArgs>): Prisma.PrismaPromise<GetRSVPAggregateType<T>>

    /**
     * Group by RSVP.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RSVPGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RSVPGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RSVPGroupByArgs['orderBy'] }
        : { orderBy?: RSVPGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RSVPGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRSVPGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RSVP model
   */
  readonly fields: RSVPFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RSVP.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RSVPClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    event<T extends EventDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EventDefaultArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the RSVP model
   */ 
  interface RSVPFieldRefs {
    readonly id: FieldRef<"RSVP", 'String'>
    readonly eventId: FieldRef<"RSVP", 'String'>
    readonly userId: FieldRef<"RSVP", 'String'>
    readonly status: FieldRef<"RSVP", 'RSVPStatus'>
    readonly updatedAt: FieldRef<"RSVP", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RSVP findUnique
   */
  export type RSVPFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter, which RSVP to fetch.
     */
    where: RSVPWhereUniqueInput
  }

  /**
   * RSVP findUniqueOrThrow
   */
  export type RSVPFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter, which RSVP to fetch.
     */
    where: RSVPWhereUniqueInput
  }

  /**
   * RSVP findFirst
   */
  export type RSVPFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter, which RSVP to fetch.
     */
    where?: RSVPWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RSVPS to fetch.
     */
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RSVPS.
     */
    cursor?: RSVPWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RSVPS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RSVPS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RSVPS.
     */
    distinct?: RSVPScalarFieldEnum | RSVPScalarFieldEnum[]
  }

  /**
   * RSVP findFirstOrThrow
   */
  export type RSVPFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter, which RSVP to fetch.
     */
    where?: RSVPWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RSVPS to fetch.
     */
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RSVPS.
     */
    cursor?: RSVPWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RSVPS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RSVPS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RSVPS.
     */
    distinct?: RSVPScalarFieldEnum | RSVPScalarFieldEnum[]
  }

  /**
   * RSVP findMany
   */
  export type RSVPFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter, which RSVPS to fetch.
     */
    where?: RSVPWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RSVPS to fetch.
     */
    orderBy?: RSVPOrderByWithRelationInput | RSVPOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RSVPS.
     */
    cursor?: RSVPWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RSVPS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RSVPS.
     */
    skip?: number
    distinct?: RSVPScalarFieldEnum | RSVPScalarFieldEnum[]
  }

  /**
   * RSVP create
   */
  export type RSVPCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * The data needed to create a RSVP.
     */
    data: XOR<RSVPCreateInput, RSVPUncheckedCreateInput>
  }

  /**
   * RSVP createMany
   */
  export type RSVPCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RSVPS.
     */
    data: RSVPCreateManyInput | RSVPCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RSVP createManyAndReturn
   */
  export type RSVPCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RSVPS.
     */
    data: RSVPCreateManyInput | RSVPCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * RSVP update
   */
  export type RSVPUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * The data needed to update a RSVP.
     */
    data: XOR<RSVPUpdateInput, RSVPUncheckedUpdateInput>
    /**
     * Choose, which RSVP to update.
     */
    where: RSVPWhereUniqueInput
  }

  /**
   * RSVP updateMany
   */
  export type RSVPUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RSVPS.
     */
    data: XOR<RSVPUpdateManyMutationInput, RSVPUncheckedUpdateManyInput>
    /**
     * Filter which RSVPS to update
     */
    where?: RSVPWhereInput
  }

  /**
   * RSVP upsert
   */
  export type RSVPUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * The filter to search for the RSVP to update in case it exists.
     */
    where: RSVPWhereUniqueInput
    /**
     * In case the RSVP found by the `where` argument doesn't exist, create a new RSVP with this data.
     */
    create: XOR<RSVPCreateInput, RSVPUncheckedCreateInput>
    /**
     * In case the RSVP was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RSVPUpdateInput, RSVPUncheckedUpdateInput>
  }

  /**
   * RSVP delete
   */
  export type RSVPDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
    /**
     * Filter which RSVP to delete.
     */
    where: RSVPWhereUniqueInput
  }

  /**
   * RSVP deleteMany
   */
  export type RSVPDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RSVPS to delete
     */
    where?: RSVPWhereInput
  }

  /**
   * RSVP without action
   */
  export type RSVPDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RSVP
     */
    select?: RSVPSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RSVPInclude<ExtArgs> | null
  }


  /**
   * Model Comment
   */

  export type AggregateComment = {
    _count: CommentCountAggregateOutputType | null
    _min: CommentMinAggregateOutputType | null
    _max: CommentMaxAggregateOutputType | null
  }

  export type CommentMinAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    body: string | null
    createdAt: Date | null
    deletedAt: Date | null
  }

  export type CommentMaxAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    body: string | null
    createdAt: Date | null
    deletedAt: Date | null
  }

  export type CommentCountAggregateOutputType = {
    id: number
    eventId: number
    userId: number
    body: number
    createdAt: number
    deletedAt: number
    _all: number
  }


  export type CommentMinAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    body?: true
    createdAt?: true
    deletedAt?: true
  }

  export type CommentMaxAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    body?: true
    createdAt?: true
    deletedAt?: true
  }

  export type CommentCountAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    body?: true
    createdAt?: true
    deletedAt?: true
    _all?: true
  }

  export type CommentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Comment to aggregate.
     */
    where?: CommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Comments to fetch.
     */
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Comments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Comments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Comments
    **/
    _count?: true | CommentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CommentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CommentMaxAggregateInputType
  }

  export type GetCommentAggregateType<T extends CommentAggregateArgs> = {
        [P in keyof T & keyof AggregateComment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateComment[P]>
      : GetScalarType<T[P], AggregateComment[P]>
  }




  export type CommentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CommentWhereInput
    orderBy?: CommentOrderByWithAggregationInput | CommentOrderByWithAggregationInput[]
    by: CommentScalarFieldEnum[] | CommentScalarFieldEnum
    having?: CommentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CommentCountAggregateInputType | true
    _min?: CommentMinAggregateInputType
    _max?: CommentMaxAggregateInputType
  }

  export type CommentGroupByOutputType = {
    id: string
    eventId: string
    userId: string
    body: string
    createdAt: Date
    deletedAt: Date | null
    _count: CommentCountAggregateOutputType | null
    _min: CommentMinAggregateOutputType | null
    _max: CommentMaxAggregateOutputType | null
  }

  type GetCommentGroupByPayload<T extends CommentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CommentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CommentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CommentGroupByOutputType[P]>
            : GetScalarType<T[P], CommentGroupByOutputType[P]>
        }
      >
    >


  export type CommentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    body?: boolean
    createdAt?: boolean
    deletedAt?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["comment"]>

  export type CommentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    body?: boolean
    createdAt?: boolean
    deletedAt?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["comment"]>

  export type CommentSelectScalar = {
    id?: boolean
    eventId?: boolean
    userId?: boolean
    body?: boolean
    createdAt?: boolean
    deletedAt?: boolean
  }

  export type CommentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CommentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CommentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Comment"
    objects: {
      event: Prisma.$EventPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventId: string
      userId: string
      body: string
      createdAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["comment"]>
    composites: {}
  }

  type CommentGetPayload<S extends boolean | null | undefined | CommentDefaultArgs> = $Result.GetResult<Prisma.$CommentPayload, S>

  type CommentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CommentFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CommentCountAggregateInputType | true
    }

  export interface CommentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Comment'], meta: { name: 'Comment' } }
    /**
     * Find zero or one Comment that matches the filter.
     * @param {CommentFindUniqueArgs} args - Arguments to find a Comment
     * @example
     * // Get one Comment
     * const comment = await prisma.comment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CommentFindUniqueArgs>(args: SelectSubset<T, CommentFindUniqueArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Comment that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CommentFindUniqueOrThrowArgs} args - Arguments to find a Comment
     * @example
     * // Get one Comment
     * const comment = await prisma.comment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CommentFindUniqueOrThrowArgs>(args: SelectSubset<T, CommentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Comment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentFindFirstArgs} args - Arguments to find a Comment
     * @example
     * // Get one Comment
     * const comment = await prisma.comment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CommentFindFirstArgs>(args?: SelectSubset<T, CommentFindFirstArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Comment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentFindFirstOrThrowArgs} args - Arguments to find a Comment
     * @example
     * // Get one Comment
     * const comment = await prisma.comment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CommentFindFirstOrThrowArgs>(args?: SelectSubset<T, CommentFindFirstOrThrowArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Comments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Comments
     * const comments = await prisma.comment.findMany()
     * 
     * // Get first 10 Comments
     * const comments = await prisma.comment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const commentWithIdOnly = await prisma.comment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CommentFindManyArgs>(args?: SelectSubset<T, CommentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Comment.
     * @param {CommentCreateArgs} args - Arguments to create a Comment.
     * @example
     * // Create one Comment
     * const Comment = await prisma.comment.create({
     *   data: {
     *     // ... data to create a Comment
     *   }
     * })
     * 
     */
    create<T extends CommentCreateArgs>(args: SelectSubset<T, CommentCreateArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Comments.
     * @param {CommentCreateManyArgs} args - Arguments to create many Comments.
     * @example
     * // Create many Comments
     * const comment = await prisma.comment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CommentCreateManyArgs>(args?: SelectSubset<T, CommentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Comments and returns the data saved in the database.
     * @param {CommentCreateManyAndReturnArgs} args - Arguments to create many Comments.
     * @example
     * // Create many Comments
     * const comment = await prisma.comment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Comments and only return the `id`
     * const commentWithIdOnly = await prisma.comment.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CommentCreateManyAndReturnArgs>(args?: SelectSubset<T, CommentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Comment.
     * @param {CommentDeleteArgs} args - Arguments to delete one Comment.
     * @example
     * // Delete one Comment
     * const Comment = await prisma.comment.delete({
     *   where: {
     *     // ... filter to delete one Comment
     *   }
     * })
     * 
     */
    delete<T extends CommentDeleteArgs>(args: SelectSubset<T, CommentDeleteArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Comment.
     * @param {CommentUpdateArgs} args - Arguments to update one Comment.
     * @example
     * // Update one Comment
     * const comment = await prisma.comment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CommentUpdateArgs>(args: SelectSubset<T, CommentUpdateArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Comments.
     * @param {CommentDeleteManyArgs} args - Arguments to filter Comments to delete.
     * @example
     * // Delete a few Comments
     * const { count } = await prisma.comment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CommentDeleteManyArgs>(args?: SelectSubset<T, CommentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Comments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Comments
     * const comment = await prisma.comment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CommentUpdateManyArgs>(args: SelectSubset<T, CommentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Comment.
     * @param {CommentUpsertArgs} args - Arguments to update or create a Comment.
     * @example
     * // Update or create a Comment
     * const comment = await prisma.comment.upsert({
     *   create: {
     *     // ... data to create a Comment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Comment we want to update
     *   }
     * })
     */
    upsert<T extends CommentUpsertArgs>(args: SelectSubset<T, CommentUpsertArgs<ExtArgs>>): Prisma__CommentClient<$Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Comments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentCountArgs} args - Arguments to filter Comments to count.
     * @example
     * // Count the number of Comments
     * const count = await prisma.comment.count({
     *   where: {
     *     // ... the filter for the Comments we want to count
     *   }
     * })
    **/
    count<T extends CommentCountArgs>(
      args?: Subset<T, CommentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CommentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Comment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CommentAggregateArgs>(args: Subset<T, CommentAggregateArgs>): Prisma.PrismaPromise<GetCommentAggregateType<T>>

    /**
     * Group by Comment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CommentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CommentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CommentGroupByArgs['orderBy'] }
        : { orderBy?: CommentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CommentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCommentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Comment model
   */
  readonly fields: CommentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Comment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CommentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    event<T extends EventDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EventDefaultArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Comment model
   */ 
  interface CommentFieldRefs {
    readonly id: FieldRef<"Comment", 'String'>
    readonly eventId: FieldRef<"Comment", 'String'>
    readonly userId: FieldRef<"Comment", 'String'>
    readonly body: FieldRef<"Comment", 'String'>
    readonly createdAt: FieldRef<"Comment", 'DateTime'>
    readonly deletedAt: FieldRef<"Comment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Comment findUnique
   */
  export type CommentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter, which Comment to fetch.
     */
    where: CommentWhereUniqueInput
  }

  /**
   * Comment findUniqueOrThrow
   */
  export type CommentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter, which Comment to fetch.
     */
    where: CommentWhereUniqueInput
  }

  /**
   * Comment findFirst
   */
  export type CommentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter, which Comment to fetch.
     */
    where?: CommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Comments to fetch.
     */
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Comments.
     */
    cursor?: CommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Comments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Comments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Comments.
     */
    distinct?: CommentScalarFieldEnum | CommentScalarFieldEnum[]
  }

  /**
   * Comment findFirstOrThrow
   */
  export type CommentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter, which Comment to fetch.
     */
    where?: CommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Comments to fetch.
     */
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Comments.
     */
    cursor?: CommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Comments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Comments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Comments.
     */
    distinct?: CommentScalarFieldEnum | CommentScalarFieldEnum[]
  }

  /**
   * Comment findMany
   */
  export type CommentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter, which Comments to fetch.
     */
    where?: CommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Comments to fetch.
     */
    orderBy?: CommentOrderByWithRelationInput | CommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Comments.
     */
    cursor?: CommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Comments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Comments.
     */
    skip?: number
    distinct?: CommentScalarFieldEnum | CommentScalarFieldEnum[]
  }

  /**
   * Comment create
   */
  export type CommentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * The data needed to create a Comment.
     */
    data: XOR<CommentCreateInput, CommentUncheckedCreateInput>
  }

  /**
   * Comment createMany
   */
  export type CommentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Comments.
     */
    data: CommentCreateManyInput | CommentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Comment createManyAndReturn
   */
  export type CommentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Comments.
     */
    data: CommentCreateManyInput | CommentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Comment update
   */
  export type CommentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * The data needed to update a Comment.
     */
    data: XOR<CommentUpdateInput, CommentUncheckedUpdateInput>
    /**
     * Choose, which Comment to update.
     */
    where: CommentWhereUniqueInput
  }

  /**
   * Comment updateMany
   */
  export type CommentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Comments.
     */
    data: XOR<CommentUpdateManyMutationInput, CommentUncheckedUpdateManyInput>
    /**
     * Filter which Comments to update
     */
    where?: CommentWhereInput
  }

  /**
   * Comment upsert
   */
  export type CommentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * The filter to search for the Comment to update in case it exists.
     */
    where: CommentWhereUniqueInput
    /**
     * In case the Comment found by the `where` argument doesn't exist, create a new Comment with this data.
     */
    create: XOR<CommentCreateInput, CommentUncheckedCreateInput>
    /**
     * In case the Comment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CommentUpdateInput, CommentUncheckedUpdateInput>
  }

  /**
   * Comment delete
   */
  export type CommentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
    /**
     * Filter which Comment to delete.
     */
    where: CommentWhereUniqueInput
  }

  /**
   * Comment deleteMany
   */
  export type CommentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Comments to delete
     */
    where?: CommentWhereInput
  }

  /**
   * Comment without action
   */
  export type CommentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Comment
     */
    select?: CommentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CommentInclude<ExtArgs> | null
  }


  /**
   * Model ReminderRule
   */

  export type AggregateReminderRule = {
    _count: ReminderRuleCountAggregateOutputType | null
    _avg: ReminderRuleAvgAggregateOutputType | null
    _sum: ReminderRuleSumAggregateOutputType | null
    _min: ReminderRuleMinAggregateOutputType | null
    _max: ReminderRuleMaxAggregateOutputType | null
  }

  export type ReminderRuleAvgAggregateOutputType = {
    offsetMinutes: number | null
  }

  export type ReminderRuleSumAggregateOutputType = {
    offsetMinutes: number | null
  }

  export type ReminderRuleMinAggregateOutputType = {
    id: string | null
    eventId: string | null
    offsetMinutes: number | null
    enabled: boolean | null
  }

  export type ReminderRuleMaxAggregateOutputType = {
    id: string | null
    eventId: string | null
    offsetMinutes: number | null
    enabled: boolean | null
  }

  export type ReminderRuleCountAggregateOutputType = {
    id: number
    eventId: number
    offsetMinutes: number
    channels: number
    enabled: number
    _all: number
  }


  export type ReminderRuleAvgAggregateInputType = {
    offsetMinutes?: true
  }

  export type ReminderRuleSumAggregateInputType = {
    offsetMinutes?: true
  }

  export type ReminderRuleMinAggregateInputType = {
    id?: true
    eventId?: true
    offsetMinutes?: true
    enabled?: true
  }

  export type ReminderRuleMaxAggregateInputType = {
    id?: true
    eventId?: true
    offsetMinutes?: true
    enabled?: true
  }

  export type ReminderRuleCountAggregateInputType = {
    id?: true
    eventId?: true
    offsetMinutes?: true
    channels?: true
    enabled?: true
    _all?: true
  }

  export type ReminderRuleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReminderRule to aggregate.
     */
    where?: ReminderRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReminderRules to fetch.
     */
    orderBy?: ReminderRuleOrderByWithRelationInput | ReminderRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ReminderRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReminderRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReminderRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ReminderRules
    **/
    _count?: true | ReminderRuleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ReminderRuleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ReminderRuleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ReminderRuleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ReminderRuleMaxAggregateInputType
  }

  export type GetReminderRuleAggregateType<T extends ReminderRuleAggregateArgs> = {
        [P in keyof T & keyof AggregateReminderRule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReminderRule[P]>
      : GetScalarType<T[P], AggregateReminderRule[P]>
  }




  export type ReminderRuleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ReminderRuleWhereInput
    orderBy?: ReminderRuleOrderByWithAggregationInput | ReminderRuleOrderByWithAggregationInput[]
    by: ReminderRuleScalarFieldEnum[] | ReminderRuleScalarFieldEnum
    having?: ReminderRuleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ReminderRuleCountAggregateInputType | true
    _avg?: ReminderRuleAvgAggregateInputType
    _sum?: ReminderRuleSumAggregateInputType
    _min?: ReminderRuleMinAggregateInputType
    _max?: ReminderRuleMaxAggregateInputType
  }

  export type ReminderRuleGroupByOutputType = {
    id: string
    eventId: string
    offsetMinutes: number
    channels: JsonValue
    enabled: boolean
    _count: ReminderRuleCountAggregateOutputType | null
    _avg: ReminderRuleAvgAggregateOutputType | null
    _sum: ReminderRuleSumAggregateOutputType | null
    _min: ReminderRuleMinAggregateOutputType | null
    _max: ReminderRuleMaxAggregateOutputType | null
  }

  type GetReminderRuleGroupByPayload<T extends ReminderRuleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReminderRuleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ReminderRuleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ReminderRuleGroupByOutputType[P]>
            : GetScalarType<T[P], ReminderRuleGroupByOutputType[P]>
        }
      >
    >


  export type ReminderRuleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    offsetMinutes?: boolean
    channels?: boolean
    enabled?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reminderRule"]>

  export type ReminderRuleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    offsetMinutes?: boolean
    channels?: boolean
    enabled?: boolean
    event?: boolean | EventDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["reminderRule"]>

  export type ReminderRuleSelectScalar = {
    id?: boolean
    eventId?: boolean
    offsetMinutes?: boolean
    channels?: boolean
    enabled?: boolean
  }

  export type ReminderRuleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
  }
  export type ReminderRuleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | EventDefaultArgs<ExtArgs>
  }

  export type $ReminderRulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ReminderRule"
    objects: {
      event: Prisma.$EventPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventId: string
      offsetMinutes: number
      channels: Prisma.JsonValue
      enabled: boolean
    }, ExtArgs["result"]["reminderRule"]>
    composites: {}
  }

  type ReminderRuleGetPayload<S extends boolean | null | undefined | ReminderRuleDefaultArgs> = $Result.GetResult<Prisma.$ReminderRulePayload, S>

  type ReminderRuleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ReminderRuleFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ReminderRuleCountAggregateInputType | true
    }

  export interface ReminderRuleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ReminderRule'], meta: { name: 'ReminderRule' } }
    /**
     * Find zero or one ReminderRule that matches the filter.
     * @param {ReminderRuleFindUniqueArgs} args - Arguments to find a ReminderRule
     * @example
     * // Get one ReminderRule
     * const reminderRule = await prisma.reminderRule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReminderRuleFindUniqueArgs>(args: SelectSubset<T, ReminderRuleFindUniqueArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ReminderRule that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ReminderRuleFindUniqueOrThrowArgs} args - Arguments to find a ReminderRule
     * @example
     * // Get one ReminderRule
     * const reminderRule = await prisma.reminderRule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReminderRuleFindUniqueOrThrowArgs>(args: SelectSubset<T, ReminderRuleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ReminderRule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleFindFirstArgs} args - Arguments to find a ReminderRule
     * @example
     * // Get one ReminderRule
     * const reminderRule = await prisma.reminderRule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReminderRuleFindFirstArgs>(args?: SelectSubset<T, ReminderRuleFindFirstArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ReminderRule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleFindFirstOrThrowArgs} args - Arguments to find a ReminderRule
     * @example
     * // Get one ReminderRule
     * const reminderRule = await prisma.reminderRule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReminderRuleFindFirstOrThrowArgs>(args?: SelectSubset<T, ReminderRuleFindFirstOrThrowArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ReminderRules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ReminderRules
     * const reminderRules = await prisma.reminderRule.findMany()
     * 
     * // Get first 10 ReminderRules
     * const reminderRules = await prisma.reminderRule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const reminderRuleWithIdOnly = await prisma.reminderRule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ReminderRuleFindManyArgs>(args?: SelectSubset<T, ReminderRuleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ReminderRule.
     * @param {ReminderRuleCreateArgs} args - Arguments to create a ReminderRule.
     * @example
     * // Create one ReminderRule
     * const ReminderRule = await prisma.reminderRule.create({
     *   data: {
     *     // ... data to create a ReminderRule
     *   }
     * })
     * 
     */
    create<T extends ReminderRuleCreateArgs>(args: SelectSubset<T, ReminderRuleCreateArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ReminderRules.
     * @param {ReminderRuleCreateManyArgs} args - Arguments to create many ReminderRules.
     * @example
     * // Create many ReminderRules
     * const reminderRule = await prisma.reminderRule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ReminderRuleCreateManyArgs>(args?: SelectSubset<T, ReminderRuleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ReminderRules and returns the data saved in the database.
     * @param {ReminderRuleCreateManyAndReturnArgs} args - Arguments to create many ReminderRules.
     * @example
     * // Create many ReminderRules
     * const reminderRule = await prisma.reminderRule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ReminderRules and only return the `id`
     * const reminderRuleWithIdOnly = await prisma.reminderRule.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ReminderRuleCreateManyAndReturnArgs>(args?: SelectSubset<T, ReminderRuleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ReminderRule.
     * @param {ReminderRuleDeleteArgs} args - Arguments to delete one ReminderRule.
     * @example
     * // Delete one ReminderRule
     * const ReminderRule = await prisma.reminderRule.delete({
     *   where: {
     *     // ... filter to delete one ReminderRule
     *   }
     * })
     * 
     */
    delete<T extends ReminderRuleDeleteArgs>(args: SelectSubset<T, ReminderRuleDeleteArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ReminderRule.
     * @param {ReminderRuleUpdateArgs} args - Arguments to update one ReminderRule.
     * @example
     * // Update one ReminderRule
     * const reminderRule = await prisma.reminderRule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ReminderRuleUpdateArgs>(args: SelectSubset<T, ReminderRuleUpdateArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ReminderRules.
     * @param {ReminderRuleDeleteManyArgs} args - Arguments to filter ReminderRules to delete.
     * @example
     * // Delete a few ReminderRules
     * const { count } = await prisma.reminderRule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ReminderRuleDeleteManyArgs>(args?: SelectSubset<T, ReminderRuleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ReminderRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ReminderRules
     * const reminderRule = await prisma.reminderRule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ReminderRuleUpdateManyArgs>(args: SelectSubset<T, ReminderRuleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ReminderRule.
     * @param {ReminderRuleUpsertArgs} args - Arguments to update or create a ReminderRule.
     * @example
     * // Update or create a ReminderRule
     * const reminderRule = await prisma.reminderRule.upsert({
     *   create: {
     *     // ... data to create a ReminderRule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ReminderRule we want to update
     *   }
     * })
     */
    upsert<T extends ReminderRuleUpsertArgs>(args: SelectSubset<T, ReminderRuleUpsertArgs<ExtArgs>>): Prisma__ReminderRuleClient<$Result.GetResult<Prisma.$ReminderRulePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ReminderRules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleCountArgs} args - Arguments to filter ReminderRules to count.
     * @example
     * // Count the number of ReminderRules
     * const count = await prisma.reminderRule.count({
     *   where: {
     *     // ... the filter for the ReminderRules we want to count
     *   }
     * })
    **/
    count<T extends ReminderRuleCountArgs>(
      args?: Subset<T, ReminderRuleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReminderRuleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ReminderRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ReminderRuleAggregateArgs>(args: Subset<T, ReminderRuleAggregateArgs>): Prisma.PrismaPromise<GetReminderRuleAggregateType<T>>

    /**
     * Group by ReminderRule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReminderRuleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ReminderRuleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReminderRuleGroupByArgs['orderBy'] }
        : { orderBy?: ReminderRuleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ReminderRuleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetReminderRuleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ReminderRule model
   */
  readonly fields: ReminderRuleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ReminderRule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReminderRuleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    event<T extends EventDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EventDefaultArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ReminderRule model
   */ 
  interface ReminderRuleFieldRefs {
    readonly id: FieldRef<"ReminderRule", 'String'>
    readonly eventId: FieldRef<"ReminderRule", 'String'>
    readonly offsetMinutes: FieldRef<"ReminderRule", 'Int'>
    readonly channels: FieldRef<"ReminderRule", 'Json'>
    readonly enabled: FieldRef<"ReminderRule", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * ReminderRule findUnique
   */
  export type ReminderRuleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter, which ReminderRule to fetch.
     */
    where: ReminderRuleWhereUniqueInput
  }

  /**
   * ReminderRule findUniqueOrThrow
   */
  export type ReminderRuleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter, which ReminderRule to fetch.
     */
    where: ReminderRuleWhereUniqueInput
  }

  /**
   * ReminderRule findFirst
   */
  export type ReminderRuleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter, which ReminderRule to fetch.
     */
    where?: ReminderRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReminderRules to fetch.
     */
    orderBy?: ReminderRuleOrderByWithRelationInput | ReminderRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReminderRules.
     */
    cursor?: ReminderRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReminderRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReminderRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReminderRules.
     */
    distinct?: ReminderRuleScalarFieldEnum | ReminderRuleScalarFieldEnum[]
  }

  /**
   * ReminderRule findFirstOrThrow
   */
  export type ReminderRuleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter, which ReminderRule to fetch.
     */
    where?: ReminderRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReminderRules to fetch.
     */
    orderBy?: ReminderRuleOrderByWithRelationInput | ReminderRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ReminderRules.
     */
    cursor?: ReminderRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReminderRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReminderRules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ReminderRules.
     */
    distinct?: ReminderRuleScalarFieldEnum | ReminderRuleScalarFieldEnum[]
  }

  /**
   * ReminderRule findMany
   */
  export type ReminderRuleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter, which ReminderRules to fetch.
     */
    where?: ReminderRuleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ReminderRules to fetch.
     */
    orderBy?: ReminderRuleOrderByWithRelationInput | ReminderRuleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ReminderRules.
     */
    cursor?: ReminderRuleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ReminderRules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ReminderRules.
     */
    skip?: number
    distinct?: ReminderRuleScalarFieldEnum | ReminderRuleScalarFieldEnum[]
  }

  /**
   * ReminderRule create
   */
  export type ReminderRuleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * The data needed to create a ReminderRule.
     */
    data: XOR<ReminderRuleCreateInput, ReminderRuleUncheckedCreateInput>
  }

  /**
   * ReminderRule createMany
   */
  export type ReminderRuleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ReminderRules.
     */
    data: ReminderRuleCreateManyInput | ReminderRuleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ReminderRule createManyAndReturn
   */
  export type ReminderRuleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ReminderRules.
     */
    data: ReminderRuleCreateManyInput | ReminderRuleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ReminderRule update
   */
  export type ReminderRuleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * The data needed to update a ReminderRule.
     */
    data: XOR<ReminderRuleUpdateInput, ReminderRuleUncheckedUpdateInput>
    /**
     * Choose, which ReminderRule to update.
     */
    where: ReminderRuleWhereUniqueInput
  }

  /**
   * ReminderRule updateMany
   */
  export type ReminderRuleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ReminderRules.
     */
    data: XOR<ReminderRuleUpdateManyMutationInput, ReminderRuleUncheckedUpdateManyInput>
    /**
     * Filter which ReminderRules to update
     */
    where?: ReminderRuleWhereInput
  }

  /**
   * ReminderRule upsert
   */
  export type ReminderRuleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * The filter to search for the ReminderRule to update in case it exists.
     */
    where: ReminderRuleWhereUniqueInput
    /**
     * In case the ReminderRule found by the `where` argument doesn't exist, create a new ReminderRule with this data.
     */
    create: XOR<ReminderRuleCreateInput, ReminderRuleUncheckedCreateInput>
    /**
     * In case the ReminderRule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReminderRuleUpdateInput, ReminderRuleUncheckedUpdateInput>
  }

  /**
   * ReminderRule delete
   */
  export type ReminderRuleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
    /**
     * Filter which ReminderRule to delete.
     */
    where: ReminderRuleWhereUniqueInput
  }

  /**
   * ReminderRule deleteMany
   */
  export type ReminderRuleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ReminderRules to delete
     */
    where?: ReminderRuleWhereInput
  }

  /**
   * ReminderRule without action
   */
  export type ReminderRuleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ReminderRule
     */
    select?: ReminderRuleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReminderRuleInclude<ExtArgs> | null
  }


  /**
   * Model MessageLog
   */

  export type AggregateMessageLog = {
    _count: MessageLogCountAggregateOutputType | null
    _min: MessageLogMinAggregateOutputType | null
    _max: MessageLogMaxAggregateOutputType | null
  }

  export type MessageLogMinAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    channel: $Enums.MessageChannel | null
    toAddress: string | null
    status: $Enums.MessageStatus | null
    providerMessageId: string | null
    createdAt: Date | null
  }

  export type MessageLogMaxAggregateOutputType = {
    id: string | null
    eventId: string | null
    userId: string | null
    channel: $Enums.MessageChannel | null
    toAddress: string | null
    status: $Enums.MessageStatus | null
    providerMessageId: string | null
    createdAt: Date | null
  }

  export type MessageLogCountAggregateOutputType = {
    id: number
    eventId: number
    userId: number
    channel: number
    toAddress: number
    payload: number
    status: number
    providerMessageId: number
    createdAt: number
    _all: number
  }


  export type MessageLogMinAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    channel?: true
    toAddress?: true
    status?: true
    providerMessageId?: true
    createdAt?: true
  }

  export type MessageLogMaxAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    channel?: true
    toAddress?: true
    status?: true
    providerMessageId?: true
    createdAt?: true
  }

  export type MessageLogCountAggregateInputType = {
    id?: true
    eventId?: true
    userId?: true
    channel?: true
    toAddress?: true
    payload?: true
    status?: true
    providerMessageId?: true
    createdAt?: true
    _all?: true
  }

  export type MessageLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageLog to aggregate.
     */
    where?: MessageLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageLogs to fetch.
     */
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MessageLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MessageLogs
    **/
    _count?: true | MessageLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessageLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessageLogMaxAggregateInputType
  }

  export type GetMessageLogAggregateType<T extends MessageLogAggregateArgs> = {
        [P in keyof T & keyof AggregateMessageLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessageLog[P]>
      : GetScalarType<T[P], AggregateMessageLog[P]>
  }




  export type MessageLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageLogWhereInput
    orderBy?: MessageLogOrderByWithAggregationInput | MessageLogOrderByWithAggregationInput[]
    by: MessageLogScalarFieldEnum[] | MessageLogScalarFieldEnum
    having?: MessageLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessageLogCountAggregateInputType | true
    _min?: MessageLogMinAggregateInputType
    _max?: MessageLogMaxAggregateInputType
  }

  export type MessageLogGroupByOutputType = {
    id: string
    eventId: string | null
    userId: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonValue
    status: $Enums.MessageStatus
    providerMessageId: string | null
    createdAt: Date
    _count: MessageLogCountAggregateOutputType | null
    _min: MessageLogMinAggregateOutputType | null
    _max: MessageLogMaxAggregateOutputType | null
  }

  type GetMessageLogGroupByPayload<T extends MessageLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessageLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessageLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessageLogGroupByOutputType[P]>
            : GetScalarType<T[P], MessageLogGroupByOutputType[P]>
        }
      >
    >


  export type MessageLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    channel?: boolean
    toAddress?: boolean
    payload?: boolean
    status?: boolean
    providerMessageId?: boolean
    createdAt?: boolean
    event?: boolean | MessageLog$eventArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageLog"]>

  export type MessageLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventId?: boolean
    userId?: boolean
    channel?: boolean
    toAddress?: boolean
    payload?: boolean
    status?: boolean
    providerMessageId?: boolean
    createdAt?: boolean
    event?: boolean | MessageLog$eventArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageLog"]>

  export type MessageLogSelectScalar = {
    id?: boolean
    eventId?: boolean
    userId?: boolean
    channel?: boolean
    toAddress?: boolean
    payload?: boolean
    status?: boolean
    providerMessageId?: boolean
    createdAt?: boolean
  }

  export type MessageLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | MessageLog$eventArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type MessageLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    event?: boolean | MessageLog$eventArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $MessageLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MessageLog"
    objects: {
      event: Prisma.$EventPayload<ExtArgs> | null
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventId: string | null
      userId: string
      channel: $Enums.MessageChannel
      toAddress: string
      payload: Prisma.JsonValue
      status: $Enums.MessageStatus
      providerMessageId: string | null
      createdAt: Date
    }, ExtArgs["result"]["messageLog"]>
    composites: {}
  }

  type MessageLogGetPayload<S extends boolean | null | undefined | MessageLogDefaultArgs> = $Result.GetResult<Prisma.$MessageLogPayload, S>

  type MessageLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MessageLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MessageLogCountAggregateInputType | true
    }

  export interface MessageLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MessageLog'], meta: { name: 'MessageLog' } }
    /**
     * Find zero or one MessageLog that matches the filter.
     * @param {MessageLogFindUniqueArgs} args - Arguments to find a MessageLog
     * @example
     * // Get one MessageLog
     * const messageLog = await prisma.messageLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MessageLogFindUniqueArgs>(args: SelectSubset<T, MessageLogFindUniqueArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MessageLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MessageLogFindUniqueOrThrowArgs} args - Arguments to find a MessageLog
     * @example
     * // Get one MessageLog
     * const messageLog = await prisma.messageLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MessageLogFindUniqueOrThrowArgs>(args: SelectSubset<T, MessageLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MessageLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogFindFirstArgs} args - Arguments to find a MessageLog
     * @example
     * // Get one MessageLog
     * const messageLog = await prisma.messageLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MessageLogFindFirstArgs>(args?: SelectSubset<T, MessageLogFindFirstArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MessageLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogFindFirstOrThrowArgs} args - Arguments to find a MessageLog
     * @example
     * // Get one MessageLog
     * const messageLog = await prisma.messageLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MessageLogFindFirstOrThrowArgs>(args?: SelectSubset<T, MessageLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MessageLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MessageLogs
     * const messageLogs = await prisma.messageLog.findMany()
     * 
     * // Get first 10 MessageLogs
     * const messageLogs = await prisma.messageLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messageLogWithIdOnly = await prisma.messageLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MessageLogFindManyArgs>(args?: SelectSubset<T, MessageLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MessageLog.
     * @param {MessageLogCreateArgs} args - Arguments to create a MessageLog.
     * @example
     * // Create one MessageLog
     * const MessageLog = await prisma.messageLog.create({
     *   data: {
     *     // ... data to create a MessageLog
     *   }
     * })
     * 
     */
    create<T extends MessageLogCreateArgs>(args: SelectSubset<T, MessageLogCreateArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MessageLogs.
     * @param {MessageLogCreateManyArgs} args - Arguments to create many MessageLogs.
     * @example
     * // Create many MessageLogs
     * const messageLog = await prisma.messageLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MessageLogCreateManyArgs>(args?: SelectSubset<T, MessageLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MessageLogs and returns the data saved in the database.
     * @param {MessageLogCreateManyAndReturnArgs} args - Arguments to create many MessageLogs.
     * @example
     * // Create many MessageLogs
     * const messageLog = await prisma.messageLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MessageLogs and only return the `id`
     * const messageLogWithIdOnly = await prisma.messageLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MessageLogCreateManyAndReturnArgs>(args?: SelectSubset<T, MessageLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MessageLog.
     * @param {MessageLogDeleteArgs} args - Arguments to delete one MessageLog.
     * @example
     * // Delete one MessageLog
     * const MessageLog = await prisma.messageLog.delete({
     *   where: {
     *     // ... filter to delete one MessageLog
     *   }
     * })
     * 
     */
    delete<T extends MessageLogDeleteArgs>(args: SelectSubset<T, MessageLogDeleteArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MessageLog.
     * @param {MessageLogUpdateArgs} args - Arguments to update one MessageLog.
     * @example
     * // Update one MessageLog
     * const messageLog = await prisma.messageLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MessageLogUpdateArgs>(args: SelectSubset<T, MessageLogUpdateArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MessageLogs.
     * @param {MessageLogDeleteManyArgs} args - Arguments to filter MessageLogs to delete.
     * @example
     * // Delete a few MessageLogs
     * const { count } = await prisma.messageLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MessageLogDeleteManyArgs>(args?: SelectSubset<T, MessageLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MessageLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MessageLogs
     * const messageLog = await prisma.messageLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MessageLogUpdateManyArgs>(args: SelectSubset<T, MessageLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MessageLog.
     * @param {MessageLogUpsertArgs} args - Arguments to update or create a MessageLog.
     * @example
     * // Update or create a MessageLog
     * const messageLog = await prisma.messageLog.upsert({
     *   create: {
     *     // ... data to create a MessageLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MessageLog we want to update
     *   }
     * })
     */
    upsert<T extends MessageLogUpsertArgs>(args: SelectSubset<T, MessageLogUpsertArgs<ExtArgs>>): Prisma__MessageLogClient<$Result.GetResult<Prisma.$MessageLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MessageLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogCountArgs} args - Arguments to filter MessageLogs to count.
     * @example
     * // Count the number of MessageLogs
     * const count = await prisma.messageLog.count({
     *   where: {
     *     // ... the filter for the MessageLogs we want to count
     *   }
     * })
    **/
    count<T extends MessageLogCountArgs>(
      args?: Subset<T, MessageLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessageLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MessageLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MessageLogAggregateArgs>(args: Subset<T, MessageLogAggregateArgs>): Prisma.PrismaPromise<GetMessageLogAggregateType<T>>

    /**
     * Group by MessageLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MessageLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MessageLogGroupByArgs['orderBy'] }
        : { orderBy?: MessageLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MessageLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessageLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MessageLog model
   */
  readonly fields: MessageLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MessageLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MessageLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    event<T extends MessageLog$eventArgs<ExtArgs> = {}>(args?: Subset<T, MessageLog$eventArgs<ExtArgs>>): Prisma__EventClient<$Result.GetResult<Prisma.$EventPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MessageLog model
   */ 
  interface MessageLogFieldRefs {
    readonly id: FieldRef<"MessageLog", 'String'>
    readonly eventId: FieldRef<"MessageLog", 'String'>
    readonly userId: FieldRef<"MessageLog", 'String'>
    readonly channel: FieldRef<"MessageLog", 'MessageChannel'>
    readonly toAddress: FieldRef<"MessageLog", 'String'>
    readonly payload: FieldRef<"MessageLog", 'Json'>
    readonly status: FieldRef<"MessageLog", 'MessageStatus'>
    readonly providerMessageId: FieldRef<"MessageLog", 'String'>
    readonly createdAt: FieldRef<"MessageLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MessageLog findUnique
   */
  export type MessageLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter, which MessageLog to fetch.
     */
    where: MessageLogWhereUniqueInput
  }

  /**
   * MessageLog findUniqueOrThrow
   */
  export type MessageLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter, which MessageLog to fetch.
     */
    where: MessageLogWhereUniqueInput
  }

  /**
   * MessageLog findFirst
   */
  export type MessageLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter, which MessageLog to fetch.
     */
    where?: MessageLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageLogs to fetch.
     */
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageLogs.
     */
    cursor?: MessageLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageLogs.
     */
    distinct?: MessageLogScalarFieldEnum | MessageLogScalarFieldEnum[]
  }

  /**
   * MessageLog findFirstOrThrow
   */
  export type MessageLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter, which MessageLog to fetch.
     */
    where?: MessageLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageLogs to fetch.
     */
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageLogs.
     */
    cursor?: MessageLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageLogs.
     */
    distinct?: MessageLogScalarFieldEnum | MessageLogScalarFieldEnum[]
  }

  /**
   * MessageLog findMany
   */
  export type MessageLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter, which MessageLogs to fetch.
     */
    where?: MessageLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageLogs to fetch.
     */
    orderBy?: MessageLogOrderByWithRelationInput | MessageLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MessageLogs.
     */
    cursor?: MessageLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageLogs.
     */
    skip?: number
    distinct?: MessageLogScalarFieldEnum | MessageLogScalarFieldEnum[]
  }

  /**
   * MessageLog create
   */
  export type MessageLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * The data needed to create a MessageLog.
     */
    data: XOR<MessageLogCreateInput, MessageLogUncheckedCreateInput>
  }

  /**
   * MessageLog createMany
   */
  export type MessageLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MessageLogs.
     */
    data: MessageLogCreateManyInput | MessageLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MessageLog createManyAndReturn
   */
  export type MessageLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MessageLogs.
     */
    data: MessageLogCreateManyInput | MessageLogCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MessageLog update
   */
  export type MessageLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * The data needed to update a MessageLog.
     */
    data: XOR<MessageLogUpdateInput, MessageLogUncheckedUpdateInput>
    /**
     * Choose, which MessageLog to update.
     */
    where: MessageLogWhereUniqueInput
  }

  /**
   * MessageLog updateMany
   */
  export type MessageLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MessageLogs.
     */
    data: XOR<MessageLogUpdateManyMutationInput, MessageLogUncheckedUpdateManyInput>
    /**
     * Filter which MessageLogs to update
     */
    where?: MessageLogWhereInput
  }

  /**
   * MessageLog upsert
   */
  export type MessageLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * The filter to search for the MessageLog to update in case it exists.
     */
    where: MessageLogWhereUniqueInput
    /**
     * In case the MessageLog found by the `where` argument doesn't exist, create a new MessageLog with this data.
     */
    create: XOR<MessageLogCreateInput, MessageLogUncheckedCreateInput>
    /**
     * In case the MessageLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MessageLogUpdateInput, MessageLogUncheckedUpdateInput>
  }

  /**
   * MessageLog delete
   */
  export type MessageLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
    /**
     * Filter which MessageLog to delete.
     */
    where: MessageLogWhereUniqueInput
  }

  /**
   * MessageLog deleteMany
   */
  export type MessageLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageLogs to delete
     */
    where?: MessageLogWhereInput
  }

  /**
   * MessageLog.event
   */
  export type MessageLog$eventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Event
     */
    select?: EventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EventInclude<ExtArgs> | null
    where?: EventWhereInput
  }

  /**
   * MessageLog without action
   */
  export type MessageLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageLog
     */
    select?: MessageLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageLogInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    phoneE164: 'phoneE164',
    displayName: 'displayName',
    preferredLanguage: 'preferredLanguage',
    role: 'role',
    notificationsMuted: 'notificationsMuted',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const EventScalarFieldEnum: {
    id: 'id',
    createdById: 'createdById',
    coverImageUrl: 'coverImageUrl',
    title_en: 'title_en',
    title_zh: 'title_zh',
    description_en: 'description_en',
    description_zh: 'description_zh',
    location_en: 'location_en',
    location_zh: 'location_zh',
    startAt: 'startAt',
    endAt: 'endAt',
    timezone: 'timezone',
    feeAmount: 'feeAmount',
    feeCurrency: 'feeCurrency',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type EventScalarFieldEnum = (typeof EventScalarFieldEnum)[keyof typeof EventScalarFieldEnum]


  export const RSVPScalarFieldEnum: {
    id: 'id',
    eventId: 'eventId',
    userId: 'userId',
    status: 'status',
    updatedAt: 'updatedAt'
  };

  export type RSVPScalarFieldEnum = (typeof RSVPScalarFieldEnum)[keyof typeof RSVPScalarFieldEnum]


  export const CommentScalarFieldEnum: {
    id: 'id',
    eventId: 'eventId',
    userId: 'userId',
    body: 'body',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt'
  };

  export type CommentScalarFieldEnum = (typeof CommentScalarFieldEnum)[keyof typeof CommentScalarFieldEnum]


  export const ReminderRuleScalarFieldEnum: {
    id: 'id',
    eventId: 'eventId',
    offsetMinutes: 'offsetMinutes',
    channels: 'channels',
    enabled: 'enabled'
  };

  export type ReminderRuleScalarFieldEnum = (typeof ReminderRuleScalarFieldEnum)[keyof typeof ReminderRuleScalarFieldEnum]


  export const MessageLogScalarFieldEnum: {
    id: 'id',
    eventId: 'eventId',
    userId: 'userId',
    channel: 'channel',
    toAddress: 'toAddress',
    payload: 'payload',
    status: 'status',
    providerMessageId: 'providerMessageId',
    createdAt: 'createdAt'
  };

  export type MessageLogScalarFieldEnum = (typeof MessageLogScalarFieldEnum)[keyof typeof MessageLogScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Role'
   */
  export type EnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role'>
    


  /**
   * Reference to a field of type 'Role[]'
   */
  export type ListEnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'RSVPStatus'
   */
  export type EnumRSVPStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RSVPStatus'>
    


  /**
   * Reference to a field of type 'RSVPStatus[]'
   */
  export type ListEnumRSVPStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RSVPStatus[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'MessageChannel'
   */
  export type EnumMessageChannelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageChannel'>
    


  /**
   * Reference to a field of type 'MessageChannel[]'
   */
  export type ListEnumMessageChannelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageChannel[]'>
    


  /**
   * Reference to a field of type 'MessageStatus'
   */
  export type EnumMessageStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageStatus'>
    


  /**
   * Reference to a field of type 'MessageStatus[]'
   */
  export type ListEnumMessageStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    phoneE164?: StringFilter<"User"> | string
    displayName?: StringNullableFilter<"User"> | string | null
    preferredLanguage?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    notificationsMuted?: BoolFilter<"User"> | boolean
    createdAt?: DateTimeFilter<"User"> | Date | string
    events?: EventListRelationFilter
    rsvps?: RSVPListRelationFilter
    comments?: CommentListRelationFilter
    messageLogs?: MessageLogListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    phoneE164?: SortOrder
    displayName?: SortOrderInput | SortOrder
    preferredLanguage?: SortOrder
    role?: SortOrder
    notificationsMuted?: SortOrder
    createdAt?: SortOrder
    events?: EventOrderByRelationAggregateInput
    rsvps?: RSVPOrderByRelationAggregateInput
    comments?: CommentOrderByRelationAggregateInput
    messageLogs?: MessageLogOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    phoneE164?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    passwordHash?: StringFilter<"User"> | string
    displayName?: StringNullableFilter<"User"> | string | null
    preferredLanguage?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    notificationsMuted?: BoolFilter<"User"> | boolean
    createdAt?: DateTimeFilter<"User"> | Date | string
    events?: EventListRelationFilter
    rsvps?: RSVPListRelationFilter
    comments?: CommentListRelationFilter
    messageLogs?: MessageLogListRelationFilter
  }, "id" | "email" | "phoneE164">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    phoneE164?: SortOrder
    displayName?: SortOrderInput | SortOrder
    preferredLanguage?: SortOrder
    role?: SortOrder
    notificationsMuted?: SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    phoneE164?: StringWithAggregatesFilter<"User"> | string
    displayName?: StringNullableWithAggregatesFilter<"User"> | string | null
    preferredLanguage?: StringWithAggregatesFilter<"User"> | string
    role?: EnumRoleWithAggregatesFilter<"User"> | $Enums.Role
    notificationsMuted?: BoolWithAggregatesFilter<"User"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type EventWhereInput = {
    AND?: EventWhereInput | EventWhereInput[]
    OR?: EventWhereInput[]
    NOT?: EventWhereInput | EventWhereInput[]
    id?: StringFilter<"Event"> | string
    createdById?: StringFilter<"Event"> | string
    coverImageUrl?: StringNullableFilter<"Event"> | string | null
    title_en?: StringFilter<"Event"> | string
    title_zh?: StringFilter<"Event"> | string
    description_en?: StringFilter<"Event"> | string
    description_zh?: StringFilter<"Event"> | string
    location_en?: StringFilter<"Event"> | string
    location_zh?: StringFilter<"Event"> | string
    startAt?: DateTimeFilter<"Event"> | Date | string
    endAt?: DateTimeNullableFilter<"Event"> | Date | string | null
    timezone?: StringFilter<"Event"> | string
    feeAmount?: DecimalNullableFilter<"Event"> | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFilter<"Event"> | string
    createdAt?: DateTimeFilter<"Event"> | Date | string
    updatedAt?: DateTimeFilter<"Event"> | Date | string
    createdBy?: XOR<UserRelationFilter, UserWhereInput>
    rsvps?: RSVPListRelationFilter
    comments?: CommentListRelationFilter
    reminderRules?: ReminderRuleListRelationFilter
    messageLogs?: MessageLogListRelationFilter
  }

  export type EventOrderByWithRelationInput = {
    id?: SortOrder
    createdById?: SortOrder
    coverImageUrl?: SortOrderInput | SortOrder
    title_en?: SortOrder
    title_zh?: SortOrder
    description_en?: SortOrder
    description_zh?: SortOrder
    location_en?: SortOrder
    location_zh?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrderInput | SortOrder
    timezone?: SortOrder
    feeAmount?: SortOrderInput | SortOrder
    feeCurrency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdBy?: UserOrderByWithRelationInput
    rsvps?: RSVPOrderByRelationAggregateInput
    comments?: CommentOrderByRelationAggregateInput
    reminderRules?: ReminderRuleOrderByRelationAggregateInput
    messageLogs?: MessageLogOrderByRelationAggregateInput
  }

  export type EventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EventWhereInput | EventWhereInput[]
    OR?: EventWhereInput[]
    NOT?: EventWhereInput | EventWhereInput[]
    createdById?: StringFilter<"Event"> | string
    coverImageUrl?: StringNullableFilter<"Event"> | string | null
    title_en?: StringFilter<"Event"> | string
    title_zh?: StringFilter<"Event"> | string
    description_en?: StringFilter<"Event"> | string
    description_zh?: StringFilter<"Event"> | string
    location_en?: StringFilter<"Event"> | string
    location_zh?: StringFilter<"Event"> | string
    startAt?: DateTimeFilter<"Event"> | Date | string
    endAt?: DateTimeNullableFilter<"Event"> | Date | string | null
    timezone?: StringFilter<"Event"> | string
    feeAmount?: DecimalNullableFilter<"Event"> | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFilter<"Event"> | string
    createdAt?: DateTimeFilter<"Event"> | Date | string
    updatedAt?: DateTimeFilter<"Event"> | Date | string
    createdBy?: XOR<UserRelationFilter, UserWhereInput>
    rsvps?: RSVPListRelationFilter
    comments?: CommentListRelationFilter
    reminderRules?: ReminderRuleListRelationFilter
    messageLogs?: MessageLogListRelationFilter
  }, "id">

  export type EventOrderByWithAggregationInput = {
    id?: SortOrder
    createdById?: SortOrder
    coverImageUrl?: SortOrderInput | SortOrder
    title_en?: SortOrder
    title_zh?: SortOrder
    description_en?: SortOrder
    description_zh?: SortOrder
    location_en?: SortOrder
    location_zh?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrderInput | SortOrder
    timezone?: SortOrder
    feeAmount?: SortOrderInput | SortOrder
    feeCurrency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: EventCountOrderByAggregateInput
    _avg?: EventAvgOrderByAggregateInput
    _max?: EventMaxOrderByAggregateInput
    _min?: EventMinOrderByAggregateInput
    _sum?: EventSumOrderByAggregateInput
  }

  export type EventScalarWhereWithAggregatesInput = {
    AND?: EventScalarWhereWithAggregatesInput | EventScalarWhereWithAggregatesInput[]
    OR?: EventScalarWhereWithAggregatesInput[]
    NOT?: EventScalarWhereWithAggregatesInput | EventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Event"> | string
    createdById?: StringWithAggregatesFilter<"Event"> | string
    coverImageUrl?: StringNullableWithAggregatesFilter<"Event"> | string | null
    title_en?: StringWithAggregatesFilter<"Event"> | string
    title_zh?: StringWithAggregatesFilter<"Event"> | string
    description_en?: StringWithAggregatesFilter<"Event"> | string
    description_zh?: StringWithAggregatesFilter<"Event"> | string
    location_en?: StringWithAggregatesFilter<"Event"> | string
    location_zh?: StringWithAggregatesFilter<"Event"> | string
    startAt?: DateTimeWithAggregatesFilter<"Event"> | Date | string
    endAt?: DateTimeNullableWithAggregatesFilter<"Event"> | Date | string | null
    timezone?: StringWithAggregatesFilter<"Event"> | string
    feeAmount?: DecimalNullableWithAggregatesFilter<"Event"> | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringWithAggregatesFilter<"Event"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Event"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Event"> | Date | string
  }

  export type RSVPWhereInput = {
    AND?: RSVPWhereInput | RSVPWhereInput[]
    OR?: RSVPWhereInput[]
    NOT?: RSVPWhereInput | RSVPWhereInput[]
    id?: StringFilter<"RSVP"> | string
    eventId?: StringFilter<"RSVP"> | string
    userId?: StringFilter<"RSVP"> | string
    status?: EnumRSVPStatusFilter<"RSVP"> | $Enums.RSVPStatus
    updatedAt?: DateTimeFilter<"RSVP"> | Date | string
    event?: XOR<EventRelationFilter, EventWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type RSVPOrderByWithRelationInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    updatedAt?: SortOrder
    event?: EventOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type RSVPWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    eventId_userId?: RSVPEventIdUserIdCompoundUniqueInput
    AND?: RSVPWhereInput | RSVPWhereInput[]
    OR?: RSVPWhereInput[]
    NOT?: RSVPWhereInput | RSVPWhereInput[]
    eventId?: StringFilter<"RSVP"> | string
    userId?: StringFilter<"RSVP"> | string
    status?: EnumRSVPStatusFilter<"RSVP"> | $Enums.RSVPStatus
    updatedAt?: DateTimeFilter<"RSVP"> | Date | string
    event?: XOR<EventRelationFilter, EventWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id" | "eventId_userId">

  export type RSVPOrderByWithAggregationInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    updatedAt?: SortOrder
    _count?: RSVPCountOrderByAggregateInput
    _max?: RSVPMaxOrderByAggregateInput
    _min?: RSVPMinOrderByAggregateInput
  }

  export type RSVPScalarWhereWithAggregatesInput = {
    AND?: RSVPScalarWhereWithAggregatesInput | RSVPScalarWhereWithAggregatesInput[]
    OR?: RSVPScalarWhereWithAggregatesInput[]
    NOT?: RSVPScalarWhereWithAggregatesInput | RSVPScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RSVP"> | string
    eventId?: StringWithAggregatesFilter<"RSVP"> | string
    userId?: StringWithAggregatesFilter<"RSVP"> | string
    status?: EnumRSVPStatusWithAggregatesFilter<"RSVP"> | $Enums.RSVPStatus
    updatedAt?: DateTimeWithAggregatesFilter<"RSVP"> | Date | string
  }

  export type CommentWhereInput = {
    AND?: CommentWhereInput | CommentWhereInput[]
    OR?: CommentWhereInput[]
    NOT?: CommentWhereInput | CommentWhereInput[]
    id?: StringFilter<"Comment"> | string
    eventId?: StringFilter<"Comment"> | string
    userId?: StringFilter<"Comment"> | string
    body?: StringFilter<"Comment"> | string
    createdAt?: DateTimeFilter<"Comment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Comment"> | Date | string | null
    event?: XOR<EventRelationFilter, EventWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type CommentOrderByWithRelationInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    body?: SortOrder
    createdAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    event?: EventOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type CommentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CommentWhereInput | CommentWhereInput[]
    OR?: CommentWhereInput[]
    NOT?: CommentWhereInput | CommentWhereInput[]
    eventId?: StringFilter<"Comment"> | string
    userId?: StringFilter<"Comment"> | string
    body?: StringFilter<"Comment"> | string
    createdAt?: DateTimeFilter<"Comment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Comment"> | Date | string | null
    event?: XOR<EventRelationFilter, EventWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type CommentOrderByWithAggregationInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    body?: SortOrder
    createdAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: CommentCountOrderByAggregateInput
    _max?: CommentMaxOrderByAggregateInput
    _min?: CommentMinOrderByAggregateInput
  }

  export type CommentScalarWhereWithAggregatesInput = {
    AND?: CommentScalarWhereWithAggregatesInput | CommentScalarWhereWithAggregatesInput[]
    OR?: CommentScalarWhereWithAggregatesInput[]
    NOT?: CommentScalarWhereWithAggregatesInput | CommentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Comment"> | string
    eventId?: StringWithAggregatesFilter<"Comment"> | string
    userId?: StringWithAggregatesFilter<"Comment"> | string
    body?: StringWithAggregatesFilter<"Comment"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Comment"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Comment"> | Date | string | null
  }

  export type ReminderRuleWhereInput = {
    AND?: ReminderRuleWhereInput | ReminderRuleWhereInput[]
    OR?: ReminderRuleWhereInput[]
    NOT?: ReminderRuleWhereInput | ReminderRuleWhereInput[]
    id?: StringFilter<"ReminderRule"> | string
    eventId?: StringFilter<"ReminderRule"> | string
    offsetMinutes?: IntFilter<"ReminderRule"> | number
    channels?: JsonFilter<"ReminderRule">
    enabled?: BoolFilter<"ReminderRule"> | boolean
    event?: XOR<EventRelationFilter, EventWhereInput>
  }

  export type ReminderRuleOrderByWithRelationInput = {
    id?: SortOrder
    eventId?: SortOrder
    offsetMinutes?: SortOrder
    channels?: SortOrder
    enabled?: SortOrder
    event?: EventOrderByWithRelationInput
  }

  export type ReminderRuleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    eventId_offsetMinutes?: ReminderRuleEventIdOffsetMinutesCompoundUniqueInput
    AND?: ReminderRuleWhereInput | ReminderRuleWhereInput[]
    OR?: ReminderRuleWhereInput[]
    NOT?: ReminderRuleWhereInput | ReminderRuleWhereInput[]
    eventId?: StringFilter<"ReminderRule"> | string
    offsetMinutes?: IntFilter<"ReminderRule"> | number
    channels?: JsonFilter<"ReminderRule">
    enabled?: BoolFilter<"ReminderRule"> | boolean
    event?: XOR<EventRelationFilter, EventWhereInput>
  }, "id" | "eventId_offsetMinutes">

  export type ReminderRuleOrderByWithAggregationInput = {
    id?: SortOrder
    eventId?: SortOrder
    offsetMinutes?: SortOrder
    channels?: SortOrder
    enabled?: SortOrder
    _count?: ReminderRuleCountOrderByAggregateInput
    _avg?: ReminderRuleAvgOrderByAggregateInput
    _max?: ReminderRuleMaxOrderByAggregateInput
    _min?: ReminderRuleMinOrderByAggregateInput
    _sum?: ReminderRuleSumOrderByAggregateInput
  }

  export type ReminderRuleScalarWhereWithAggregatesInput = {
    AND?: ReminderRuleScalarWhereWithAggregatesInput | ReminderRuleScalarWhereWithAggregatesInput[]
    OR?: ReminderRuleScalarWhereWithAggregatesInput[]
    NOT?: ReminderRuleScalarWhereWithAggregatesInput | ReminderRuleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ReminderRule"> | string
    eventId?: StringWithAggregatesFilter<"ReminderRule"> | string
    offsetMinutes?: IntWithAggregatesFilter<"ReminderRule"> | number
    channels?: JsonWithAggregatesFilter<"ReminderRule">
    enabled?: BoolWithAggregatesFilter<"ReminderRule"> | boolean
  }

  export type MessageLogWhereInput = {
    AND?: MessageLogWhereInput | MessageLogWhereInput[]
    OR?: MessageLogWhereInput[]
    NOT?: MessageLogWhereInput | MessageLogWhereInput[]
    id?: StringFilter<"MessageLog"> | string
    eventId?: StringNullableFilter<"MessageLog"> | string | null
    userId?: StringFilter<"MessageLog"> | string
    channel?: EnumMessageChannelFilter<"MessageLog"> | $Enums.MessageChannel
    toAddress?: StringFilter<"MessageLog"> | string
    payload?: JsonFilter<"MessageLog">
    status?: EnumMessageStatusFilter<"MessageLog"> | $Enums.MessageStatus
    providerMessageId?: StringNullableFilter<"MessageLog"> | string | null
    createdAt?: DateTimeFilter<"MessageLog"> | Date | string
    event?: XOR<EventNullableRelationFilter, EventWhereInput> | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type MessageLogOrderByWithRelationInput = {
    id?: SortOrder
    eventId?: SortOrderInput | SortOrder
    userId?: SortOrder
    channel?: SortOrder
    toAddress?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    providerMessageId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    event?: EventOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type MessageLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MessageLogWhereInput | MessageLogWhereInput[]
    OR?: MessageLogWhereInput[]
    NOT?: MessageLogWhereInput | MessageLogWhereInput[]
    eventId?: StringNullableFilter<"MessageLog"> | string | null
    userId?: StringFilter<"MessageLog"> | string
    channel?: EnumMessageChannelFilter<"MessageLog"> | $Enums.MessageChannel
    toAddress?: StringFilter<"MessageLog"> | string
    payload?: JsonFilter<"MessageLog">
    status?: EnumMessageStatusFilter<"MessageLog"> | $Enums.MessageStatus
    providerMessageId?: StringNullableFilter<"MessageLog"> | string | null
    createdAt?: DateTimeFilter<"MessageLog"> | Date | string
    event?: XOR<EventNullableRelationFilter, EventWhereInput> | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type MessageLogOrderByWithAggregationInput = {
    id?: SortOrder
    eventId?: SortOrderInput | SortOrder
    userId?: SortOrder
    channel?: SortOrder
    toAddress?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    providerMessageId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: MessageLogCountOrderByAggregateInput
    _max?: MessageLogMaxOrderByAggregateInput
    _min?: MessageLogMinOrderByAggregateInput
  }

  export type MessageLogScalarWhereWithAggregatesInput = {
    AND?: MessageLogScalarWhereWithAggregatesInput | MessageLogScalarWhereWithAggregatesInput[]
    OR?: MessageLogScalarWhereWithAggregatesInput[]
    NOT?: MessageLogScalarWhereWithAggregatesInput | MessageLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MessageLog"> | string
    eventId?: StringNullableWithAggregatesFilter<"MessageLog"> | string | null
    userId?: StringWithAggregatesFilter<"MessageLog"> | string
    channel?: EnumMessageChannelWithAggregatesFilter<"MessageLog"> | $Enums.MessageChannel
    toAddress?: StringWithAggregatesFilter<"MessageLog"> | string
    payload?: JsonWithAggregatesFilter<"MessageLog">
    status?: EnumMessageStatusWithAggregatesFilter<"MessageLog"> | $Enums.MessageStatus
    providerMessageId?: StringNullableWithAggregatesFilter<"MessageLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"MessageLog"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPCreateNestedManyWithoutUserInput
    comments?: CommentCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventUncheckedCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPUncheckedCreateNestedManyWithoutUserInput
    comments?: CommentUncheckedCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUpdateManyWithoutUserNestedInput
    comments?: CommentUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUncheckedUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUncheckedUpdateManyWithoutUserNestedInput
    comments?: CommentUncheckedUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventCreateInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutEventsInput
    rsvps?: RSVPCreateNestedManyWithoutEventInput
    comments?: CommentCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutEventInput
    comments?: CommentUncheckedCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleUncheckedCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutEventsNestedInput
    rsvps?: RSVPUpdateManyWithoutEventNestedInput
    comments?: CommentUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutEventNestedInput
    comments?: CommentUncheckedUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUncheckedUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutEventNestedInput
  }

  export type EventCreateManyInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPCreateInput = {
    id?: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
    event: EventCreateNestedOneWithoutRsvpsInput
    user: UserCreateNestedOneWithoutRsvpsInput
  }

  export type RSVPUncheckedCreateInput = {
    id?: string
    eventId: string
    userId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type RSVPUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    event?: EventUpdateOneRequiredWithoutRsvpsNestedInput
    user?: UserUpdateOneRequiredWithoutRsvpsNestedInput
  }

  export type RSVPUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPCreateManyInput = {
    id?: string
    eventId: string
    userId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type RSVPUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CommentCreateInput = {
    id?: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
    event: EventCreateNestedOneWithoutCommentsInput
    user: UserCreateNestedOneWithoutCommentsInput
  }

  export type CommentUncheckedCreateInput = {
    id?: string
    eventId: string
    userId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type CommentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    event?: EventUpdateOneRequiredWithoutCommentsNestedInput
    user?: UserUpdateOneRequiredWithoutCommentsNestedInput
  }

  export type CommentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CommentCreateManyInput = {
    id?: string
    eventId: string
    userId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type CommentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CommentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ReminderRuleCreateInput = {
    id?: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
    event: EventCreateNestedOneWithoutReminderRulesInput
  }

  export type ReminderRuleUncheckedCreateInput = {
    id?: string
    eventId: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
  }

  export type ReminderRuleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
    event?: EventUpdateOneRequiredWithoutReminderRulesNestedInput
  }

  export type ReminderRuleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReminderRuleCreateManyInput = {
    id?: string
    eventId: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
  }

  export type ReminderRuleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReminderRuleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type MessageLogCreateInput = {
    id?: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
    event?: EventCreateNestedOneWithoutMessageLogsInput
    user: UserCreateNestedOneWithoutMessageLogsInput
  }

  export type MessageLogUncheckedCreateInput = {
    id?: string
    eventId?: string | null
    userId: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type MessageLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    event?: EventUpdateOneWithoutMessageLogsNestedInput
    user?: UserUpdateOneRequiredWithoutMessageLogsNestedInput
  }

  export type MessageLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageLogCreateManyInput = {
    id?: string
    eventId?: string | null
    userId: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type MessageLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type EventListRelationFilter = {
    every?: EventWhereInput
    some?: EventWhereInput
    none?: EventWhereInput
  }

  export type RSVPListRelationFilter = {
    every?: RSVPWhereInput
    some?: RSVPWhereInput
    none?: RSVPWhereInput
  }

  export type CommentListRelationFilter = {
    every?: CommentWhereInput
    some?: CommentWhereInput
    none?: CommentWhereInput
  }

  export type MessageLogListRelationFilter = {
    every?: MessageLogWhereInput
    some?: MessageLogWhereInput
    none?: MessageLogWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type EventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RSVPOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CommentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MessageLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    phoneE164?: SortOrder
    displayName?: SortOrder
    preferredLanguage?: SortOrder
    role?: SortOrder
    notificationsMuted?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    phoneE164?: SortOrder
    displayName?: SortOrder
    preferredLanguage?: SortOrder
    role?: SortOrder
    notificationsMuted?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    phoneE164?: SortOrder
    displayName?: SortOrder
    preferredLanguage?: SortOrder
    role?: SortOrder
    notificationsMuted?: SortOrder
    createdAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type ReminderRuleListRelationFilter = {
    every?: ReminderRuleWhereInput
    some?: ReminderRuleWhereInput
    none?: ReminderRuleWhereInput
  }

  export type ReminderRuleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EventCountOrderByAggregateInput = {
    id?: SortOrder
    createdById?: SortOrder
    coverImageUrl?: SortOrder
    title_en?: SortOrder
    title_zh?: SortOrder
    description_en?: SortOrder
    description_zh?: SortOrder
    location_en?: SortOrder
    location_zh?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    timezone?: SortOrder
    feeAmount?: SortOrder
    feeCurrency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EventAvgOrderByAggregateInput = {
    feeAmount?: SortOrder
  }

  export type EventMaxOrderByAggregateInput = {
    id?: SortOrder
    createdById?: SortOrder
    coverImageUrl?: SortOrder
    title_en?: SortOrder
    title_zh?: SortOrder
    description_en?: SortOrder
    description_zh?: SortOrder
    location_en?: SortOrder
    location_zh?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    timezone?: SortOrder
    feeAmount?: SortOrder
    feeCurrency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EventMinOrderByAggregateInput = {
    id?: SortOrder
    createdById?: SortOrder
    coverImageUrl?: SortOrder
    title_en?: SortOrder
    title_zh?: SortOrder
    description_en?: SortOrder
    description_zh?: SortOrder
    location_en?: SortOrder
    location_zh?: SortOrder
    startAt?: SortOrder
    endAt?: SortOrder
    timezone?: SortOrder
    feeAmount?: SortOrder
    feeCurrency?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EventSumOrderByAggregateInput = {
    feeAmount?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumRSVPStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RSVPStatus | EnumRSVPStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRSVPStatusFilter<$PrismaModel> | $Enums.RSVPStatus
  }

  export type EventRelationFilter = {
    is?: EventWhereInput
    isNot?: EventWhereInput
  }

  export type RSVPEventIdUserIdCompoundUniqueInput = {
    eventId: string
    userId: string
  }

  export type RSVPCountOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    updatedAt?: SortOrder
  }

  export type RSVPMaxOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    updatedAt?: SortOrder
  }

  export type RSVPMinOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumRSVPStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RSVPStatus | EnumRSVPStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRSVPStatusWithAggregatesFilter<$PrismaModel> | $Enums.RSVPStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRSVPStatusFilter<$PrismaModel>
    _max?: NestedEnumRSVPStatusFilter<$PrismaModel>
  }

  export type CommentCountOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    body?: SortOrder
    createdAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type CommentMaxOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    body?: SortOrder
    createdAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type CommentMinOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    body?: SortOrder
    createdAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ReminderRuleEventIdOffsetMinutesCompoundUniqueInput = {
    eventId: string
    offsetMinutes: number
  }

  export type ReminderRuleCountOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    offsetMinutes?: SortOrder
    channels?: SortOrder
    enabled?: SortOrder
  }

  export type ReminderRuleAvgOrderByAggregateInput = {
    offsetMinutes?: SortOrder
  }

  export type ReminderRuleMaxOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    offsetMinutes?: SortOrder
    enabled?: SortOrder
  }

  export type ReminderRuleMinOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    offsetMinutes?: SortOrder
    enabled?: SortOrder
  }

  export type ReminderRuleSumOrderByAggregateInput = {
    offsetMinutes?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumMessageChannelFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageChannel | EnumMessageChannelFieldRefInput<$PrismaModel>
    in?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageChannelFilter<$PrismaModel> | $Enums.MessageChannel
  }

  export type EnumMessageStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageStatus | EnumMessageStatusFieldRefInput<$PrismaModel>
    in?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageStatusFilter<$PrismaModel> | $Enums.MessageStatus
  }

  export type EventNullableRelationFilter = {
    is?: EventWhereInput | null
    isNot?: EventWhereInput | null
  }

  export type MessageLogCountOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    channel?: SortOrder
    toAddress?: SortOrder
    payload?: SortOrder
    status?: SortOrder
    providerMessageId?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageLogMaxOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    channel?: SortOrder
    toAddress?: SortOrder
    status?: SortOrder
    providerMessageId?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageLogMinOrderByAggregateInput = {
    id?: SortOrder
    eventId?: SortOrder
    userId?: SortOrder
    channel?: SortOrder
    toAddress?: SortOrder
    status?: SortOrder
    providerMessageId?: SortOrder
    createdAt?: SortOrder
  }

  export type EnumMessageChannelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageChannel | EnumMessageChannelFieldRefInput<$PrismaModel>
    in?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageChannelWithAggregatesFilter<$PrismaModel> | $Enums.MessageChannel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageChannelFilter<$PrismaModel>
    _max?: NestedEnumMessageChannelFilter<$PrismaModel>
  }

  export type EnumMessageStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageStatus | EnumMessageStatusFieldRefInput<$PrismaModel>
    in?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageStatusWithAggregatesFilter<$PrismaModel> | $Enums.MessageStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageStatusFilter<$PrismaModel>
    _max?: NestedEnumMessageStatusFilter<$PrismaModel>
  }

  export type EventCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput> | EventCreateWithoutCreatedByInput[] | EventUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: EventCreateOrConnectWithoutCreatedByInput | EventCreateOrConnectWithoutCreatedByInput[]
    createMany?: EventCreateManyCreatedByInputEnvelope
    connect?: EventWhereUniqueInput | EventWhereUniqueInput[]
  }

  export type RSVPCreateNestedManyWithoutUserInput = {
    create?: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput> | RSVPCreateWithoutUserInput[] | RSVPUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutUserInput | RSVPCreateOrConnectWithoutUserInput[]
    createMany?: RSVPCreateManyUserInputEnvelope
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
  }

  export type CommentCreateNestedManyWithoutUserInput = {
    create?: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput> | CommentCreateWithoutUserInput[] | CommentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutUserInput | CommentCreateOrConnectWithoutUserInput[]
    createMany?: CommentCreateManyUserInputEnvelope
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
  }

  export type MessageLogCreateNestedManyWithoutUserInput = {
    create?: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput> | MessageLogCreateWithoutUserInput[] | MessageLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutUserInput | MessageLogCreateOrConnectWithoutUserInput[]
    createMany?: MessageLogCreateManyUserInputEnvelope
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
  }

  export type EventUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput> | EventCreateWithoutCreatedByInput[] | EventUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: EventCreateOrConnectWithoutCreatedByInput | EventCreateOrConnectWithoutCreatedByInput[]
    createMany?: EventCreateManyCreatedByInputEnvelope
    connect?: EventWhereUniqueInput | EventWhereUniqueInput[]
  }

  export type RSVPUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput> | RSVPCreateWithoutUserInput[] | RSVPUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutUserInput | RSVPCreateOrConnectWithoutUserInput[]
    createMany?: RSVPCreateManyUserInputEnvelope
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
  }

  export type CommentUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput> | CommentCreateWithoutUserInput[] | CommentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutUserInput | CommentCreateOrConnectWithoutUserInput[]
    createMany?: CommentCreateManyUserInputEnvelope
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
  }

  export type MessageLogUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput> | MessageLogCreateWithoutUserInput[] | MessageLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutUserInput | MessageLogCreateOrConnectWithoutUserInput[]
    createMany?: MessageLogCreateManyUserInputEnvelope
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumRoleFieldUpdateOperationsInput = {
    set?: $Enums.Role
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type EventUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput> | EventCreateWithoutCreatedByInput[] | EventUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: EventCreateOrConnectWithoutCreatedByInput | EventCreateOrConnectWithoutCreatedByInput[]
    upsert?: EventUpsertWithWhereUniqueWithoutCreatedByInput | EventUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: EventCreateManyCreatedByInputEnvelope
    set?: EventWhereUniqueInput | EventWhereUniqueInput[]
    disconnect?: EventWhereUniqueInput | EventWhereUniqueInput[]
    delete?: EventWhereUniqueInput | EventWhereUniqueInput[]
    connect?: EventWhereUniqueInput | EventWhereUniqueInput[]
    update?: EventUpdateWithWhereUniqueWithoutCreatedByInput | EventUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: EventUpdateManyWithWhereWithoutCreatedByInput | EventUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: EventScalarWhereInput | EventScalarWhereInput[]
  }

  export type RSVPUpdateManyWithoutUserNestedInput = {
    create?: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput> | RSVPCreateWithoutUserInput[] | RSVPUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutUserInput | RSVPCreateOrConnectWithoutUserInput[]
    upsert?: RSVPUpsertWithWhereUniqueWithoutUserInput | RSVPUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RSVPCreateManyUserInputEnvelope
    set?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    disconnect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    delete?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    update?: RSVPUpdateWithWhereUniqueWithoutUserInput | RSVPUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RSVPUpdateManyWithWhereWithoutUserInput | RSVPUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
  }

  export type CommentUpdateManyWithoutUserNestedInput = {
    create?: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput> | CommentCreateWithoutUserInput[] | CommentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutUserInput | CommentCreateOrConnectWithoutUserInput[]
    upsert?: CommentUpsertWithWhereUniqueWithoutUserInput | CommentUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CommentCreateManyUserInputEnvelope
    set?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    disconnect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    delete?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    update?: CommentUpdateWithWhereUniqueWithoutUserInput | CommentUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CommentUpdateManyWithWhereWithoutUserInput | CommentUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CommentScalarWhereInput | CommentScalarWhereInput[]
  }

  export type MessageLogUpdateManyWithoutUserNestedInput = {
    create?: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput> | MessageLogCreateWithoutUserInput[] | MessageLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutUserInput | MessageLogCreateOrConnectWithoutUserInput[]
    upsert?: MessageLogUpsertWithWhereUniqueWithoutUserInput | MessageLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MessageLogCreateManyUserInputEnvelope
    set?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    disconnect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    delete?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    update?: MessageLogUpdateWithWhereUniqueWithoutUserInput | MessageLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MessageLogUpdateManyWithWhereWithoutUserInput | MessageLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
  }

  export type EventUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput> | EventCreateWithoutCreatedByInput[] | EventUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: EventCreateOrConnectWithoutCreatedByInput | EventCreateOrConnectWithoutCreatedByInput[]
    upsert?: EventUpsertWithWhereUniqueWithoutCreatedByInput | EventUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: EventCreateManyCreatedByInputEnvelope
    set?: EventWhereUniqueInput | EventWhereUniqueInput[]
    disconnect?: EventWhereUniqueInput | EventWhereUniqueInput[]
    delete?: EventWhereUniqueInput | EventWhereUniqueInput[]
    connect?: EventWhereUniqueInput | EventWhereUniqueInput[]
    update?: EventUpdateWithWhereUniqueWithoutCreatedByInput | EventUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: EventUpdateManyWithWhereWithoutCreatedByInput | EventUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: EventScalarWhereInput | EventScalarWhereInput[]
  }

  export type RSVPUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput> | RSVPCreateWithoutUserInput[] | RSVPUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutUserInput | RSVPCreateOrConnectWithoutUserInput[]
    upsert?: RSVPUpsertWithWhereUniqueWithoutUserInput | RSVPUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RSVPCreateManyUserInputEnvelope
    set?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    disconnect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    delete?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    update?: RSVPUpdateWithWhereUniqueWithoutUserInput | RSVPUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RSVPUpdateManyWithWhereWithoutUserInput | RSVPUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
  }

  export type CommentUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput> | CommentCreateWithoutUserInput[] | CommentUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutUserInput | CommentCreateOrConnectWithoutUserInput[]
    upsert?: CommentUpsertWithWhereUniqueWithoutUserInput | CommentUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CommentCreateManyUserInputEnvelope
    set?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    disconnect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    delete?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    update?: CommentUpdateWithWhereUniqueWithoutUserInput | CommentUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CommentUpdateManyWithWhereWithoutUserInput | CommentUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CommentScalarWhereInput | CommentScalarWhereInput[]
  }

  export type MessageLogUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput> | MessageLogCreateWithoutUserInput[] | MessageLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutUserInput | MessageLogCreateOrConnectWithoutUserInput[]
    upsert?: MessageLogUpsertWithWhereUniqueWithoutUserInput | MessageLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MessageLogCreateManyUserInputEnvelope
    set?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    disconnect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    delete?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    update?: MessageLogUpdateWithWhereUniqueWithoutUserInput | MessageLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MessageLogUpdateManyWithWhereWithoutUserInput | MessageLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutEventsInput = {
    create?: XOR<UserCreateWithoutEventsInput, UserUncheckedCreateWithoutEventsInput>
    connectOrCreate?: UserCreateOrConnectWithoutEventsInput
    connect?: UserWhereUniqueInput
  }

  export type RSVPCreateNestedManyWithoutEventInput = {
    create?: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput> | RSVPCreateWithoutEventInput[] | RSVPUncheckedCreateWithoutEventInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutEventInput | RSVPCreateOrConnectWithoutEventInput[]
    createMany?: RSVPCreateManyEventInputEnvelope
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
  }

  export type CommentCreateNestedManyWithoutEventInput = {
    create?: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput> | CommentCreateWithoutEventInput[] | CommentUncheckedCreateWithoutEventInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutEventInput | CommentCreateOrConnectWithoutEventInput[]
    createMany?: CommentCreateManyEventInputEnvelope
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
  }

  export type ReminderRuleCreateNestedManyWithoutEventInput = {
    create?: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput> | ReminderRuleCreateWithoutEventInput[] | ReminderRuleUncheckedCreateWithoutEventInput[]
    connectOrCreate?: ReminderRuleCreateOrConnectWithoutEventInput | ReminderRuleCreateOrConnectWithoutEventInput[]
    createMany?: ReminderRuleCreateManyEventInputEnvelope
    connect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
  }

  export type MessageLogCreateNestedManyWithoutEventInput = {
    create?: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput> | MessageLogCreateWithoutEventInput[] | MessageLogUncheckedCreateWithoutEventInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutEventInput | MessageLogCreateOrConnectWithoutEventInput[]
    createMany?: MessageLogCreateManyEventInputEnvelope
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
  }

  export type RSVPUncheckedCreateNestedManyWithoutEventInput = {
    create?: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput> | RSVPCreateWithoutEventInput[] | RSVPUncheckedCreateWithoutEventInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutEventInput | RSVPCreateOrConnectWithoutEventInput[]
    createMany?: RSVPCreateManyEventInputEnvelope
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
  }

  export type CommentUncheckedCreateNestedManyWithoutEventInput = {
    create?: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput> | CommentCreateWithoutEventInput[] | CommentUncheckedCreateWithoutEventInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutEventInput | CommentCreateOrConnectWithoutEventInput[]
    createMany?: CommentCreateManyEventInputEnvelope
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
  }

  export type ReminderRuleUncheckedCreateNestedManyWithoutEventInput = {
    create?: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput> | ReminderRuleCreateWithoutEventInput[] | ReminderRuleUncheckedCreateWithoutEventInput[]
    connectOrCreate?: ReminderRuleCreateOrConnectWithoutEventInput | ReminderRuleCreateOrConnectWithoutEventInput[]
    createMany?: ReminderRuleCreateManyEventInputEnvelope
    connect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
  }

  export type MessageLogUncheckedCreateNestedManyWithoutEventInput = {
    create?: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput> | MessageLogCreateWithoutEventInput[] | MessageLogUncheckedCreateWithoutEventInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutEventInput | MessageLogCreateOrConnectWithoutEventInput[]
    createMany?: MessageLogCreateManyEventInputEnvelope
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type UserUpdateOneRequiredWithoutEventsNestedInput = {
    create?: XOR<UserCreateWithoutEventsInput, UserUncheckedCreateWithoutEventsInput>
    connectOrCreate?: UserCreateOrConnectWithoutEventsInput
    upsert?: UserUpsertWithoutEventsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutEventsInput, UserUpdateWithoutEventsInput>, UserUncheckedUpdateWithoutEventsInput>
  }

  export type RSVPUpdateManyWithoutEventNestedInput = {
    create?: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput> | RSVPCreateWithoutEventInput[] | RSVPUncheckedCreateWithoutEventInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutEventInput | RSVPCreateOrConnectWithoutEventInput[]
    upsert?: RSVPUpsertWithWhereUniqueWithoutEventInput | RSVPUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: RSVPCreateManyEventInputEnvelope
    set?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    disconnect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    delete?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    update?: RSVPUpdateWithWhereUniqueWithoutEventInput | RSVPUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: RSVPUpdateManyWithWhereWithoutEventInput | RSVPUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
  }

  export type CommentUpdateManyWithoutEventNestedInput = {
    create?: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput> | CommentCreateWithoutEventInput[] | CommentUncheckedCreateWithoutEventInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutEventInput | CommentCreateOrConnectWithoutEventInput[]
    upsert?: CommentUpsertWithWhereUniqueWithoutEventInput | CommentUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: CommentCreateManyEventInputEnvelope
    set?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    disconnect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    delete?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    update?: CommentUpdateWithWhereUniqueWithoutEventInput | CommentUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: CommentUpdateManyWithWhereWithoutEventInput | CommentUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: CommentScalarWhereInput | CommentScalarWhereInput[]
  }

  export type ReminderRuleUpdateManyWithoutEventNestedInput = {
    create?: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput> | ReminderRuleCreateWithoutEventInput[] | ReminderRuleUncheckedCreateWithoutEventInput[]
    connectOrCreate?: ReminderRuleCreateOrConnectWithoutEventInput | ReminderRuleCreateOrConnectWithoutEventInput[]
    upsert?: ReminderRuleUpsertWithWhereUniqueWithoutEventInput | ReminderRuleUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: ReminderRuleCreateManyEventInputEnvelope
    set?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    disconnect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    delete?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    connect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    update?: ReminderRuleUpdateWithWhereUniqueWithoutEventInput | ReminderRuleUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: ReminderRuleUpdateManyWithWhereWithoutEventInput | ReminderRuleUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: ReminderRuleScalarWhereInput | ReminderRuleScalarWhereInput[]
  }

  export type MessageLogUpdateManyWithoutEventNestedInput = {
    create?: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput> | MessageLogCreateWithoutEventInput[] | MessageLogUncheckedCreateWithoutEventInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutEventInput | MessageLogCreateOrConnectWithoutEventInput[]
    upsert?: MessageLogUpsertWithWhereUniqueWithoutEventInput | MessageLogUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: MessageLogCreateManyEventInputEnvelope
    set?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    disconnect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    delete?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    update?: MessageLogUpdateWithWhereUniqueWithoutEventInput | MessageLogUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: MessageLogUpdateManyWithWhereWithoutEventInput | MessageLogUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
  }

  export type RSVPUncheckedUpdateManyWithoutEventNestedInput = {
    create?: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput> | RSVPCreateWithoutEventInput[] | RSVPUncheckedCreateWithoutEventInput[]
    connectOrCreate?: RSVPCreateOrConnectWithoutEventInput | RSVPCreateOrConnectWithoutEventInput[]
    upsert?: RSVPUpsertWithWhereUniqueWithoutEventInput | RSVPUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: RSVPCreateManyEventInputEnvelope
    set?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    disconnect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    delete?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    connect?: RSVPWhereUniqueInput | RSVPWhereUniqueInput[]
    update?: RSVPUpdateWithWhereUniqueWithoutEventInput | RSVPUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: RSVPUpdateManyWithWhereWithoutEventInput | RSVPUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
  }

  export type CommentUncheckedUpdateManyWithoutEventNestedInput = {
    create?: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput> | CommentCreateWithoutEventInput[] | CommentUncheckedCreateWithoutEventInput[]
    connectOrCreate?: CommentCreateOrConnectWithoutEventInput | CommentCreateOrConnectWithoutEventInput[]
    upsert?: CommentUpsertWithWhereUniqueWithoutEventInput | CommentUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: CommentCreateManyEventInputEnvelope
    set?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    disconnect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    delete?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    connect?: CommentWhereUniqueInput | CommentWhereUniqueInput[]
    update?: CommentUpdateWithWhereUniqueWithoutEventInput | CommentUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: CommentUpdateManyWithWhereWithoutEventInput | CommentUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: CommentScalarWhereInput | CommentScalarWhereInput[]
  }

  export type ReminderRuleUncheckedUpdateManyWithoutEventNestedInput = {
    create?: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput> | ReminderRuleCreateWithoutEventInput[] | ReminderRuleUncheckedCreateWithoutEventInput[]
    connectOrCreate?: ReminderRuleCreateOrConnectWithoutEventInput | ReminderRuleCreateOrConnectWithoutEventInput[]
    upsert?: ReminderRuleUpsertWithWhereUniqueWithoutEventInput | ReminderRuleUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: ReminderRuleCreateManyEventInputEnvelope
    set?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    disconnect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    delete?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    connect?: ReminderRuleWhereUniqueInput | ReminderRuleWhereUniqueInput[]
    update?: ReminderRuleUpdateWithWhereUniqueWithoutEventInput | ReminderRuleUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: ReminderRuleUpdateManyWithWhereWithoutEventInput | ReminderRuleUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: ReminderRuleScalarWhereInput | ReminderRuleScalarWhereInput[]
  }

  export type MessageLogUncheckedUpdateManyWithoutEventNestedInput = {
    create?: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput> | MessageLogCreateWithoutEventInput[] | MessageLogUncheckedCreateWithoutEventInput[]
    connectOrCreate?: MessageLogCreateOrConnectWithoutEventInput | MessageLogCreateOrConnectWithoutEventInput[]
    upsert?: MessageLogUpsertWithWhereUniqueWithoutEventInput | MessageLogUpsertWithWhereUniqueWithoutEventInput[]
    createMany?: MessageLogCreateManyEventInputEnvelope
    set?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    disconnect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    delete?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    connect?: MessageLogWhereUniqueInput | MessageLogWhereUniqueInput[]
    update?: MessageLogUpdateWithWhereUniqueWithoutEventInput | MessageLogUpdateWithWhereUniqueWithoutEventInput[]
    updateMany?: MessageLogUpdateManyWithWhereWithoutEventInput | MessageLogUpdateManyWithWhereWithoutEventInput[]
    deleteMany?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
  }

  export type EventCreateNestedOneWithoutRsvpsInput = {
    create?: XOR<EventCreateWithoutRsvpsInput, EventUncheckedCreateWithoutRsvpsInput>
    connectOrCreate?: EventCreateOrConnectWithoutRsvpsInput
    connect?: EventWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutRsvpsInput = {
    create?: XOR<UserCreateWithoutRsvpsInput, UserUncheckedCreateWithoutRsvpsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRsvpsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumRSVPStatusFieldUpdateOperationsInput = {
    set?: $Enums.RSVPStatus
  }

  export type EventUpdateOneRequiredWithoutRsvpsNestedInput = {
    create?: XOR<EventCreateWithoutRsvpsInput, EventUncheckedCreateWithoutRsvpsInput>
    connectOrCreate?: EventCreateOrConnectWithoutRsvpsInput
    upsert?: EventUpsertWithoutRsvpsInput
    connect?: EventWhereUniqueInput
    update?: XOR<XOR<EventUpdateToOneWithWhereWithoutRsvpsInput, EventUpdateWithoutRsvpsInput>, EventUncheckedUpdateWithoutRsvpsInput>
  }

  export type UserUpdateOneRequiredWithoutRsvpsNestedInput = {
    create?: XOR<UserCreateWithoutRsvpsInput, UserUncheckedCreateWithoutRsvpsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRsvpsInput
    upsert?: UserUpsertWithoutRsvpsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRsvpsInput, UserUpdateWithoutRsvpsInput>, UserUncheckedUpdateWithoutRsvpsInput>
  }

  export type EventCreateNestedOneWithoutCommentsInput = {
    create?: XOR<EventCreateWithoutCommentsInput, EventUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: EventCreateOrConnectWithoutCommentsInput
    connect?: EventWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutCommentsInput = {
    create?: XOR<UserCreateWithoutCommentsInput, UserUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCommentsInput
    connect?: UserWhereUniqueInput
  }

  export type EventUpdateOneRequiredWithoutCommentsNestedInput = {
    create?: XOR<EventCreateWithoutCommentsInput, EventUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: EventCreateOrConnectWithoutCommentsInput
    upsert?: EventUpsertWithoutCommentsInput
    connect?: EventWhereUniqueInput
    update?: XOR<XOR<EventUpdateToOneWithWhereWithoutCommentsInput, EventUpdateWithoutCommentsInput>, EventUncheckedUpdateWithoutCommentsInput>
  }

  export type UserUpdateOneRequiredWithoutCommentsNestedInput = {
    create?: XOR<UserCreateWithoutCommentsInput, UserUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutCommentsInput
    upsert?: UserUpsertWithoutCommentsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCommentsInput, UserUpdateWithoutCommentsInput>, UserUncheckedUpdateWithoutCommentsInput>
  }

  export type EventCreateNestedOneWithoutReminderRulesInput = {
    create?: XOR<EventCreateWithoutReminderRulesInput, EventUncheckedCreateWithoutReminderRulesInput>
    connectOrCreate?: EventCreateOrConnectWithoutReminderRulesInput
    connect?: EventWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EventUpdateOneRequiredWithoutReminderRulesNestedInput = {
    create?: XOR<EventCreateWithoutReminderRulesInput, EventUncheckedCreateWithoutReminderRulesInput>
    connectOrCreate?: EventCreateOrConnectWithoutReminderRulesInput
    upsert?: EventUpsertWithoutReminderRulesInput
    connect?: EventWhereUniqueInput
    update?: XOR<XOR<EventUpdateToOneWithWhereWithoutReminderRulesInput, EventUpdateWithoutReminderRulesInput>, EventUncheckedUpdateWithoutReminderRulesInput>
  }

  export type EventCreateNestedOneWithoutMessageLogsInput = {
    create?: XOR<EventCreateWithoutMessageLogsInput, EventUncheckedCreateWithoutMessageLogsInput>
    connectOrCreate?: EventCreateOrConnectWithoutMessageLogsInput
    connect?: EventWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutMessageLogsInput = {
    create?: XOR<UserCreateWithoutMessageLogsInput, UserUncheckedCreateWithoutMessageLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutMessageLogsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumMessageChannelFieldUpdateOperationsInput = {
    set?: $Enums.MessageChannel
  }

  export type EnumMessageStatusFieldUpdateOperationsInput = {
    set?: $Enums.MessageStatus
  }

  export type EventUpdateOneWithoutMessageLogsNestedInput = {
    create?: XOR<EventCreateWithoutMessageLogsInput, EventUncheckedCreateWithoutMessageLogsInput>
    connectOrCreate?: EventCreateOrConnectWithoutMessageLogsInput
    upsert?: EventUpsertWithoutMessageLogsInput
    disconnect?: EventWhereInput | boolean
    delete?: EventWhereInput | boolean
    connect?: EventWhereUniqueInput
    update?: XOR<XOR<EventUpdateToOneWithWhereWithoutMessageLogsInput, EventUpdateWithoutMessageLogsInput>, EventUncheckedUpdateWithoutMessageLogsInput>
  }

  export type UserUpdateOneRequiredWithoutMessageLogsNestedInput = {
    create?: XOR<UserCreateWithoutMessageLogsInput, UserUncheckedCreateWithoutMessageLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutMessageLogsInput
    upsert?: UserUpsertWithoutMessageLogsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutMessageLogsInput, UserUpdateWithoutMessageLogsInput>, UserUncheckedUpdateWithoutMessageLogsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumRSVPStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RSVPStatus | EnumRSVPStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRSVPStatusFilter<$PrismaModel> | $Enums.RSVPStatus
  }

  export type NestedEnumRSVPStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RSVPStatus | EnumRSVPStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RSVPStatus[] | ListEnumRSVPStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRSVPStatusWithAggregatesFilter<$PrismaModel> | $Enums.RSVPStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRSVPStatusFilter<$PrismaModel>
    _max?: NestedEnumRSVPStatusFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumMessageChannelFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageChannel | EnumMessageChannelFieldRefInput<$PrismaModel>
    in?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageChannelFilter<$PrismaModel> | $Enums.MessageChannel
  }

  export type NestedEnumMessageStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageStatus | EnumMessageStatusFieldRefInput<$PrismaModel>
    in?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageStatusFilter<$PrismaModel> | $Enums.MessageStatus
  }

  export type NestedEnumMessageChannelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageChannel | EnumMessageChannelFieldRefInput<$PrismaModel>
    in?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageChannel[] | ListEnumMessageChannelFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageChannelWithAggregatesFilter<$PrismaModel> | $Enums.MessageChannel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageChannelFilter<$PrismaModel>
    _max?: NestedEnumMessageChannelFilter<$PrismaModel>
  }

  export type NestedEnumMessageStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageStatus | EnumMessageStatusFieldRefInput<$PrismaModel>
    in?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageStatus[] | ListEnumMessageStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageStatusWithAggregatesFilter<$PrismaModel> | $Enums.MessageStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageStatusFilter<$PrismaModel>
    _max?: NestedEnumMessageStatusFilter<$PrismaModel>
  }

  export type EventCreateWithoutCreatedByInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPCreateNestedManyWithoutEventInput
    comments?: CommentCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateWithoutCreatedByInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutEventInput
    comments?: CommentUncheckedCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleUncheckedCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventCreateOrConnectWithoutCreatedByInput = {
    where: EventWhereUniqueInput
    create: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput>
  }

  export type EventCreateManyCreatedByInputEnvelope = {
    data: EventCreateManyCreatedByInput | EventCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type RSVPCreateWithoutUserInput = {
    id?: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
    event: EventCreateNestedOneWithoutRsvpsInput
  }

  export type RSVPUncheckedCreateWithoutUserInput = {
    id?: string
    eventId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type RSVPCreateOrConnectWithoutUserInput = {
    where: RSVPWhereUniqueInput
    create: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput>
  }

  export type RSVPCreateManyUserInputEnvelope = {
    data: RSVPCreateManyUserInput | RSVPCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CommentCreateWithoutUserInput = {
    id?: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
    event: EventCreateNestedOneWithoutCommentsInput
  }

  export type CommentUncheckedCreateWithoutUserInput = {
    id?: string
    eventId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type CommentCreateOrConnectWithoutUserInput = {
    where: CommentWhereUniqueInput
    create: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput>
  }

  export type CommentCreateManyUserInputEnvelope = {
    data: CommentCreateManyUserInput | CommentCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type MessageLogCreateWithoutUserInput = {
    id?: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
    event?: EventCreateNestedOneWithoutMessageLogsInput
  }

  export type MessageLogUncheckedCreateWithoutUserInput = {
    id?: string
    eventId?: string | null
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type MessageLogCreateOrConnectWithoutUserInput = {
    where: MessageLogWhereUniqueInput
    create: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput>
  }

  export type MessageLogCreateManyUserInputEnvelope = {
    data: MessageLogCreateManyUserInput | MessageLogCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type EventUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: EventWhereUniqueInput
    update: XOR<EventUpdateWithoutCreatedByInput, EventUncheckedUpdateWithoutCreatedByInput>
    create: XOR<EventCreateWithoutCreatedByInput, EventUncheckedCreateWithoutCreatedByInput>
  }

  export type EventUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: EventWhereUniqueInput
    data: XOR<EventUpdateWithoutCreatedByInput, EventUncheckedUpdateWithoutCreatedByInput>
  }

  export type EventUpdateManyWithWhereWithoutCreatedByInput = {
    where: EventScalarWhereInput
    data: XOR<EventUpdateManyMutationInput, EventUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type EventScalarWhereInput = {
    AND?: EventScalarWhereInput | EventScalarWhereInput[]
    OR?: EventScalarWhereInput[]
    NOT?: EventScalarWhereInput | EventScalarWhereInput[]
    id?: StringFilter<"Event"> | string
    createdById?: StringFilter<"Event"> | string
    coverImageUrl?: StringNullableFilter<"Event"> | string | null
    title_en?: StringFilter<"Event"> | string
    title_zh?: StringFilter<"Event"> | string
    description_en?: StringFilter<"Event"> | string
    description_zh?: StringFilter<"Event"> | string
    location_en?: StringFilter<"Event"> | string
    location_zh?: StringFilter<"Event"> | string
    startAt?: DateTimeFilter<"Event"> | Date | string
    endAt?: DateTimeNullableFilter<"Event"> | Date | string | null
    timezone?: StringFilter<"Event"> | string
    feeAmount?: DecimalNullableFilter<"Event"> | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFilter<"Event"> | string
    createdAt?: DateTimeFilter<"Event"> | Date | string
    updatedAt?: DateTimeFilter<"Event"> | Date | string
  }

  export type RSVPUpsertWithWhereUniqueWithoutUserInput = {
    where: RSVPWhereUniqueInput
    update: XOR<RSVPUpdateWithoutUserInput, RSVPUncheckedUpdateWithoutUserInput>
    create: XOR<RSVPCreateWithoutUserInput, RSVPUncheckedCreateWithoutUserInput>
  }

  export type RSVPUpdateWithWhereUniqueWithoutUserInput = {
    where: RSVPWhereUniqueInput
    data: XOR<RSVPUpdateWithoutUserInput, RSVPUncheckedUpdateWithoutUserInput>
  }

  export type RSVPUpdateManyWithWhereWithoutUserInput = {
    where: RSVPScalarWhereInput
    data: XOR<RSVPUpdateManyMutationInput, RSVPUncheckedUpdateManyWithoutUserInput>
  }

  export type RSVPScalarWhereInput = {
    AND?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
    OR?: RSVPScalarWhereInput[]
    NOT?: RSVPScalarWhereInput | RSVPScalarWhereInput[]
    id?: StringFilter<"RSVP"> | string
    eventId?: StringFilter<"RSVP"> | string
    userId?: StringFilter<"RSVP"> | string
    status?: EnumRSVPStatusFilter<"RSVP"> | $Enums.RSVPStatus
    updatedAt?: DateTimeFilter<"RSVP"> | Date | string
  }

  export type CommentUpsertWithWhereUniqueWithoutUserInput = {
    where: CommentWhereUniqueInput
    update: XOR<CommentUpdateWithoutUserInput, CommentUncheckedUpdateWithoutUserInput>
    create: XOR<CommentCreateWithoutUserInput, CommentUncheckedCreateWithoutUserInput>
  }

  export type CommentUpdateWithWhereUniqueWithoutUserInput = {
    where: CommentWhereUniqueInput
    data: XOR<CommentUpdateWithoutUserInput, CommentUncheckedUpdateWithoutUserInput>
  }

  export type CommentUpdateManyWithWhereWithoutUserInput = {
    where: CommentScalarWhereInput
    data: XOR<CommentUpdateManyMutationInput, CommentUncheckedUpdateManyWithoutUserInput>
  }

  export type CommentScalarWhereInput = {
    AND?: CommentScalarWhereInput | CommentScalarWhereInput[]
    OR?: CommentScalarWhereInput[]
    NOT?: CommentScalarWhereInput | CommentScalarWhereInput[]
    id?: StringFilter<"Comment"> | string
    eventId?: StringFilter<"Comment"> | string
    userId?: StringFilter<"Comment"> | string
    body?: StringFilter<"Comment"> | string
    createdAt?: DateTimeFilter<"Comment"> | Date | string
    deletedAt?: DateTimeNullableFilter<"Comment"> | Date | string | null
  }

  export type MessageLogUpsertWithWhereUniqueWithoutUserInput = {
    where: MessageLogWhereUniqueInput
    update: XOR<MessageLogUpdateWithoutUserInput, MessageLogUncheckedUpdateWithoutUserInput>
    create: XOR<MessageLogCreateWithoutUserInput, MessageLogUncheckedCreateWithoutUserInput>
  }

  export type MessageLogUpdateWithWhereUniqueWithoutUserInput = {
    where: MessageLogWhereUniqueInput
    data: XOR<MessageLogUpdateWithoutUserInput, MessageLogUncheckedUpdateWithoutUserInput>
  }

  export type MessageLogUpdateManyWithWhereWithoutUserInput = {
    where: MessageLogScalarWhereInput
    data: XOR<MessageLogUpdateManyMutationInput, MessageLogUncheckedUpdateManyWithoutUserInput>
  }

  export type MessageLogScalarWhereInput = {
    AND?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
    OR?: MessageLogScalarWhereInput[]
    NOT?: MessageLogScalarWhereInput | MessageLogScalarWhereInput[]
    id?: StringFilter<"MessageLog"> | string
    eventId?: StringNullableFilter<"MessageLog"> | string | null
    userId?: StringFilter<"MessageLog"> | string
    channel?: EnumMessageChannelFilter<"MessageLog"> | $Enums.MessageChannel
    toAddress?: StringFilter<"MessageLog"> | string
    payload?: JsonFilter<"MessageLog">
    status?: EnumMessageStatusFilter<"MessageLog"> | $Enums.MessageStatus
    providerMessageId?: StringNullableFilter<"MessageLog"> | string | null
    createdAt?: DateTimeFilter<"MessageLog"> | Date | string
  }

  export type UserCreateWithoutEventsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    rsvps?: RSVPCreateNestedManyWithoutUserInput
    comments?: CommentCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutEventsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutUserInput
    comments?: CommentUncheckedCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutEventsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutEventsInput, UserUncheckedCreateWithoutEventsInput>
  }

  export type RSVPCreateWithoutEventInput = {
    id?: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRsvpsInput
  }

  export type RSVPUncheckedCreateWithoutEventInput = {
    id?: string
    userId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type RSVPCreateOrConnectWithoutEventInput = {
    where: RSVPWhereUniqueInput
    create: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput>
  }

  export type RSVPCreateManyEventInputEnvelope = {
    data: RSVPCreateManyEventInput | RSVPCreateManyEventInput[]
    skipDuplicates?: boolean
  }

  export type CommentCreateWithoutEventInput = {
    id?: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
    user: UserCreateNestedOneWithoutCommentsInput
  }

  export type CommentUncheckedCreateWithoutEventInput = {
    id?: string
    userId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type CommentCreateOrConnectWithoutEventInput = {
    where: CommentWhereUniqueInput
    create: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput>
  }

  export type CommentCreateManyEventInputEnvelope = {
    data: CommentCreateManyEventInput | CommentCreateManyEventInput[]
    skipDuplicates?: boolean
  }

  export type ReminderRuleCreateWithoutEventInput = {
    id?: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
  }

  export type ReminderRuleUncheckedCreateWithoutEventInput = {
    id?: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
  }

  export type ReminderRuleCreateOrConnectWithoutEventInput = {
    where: ReminderRuleWhereUniqueInput
    create: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput>
  }

  export type ReminderRuleCreateManyEventInputEnvelope = {
    data: ReminderRuleCreateManyEventInput | ReminderRuleCreateManyEventInput[]
    skipDuplicates?: boolean
  }

  export type MessageLogCreateWithoutEventInput = {
    id?: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutMessageLogsInput
  }

  export type MessageLogUncheckedCreateWithoutEventInput = {
    id?: string
    userId: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type MessageLogCreateOrConnectWithoutEventInput = {
    where: MessageLogWhereUniqueInput
    create: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput>
  }

  export type MessageLogCreateManyEventInputEnvelope = {
    data: MessageLogCreateManyEventInput | MessageLogCreateManyEventInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutEventsInput = {
    update: XOR<UserUpdateWithoutEventsInput, UserUncheckedUpdateWithoutEventsInput>
    create: XOR<UserCreateWithoutEventsInput, UserUncheckedCreateWithoutEventsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutEventsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutEventsInput, UserUncheckedUpdateWithoutEventsInput>
  }

  export type UserUpdateWithoutEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUpdateManyWithoutUserNestedInput
    comments?: CommentUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutUserNestedInput
    comments?: CommentUncheckedUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type RSVPUpsertWithWhereUniqueWithoutEventInput = {
    where: RSVPWhereUniqueInput
    update: XOR<RSVPUpdateWithoutEventInput, RSVPUncheckedUpdateWithoutEventInput>
    create: XOR<RSVPCreateWithoutEventInput, RSVPUncheckedCreateWithoutEventInput>
  }

  export type RSVPUpdateWithWhereUniqueWithoutEventInput = {
    where: RSVPWhereUniqueInput
    data: XOR<RSVPUpdateWithoutEventInput, RSVPUncheckedUpdateWithoutEventInput>
  }

  export type RSVPUpdateManyWithWhereWithoutEventInput = {
    where: RSVPScalarWhereInput
    data: XOR<RSVPUpdateManyMutationInput, RSVPUncheckedUpdateManyWithoutEventInput>
  }

  export type CommentUpsertWithWhereUniqueWithoutEventInput = {
    where: CommentWhereUniqueInput
    update: XOR<CommentUpdateWithoutEventInput, CommentUncheckedUpdateWithoutEventInput>
    create: XOR<CommentCreateWithoutEventInput, CommentUncheckedCreateWithoutEventInput>
  }

  export type CommentUpdateWithWhereUniqueWithoutEventInput = {
    where: CommentWhereUniqueInput
    data: XOR<CommentUpdateWithoutEventInput, CommentUncheckedUpdateWithoutEventInput>
  }

  export type CommentUpdateManyWithWhereWithoutEventInput = {
    where: CommentScalarWhereInput
    data: XOR<CommentUpdateManyMutationInput, CommentUncheckedUpdateManyWithoutEventInput>
  }

  export type ReminderRuleUpsertWithWhereUniqueWithoutEventInput = {
    where: ReminderRuleWhereUniqueInput
    update: XOR<ReminderRuleUpdateWithoutEventInput, ReminderRuleUncheckedUpdateWithoutEventInput>
    create: XOR<ReminderRuleCreateWithoutEventInput, ReminderRuleUncheckedCreateWithoutEventInput>
  }

  export type ReminderRuleUpdateWithWhereUniqueWithoutEventInput = {
    where: ReminderRuleWhereUniqueInput
    data: XOR<ReminderRuleUpdateWithoutEventInput, ReminderRuleUncheckedUpdateWithoutEventInput>
  }

  export type ReminderRuleUpdateManyWithWhereWithoutEventInput = {
    where: ReminderRuleScalarWhereInput
    data: XOR<ReminderRuleUpdateManyMutationInput, ReminderRuleUncheckedUpdateManyWithoutEventInput>
  }

  export type ReminderRuleScalarWhereInput = {
    AND?: ReminderRuleScalarWhereInput | ReminderRuleScalarWhereInput[]
    OR?: ReminderRuleScalarWhereInput[]
    NOT?: ReminderRuleScalarWhereInput | ReminderRuleScalarWhereInput[]
    id?: StringFilter<"ReminderRule"> | string
    eventId?: StringFilter<"ReminderRule"> | string
    offsetMinutes?: IntFilter<"ReminderRule"> | number
    channels?: JsonFilter<"ReminderRule">
    enabled?: BoolFilter<"ReminderRule"> | boolean
  }

  export type MessageLogUpsertWithWhereUniqueWithoutEventInput = {
    where: MessageLogWhereUniqueInput
    update: XOR<MessageLogUpdateWithoutEventInput, MessageLogUncheckedUpdateWithoutEventInput>
    create: XOR<MessageLogCreateWithoutEventInput, MessageLogUncheckedCreateWithoutEventInput>
  }

  export type MessageLogUpdateWithWhereUniqueWithoutEventInput = {
    where: MessageLogWhereUniqueInput
    data: XOR<MessageLogUpdateWithoutEventInput, MessageLogUncheckedUpdateWithoutEventInput>
  }

  export type MessageLogUpdateManyWithWhereWithoutEventInput = {
    where: MessageLogScalarWhereInput
    data: XOR<MessageLogUpdateManyMutationInput, MessageLogUncheckedUpdateManyWithoutEventInput>
  }

  export type EventCreateWithoutRsvpsInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutEventsInput
    comments?: CommentCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateWithoutRsvpsInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    comments?: CommentUncheckedCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleUncheckedCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventCreateOrConnectWithoutRsvpsInput = {
    where: EventWhereUniqueInput
    create: XOR<EventCreateWithoutRsvpsInput, EventUncheckedCreateWithoutRsvpsInput>
  }

  export type UserCreateWithoutRsvpsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventCreateNestedManyWithoutCreatedByInput
    comments?: CommentCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutRsvpsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventUncheckedCreateNestedManyWithoutCreatedByInput
    comments?: CommentUncheckedCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutRsvpsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRsvpsInput, UserUncheckedCreateWithoutRsvpsInput>
  }

  export type EventUpsertWithoutRsvpsInput = {
    update: XOR<EventUpdateWithoutRsvpsInput, EventUncheckedUpdateWithoutRsvpsInput>
    create: XOR<EventCreateWithoutRsvpsInput, EventUncheckedCreateWithoutRsvpsInput>
    where?: EventWhereInput
  }

  export type EventUpdateToOneWithWhereWithoutRsvpsInput = {
    where?: EventWhereInput
    data: XOR<EventUpdateWithoutRsvpsInput, EventUncheckedUpdateWithoutRsvpsInput>
  }

  export type EventUpdateWithoutRsvpsInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutEventsNestedInput
    comments?: CommentUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateWithoutRsvpsInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    comments?: CommentUncheckedUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUncheckedUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutEventNestedInput
  }

  export type UserUpsertWithoutRsvpsInput = {
    update: XOR<UserUpdateWithoutRsvpsInput, UserUncheckedUpdateWithoutRsvpsInput>
    create: XOR<UserCreateWithoutRsvpsInput, UserUncheckedCreateWithoutRsvpsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRsvpsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRsvpsInput, UserUncheckedUpdateWithoutRsvpsInput>
  }

  export type UserUpdateWithoutRsvpsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUpdateManyWithoutCreatedByNestedInput
    comments?: CommentUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutRsvpsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUncheckedUpdateManyWithoutCreatedByNestedInput
    comments?: CommentUncheckedUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type EventCreateWithoutCommentsInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutEventsInput
    rsvps?: RSVPCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateWithoutCommentsInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleUncheckedCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventCreateOrConnectWithoutCommentsInput = {
    where: EventWhereUniqueInput
    create: XOR<EventCreateWithoutCommentsInput, EventUncheckedCreateWithoutCommentsInput>
  }

  export type UserCreateWithoutCommentsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCommentsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventUncheckedCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPUncheckedCreateNestedManyWithoutUserInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCommentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCommentsInput, UserUncheckedCreateWithoutCommentsInput>
  }

  export type EventUpsertWithoutCommentsInput = {
    update: XOR<EventUpdateWithoutCommentsInput, EventUncheckedUpdateWithoutCommentsInput>
    create: XOR<EventCreateWithoutCommentsInput, EventUncheckedCreateWithoutCommentsInput>
    where?: EventWhereInput
  }

  export type EventUpdateToOneWithWhereWithoutCommentsInput = {
    where?: EventWhereInput
    data: XOR<EventUpdateWithoutCommentsInput, EventUncheckedUpdateWithoutCommentsInput>
  }

  export type EventUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutEventsNestedInput
    rsvps?: RSVPUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUncheckedUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutEventNestedInput
  }

  export type UserUpsertWithoutCommentsInput = {
    update: XOR<UserUpdateWithoutCommentsInput, UserUncheckedUpdateWithoutCommentsInput>
    create: XOR<UserCreateWithoutCommentsInput, UserUncheckedCreateWithoutCommentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCommentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCommentsInput, UserUncheckedUpdateWithoutCommentsInput>
  }

  export type UserUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUncheckedUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUncheckedUpdateManyWithoutUserNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutUserNestedInput
  }

  export type EventCreateWithoutReminderRulesInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutEventsInput
    rsvps?: RSVPCreateNestedManyWithoutEventInput
    comments?: CommentCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateWithoutReminderRulesInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutEventInput
    comments?: CommentUncheckedCreateNestedManyWithoutEventInput
    messageLogs?: MessageLogUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventCreateOrConnectWithoutReminderRulesInput = {
    where: EventWhereUniqueInput
    create: XOR<EventCreateWithoutReminderRulesInput, EventUncheckedCreateWithoutReminderRulesInput>
  }

  export type EventUpsertWithoutReminderRulesInput = {
    update: XOR<EventUpdateWithoutReminderRulesInput, EventUncheckedUpdateWithoutReminderRulesInput>
    create: XOR<EventCreateWithoutReminderRulesInput, EventUncheckedCreateWithoutReminderRulesInput>
    where?: EventWhereInput
  }

  export type EventUpdateToOneWithWhereWithoutReminderRulesInput = {
    where?: EventWhereInput
    data: XOR<EventUpdateWithoutReminderRulesInput, EventUncheckedUpdateWithoutReminderRulesInput>
  }

  export type EventUpdateWithoutReminderRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutEventsNestedInput
    rsvps?: RSVPUpdateManyWithoutEventNestedInput
    comments?: CommentUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateWithoutReminderRulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutEventNestedInput
    comments?: CommentUncheckedUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutEventNestedInput
  }

  export type EventCreateWithoutMessageLogsInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutEventsInput
    rsvps?: RSVPCreateNestedManyWithoutEventInput
    comments?: CommentCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleCreateNestedManyWithoutEventInput
  }

  export type EventUncheckedCreateWithoutMessageLogsInput = {
    id?: string
    createdById: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rsvps?: RSVPUncheckedCreateNestedManyWithoutEventInput
    comments?: CommentUncheckedCreateNestedManyWithoutEventInput
    reminderRules?: ReminderRuleUncheckedCreateNestedManyWithoutEventInput
  }

  export type EventCreateOrConnectWithoutMessageLogsInput = {
    where: EventWhereUniqueInput
    create: XOR<EventCreateWithoutMessageLogsInput, EventUncheckedCreateWithoutMessageLogsInput>
  }

  export type UserCreateWithoutMessageLogsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPCreateNestedManyWithoutUserInput
    comments?: CommentCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutMessageLogsInput = {
    id?: string
    email: string
    passwordHash: string
    phoneE164: string
    displayName?: string | null
    preferredLanguage?: string
    role?: $Enums.Role
    notificationsMuted?: boolean
    createdAt?: Date | string
    events?: EventUncheckedCreateNestedManyWithoutCreatedByInput
    rsvps?: RSVPUncheckedCreateNestedManyWithoutUserInput
    comments?: CommentUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutMessageLogsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutMessageLogsInput, UserUncheckedCreateWithoutMessageLogsInput>
  }

  export type EventUpsertWithoutMessageLogsInput = {
    update: XOR<EventUpdateWithoutMessageLogsInput, EventUncheckedUpdateWithoutMessageLogsInput>
    create: XOR<EventCreateWithoutMessageLogsInput, EventUncheckedCreateWithoutMessageLogsInput>
    where?: EventWhereInput
  }

  export type EventUpdateToOneWithWhereWithoutMessageLogsInput = {
    where?: EventWhereInput
    data: XOR<EventUpdateWithoutMessageLogsInput, EventUncheckedUpdateWithoutMessageLogsInput>
  }

  export type EventUpdateWithoutMessageLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutEventsNestedInput
    rsvps?: RSVPUpdateManyWithoutEventNestedInput
    comments?: CommentUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateWithoutMessageLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutEventNestedInput
    comments?: CommentUncheckedUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUncheckedUpdateManyWithoutEventNestedInput
  }

  export type UserUpsertWithoutMessageLogsInput = {
    update: XOR<UserUpdateWithoutMessageLogsInput, UserUncheckedUpdateWithoutMessageLogsInput>
    create: XOR<UserCreateWithoutMessageLogsInput, UserUncheckedCreateWithoutMessageLogsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutMessageLogsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutMessageLogsInput, UserUncheckedUpdateWithoutMessageLogsInput>
  }

  export type UserUpdateWithoutMessageLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUpdateManyWithoutUserNestedInput
    comments?: CommentUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutMessageLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    phoneE164?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    preferredLanguage?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    notificationsMuted?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    events?: EventUncheckedUpdateManyWithoutCreatedByNestedInput
    rsvps?: RSVPUncheckedUpdateManyWithoutUserNestedInput
    comments?: CommentUncheckedUpdateManyWithoutUserNestedInput
  }

  export type EventCreateManyCreatedByInput = {
    id?: string
    coverImageUrl?: string | null
    title_en: string
    title_zh: string
    description_en?: string
    description_zh?: string
    location_en?: string
    location_zh?: string
    startAt: Date | string
    endAt?: Date | string | null
    timezone?: string
    feeAmount?: Decimal | DecimalJsLike | number | string | null
    feeCurrency?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RSVPCreateManyUserInput = {
    id?: string
    eventId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type CommentCreateManyUserInput = {
    id?: string
    eventId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type MessageLogCreateManyUserInput = {
    id?: string
    eventId?: string | null
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type EventUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUpdateManyWithoutEventNestedInput
    comments?: CommentUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rsvps?: RSVPUncheckedUpdateManyWithoutEventNestedInput
    comments?: CommentUncheckedUpdateManyWithoutEventNestedInput
    reminderRules?: ReminderRuleUncheckedUpdateManyWithoutEventNestedInput
    messageLogs?: MessageLogUncheckedUpdateManyWithoutEventNestedInput
  }

  export type EventUncheckedUpdateManyWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    coverImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    title_en?: StringFieldUpdateOperationsInput | string
    title_zh?: StringFieldUpdateOperationsInput | string
    description_en?: StringFieldUpdateOperationsInput | string
    description_zh?: StringFieldUpdateOperationsInput | string
    location_en?: StringFieldUpdateOperationsInput | string
    location_zh?: StringFieldUpdateOperationsInput | string
    startAt?: DateTimeFieldUpdateOperationsInput | Date | string
    endAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    timezone?: StringFieldUpdateOperationsInput | string
    feeAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    feeCurrency?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    event?: EventUpdateOneRequiredWithoutRsvpsNestedInput
  }

  export type RSVPUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CommentUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    event?: EventUpdateOneRequiredWithoutCommentsNestedInput
  }

  export type CommentUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CommentUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MessageLogUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    event?: EventUpdateOneWithoutMessageLogsNestedInput
  }

  export type MessageLogUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: NullableStringFieldUpdateOperationsInput | string | null
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageLogUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventId?: NullableStringFieldUpdateOperationsInput | string | null
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPCreateManyEventInput = {
    id?: string
    userId: string
    status: $Enums.RSVPStatus
    updatedAt?: Date | string
  }

  export type CommentCreateManyEventInput = {
    id?: string
    userId: string
    body: string
    createdAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ReminderRuleCreateManyEventInput = {
    id?: string
    offsetMinutes: number
    channels: JsonNullValueInput | InputJsonValue
    enabled?: boolean
  }

  export type MessageLogCreateManyEventInput = {
    id?: string
    userId: string
    channel: $Enums.MessageChannel
    toAddress: string
    payload: JsonNullValueInput | InputJsonValue
    status?: $Enums.MessageStatus
    providerMessageId?: string | null
    createdAt?: Date | string
  }

  export type RSVPUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRsvpsNestedInput
  }

  export type RSVPUncheckedUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RSVPUncheckedUpdateManyWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumRSVPStatusFieldUpdateOperationsInput | $Enums.RSVPStatus
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CommentUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutCommentsNestedInput
  }

  export type CommentUncheckedUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CommentUncheckedUpdateManyWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    body?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ReminderRuleUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReminderRuleUncheckedUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ReminderRuleUncheckedUpdateManyWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    offsetMinutes?: IntFieldUpdateOperationsInput | number
    channels?: JsonNullValueInput | InputJsonValue
    enabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type MessageLogUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutMessageLogsNestedInput
  }

  export type MessageLogUncheckedUpdateWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageLogUncheckedUpdateManyWithoutEventInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    channel?: EnumMessageChannelFieldUpdateOperationsInput | $Enums.MessageChannel
    toAddress?: StringFieldUpdateOperationsInput | string
    payload?: JsonNullValueInput | InputJsonValue
    status?: EnumMessageStatusFieldUpdateOperationsInput | $Enums.MessageStatus
    providerMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EventCountOutputTypeDefaultArgs instead
     */
    export type EventCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EventCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EventDefaultArgs instead
     */
    export type EventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EventDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RSVPDefaultArgs instead
     */
    export type RSVPArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RSVPDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CommentDefaultArgs instead
     */
    export type CommentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CommentDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ReminderRuleDefaultArgs instead
     */
    export type ReminderRuleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ReminderRuleDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MessageLogDefaultArgs instead
     */
    export type MessageLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MessageLogDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}