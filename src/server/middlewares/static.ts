import {
   Request as ExpressRequest,
   NextFunction,
   json,
   urlencoded,
} from "express"
import cors from "cors"
import helmet from "helmet"
import { hrtime } from "process"
import { logRequest } from "../logRequest"
import { BuiltInMiddlewareResolver, BriskResponse } from "../types"
import { ResponseSender } from "../response/ResponseSender"
import {
   ResponseContent,
   ok,
   created,
   badRequest,
   unauthorized,
   forbidden,
   notFound,
   methodNotAllowed,
   conflict,
   unprocessableEntity,
   tooManyRequests,
   internalServerError,
   notImplemented,
} from "../response/responseContent"

function getRequestSizeKB(req: ExpressRequest) {
   return Number((req.socket.bytesRead / 1024).toFixed(2))
}

export function getLogRequestMiddleware<Message>(
   loggingMethods?: ((message: string) => void)[],
): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      const start = hrtime()

      next()

      res.on("finish", () => {
         const end = hrtime(start)
         const time = end[0] * 1e3 + end[1] * 1e-6

         const size = getRequestSizeKB(req)

         logRequest(
            {
               method: req.method,
               path: req.path,
               statusCode: res.statusCode,
               durationMs: time,
               sizeKB: size,
            },
            loggingMethods,
         )
      })
   }
}

export function getNotImplementedMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return (_: ExpressRequest, res: BriskResponse<Message>) => {
      return res.notImplemented()
   }
}

export function getHelmetMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return helmet()
}

export function getJsonMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return json()
}

export function getUrlencodedMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return urlencoded({ extended: true })
}

export function getCorsMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return cors()
}

export function getBlankMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return (
      _: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      next()
   }
}

export function getKeepRawBodyMiddleware<
   Message,
>(): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      let request = req as ExpressRequest & {
         rawBody: string
      }
      request.rawBody = ""
      req.on("data", (chunk) => {
         request.rawBody += chunk
      })

      next()
   }
}

export function getAttachResponseMethodsMiddleware<Message>(
   responseSender: ResponseSender<Message>,
): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      res.ok = (message?: Message, data?: any) => {
         return responseSender.respond(res, ok({ message, data }))
      }
      res.created = (message?: Message, data?: any) => {
         return responseSender.respond(res, created({ message, data }))
      }
      res.badRequest = (message?: Message, data?: any) => {
         return responseSender.respond(res, badRequest({ message, data }))
      }
      res.unauthorized = (message?: Message, data?: any) => {
         return responseSender.respond(res, unauthorized({ message, data }))
      }
      res.forbidden = (message?: Message, data?: any) => {
         return responseSender.respond(res, forbidden({ message, data }))
      }
      res.notFound = (message?: Message, data?: any) => {
         return responseSender.respond(res, notFound({ message, data }))
      }
      res.methodNotAllowed = (message?: Message, data?: any) => {
         return responseSender.respond(res, methodNotAllowed({ message, data }))
      }
      res.conflict = (message?: Message, data?: any) => {
         return responseSender.respond(res, conflict({ message, data }))
      }
      res.internalServerError = (message?: Message, data?: any) => {
         return responseSender.respond(
            res,
            internalServerError({ message, data }),
         )
      }
      res.notImplemented = (message?: Message, data?: any) => {
         return responseSender.respond(res, notImplemented({ message, data }))
      }
      res.tooManyRequests = (message?: Message, data?: any) => {
         return responseSender.respond(res, tooManyRequests({ message, data }))
      }
      res.methodNotAllowed = (message?: Message, data?: any) => {
         return responseSender.respond(res, methodNotAllowed({ message, data }))
      }
      res.unprocessableEntity = (message?: Message, data?: any) => {
         return responseSender.respond(
            res,
            unprocessableEntity({ message, data }),
         )
      }
      res.tooManyRequests = (message?: Message, data?: any) => {
         return responseSender.respond(res, tooManyRequests({ message, data }))
      }
      res.internalServerError = (message?: Message, data?: any) => {
         return responseSender.respond(
            res,
            internalServerError({ message, data }),
         )
      }
      res.notImplemented = (message?: Message, data?: any) => {
         return responseSender.respond(res, notImplemented({ message, data }))
      }
      res.respondWith = (content: ResponseContent<Message>) => {
         return responseSender.respond(res, content)
      }
      next()
   }
}
