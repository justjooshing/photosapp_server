import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import cookies from "cookie-parser";
import { routes } from "../api/index.js";
import { CONFIG } from "../config/index.js";
import { auth } from "../api/routes/auth.js";
import { MiddlewareProps } from "../api/services/images/types.js";

export const expressSetup = (app: Express) => {
  app.use(cors());
  app.use(express.json());
  app.use(cookies());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, _, next) => {
    if (!req?.locals) {
      req.locals = {} as MiddlewareProps;
    }
    next();
  });
  // auth separate to avoid prefixing
  auth(app);
  app.use(CONFIG.api.prefix, routes());
};
