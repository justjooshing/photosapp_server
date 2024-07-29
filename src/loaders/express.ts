import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import { routes } from "../api/routes.js";
import { CONFIG } from "../config/index.js";
import { MiddlewareProps } from "../api/images/services/types.js";
import { handleCorsOrigin } from "../middleware/cors.js";

export const expressSetup = (app: Express) => {
  app.use(cors({ origin: handleCorsOrigin }));
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use((req, _, next) => {
    if (!req?.locals) {
      req.locals = {} as MiddlewareProps;
    }
    next();
  });
  app.use(CONFIG.api.prefix, routes());
};
