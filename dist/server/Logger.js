"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BriskLogger = void 0;
const chalk_1 = __importDefault(require("chalk"));
function applyDefaults(config) {
    return Object.assign({ loggingMethods: [(message) => console.log(message)] }, config);
}
const colors = {
    status: (status) => {
        if (status >= 500) {
            return chalk_1.default.red;
        }
        else if (status >= 400) {
            return chalk_1.default.yellow;
        }
        else if (status >= 300) {
            return chalk_1.default.cyan;
        }
        else if (status >= 200) {
            return chalk_1.default.green;
        }
        else {
            return chalk_1.default.gray;
        }
    },
    duration: (durationMs) => {
        if (durationMs > 1000) {
            return chalk_1.default.red;
        }
        else if (durationMs > 500) {
            return chalk_1.default.yellow;
        }
        else {
            return chalk_1.default.green;
        }
    },
    size: (sizeKB) => {
        if (sizeKB > 100) {
            return chalk_1.default.red;
        }
        else if (sizeKB > 50) {
            return chalk_1.default.yellow;
        }
        else {
            return chalk_1.default.green;
        }
    },
};
class Logger {
    constructor(config) {
        this.config = applyDefaults(config || {});
    }
    log(message) {
        this.config.loggingMethods.forEach((method) => method(message));
    }
}
class BriskLogger extends Logger {
    logRequest(config) {
        const { method, path, statusCode, durationMs, sizeKB } = config;
        const sizeColor = colors.size(sizeKB);
        const statusColor = colors.status(statusCode);
        const durationColor = colors.duration(durationMs);
        const message = `${method} ${path} ${durationColor(durationMs.toFixed(3) + "ms")} ${sizeColor(sizeKB + "KB")} -> ${statusColor(statusCode)}`;
        this.log(message);
    }
}
exports.BriskLogger = BriskLogger;
//# sourceMappingURL=Logger.js.map