import { Role } from "./server/Auth";
import { Brisk } from "./server/Brisk";

//TODO: disallow duplicate requests

class CustomError extends Error {
   constructor(message: string) {
      super(message);
      Object.setPrototypeOf(this, CustomError.prototype);
   }
}

const roles = {
   admin: new Role("admin", "Admin"),
   user: new Role("user", "User"),
};

const server = new Brisk({
   port: 8080,
   authConfig: {
      signingSecret: "secret",
      knownRoles: roles,
      resolverType: "request",
      rolesResolver(req) {
         return [roles.admin];
      },
   },
});

server.post(
   "/test",
   (req, res) => {
      return res.ok(
         {
            en: "Test",
            sk: "Test",
         },
         "data"
      );
   },
   {
      allowedRoles: [roles.user],
   }
);

server.get("error", (req, res) => {
   throw new CustomError("Test error");
});

server.post(
   "longRequest",
   (req, res) => {
      return new Promise((resolve) => {
         setTimeout(() => {
            resolve(
               res.ok({
                  en: "Test",
                  sk: "Test",
               })
            );
         }, 5000);
      });
   },
   {
      allowDuplicateRequests: true,
   }
);

server.get("todo");

server.start();
