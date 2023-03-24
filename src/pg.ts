import { Brisk, Role, ResponseContent } from "./index"
import schema from "@flagg2/schema"

const test = new Role("test", "test")

const server = new Brisk({
   port: 3000,
   authConfig: {
      knownRoles: { test },
      resolverType: "token",
      signingSecret: "secret",
      userTokenSchema: schema.object({
         id: schema.string(),
      }),
      rolesResolver: () => {
         return [test]
      },
   },
})

server.use("/", (req, res, next) => {
   console.log("middleware")
   return next()
})

server.post(
   "/:id/:kokot",
   (req, res) => {
      const response = responseIsGeneratedHere()
      return res.respondWith(response)
   },
   {},
)

function responseIsGeneratedHere() {
   return new ResponseContent({
      status: 400,
      message: "ok",
      data: "nieco sa dojebalo",
   })
}

server.start()
