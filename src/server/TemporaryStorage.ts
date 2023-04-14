import crypto from "crypto"

export class TemporaryStorage {
   private data: {
      [key: string]: unknown
   } = {}
   private ttl: number

   constructor(ttl: number) {
      this.ttl = ttl
   }

   public set(value: unknown) {
      const key = this.getUniqueKey()
      this.data[key] = value

      setTimeout(() => {
         delete this.data[key]
      }, this.ttl)

      return key
   }

   public get(key: string) {
      return this.data[key] ?? null
   }

   public getAndDelete(key: string) {
      const value = this.data[key]
      delete this.data[key]
      return value ?? null
   }

   public getUniqueKey() {
      let key: string
      do {
         key = crypto.randomBytes(20).toString("hex")
      } while (this.data[key] !== undefined)
      return key
   }
}
