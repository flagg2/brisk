import { Role } from "./server/Auth";
import { Brisk } from "./server/Brisk";

const x = new Brisk({
   port: 3000,
});

x.get("/", (req, res) => {
   return res.ok({
      en: "Hello world",
      sk: "Ahoj svet",
   });
});

x.start();

export { Role, Brisk };
