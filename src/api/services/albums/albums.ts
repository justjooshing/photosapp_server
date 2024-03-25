import { Album, Images } from "@prisma/client";
import { prisma } from "../../../loaders/prisma.ts";
import { addFreshBaseUrls } from "../images/images.ts";

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

export const appendImagesWithFreshestUrls = async (
  access_token: string,
  firstImages: Map<number, Images>,
  albums: Album[]
) => {
  const imagesWithUrls = await addFreshBaseUrls(access_token, [
    ...firstImages.values(),
  ]);

  const albumsWithPhotoUrls = albums.map((album) => {
    const matchingImage = imagesWithUrls.find(
      ({ deleted_album_id }) => deleted_album_id === album.id
    );

    return {
      ...album,
      firstImage: matchingImage,
    };
  });
  return albumsWithPhotoUrls;
};
