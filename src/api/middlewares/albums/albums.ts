import { Request, Response } from "express";
import { prisma } from "../../../loaders/prisma.ts";
import { addFreshBaseUrls } from "../images/images.ts";
import { Album, Images } from "@prisma/client";

const findAlbums = async (userId: number) =>
  await prisma.album.findMany({
    where: {
      userId,
    },
  });

const findFirstImage = async (albums: Album[]) => {
  const firstImages = [];

  for (const album of albums) {
    const firstImage = await prisma.images.findFirst({
      where: {
        deleted_album_id: album.id,
      },
    });

    if (firstImage) {
      firstImages.push(firstImage);
    }
  }
  return firstImages;
};

const appendImagesWithFreshestUrls = async (
  access_token: string,
  firstImages: Images[],
  albums: Album[]
) => {
  const imagesWithUrls = await addFreshBaseUrls(access_token, firstImages);

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

export const returnAlbumsWithFirstImages = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      access_token,
      appUser: { id: userId },
    } = req.locals;

    const albums = await findAlbums(userId);

    if (!albums.length) {
      throw new Error("No albums");
    }

    const firstImages = await findFirstImage(albums);

    if (!!firstImages.length) {
      const data = appendImagesWithFreshestUrls(
        access_token,
        firstImages,
        albums
      );

      res.json({ albums: data });
    } else {
      res.json({
        albums: {
          ...albums,
          firstImage: undefined,
        },
      });
    }
  } catch (err) {
    console.error("returning albums", err);
    res.status(400).send(err);
  }
};
