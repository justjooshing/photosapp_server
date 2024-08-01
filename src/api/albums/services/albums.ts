import { prisma } from "@/loaders/prisma.js";
import { checkValidBaseUrl } from "@/api/images/services/images.js";
import {
  ApiImages,
  SchemaAlbum,
  SchemaImages,
} from "@/api/images/services/types.js";
import { ApiAlbum, ApiAlbumWithFirstImage } from "./types.js";

export const findAlbums = async (
  userId: number,
  sorted_status: "keep" | "delete",
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
        sorted_status === "delete"
          ? {
              // If delete, some should be 'delete'
              some: {
                AND: {
                  sorted_status: "delete",
                  actually_deleted: null,
                },
              },
            }
          : {
              // Otherwise the album should contain some 'keep'
              // but none that are to be deleted but not actually deleted
              some: {
                sorted_status: "keep",
              },
              every: {
                NOT: {
                  AND: {
                    sorted_status: "delete",
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
      const type = sorted_status === "keep" ? "keepCount" : "deleteCount";
      albumCount[type] = count;
    },
  );

  return albums.map((album) => ({
    ...album,
    ...albumCounts.get(album.id),
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
      mime_type: {
        not: "video/mp4",
      },
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
        image.sorted_status === "delete" &&
        firstImages.get(image.sorted_album_id)?.sorted_status !== "delete"
      ) {
        firstImages.set(image.sorted_album_id, image);
      }
    }
  });
  return firstImages;
};

export const appendImagesWithFreshUrls = async (
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
    : new Date().toDateString();

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
