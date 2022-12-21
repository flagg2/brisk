import { NextFunction, Request } from "express";
import { ExtendedExpressResponse } from "./types";

class RequestIdentity {
   public ip: string;
   public userAgent: string;
   public method: string;
   public path: string;
   constructor(config: { ip: string; userAgent: string; method: string; path: string }) {
      this.ip = config.ip;
      this.userAgent = config.userAgent;
      this.method = config.method;
      this.path = config.path;
   }

   public toString() {
      return `${this.method} ${this.path} from ${this.ip} with ${this.userAgent}`;
   }
}

export class DuplicateRequestFilter<Message> {
   private requests: Set<string> = new Set();
   private allowDefault: boolean;
   constructor(allowDefault: boolean = false) {
      this.allowDefault = allowDefault;
   }
   private shouldAllowRequest(requestIdentity: RequestIdentity) {
      const requestString = requestIdentity.toString();
      return !this.requests.has(requestString);
   }
   public getMiddleware(allowDuplicateRequests: boolean | null) {
      if (allowDuplicateRequests == null) {
         allowDuplicateRequests = this.allowDefault;
      }
      return (req: Request, res: ExtendedExpressResponse<Message>, next: NextFunction) => {
         if (allowDuplicateRequests) {
            return next();
         }
         if (req.method === "OPTIONS" || req.method === "HEAD" || req.method === "GET") {
            return next();
         }
         const requestIdentity = new RequestIdentity({
            ip: req.ip,
            userAgent: req.headers["user-agent"] ?? "",
            method: req.method,
            path: req.path,
         });
         if (!this.shouldAllowRequest(requestIdentity)) {
            return res.tooManyRequests();
         }
         console.log(this.requests);
         this.requests.add(requestIdentity.toString());
         next();
         setTimeout(() => {
            this.requests.delete(requestIdentity.toString());
         }, 10000);
         res.on("finish", () => {
            this.requests.delete(requestIdentity.toString());
            console.log("finished");
         });
      };
   }
}
