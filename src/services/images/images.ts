import ky from "ky";
import {
  HandleGetImages,
  Images,
  MediaItemResultsImages,
  MediaItemSearch,
} from "./types.ts";
import { prisma } from "../../loaders/prisma.ts";
import { Album as SchemaAlbum } from "@prisma/client";

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

interface LoadImagesParams {
  access_token: string;
  bodyParams?: MediaItemSearch;
}

export const loadImageSet = async ({
  access_token,
  bodyParams,
}: LoadImagesParams) => {
  let images: Images["mediaItems"] = [];
  try {
    const fetchAllImages = async (pageToken?: string) => {
      const data = await handleGetImages<Images>({
        access_token,
        options: {
          method: ":search",
          bodyParams: baseBodyParams({
            ...bodyParams,
            ...(pageToken && {
              pageToken,
            }),
          }),
        },
      });

      if (data.mediaItems) {
        images.push(...data.mediaItems);
      }

      if (data.nextPageToken) {
        console.count("fetching next page");
        await fetchAllImages(data.nextPageToken);
      } else {
        console.log("no more pages");
        return;
      }
    };
    await fetchAllImages();
    return images;
  } catch (err) {
    console.error("FETCH ALL", err);
    throw err;
  }
};

export const createAlbum = async (
  userId: number,
  albumTitle: string
): Promise<SchemaAlbum> => {
  const newAlbum = await prisma.album.create({
    data: {
      userId,
      title: albumTitle,
    },
  });

  return newAlbum;
};
