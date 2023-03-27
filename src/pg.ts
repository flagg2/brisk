import { Brisk, Role, ResponseContent, createResponseContent } from "./index"
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

const router = server.getRouter()

router.use("/", (req, res, next) => {
   console.log("middleware")
   return res.conflict()
})

router.post(
   "/:id/:kokot",
   (req, res) => {
      const response = responseIsGeneratedHere()
      return res.respondWith(response)
   },
   {},
)

function responseIsGeneratedHere() {
   return createResponseContent({
      status: 400,
      message: "ok",
      data: "nieco sa dojebalo",
   })
}

server.start()
