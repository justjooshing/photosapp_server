import { Request as ExpressRequest } from "express";

declare module "express" {
  interface Request extends ExpressRequest {
    locals: {
      access_token: string;
    };
  }
}
declare module "express-serve-static-core" {
  interface Request {
    locals: {
      access_token: string;
    };
  }
}
