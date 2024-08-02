import {
  images as SchemaImages,
  album as SchemaAlbum,
  user as SchemaUser,
  image_sets as SchemaImagesSets,
} from "@prisma/client";
import { MediaItemSearch } from "@/api/third-party/types.js";
export { SchemaImages, SchemaAlbum, SchemaUser, SchemaImagesSets };

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

type CountStatistics = { count: number; size: string };
type StatisticKeys =
  | "markDeleteNotDeleted"
  | "totalImages"
  | "totalSorted"
  | "totalDeleted"
  | "albumsToDelete"
  | "albumsKept";

export type ApiCounts = Record<StatisticKeys, CountStatistics>;
