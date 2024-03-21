import { NextFunction, Request, Response } from "express";
import {
  baseBodyParams,
  createAlbum,
  handleGetImages,
  loadImageSet,
} from "../../../services/images/images.ts";
import {
  Images,
  MediaItemResultsImages,
} from "../../../services/images/types.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";
import { prisma } from "../../../loaders/prisma.ts";
import { newestImagesFilter } from "../../helpers/filters.ts";
import { WithPhotoUrl } from "../../types.js";

export const shapeImagesResponse = ({
  baseUrl,
  productUrl,
  id,
  height,
  width,
  deleted_album_id,
}: WithPhotoUrl) => ({
  deleted_album_id,
  baseUrl,
  productUrl,
  id,
  height,
  width,
});

export const appendCurrentAlbum = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const {
    appUser: { id: userId },
  } = req.locals;

  const currentDate = new Date().toDateString();
  const albumTitle = `PhotosApp: ${currentDate}`;
  const existingAlbum = await prisma.album.findUnique({
    where: {
      title: albumTitle,
    },
  });

  if (existingAlbum) {
    req.locals.currentAlbum = existingAlbum;
  } else {
    const newAlbum = await createAlbum(userId, albumTitle);
    req.locals.currentAlbum = newAlbum;
  }
  next();
};

export const handleSortOrDeletePhotos = async (req: Request, res: Response) => {
  try {
    if (!!req.body?.image) {
      const { choice, image } = req.body;

      const decision = (() => {
        if (choice === "keep") {
          return { sorted_at: new Date() };
        } else if (choice === "delete") {
          return { deleted_at: new Date() };
        } else return undefined;
      })();

      if (!!decision) {
        const { currentAlbum } = req.locals;
        await prisma.images.update({
          where: {
            id: image.id,
          },
          data: {
            ...decision,
            deleted_album_id: currentAlbum.id,
          },
        });
      }
      res.status(201).json({});
    } else res.status(400).send(new Error("Missing image information"));
  } catch (err) {
    console.log("post err", err);
    res.cookie("jwt", undefined).status(403).json(err);
  }
};

export const updateImagesDB = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

  const {
    appUser: { id: userId },
    newImages: images,
  } = req.locals;

  try {
    const newImages = await identifyNewImages(userId, images);
    if (!!newImages.length) {
      await prisma.images.createMany({
        data: newImages.map((image) => ({
          googleId: image.id,
          userId,
          created_at: image.mediaMetadata.creationTime,
          width: Number(image.mediaMetadata.width),
          height: Number(image.mediaMetadata.height),
        })),
      });
      console.log("db updated");
    }
    // Update last updated
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        images_last_updated_at: new Date(),
      },
    });

    next();
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(req, res, next); //restart?
  }
};

/**
 * fetches either all the images if a new user
 * or latest from last_updated_at date
 */
export const fetchLatestImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentDate = new Date();

  const {
    access_token,
    appUser: { images_last_updated_at },
  } = req.locals;
  try {
    const bodyParams = (() => {
      if (!images_last_updated_at) {
        return {};
      } else if (
        images_last_updated_at.toDateString() < currentDate.toDateString()
      ) {
        const lastUpdated = new Date(images_last_updated_at);

        return baseBodyParams({
          filters: newestImagesFilter(lastUpdated),
        });
      }
      return undefined;
    })();

    if (!!bodyParams) {
      try {
        const newImages = await loadImageSet({ access_token, bodyParams });
        const currentNewImages = req.locals.newImages || [];
        req.locals.newImages = [...currentNewImages, ...newImages];

        console.log(
          `${!!bodyParams.filters ? "new" : "initial"} images fetched`
        );
      } catch (err) {
        console.error(`${!!bodyParams.filters ? "new" : "initial"} load`, err);
        throw err;
      }
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(400).send(err);
  }
};

const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) =>
  await prisma.$queryRaw<SchemaType>(sqlQuery);

const todayQuery = (
  userId: number
) => Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId} 
AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE)
AND deleted_at IS NULL
AND sorted_at IS NULL
LIMIT 5`;

const similar = (userId: number) =>
  Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND deleted_at IS NULL
  AND sorted_at IS NULL
  LIMIT 5`;

const queryByType = (type: "today" | "similar", userId: number) =>
  ({
    today: todayQuery(userId),
    similar: similar(userId),
  }[type]);

export const selectImagesByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    access_token,
    appUser: { id: userId },
  } = req.locals;

  type imageType = "today" | "similar";
  const type = req.query.type as imageType;

  const query = queryByType(type, userId);
  const images = await prismaRawSql<SchemaImages[]>(query);
  const withUrls = await addFreshBaseUrls(access_token, images);
  req.locals.selectedImages = withUrls;
  next();
};

// Super annoying having to refetch the image urls again
export const addFreshBaseUrls = async (
  access_token: string,
  images: SchemaImages[]
) => {
  console.log("adding fresh baseURLs");
  try {
    if (!!images.length) {
      const mediaItemIds = new URLSearchParams();
      for (const image of images) {
        mediaItemIds.append("mediaItemIds", image.googleId);
      }
      // The image might not exist anymore, so potentially delete DB entry on specific error?
      const data = await handleGetImages<MediaItemResultsImages>({
        access_token,
        options: {
          method: ":batchGet",
          searchParams: mediaItemIds,
        },
      });

      const updatedImages = images.reduce(
        // Find existing image and add baseUrl id onto it
        (accImages: WithPhotoUrl[], currImage) => {
          const matchingImage = data.mediaItemResults.find((i) => {
            if ("mediaItem" in i) return i.mediaItem.id === currImage.googleId;
          });
          if (matchingImage && "mediaItem" in matchingImage) {
            accImages.push({
              ...currImage,
              baseUrl: matchingImage.mediaItem.baseUrl,
              productUrl: matchingImage.mediaItem.productUrl,
            });
          }
          return accImages;
        },
        []
      );
      const shapedImages = updatedImages.map(shapeImagesResponse);
      // Updated with productUrl
      return shapedImages;
    } else {
      return [];
    }
  } catch (err) {
    console.error(err);
    return [];
  }
};
