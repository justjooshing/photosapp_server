import express from "express";

import { expressSetup } from "./src/loaders/express.ts";
import { CONFIG } from "./src/config/index.ts";

const app = express();

const { port } = CONFIG;

expressSetup(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
