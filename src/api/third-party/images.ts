import ky from "ky";
import { HandleGetImages } from "../services/images/types.ts";
import { MediaItemSearch, MediaItemResultsImages, Images } from "./types.ts";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";

export const baseBodyParams = (options?: MediaItemSearch): MediaItemSearch => ({
  pageSize: 100,
  filters: {
    mediaTypeFilter: {
      mediaTypes: "PHOTO",
    },
    includeArchivedMedia: true,
  },
  ...options,
});

export const handleGetImages = async <
  ImageResponseType = MediaItemResultsImages | Images
>({
  access_token,
  options,
}: HandleGetImages): Promise<ImageResponseType> => {
  const client = ky.create({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  let method: "get" | "post" = options.method === ":search" ? "post" : "get";

  const res = await client[method](`${endpoint}${options.method}`, {
    ...(options.method === ":search" && { json: options.bodyParams }),
    ...(options.method === ":batchGet" && {
      searchParams: options.searchParams,
    }),
  });
  return await res.json<ImageResponseType>();
};
