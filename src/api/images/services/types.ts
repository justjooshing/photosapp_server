import {
  images as SchemaImages,
  album as SchemaAlbum,
  user as SchemaUser,
  image_sets as SchemaImagesSets,
} from "@prisma/client";
import {
  MediaItemResultSuccess,
  MediaItemSearch,
} from "@/api/third-party/types.js";
export { SchemaImages, SchemaAlbum, SchemaUser, SchemaImagesSets };

export interface LoadImagesParams {
  access_token: string;
  userId: number;
  bodyParams: MediaItemSearch;
}

export interface HandleGetSpecificImages {
  access_token: string;
  searchParams: URLSearchParams;
}

export interface HandleGetNewImages {
  access_token: string;
  bodyParams: MediaItemSearch;
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

export interface RefreshedImageSorter {
  erroredImageIds: number[];
  refreshedImages: MediaItemResultSuccess["mediaItem"][];
}
