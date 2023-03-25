import { NextFunction, Request as ExpressRequest } from "express"
import { ResponseSender } from "./Response"
import {
   AnyError,
   ErrorResolver,
   ExtendedExpressResponse,
   BuiltInMiddlewareResolver,
} from "./types"

export class Wrappers<Message> {
   private responseGenerator: ResponseSender<Message>
   private customCatchers: Map<AnyError, ErrorResolver<Message>> | undefined
   constructor(
      responseGenerator: ResponseSender<Message>,
      customCatchers?: Map<AnyError, ErrorResolver<Message>>,
   ) {
      this.responseGenerator = responseGenerator
      this.customCatchers = customCatchers
   }

   private catchErrors(fn: BuiltInMiddlewareResolver<Message>) {
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

   public wrapWithErrorCatchers(
      resolvers: BuiltInMiddlewareResolver<Message>[],
   ) {
      resolvers = resolvers.map((resolver) => this.catchErrors(resolver))
      return resolvers
   }
}
