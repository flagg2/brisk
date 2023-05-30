import { ZodSchema } from "zod"
import { WrappedMiddlewareResolver, BriskResponse } from "../../types"
import { Request as ExpressRequest, NextFunction } from "express"

export function getSchemaValidationMiddleware<Message>(
   validationSchema: ZodSchema<any>,
): WrappedMiddlewareResolver<Message, any, any> {
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
         if (process.env.DEBUG) {
            console.warn(error)
         }
         res.unprocessableEntity({
            data: error,
         })
      }
   }
}
