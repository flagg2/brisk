import { ErrorMessages } from "./DefaultErrorMessages"
import { RouteResponse } from "./types"
import { Response as ExpressResponse } from "express"

function respond<Message>(
   res: ExpressResponse,
   message: Message,
   status: number,
   data?: any,
): RouteResponse<Message> {
   const response: RouteResponse<Message> = {
      message,
      data: data ?? null,
      status,
   }
   res.status(status).send(response)
   return response
}

export class ResponseSender<Message> {
   private messages: ErrorMessages<Message>
   constructor(defaultErrorMessages: ErrorMessages<Message>) {
      this.messages = defaultErrorMessages
   }
   ok(
      res: ExpressResponse,
      message: Message,
      data: any,
   ): RouteResponse<Message> {
      return respond(res, message, 200, data)
   }

   badRequest(
      res: ExpressResponse,
      message: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message, 400, data)
   }

   validationError(
      res: ExpressResponse,
      message: Message | undefined,
      error: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.validationError, 422, error)
   }

   unauthorized(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.unauthorized, 401, data)
   }

   forbidden(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.forbidden, 403, data)
   }

   notFound(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.notFound, 404, data)
   }

   methodNotAllowed(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.methodNotAllowed, 405, data)
   }

   conflict(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.conflict, 409, data)
   }

   tooManyRequests(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.tooManyRequests, 429, data)
   }

   internalServerError(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(
         res,
         message ?? this.messages.internalServerError,
         500,
         data,
      )
   }

   notImplemented(
      res: ExpressResponse,
      message?: Message,
      data?: any,
   ): RouteResponse<Message> {
      return respond(res, message ?? this.messages.notImplemented, 501, data)
   }

   respondWith(
      expressRes: ExpressResponse,
      response: ResponseContent<Message>,
   ): RouteResponse<Message> {
      const { status, message, data } = response
      switch (status) {
         case 200:
            return this.ok(expressRes, message!, data)
         case 400:
            return this.badRequest(expressRes, message!, data)
         case 401:
            return this.unauthorized(expressRes, message, data)
         case 403:
            return this.forbidden(expressRes, message, data)
         case 404:
            return this.notFound(expressRes, message, data)
         case 405:
            return this.methodNotAllowed(expressRes, message, data)
         case 409:
            return this.conflict(expressRes, message, data)
         case 422:
            return this.validationError(expressRes, message, data)
         case 429:
            return this.tooManyRequests(expressRes, message, data)
         case 500:
            return this.internalServerError(expressRes, message, data)
         case 501:
            return this.notImplemented(expressRes, message, data)
         default:
            return this.internalServerError(expressRes, message, data)
      }
   }
}

type ResponseParams<Message> = {
   data?: any
} & (
   | {
        status: 200 | 400

        message: Message
     }
   | {
        status: 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 501
        message?: Message
     }
)

export class ResponseContent<Message> {
   status: number
   data: any
   message?: Message

   public constructor(params: ResponseParams<Message>) {
      this.message = params.message
      this.data = hasData(params) ? params.data : null
      this.status = params.status
   }
}

function hasData<Message>(
   params: ResponseParams<Message>,
): params is ResponseParams<Message> & { data: any } {
   return params.hasOwnProperty("data")
}
