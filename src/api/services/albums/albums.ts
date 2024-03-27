import { Album, Images } from "@prisma/client";
import { prisma } from "../../../loaders/prisma.ts";
import { addFreshBaseUrls } from "../images/images.ts";
import { SchemaAlbum } from "../images/types.ts";

export const findAlbums = async (userId: number) =>
  await prisma.album.findMany({
    where: {
      userId,
    },
  });

export const findFirstImagesOfAlbums = async (albums: Album[]) => {
  const firstImages = new Map<number, Images>();

  for (const album of albums) {
    const firstImage = await prisma.images.findFirst({
      where: {
        deleted_album_id: album.id,
      },
    });

    if (firstImage) {
      firstImages.set(album.id, firstImage);
    }
  }
  return firstImages;
};

export const appendImagesWithFreshUrls = async (
  access_token: string,
  firstImages: Map<number, Images>,
  albums: Album[],
) => {
  const imagesWithUrls = await addFreshBaseUrls(access_token, [
    ...firstImages.values(),
  ]);

  const albumsWithPhotoUrls = albums.map((album) => {
    const matchingImage = imagesWithUrls.find(
      ({ deleted_album_id }) => deleted_album_id === album.id,
    );

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

export const getOrCreateCurrentAlbum = async (userId: number) => {
  const currentDate = new Date().toDateString();
  const albumTitle = `PhotosApp: ${currentDate}`;
  const existingAlbum = await prisma.album.findUnique({
    where: {
      title: albumTitle,
      userId,
    },
  });

  if (existingAlbum) {
    return existingAlbum;
  } else {
    const newAlbum = await createAlbum(userId, albumTitle);
    return newAlbum;
  }
};

export const selectAlbum = async (userId: number, albumId: number) =>
  await prisma.album.findUnique({
    where: {
      id: albumId,
      userId,
    },
  });

export const selectAlbumImages = async (userId: number, albumId: number) =>
  await prisma.images.findMany({
    where: {
      deleted_album_id: albumId,
      userId,
    },
  });
