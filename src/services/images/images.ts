import ky from "ky";
import {
  Filters,
  HandleGetImages,
  Images,
  MediaItemResultsImages,
  MediaItemSearch,
} from "./types.ts";
import { prisma } from "../../loaders/prisma.ts";
import { getUserData } from "../user/user.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";
const currentDate = new Date();
const baseBodyParams = (options?: MediaItemSearch): MediaItemSearch => ({
  pageSize: 100,
  filters: {
    mediaTypeFilter: {
      mediaTypes: "PHOTO",
    },
    includeArchivedMedia: true,
  },
  ...options,
});

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

const updateImagesDB = async (
  userId: number,
  images: Images["mediaItems"] = []
) => {
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
    }
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(userId, images); //restart?
  }
};

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

/**
 * Initial load of all images
 */
export const initialImageLoad = async (access_token: string) => {
  try {
    const { id: userId } = await getUserData(access_token);

    const fetchAllImages = async (pageToken?: string) => {
      const bodyParams = baseBodyParams({
        ...(pageToken && {
          pageToken,
        }),
      });

      const data = await handleGetImages<Images>({
        access_token,
        options: {
          method: ":search",
          bodyParams,
        },
      });
      await updateImagesDB(userId, data.mediaItems);

      if (data.nextPageToken) {
        console.count("fetching next page");
        await fetchAllImages(data.nextPageToken);
      } else {
        console.log("no more pages");
        return;
      }
    };
    await fetchAllImages();
  } catch (err) {
    console.error("INITIAL LOAD", err);
  }
};

const getNewestImages = async (access_token: string) => {
  try {
    const user = await getUserData(access_token);
    if (user.images_last_updated_at) {
      const lastUpdated = new Date(user.images_last_updated_at);
      const filters: Filters = {
        dateFilter: {
          ranges: [
            {
              endDate: {
                day: currentDate.getDate(),
                month: currentDate.getMonth() + 1, // month starts from 0
                year: currentDate.getFullYear(),
              },
              startDate: {
                day: lastUpdated.getDate(),
                month: lastUpdated.getMonth() + 1,
                year: lastUpdated.getFullYear(),
              },
            },
          ],
        },
      };

      const bodyParams = baseBodyParams({ filters });
      const data = await handleGetImages<Images>({
        access_token,
        options: {
          method: ":search",
          bodyParams,
        },
      });
      await updateImagesDB(user.id, data.mediaItems);
    }
  } catch (err) {
    console.error("NEWEST IMAGES", err);
  }
};

const updateImages = async (access_token: string) => {
  const user = await getUserData(access_token);
  if (!user.images_last_updated_at) {
    // grab all images
    initialImageLoad(access_token);
  } else if (
    new Date(user.images_last_updated_at).toString() <
    currentDate.toDateString()
  ) {
    // update with newest images
    getNewestImages(access_token);
  }
};

const selectImages = async (userId: number) => {
  const sql = Prisma.sql`
    SELECT * FROM "Images" WHERE "userId" = ${userId}
    AND EXTRACT(MONTH FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM "created_at") = EXTRACT(DAY FROM CURRENT_DATE);`;

  return await prisma.$queryRaw<SchemaImages[]>(sql);
};

export const getDayAndMonthImages = async (access_token: string) => {
  try {
    // Need to think about where this should go and when to trigger it
    // updateImages(access_token);

    const user = await getUserData(access_token);

    const filters: Filters = {
      dateFilter: {
        dates: [
          {
            year: 0,
            day: currentDate.getDate(),
            month: currentDate.getMonth() + 1, // month starts from 0
          },
        ],
      },
    };

    const data = await handleGetImages<Images>({
      access_token,
      options: {
        method: ":search",
        bodyParams: baseBodyParams({ filters }),
      },
    });

    await updateImagesDB(user.id, data.mediaItems);

    return await selectImages(user.id);
  } catch (err) {
    console.error("ERROR", err);
    return [];
  }
};
