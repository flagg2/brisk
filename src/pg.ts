import { Brisk, Role, createResponseContent } from "../dist/index"
import schema from "@flagg2/schema"
import { z } from "zod"

const test = new Role("test", "test")

const server = new Brisk({
   port: 3000,
   authConfig: {
      knownRoles: { test },
      resolverType: "token",
      signingSecret: "secret",
      //TODO: if decoded data does not match schema, throw error
      userTokenSchema: schema.object({
         id: schema.string(),
      }),
      rolesResolver: () => {
         return [test]
      },
   },
})

const router = server.getRouter()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

router.use("/", (req, res, next) => {
   console.log("middleware")
   next()
})

router.post(
   "/:id/:kokot",
   async (req, res) => {
      console.log(req.user)
      const response = responseIsGeneratedHere()
      await sleep(1000)
      return res.respondWith(response)
   },
   {
      validationSchema: z.object({
         id: z.string(),
      }),
      allowedRoles: [test],
   },
)

function responseIsGeneratedHere() {
   return createResponseContent({
      status: 400,
      message: "ok",
      data: "nieco sa dojebalo",
   })
}

server.start()
