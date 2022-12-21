import { NextFunction, Request as ExpressRequest } from "express";
import { ResponseGenerator } from "./Response";
import { AnyError, ErrorResolver, ExtendedExpressResponse, MiddlewareResolver } from "./types";

export class Wrappers<Message> {
   private responseGenerator: ResponseGenerator<Message>;
   private customCatchers: Map<AnyError, ErrorResolver<Message>> | undefined;
   constructor(responseGenerator: ResponseGenerator<Message>, customCatchers?: Map<AnyError, ErrorResolver<Message>>) {
      this.responseGenerator = responseGenerator;
      this.customCatchers = customCatchers;
   }

   public catchErrors(fn: MiddlewareResolver<Message>) {
      return async (req: ExpressRequest, res: ExtendedExpressResponse<Message>, next: NextFunction) => {
         try {
            return await fn(req, res, next);
         } catch (err: any) {
            const catcher = this.customCatchers?.get(err.constructor);
            if (catcher != null) {
               return catcher(req, res, next, err);
            }
            console.error(err);
            return this.responseGenerator.internalServerError(res);
         }
      };
   }

   public attachResponseMethods(fn: MiddlewareResolver<Message>): MiddlewareResolver<Message> {
      return (req: ExpressRequest, res: ExtendedExpressResponse<Message>, next: NextFunction) => {
         res.ok = (message: Message, data?: any) => {
            return this.responseGenerator.ok(res, message, data);
         };
         res.badRequest = (message: Message) => {
            return this.responseGenerator.badRequest(res, message);
         };
         res.unauthorized = (message?: Message) => {
            return this.responseGenerator.unauthorized(res, message);
         };
         res.forbidden = (message?: Message) => {
            return this.responseGenerator.forbidden(res, message);
         };
         res.notFound = (message?: Message) => {
            return this.responseGenerator.notFound(res, message);
         };
         res.conflict = (message?: Message) => {
            return this.responseGenerator.conflict(res, message);
         };
         res.internalServerError = (message?: Message) => {
            return this.responseGenerator.internalServerError(res, message);
         };
         res.notImplemented = (message?: Message) => {
            return this.responseGenerator.notImplemented(res, message);
         };
         res.tooManyRequests = (message?: Message) => {
            return this.responseGenerator.tooManyRequests(res, message);
         };
         return fn(req, res, next);
      };
   }

   public wrapRoute(resolvers: MiddlewareResolver<Message>[]) {
      resolvers[0] = this.attachResponseMethods(resolvers[0]);
      return resolvers.map((resolver) => this.catchErrors(resolver));
   }
}
