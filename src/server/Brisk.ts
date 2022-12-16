import express, { Request, Response, Application, Router, NextFunction } from "express";
import cors from "cors";
import https from "https";
import http from "http";
import fs from "fs";
import { Middlewares } from "./Middlewares";
import { BriskLogger } from "./Logger";
import { ResponseGenerator } from "./BriskResponse";
import { ExactMatch, Resolver } from "./types";
import helmet from "helmet";
import { DefaultErrorMessages, defaultErrorMessages } from "./DefaultErrorMessages";

//TODO: baseErrorOverrides should not be required
type ServerOptions<DefaultErrorMessagesOverrideRequired, Message> = {
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
   loggingMethods?: ((message: string) => void)[];
   baseErrorOverrides: DefaultErrorMessagesOverrideRequired extends true ? DefaultErrorMessages<Message> : null;
   useHelmet?: boolean;
};

export type RouteType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
export type AllowedRouteMethods = {
   [path: string]: RouteType[];
};

export type DefaultMessage = { sk: string; en: string };

export class Brisk<Message = DefaultMessage> {
   public app: Application;
   public router: Router;
   public response: ResponseGenerator<Message>;
   private options: ServerOptions<Message extends DefaultMessage ? false : true, Message>;
   private allowedMethods: AllowedRouteMethods = {};
   private middlewares: ReturnType<typeof Middlewares>;
   private logger: BriskLogger;

   constructor(options: ServerOptions<Message extends DefaultMessage ? false : true, Message>) {
      this.options = options;

      this.app = express();
      this.router = express.Router();
      this.logger = new BriskLogger({
         loggingMethods: options.loggingMethods ?? [(message: string) => console.log(message)],
      });

      this.response = new ResponseGenerator<Message>(
         options.baseErrorOverrides ?? (defaultErrorMessages as DefaultErrorMessages<Message>)
      );
      this.middlewares = Middlewares<Message>(this.response);

      this.app.use(this.middlewares.logRequest(this.logger));
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      this.app.use(cors());
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

      if (options.useHelmet !== false) {
         this.app.use(helmet());
      }
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

   public addRoute(options: { type: RouteType; path: string; resolvers: Resolver<Message>[] }) {
      let { type, path, resolvers } = options;

      if (!path.startsWith("/")) {
         path = "/" + path;
      }

      if (this.allowedMethods[path] == null) {
         this.allowedMethods[path] = [];
      }
      this.allowedMethods[path].push(type);

      const router = this.router;

      resolvers = resolvers.concat([this.notImplemented()]);
      resolvers = resolvers.map((resolverWithoutErrorCatching) => {
         return this.catchErrors(resolverWithoutErrorCatching);
      });

      router[type.toLowerCase()](path, ...resolvers);
   }

   public get(path: string, ...resolvers: Resolver<Message>[]) {
      this.addRoute({
         type: "GET",
         path,
         resolvers,
      });
   }

   public post(path: string, ...resolvers: Resolver<Message>[]) {
      this.addRoute({
         type: "POST",
         path,
         resolvers,
      });
   }

   public put(path: string, ...resolvers: Resolver<Message>[]) {
      this.addRoute({
         type: "PUT",
         path,
         resolvers,
      });
   }

   public delete(path: string, ...resolvers: Resolver<Message>[]) {
      this.addRoute({
         type: "DELETE",
         path,
         resolvers,
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
      return (req: Request, res: Response) => {
         return this.response.notImplemented(res);
      };
   }

   private catchErrors(fn: Resolver<Message>, customCatchers?: Map<Error, Resolver<Message>>) {
      return async (req: Request, res: Response) => {
         try {
            return await fn(req, res);
         } catch (err) {
            if (err instanceof Error) {
               if (customCatchers && customCatchers.has(err)) {
                  return customCatchers.get(err)!!(req, res);
               }
            }
            return this.response.internalServerError(res);
         }
      };
   }
}
