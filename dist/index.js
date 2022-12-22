"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brisk = exports.Role = void 0;
const Auth_1 = require("./server/Auth");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return Auth_1.Role; } });
const Brisk_1 = require("./server/Brisk");
Object.defineProperty(exports, "Brisk", { enumerable: true, get: function () { return Brisk_1.Brisk; } });
const zod_1 = __importDefault(require("zod"));
const x = new Brisk_1.Brisk({
    port: 3000,
});
x.get("/test", (req, res) => {
    req.body;
    return res.ok("Hello World");
}, {
    validation: {
        schema: zod_1.default.object({
            name: zod_1.default.string(),
        }),
        isStrict: false,
    },
});
//# sourceMappingURL=index.js.map