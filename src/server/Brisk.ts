import express, { Request, Application, Router, RequestHandler } from "express"
import https from "https"
import http from "http"
import fs from "fs"
import { BriskLogger } from "./Logger"
import { ResponseSender } from "./Response"
import {
   AnyError,
   CustomMiddlewareResolver,
   ErrorResolver,
   MiddlewareResolver,
   Resolver,
   RolesResolver,
   RouteType,
   ValidationOptions,
} from "./types"
import { ErrorMessages, defaultErrorMessages } from "./DefaultErrorMessages"
import { Auth, Role } from "./Auth"
import { DuplicateRequestFilter } from "./RequestLimiter"
import { ZodSchema } from "zod"
import { Wrappers } from "./Wrappers"
import { Resolvers } from "./Resolvers"
import { AnyData } from "@flagg2/schema"

export type ServerOptions<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined = undefined,
> = {
   port: number
   host?: string
   httpsConfig?: {
      key: string
      cert: string
   }
   //TODO:
   // corsConfig?: {
   //    origin: string;
   //    methods: string;
   //    allowedHeaders: string;
   // };
   authConfig?:
      | {
           signingSecret: string
           resolverType: "token"
           rolesResolver: RolesResolver<UserTokenSchema>
           knownRoles: KnownRoles
           userTokenSchema: UserTokenSchema
        }
      | {
           resolverType: "request"
           rolesResolver: RolesResolver<UserTokenSchema>
           knownRoles: KnownRoles
        }

   loggingMethods?: ((message: string) => void)[]
   errorMessageOverrides?: ErrorMessages<Message>
   customCatchers?: Map<AnyError, ErrorResolver<Message>>
   useHelmet?: boolean
   allowDuplicateRequests?: boolean
}

export type AllowedRouteMethods = {
   [path: string]: RouteType[]
}

type RequestOptions<
   Message,
   ValidationSchema extends ZodSchema<any>,
   KnownRoles extends {
      [key: string]: Role
   },
> = {
   middlewares?: MiddlewareResolver<Message>[]
   allowedRoles?: KnownRoles[keyof KnownRoles][]
   allowDuplicateRequests?: boolean
   validation?: ValidationOptions<ValidationSchema>
}

export type DefaultMessage = string

export class Brisk<
   Message = DefaultMessage,
   KnownRoles extends {
      [key: string]: Role
   } = never,
   UserTokenSchema extends AnyData | undefined = undefined,
> {
   public app: Application
   public router: Router
   public roles: KnownRoles
   private started: boolean = false
   private response: ResponseSender<Message>
   private options: ServerOptions<Message, KnownRoles, UserTokenSchema>
   private allowedMethods: AllowedRouteMethods = {}
   private resolvers: Resolvers<Message, KnownRoles, UserTokenSchema>
   private wrappers: Wrappers<Message>
   private logger: BriskLogger
   private auth: Auth<Message, UserTokenSchema> | null = null
   private duplicateRequestFilter: DuplicateRequestFilter<Message>
   private middlewares: {
      resolver: CustomMiddlewareResolver<Message, UserTokenSchema, string>
      path: string
   }[] = []

   constructor(options: ServerOptions<Message, KnownRoles, UserTokenSchema>) {
      this.options = options
      this.allowedMethods = {}
      this.roles = options.authConfig?.knownRoles ?? ({} as KnownRoles)

      this.app = express()
      this.router = express.Router()
      this.logger = new BriskLogger({
         loggingMethods: options.loggingMethods ?? [
            (message: string) => console.log(message),
         ],
      })

      this.response = new ResponseSender<Message>(
         options.errorMessageOverrides ??
            (defaultErrorMessages as ErrorMessages<Message>),
      )

      this.duplicateRequestFilter = new DuplicateRequestFilter<Message>(
         options.allowDuplicateRequests,
      )
      if (options.authConfig) {
         const { rolesResolver, resolverType } = options.authConfig
         let signingSecret = ""

         if (resolverType === "token") {
            signingSecret = options.authConfig.signingSecret
         }

         this.auth = new Auth<Message, UserTokenSchema>(
            signingSecret,
            rolesResolver,
            resolverType,
         )
      }

      this.wrappers = new Wrappers<Message>(
         this.response,
         options.customCatchers,
      )
      this.resolvers = new Resolvers<Message, KnownRoles, UserTokenSchema>(
         this.options,
         this.logger,
         this.response,
         this.duplicateRequestFilter,
         this.auth,
      )

      for (const resolver of this.resolvers.getServerCreationMiddlewares()) {
         this.app.use(resolver)
      }
   }

   public start() {
      const { port, httpsConfig } = this.options
      const startUpMessage = `🚀 Server up and running on port ${port} 🚀`

      for (const resolver of this.resolvers.getServerStartUpMiddlewares(
         this.allowedMethods,
      )) {
         this.app.use(resolver)
      }

      for (const { path, resolver } of this.middlewares) {
         // @ts-expect-error
         this.app.use(path, resolver)
      }

      this.app.use("/", this.router)
      if (httpsConfig) {
         const { key, cert } = httpsConfig
         const httpsServer = https.createServer(
            {
               key: fs.readFileSync(key),
               cert: fs.readFileSync(cert),
            },
            this.app,
         )
         httpsServer.listen(port, () => {
            console.log(startUpMessage)
         })
      } else {
         const httpServer = http.createServer({}, this.app)
         httpServer.listen(port, () => {
            console.log(startUpMessage)
         })
      }

      this.started = true
   }

   //public follow middleware pattern as in constructor
   public addRoute<
      _RouteType extends RouteType,
      ValidationSchema extends ZodSchema<any>,
      Path extends string,
   >(config: {
      type: _RouteType
      path: Path
      resolver?: Resolver<
         Message,
         ValidationSchema,
         _RouteType,
         UserTokenSchema,
         Path
      >
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>
   }) {
      if (this.started) {
         throw new Error("Cannot add routes after server has started")
      }

      let { type, path, resolver, opts } = config
      const { middlewares, allowedRoles, allowDuplicateRequests, validation } =
         opts ?? {}

      path = this.prependSlash(path) as Path
      this.addToAllowedMethods(path, type)

      let generatedMiddlewares = this.resolvers.getRouteMiddlewares(
         allowedRoles ?? null,
         allowDuplicateRequests ?? null,
         validation ?? null,
      )
      let finalResolvers = this.wrappers.wrapRoute([
         ...generatedMiddlewares,
         ...(middlewares ?? []),
         resolver ?? this.resolvers.static.notImplemented,
      ] as MiddlewareResolver<Message>[])

      // @ts-ignore
      this.router[type.toLowerCase()](path, finalResolvers)
   }

   public get<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "GET",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "GET",
         path,
         resolver,
         opts,
      })
   }

   public post<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "POST",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "POST",
         path,
         resolver,
         opts,
      })
   }

   public put<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "PUT",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "PUT",
         path,
         resolver,
         opts,
      })
   }

   public patch<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "PATCH",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "PATCH",
         path,
         resolver,
         opts,
      })
   }

   public delete<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "DELETE",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "DELETE",
         path,
         resolver,
         opts,
      })
   }

   public use<Path extends string>(
      path: Path,
      middleware: CustomMiddlewareResolver<Message, UserTokenSchema, Path>,
   ) {
      this.middlewares.push({
         path: this.prependSlash(path) as Path,
         resolver: middleware as CustomMiddlewareResolver<Message, any, any>,
      })
   }

   public getHost() {
      const { host } = this.options
      if (host) {
         return `${host}`
      }
      return undefined
   }

   public getPort() {
      const { port } = this.options
      return port
   }

   private addToAllowedMethods(path: string, type: RouteType) {
      if (this.allowedMethods[path] != null) {
         this.allowedMethods[path].push(type)
      } else {
         this.allowedMethods[path] = [type]
      }
   }

   private prependSlash(path: string) {
      if (!path.startsWith("/")) {
         path = "/" + path
      }
      return path
   }
}
