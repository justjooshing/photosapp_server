import ky from "ky";
import { UserData } from "./types.ts";
import { prisma } from "../../loaders/prisma.ts";
import { User } from "@prisma/client";

const updateUsersDB = async ({ email, id, picture }: UserData) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    const newUser = await prisma.user.create({
      data: {
        googleId: id,
        email,
        googleProfilePicture: picture,
      },
    });
    return newUser;
  }
  return user;
};

export const getUserData = async (access_token: string): Promise<User> => {
  try {
    const client = ky.create({
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const endpoint = "https://www.googleapis.com/oauth2/v1/userinfo";
    const res = await client.get(endpoint);
    const user = await res.json<UserData>();
    return await updateUsersDB(user);
  } catch (err) {
    console.error("ERROR", err);
    throw err;
  }
};
