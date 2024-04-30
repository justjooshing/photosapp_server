import express from "express";

import { expressSetup } from "./src/loaders/express.js";
import { CONFIG } from "./src/config/index.js";

const app = express();

const { port } = CONFIG;

expressSetup(app);

app.listen(port, () => {
  console.info(`Server is running on port ${port}`);
});
