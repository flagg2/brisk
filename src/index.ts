import { Role } from "./server/middlewares/dynamic/auth"
import { Brisk } from "./server/Brisk"
import {
   ResponseContent,
   createResponseContent,
} from "./server/response/responseContent"

import { BriskRequest, BriskResponse, BriskNext } from "./server/types"

import z from "zod"
import schema from "@flagg2/schema"

const userSchema = schema
const us = userSchema

export {
   Role,
   Brisk,
   ResponseContent,
   BriskRequest,
   BriskResponse,
   BriskNext,
   createResponseContent,
   z,
   userSchema,
   us,
}

//TODO: export all necessary types and make package private
