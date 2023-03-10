import { Brisk } from "./server/Brisk"
import { ResponseContent } from "./server/Response"

const server = new Brisk({
   port: 3000,
})

server.post("/", (req, res) => {
   const response = responseIsGeneratedHere()
   return res.respondWith(response)
})

function responseIsGeneratedHere() {
   return new ResponseContent({
      status: 400,
      message: "ok",
      data: "nieco sa dojebalo",
   })
}

server.start()
