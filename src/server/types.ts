import { Convert } from "@flagg2/schema"
import {
   Request as ExpressRequest,
   Response as ExpressResponse,
   NextFunction,
} from "express"
import { JwtPayload } from "jsonwebtoken"
import zod, { ZodSchema, ZodObject } from "zod"
import { Role } from "./Auth"
import { ResponseContent } from "./Response"

export type Resolver<
   Message,
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
> = (
   req: ExtendedExpressRequest<ValidationSchema, _RouteType, UserTokenSchema>,
   res: ExtendedExpressResponse<Message>,
   next?: NextFunction,
) => Promise<RouteResponse<Message>> | RouteResponse<Message>

export type MiddlewareResolver<Message> = (
   req: ExpressRequest,
   res: ExtendedExpressResponse<Message>,
   next: NextFunction,
) => Promise<RouteResponse<Message> | void> | RouteResponse<Message> | void

export type ErrorResolver<Message> = (
   req: ExpressRequest,
   res: ExtendedExpressResponse<Message>,
   next: NextFunction | undefined,
   error: Error,
) => RouteResponse<Message>

export type RouteResponse<Message> = {
   message: Message
   data: any
   status: number
}

type ResponseFunction<
   Message,
   isMessageRequired extends boolean,
> = isMessageRequired extends true
   ? (message: Message, data?: any) => RouteResponse<Message>
   : (message?: Message, data?: any) => RouteResponse<Message>

type ExpressResponseExtension<Message> = {
   ok: ResponseFunction<Message, true>
   respondWith: (response: ResponseContent<Message>) => RouteResponse<Message>
   badRequest: ResponseFunction<Message, true>
   unauthorized: ResponseFunction<Message, false>
   forbidden: ResponseFunction<Message, false>
   notFound: ResponseFunction<Message, false>
   conflict: ResponseFunction<Message, false>
   methodNotAllowed: ResponseFunction<Message, false>
   internalServerError: ResponseFunction<Message, false>
   notImplemented: ResponseFunction<Message, false>
   tooManyRequests: ResponseFunction<Message, false>
}

export type ExtendedExpressResponse<Message> = ExpressResponse &
   ExpressResponseExtension<Message>

type ExpressRequestExtension<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
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
}

export type ExtendedExpressRequest<
   ValidationSchema extends ZodSchema<any> | null,
   _RouteType extends RouteType,
   UserTokenSchema extends object | undefined,
> = Omit<ExpressRequest, "body" | "query"> &
   ExpressRequestExtension<ValidationSchema, _RouteType, UserTokenSchema>

export type AnyError = new (...args: any[]) => Error

export type RouteType = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS"

export type RolesResolver<UserTokenSchema extends object | undefined> =
   UserTokenSchema extends undefined
      ? (req: Request) => Role[]
      : (userToken: Convert<UserTokenSchema>) => Role[]

export type ValidationOptions<ValidationSchema extends ZodSchema<any>> = {
   schema: ValidationSchema
   isStrict?: boolean
}
