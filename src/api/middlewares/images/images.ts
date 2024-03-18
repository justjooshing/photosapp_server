import { NextFunction, Request, Response } from "express";
import {
  baseBodyParams,
  getNewestImages,
  handleGetImages,
  initialImageLoad,
} from "../../../services/images/images.ts";
import {
  Filters,
  Images,
  MediaItemResultsImages,
} from "../../../services/images/types.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";
import { prisma } from "../../../loaders/prisma.ts";

export const getDayAndMonthImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { access_token } = req.locals;

    const currentDate = new Date();

    const filters: Filters = {
      dateFilter: {
        dates: [
          {
            year: 0,
            day: currentDate.getDate(),
            month: currentDate.getMonth() + 1, // month starts from 0
          },
        ],
      },
    };

    const data = await handleGetImages<Images>({
      access_token,
      options: {
        method: ":search",
        bodyParams: baseBodyParams({ filters }),
      },
    });

    req.locals.newImages = data.mediaItems;
    next();
  } catch (err) {
    console.error("ERROR", err);
    return [];
  }
};

export const shapeImagesResponse = (req: Request, res: Response) => {
  try {
    const { selectedImages } = req.locals;

    const imageUrls = selectedImages.map(({ photoUrl, id, height, width }) => ({
      source: photoUrl,
      id,
      height,
      width,
    }));

    res.json({ imageUrls });
  } catch (err) {
    console.log("get error", err);
    res.cookie("jwt", undefined).status(403).json(err);
  }
};

export const handleSortOrDeletePhotos = (req: Request, res: Response) => {
  // update to
  // - add to google photos folder
  // - update db to be deleted_at or sorted_at [date]
  try {
    if (!!req.body?.image) {
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
    next();
  } catch (err) {
    console.error("DB update error", err);
    updateImagesDB(req, res, next); //restart?
  }
};

export const fetchLatestImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentDate = new Date();

  const {
    access_token,
    appUser: { images_last_updated_at, id },
  } = req.locals;

  const updateLastUpdated = async () => {
    await prisma.user.update({
      where: {
        id,
      },
      data: {
        images_last_updated_at: new Date(),
      },
    });
  };

  try {
    if (!images_last_updated_at) {
      const newImages = await initialImageLoad(access_token);
      req.locals.newImages = newImages;
      console.log("initial images fetched");
      await updateLastUpdated();
    } else if (
      images_last_updated_at.toDateString() < currentDate.toDateString()
    ) {
      const newImages = await getNewestImages(
        access_token,
        images_last_updated_at
      );
      req.locals.newImages = newImages;
      console.log("newest images fetched");
      await updateLastUpdated();
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(400).send(err);
  }
};

const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) => {
  const sql = Prisma.sql`${sqlQuery}`;
  return await prisma.$queryRaw<SchemaType>(sql);
};

export const selectDayAndMonthImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    appUser: { id: userId },
  } = req.locals;

  // AND 'deleted_at' IS NULL
  // AND 'sorted_at' IS NULL
  const query = Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND EXTRACT(MONTH FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM "created_at") = EXTRACT(DAY FROM CURRENT_DATE)`;
  const data = await prismaRawSql<SchemaImages[]>(query);
  req.locals.selectedImages = data;
  next();
};

// Super annoying having to refetch the image urls again
export type WithPhotoUrl = SchemaImages & { photoUrl: string };

export const addFreshBaseUrls = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const { access_token, selectedImages: images } = req.locals;
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
    // Find existing image and add photoUrl id onto it
    (accImages: WithPhotoUrl[], currImage) => {
      const matchingImage = data.mediaItemResults.find((i) => {
        if ("mediaItem" in i) return i.mediaItem.id === currImage.googleId;
      });
      if (matchingImage && "mediaItem" in matchingImage) {
        accImages.push({
          ...currImage,
          photoUrl: matchingImage.mediaItem.baseUrl,
        });
      }
      return accImages;
    },
    []
  );

  // Updated with productUrl
  req.locals.selectedImages = updatedImages;
  next();
};
