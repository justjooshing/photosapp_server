import express from "express";
import { CONFIG } from "./src/config/index.js";
import { expressSetup } from "./src/loaders/express.js";

const app = express();

expressSetup(app);

app.listen(CONFIG.port, () => {
  console.info(`Server is running on port ${CONFIG.port}`);
});
