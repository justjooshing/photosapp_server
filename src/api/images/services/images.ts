import { ApiCounts, SchemaImages, SchemaImagesSets } from "./types.js";
import { prisma } from "@/loaders/prisma.js";
import { Images, MediaItemResultSuccess } from "@/api/third-party/types.js";
import { bigIntToString, excludeMimeType } from "@/api/utils/index.js";
import { SortOptions } from "@/api/images/types.js";

import { Prisma } from "@prisma/client";

export const sortSimilarImages = async (userId: number) => {
  console.info("Started: Sorting images into sets");

  // Images that aren't in image sets
  const data = await prisma.$queryRaw<
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

    const updatePromises = newlyCreatedImageSets.map(
      ({ id, unsorted_image_ids }) =>
        tx.images.updateMany({
          where: {
            userId,
            id: {
              in: unsorted_image_ids,
            },
          },
          data: { image_set_id: id },
        }),
    );

    await Promise.all(updatePromises);
    console.info("Finished: Sorting images into sets");
  });
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
      where: {
        userId,
        // only grab images image with matching google id
        googleId: {
          in: images.map(({ id }) => id),
        },
      },
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

export const updateImagesDB = async (
  userId: number,
  images: Images["mediaItems"],
) => {
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

export const updateImageSize = async (
  image:
    | {
        baseUrl: string;
        size: number;
      }
    | undefined,
) =>
  !image
    ? Promise.resolve()
    : prisma.$executeRaw(
        Prisma.sql`
      UPDATE "Images"
      SET "size" = ${image.size}
      WHERE "baseUrl" = ${image.baseUrl}
      `,
      );

export const findSizelessUserImages = async (userId: number) =>
  prisma.images.findMany({
    where: {
      userId,
      size: null,
      actually_deleted: null,
      ...excludeMimeType,
    },
  });

export const updateRefreshedImage = async (
  image: MediaItemResultSuccess["mediaItem"],
) =>
  prisma.images.update({
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

export const updateImagesByChoice = async (
  albumId: number,
  sorted_status: SortOptions,
  imageId: number,
): Promise<SchemaImages> =>
  prisma.images.update({
    where: {
      id: imageId,
    },
    data: {
      sorted_status,
      sorted_album_id: albumId,
      updated_at: new Date(),
    },
  });

export const handleInvalidGoogleImageId = async (erroredImageIds: number[]) => {
  const currentDate = new Date();
  await prisma.images.updateMany({
    where: {
      id: {
        in: erroredImageIds,
      },
    },
    data: {
      actually_deleted: currentDate,
    },
  });
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

export const getSimilarImages = async (userId: number) => {
  const imageSet = await prisma.image_sets.findFirst({
    where: {
      userId,
      images: {
        some: {
          AND: {
            actually_deleted: null,
            sorted_status: null,
          },
        },
      },
      NOT: {
        unsorted_image_ids: {
          isEmpty: true,
        },
      },
    },
    orderBy: [
      { images: { _count: "desc" } },
      { minute: "asc" },
      {
        id: "asc",
      },
    ],
    include: {
      images: {
        where: {
          userId,
          sorted_album_id: null,
        },
      },
    },
  });

  return imageSet?.images || [];
};

export const getOldestImages = async (userId: number) =>
  prisma.images.findMany({
    where: {
      userId,
      updated_at: null,
      actually_deleted: null,
      ...excludeMimeType,
    },
    orderBy: [
      {
        created_at: "asc",
      },
      {
        id: "asc",
      },
    ],
    take: 5,
  });

export const getTodaysImages = async (userId: number) =>
  prisma.$queryRaw<
    SchemaImages[]
  >(Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
    AND updated_at IS NULL
    AND actually_deleted IS NULL
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
    AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE)
    AND mime_type != 'video/mp4'
    AND mime_type IS NOT NULL
    ORDER BY created_at ASC, id ASC
    LIMIT 5`);

/**
 * Used alongside initial import
 */
export const group_similar = (userId: number) =>
  Prisma.sql`SELECT date_trunc('minute', created_at) AS minute, array_agg(id) AS unsorted_image_ids FROM "Images" 
  WHERE "userId" = ${userId}
    AND image_set_id is NULL
    AND updated_at IS NULL
    AND actually_deleted IS NULL
    AND mime_type != 'video/mp4'
    AND mime_type IS NOT NULL
  GROUP BY minute
  HAVING count(*) > 1
  ORDER BY minute`;
