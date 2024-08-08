import { prisma } from "@/loaders/prisma.js";
import { checkValidBaseUrl } from "@/api/images/services/images.js";
import {
  ApiImages,
  SchemaAlbum,
  SchemaImages,
} from "@/api/images/services/types.js";
import { ApiAlbum } from "./types.js";
import { SortOptions } from "@/api/images/types.js";

export const findAlbums = async (
  userId: number,
  sorted_status: SortOptions,
  lastAlbumId?: number,
) =>
  prisma.album.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 10,
    where: {
      userId,
      images:
        sorted_status === SortOptions.DELETE
          ? {
              // If delete, some should be 'delete'
              some: {
                AND: {
                  sorted_status: SortOptions.DELETE,
                  actually_deleted: null,
                },
              },
            }
          : {
              // Otherwise the album should contain some 'keep'
              // but none that are to be deleted but not actually deleted
              some: {
                AND: {
                  sorted_status: "keep",
                  actually_deleted: null,
                },
              },
              every: {
                NOT: {
                  AND: {
                    sorted_status: SortOptions.DELETE,
                    actually_deleted: null,
                  },
                },
              },
            },
    },
    include: {
      images: {
        where: {
          actually_deleted: null,
          sorted_status,
          mime_type: {
            not: "video/mp4",
          },
        },
        take: 1,
      },
      _count: {
        select: {
          images: {
            where: {
              sorted_status,
            },
          },
        },
      },
    },
    // For pagination
    ...(lastAlbumId && {
      skip: 1,
      cursor: {
        id: lastAlbumId,
      },
    }),
  });

export const updateWithFirstImage = async (
  albums: ApiAlbum[],
  access_token: string,
) => {
  const firstImages = new Map<number, SchemaImages>();

  albums.forEach((album) => {
    firstImages.set(album.id, album.images[0]);
  });

  return appendImagesWithFreshUrls(access_token, firstImages, albums);
};

export const appendImagesWithFreshUrls = async (
  access_token: string,
  firstImages: Map<number, SchemaImages>,
  albums: ApiAlbum[],
) => {
  const imagesWithUrls = await checkValidBaseUrl(
    access_token,
    Array.from(firstImages.values()),
  );

  const imagesMap = new Map<string, ApiImages>();

  for (const image of imagesWithUrls) {
    if (image.sorted_album_id) {
      imagesMap.set(image.sorted_album_id?.toString(), image);
    }
  }

  const albumsWithPhotoUrls = albums.map((album) => {
    const matchingImage = imagesMap.get(album.id.toString());

    return {
      ...album,
      images: matchingImage ? [matchingImage] : [],
    };
  });
  return albumsWithPhotoUrls;
};

export const createAlbum = async (
  userId: number,
  albumTitle: string,
): Promise<SchemaAlbum> => {
  const newAlbum = await prisma.album.create({
    data: {
      userId,
      title: albumTitle,
    },
  });

  return newAlbum;
};

export const getOrCreateCurrentAlbum = async (
  userId: number,
  image: SchemaImages,
) => {
  if (image.sorted_album_id) {
    const currentAlbum = await prisma.album.findUnique({
      where: {
        userId,
        id: image.sorted_album_id,
      },
    });
    if (currentAlbum) {
      return currentAlbum;
    }
  }

  // group under image_sets if belonging to a set
  const albumTitle = image.image_set_id
    ? `Set ${image.image_set_id}`
    : new Date(image.created_at).toDateString();

  const imageRelevantAlbum = await prisma.album.findUnique({
    where: {
      userId_title: {
        userId,
        title: albumTitle,
      },
    },
  });

  if (imageRelevantAlbum) {
    return imageRelevantAlbum;
  }

  const newAlbum = await createAlbum(userId, albumTitle);
  return newAlbum;
};

export const selectAlbum = async (
  userId: number,
  albumId: number,
): Promise<SchemaAlbum | null> =>
  await prisma.album.findUnique({
    where: {
      id: albumId,
      userId,
    },
  });

export const selectAlbumImages = async (
  userId: number,
  albumId: number,
): Promise<SchemaImages[]> =>
  await prisma.images.findMany({
    orderBy: [{ created_at: "asc" }],
    where: {
      sorted_album_id: albumId,
      userId,
      actually_deleted: null,
      mime_type: {
        not: "video/mp4",
      },
    },
  });
