import { Router } from "express";

import { getUserData } from "./user/middleware.js";
import { auth_protected, auth_unprotected } from "./auth/routes.js";
import { images } from "./images/routes.js";
import { albums } from "./albums/routes.js";
import { user } from "./user/routes.js";
import { checkJWT, refreshAuthToken } from "../middleware/token.js";
import { checkAppVersion } from "@/middleware/version.js";

export const routes = () => {
  const app = Router();
  auth_unprotected(app);

  app.use(checkJWT, refreshAuthToken, checkAppVersion, getUserData);
  auth_protected(app);
  images(app);
  albums(app);
  user(app);

  return app;
};
