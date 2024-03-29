import { Request } from "express";

export const getTokenFromHeader = (req: Request) => {
  const auth = req.header("authorization");
  if (auth) {
    const bearerToken = auth?.split(" ");
    if (bearerToken[0] === "Token" || bearerToken[0] === "Bearer") {
      return bearerToken[1];
    }
  }
  throw new Error("No token");
};
