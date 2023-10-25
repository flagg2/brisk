import {
   BriskRouteType,
   UnwrappedBriskResolver,
   UnwrappedMiddlewareResolver,
   AnyError,
   ErrorResolver,
   BriskRequest,
   BriskResponse,
   ExpressRouteType,
   WrappedMiddlewareResolver,
} from "./types"

import {
   Router as ExpressRouter,
   Application as ExpressApplication,
   NextFunction,
} from "express"
import { MiddlewareGenerator } from "./middlewares/Middlewares"
import { AnyData } from "@flagg2/schema"
import { ResponseSender } from "./response/ResponseSender"
import { RequestOptions, UploadRequestOptions } from "./Brisk"
import { ZodSchema, ZodTypeDef } from "zod"
import { pathToRegex, prependSlash } from "./utils/path"
import { Role } from "./middlewares/dynamic/auth"
import { addAppResolver, addRouterResolvers } from "./utils/castAndUse"
import { internalServerError } from "./response/responseContent"
import { TemporaryStorage } from "./TemporaryStorage"
import {
   getUploadFileMiddleware,
   getUploadMetaResolver,
} from "./middlewares/dynamic/upload"

// Class that remebers paths of resources and is table to take a user provided path
// and return (if it exists) the path that matches the user provided path.

type RouteResolver<
   Message,
   ValidationSchema extends ZodSchema<any, ZodTypeDef, any>,
   KnownRoles extends { [key: string]: Role },
> = {
   type: BriskRouteType
   resolver: WrappedMiddlewareResolver<Message, any, any>
   opts?: RequestOptions<ValidationSchema, KnownRoles>
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
      resolver: UnwrappedMiddlewareResolver<Message, UserTokenSchema, string>
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
         addAppResolver(this.app, this.wrapResolver(resolver), path)
      }

      this.app.use("/", this.router)
   }

   //TODO: move to middlewares
   private getRoutingMiddleware() {
      return (
         req: BriskRequest<any, any, any, any>,
         res: BriskResponse<Message>,
         next: NextFunction,
      ) => {
         const matchingPaths = this.getMatchingPaths(req.path)
         if (matchingPaths === undefined || matchingPaths.length === 0) {
            return res.notFound()
         }

         const mostSpecificPaths = this.getMostSpecificPaths(matchingPaths)
         if (mostSpecificPaths.length === 0) {
            return res.notFound()
         }

         const routingInfos = mostSpecificPaths.map(
            (path) => this.routingInfo[path],
         )

         if (routingInfos.length === 0) {
            return res.notFound()
         }

         let parameterizedUrl = ""
         for (const path of mostSpecificPaths) {
            for (const resolver of this.routingInfo[path]) {
               if (resolver.type === req.method.toUpperCase()) {
                  parameterizedUrl = path
                  break
               }
            }
            if (parameterizedUrl !== "") {
               break
            }
         }

         if (parameterizedUrl === "") {
            return res.methodNotAllowed()
         }

         req.parameterizedUrl = parameterizedUrl

         next()
      }
   }

   public addRoute<
      _RouteType extends ExpressRouteType,
      ValidationSchema extends ZodSchema<any>,
      Path extends string,
   >(config: {
      type: _RouteType
      path: Path
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         _RouteType,
         UserTokenSchema,
         Path
      >
      opts?: RequestOptions<ValidationSchema, KnownRoles>
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

      const wrappedResolver = this.wrapResolver(resolver)

      this.addToPath(path, { type, resolver: wrappedResolver, opts })

      let generatedMiddlewares = this.middlewareGen.getResolverMiddlewares(
         this,
         allowedRoles,
         allowDuplicateRequests,
         validation,
      )

      let finalResolvers = [...generatedMiddlewares, wrappedResolver]
      let wrappedResolvers = finalResolvers.map((_resolver) =>
         this.catchErrorsWithin(_resolver),
      )

      addRouterResolvers(
         this.router,
         type.toLowerCase() as BriskRouteType,
         path,
         wrappedResolvers,
      )
   }

   public get<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "GET",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<ValidationSchema, KnownRoles>,
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
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "POST",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<ValidationSchema, KnownRoles>,
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
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "PUT",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<ValidationSchema, KnownRoles>,
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
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "PATCH",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<ValidationSchema, KnownRoles>,
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
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "DELETE",
         UserTokenSchema,
         Path
      >,
      opts?: RequestOptions<ValidationSchema, KnownRoles>,
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
      middleware: UnwrappedMiddlewareResolver<Message, UserTokenSchema, Path>,
   ) {
      this.middlewares.push({
         path: prependSlash(path) as Path,
         resolver: middleware as UnwrappedMiddlewareResolver<Message, any, any>,
      })
   }

   public upload<ValidationSchema extends ZodSchema<any>, Path extends string>(
      path: Path,
      resolver: UnwrappedBriskResolver<
         Message,
         ValidationSchema,
         "UPLOAD",
         UserTokenSchema,
         Path
      >,
      opts?: UploadRequestOptions<ValidationSchema, KnownRoles>,
   ) {
      const storage = new TemporaryStorage(
         opts?.uploadConfig?.metadataValidForMs ?? 60 * 1000,
      )

      const hasMetadata = opts?.validationSchema !== undefined

      if (hasMetadata) {
         this.addRoute({
            type: "POST",
            path: `${path}/meta`,
            opts,
            resolver: getUploadMetaResolver(storage),
         })
      }

      const middleware = getUploadFileMiddleware({
         metaStorage: storage,
         ...opts?.uploadConfig,
         hasMetadata,
      })

      this.app.use(`${path}/file`, middleware as any)

      //TODO: do types properly and remove cast
      this.addRoute({
         type: "POST",
         path: `${path}/file`,
         opts,
         resolver,
      } as any)
   }

   public getRoutingInfo() {
      return this.routingInfo
   }

   public getRequests() {
      return this.requests
   }

   private wrapResolver<
      UserTokenSchema extends object | undefined,
      Path extends string,
   >(
      resolver:
         | UnwrappedBriskResolver<Message, any, any, UserTokenSchema, Path>
         | UnwrappedMiddlewareResolver<Message, UserTokenSchema, Path>,
   ): WrappedMiddlewareResolver<Message, UserTokenSchema, Path> {
      return async (
         req: BriskRequest<any, any, any, any>,
         res: BriskResponse<Message>,
         next: NextFunction,
      ) => {
         //@ts-ignore
         const response = await resolver(req, res)
         if (response !== undefined) {
            return res.respondWith(response)
         }
         return next()
      }
   }

   private getMatchingPaths(userPath: string): string[] {
      return Object.keys(this.routingInfo).filter((route) =>
         new RegExp(pathToRegex(route)).test(userPath),
      )
   }

   // prefer more slashes but less colons
   private getMostSpecificPaths(matchingPaths: string[]): string[] {
      return matchingPaths.reduce<string[]>(
         (prev, curr) => {
            const prevSlashes = prev[0].split("/").length - 1
            const currSlashes = curr.split("/").length - 1
            if (prevSlashes === currSlashes) {
               const prevColonCount = prev[0].split(":").length - 1
               const currColonCount = curr.split(":").length - 1
               if (prevColonCount === currColonCount) {
                  return [...prev, curr]
               }
               return prevColonCount < currColonCount ? prev : [curr]
            }
            return prevSlashes > currSlashes ? prev : [curr]
         },
         [":".repeat(100)],
      )
   }

   private catchErrorsWithin(
      resolver: WrappedMiddlewareResolver<Message, any, any>,
   ) {
      return async (
         //TODO: type this better
         req: any,
         res: BriskResponse<Message>,
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
            return this.responseGenerator.respond(res, internalServerError())
         }
      }
   }

   private addToPath(path: string, resolver: RouteResolver<Message, any, any>) {
      if (this.routingInfo[path] != null) {
         this.routingInfo[path].push(resolver)
      } else {
         this.routingInfo[path] = [resolver]
      }
   }
}
