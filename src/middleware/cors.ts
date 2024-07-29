import { CONFIG } from "../config/index.js";

type StaticOrigin =
  | boolean
  | string
  | RegExp
  | Array<boolean | string | RegExp>;
type CustomOrigin = {
  requestOrigin: string | undefined;
  callback: (err: Error | null, origin?: StaticOrigin) => void;
};

export const handleCorsOrigin = (
  origin: CustomOrigin["requestOrigin"],
  callback: CustomOrigin["callback"],
) => {
  if (!origin || CONFIG.whiteListUrls.indexOf(origin) !== -1) {
    return callback(null, true);
  }
  console.error({ origin });
  return callback(new Error("Not allowed by CORS"));
};
