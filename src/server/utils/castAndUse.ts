import {
   Application as ExpressAplication,
   Router as ExpressRouter,
} from "express"
import {
   BuiltInMiddlewareResolver,
   CustomMiddlewareResolver,
   Resolver,
   RouteType,
} from "../types"

export async function addAppResolver(
   app: ExpressAplication,
   resolver:
      | BuiltInMiddlewareResolver<any>
      | CustomMiddlewareResolver<any, any, any>
      | Resolver<any, any, any, any, any>,
   path = "/",
) {
   app.use(path, resolver as any)
}

export async function addRouterResolvers(
   router: ExpressRouter,
   type: RouteType,
   path: string,
   resolvers: (
      | BuiltInMiddlewareResolver<any>
      | CustomMiddlewareResolver<any, any, any>
      | Resolver<any, any, any, any, any>
   )[],
) {
   // @ts-ignore
   router[type](path, resolvers as any)
}
