import {
  ApiImages,
  LoadImagesParams,
  SchemaImages,
  SchemaImagesSets,
  SchemaUser,
} from "./types.js";
import { newestImagesFilter } from "@/third-party/filters.js";
import { prisma } from "../../../loaders/prisma.js";
import { baseBodyParams, handleGetImages } from "@/third-party/images.js";
import {
  MediaItemResultsImages,
  Images,
  MediaItemResultError,
  MediaItemResultSuccess,
} from "@/third-party/types.js";
import { group_similar } from "./queries.js";
import { prismaRawSql } from "@/utils/index.js";
import { updateUserLastUpdate } from "@/services/user/user.js";

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

type QueryImageSets = Pick<SchemaImagesSets, "unsorted_image_ids" | "minute">[];
const identifyNewImagesSets = async (userId: number, data: QueryImageSets) => {
  const existingImageSets = await prisma.image_sets.findMany({
    where: { userId },
    select: { unsorted_image_ids: true },
  });

  const existingImageIds = existingImageSets
    .map(({ unsorted_image_ids }) => unsorted_image_ids)
    .flat();

  // Add as newImageSet if none of the current (new) group's unsorted_image_ids exist in existing image_ids
  const newImageSets = data.filter(
    ({ unsorted_image_ids }) =>
      !unsorted_image_ids.some((id) => existingImageIds.includes(id)),
  );

  return newImageSets;
};
const sortSimilarImages = async (userId: number) => {
  console.info("getting similar image sets");

  const data = await prismaRawSql<QueryImageSets>(group_similar(userId));

  const newImageSets = await identifyNewImagesSets(userId, data);

  if (newImageSets.length) {
    await prisma.image_sets.createMany({
      data: newImageSets.map((group) => ({ ...group, userId })),
    });
    const newlyCreatedImageSets = await prisma.image_sets.findMany({
      where: {
        userId,
        minute: {
          in: data.map(({ minute }) => minute),
        },
      },
    });
    console.info("updating images with respective image set ids");
    for (const image_set of newlyCreatedImageSets) {
      await prisma.images.updateMany({
        where: {
          userId,
          id: {
            in: image_set.unsorted_image_ids,
          },
        },
        data: { image_set_id: image_set.id },
      });
    }
    console.info("updated images with respective image set ids");
  }
  console.info("updated new image sets");
};

export const updateNewestImages = async (
  access_token: string,
  appUser: SchemaUser,
) => {
  const currentDate = new Date();

  const { id: appUserId, images_last_updated_at } = appUser;
  const bodyParams = (() => {
    if (!images_last_updated_at) {
      // Grab all images
      return {};
    } else if (
      // Grab newest images each day
      new Date(images_last_updated_at.toDateString()) <
      new Date(currentDate.toDateString())
    ) {
      const lastUpdated = new Date(images_last_updated_at);
      return {
        filters: newestImagesFilter(lastUpdated),
      };
    }
    return undefined;
  })();

  sortSimilarImages(appUser.id);
  if (bodyParams) {
    try {
      const newImages = await loadImageSet({ access_token, bodyParams });
      await updateImagesDB(appUserId, newImages);
      console.info(
        `${bodyParams.filters ? "new" : "initial"} images fetched and sorted`,
      );
    } catch (err) {
      console.error(`${bodyParams.filters ? "new" : "initial"} load`, err);
      throw err;
    }
  }
};

export const findImage = async (userId: number, imageId: number) =>
  await prisma.images.findUnique({
    where: {
      userId,
      id: imageId,
    },
  });

const identifyNewImages = async (
  userId: number,
  images: Images["mediaItems"] = [],
) => {
  const existingImageGoogleIds = await prisma.images
    .findMany({
      where: { userId },
      select: {
        googleId: true,
      },
    })
    .then((data) => data.map(({ googleId }) => googleId));

  const newImages: Images["mediaItems"] = images.filter(
    ({ id }) => !existingImageGoogleIds.includes(id),
  );
  console.info("new images count:", newImages.length);
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
          baseUrl_last_updated: currentDate,
          productUrl: image.productUrl,
          mime_type: image.mimeType,
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
        !curr.baseUrl ||
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

export const updateImagesByChoice = async (
  albumId: number,
  sorted_status: "keep" | "delete",
  imageId: number,
): Promise<SchemaImages> =>
  await prisma.images.update({
    where: {
      id: imageId,
    },
    data: {
      sorted_status,
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

export const sortImageSet = async (userId: number, image: SchemaImages) => {
  if (!image.image_set_id) return;

  console.info("updating image_set");
  const existingImageSet = await prisma.image_sets.findUnique({
    where: {
      userId,
      id: image.image_set_id,
    },
    select: {
      unsorted_image_ids: true,
    },
  });

  if (existingImageSet) {
    const updatedUnsortedImageIds = existingImageSet.unsorted_image_ids.filter(
      (id) => id !== image.id,
    );

    await prisma.image_sets.update({
      where: {
        userId,
        id: image.image_set_id,
      },
      data: {
        sorted_image_ids: {
          push: image.id,
        },
        unsorted_image_ids: updatedUnsortedImageIds,
      },
    });
  }
  console.info("updated image_set");
};

const selectCountByColumn = async (userId: number, choice: "delete" | "keep") =>
  await prisma.images.count({
    where: {
      userId,
      sorted_status: choice,
    },
  });

export const getSortCounts = async (userId: number) => {
  const deletedCount = await selectCountByColumn(userId, "delete");
  const sortedCount = await selectCountByColumn(userId, "keep");

  return { deletedCount, sortedCount };
};
