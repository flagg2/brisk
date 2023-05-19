import { ServerOptions } from "../Brisk"
import { ResponseSender } from "../response/ResponseSender"
import { ZodSchema, ZodObject } from "zod"
import { AnyData } from "@flagg2/schema"
import { Router } from "../Router"
import {
   getAttachResponseMethodsMiddleware,
   getCorsMiddleware,
   getHelmetMiddleware,
   getJsonMiddleware,
   getKeepRawBodyMiddleware,
   getLogRequestMiddleware,
   getUrlencodedMiddleware,
} from "./static"
import { getSchemaValidationMiddleware } from "./dynamic/validation"
import { getAuthMiddleware, Role } from "./dynamic/auth"
import { getDuplicateRequestFilterMiddleware } from "./dynamic/duplicateRequestFilter.ts"
import { WrappedMiddlewareResolver } from "../types"

export class MiddlewareGenerator<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
> {
   private options: ServerOptions<Message, KnownRoles, UserTokenSchema>
   private responseSender: ResponseSender<Message>

   constructor(
      options: ServerOptions<Message, KnownRoles, UserTokenSchema>,
      response: ResponseSender<Message>,
   ) {
      this.options = options
      this.responseSender = response
   }

   public getDefaultMiddlewares(): WrappedMiddlewareResolver<
      Message,
      any,
      any
   >[] {
      const middlewares: WrappedMiddlewareResolver<Message, any, any>[] = [
         getAttachResponseMethodsMiddleware(this.responseSender),
         getLogRequestMiddleware(this.options.loggingMethods),
         getKeepRawBodyMiddleware(),
         getJsonMiddleware(),
         getUrlencodedMiddleware(),
         getCorsMiddleware(),
      ]

      if (this.options.useHelmet) {
         middlewares.push(getHelmetMiddleware())
      }
      return middlewares
   }

   public getResolverMiddlewares(
      router: Router<any, any, any>,
      allowedRoles?: KnownRoles[keyof KnownRoles][],
      allowDuplicateRequests?: boolean,
      validationSchema?: ZodSchema<any>,
   ) {
      const middlewares: WrappedMiddlewareResolver<Message, any, any>[] = []

      middlewares.push(
         // @ts-ignore
         getAuthMiddleware(
            this.options.authConfig!,
            allowedRoles,
         ) as WrappedMiddlewareResolver<Message, any, any>,
      )

      if (allowDuplicateRequests !== true) {
         middlewares.push(
            getDuplicateRequestFilterMiddleware(
               router.getRequests.bind(router),
            ),
         )
      }

      if (validationSchema) {
         middlewares.push(getSchemaValidationMiddleware(validationSchema))
      }

      return middlewares
   }
}
