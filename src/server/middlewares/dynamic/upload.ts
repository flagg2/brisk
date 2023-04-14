import { BriskNext, BriskRequest } from "dist"
import multer from "multer"
import { TemporaryStorage } from "src/server/TemporaryStorage"
import { AnyBriskRequest, AnyBriskResponse } from "src/server/types"

type SingleFileUploadMiddlewareOptions = {
   metaStorage: TemporaryStorage
   maxFileSize?: number // optional file size limit in bytes
   allowedFileExtensions?: string[] // optional allowed file types as an array of strings
   allowedMimeTypes?: string[] // optional allowed mime types as an array of strings
}

export const getUploadFileMiddleware = (
   options: SingleFileUploadMiddlewareOptions,
) => {
   const { maxFileSize, allowedFileExtensions, allowedMimeTypes } = options
   const upload = multer({
      limits: { fileSize: maxFileSize ?? 1000000 }, // Default to 1MB if fileSize option not provided
      fileFilter: (req, file, cb) => {
         const validExtension =
            allowedFileExtensions === undefined ||
            allowedFileExtensions.some((type) =>
               file.originalname.toLowerCase().endsWith(`.${type}`),
            )
         const validMimeType =
            allowedMimeTypes === undefined ||
            allowedMimeTypes.includes(file.mimetype)

         if (!validExtension) {
            cb(
               new Error(
                  `Invalid file type. Only ${allowedFileExtensions.join(
                     ", ",
                  )} files are allowed.`,
               ),
            )
            return
         }
         if (!validMimeType) {
            cb(
               new Error(
                  `Invalid file type. Only ${allowedMimeTypes.join(
                     ", ",
                  )} files are allowed.`,
               ),
            )
         }
         cb(null, true)
      },
   })

   return (req: AnyBriskRequest, res: AnyBriskResponse, next: BriskNext) => {
      const { metaId } = req.query
      const metaKey = metaId

      if (metaKey === undefined) {
         return res.badRequest({
            message: "Missing metaId in query params",
         })
      }

      upload.single("file")(req, res, (err) => {
         if (err) {
            return res.badRequest({
               message: err.message,
            })
         }

         if (req.file === undefined) {
            return res.badRequest({
               message: "No file attached",
            })
         }

         const { metaStorage } = options
         const meta = metaStorage.getAndDelete(metaKey)

         //TODO: support case where no metadata is attached
         if (meta === null) {
            return res.notFound({
               message: "No attached metadata found",
            })
         }

         req.body = meta

         next()
      })
   }
}

export const getUploadMetaResolver = (storage: TemporaryStorage) => {
   return (req: AnyBriskRequest, res: AnyBriskResponse) => {
      const key = storage.set(req.body)
      return res.ok({
         data: {
            metaId: key,
         },
      })
   }
}
