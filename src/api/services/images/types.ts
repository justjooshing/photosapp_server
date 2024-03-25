import {
  Images as SchemaImages,
  Album as SchemaAlbum,
  User as SchemaUser,
} from "@prisma/client";
import { UserData } from "../user/types.ts";
import { MediaItemSearch } from "../../third-party/types.ts";
export { SchemaImages, SchemaAlbum, SchemaUser };

export type ImageType = "today" | "similar";

export interface LoadImagesParams {
  access_token: string;
  bodyParams?: MediaItemSearch;
}

export interface HandleGetImages {
  access_token: string;
  options:
    | {
        method: ":search";
        bodyParams: MediaItemSearch;
      }
    | {
        method: ":batchGet";
        searchParams: URLSearchParams;
      };
}

export type WithPhotoUrl = SchemaImages & {
  baseUrl: string;
  productUrl: string;
};

export interface MiddlewareProps {
  access_token: string;
  user: UserData;
  appUser: SchemaUser;
}
