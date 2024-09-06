import express from "express";
import http from "http";
import { CONFIG } from "@/config/index.js";
import { expressSetup } from "@/loaders/express.js";
import { initializeSocket } from "@/loaders/socket.js";

const app = express();
const server = http.createServer(app);

expressSetup(app);
initializeSocket(server);

server.listen(CONFIG.port, () => {
  console.info(`Server is running on port ${CONFIG.port}`);
});
