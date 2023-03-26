export function prependSlash(path: string) {
   if (!path.startsWith("/")) {
      path = "/" + path
   }
   return path
}

export function pathToRegex(path: string): string {
   const regexPattern = path
      .split("/")
      .map((segment) => {
         if (segment.startsWith(":")) {
            return ".+"
         }
         return segment
      })
      .join("\\/")
   return `^${regexPattern}$`
}
