import { NextFunction, Request as ExpressRequest } from "express"
import { ResponseGenerator } from "./Response"
import {
   AnyError,
   ErrorResolver,
   ExtendedExpressResponse,
   MiddlewareResolver,
   Resolver,
} from "./types"

export class Wrappers<Message> {
   private responseGenerator: ResponseGenerator<Message>
   private customCatchers: Map<AnyError, ErrorResolver<Message>> | undefined
   constructor(
      responseGenerator: ResponseGenerator<Message>,
      customCatchers?: Map<AnyError, ErrorResolver<Message>>,
   ) {
      this.responseGenerator = responseGenerator
      this.customCatchers = customCatchers
   }

   private catchErrors(fn: MiddlewareResolver<Message>) {
      return async (
         req: ExpressRequest,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         try {
            return await fn(req, res, next)
         } catch (err: any) {
            const catcher = this.customCatchers?.get(err.constructor)
            if (catcher != null) {
               return catcher(req, res, next, err)
            }
            console.error(err)
            return this.responseGenerator.internalServerError(res)
         }
      }
   }

   private attachResponseMethods(
      fn: MiddlewareResolver<Message>,
   ): MiddlewareResolver<Message> {
      return (
         req: ExpressRequest,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         res.ok = (message: Message, data?: any) => {
            return this.responseGenerator.ok(res, message, data)
         }
         res.badRequest = (message: Message, data?: any) => {
            return this.responseGenerator.badRequest(res, message, data)
         }
         res.unauthorized = (message?: Message, data?: any) => {
            return this.responseGenerator.unauthorized(res, message, data)
         }
         res.forbidden = (message?: Message, data?: any) => {
            return this.responseGenerator.forbidden(res, message, data)
         }
         res.notFound = (message?: Message, data?: any) => {
            return this.responseGenerator.notFound(res, message, data)
         }
         res.conflict = (message?: Message, data?: any) => {
            return this.responseGenerator.conflict(res, message, data)
         }
         res.internalServerError = (message?: Message, data?: any) => {
            return this.responseGenerator.internalServerError(
               res,
               message,
               data,
            )
         }
         res.notImplemented = (message?: Message, data?: any) => {
            return this.responseGenerator.notImplemented(res, message, data)
         }
         res.tooManyRequests = (message?: Message, data?: any) => {
            return this.responseGenerator.tooManyRequests(res, message, data)
         }
         return fn(req, res, next)
      }
   }

   public wrapRoute(resolvers: MiddlewareResolver<Message>[]) {
      resolvers[0] = this.attachResponseMethods(resolvers[0])
      resolvers = resolvers.map((resolver) => this.catchErrors(resolver))
      return resolvers
   }
}
