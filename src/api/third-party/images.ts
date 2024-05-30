import ky from "ky";
import { HandleGetImages } from "@/services/images/types.js";
import { MediaItemSearch, MediaItemResultsImages, Images } from "./types.js";

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
  ImageResponseType = MediaItemResultsImages | Images,
>({
  access_token,
  options,
}: HandleGetImages): Promise<ImageResponseType> => {
  const client = ky.create({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const method = options.method === ":search" ? "post" : "get";

  const res = await client[method](`${endpoint}${options.method}`, {
    ...(options.method === ":search" && { json: options.bodyParams }),
    ...(options.method === ":batchGet" && {
      searchParams: options.searchParams,
    }),
  });
  return await res.json<ImageResponseType>();
};

export const getImageSize = async (access_token: string, baseUrl: string) => {
  try {
    // =d param is to get download quality rather than compressed
    const imageSize = await ky.head(`${baseUrl}=d`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const firstImageSize = imageSize.headers.get("Content-Length");
    return { baseUrl, size: Number(firstImageSize) };
  } catch (err) {
    console.count("getImageSize error");
    console.log("errored url", baseUrl);
  }
};
