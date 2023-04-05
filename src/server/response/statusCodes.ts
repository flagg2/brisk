export const positiveStatusCodes = {
   200: "ok",
   201: "created",
} as const

export const negativeStatusCodes = {
   400: "badRequest",
   401: "unauthorized",
   403: "forbidden",
   404: "notFound",
   405: "methodNotAllowed",
   409: "conflict",
   422: "unprocessableEntity",
   429: "tooManyRequests",
   500: "internalServerError",
   501: "notImplemented",
} as const

export type StatusCode =
   | keyof typeof positiveStatusCodes
   | keyof typeof negativeStatusCodes

export type StatusName = (typeof positiveStatusCodes &
   typeof negativeStatusCodes)[StatusCode]
