import { Request as ExpressRequest } from "express";
import { MiddlewareProps } from "./images/services/types.ts";

declare module "express" {
  interface Request extends ExpressRequest {
    locals: MiddlewareProps;
  }
}
declare module "express-serve-static-core" {
  interface Request {
    locals: MiddlewareProps;
  }
}

interface MiddlewareProps {
  access_token: string;
  appUser: SchemaUser;
  app_version: number;
}
