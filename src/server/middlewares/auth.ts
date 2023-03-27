import { NextFunction } from "express"
import {
   ExtendedExpressRequest,
   ExtendedExpressResponse,
   RolesResolver,
} from "../types"
import jwt from "jsonwebtoken"
import { Convert, AnyData } from "@flagg2/schema"

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

function extractBearerToken(token: string) {
   const bearer = "Bearer "
   if (token.startsWith(bearer)) {
      return token.substring(bearer.length)
   }
   return token
}

export class Role {
   constructor(public name: string, public description: string) {}
}

//TODO: check correctness of this

export function getAuthMiddleware<
   Message,
   KnownRoles extends {
      [key: string]: Role
   },
   UserTokenSchema extends AnyData | undefined,
>(
   config: AuthConfig<KnownRoles, UserTokenSchema>,
   allowedRoles: Role[] | null,
) {
   const { resolverType, rolesResolver, knownRoles } = config
   return (
      req: ExtendedExpressRequest<any, any, UserTokenSchema, any>,
      res: ExtendedExpressResponse<Message>,
      next: NextFunction,
   ) => {
      let decodedToken: Convert<UserTokenSchema> | undefined
      if (resolverType === "token") {
         const signingSecret = config.signingSecret
         const token =
            String(req.headers["Authorization"]) ||
            String(req.headers["authorization"])
         if (!token && allowedRoles != null) {
            return res.unauthorized()
         }

         try {
            const extractedToken = extractBearerToken(token)
            decodedToken = jwt.verify(
               extractedToken,
               signingSecret,
            ) as Convert<UserTokenSchema>
         } catch (e) {
            if (allowedRoles != null) {
               return res.unauthorized()
            }
         }

         if (!decodedToken && allowedRoles != null) {
            return res.unauthorized()
         }
         // @ts-ignore
         req.user = decodedToken
      }

      if (allowedRoles == null) {
         return next()
      }

      // @ts-ignore
      const roles = rolesResolver(decodedToken ?? req)

      if (!roles.some((role) => allowedRoles.includes(role))) {
         return res.forbidden()
      }

      // TODO: add roles to req, with typing
      //  req["roles"] = roles;

      next()
   }
}
