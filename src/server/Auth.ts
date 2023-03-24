import { NextFunction, Request } from "express"
import { ResponseSender } from "./Response"
import {
   ExtendedExpressRequest,
   ExtendedExpressResponse,
   RolesResolver,
} from "./types"
import jwt, { JwtPayload } from "jsonwebtoken"
import { Convert, AnyData } from "@flagg2/schema"

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
export class Auth<Message, UserTokenSchema extends AnyData | undefined> {
   constructor(
      private signingSecret: string,
      private rolesResolver: RolesResolver<UserTokenSchema>,
      private authResolverStyle: "token" | "request",
   ) {}
   public getMiddleware(allowedRoles: Role[] | null) {
      return (
         req: ExtendedExpressRequest<any, any, UserTokenSchema>,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         let decodedToken: Convert<UserTokenSchema> | undefined
         if (this.authResolverStyle === "token") {
            const token =
               String(req.headers["Authorization"]) ||
               String(req.headers["authorization"])
            if (!token) {
               return res.unauthorized()
            }

            try {
               const extractedToken = extractBearerToken(token)
               decodedToken = jwt.verify(
                  extractedToken,
                  this.signingSecret,
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
         const roles = this.rolesResolver(decodedToken ?? req)

         if (!roles.some((role) => allowedRoles.includes(role))) {
            return res.forbidden()
         }

         // TODO: add roles to req, with typing
         //  req["roles"] = roles;

         next()
      }
   }
}
