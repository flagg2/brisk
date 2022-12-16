import { NextFunction, Request, Response } from "express";
import { AllowedRouteMethods, Brisk, DefaultMessage, RouteType } from "./Brisk";
import { BriskLogger } from "./Logger";
import { hrtime } from "process";
import { Resolver } from "./types";
import { ResponseGenerator } from "./BriskResponse";

function getRequestSizeKB(req: Request) {
   return Number((req.socket.bytesRead / 1024).toFixed(2));
}

export const Middlewares = <Message>(responseGenerator: ResponseGenerator<Message>) => {
   return {
      validateRouteAndMethod(allowedMethods: AllowedRouteMethods) {
         return (req: Request, res: Response, next: NextFunction) => {
            if (allowedMethods[req.path] == null) {
               return responseGenerator.notFound(res);
            }
            if (!allowedMethods[req.path].includes(req.method.toUpperCase() as RouteType)) {
               return responseGenerator.methodNotAllowed(res);
            }
            next();
         };
      },
      logRequest(logger: BriskLogger) {
         return async (req: Request, res: Response, next: NextFunction) => {
            const start = hrtime();

            next();

            res.on("finish", () => {
               const end = hrtime(start);
               const time = end[0] * 1e3 + end[1] * 1e-6;

               const size = getRequestSizeKB(req);

               logger.logRequest({
                  method: req.method,
                  path: req.path,
                  statusCode: res.statusCode,
                  durationMs: time,
                  sizeKB: size,
               });
            });
         };
      },
   } satisfies {
      [path: string]: (...args: any[]) => Resolver<Message, true> | void;
   };
};
