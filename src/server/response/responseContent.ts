import { StatusCode } from "./statusCodes"

type ResponseParams<Message> = {
   status: StatusCode
   data?: any
   message?: Message
}

export type ResponseContent<Message> = {
   status: StatusCode
   data: any
   message?: Message
}

function hasData<Message = any>(
   params: ResponseParams<Message>,
): params is ResponseParams<Message> & { data: any } {
   return params.hasOwnProperty("data")
}

function createResponseContent<Message = any>(
   params: ResponseParams<Message>,
): ResponseContent<Message> {
   return {
      message: params.message,
      data: hasData(params) ? params.data : null,
      status: params.status,
   }
}

export function ok<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 200,
      message,
      data,
   })
}

export function created<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 201,
      message,
      data,
   })
}

export function badRequest<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 400,
      message,
      data,
   })
}

export function unauthorized<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 401,
      message,
      data,
   })
}

export function forbidden<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 403,
      message,
      data,
   })
}

export function notFound<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 404,
      message,
      data,
   })
}

export function methodNotAllowed<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 405,
      message,
      data,
   })
}

export function conflict<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 409,
      message,
      data,
   })
}

export function unprocessableEntity<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 422,
      message,
      data,
   })
}

export function tooManyRequests<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 429,
      message,
      data,
   })
}

export function internalServerError<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 500,
      message,
      data,
   })
}

export function notImplemented<Message = any>(opts?: {
   message?: Message
   data?: any
}): ResponseContent<Message> {
   const { message, data } = opts ?? {}
   return createResponseContent({
      status: 501,
      message,
      data,
   })
}
