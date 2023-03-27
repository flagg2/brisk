import { NextFunction, Request } from "express"
import { ServerOptions } from "../Brisk"
import { BriskLogger } from "../Logger"
import { hrtime } from "process"
import { ExtendedExpressResponse, BuiltInMiddlewareResolver } from "../types"
import { ResponseSender } from "../response/ResponseSender"
import helmet from "helmet"
import { ZodSchema, ZodObject } from "zod"
import express from "express"
import cors from "cors"
import { getAuthMiddleware, Role } from "./auth"
import { AnyData } from "@flagg2/schema"
import { Router } from "../Router"
import { getDuplicateRequestFilterMiddleware } from "./duplicateRequestFilter.ts"
import { ResponseContent } from "../response/ResponseContent"

function getRequestSizeKB(req: Request) {
   return Number((req.socket.bytesRead / 1024).toFixed(2))
}

export class MiddlewareGenerator<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
> {
   private options: ServerOptions<Message, KnownRoles, UserTokenSchema>
   private logger: BriskLogger
   private response: ResponseSender<Message>

   constructor(
      options: ServerOptions<Message, KnownRoles, UserTokenSchema>,
      logger: BriskLogger,
      response: ResponseSender<Message>,
   ) {
      this.options = options
      this.logger = logger
      this.response = response
   }

   public static = {
      logRequest: async (
         req: Request,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         const start = hrtime()

         next()

         res.on("finish", () => {
            const end = hrtime(start)
            const time = end[0] * 1e3 + end[1] * 1e-6

            const size = getRequestSizeKB(req)

            this.logger.logRequest({
               method: req.method,
               path: req.path,
               statusCode: res.statusCode,
               durationMs: time,
               sizeKB: size,
            })
         })
      },
      notImplemented: (_: Request, res: ExtendedExpressResponse<Message>) => {
         return this.response.notImplemented(res)
      },
      helmet: helmet(),
      json: express.json(),
      urlencoded: express.urlencoded({ extended: true }),
      cors: cors(),
      blank: (
         _: Request,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         next()
      },
      keepRawBody: (
         req: Request,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         let request = req as Request & {
            rawBody: string
         }
         request.rawBody = ""
         req.on("data", (chunk) => {
            request.rawBody += chunk
         })

         next()
      },
      attachResponseMethods: (
         req: Request,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         res.ok = (message: Message, data?: any) => {
            return this.response.ok(res, message, data)
         }
         res.badRequest = (message: Message, data?: any) => {
            return this.response.badRequest(res, message, data)
         }
         res.unauthorized = (message?: Message, data?: any) => {
            return this.response.unauthorized(res, message, data)
         }
         res.forbidden = (message?: Message, data?: any) => {
            return this.response.forbidden(res, message, data)
         }
         res.notFound = (message?: Message, data?: any) => {
            return this.response.notFound(res, message, data)
         }
         res.conflict = (message?: Message, data?: any) => {
            return this.response.conflict(res, message, data)
         }
         res.internalServerError = (message?: Message, data?: any) => {
            return this.response.internalServerError(res, message, data)
         }
         res.notImplemented = (message?: Message, data?: any) => {
            return this.response.notImplemented(res, message, data)
         }
         res.tooManyRequests = (message?: Message, data?: any) => {
            return this.response.tooManyRequests(res, message, data)
         }
         res.respondWith = (content: ResponseContent<Message>) => {
            return this.response.respondWith(res, content)
         }
         res.methodNotAllowed = (message?: Message, data?: any) => {
            return this.response.methodNotAllowed(res, message, data)
         }

         next()
      },
   }

   public getDefaultMiddlewares = () => {
      const middlewares = [
         this.static.attachResponseMethods,
         this.static.logRequest,
         this.static.keepRawBody,
         this.static.json,
         this.static.urlencoded,
         this.static.cors,
      ]
      if (this.options.useHelmet) {
         middlewares.push(this.static.helmet)
      }
      return middlewares
   }

   public getResolverMiddlewares(
      allowedRoles: KnownRoles[keyof KnownRoles][] | null,
      allowDuplicateRequests: boolean | null,
      validation: ZodSchema<any> | null,
   ) {
      const middlewares: BuiltInMiddlewareResolver<Message>[] = [
         //@ts-expect-error - TODO: does not work because of request extension, would be nice to fix later
         this.dynamic.authenticate(allowedRoles),
         //@ts-expect-error - TODO: arbitrary type error
         this.dynamic.filterDuplicateRequests(allowDuplicateRequests),
         this.dynamic.validateSchema(validation),
      ]
      return middlewares
   }

   dynamic = {
      validateSchema:
         (schema: ZodSchema<any> | null) =>
         (
            req: Request,
            res: ExtendedExpressResponse<Message>,
            next: NextFunction,
         ) => {
            if (schema == null) {
               return next()
            }

            try {
               if (req.method === "GET") {
                  req.query = schema.parse(req.query)
               } else {
                  req.body = schema.parse(req.body)
               }
               next()
            } catch (error: any) {
               this.response.validationError(res, undefined, error)
            }
         },
      //TODO: make functions from classes when possible
      authenticate: (allowedRoles: KnownRoles[keyof KnownRoles][] | null) => {
         const { authConfig } = this.options
         if (authConfig == null) {
            return this.static.blank
         }
         return getAuthMiddleware(authConfig, allowedRoles)
      },
      filterDuplicateRequests: (
         router: Router<Message, KnownRoles, UserTokenSchema>,
      ) => {
         if (this.options.allowDuplicateRequests) {
            return this.static.blank
         }
         return getDuplicateRequestFilterMiddleware(router.getRequests())
      },
   }
}

//TODO: potentially only allow object and array in validation shcema
