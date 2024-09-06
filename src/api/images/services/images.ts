import {
  ApiCounts,
  ApiImages,
  LoadImagesParams,
  SchemaImages,
  SchemaImagesSets,
  SchemaUser,
} from "./types.js";
import { newestImagesFilter } from "@/api/third-party/filters.js";
import { prisma } from "@/loaders/prisma.js";
import {
  Images,
  MediaItemResultError,
  MediaItemResultSuccess,
} from "@/api/third-party/types.js";
import { group_similar } from "./queries.js";
import {
  bigIntToString,
  excludeMimeType,
  prismaRawSql,
} from "@/api/utils/index.js";
import pLimit from "p-limit";
import {
  getImageSize,
  handleGetNewImages,
  handleGetSpecificImages,
} from "@/api/third-party/images.js";
import { SortOptions } from "@/api/images/types.js";
import { getSocketInstance } from "@/loaders/socket.js";

export const fetchAllImages = async ({
  access_token,
  userId,
  bodyParams,
}: LoadImagesParams) => {
  try {
    const { mediaItems, nextPageToken } = await handleGetNewImages({
      access_token,
      bodyParams,
    });
    await updateImagesDB(userId, mediaItems);
    await sortSimilarImages(userId);
    await updateImageSizes(access_token, userId);
    const countLabel = "fetching next page";
    if (nextPageToken) {
      console.count(countLabel);
      await fetchAllImages({
        access_token,
        userId,
        bodyParams: { ...bodyParams, pageToken: nextPageToken },
      });
    } else {
      // Close existing sockets since we've finished updating
      const io = getSocketInstance();
      io.in(userId.toString()).disconnectSockets();
      console.countReset(countLabel);
      console.info("No more pages");
    }
  } catch (err) {
    console.error("FETCH ALL", err);
    throw err;
  }
};

export const sortSimilarImages = async (userId: number) => {
  console.info("Started: Sorting images into sets");

  // Images that aren't in image sets
  const data = await prismaRawSql<
    Pick<SchemaImagesSets, "unsorted_image_ids" | "minute">[]
  >(group_similar(userId));

  if (!data.length) return;

  // $transaction allows for atomicity
  await prisma.$transaction(async (tx) => {
    await tx.image_sets.createMany({
      data: data.map((group) => ({
        ...group,
        userId,
      })),
    });

    const newlyCreatedImageSets = await tx.image_sets.findMany({
      where: {
        userId,
        minute: {
          in: data.map(({ minute }) => minute),
        },
      },
    });

    const updatePromises = newlyCreatedImageSets.map((image_set) =>
      tx.images.updateMany({
        where: {
          userId,
          id: {
            in: image_set.unsorted_image_ids,
          },
        },
        data: { image_set_id: image_set.id },
      }),
    );

    await Promise.all(updatePromises);
    console.info("Finished: Sorting images into sets");
  });
};

export const updateNewestImages = async (
  access_token: string,
  appUser: SchemaUser,
) => {
  const { id, images_last_updated_at } = appUser;
  // If last update is today
  if (
    images_last_updated_at &&
    images_last_updated_at.toDateString() >= new Date().toDateString()
  )
    return;

  const bodyParams = images_last_updated_at
    ? {
        filters: newestImagesFilter(images_last_updated_at),
      }
    : {};

  try {
    await fetchAllImages({
      access_token,
      userId: id,
      bodyParams,
    });

    // Sweep to try and update any image sizes that we don't have
    await updateImageSizes(access_token, id);

    console.info(`${bodyParams.filters ? "new" : "initial"} images fetched`);
  } catch (err) {
    console.error(`${bodyParams.filters ? "new" : "initial"} load`, err);
    throw err;
  }
};

export const findImage = async (
  userId: number,
  imageId: number,
): Promise<SchemaImages | null> =>
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

  const newImages: Images["mediaItems"] = !existingImageGoogleIds.length
    ? images
    : images.filter(({ id }) => !existingImageGoogleIds.includes(id));

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
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(userId, images); //restart?
  }
};

export const updateImageSizes = async (
  access_token: string,
  userId: number,
) => {
  const io = getSocketInstance();
  const images = await prisma.images.findMany({
    where: {
      userId,
      size: null,
      actually_deleted: null,
      ...excludeMimeType,
    },
  });

  if (!images.length) return;

  // refresh baseURLs to be sure we can request them
  const withBaseURLs = await checkValidBaseUrl(access_token, images);
  console.info("updated all base urls for images missing sizes");
  const imageSizes = await concurrentlyGetImagesSizes(
    access_token,
    withBaseURLs,
  );

  if (!imageSizes?.length) return;

  const countLabel = `Updating image size ${imageSizes.length}`;
  const updatePromises = imageSizes.map((image) => {
    if (image?.baseUrl && image?.size) {
      console.count(countLabel);
      return prisma.$executeRaw`
          UPDATE "Images"
          SET "size" = ${image.size}
          WHERE "baseUrl" = ${image.baseUrl}
        `;
    }
    return Promise.resolve();
  });
  console.countReset(countLabel);
  await Promise.all(updatePromises);

  // Tell the FE to refetch image sizes
  io.in(userId.toString()).emit("db_updated", { message: "sizes_updated" });
  console.info("last image size updated");
};

export const concurrentlyGetImagesSizes = async (
  access_token: string,
  images: ApiImages[],
) => {
  try {
    const limit = pLimit(50);
    const countLabel = `concurrent requests of ${images.length}`;
    const promises = images.reduce(
      (
        acc: Promise<{ baseUrl: string; size: number } | undefined>[],
        { baseUrl },
      ) => {
        console.count(countLabel);
        if (baseUrl) {
          acc.push(limit(() => getImageSize(access_token, baseUrl)));
        }
        return acc;
      },
      [],
    );

    const results = await Promise.all(promises);
    console.countReset(countLabel);

    return results.filter((res) => !!res);
  } catch (err) {
    console.error("err", err);
  }
};

export const checkValidBaseUrl = async (
  access_token: string,
  images: SchemaImages[],
) => {
  // Here, check which images don't currently have in-date baseUrls
  const invalidIfBefore = new Date(new Date().getTime() - 1000 * 60 * 60);

  const groupedUrls = Object.groupBy(images, (curr) => {
    return !curr.baseUrl ||
      !curr.baseUrl_last_updated ||
      curr.baseUrl_last_updated < invalidIfBefore
      ? "invalidBaseUrls"
      : "validBaseUrls";
  });

  const validBaseUrls = groupedUrls.validBaseUrls || [];
  const invalidBaseUrls = groupedUrls.invalidBaseUrls || [];

  if (!invalidBaseUrls.length) {
    return validBaseUrls.map(shapeImagesResponse);
  }

  const withFreshUrls = await addFreshBaseUrls(access_token, invalidBaseUrls);
  const allImages: SchemaImages[] = validBaseUrls.concat(withFreshUrls);

  const sortedImages = allImages.map(shapeImagesResponse);
  return sortedImages;
};

// Super annoying having to refetch the image urls again
export const addFreshBaseUrls = async (
  access_token: string,
  images: SchemaImages[],
): Promise<SchemaImages[]> => {
  console.info("adding fresh baseURLs");
  try {
    const mappedImages = new Map<string, SchemaImages>();
    for (const image of images) {
      mappedImages.set(image.googleId, image);
    }

    const erroredImages: MediaItemResultError[] = [];
    const refreshedImages = new Map<
      string,
      MediaItemResultSuccess["mediaItem"]
    >();

    const dataset = Array.from(mappedImages.values());
    while (dataset.length) {
      // Chunk requests into sets of 50 mediaItemIds
      const chunk = dataset.splice(0, 50);
      console.info(
        "requesting chunk",
        `data remaining: ${dataset.length}`,
        `errored urls: ${erroredImages.length}`,
        `refreshed urls: ${refreshedImages.size}`,
      );
      const mediaItemIds = new URLSearchParams();
      for (const image of chunk) {
        mediaItemIds.append("mediaItemIds", image.googleId);
      }
      const data = await handleGetSpecificImages({
        access_token,
        searchParams: mediaItemIds,
      });

      data.mediaItemResults.forEach((item) => {
        if ("status" in item) {
          erroredImages.push(item);
        } else {
          refreshedImages.set(item.mediaItem.id, item.mediaItem);
        }
      });
    }

    console.info(
      "finished requesting all base URLs",
      dataset.length,
      erroredImages.length,
      refreshedImages.size,
    );

    if (erroredImages.length) {
      await handleInvalidGoogleImageId(images, erroredImages);
    }

    const response = [];
    const countLabel = `updating image of ${refreshedImages.size}`;
    for (const image of refreshedImages.values()) {
      console.count(countLabel);
      const saved = await prisma.images.update({
        where: {
          googleId: image.id,
        },
        data: {
          baseUrl: image.baseUrl,
          baseUrl_last_updated: new Date(),
          ...(!image.productUrl && {
            productUrl: image.productUrl,
          }),
        },
      });
      response.push(saved);
    }
    console.countReset(countLabel);

    return response;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const updateImagesByChoice = async (
  albumId: number,
  sorted_status: SortOptions,
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
  size,
}: SchemaImages): ApiImages => ({
  sorted_status,
  sorted_album_id,
  baseUrl,
  productUrl,
  id,
  size: size ? size.toString() : null,
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
  console.info("Handled invalid google image ids");
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

export const getSortCounts = async (userId: number): Promise<ApiCounts> => {
  const totalDeleted = await prisma.images.aggregate({
    where: {
      userId,
      sorted_status: SortOptions.DELETE,
      actually_deleted: { not: null },
      ...excludeMimeType,
    },
    _sum: { size: true },
    _count: { size: true },
  });

  const totalSorted = await prisma.images.aggregate({
    where: {
      userId,
      sorted_status: { in: Object.values(SortOptions) },
      ...excludeMimeType,
    },
    _sum: { size: true },
    _count: { size: true },
  });

  const totalImages = await prisma.images.aggregate({
    where: {
      userId,
      size: { not: null },
      actually_deleted: null,
      ...excludeMimeType,
    },
    _sum: { size: true },
    _count: { size: true },
  });

  const markDeleteNotDeleted = await prisma.images.aggregate({
    where: {
      userId,
      sorted_status: SortOptions.DELETE,
      actually_deleted: null,
      ...excludeMimeType,
    },
    _sum: { size: true },
    _count: { size: true },
  });

  const deletedAlbums = await prisma.album.count({
    where: {
      userId,
      images: {
        some: {
          sorted_status: SortOptions.DELETE,
          actually_deleted: null,
          ...excludeMimeType,
        },
      },
    },
  });

  const keptAlbums = await prisma.album.count({
    where: {
      userId,
      images: {
        // Otherwise the album should contain some 'keep'
        // but none that are to be deleted but not actually deleted
        some: {
          sorted_status: SortOptions.KEEP,
          actually_deleted: null,
          ...excludeMimeType,
        },
        every: {
          NOT: {
            sorted_status: SortOptions.DELETE,
            actually_deleted: null,
            ...excludeMimeType,
          },
        },
      },
    },
  });

  return {
    markDeleteNotDeleted: {
      count: markDeleteNotDeleted._count.size,
      size: bigIntToString(markDeleteNotDeleted._sum.size),
    },
    totalImages: {
      count: totalImages._count.size,
      size: bigIntToString(totalImages._sum.size),
    },
    totalSorted: {
      count: totalSorted._count.size,
      size: bigIntToString(totalSorted._sum.size),
    },
    totalDeleted: {
      count: totalDeleted._count.size,
      size: bigIntToString(totalDeleted._sum.size),
    },
    albumsToDelete: {
      count: deletedAlbums || 0,
      size: bigIntToString(markDeleteNotDeleted._sum.size),
    },
    albumsKept: {
      count: keptAlbums || 0,
      size: (
        (Number(totalImages._sum.size) || 0) -
        (Number(markDeleteNotDeleted._sum.size) || 0)
      ).toString(),
    },
  };
};
