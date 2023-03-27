import { ZodSchema } from "zod"
import { ResponseSender } from "../../response/ResponseSender"
import { BuiltInMiddlewareResolver, ExtendedExpressResponse } from "../../types"
import { Request as ExpressRequest, NextFunction } from "express"

export function getSchemaValidationMiddleware<Message>(
   schema: ZodSchema<any>,
): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: ExtendedExpressResponse<Message>,
      next: NextFunction,
   ) => {
      try {
         if (req.method === "GET") {
            req.query = schema.parse(req.query)
         } else {
            req.body = schema.parse(req.body)
         }
         next()
      } catch (error: any) {
         // @ts-ignore TODO: fix send config defined error message
         res.validationError("Validation error", error)
      }
   }
}
