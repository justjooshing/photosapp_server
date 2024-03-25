import ky from "ky";
import { UserData } from "./types.ts";
import { prisma } from "../../../loaders/prisma.ts";
import { User } from "@prisma/client";

export const getUser = async (access_token: string) => {
  const client = ky.create({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const endpoint = "https://www.googleapis.com/oauth2/v1/userinfo";
  const data = await client.get(endpoint);
  const user = await data.json<UserData>();
  return user;
};

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

export const findUser = async (user: UserData) => {
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
