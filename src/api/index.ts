import { Router } from "express";
import { albums, count, images, login } from "./routes/index.ts";
import { checkJWT } from "./middlewares/auth/index.ts";
import { getUserData } from "./middlewares/user/index.ts";

export const routes = () => {
  const app = Router();
  app.use(checkJWT, getUserData);

  images(app);
  login(app);
  albums(app);
  count(app);

  return app;
};
