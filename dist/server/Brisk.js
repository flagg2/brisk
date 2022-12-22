"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brisk = void 0;
const express_1 = __importDefault(require("express"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const Logger_1 = require("./Logger");
const Response_1 = require("./Response");
const DefaultErrorMessages_1 = require("./DefaultErrorMessages");
const Auth_1 = require("./Auth");
const RequestLimiter_1 = require("./RequestLimiter");
const Wrappers_1 = require("./Wrappers");
const Resolvers_1 = require("./Resolvers");
class Brisk {
    constructor(options) {
        var _a, _b, _c, _d;
        this.allowedMethods = {};
        this.auth = null;
        this.options = options;
        this.allowedMethods = {};
        this.roles = (_b = (_a = options.authConfig) === null || _a === void 0 ? void 0 : _a.knownRoles) !== null && _b !== void 0 ? _b : {};
        this.app = (0, express_1.default)();
        this.router = express_1.default.Router();
        this.logger = new Logger_1.BriskLogger({
            loggingMethods: (_c = options.loggingMethods) !== null && _c !== void 0 ? _c : [(message) => console.log(message)],
        });
        this.response = new Response_1.ResponseGenerator((_d = options.errorMessageOverrides) !== null && _d !== void 0 ? _d : DefaultErrorMessages_1.defaultErrorMessages);
        this.duplicateRequestFilter = new RequestLimiter_1.DuplicateRequestFilter(options.allowDuplicateRequests);
        if (options.authConfig) {
            const { signingSecret, rolesResolver, resolverType } = options.authConfig;
            this.auth = new Auth_1.Auth(signingSecret, rolesResolver, resolverType);
        }
        this.wrappers = new Wrappers_1.Wrappers(this.response, options.customCatchers);
        this.resolvers = new Resolvers_1.Resolvers(this.options, this.logger, this.response, this.duplicateRequestFilter, this.auth);
        for (const resolver of this.resolvers.getServerCreationMiddlewares()) {
            this.app.use(resolver);
        }
        this.app.use("/", this.router);
    }
    start() {
        const { port, httpsConfig } = this.options;
        const startUpMessage = `🚀 Server up and running on port ${port} 🚀`;
        if (httpsConfig) {
            const { key, cert } = httpsConfig;
            const httpsServer = https_1.default.createServer({
                key: fs_1.default.readFileSync(key),
                cert: fs_1.default.readFileSync(cert),
            }, this.app);
            httpsServer.listen(port, () => {
                console.log(startUpMessage);
            });
        }
        else {
            const httpServer = http_1.default.createServer({}, this.app);
            httpServer.listen(port, () => {
                console.log(startUpMessage);
            });
        }
        for (const resolver of this.resolvers.getServerStartUpMiddlewares(this.allowedMethods)) {
            this.app.use(resolver);
        }
    }
    //public follow middleware pattern as in constructor
    addRoute(config) {
        let { type, path, resolver, opts } = config;
        const { middlewares, allowedRoles, allowDuplicateRequests, validation } = opts !== null && opts !== void 0 ? opts : {};
        path = this.prependSlash(path);
        this.addToAllowedMethods(path, type);
        let generatedMiddlewares = this.resolvers.getRouteMiddlewares(allowedRoles !== null && allowedRoles !== void 0 ? allowedRoles : null, allowDuplicateRequests !== null && allowDuplicateRequests !== void 0 ? allowDuplicateRequests : null, validation !== null && validation !== void 0 ? validation : null);
        let finalResolvers = this.wrappers.wrapRoute([
            ...generatedMiddlewares,
            ...(middlewares !== null && middlewares !== void 0 ? middlewares : []),
            resolver !== null && resolver !== void 0 ? resolver : this.resolvers.static.notImplemented,
        ]);
        this.router[type.toLowerCase()](path, finalResolvers);
    }
    get(path, resolver, opts) {
        this.addRoute({
            type: "GET",
            path,
            resolver,
            opts,
        });
    }
    post(path, resolver, opts) {
        this.addRoute({
            type: "POST",
            path,
            resolver,
            opts,
        });
    }
    put(path, resolver, opts) {
        this.addRoute({
            type: "PUT",
            path,
            resolver,
            opts,
        });
    }
    delete(path, resolver, opts) {
        this.addRoute({
            type: "DELETE",
            path,
            resolver,
            opts,
        });
    }
    getHost() {
        const { host } = this.options;
        if (host) {
            return `${host}`;
        }
        return undefined;
    }
    getPort() {
        const { port } = this.options;
        return port;
    }
    addToAllowedMethods(path, type) {
        if (this.allowedMethods[path] != null) {
            this.allowedMethods[path].push(type);
        }
        else {
            this.allowedMethods[path] = [type];
        }
    }
    prependSlash(path) {
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return path;
    }
}
exports.Brisk = Brisk;
//# sourceMappingURL=Brisk.js.map