import {
  images as SchemaImages,
  album as SchemaAlbum,
  user as SchemaUser,
  image_sets as SchemaImagesSets,
} from "@prisma/client";
import { MediaItemSearch } from "@/third-party/types.js";
export { SchemaImages, SchemaAlbum, SchemaUser, SchemaImagesSets };

export type ImageType = "today" | "similar" | "oldest";

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
> & { size: string | null };

export interface MiddlewareProps {
  access_token: string;
  appUser: SchemaUser;
}

type CountStatistics = { count: number; size: string };
export interface ApiCounts {
  markDeleteNotDeleted: CountStatistics;
  totalImages: CountStatistics;
  totalSorted: CountStatistics;
  totalDeleted: CountStatistics;
  albumsToDelete: CountStatistics;
}
