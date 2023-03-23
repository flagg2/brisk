import { NextFunction, Request } from "express"
import { ResponseSender } from "./Response"
import {
   ExtendedExpressRequest,
   ExtendedExpressResponse,
   RolesResolver,
} from "./types"
import jwt, { JwtPayload } from "jsonwebtoken"
import { Convert, ObjectData } from "@flagg2/schema"

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

export class Auth<
   Message,
   UserTokenSchema extends ObjectData<any> | undefined,
> {
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
         if (allowedRoles == null) {
            return next()
         }
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
               return res.unauthorized()
            }

            if (!decodedToken) {
               return res.unauthorized()
            }
            // @ts-ignore
            req.user = decodedToken
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
