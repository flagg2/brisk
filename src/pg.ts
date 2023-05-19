import schema from "@flagg2/schema"
import { z } from "zod"
import { Role } from "./server/middlewares/dynamic/auth"
import { Brisk } from "./server/Brisk"
import { ok, badRequest } from "./server/response/responseContent"

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
      rolesResolver: async (token) => {
         return []
      },
   },
})

const router = server.getRouter()

router.get("/test/:slugOrId", async (req) => {
   console.log(req.parameterizedUrl)
   return ok()
})

router.post("/test/:id", async (req) => {
   console.log(req.parameterizedUrl)
   return badRequest()
})

server.start()
