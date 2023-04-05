import { Messages } from "./messages"
import { RouteResponse } from "../types"
import { Response as ExpressResponse } from "express"
import { ResponseContent } from "./responseContent"

//TODO: remove this class in future and replace with functions
export class ResponseSender<Message> {
   private messages: Messages<Message>
   constructor(defaultErrorMessages: Messages<Message>) {
      this.messages = defaultErrorMessages
   }

   respond(
      expressResponse: ExpressResponse,
      responseContent: ResponseContent<Message>,
   ): RouteResponse<Message> {
      let { status, message, data } = responseContent
      if (!message) {
         message = this.messages[status]
      }

      const response: RouteResponse<Message> = {
         message,
         data: data ?? null,
         status,
      }
      expressResponse.status(status).send(response)
      return response
   }
}
