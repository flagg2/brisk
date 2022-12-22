import { Role } from "./server/Auth";
import { Brisk } from "./server/Brisk";

export { Role, Brisk };

const x = new Brisk({
   port: 3000,
});
