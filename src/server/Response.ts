import { ErrorMessages } from "./DefaultErrorMessages";
import { Response } from "./types";
import { Response as ExpressResponse } from "express";

function respond<Message>(res: ExpressResponse, message: Message, status: number, data?: any): Response<Message> {
   const response: Response<Message> = {
      message,
      data: data ?? null,
      status,
   };
   res.status(status).send(response);
   return response;
}

export class ResponseGenerator<Message> {
   private messages: ErrorMessages<Message>;
   constructor(defaultErrorMessages: ErrorMessages<Message>) {
      this.messages = defaultErrorMessages;
   }
   ok(res: ExpressResponse, message: Message, data: any): Response<Message> {
      return respond(res, message, 200, data);
   }

   badRequest(res: ExpressResponse, message: Message, data?: any): Response<Message> {
      return respond(res, message, 400, data);
   }

   validationError(res: ExpressResponse, message: Message | undefined, error: any): Response<Message> {
      return respond(res, message ?? this.messages.validationError, 422, error);
   }

   unauthorized(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.unauthorized, 401, data);
   }

   forbidden(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.forbidden, 403, data);
   }

   notFound(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.notFound, 404, data);
   }

   methodNotAllowed(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.methodNotAllowed, 405, data);
   }

   conflict(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.conflict, 409, data);
   }

   tooManyRequests(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.tooManyRequests, 429, data);
   }

   internalServerError(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.internalServerError, 500, data);
   }

   notImplemented(res: ExpressResponse, message?: Message, data?: any): Response<Message> {
      return respond(res, message ?? this.messages.notImplemented, 501, data);
   }
}
