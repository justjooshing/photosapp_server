import { Router } from "express";
import { albums, count, images, login, user } from "./routes/index.js";
import { checkJWT } from "./middlewares/auth/index.js";
import { getUserData } from "./middlewares/user/index.js";

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
