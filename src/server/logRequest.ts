import chalk from "chalk"

type OptionalObject<T extends object> = {
   [P in keyof T]?: T[P]
}

const colors = {
   status: (status: number) => {
      if (status >= 500) {
         return chalk.red
      } else if (status >= 400) {
         return chalk.yellow
      } else if (status >= 300) {
         return chalk.cyan
      } else if (status >= 200) {
         return chalk.green
      } else {
         return chalk.gray
      }
   },
   duration: (durationMs: number) => {
      if (durationMs > 1000) {
         return chalk.red
      } else if (durationMs > 500) {
         return chalk.yellow
      } else {
         return chalk.green
      }
   },
   size: (sizeKB: number) => {
      if (sizeKB > 100) {
         return chalk.red
      } else if (sizeKB > 50) {
         return chalk.yellow
      } else {
         return chalk.green
      }
   },
}

type LogData = {
   method: string
   path: string
   statusCode: number
   durationMs: number
   sizeKB: number
}

export function logRequest(
   data: LogData,
   loggingMethods?: ((message: string) => void)[],
) {
   if (loggingMethods === undefined) {
      loggingMethods = [(message: string) => console.log(message)]
   }
   const { method, path, statusCode, durationMs, sizeKB } = data

   const sizeColor = colors.size(sizeKB)
   const statusColor = colors.status(statusCode)
   const durationColor = colors.duration(durationMs)

   const message = `${method} ${path} ${durationColor(
      durationMs.toFixed(3) + "ms",
   )} ${sizeColor(sizeKB + "KB")} -> ${statusColor(statusCode)}`

   loggingMethods.forEach((method) => method(message))
}
