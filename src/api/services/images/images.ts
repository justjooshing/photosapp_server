import {
  ApiImages,
  ImageType,
  LoadImagesParams,
  SchemaImages,
} from "./types.ts";
import { newestImagesFilter } from "../../third-party/filters.ts";
import { prisma } from "../../../loaders/prisma.ts";
import { baseBodyParams, handleGetImages } from "../../third-party/images.ts";
import { User } from "@prisma/client";
import {
  MediaItemResultsImages,
  Images,
  MediaItemResultError,
  MediaItemResultSuccess,
} from "../../third-party/types.ts";
import { queryByImageType } from "./queries.ts";
import { prismaRawSql } from "../../utils/index.ts";
import { updateUserLastUpdate } from "../user/user.ts";

export const loadImageSet = async ({
  access_token,
  bodyParams,
}: LoadImagesParams) => {
  const images: Images["mediaItems"] = [];
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
        console.info("no more pages");
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
  appUser: User,
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

  if (bodyParams) {
    try {
      const newImages = await loadImageSet({ access_token, bodyParams });

      await updateImagesDB(appUserId, newImages);
      console.info(`${bodyParams.filters ? "new" : "initial"} images fetched`);
    } catch (err) {
      console.error(`${bodyParams.filters ? "new" : "initial"} load`, err);
      throw err;
    }
  }
};

const identifyNewImages = async (
  userId: number,
  images: Images["mediaItems"] = [],
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
    if (newImages.length) {
      const currentDate = new Date();
      await prisma.images.createMany({
        data: newImages.map((image) => ({
          googleId: image.id,
          userId,
          created_at: image.mediaMetadata.creationTime,
          baseUrl: image.baseUrl,
          baseUrl_updated_at: currentDate,
          productUrl: image.productUrl,
        })),
      });
      console.info("db updated");
    }
    await updateUserLastUpdate(userId);
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(userId, images); //restart?
  }
};

export const checkValidBaseUrl = async (
  access_token: string,
  images: SchemaImages[],
) => {
  // Here, check which images don't currently have in-date baseUrls
  const invalidIfBefore = new Date(new Date().getTime() - 1000 * 60 * 60);

  const { validBaseUrls, invalidBaseUrls } = images.reduce(
    (
      acc: { validBaseUrls: SchemaImages[]; invalidBaseUrls: SchemaImages[] },
      curr,
    ) => {
      if (
        !curr.baseUrl_last_updated ||
        curr.baseUrl_last_updated < invalidIfBefore
      ) {
        acc.invalidBaseUrls.push(curr);
      } else {
        acc.validBaseUrls.push(curr);
      }
      return acc;
    },
    { validBaseUrls: [], invalidBaseUrls: [] },
  );

  if (invalidBaseUrls.length) {
    const withFreshUrls = await addFreshBaseUrls(access_token, invalidBaseUrls);
    const allImages: SchemaImages[] = validBaseUrls.concat(withFreshUrls);

    const sortImagesByDate = (a: SchemaImages, b: SchemaImages) =>
      a.created_at.getTime() - b.created_at.getTime();

    const shapedImages = allImages
      .sort(sortImagesByDate)
      .map(shapeImagesResponse);
    // Updated with productUrl
    return shapedImages;
  }

  return validBaseUrls.map(shapeImagesResponse);
};

// Super annoying having to refetch the image urls again
export const addFreshBaseUrls = async (
  access_token: string,
  images: SchemaImages[],
): Promise<SchemaImages[]> => {
  console.info("adding fresh baseURLs");
  try {
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

    const { erroredImages, refreshedImages } = data.mediaItemResults.reduce(
      (
        acc: {
          erroredImages: MediaItemResultError[];
          refreshedImages: MediaItemResultSuccess[];
        },
        curr,
      ) => {
        if ("status" in curr) {
          acc.erroredImages.push(curr);
        } else {
          acc.refreshedImages.push(curr);
        }
        return acc;
      },
      {
        erroredImages: [],
        refreshedImages: [],
      },
    );

    if (erroredImages.length) {
      await handleInvalidGoogleImageId(images, erroredImages);
    }

    const updatedImages = images.reduce(
      // Find existing image and add baseUrl id onto it
      (accImages: SchemaImages[], currImage) => {
        const matchingImage = refreshedImages.find((i) => {
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
      [],
    );

    for (const image of updatedImages) {
      await prisma.images.update({
        where: {
          id: image.id,
        },
        data: {
          baseUrl: image.baseUrl,
          baseUrl_last_updated: new Date(),
          ...(!image.productUrl && { productUrl: image.productUrl }),
        },
      });
    }

    return updatedImages;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const selectImagesByImageType = async (
  type: ImageType,
  userId: number,
) => {
  const query = queryByImageType(type, userId);
  const images = await prismaRawSql<SchemaImages[]>(query);
  return images;
};

export const updateImagesByChoice = async (
  albumId: number,
  choice: "keep" | "delete",
  imageId: number,
): Promise<SchemaImages> =>
  await prisma.images.update({
    where: {
      id: imageId,
    },
    data: {
      sorted_status: choice,
      sorted_album_id: albumId,
      updated_at: new Date(),
    },
  });

export const shapeImagesResponse = ({
  baseUrl,
  productUrl,
  id,
  sorted_status,
  sorted_album_id,
}: SchemaImages): ApiImages => ({
  sorted_status,
  sorted_album_id,
  baseUrl,
  productUrl,
  id,
});

const handleInvalidGoogleImageId = async (
  images: SchemaImages[],
  erroredImages: MediaItemResultError[],
) => {
  // Save imageIDs that are erroring
  const erroredIds: number[] = [];

  for (const [index, image] of erroredImages.entries()) {
    if (image.status.message === "Invalid media item ID.") {
      erroredIds.push(images[index].id);
    } else {
      console.error(image.status.message);
    }
  }

  const markGoogleDeletedImages = async () => {
    const currentDate = new Date();
    await prisma.images.updateMany({
      where: {
        id: {
          in: erroredIds,
        },
      },
      data: {
        actually_deleted: currentDate,
      },
    });
  };

  await markGoogleDeletedImages();
};
