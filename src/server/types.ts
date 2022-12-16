import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

export type Resolver<Message, isMiddleWare = false> = isMiddleWare extends false
   ? (req: ExpressRequest, res: ExpressResponse) => Promise<Response<Message>> | Response<Message>
   : (
        req: ExpressRequest,
        res: ExpressResponse,
        next: NextFunction
     ) => Promise<Response<Message> | void> | Response<Message> | void;

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
};

export type ExtendedExpressResponse<Message> = ExpressResponse & ExpressResponseExtension<Message>;

export type ExactMatch<T, Shape> = T extends Shape ? (Exclude<keyof T, keyof Shape> extends never ? T : never) : never;
