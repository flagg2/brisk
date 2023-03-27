import { ServerOptions } from "../Brisk"
import { BuiltInMiddlewareResolver } from "../types"
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

   public getDefaultMiddlewares() {
      const middlewares = [
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
      validation?: ZodSchema<any>,
   ) {
      const middlewares: BuiltInMiddlewareResolver<Message>[] = []

      if (allowedRoles) {
         middlewares.push(
            getAuthMiddleware(this.options.authConfig!, allowedRoles),
         )
      }

      if (allowDuplicateRequests) {
         middlewares.push(
            getDuplicateRequestFilterMiddleware(router.getRequests()),
         )
      }

      if (validation) {
         middlewares.push(getSchemaValidationMiddleware(validation))
      }

      return middlewares
   }
}

//TODO: potentially only allow object and array in validation shcema
