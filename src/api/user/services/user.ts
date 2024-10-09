import { UserData } from "./types.js";
import { prisma } from "@/loaders/prisma.js";
import { SchemaUser } from "@/api/images/services/types.js";

const createNewUser = async ({ email, id, picture }: UserData) => {
  const newUser = await prisma.user.create({
    data: {
      googleId: id,
      email,
      googleProfilePicture: picture,
      images_last_updated_at: new Date(),
    },
  });
  console.info("new user created");
  return newUser;
};

export const findUser = async (
  email: UserData["email"],
): Promise<SchemaUser | null> =>
  prisma.user.findUnique({
    where: {
      email,
    },
  });

export const findOrCreateUser = async (user: UserData): Promise<SchemaUser> => {
  let appUser;
  appUser = await findUser(user.email);
  if (!appUser) {
    appUser = await createNewUser(user);
  }
  return appUser;
};

export const updateUserLastUpdate = async (userId: number) =>
  // Update last updated
  prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      images_last_updated_at: new Date(),
    },
  });

export const getAllImagesLastUpdated = async (userId: number) =>
  prisma.user
    .findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        all_images_last_updated_at: true,
      },
    })
    .then(({ all_images_last_updated_at }) => all_images_last_updated_at);

export const updateAllImagesLastUpdated = async (userId: number) =>
  prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      all_images_last_updated_at: new Date(),
    },
  });
