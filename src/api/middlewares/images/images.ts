import { NextFunction, Request, Response } from "express";
import {
  baseBodyParams,
  handleGetImages,
  loadImageSet,
} from "../../../services/images/images.ts";
import {
  Images,
  MediaItemResultsImages,
} from "../../../services/images/types.ts";
import { Prisma, Images as SchemaImages } from "@prisma/client";
import { prisma } from "../../../loaders/prisma.ts";
import { newestImagesFilter, todayFilter } from "../../helpers/filters.ts";

type imageType = "today" | "similar";
const filterType = (type: imageType = "today") =>
  ({
    today: todayFilter(),
    similar: todayFilter(),
  }[type]);

export const getDayAndMonthImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const type = req.query.type as imageType;
    const { access_token } = req.locals;
    console.log({ type });

    const filters = filterType(type);
    const data = await loadImageSet({
      access_token,
      bodyParams: baseBodyParams({ filters }),
    });

    req.locals.newImages = data;
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
        req.locals.newImages = newImages;
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

// AND 'deleted_at' IS NULL
// AND 'sorted_at' IS NULL

const todayQuery = (
  userId: number
) => Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId} 
AND EXTRACT(MONTH FROM "created_at") = EXTRACT(MONTH FROM CURRENT_DATE) 
AND EXTRACT(DAY FROM "created_at") = EXTRACT(DAY FROM CURRENT_DATE)`;

const similar = (userId: number) =>
  Prisma.sql`SELECT * FROM 'Images' WHERE 'userId' = ${userId}`;

const queryByType = (type: "today" | "similar", userId: number) =>
  ({
    today: todayQuery(userId),
    similar: similar(userId),
  }[type]);

export const selectDayAndMonthImages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    appUser: { id: userId },
  } = req.locals;

  const query = queryByType("today", userId);
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