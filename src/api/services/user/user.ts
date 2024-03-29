import { UserData } from "./types.ts";
import { prisma } from "../../../loaders/prisma.ts";
import { User } from "@prisma/client";
import { SchemaUser } from "../images/types.ts";

const createNewUser = async ({ email, id, picture }: UserData) => {
  const newUser = await prisma.user.create({
    data: {
      googleId: id,
      email,
      googleProfilePicture: picture,
    },
  });
  console.log("database updated");
  return newUser;
};

export const findUser = async (user: UserData): Promise<SchemaUser | null> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: user.email,
    },
  });
  return existingUser;
};

export const findOrCreateUser = async (user: UserData): Promise<User> => {
  let appUser;
  appUser = await findUser(user);
  if (!appUser) {
    appUser = await createNewUser(user);
  }
  return appUser;
};

export const updateUserLastUpdate = async (userId: number) => {
  // Update last updated
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      images_last_updated_at: new Date(),
    },
  });
};
