import express, { Application } from "express"
import https from "https"
import http from "http"
import fs from "fs"
import { ResponseSender } from "./response/ResponseSender"
import { AnyError, ErrorResolver, RouteType } from "./types"
import { Messages, defaultMessages } from "./response/messages"
import { ZodSchema } from "zod"
import { MiddlewareGenerator } from "./middlewares/Middlewares"
import { AnyData } from "@flagg2/schema"
import { Router } from "./Router"
import { AuthConfig, Role } from "./middlewares/dynamic/auth"

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
   authConfig?: AuthConfig<KnownRoles, UserTokenSchema>
   loggingMethods?: ((message: string) => void)[]
   errorMessageOverrides?: Messages<Message>
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
   validationSchema?: ValidationSchema
}
export class Brisk<
   Message = string,
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

   constructor(options: ServerOptions<Message, KnownRoles, UserTokenSchema>) {
      this.options = options
      this.roles = options.authConfig?.knownRoles ?? ({} as KnownRoles)

      this.app = express()

      this.responseGen = new ResponseSender<Message>(
         options.errorMessageOverrides ??
            (defaultMessages as Messages<Message>),
      )

      this.middlewareGen = new MiddlewareGenerator<
         Message,
         KnownRoles,
         UserTokenSchema
      >(this.options, this.responseGen)

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
