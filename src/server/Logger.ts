import chalk from "chalk"

type LoggerConfig = {
   loggingMethods: ((message: string) => void)[]
}

type OptionalObject<T extends object> = {
   [P in keyof T]?: T[P]
}

function applyDefaults(config: OptionalObject<LoggerConfig>): LoggerConfig {
   return {
      loggingMethods: [(message: string) => console.log(message)],
      ...config,
   }
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

class Logger {
   private config: LoggerConfig

   public constructor(config?: LoggerConfig) {
      this.config = applyDefaults(config || {})
   }

   public log(message: string) {
      this.config.loggingMethods.forEach((method) => method(message))
   }
}

export class BriskLogger extends Logger {
   public logRequest(config: {
      method: string
      path: string
      statusCode: number
      durationMs: number
      sizeKB: number
   }) {
      const { method, path, statusCode, durationMs, sizeKB } = config

      const sizeColor = colors.size(sizeKB)
      const statusColor = colors.status(statusCode)
      const durationColor = colors.duration(durationMs)

      const message = `${method} ${path} ${durationColor(
         durationMs.toFixed(3) + "ms",
      )} ${sizeColor(sizeKB + "KB")} -> ${statusColor(statusCode)}`

      this.log(message)
   }
}
