import ky from "ky";
import { Images, MediaItemSearch } from "./types.ts";
import { prisma } from "../../loaders/prisma.ts";
import { getUserData } from "../user/user.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";

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
        photoUrl: image.baseUrl,
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

export const getImages = async (access_token: string) => {
  try {
    const client = ky.create({
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      json: searchParams,
    });
    const endpoint =
      "https://photoslibrary.googleapis.com/v1/mediaItems:search";

    const res = await client.post(endpoint);
    const newImages = await res.json<Images>();

    const { id: userId } = await getUserData(access_token);
    await updateImagesDB(userId, newImages.mediaItems);

    const sql = Prisma.sql`
    SELECT * FROM "Images" WHERE "userId" = ${userId}
    AND EXTRACT(MONTH FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE);`;

    const images = await prisma.$queryRaw<SchemaImages[]>(sql);

    if (!images.length) {
      return [];
    }

    const urls = images.map(({ photoUrl, id, height, width }) => ({
      source: photoUrl,
      id,
      height,
      width,
    }));

    return urls;
  } catch (err) {
    console.error("ERROR", err);
  }
};
