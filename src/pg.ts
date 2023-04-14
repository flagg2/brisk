import schema from "@flagg2/schema"
import { z } from "zod"
import { Role } from "./server/middlewares/dynamic/auth"
import { Brisk } from "./server/Brisk"

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

router.upload(
   "/upload",
   async (req, res) => {
      console.log(req.file)
      console.log(req.body.alt)
      return res.ok()
   },
   {
      uploadConfig: {
         allowedFileExtensions: ["ts"],
         metadataValidForMs: 100000,
      },
      validationSchema: z.object({
         alt: z.string(),
      }),
   },
)

server.start()
