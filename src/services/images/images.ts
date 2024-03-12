import ky, { KyInstance } from "ky";
import { Images, MediaItemResultsImages, MediaItemSearch } from "./types.ts";
import { prisma } from "../../loaders/prisma.ts";
import { getUserData } from "../user/user.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";

const createClient = (access_token: string) =>
  ky.create({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
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
};

const currentDate = new Date();
const searchParams: MediaItemSearch = {
  pageSize: 100,
  filters: {
    mediaTypeFilter: {
      mediaTypes: "PHOTO",
    },
    includeArchivedMedia: true,
    dateFilter: {
      dates: [
        {
          year: 0,
          day: currentDate.getDate(),
          month: currentDate.getMonth() + 1, // month starts from 0
        },
      ],
    },
  },
};

// Super annoying having to refetch the image urls again
type WithPhotoUrl = SchemaImages & { photoUrl: string };
const addFreshBaseUrls = async (
  client: KyInstance,
  images: SchemaImages[]
): Promise<WithPhotoUrl[]> => {
  const mediaItemIds = new URLSearchParams();
  for (const image of images) {
    mediaItemIds.append("mediaItemIds", image.googleId);
  }

  const data = await client.get(`${endpoint}:batchGet`, {
    searchParams: mediaItemIds,
  });
  const { mediaItemResults } = await data.json<MediaItemResultsImages>();

  const updatedImages = images.reduce(
    // Find existing image and add photoUrl id onto it
    (accImages: WithPhotoUrl[], currImage) => {
      const matchingImage = mediaItemResults.find((i) => {
        if ("mediaItem" in i) return i.mediaItem.id === currImage.googleId;
      });
      if (matchingImage && "mediaItem" in matchingImage) {
        accImages.push({
          ...currImage,
          photoUrl: matchingImage.mediaItem.baseUrl,
        });
      }
      return accImages;
    },
    []
  );

  return updatedImages;
};

export const getImages = async (access_token: string) => {
  try {
    const client = createClient(access_token);

    const res = await client.post(`${endpoint}:search`, { json: searchParams });
    const newImages = await res.json<Images>();

    const { id: userId } = await getUserData(access_token);
    await updateImagesDB(userId, newImages.mediaItems);

    const sql = Prisma.sql`
    SELECT * FROM "Images" WHERE "userId" = ${userId}
    AND EXTRACT(MONTH FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM "created_at") = EXTRACT(DAY FROM CURRENT_DATE);`;

    let imagesMatchingCurrentDayAndMonth = await prisma.$queryRaw<
      SchemaImages[]
    >(sql);

    if (!imagesMatchingCurrentDayAndMonth.length) {
      return [];
    }

    const updatedImages = await addFreshBaseUrls(
      client,
      imagesMatchingCurrentDayAndMonth
    );
    const response = updatedImages.map(({ photoUrl, id, height, width }) => ({
      source: photoUrl,
      id,
      height,
      width,
    }));

    return response;
  } catch (err) {
    console.error("ERROR", err);
  }
};
