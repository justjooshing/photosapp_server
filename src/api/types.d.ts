import { Request as ExpressRequest } from "express";
import { MiddlewareProps } from "./services/images/types.ts";

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
