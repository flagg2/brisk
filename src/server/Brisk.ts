import express, { Request, Application, Router } from "express"
import https from "https"
import http from "http"
import fs from "fs"
import { BriskLogger } from "./Logger"
import { ResponseGenerator } from "./Response"
import {
   AnyError,
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

export type ServerOptions<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   AuthResolverStyle extends "request" | "token",
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
   authConfig?: {
      signingSecret: string
      resolverType: AuthResolverStyle
      rolesResolver: RolesResolver<AuthResolverStyle>
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
   AuthResolverStyle extends "request" | "token" = "token",
> {
   public app: Application
   public router: Router
   public roles: KnownRoles
   private response: ResponseGenerator<Message>
   private options: ServerOptions<Message, KnownRoles, AuthResolverStyle>
   private allowedMethods: AllowedRouteMethods = {}
   private resolvers: Resolvers<Message, KnownRoles, AuthResolverStyle>
   private wrappers: Wrappers<Message>
   private logger: BriskLogger
   private auth: Auth<Message, AuthResolverStyle> | null = null
   private duplicateRequestFilter: DuplicateRequestFilter<Message>

   constructor(options: ServerOptions<Message, KnownRoles, AuthResolverStyle>) {
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

      this.response = new ResponseGenerator<Message>(
         options.errorMessageOverrides ??
            (defaultErrorMessages as ErrorMessages<Message>),
      )

      this.duplicateRequestFilter = new DuplicateRequestFilter<Message>(
         options.allowDuplicateRequests,
      )
      if (options.authConfig) {
         const { signingSecret, rolesResolver, resolverType } =
            options.authConfig
         this.auth = new Auth<Message, AuthResolverStyle>(
            signingSecret,
            rolesResolver,
            resolverType,
         )
      }

      this.wrappers = new Wrappers<Message>(
         this.response,
         options.customCatchers,
      )
      this.resolvers = new Resolvers<Message, KnownRoles, AuthResolverStyle>(
         this.options,
         this.logger,
         this.response,
         this.duplicateRequestFilter,
         this.auth,
      )

      for (const resolver of this.resolvers.getServerCreationMiddlewares()) {
         this.app.use(resolver)
      }

      this.app.use("/", this.router)
   }

   public start() {
      const { port, httpsConfig } = this.options
      const startUpMessage = `🚀 Server up and running on port ${port} 🚀`

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

      for (const resolver of this.resolvers.getServerStartUpMiddlewares(
         this.allowedMethods,
      )) {
         this.app.use(resolver)
      }
   }

   //public follow middleware pattern as in constructor
   public addRoute<
      _RouteType extends RouteType,
      ValidationSchema extends ZodSchema<any>,
   >(config: {
      type: _RouteType
      path: string
      resolver?: Resolver<Message, ValidationSchema, _RouteType>
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>
   }) {
      let { type, path, resolver, opts } = config
      const { middlewares, allowedRoles, allowDuplicateRequests, validation } =
         opts ?? {}

      path = this.prependSlash(path)
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

      // @ts-expect-error
      this.router[type.toLowerCase()](path, finalResolvers)
   }

   public get<ValidationSchema extends ZodSchema<any>>(
      path: string,
      resolver?: Resolver<Message, ValidationSchema, "GET">,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "GET",
         path,
         resolver,
         opts,
      })
   }

   public post<ValidationSchema extends ZodSchema<any>>(
      path: string,
      resolver?: Resolver<Message, ValidationSchema, "POST">,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "POST",
         path,
         resolver,
         opts,
      })
   }

   public put<ValidationSchema extends ZodSchema<any>>(
      path: string,
      resolver?: Resolver<Message, ValidationSchema, "PUT">,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "PUT",
         path,
         resolver,
         opts,
      })
   }

   public delete<ValidationSchema extends ZodSchema<any>>(
      path: string,
      resolver?: Resolver<Message, ValidationSchema, "DELETE">,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "DELETE",
         path,
         resolver,
         opts,
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
