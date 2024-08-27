import { Request } from "express";

export const getTokenFromHeader = (req: Request, headerName: string) => {
  const token = req.header(headerName);
  if (token) {
    const bearerToken = token?.split(" ");
    if (bearerToken[0] === "Token" || bearerToken[0] === "Bearer") {
      return bearerToken[1];
    }
    return token;
  }
  throw new Error(`No ${headerName} header`);
};
