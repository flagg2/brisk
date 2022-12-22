import { Role } from "./server/Auth";
import { Brisk } from "./server/Brisk";
import zod from "zod";

export { Role, Brisk };

const x = new Brisk({
   port: 3000,
});

x.get(
   "/test",
   (req, res) => {
      req.body;
      return res.ok("Hello World");
   },
   {
      validation: {
         schema: zod.object({
            name: zod.string(),
         }),
         isStrict: false,
      },
   }
);
