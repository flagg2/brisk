import express, { Application } from "express"
import https from "https"
import http from "http"
import fs from "fs"
import { BriskLogger } from "./Logger"
import { ResponseSender } from "./Response"
import {
   AnyError,
   ErrorResolver,
   RolesResolver,
   RouteType,
   ValidationOptions,
} from "./types"
import { ErrorMessages, defaultErrorMessages } from "./DefaultErrorMessages"
import { Auth, Role } from "./middlewares/Auth"
import { DuplicateRequestFilter } from "./middlewares/RequestLimiter"
import { ZodSchema } from "zod"
import { MiddlewareGenerator } from "./middlewares/Middlewares"
import { AnyData } from "@flagg2/schema"
import { Router } from "./Router"

// TODO: move params that only router needs to router

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

export type RequestOptions<
   Message,
   ValidationSchema extends ZodSchema<any>,
   KnownRoles extends {
      [key: string]: Role
   },
> = {
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
   public roles: KnownRoles
   private router: Router<Message, KnownRoles, UserTokenSchema>
   private started: boolean = false
   private responseGen: ResponseSender<Message>
   private options: ServerOptions<Message, KnownRoles, UserTokenSchema>
   private middlewareGen: MiddlewareGenerator<
      Message,
      KnownRoles,
      UserTokenSchema
   >
   private logger: BriskLogger
   private auth: Auth<Message, UserTokenSchema> | null = null
   private duplicateRequestFilter: DuplicateRequestFilter<Message>

   constructor(options: ServerOptions<Message, KnownRoles, UserTokenSchema>) {
      this.options = options
      this.roles = options.authConfig?.knownRoles ?? ({} as KnownRoles)

      this.app = express()

      this.logger = new BriskLogger({
         loggingMethods: options.loggingMethods ?? [
            (message: string) => console.log(message),
         ],
      })

      this.responseGen = new ResponseSender<Message>(
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

      this.middlewareGen = new MiddlewareGenerator<
         Message,
         KnownRoles,
         UserTokenSchema
      >(
         this.options,
         this.logger,
         this.responseGen,
         this.duplicateRequestFilter,
         this.auth,
      )

      this.router = new Router<Message, KnownRoles, UserTokenSchema>(
         this.app,
         this.middlewareGen,
         this.responseGen,
         options.customCatchers,
      )
   }

   public start() {
      const { port, httpsConfig } = this.options
      const startUpMessage = `🚀 Server up and running on port ${port} 🚀`

      this.router.start()

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

   public getRouter() {
      return this.router
   }
}
