import fs from "fs/promises";
import { report } from "./utils/helpers.js";
import { readJsonFile } from "./utils/db.js";

(async () => {
  // await report();
  const hi = () => {
    for (let i = 0; i < 10; i++) {
      return i;
    }
  };
  console.log(hi());
})();
