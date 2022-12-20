import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

export type Resolver<Message> = (
   req: ExpressRequest,
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

type ExpressResponseExtension<Message> = {
   ok: (message: Message, data?: any) => Response<Message>;
   badRequest: (message: Message) => Response<Message>;
   unauthorized: (message?: Message) => Response<Message>;
   forbidden: (message?: Message) => Response<Message>;
   notFound: (message?: Message) => Response<Message>;
   conflict: (message?: Message) => Response<Message>;
   methodNotAllowed: (message?: Message) => Response<Message>;
   internalServerError: (message?: Message) => Response<Message>;
   notImplemented: (message?: Message) => Response<Message>;
   tooManyRequests: (message?: Message) => Response<Message>;
};

export type ExtendedExpressResponse<Message> = ExpressResponse & ExpressResponseExtension<Message>;

export type AnyError = new (...args: any[]) => Error;

export type RouteType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
