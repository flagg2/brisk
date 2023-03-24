import { Brisk, Role, ResponseContent, schema } from "./index"

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
         return []
      },
   },
})

server.post(
   "/",
   (req, res) => {
      const response = responseIsGeneratedHere()
      return res.respondWith(response)
   },
   {
      allowedRoles: [test],
   },
)

function responseIsGeneratedHere() {
   return new ResponseContent({
      status: 400,
      message: "ok",
      data: "nieco sa dojebalo",
   })
}

server.start()
