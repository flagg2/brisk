import { Brisk } from "./server/Brisk";

const server = new Brisk({
   port: 8080,
   baseErrorOverrides: null,
});

server.get("/test", (req, res) => {
   return server.response.ok(
      res,
      {
         en: "Test",
         sk: "Test",
      },
      {
         lol: "Test data",
      }
   );
});

server.get("error", (req, res) => {
   throw new Error("Test error");
});

server.get("long", (req, res) => {
   setTimeout(() => {
      res.send("Long request");
   }, 1000);
});

server.get("todo");

server.start();
