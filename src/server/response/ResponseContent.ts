type ResponseParams<Message> = {
   data?: any
} & (
   | {
        status: 200 | 400

        message: Message
     }
   | {
        status: 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 501
        message?: Message
     }
)

export type ResponseContent<Message> = {
   status: number
   data: any
   message?: Message
}

function hasData<Message>(
   params: ResponseParams<Message>,
): params is ResponseParams<Message> & { data: any } {
   return params.hasOwnProperty("data")
}

export function createResponseContent<Message>(
   params: ResponseParams<Message>,
): ResponseContent<Message> {
   return {
      message: params.message,
      data: hasData(params) ? params.data : null,
      status: params.status,
   }
}
