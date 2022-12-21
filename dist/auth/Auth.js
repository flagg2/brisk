"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function extractBearerToken(token) {
    const bearer = "Bearer ";
    if (token.startsWith(bearer)) {
        return token.substring(bearer.length);
    }
    return token;
}
class Auth {
    constructor(signingSecret, rolesResolver, authResolverStyle = "token") {
        this.signingSecret = signingSecret;
        this.rolesResolver = rolesResolver;
        this.authResolverStyle = authResolverStyle;
    }
    getMiddleware(allowedRoles) {
        return (req, res, next) => {
            let decodedToken;
            if (this.authResolverStyle === "token") {
                const token = String(req.headers["Authorization"]) || String(req.headers["authorization"]);
                if (!token) {
                    return res.unauthorized();
                }
                try {
                    const extractedToken = extractBearerToken(token);
                    decodedToken = jsonwebtoken_1.default.verify(extractedToken, this.signingSecret);
                }
                catch (e) {
                    return res.unauthorized();
                }
                if (!decodedToken) {
                    return res.unauthorized();
                }
            }
            //@ts-expect-error
            const roles = this.rolesResolver(decodedToken !== null && decodedToken !== void 0 ? decodedToken : req);
            if (!roles.some((role) => allowedRoles.includes(role))) {
                return res.forbidden();
            }
            // TODO: add roles to req, with typing
            //  req["roles"] = roles;
            next();
        };
    }
}
exports.Auth = Auth;
//# sourceMappingURL=Auth.js.map