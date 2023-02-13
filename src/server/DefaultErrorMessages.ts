import { DefaultMessage } from "./Brisk"

export type ErrorMessages<Message> = {
   unauthorized: Message
   forbidden: Message
   notFound: Message
   methodNotAllowed: Message
   conflict: Message
   internalServerError: Message
   notImplemented: Message
   tooManyRequests: Message
   validationError: Message
}

export const defaultErrorMessages: ErrorMessages<DefaultMessage> = {
   unauthorized:
      "Only logged in users with sufficient permissions can access this content.",
   forbidden: "You do not have sufficient permissions to access this content.",
   notFound: "The requested content was not found.",
   methodNotAllowed: "This HTTP method is not allowed.",
   conflict: "The requested operation is in conflict with the existing state.",
   internalServerError: "An unexpected error has occurred.",
   notImplemented: "This feature is not implemented.",
   tooManyRequests: "Too many requests. Please try again later.",
   validationError: "This request contains invalid data.",
}
