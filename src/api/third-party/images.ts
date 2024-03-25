import ky from "ky";
import {
  MediaItemResultsImages,
  HandleGetImages,
  Images,
} from "../services/images/types.ts";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";

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
