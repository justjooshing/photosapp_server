import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import cookies from "cookie-parser";
import { routes } from "../api/index.ts";
import { CONFIG } from "../config/index.ts";
import { auth } from "../api/routes/auth.ts";

export const expressSetup = (app: Express) => {
  app.use(cors());
  app.use(express.json());
  app.use(cookies());
  app.use(bodyParser.urlencoded({ extended: true }));
  // auth separate to avoid prefixing
  auth(app);
  app.use(CONFIG.api.prefix, routes());
};
