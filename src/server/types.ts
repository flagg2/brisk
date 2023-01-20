import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import zod, { ZodSchema, ZodObject } from "zod";
import { Role } from "./Auth";

export type Resolver<
   Message,
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType
> = (
   req: ExtendedExpressRequest<ValidationSchema, _RouteType>,
   res: ExtendedExpressResponse<Message>,
   next?: NextFunction
) => Promise<Response<Message>> | Response<Message>;

export type MiddlewareResolver<Message> = (
   req: ExpressRequest,
   res: ExtendedExpressResponse<Message>,
   next: NextFunction
) => Promise<Response<Message> | void> | Response<Message> | void;

export type ErrorResolver<Message> = (
   req: ExpressRequest,
   res: ExtendedExpressResponse<Message>,
   next: NextFunction | undefined,
   error: Error
) => Response<Message>;

export type Response<Message> = {
   message: Message;
   data: any;
   status: number;
};

type ResponseFunction<Message, isMessageRequired extends boolean> = isMessageRequired extends true
   ? (message: Message, data?: any) => Response<Message>
   : (message?: Message, data?: any) => Response<Message>;

type ExpressResponseExtension<Message> = {
   ok: ResponseFunction<Message, true>;
   badRequest: ResponseFunction<Message, true>;
   unauthorized: ResponseFunction<Message, false>;
   forbidden: ResponseFunction<Message, false>;
   notFound: ResponseFunction<Message, false>;
   conflict: ResponseFunction<Message, false>;
   methodNotAllowed: ResponseFunction<Message, false>;
   internalServerError: ResponseFunction<Message, false>;
   notImplemented: ResponseFunction<Message, false>;
   tooManyRequests: ResponseFunction<Message, false>;
};

export type ExtendedExpressResponse<Message> = ExpressResponse & ExpressResponseExtension<Message>;

type ExpressRequestExtension<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType
> = {
   body: _RouteType extends "GET"
      ? never
      : ValidationSchema extends ZodSchema<any>
      ? zod.infer<ValidationSchema>
      : never;
   rawBody: _RouteType extends "GET" ? never : string;
   query: _RouteType extends "GET"
      ? ValidationSchema extends ZodSchema<any>
         ? zod.infer<ValidationSchema>
         : never
      : never;
};

export type ExtendedExpressRequest<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType
> = Omit<ExpressRequest, "body" | "query"> & ExpressRequestExtension<ValidationSchema, _RouteType>;

export type AnyError = new (...args: any[]) => Error;

export type RouteType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

export type RolesResolver<AuthResolverStyle extends "token" | "request"> =
   AuthResolverStyle extends "token"
      ? (decodedToken: JwtPayload) => Role[]
      : (req: Request) => Role[];

export type ValidationOptions<ValidationSchema extends ZodSchema<any>> = {
   schema: ValidationSchema;
   isStrict?: boolean;
};
