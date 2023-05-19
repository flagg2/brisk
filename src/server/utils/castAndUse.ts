import {
   Application as ExpressAplication,
   Router as ExpressRouter,
   Request as ExpressRequest,
} from "express"
import {
   UnwrappedMiddlewareResolver,
   UnwrappedBriskResolver,
   BriskRouteType,
   WrappedMiddlewareResolver,
} from "../types"

export async function setRequestField(
   req: ExpressRequest,
   field: string,
   value: any,
) {
   // @ts-ignore
   req[field] = value
}

export async function addAppResolver(
   app: ExpressAplication,
   resolver: WrappedMiddlewareResolver<any, any, any>,
   path = "/",
) {
   app.use(path, resolver as any)
}

export async function addRouterResolvers(
   router: ExpressRouter,
   type: BriskRouteType,
   path: string,
   resolvers: WrappedMiddlewareResolver<any, any, any>[],
) {
   // @ts-ignore
   router[type](path, resolvers as any)
}
