"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Brisk = exports.Role = void 0;
const Auth_1 = require("./server/Auth");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return Auth_1.Role; } });
const Brisk_1 = require("./server/Brisk");
Object.defineProperty(exports, "Brisk", { enumerable: true, get: function () { return Brisk_1.Brisk; } });
const x = new Brisk_1.Brisk({
    port: 3000,
});
//# sourceMappingURL=index.js.map