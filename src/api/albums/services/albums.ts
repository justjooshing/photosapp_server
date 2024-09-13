import { prisma } from "@/loaders/prisma.js";
import {
  ApiImages,
  SchemaAlbum,
  SchemaImages,
} from "@/api/images/services/types.js";
import { ApiAlbum } from "./types.js";
import { SortOptions } from "@/api/images/types.js";
import { excludeMimeType } from "@/api/utils/index.js";
import { checkValidBaseUrl } from "@/api/images/helpers.js";

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
                sorted_status: SortOptions.DELETE,
                actually_deleted: null,
                ...excludeMimeType,
              },
            }
          : {
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
    include: {
      images: {
        orderBy: {
          created_at: "desc",
        },
        where: {
          sorted_status,
          actually_deleted: null,
          ...excludeMimeType,
        },
        take: 1,
      },
      _count: {
        select: {
          images: {
            where: {
              sorted_status,
              actually_deleted: null,
              ...excludeMimeType,
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
  const firstImages = albums.map((album) => album.images[0]);
  const imagesWithUrls = await checkValidBaseUrl(access_token, firstImages);

  const imagesMap = new Map<number, ApiImages>();

  for (const image of imagesWithUrls) {
    if (image.sorted_album_id) {
      imagesMap.set(image.sorted_album_id, image);
    }
  }

  const albumsWithPhotoUrls = albums.map((album) => {
    const matchingImage = imagesMap.get(album.id);

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
): Promise<(SchemaAlbum & { images: SchemaImages[] }) | null> =>
  await prisma.album.findUnique({
    where: {
      id: albumId,
      userId,
    },
    include: {
      images: {
        orderBy: { created_at: "desc" },
        where: {
          sorted_album_id: albumId,
          userId,
          actually_deleted: null,
          ...excludeMimeType,
        },
      },
    },
  });
