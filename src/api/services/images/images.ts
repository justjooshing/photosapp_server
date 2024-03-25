import {
  ImageType,
  LoadImagesParams,
  SchemaImages,
  WithPhotoUrl,
} from "./types.ts";
import { newestImagesFilter } from "../../third-party/filters.ts";
import { prisma } from "../../../loaders/prisma.ts";
import { baseBodyParams, handleGetImages } from "../../third-party/images.ts";
import { User } from "@prisma/client";
import { MediaItemResultsImages, Images } from "../../third-party/types.ts";
import { addCurrentAlbum } from "../albums/albums.ts";
import { queryByImageType } from "./queries.ts";
import { prismaRawSql } from "../../utils/index.ts";
import { updateUserLastUpdate } from "../user/user.ts";

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

export const updateNewestImages = async (
  access_token: string,
  appUser: User
) => {
  const currentDate = new Date();

  const { id: appUserId, images_last_updated_at } = appUser;
  const bodyParams = (() => {
    if (!images_last_updated_at) {
      // Grab all images
      return {};
    } else if (
      images_last_updated_at.toDateString() < currentDate.toDateString()
    ) {
      const lastUpdated = new Date(images_last_updated_at);
      // Grab newest images
      return {
        filters: newestImagesFilter(lastUpdated),
      };
    }
    return undefined;
  })();

  if (!!bodyParams) {
    try {
      const newImages = await loadImageSet({ access_token, bodyParams });

      await updateImagesDB(appUserId, newImages);
      console.log(`${!!bodyParams.filters ? "new" : "initial"} images fetched`);
    } catch (err) {
      console.error(`${!!bodyParams.filters ? "new" : "initial"} load`, err);
      throw err;
    }
  }
};

const identifyNewImages = async (
  userId: number,
  images: Images["mediaItems"] = []
) => {
  const newImages: Images["mediaItems"] = [];
  for (const image of images) {
    const existingImage = await prisma.images.findUnique({
      where: {
        userId,
        googleId: image.id,
      },
    });
    if (!existingImage) {
      newImages.push(image);
    }
  }
  return newImages;
};

const updateImagesDB = async (userId: number, images: Images["mediaItems"]) => {
  try {
    const newImages = await identifyNewImages(userId, images);
    if (!!newImages.length) {
      await prisma.images.createMany({
        data: newImages.map((image) => ({
          googleId: image.id,
          userId,
          created_at: image.mediaMetadata.creationTime,
          width: Number(image.mediaMetadata.width),
          height: Number(image.mediaMetadata.height),
        })),
      });
      console.log("db updated");
    }
    await updateUserLastUpdate(userId);
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(userId, images); //restart?
  }
};

// Super annoying having to refetch the image urls again
export const addFreshBaseUrls = async (
  access_token: string,
  images: SchemaImages[]
) => {
  console.log("adding fresh baseURLs");
  try {
    if (!!images.length) {
      const mediaItemIds = new URLSearchParams();
      for (const image of images) {
        mediaItemIds.append("mediaItemIds", image.googleId);
      }
      // The image might not exist anymore, so potentially delete DB entry on specific error?
      const data = await handleGetImages<MediaItemResultsImages>({
        access_token,
        options: {
          method: ":batchGet",
          searchParams: mediaItemIds,
        },
      });

      const updatedImages = images.reduce(
        // Find existing image and add baseUrl id onto it
        (accImages: WithPhotoUrl[], currImage) => {
          const matchingImage = data.mediaItemResults.find((i) => {
            if ("mediaItem" in i) return i.mediaItem.id === currImage.googleId;
          });
          if (matchingImage && "mediaItem" in matchingImage) {
            accImages.push({
              ...currImage,
              baseUrl: matchingImage.mediaItem.baseUrl,
              productUrl: matchingImage.mediaItem.productUrl,
            });
          }
          return accImages;
        },
        []
      );
      const shapedImages = updatedImages.map(shapeImagesResponse);
      // Updated with productUrl
      return shapedImages;
    } else {
      return [];
    }
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const selectImagesByImageType = async (
  type: ImageType,
  userId: number
) => {
  const query = queryByImageType(type, userId);
  const images = await prismaRawSql<SchemaImages[]>(query);
  return images;
};

export const updateImagesByChoice = async (
  userId: number,
  choice: "keep" | "delete",
  imageId: number
) => {
  const currentAlbum = await addCurrentAlbum(userId);
  await prisma.images.update({
    where: {
      id: imageId,
    },
    data: {
      ...(choice === "keep"
        ? { sorted_at: new Date() }
        : {
            deleted_at: new Date(),
            deleted_album_id: currentAlbum.id,
          }),
    },
  });
};

export const shapeImagesResponse = ({
  baseUrl,
  productUrl,
  id,
  height,
  width,
  deleted_album_id,
}: WithPhotoUrl) => ({
  deleted_album_id,
  baseUrl,
  productUrl,
  id,
  height,
  width,
});
