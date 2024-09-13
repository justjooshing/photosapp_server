import {
  MediaItemResultsImages,
  MediaItemResultSuccess,
} from "@/api/third-party/types.js";
import {
  ApiImages,
  LoadImagesParams,
  RefreshedImageSorter,
  SchemaImages,
  SchemaUser,
} from "./services/types.js";
import {
  findSizelessUserImages,
  getOldestImages,
  getSimilarImages,
  getTodaysImages,
  handleInvalidGoogleImageId,
  sortSimilarImages,
  updateImagesDB,
  updateImageSize,
  updateRefreshedImage,
} from "./services/images.js";
import {
  handleGetSpecificImages,
  getImageSize,
  handleGetNewImages,
} from "@/api/third-party/images.js";
import pLimit from "p-limit";
import { newestImagesFilter } from "@/api/third-party/filters.js";
import { getSocketInstance } from "@/loaders/socket.js";
import { ImageType } from "./types.js";

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

export const checkValidBaseUrl = async (
  access_token: string,
  images: SchemaImages[],
) => {
  // Here, check which images don't currently have in-date baseUrls
  const invalidIfBefore = new Date(new Date().getTime() - 1000 * 60 * 60);

  const groupedUrls = Object.groupBy(images, (curr) => {
    const isInvalid =
      !curr.baseUrl ||
      !curr.baseUrl_last_updated ||
      curr.baseUrl_last_updated < invalidIfBefore;

    return isInvalid ? "invalidBaseUrls" : "validBaseUrls";
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
  const refreshedImages = await refreshGoogleImagesChunks(access_token, images);
  console.info(`${refreshedImages.length} images refreshed`);

  return handleRefreshedImages(refreshedImages);
};

const refreshGoogleImagesChunks = async (
  access_token: string,
  images: SchemaImages[],
): Promise<MediaItemResultSuccess["mediaItem"][]> => {
  const allRefreshedImages = [];

  while (images.length) {
    // Chunk requests into sets of 50 mediaItemIds
    const chunk = images.splice(0, 50);
    console.info("requesting chunk", `data remaining: ${images.length}`);

    const refreshedImages = await refreshGoogleImages(access_token, chunk);
    allRefreshedImages.push(...refreshedImages);
  }
  return allRefreshedImages;
};

const handleRefreshedImages = async (
  refreshedImages: MediaItemResultSuccess["mediaItem"][],
) => {
  const response = [];
  const countLabel = `updating image of ${refreshedImages.length}`;
  for (const image of refreshedImages) {
    console.count(countLabel);
    const saved = await updateRefreshedImage(image);
    response.push(saved);
  }
  console.countReset(countLabel);

  return response;
};

const refreshGoogleImages = async (
  access_token: string,
  images: SchemaImages[],
) => {
  const mediaItemIds = new URLSearchParams();
  for (const image of images) {
    mediaItemIds.append("mediaItemIds", image.googleId);
  }

  const data = await handleGetSpecificImages({
    access_token,
    searchParams: mediaItemIds,
  });

  const { erroredImageIds, refreshedImages } = sortRefreshedImageResponses(
    data,
    images,
  );
  if (erroredImageIds.length) {
    handleInvalidGoogleImageId(erroredImageIds);
  }
  return refreshedImages;
};

export const sortRefreshedImageResponses = (
  data: MediaItemResultsImages["mediaItemResults"],
  images: SchemaImages[],
): RefreshedImageSorter =>
  data.reduce(
    (acc: RefreshedImageSorter, item, index) => {
      // 'status' are errored images
      if ("status" in item) {
        if (item.status.message === "Invalid media item ID.") {
          acc.erroredImageIds.push(images[index].id);
        } else {
          console.error(item.status.message);
        }
      } else {
        acc.refreshedImages.push(item.mediaItem);
      }
      return acc;
    },
    {
      erroredImageIds: [],
      refreshedImages: [],
    },
  );

export const updateImageSizes = async (
  access_token: string,
  userId: number,
) => {
  const io = getSocketInstance();
  const images = await findSizelessUserImages(userId);

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

  const updatePromises = imageSizes.map(updateImageSize);
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
  const limit = pLimit(50);
  const countLabel = `concurrent requests of ${images.length}`;
  const promises = images.reduce(
    (
      acc: Promise<{ baseUrl: string; size: number } | undefined>[],
      { baseUrl },
    ) => {
      console.count(countLabel);
      if (baseUrl) {
        const data = limit(() => getImageSize(access_token, baseUrl));
        acc.push(data);
      }
      return acc;
    },
    [],
  );

  console.countReset(countLabel);
  return Promise.all(promises);
};

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

export const queryByImageType = async (type: ImageType, userId: number) =>
  ({
    today: await getTodaysImages(userId),
    oldest: await getOldestImages(userId),
    similar: await getSimilarImages(userId),
  }[type]);
