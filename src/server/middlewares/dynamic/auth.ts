import { NextFunction, Request as ExpressRequest } from "express"
import jwt, { TokenExpiredError } from "jsonwebtoken"
import { Convert, AnyData } from "@flagg2/schema"
import { BriskRequest, BriskResponse, RolesResolver } from "../../types"
import assert from "assert"
import { unauthorized, forbidden } from "../../response/responseContent"

export type AuthConfig<
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
> =
   | {
        signingSecret: string
        resolverType: "token"
        rolesResolver: RolesResolver<UserTokenSchema>
        knownRoles: KnownRoles
        userTokenSchema: UserTokenSchema
     }
   | {
        resolverType: "request"
        rolesResolver: RolesResolver<UserTokenSchema>
        knownRoles: KnownRoles
     }

export class Role {
   constructor(public name: string, public description: string) {}
}

function handleBearerPrefix(token: string) {
   const bearer = "Bearer "
   if (token.startsWith(bearer)) {
      return token.substring(bearer.length)
   }
   return token
}

function extractToken(req: BriskRequest<any, any, any, any>) {
   const token = req.headers["Authorization"] ?? req.headers["authorization"]
   if (typeof token !== "string") {
      return null
   }
   return handleBearerPrefix(token)
}

function decodeAndVerifyToken<UserTokenSchema extends AnyData | undefined>(
   extractedToken: string,
   signingSecret: string,
) {
   try {
      const decodedToken = jwt.verify(
         extractedToken,
         signingSecret,
      ) as Convert<UserTokenSchema>
      return {
         decodedToken,
         response: null,
      }
   } catch (e) {
      if (e instanceof TokenExpiredError) {
         return {
            decodedToken: null,
            response: unauthorized({ message: "Token expired" }),
         }
      }
      return {
         decodedToken: null,
         response: unauthorized({ message: "Invalid token" }),
      }
   }
}

function getTokenResolver<
   UserTokenSchema extends AnyData | undefined,
   KnownRoles extends {
      [key: string]: Role
   },
>(config: AuthConfig<KnownRoles, UserTokenSchema>, allowedRoles?: Role[]) {
   assert(config.resolverType === "token")
   return async (
      req: BriskRequest<any, any, UserTokenSchema, any>,
      res: BriskResponse<any>,
      next: NextFunction,
   ) => {
      const { signingSecret } = config

      const extractedToken = extractToken(req)

      if (extractedToken == null) {
         if (allowedRoles != null) {
            return res.unauthorized({
               message: "No token provided",
            })
         }
         return next()
      }

      const { decodedToken, response } = decodeAndVerifyToken(
         extractedToken,
         signingSecret,
      )
      if (response !== null) {
         return res.respondWith(response)
      }

      req.user = decodedToken as UserTokenSchema extends undefined
         ? undefined
         : Convert<UserTokenSchema, false> | undefined

      const { response: roleResponse } = await resolveAndMatchRoles(
         config.rolesResolver,
         decodedToken,
         allowedRoles,
      )

      if (roleResponse != null) {
         return res.respondWith(roleResponse)
      }

      next()
   }
}

function getRequestResolver<
   UserTokenSchema extends AnyData | undefined,
   KnownRoles extends {
      [key: string]: Role
   },
>(config: AuthConfig<KnownRoles, UserTokenSchema>, allowedRoles?: Role[]) {
   assert(config.resolverType === "request")
   return async (
      req: BriskRequest<any, any, UserTokenSchema, any>,
      res: BriskResponse<any>,
      next: NextFunction,
   ) => {
      const { response } = await resolveAndMatchRoles(
         config.rolesResolver,
         req as ExpressRequest,
         allowedRoles,
      )

      if (response != null) {
         return res.respondWith(response)
      }

      next()
   }
}

//TODO: check correctness of this

async function resolveAndMatchRoles<
   UserTokenSchema extends AnyData | undefined,
>(
   resolver: RolesResolver<UserTokenSchema>,
   resolverData: Convert<UserTokenSchema, false> | ExpressRequest,
   allowedRoles?: Role[],
) {
   if (allowedRoles === undefined) {
      return {
         matched: true,
         response: null,
      }
   }

   //@ts-ignore TODO:
   const roles = await resolver(resolverData)

   if (!roles.some((role) => allowedRoles.includes(role))) {
      return {
         matched: false,
         response: forbidden(),
      }
   }

   return {
      matched: true,
      response: null,
   }
}

export function getAuthMiddleware<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
>(config: AuthConfig<KnownRoles, UserTokenSchema>, allowedRoles?: Role[]) {
   const { resolverType } = config
   return (
      req: BriskRequest<any, any, UserTokenSchema, any>,
      res: BriskResponse<Message>,
      next: NextFunction,
   ) => {
      switch (resolverType) {
         case "token":
            return getTokenResolver(config, allowedRoles)(req, res, next)
         case "request":
            return getRequestResolver(config, allowedRoles)(req, res, next)
      }
   }
}
