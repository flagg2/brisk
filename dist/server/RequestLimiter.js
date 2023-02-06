"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateRequestFilter = void 0;
class RequestIdentity {
    constructor(config) {
        this.ip = config.ip;
        this.userAgent = config.userAgent;
        this.method = config.method;
        this.path = config.path;
    }
    toString() {
        return `${this.method} ${this.path} from ${this.ip} with ${this.userAgent}`;
    }
}
class DuplicateRequestFilter {
    constructor(allowDefault = false) {
        this.requests = new Set();
        this.allowDefault = allowDefault;
    }
    shouldAllowRequest(requestIdentity) {
        const requestString = requestIdentity.toString();
        return !this.requests.has(requestString);
    }
    getMiddleware(allowDuplicateRequests) {
        if (allowDuplicateRequests == null) {
            allowDuplicateRequests = this.allowDefault;
        }
        return (req, res, next) => {
            var _a;
            if (allowDuplicateRequests) {
                return next();
            }
            if (req.method === "OPTIONS" || req.method === "HEAD" || req.method === "GET") {
                return next();
            }
            const requestIdentity = new RequestIdentity({
                ip: req.ip,
                userAgent: (_a = req.headers["user-agent"]) !== null && _a !== void 0 ? _a : "",
                method: req.method,
                path: req.path,
            });
            if (!this.shouldAllowRequest(requestIdentity)) {
                return res.tooManyRequests();
            }
            this.requests.add(requestIdentity.toString());
            next();
            setTimeout(() => {
                this.requests.delete(requestIdentity.toString());
            }, 10000);
            res.on("finish", () => {
                this.requests.delete(requestIdentity.toString());
            });
        };
    }
}
exports.DuplicateRequestFilter = DuplicateRequestFilter;
//# sourceMappingURL=RequestLimiter.js.map