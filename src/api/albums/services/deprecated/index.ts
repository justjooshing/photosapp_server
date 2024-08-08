import { prisma } from "@/loaders/prisma.js";
import { ApiAlbum } from "../types.js";
import { SortOptions } from "@/api/images/types.js";
import { Request } from "express";
import {
  ApiImages,
  SchemaAlbum,
  SchemaImages,
} from "@/api/images/services/types.js";
import { checkValidBaseUrl } from "@/api/images/services/images.js";
import { excludeMimeType } from "@/api/utils/index.js";

export const deprecated_findAlbums_12 = async (
  userId: number,
): Promise<ApiAlbum[]> => {
  const albums = await prisma.album.findMany({
    orderBy: {
      created_at: "desc",
    },
    where: {
      userId,
      images: {
        some: {
          NOT: {
            actually_deleted: {
              not: null,
            },
          },
        },
      },
    },
  });

  // Get counts sorted_statuses groupedBy albumId
  const counts = await prisma.images.groupBy({
    by: ["sorted_album_id", "sorted_status"],
    where: {
      sorted_album_id: {
        in: albums.map(({ id }) => id),
      },
      actually_deleted: null,
    },
    _count: {
      sorted_status: true,
    },
  });

  // Map each count to respective albums
  const albumCounts = new Map();
  counts.forEach(
    ({ _count: { sorted_status: count }, sorted_album_id, sorted_status }) => {
      if (!albumCounts.has(sorted_album_id)) {
        albumCounts.set(sorted_album_id, { keepCount: 0, deleteCount: 0 });
      }
      const albumCount = albumCounts.get(sorted_album_id);
      const type =
        sorted_status === SortOptions.KEEP ? "keepCount" : "deleteCount";
      albumCount[type] = count;
    },
  );

  return albums.map((album) => ({
    ...album,
    ...albumCounts.get(album.id),
  }));
};

export const deprecated_findAlbums_14 = async (
  userId: number,
  sorted_status: SortOptions,
  lastAlbumId?: number,
): Promise<ApiAlbum[]> => {
  const albums = await prisma.album.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 10,
    ...(lastAlbumId && {
      skip: 1,
      cursor: {
        id: lastAlbumId,
      },
    }),
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
                  ...excludeMimeType,
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
  });

  // Get counts sorted_statuses groupedBy albumId
  const counts = await prisma.images.groupBy({
    by: ["sorted_album_id", "sorted_status"],
    where: {
      sorted_album_id: {
        in: albums.map(({ id }) => id),
      },
      actually_deleted: null,
    },
    _count: {
      sorted_status: true,
    },
  });

  // Map each count to respective albums
  const albumCounts = new Map();
  counts.forEach(
    ({ _count: { sorted_status: count }, sorted_album_id, sorted_status }) => {
      if (!albumCounts.has(sorted_album_id)) {
        albumCounts.set(sorted_album_id, { keepCount: 0, deleteCount: 0 });
      }
      const albumCount = albumCounts.get(sorted_album_id);
      const type =
        sorted_status === SortOptions.KEEP ? "keepCount" : "deleteCount";
      albumCount[type] = count;
    },
  );

  return albums.map((album) => ({
    ...album,
    ...albumCounts.get(album.id),
  }));
};

export const deprecated_updateWithFirstImage_14 = async (
  albums: ApiAlbum[],
  req: Request,
) => {
  const firstImages = await findFirstImagesOfAlbums(albums);

  return firstImages.size
    ? await deprecated_appendImagesWithFreshUrls_14(
        req.locals.access_token,
        firstImages,
        albums,
      )
    : albums.map((album) => ({
        ...album,
        firstImage: undefined,
      }));
};

export const findFirstImagesOfAlbums = async (
  albums: SchemaAlbum[],
): Promise<Map<number, SchemaImages>> => {
  const images = await prisma.images.findMany({
    where: {
      sorted_album_id: {
        in: albums.map(({ id }) => id),
      },
      actually_deleted: null,
      ...excludeMimeType,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const firstImages = new Map<number, SchemaImages>();
  images.forEach((image) => {
    if (image.sorted_album_id) {
      // Set first image of album
      if (!firstImages.has(image.sorted_album_id)) {
        firstImages.set(image.sorted_album_id, image);
      } else if (
        // override with first _deleted_ image if necessary
        image.sorted_status === SortOptions.DELETE &&
        firstImages.get(image.sorted_album_id)?.sorted_status !==
          SortOptions.DELETE
      ) {
        firstImages.set(image.sorted_album_id, image);
      }
    }
  });
  return firstImages;
};

export interface ApiAlbumWithFirstImage extends ApiAlbum {
  firstImage: ApiImages | undefined;
}

export const deprecated_appendImagesWithFreshUrls_14 = async (
  access_token: string,
  firstImages: Map<number, SchemaImages>,
  albums: ApiAlbum[],
): Promise<ApiAlbumWithFirstImage[]> => {
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
      firstImage: matchingImage,
    };
  });
  return albumsWithPhotoUrls;
};
