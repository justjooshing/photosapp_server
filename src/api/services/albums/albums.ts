import { prisma } from "../../../loaders/prisma.js";
import { checkValidBaseUrl } from "@/services/images/images.js";
import {
  ApiImages,
  SchemaAlbum,
  SchemaImages,
} from "@/services/images/types.js";
import { Prisma } from "@prisma/client";
import { ApiAlbum, ApiAlbumWithFirstImage } from "./types.js";

export const findAlbums = async (userId: number): Promise<ApiAlbum[]> => {
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

  const getCounts = async () => {
    const withCounts: ApiAlbum[] = [];
    for (const album of albums) {
      const keepCount = await prisma.images.count({
        where: {
          sorted_album_id: album.id,
          actually_deleted: null,
          sorted_status: "keep",
        },
      });
      const deleteCount = await prisma.images.count({
        where: {
          sorted_album_id: album.id,
          actually_deleted: null,
          sorted_status: "delete",
        },
      });
      withCounts.push({ ...album, keepCount, deleteCount });
    }
    return withCounts;
  };

  const albumWithCounts = await getCounts();
  return albumWithCounts;
};

export const findFirstImagesOfAlbums = async (
  albums: SchemaAlbum[],
): Promise<Map<number, SchemaImages>> => {
  const firstImages = new Map<number, SchemaImages>();

  for (const album of albums) {
    const firstImageProps = ({
      sorted_status,
    }: {
      sorted_status: SchemaImages["sorted_status"];
    }): Prisma.imagesFindFirstArgs => ({
      orderBy: [{ created_at: "asc" }],
      where: {
        sorted_status,
        sorted_album_id: album.id,
        actually_deleted: null,
        mime_type: {
          not: "video/mp4",
        },
      },
    });

    const firstDeletedImage = await prisma.images.findFirst(
      firstImageProps({ sorted_status: "delete" }),
    );
    if (firstDeletedImage) {
      firstImages.set(album.id, firstDeletedImage);
    } else {
      const firstImage = await prisma.images.findFirst(
        firstImageProps({ sorted_status: "keep" }),
      );
      if (firstImage) {
        firstImages.set(album.id, firstImage);
      }
    }
  }
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
