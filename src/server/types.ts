import { Convert } from "@flagg2/schema"
import e, {
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express"
import zod, { ZodSchema } from "zod"
import { Role } from "./middlewares/dynamic/auth"
import { ResponseContent } from "./response/responseContent"
import { StatusCode, StatusName } from "./response/statusCodes"

//TODO: rename where appropriate
export type BriskNext = NextFunction

export type Resolver<
   Message,
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
   Path extends string,
> = (
   req: BriskRequest<ValidationSchema, _RouteType, UserTokenSchema, Path>,
   res: BriskResponse<Message>,
   next?: NextFunction,
) => Promise<RouteResponse<Message>> | RouteResponse<Message>

//TODO: using post here but should be a designated type
export type CustomMiddlewareResolver<
   Message,
   UserTokenSchema extends object | undefined,
   Path extends string,
> = (
   req: BriskRequest<null, "MIDDLEWARE", UserTokenSchema, Path>,
   res: BriskResponse<Message>,
   next: NextFunction,
) => Promise<RouteResponse<Message>> | RouteResponse<Message> | void

export type BuiltInMiddlewareResolver<Message> = (
   req: ExpressRequest,
   res: BriskResponse<Message>,
   next: NextFunction,
) => Promise<RouteResponse<Message> | void> | RouteResponse<Message> | void

export type ErrorResolver<Message> = (
   req: ExpressRequest,
   res: BriskResponse<Message>,
   next: NextFunction | undefined,
   error: Error,
) => RouteResponse<Message>

export type RouteResponse<Message> = {
   message: Message
   data: any
   status: number
}

type ResponseFunction<Message> = (
   message?: Message,
   data?: any,
) => RouteResponse<Message>

type ExpressResponseExtension<Message> = {
   [key in StatusName]: ResponseFunction<Message>
} & {
   respondWith: (response: ResponseContent<Message>) => RouteResponse<Message>
}

export type BriskResponse<Message> = ExpressResponse &
   ExpressResponseExtension<Message>

type ExtractParams<S extends string> = S extends `${infer P}/${infer R}`
   ? (P extends `:${infer T}` ? T : never) | ExtractParams<R>
   : S extends `:${infer T}`
   ? T
   : never

type ParamsFromPath<Path extends string> = {
   [K in ExtractParams<Path>]: string
}

type ExpressRequestExtension<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
   Path extends string,
> = {
   body: _RouteType extends "GET"
      ? never
      : ValidationSchema extends ZodSchema<any>
      ? zod.infer<ValidationSchema>
      : never
   rawBody: _RouteType extends "GET" ? never : string
   query: _RouteType extends "GET"
      ? ValidationSchema extends ZodSchema<any>
         ? zod.infer<ValidationSchema>
         : never
      : never
   user: UserTokenSchema extends undefined
      ? undefined
      : Convert<UserTokenSchema> | undefined
   params: ParamsFromPath<Path>
   parameterizedUrl: string
}

export type BriskRequest<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
   Path extends string,
> = Omit<ExpressRequest, "body" | "query" | "params"> &
   ExpressRequestExtension<ValidationSchema, _RouteType, UserTokenSchema, Path>

export type AnyError = new (...args: any[]) => Error

export type RouteType =
   | "GET"
   | "POST"
   | "PUT"
   | "DELETE"
   | "PATCH"
   | "OPTIONS"
   | "MIDDLEWARE"

export type RolesResolver<UserTokenSchema extends object | undefined> =
   UserTokenSchema extends undefined
      ? (req: ExpressRequest) => Role[]
      : (userToken: Convert<UserTokenSchema>) => Role[]
