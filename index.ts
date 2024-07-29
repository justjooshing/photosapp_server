import express from "express";
import { CONFIG } from "./src/config/index.js";
import { expressSetup } from "./src/loaders/express.js";

const app = express();

const { port } = CONFIG;

expressSetup(app);

app.listen(port, () => {
  console.info(`Server is running on port ${port}`);
});
