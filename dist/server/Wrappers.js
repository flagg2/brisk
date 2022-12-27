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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wrappers = void 0;
class Wrappers {
    constructor(responseGenerator, customCatchers) {
        this.responseGenerator = responseGenerator;
        this.customCatchers = customCatchers;
    }
    catchErrors(fn) {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                return yield fn(req, res, next);
            }
            catch (err) {
                const catcher = (_a = this.customCatchers) === null || _a === void 0 ? void 0 : _a.get(err.constructor);
                if (catcher != null) {
                    return catcher(req, res, next, err);
                }
                console.error(err);
                return this.responseGenerator.internalServerError(res);
            }
        });
    }
    attachResponseMethods(fn) {
        return (req, res, next) => {
            res.ok = (message, data) => {
                return this.responseGenerator.ok(res, message, data);
            };
            res.badRequest = (message, data) => {
                return this.responseGenerator.badRequest(res, message, data);
            };
            res.unauthorized = (message, data) => {
                return this.responseGenerator.unauthorized(res, message, data);
            };
            res.forbidden = (message, data) => {
                return this.responseGenerator.forbidden(res, message, data);
            };
            res.notFound = (message, data) => {
                return this.responseGenerator.notFound(res, message, data);
            };
            res.conflict = (message, data) => {
                return this.responseGenerator.conflict(res, message, data);
            };
            res.internalServerError = (message, data) => {
                return this.responseGenerator.internalServerError(res, message, data);
            };
            res.notImplemented = (message, data) => {
                return this.responseGenerator.notImplemented(res, message, data);
            };
            res.tooManyRequests = (message, data) => {
                return this.responseGenerator.tooManyRequests(res, message, data);
            };
            return fn(req, res, next);
        };
    }
    wrapRoute(resolvers) {
        console.log("Wrapping route");
        resolvers[0] = this.attachResponseMethods(resolvers[0]);
        resolvers = resolvers.map((resolver) => this.catchErrors(resolver));
        return resolvers;
    }
}
exports.Wrappers = Wrappers;
//# sourceMappingURL=Wrappers.js.map