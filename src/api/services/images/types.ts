import {
  Images as SchemaImages,
  Album as SchemaAlbum,
  User as SchemaUser,
} from "@prisma/client";
import { MediaItemSearch } from "@/third-party/types.ts";
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

// ShapedImages sent in res
export type ApiImages = Pick<
  SchemaImages,
  "sorted_status" | "sorted_album_id" | "baseUrl" | "productUrl" | "id"
>;

export interface MiddlewareProps {
  access_token: string;
  appUser: SchemaUser;
}
