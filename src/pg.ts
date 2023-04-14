import schema from "@flagg2/schema"
import { z } from "zod"
import { Role } from "./server/middlewares/dynamic/auth"
import { Brisk } from "./server/Brisk"
import {
   badRequest,
   conflict,
   created,
} from "./server/response/responseContent"

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
      rolesResolver: async () => {
         await sleep(1000)
         return []
      },
   },
})

const router = server.getRouter()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

router.use("/", (req, res, next) => {
   console.log("middleware")
   next()
})

router.get(
   "/:id/a",
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

router.post(
   "/:id/a",
   async (req, res) => {
      console.log(req.user)
      return res.respondWith(responseIsGeneratedHere())
   },
   {
      allowedRoles: [test],
   },
)

function responseIsGeneratedHere() {
   return conflict({
      data: "kokot",
   })
}

server.start()
