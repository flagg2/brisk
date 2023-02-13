import { NextFunction, Request } from "express"
import { ResponseGenerator } from "./Response"
import { ExtendedExpressResponse, RolesResolver } from "./types"
import jwt, { JwtPayload } from "jsonwebtoken"

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

export class Auth<Message, AuthResolverStyle extends "request" | "token"> {
   constructor(
      private signingSecret: string,
      private rolesResolver: RolesResolver<AuthResolverStyle>,
      private authResolverStyle: AuthResolverStyle = "token" as AuthResolverStyle,
   ) {}
   public getMiddleware(allowedRoles: Role[] | null) {
      return (
         req: Request,
         res: ExtendedExpressResponse<Message>,
         next: NextFunction,
      ) => {
         if (allowedRoles == null) {
            return next()
         }
         let decodedToken: JwtPayload | undefined
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
               ) as JwtPayload
            } catch (e) {
               return res.unauthorized()
            }

            if (!decodedToken) {
               return res.unauthorized()
            }
         }

         //@ts-ignore
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
