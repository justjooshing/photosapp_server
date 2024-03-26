import { Router } from "express";
import { albums, count, images, login, user } from "./routes/index.ts";
import { checkJWT } from "./middlewares/auth/index.ts";
import { getUserData } from "./middlewares/user/index.ts";

export const routes = () => {
  const app = Router();
  login(app);

  app.use(checkJWT, getUserData);
  images(app);
  albums(app);
  count(app);
  user(app);

  return app;
};
