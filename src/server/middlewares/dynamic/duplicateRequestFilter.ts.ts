import { NextFunction, Request as ExpressRequest } from "express"
import { BuiltInMiddlewareResolver, ExtendedExpressResponse } from "../../types"

export type RequestIdentity = {
   ip: string
   userAgent: string
   method: string
   path: string
}

export function requestIdentityToString(requestIdentity: RequestIdentity) {
   return `${requestIdentity.method} ${requestIdentity.path} from ${requestIdentity.ip} with ${requestIdentity.userAgent}`
}

function shouldAllowRequest(
   requestIdentity: RequestIdentity,
   requests: Set<string>,
) {
   const requestString = requestIdentityToString(requestIdentity)
   return !requests.has(requestString)
}

export function getDuplicateRequestFilterMiddleware<Message>(
   requests: Set<string>,
): BuiltInMiddlewareResolver<Message> {
   return (
      req: ExpressRequest,
      res: ExtendedExpressResponse<Message>,
      next: NextFunction,
   ) => {
      if (
         req.method === "OPTIONS" ||
         req.method === "HEAD" ||
         req.method === "GET"
      ) {
         return next()
      }
      const requestIdentity = {
         ip: req.ip,
         userAgent: req.headers["user-agent"] ?? "",
         method: req.method,
         path: req.path,
      }
      if (!shouldAllowRequest(requestIdentity, requests)) {
         //TODO: fix send config defined error message
         return res.tooManyRequests(
            // @ts-ignore
            "Too Many Requests",
         )
      }
      requests.add(requestIdentityToString(requestIdentity))
      res.on("finish", () => {
         requests.delete(requestIdentityToString(requestIdentity))
      })
      next()
   }
}
