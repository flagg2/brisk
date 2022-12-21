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
exports.Middlewares = void 0;
const process_1 = require("process");
function getRequestSizeKB(req) {
    return Number((req.socket.bytesRead / 1024).toFixed(2));
}
const Middlewares = (responseGenerator) => {
    return {
        validateRouteAndMethod(allowedMethods) {
            return (req, res, next) => {
                if (allowedMethods[req.path] == null) {
                    return responseGenerator.notFound(res);
                }
                if (!allowedMethods[req.path].includes(req.method.toUpperCase())) {
                    return responseGenerator.methodNotAllowed(res);
                }
                next();
            };
        },
        logRequest(logger) {
            return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                const start = (0, process_1.hrtime)();
                next();
                res.on("finish", () => {
                    const end = (0, process_1.hrtime)(start);
                    const time = end[0] * 1e3 + end[1] * 1e-6;
                    const size = getRequestSizeKB(req);
                    logger.logRequest({
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                        durationMs: time,
                        sizeKB: size,
                    });
                });
            });
        },
        validateSchema(schema) {
            return (req, res, next) => {
                try {
                    if (req.method === "GET") {
                        req.query = schema.parse(req.query);
                    }
                    else {
                        req.body = schema.parse(req.body);
                    }
                    next();
                }
                catch (error) {
                    responseGenerator.validationError(res, undefined, error);
                }
            };
        },
    };
};
exports.Middlewares = Middlewares;
//# sourceMappingURL=Middlewares.js.map