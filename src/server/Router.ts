import {
   RouteType,
   Resolver,
   CustomMiddlewareResolver,
   BuiltInMiddlewareResolver,
   AnyError,
   ErrorResolver,
   ExtendedExpressRequest,
   ExtendedExpressResponse,
} from "./types"

import {
   Router as ExpressRouter,
   Application as ExpressApplication,
   NextFunction,
} from "express"
import { MiddlewareGenerator } from "./middlewares/Middlewares"
import { AnyData } from "@flagg2/schema"
import { ResponseSender } from "./response/ResponseSender"
import { RequestOptions } from "./Brisk"
import { ZodSchema, ZodTypeDef } from "zod"
import { pathToRegex, prependSlash } from "./utils/path"
import { getNotImplementedMiddleware } from "./middlewares/static"
import { Role } from "./middlewares/dynamic/auth"
import { addAppResolver, addRouterResolvers } from "./utils/castAndUse"

// Class that remebers paths of resources and is table to take a user provided path
// and return (if it exists) the path that matches the user provided path.

type RouteResolver<
   Message,
   ValidationSchema extends ZodSchema<any, ZodTypeDef, any>,
   KnownRoles extends { [key: string]: Role },
> = {
   type: RouteType
   resolver:
      | Resolver<Message, any, any, any, any>
      | CustomMiddlewareResolver<Message, any, any>
      | BuiltInMiddlewareResolver<Message>
   opts?: RequestOptions<Message, ValidationSchema, KnownRoles>
}

export class Router<
   Message,
   KnownRoles extends { [key: string]: Role },
   UserTokenSchema extends AnyData | undefined,
> {
   private app: ExpressApplication
   private routingInfo: {
      [path: string]: RouteResolver<Message, any, KnownRoles>[]
   } = {}
   private router: ExpressRouter
   private middlewareGen: MiddlewareGenerator<
      Message,
      KnownRoles,
      UserTokenSchema
   >
   private responseGenerator: ResponseSender<Message>
   private customCatchers: Map<AnyError, ErrorResolver<Message>> | undefined
   private middlewares: {
      resolver: CustomMiddlewareResolver<Message, UserTokenSchema, string>
      path: string
   }[] = []
   private requests = new Set<string>()

   public constructor(
      app: ExpressApplication,
      middlewareGen: MiddlewareGenerator<Message, KnownRoles, UserTokenSchema>,
      responseGen: ResponseSender<Message>,
      customCatchers?: Map<AnyError, ErrorResolver<Message>>,
   ) {
      this.router = ExpressRouter()
      this.app = app
      this.middlewareGen = middlewareGen
      this.responseGenerator = responseGen
      this.customCatchers = customCatchers

      for (const resolver of this.middlewareGen.getDefaultMiddlewares()) {
         addAppResolver(app, resolver)
      }
   }

   public start() {
      addAppResolver(this.app, this.getRoutingMiddleware())

      for (const { path, resolver } of this.middlewares) {
         addAppResolver(this.app, resolver)
      }

      this.app.use("/", this.router)
   }

   //TODO: move to middlewares
   private getRoutingMiddleware() {
      return (
         req: ExtendedExpressRequest<any, any, any, any>,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         const matchingPath = this.getMatchingPath(req.path)
         if (matchingPath == null) {
            return res.notFound()
         }
         if (
            !this.routingInfo[matchingPath].some(
               (resolver) => resolver.type === req.method.toUpperCase(),
            )
         ) {
            return res.methodNotAllowed()
         }

         req.parameterizedUrl = matchingPath

         next()
      }
   }

   public addRoute<
      _RouteType extends RouteType,
      ValidationSchema extends ZodSchema<any>,
      Path extends string,
   >(config: {
      type: _RouteType
      path: Path
      resolver?: Resolver<
         Message,
         ValidationSchema,
         _RouteType,
         UserTokenSchema,
         Path
      >
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>
   }) {
      //TODO: maybe add later
      // if (this.started) {
      //    throw new Error("Cannot add routes after server has started")
      // }

      let { type, path, resolver, opts } = config
      const {
         allowedRoles,
         allowDuplicateRequests,
         validationSchema: validation,
      } = opts ?? {}

      path = prependSlash(path) as Path

      const resolverOrNotImplemented = resolver ?? getNotImplementedMiddleware()

      this.addToPath(path, { type, resolver: resolverOrNotImplemented, opts })

      let generatedMiddlewares = this.middlewareGen.getResolverMiddlewares(
         this,
         allowedRoles,
         allowDuplicateRequests,
         validation,
      )

      let finalResolvers = [...generatedMiddlewares, resolverOrNotImplemented]
      let wrappedResolvers = finalResolvers.map((_resolver) =>
         this.catchErrorsWithin(_resolver),
      )

      addRouterResolvers(
         this.router,
         type.toLowerCase() as RouteType,
         path,
         wrappedResolvers,
      )
   }

   public get<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "GET",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "GET",
         path,
         resolver,
         opts,
      })
   }

   public post<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "POST",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "POST",
         path,
         resolver,
         opts,
      })
   }

   public put<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "PUT",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "PUT",
         path,
         resolver,
         opts,
      })
   }

   public patch<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "PATCH",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "PATCH",
         path,
         resolver,
         opts,
      })
   }

   public delete<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver?: Resolver<
         Message,
         ValidationSchema,
         "DELETE",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<Message, ValidationSchema, KnownRoles>,
   ) {
      this.addRoute({
         type: "DELETE",
         path,
         resolver,
         opts,
      })
   }

   public use<Path extends string>(
      path: Path,
      middleware: CustomMiddlewareResolver<Message, UserTokenSchema, Path>,
   ) {
      this.middlewares.push({
         path: prependSlash(path) as Path,
         resolver: middleware as CustomMiddlewareResolver<Message, any, any>,
      })
   }

   public getRoutingInfo() {
      return this.routingInfo
   }

   public getRequests() {
      return this.requests
   }

   private getMatchingPath(userPath: string) {
      return Object.keys(this.routingInfo).find((route) =>
         new RegExp(pathToRegex(route)).test(userPath),
      )
   }

   private catchErrorsWithin(
      resolver:
         | BuiltInMiddlewareResolver<Message>
         | Resolver<Message, any, any, any, any>,
   ) {
      return async (
         //TODO: type this better
         req: any,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         try {
            return await resolver(req, res, next)
         } catch (err: any) {
            const catcher = this.customCatchers?.get(err.constructor)
            if (catcher != null) {
               return catcher(req, res, next, err)
            }
            console.error(err)
            return this.responseGenerator.internalServerError(res)
         }
      }
   }

   private addToPath(path: string, type: RouteResolver<Message, any, any>) {
      if (this.routingInfo[path] != null) {
         this.routingInfo[path].push(type)
      } else {
         this.routingInfo[path] = [type]
      }
   }
}
