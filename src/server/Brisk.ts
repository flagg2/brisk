import express, { Request, Response, Application, Router, NextFunction } from "express";
import cors from "cors";
import https from "https";
import http from "http";
import fs from "fs";
import { Middlewares } from "./Middlewares";
import { BriskLogger } from "./Logger";
import { ResponseGenerator } from "./BriskResponse";
import { AnyError, ErrorResolver, ExtendedExpressResponse, MiddlewareResolver, Resolver, RouteType } from "./types";
import helmet from "helmet";
import { ErrorMessages, defaultErrorMessages } from "./DefaultErrorMessages";
import { Auth, Role } from "./Auth";
import { DuplicateRequestFilter } from "./RequestLimiter";
import { ZodSchema } from "zod";

type ServerOptions<Message, KnownRoles> = {
   port: number;
   host?: string;
   httpsConfig?: {
      key: string;
      cert: string;
   };
   corsConfig?: {
      origin: string;
      methods: string;
      allowedHeaders: string;
   };
   authConfig?: {
      signingSecret: string;
      rolesResolver: (decodedToken: any) => Role[];
      knownRoles: KnownRoles;
   };
   loggingMethods?: ((message: string) => void)[];
   errorMessageOverrides?: ErrorMessages<Message>;
   customCatchers?: Map<AnyError, ErrorResolver<Message>>;
   useHelmet?: boolean;
   useDuplicateRequestFilter?: boolean;
};

export type AllowedRouteMethods = {
   [path: string]: RouteType[];
};

type RequestOptions<Message> = {
   middlewares?: MiddlewareResolver<Message>[];
   allowedRoles?: Role[];
   allowDuplicateRequests?: boolean;
};

export type DefaultMessage = { sk: string; en: string };

export class Brisk<Message = DefaultMessage, KnownRoles = never, AuthResolverStyle extends "request" | "token" = "token"> {
   public app: Application;
   public router: Router;
   public roles: KnownRoles;
   private response: ResponseGenerator<Message>;
   private options: ServerOptions<Message, KnownRoles>;
   private allowedMethods: AllowedRouteMethods = {};
   private middlewares: ReturnType<typeof Middlewares>;
   private logger: BriskLogger;
   private auth: Auth<Message, AuthResolverStyle> | null = null;
   private duplicateRequestFilter: DuplicateRequestFilter<Message>;

   constructor(options: {
      port: number;
      host?: string;
      httpsConfig?: {
         key: string;
         cert: string;
      };
      corsConfig?: {
         origin: string;
         methods: string;
         allowedHeaders: string;
      };
      authConfig?: {
         signingSecret: string;
         resolverType?: AuthResolverStyle;
         rolesResolver: AuthResolverStyle extends "token" ? (decodedToken: any) => Role[] : (req: Request) => Role[];
         knownRoles: KnownRoles;
      };
      loggingMethods?: ((message: string) => void)[];
      errorMessageOverrides?: {
         [key in keyof ErrorMessages<Message>]: ErrorMessages<Message>[key];
      };
      customCatchers?: Map<AnyError, ErrorResolver<Message>>;
      useHelmet?: boolean;
      allowDuplicateRequests?: boolean;
   }) {
      this.options = options;
      this.allowedMethods = {};
      this.roles = options.authConfig?.knownRoles ?? ({} as KnownRoles);

      this.app = express();
      this.router = express.Router();
      this.logger = new BriskLogger({
         loggingMethods: options.loggingMethods ?? [(message: string) => console.log(message)],
      });

      this.response = new ResponseGenerator<Message>(
         options.errorMessageOverrides ?? (defaultErrorMessages as ErrorMessages<Message>)
      );
      this.middlewares = Middlewares<Message>(this.response);

      this.app.use(this.middlewares.logRequest(this.logger));
      if (options.useHelmet !== false) {
         this.app.use(helmet());
      }
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(cors());

      if (options.authConfig) {
         const { signingSecret, rolesResolver, resolverType: resolverStyle } = options.authConfig;
         this.auth = new Auth<Message, AuthResolverStyle>(signingSecret, rolesResolver, options.authConfig.resolverType);
      }

      this.duplicateRequestFilter = new DuplicateRequestFilter<Message>(options.allowDuplicateRequests);

      this.app.use("/", this.router);

      // Has to be done like this because of inconsistency in express typings
      // TODO: improve and make it work
      // this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      //    if (err instanceof SyntaxError && "body" in err) {
      //       console.error(err);
      //       res.status(400).send({
      //          message: "Syntax of provided body is invalid",
      //          messageSK: "Invalídny json syntax",
      //          error: "invalid-syntax",
      //       });
      //       return;
      //    }
      //    next();
      // });

      //TODO: doesnt work
   }

   public start() {
      const { port, httpsConfig } = this.options;
      const startUpMessage = `🚀 Server up and running on port ${port} 🚀`;
      if (httpsConfig) {
         const { key, cert } = httpsConfig;
         const httpsServer = https.createServer(
            {
               key: fs.readFileSync(key),
               cert: fs.readFileSync(cert),
            },
            this.app
         );
         httpsServer.listen(port, () => {
            console.log(startUpMessage);
         });
      } else {
         const httpServer = http.createServer({}, this.app);
         httpServer.listen(port, () => {
            console.log(startUpMessage);
         });
      }
      this.router.use(this.middlewares.validateRouteAndMethod(this.allowedMethods));
   }

   public addRoute(config: { type: RouteType; path: string; resolver?: Resolver<Message>; opts?: RequestOptions<Message> }) {
      let { type, path, resolver, opts } = config;
      const { middlewares, allowedRoles, allowDuplicateRequests } = opts ?? {};

      const router = this.router;

      let middlewareResolvers = middlewares ?? [];

      if (this.auth != null && allowedRoles != null) {
         const authMiddleware = this.auth.getMiddleware(allowedRoles);
         middlewareResolvers.unshift(authMiddleware);
      }

      const duplicateRequestMiddleware = this.duplicateRequestFilter.getMiddleware(allowDuplicateRequests);
      middlewareResolvers.unshift(duplicateRequestMiddleware);

      if (!path.startsWith("/")) {
         path = "/" + path;
      }

      if (this.allowedMethods[path] != null) {
         this.allowedMethods[path].push(type);
      } else {
         this.allowedMethods[path] = [type];
      }

      let concatenatedResolvers = [...middlewareResolvers, resolver ?? this.notImplemented()];
      concatenatedResolvers[0] = this.attachResponseMethods(concatenatedResolvers[0]);

      concatenatedResolvers = concatenatedResolvers.map((resolverWithoutErrorCatching) => {
         return this.catchErrors(resolverWithoutErrorCatching, this.options.customCatchers);
      });

      router[type.toLowerCase()](path, concatenatedResolvers);
   }

   public get(path: string, resolver?: Resolver<Message>, opts?: RequestOptions<Message>) {
      this.addRoute({
         type: "GET",
         path,
         resolver,
         opts,
      });
   }

   public post(path: string, resolver?: Resolver<Message>, opts?: RequestOptions<Message>) {
      this.addRoute({
         type: "POST",
         path,
         resolver,
         opts,
      });
   }

   public put(path: string, resolver?: Resolver<Message>, opts?: RequestOptions<Message>) {
      this.addRoute({
         type: "PUT",
         path,
         resolver,
         opts,
      });
   }

   public delete(path: string, resolver?: Resolver<Message>, opts?: RequestOptions<Message>) {
      this.addRoute({
         type: "DELETE",
         path,
         resolver,
         opts,
      });
   }

   public getHost() {
      const { host } = this.options;
      if (host) {
         return `${host}`;
      }
      return undefined;
   }

   public getPort() {
      const { port } = this.options;
      return port;
   }

   private notImplemented(): Resolver<Message> {
      return (_: Request, res: Response) => {
         return this.response.notImplemented(res);
      };
   }

   private catchErrors(fn: MiddlewareResolver<Message>, customCatchers?: Map<AnyError, ErrorResolver<Message>>) {
      return async (req: Request, res: ExtendedExpressResponse<Message>, next: NextFunction) => {
         try {
            return await fn(req, res, next);
         } catch (err: any) {
            const catcher = customCatchers?.get(err.constructor);
            if (catcher != null) {
               return catcher(req, res, next, err);
            }
            console.error(err);
            return this.response.internalServerError(res);
         }
      };
   }

   private attachResponseMethods(fn: MiddlewareResolver<Message>): MiddlewareResolver<Message> {
      return (req: Request, res: ExtendedExpressResponse<Message>, next: NextFunction) => {
         res.ok = (message: Message, data?: any) => {
            return this.response.ok(res, message, data);
         };
         res.badRequest = (message: Message) => {
            return this.response.badRequest(res, message);
         };
         res.unauthorized = (message?: Message) => {
            return this.response.unauthorized(res, message);
         };
         res.forbidden = (message?: Message) => {
            return this.response.forbidden(res, message);
         };
         res.notFound = (message?: Message) => {
            return this.response.notFound(res, message);
         };
         res.conflict = (message?: Message) => {
            return this.response.conflict(res, message);
         };
         res.internalServerError = (message?: Message) => {
            return this.response.internalServerError(res, message);
         };
         res.notImplemented = (message?: Message) => {
            return this.response.notImplemented(res, message);
         };
         res.tooManyRequests = (message?: Message) => {
            return this.response.tooManyRequests(res, message);
         };
         return fn(req, res, next);
      };
   }
}
