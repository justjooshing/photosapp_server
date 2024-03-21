import { Request as ExpressRequest } from "express";
import { UserData } from "../services/user/types.ts";
import { User } from "@prisma/client";
import { Images } from "../services/images/types.ts";
import { Images as SchemaImages, Album as SchemaAlbum } from "@prisma/client";

interface MiddlewareProps {
  access_token: string;
  user: UserData;
  appUser: User;
  newImages: Images["mediaItems"];
  selectedImages: (SchemaImages & { baseUrl?: string; productUrl?: string })[];
  currentAlbum: SchemaAlbum;
}

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
