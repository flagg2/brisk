"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resolvers = void 0;
const process_1 = require("process");
const helmet_1 = __importDefault(require("helmet"));
const zod_1 = require("zod");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
function getRequestSizeKB(req) {
    return Number((req.socket.bytesRead / 1024).toFixed(2));
}
class Resolvers {
    constructor(options, logger, response, duplicateRequestFilter, auth) {
        this.static = {
            logRequest: (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                const start = (0, process_1.hrtime)();
                next();
                res.on("finish", () => {
                    const end = (0, process_1.hrtime)(start);
                    const time = end[0] * 1e3 + end[1] * 1e-6;
                    const size = getRequestSizeKB(req);
                    this.logger.logRequest({
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        durationMs: time,
                        sizeKB: size,
                    });
                });
            }),
            notImplemented: (_, res) => {
                return this.response.notImplemented(res);
            },
            helmet: (0, helmet_1.default)(),
            json: express_1.default.json(),
            urlencoded: express_1.default.urlencoded({ extended: true }),
            cors: (0, cors_1.default)(),
            blank: (_, res, next) => {
                next();
            },
        };
        this.getServerCreationMiddlewares = () => {
            const middlewares = [this.static.logRequest, this.static.json, this.static.urlencoded, this.static.cors];
            if (this.options.useHelmet) {
                middlewares.push(this.static.helmet);
            }
            return middlewares;
        };
        this.getServerStartUpMiddlewares = (allowedMethods) => {
            const middlewares = [];
            middlewares.push(this.dynamic.validateRouteAndMethod(allowedMethods));
            return middlewares;
        };
        this.dynamic = {
            validateSchema: (validation) => (req, res, next) => {
                if (validation == null) {
                    return next();
                }
                const { schema, isStrict } = validation;
                function maybeStrictSchema() {
                    if (isStrict !== false && schema instanceof zod_1.ZodObject) {
                        return schema.strict();
                    }
                    return schema;
                }
                try {
                    if (req.method === "GET") {
                        req.query = maybeStrictSchema().parse(req.query);
                    }
                    else {
                        req.body = maybeStrictSchema().parse(req.body);
                    }
                    next();
                }
                catch (error) {
                    this.response.validationError(res, undefined, error);
                }
            },
            validateRouteAndMethod: (allowedMethods) => (req, res, next) => {
                if (allowedMethods[req.path] == null) {
                    return this.response.notFound(res);
                }
                if (!allowedMethods[req.path].includes(req.method.toUpperCase())) {
                    return this.response.methodNotAllowed(res);
                }
                next();
            },
            authenticate: (allowedRoles) => {
                var _a, _b;
                return (_b = (_a = this.auth) === null || _a === void 0 ? void 0 : _a.getMiddleware(allowedRoles)) !== null && _b !== void 0 ? _b : this.static.blank;
            },
            filterDuplicateRequests: (allowDuplicateRequests) => {
                return this.duplicateRequestFilter.getMiddleware(allowDuplicateRequests);
            },
        };
        this.options = options;
        this.logger = logger;
        this.response = response;
        this.duplicateRequestFilter = duplicateRequestFilter;
        this.auth = auth;
    }
    getRouteMiddlewares(allowedRoles, allowDuplicateRequests, validation) {
        const middlewares = [
            this.dynamic.authenticate(allowedRoles),
            this.dynamic.filterDuplicateRequests(allowDuplicateRequests),
            this.dynamic.validateSchema(validation),
        ];
        return middlewares;
    }
}
exports.Resolvers = Resolvers;
//# sourceMappingURL=Resolvers.js.map