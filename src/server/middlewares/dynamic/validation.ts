import { ZodSchema } from "zod"
import { BuiltInMiddlewareResolver, BriskResponse } from "../../types"
import { Request as ExpressRequest, NextFunction } from "express"

export function getSchemaValidationMiddleware<Message>(
   validationSchema: ZodSchema<any>,
): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      try {
         if (req.method === "GET") {
            req.query = validationSchema.parse(req.query)
         } else {
            req.body = validationSchema.parse(req.body)
         }
         next()
      } catch (error: any) {
         // @ts-ignore TODO: fix send config defined error message
         res.validationError("Validation error", error)
      }
   }
}
