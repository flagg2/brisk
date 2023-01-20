"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseGenerator = void 0;
function respond(res, message, status, data) {
    const response = {
        message,
        data: data !== null && data !== void 0 ? data : null,
        status,
    };
    res.status(status).send(response);
    return response;
}
class ResponseGenerator {
    constructor(defaultErrorMessages) {
        this.messages = defaultErrorMessages;
    }
    ok(res, message, data) {
        return respond(res, message, 200, data);
    }
    badRequest(res, message, data) {
        return respond(res, message, 400, data);
    }
    validationError(res, message, error) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.validationError, 422, error);
    }
    unauthorized(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.unauthorized, 401, data);
    }
    forbidden(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.forbidden, 403, data);
    }
    notFound(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.notFound, 404, data);
    }
    methodNotAllowed(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.methodNotAllowed, 405, data);
    }
    conflict(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.conflict, 409, data);
    }
    tooManyRequests(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.tooManyRequests, 429, data);
    }
    internalServerError(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.internalServerError, 500, data);
    }
    notImplemented(res, message, data) {
        return respond(res, message !== null && message !== void 0 ? message : this.messages.notImplemented, 501, data);
    }
}
exports.ResponseGenerator = ResponseGenerator;
//# sourceMappingURL=Response.js.map