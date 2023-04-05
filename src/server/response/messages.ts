import { StatusCode } from "./statusCodes"

export type Messages<Message> = {
   [key in StatusCode]: Message
}

export const defaultMessages: Messages<string> = {
   200: "OK",
   201: "Created",
   400: "The request is invalid.",
   401: "You are not authorized to access this content. Please log in.",
   403: "You do not have sufficient permissions to access this content.",
   404: "The requested content was not found.",
   405: "This HTTP method is not allowed.",
   409: "The requested operation is in conflict with the existing state.",
   422: "This request contains invalid data.",
   429: "Too many requests. Please try again later.",
   500: "An unexpected error has occurred.",
   501: "This feature is not implemented.",
}
