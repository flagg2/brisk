import { NextFunction, Request, Response } from "express"
import { AllowedRouteMethods, ServerOptions } from "./Brisk"
import { BriskLogger } from "./Logger"
import { hrtime } from "process"
import {
   ExtendedExpressRequest,
   ExtendedExpressResponse,
   BuiltInMiddlewareResolver,
   RouteType,
   ValidationOptions,
} from "./types"
import { ResponseContent, ResponseSender } from "./Response"
import helmet from "helmet"
import { ZodSchema, ZodObject } from "zod"
import express from "express"
import cors from "cors"
import { Auth, Role } from "./Auth"
import { DuplicateRequestFilter } from "./RequestLimiter"
import { AnyData } from "@flagg2/schema"

function getRequestSizeKB(req: Request) {
   return Number((req.socket.bytesRead / 1024).toFixed(2))
}

function pathToRegex(path: string): string {
   const regexPattern = path
      .split("/")
      .map((segment) => {
         if (segment.startsWith(":")) {
            return ".+"
         }
         return segment
      })
      .join("\\/")
   return `^${regexPattern}$`
}

export class Resolvers<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
> {
   private options: ServerOptions<Message, KnownRoles, UserTokenSchema>
   private logger: BriskLogger
   private response: ResponseSender<Message>
   private duplicateRequestFilter: DuplicateRequestFilter<Message>
   private auth: Auth<Message, UserTokenSchema> | null

   constructor(
      options: ServerOptions<Message, KnownRoles, UserTokenSchema>,
      logger: BriskLogger,
      response: ResponseSender<Message>,
      duplicateRequestFilter: DuplicateRequestFilter<Message>,
      auth: Auth<Message, UserTokenSchema> | null,
   ) {
      this.options = options
      this.logger = logger
      this.response = response
      this.duplicateRequestFilter = duplicateRequestFilter
      this.auth = auth
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

   public getServerCreationMiddlewares = () => {
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

   public getServerStartUpMiddlewares = (
      allowedMethods: AllowedRouteMethods,
   ) => {
      const middlewares: express.RequestHandler[] = []
      // @ts-expect-error
      middlewares.push(this.dynamic.validateRouteAndMethod(allowedMethods))
      return middlewares
   }

   public getRouteMiddlewares(
      allowedRoles: KnownRoles[keyof KnownRoles][] | null,
      allowDuplicateRequests: boolean | null,
      validation: ValidationOptions<ZodSchema<any>> | null,
   ) {
      const middlewares: BuiltInMiddlewareResolver<Message>[] = [
         //@ts-expect-error - TODO: does not work because of request extension, would be nice to fix later
         this.dynamic.authenticate(allowedRoles),
         this.dynamic.filterDuplicateRequests(allowDuplicateRequests),
         this.dynamic.validateSchema(validation),
      ]
      return middlewares
   }

   dynamic = {
      validateSchema:
         (validation: ValidationOptions<ZodSchema<any>> | null) =>
         (
            req: Request,
            res: ExtendedExpressResponse<Message>,
            next: NextFunction,
         ) => {
            if (validation == null) {
               return next()
            }

            const { schema, isStrict } = validation
            function maybeStrictSchema() {
               if (isStrict !== false && schema instanceof ZodObject) {
                  return schema.strict()
               }
               return schema
            }

            try {
               if (req.method === "GET") {
                  req.query = maybeStrictSchema().parse(req.query)
               } else {
                  req.body = maybeStrictSchema().parse(req.body)
               }
               next()
            } catch (error: any) {
               this.response.validationError(res, undefined, error)
            }
         },
      validateRouteAndMethod:
         (allowedMethods: AllowedRouteMethods) =>
         (
            req: Request,
            res: ExtendedExpressResponse<Message>,
            next: NextFunction,
         ) => {
            // this handles cases in which generic params are used
            // and would not be correctly matched without regex
            const matchingPath = Object.keys(allowedMethods).find((route) =>
               new RegExp(pathToRegex(route)).test(req.path),
            )

            if (matchingPath == null) {
               return res.notFound()
            }

            if (
               !allowedMethods[matchingPath].includes(
                  req.method.toUpperCase() as RouteType,
               )
            ) {
               return res.methodNotAllowed()
            }
            next()
         },
      authenticate: (allowedRoles: KnownRoles[keyof KnownRoles][] | null) => {
         return this.auth?.getMiddleware(allowedRoles) ?? this.static.blank
      },
      filterDuplicateRequests: (allowDuplicateRequests: boolean | null) => {
         return this.duplicateRequestFilter.getMiddleware(
            allowDuplicateRequests,
         )
      },
   }
}

//TODO: potentially only allow object and array in validation shcema
