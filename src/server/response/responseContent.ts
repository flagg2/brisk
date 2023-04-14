import { StatusCode } from "./statusCodes"

type ResponseParamsWithCode<Message> = {
   status: StatusCode
   data?: any
   message?: Message
}

export type ResponseContent<Message> = {
   status: StatusCode
   data: any
   message?: Message
}

export type ResponseParams<Message> = {
   message?: Message
   data?: any
}

function hasData<Message = any>(
   params: ResponseParamsWithCode<Message>,
): params is ResponseParamsWithCode<Message> & { data: any } {
   return params.hasOwnProperty("data")
}

function createResponseContent<Message = any>(
   params: ResponseParamsWithCode<Message>,
): ResponseContent<Message> {
   return {
      message: params.message,
      data: hasData(params) ? params.data : null,
      status: params.status,
   }
}

type ResponseFunction<Message = any> = (
   params?: ResponseParams<Message>,
) => ResponseContent<Message>

export const ok: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 200,
      message,
      data,
   })
}

export const created: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 201,
      message,
      data,
   })
}

export const badRequest: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 400,
      message,
      data,
   })
}

export const unauthorized: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 401,
      message,
      data,
   })
}

export const forbidden: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 403,
      message,
      data,
   })
}

export const notFound: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 404,
      message,
      data,
   })
}

export const methodNotAllowed: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 405,
      message,
      data,
   })
}

export const conflict: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 409,
      message,
      data,
   })
}

export const unprocessableEntity: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 422,
      message,
      data,
   })
}

export const tooManyRequests: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 429,
      message,
      data,
   })
}

export const internalServerError: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 500,
      message,
      data,
   })
}

export const notImplemented: ResponseFunction = (params) => {
   const { message, data } = params ?? {}
   return createResponseContent({
      status: 501,
      message,
      data,
   })
}
