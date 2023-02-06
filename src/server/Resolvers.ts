import { NextFunction, Request, Response } from "express";
import { AllowedRouteMethods, ServerOptions } from "./Brisk";
import { BriskLogger } from "./Logger";
import { hrtime } from "process";
import {
   ExtendedExpressRequest,
   ExtendedExpressResponse,
   MiddlewareResolver,
   RouteType,
   ValidationOptions,
} from "./types";
import { ResponseGenerator } from "./Response";
import helmet from "helmet";
import { ZodSchema, ZodObject } from "zod";
import express from "express";
import cors from "cors";
import { Auth, Role } from "./Auth";
import { DuplicateRequestFilter } from "./RequestLimiter";

function getRequestSizeKB(req: Request) {
   return Number((req.socket.bytesRead / 1024).toFixed(2));
}

export class Resolvers<
   Message,
   KnownRoles extends {
      [key: string]: Role;
   },
   AuthResolverStyle extends "request" | "token"
> {
   private options: ServerOptions<Message, KnownRoles, AuthResolverStyle>;
   private logger: BriskLogger;
   private response: ResponseGenerator<Message>;
   private duplicateRequestFilter: DuplicateRequestFilter<Message>;
   private auth: Auth<Message, AuthResolverStyle> | null;

   constructor(
      options: ServerOptions<Message, KnownRoles, AuthResolverStyle>,
      logger: BriskLogger,
      response: ResponseGenerator<Message>,
      duplicateRequestFilter: DuplicateRequestFilter<Message>,
      auth: Auth<Message, AuthResolverStyle> | null
   ) {
      this.options = options;
      this.logger = logger;
      this.response = response;
      this.duplicateRequestFilter = duplicateRequestFilter;
      this.auth = auth;
   }

   public static = {
      logRequest: async (req: Request, res: Response, next: NextFunction) => {
         const start = hrtime();

         next();

         res.on("finish", () => {
            const end = hrtime(start);
            const time = end[0] * 1e3 + end[1] * 1e-6;

            const size = getRequestSizeKB(req);

            this.logger.logRequest({
               method: req.method,
               path: req.path,
               statusCode: res.statusCode,
               durationMs: time,
               sizeKB: size,
            });
         });
      },
      notImplemented: (_: Request, res: Response) => {
         return this.response.notImplemented(res);
      },
      helmet: helmet(),
      json: express.json(),
      urlencoded: express.urlencoded({ extended: true }),
      cors: cors(),
      blank: (_: Request, res: Response, next: NextFunction) => {
         next();
      },
      keepRawBody: (req: Request, res: Response, next: NextFunction) => {
         let request = req as Request & {
            rawBody: string;
         };
         request.rawBody = "";
         req.on("data", (chunk) => {
            request.rawBody += chunk;
         });

         next();
      },
   };

   public getServerCreationMiddlewares = () => {
      const middlewares = [
         this.static.logRequest,
         this.static.keepRawBody,
         this.static.json,
         this.static.urlencoded,
         this.static.cors,
      ];
      if (this.options.useHelmet) {
         middlewares.push(this.static.helmet);
      }
      return middlewares;
   };

   public getServerStartUpMiddlewares = (allowedMethods: AllowedRouteMethods) => {
      const middlewares: express.RequestHandler[] = [];
      middlewares.push(this.dynamic.validateRouteAndMethod(allowedMethods));
      return middlewares;
   };

   public getRouteMiddlewares(
      allowedRoles: KnownRoles[keyof KnownRoles][] | null,
      allowDuplicateRequests: boolean | null,
      validation: ValidationOptions<ZodSchema<any>> | null
   ) {
      const middlewares: MiddlewareResolver<Message>[] = [
         this.dynamic.authenticate(allowedRoles),
         this.dynamic.filterDuplicateRequests(allowDuplicateRequests),
         this.dynamic.validateSchema(validation),
      ];
      return middlewares;
   }

   dynamic = {
      validateSchema:
         (validation: ValidationOptions<ZodSchema<any>> | null) =>
         (req: Request, res: Response, next: NextFunction) => {
            if (validation == null) {
               return next();
            }

            const { schema, isStrict } = validation;
            function maybeStrictSchema() {
               if (isStrict !== false && schema instanceof ZodObject) {
                  return schema.strict();
               }
               return schema;
            }

            try {
               if (req.method === "GET") {
                  req.query = maybeStrictSchema().parse(req.query);
               } else {
                  req.body = maybeStrictSchema().parse(req.body);
               }
               next();
            } catch (error: any) {
               this.response.validationError(res, undefined, error);
            }
         },
      validateRouteAndMethod:
         (allowedMethods: AllowedRouteMethods) =>
         (req: Request, res: Response, next: NextFunction) => {
            if (allowedMethods[req.path] == null) {
               return this.response.notFound(res);
            }
            if (!allowedMethods[req.path].includes(req.method.toUpperCase() as RouteType)) {
               return this.response.methodNotAllowed(res);
            }
            next();
         },
      authenticate: (allowedRoles: KnownRoles[keyof KnownRoles][] | null) => {
         return this.auth?.getMiddleware(allowedRoles) ?? this.static.blank;
      },
      filterDuplicateRequests: (allowDuplicateRequests: boolean | null) => {
         return this.duplicateRequestFilter.getMiddleware(allowDuplicateRequests);
      },
   };
}

//TODO: potentially only allow object and array in validation shcema
