"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Brisk_1 = require("./server/Brisk");
const server = new Brisk_1.Brisk({
    port: 3000,
});
server.post("/", (req, res) => {
    return res.ok("ok", {
        raw: req.rawBody,
        parsed: req.body,
    });
});
server.start();
//# sourceMappingURL=pg.js.map