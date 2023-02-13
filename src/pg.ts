import { Brisk } from "./server/Brisk"

const server = new Brisk({
   port: 3000,
})

server.post("/", (req, res) => {
   return res.ok("ok", {
      raw: req.rawBody,
      parsed: req.body,
   })
})

server.start()
