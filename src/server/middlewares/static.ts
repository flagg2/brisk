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
import { WrappedMiddlewareResolver, BriskResponse } from "../types"
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
   ResponseParams,
} from "../response/responseContent"

function getRequestSizeKB(req: ExpressRequest) {
   return Number((req.socket.bytesRead / 1024).toFixed(2))
}

export function getLogRequestMiddleware<Message>(
   loggingMethods?: ((message: string) => void)[],
): WrappedMiddlewareResolver<Message, any, any> {
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
>(): WrappedMiddlewareResolver<Message, any, any> {
   return (_: ExpressRequest, res: BriskResponse<Message>) => {
      return res.notImplemented()
   }
}

export function getHelmetMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
   return helmet()
}

export function getJsonMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
   return json()
}

export function getUrlencodedMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
   return urlencoded({ extended: true })
}

export function getCorsMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
   return cors()
}

export function getBlankMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
   return (
      _: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      next()
   }
}

export function getKeepRawBodyMiddleware<Message>(): WrappedMiddlewareResolver<
   Message,
   any,
   any
> {
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
): WrappedMiddlewareResolver<Message, any, any> {
   return (
      req: ExpressRequest,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      res.ok = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, ok(params))
      }

      res.created = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, created(params))
      }

      res.badRequest = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, badRequest(params))
      }

      res.unauthorized = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, unauthorized(params))
      }

      res.forbidden = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, forbidden(params))
      }

      res.notFound = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, notFound(params))
      }

      res.methodNotAllowed = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, methodNotAllowed(params))
      }

      res.conflict = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, conflict(params))
      }

      res.internalServerError = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, internalServerError(params))
      }

      res.notImplemented = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, notImplemented(params))
      }

      res.tooManyRequests = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, tooManyRequests(params))
      }

      res.unprocessableEntity = (params?: ResponseParams<Message>) => {
         return responseSender.respond(res, unprocessableEntity(params))
      }

      res.respondWith = (content: ResponseContent<Message>) => {
         return responseSender.respond(res, content)
      }

      next()
   }
}
