import ky from "ky";
import { UserData } from "@/services/user/types.ts";

export const getGoogleUser = async (access_token: string) => {
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
