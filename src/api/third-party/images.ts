import ky from "ky";
import {
  HandleGetNewImages,
  HandleGetSpecificImages,
} from "@/api/images/services/types.js";
import { MediaItemResultsImages, Images } from "./types.js";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";

export const handleGetSpecificImages = async ({
  access_token,
  searchParams,
}: HandleGetSpecificImages) =>
  ky
    .get(endpoint + ":batchGet", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      searchParams,
    })
    .json<MediaItemResultsImages>();

export const handleGetNewImages = async ({
  access_token,
  bodyParams,
}: HandleGetNewImages) =>
  ky
    .post(endpoint + ":search", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      json: {
        pageSize: 100,
        filters: {
          mediaTypeFilter: {
            mediaTypes: "PHOTO",
          },
          includeArchivedMedia: true,
        },
        ...bodyParams,
      },
    })
    .json<Images>();

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
    console.error("errored url", baseUrl);
  }
};
