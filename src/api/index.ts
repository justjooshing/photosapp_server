import { Router } from "express";
import {
  albums,
  images,
  user,
  auth_unprotected,
  auth_protected,
} from "./routes/index.js";
import { checkJWT, refreshAuthToken } from "./middlewares/auth/index.js";
import { getUserData } from "./middlewares/user/index.js";

export const routes = () => {
  const app = Router();
  auth_unprotected(app);

  app.use(checkJWT, refreshAuthToken, getUserData);
  auth_protected(app);
  images(app);
  albums(app);
  user(app);

  return app;
};
