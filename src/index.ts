import { Role } from "./server/middlewares/dynamic/auth"
import { Brisk } from "./server/Brisk"
import {
   ResponseContent,
   createResponseContent,
} from "./server/response/responseContent"

import z from "zod"
import schema from "@flagg2/schema"

import "@flagg2/schema"

const userSchema = schema
const us = userSchema

export {
   Role,
   Brisk,
   ResponseContent,
   createResponseContent,
   z,
   userSchema,
   us,
}

//TODO: export all necessary types and make package private
