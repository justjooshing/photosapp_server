import { Router } from "express";
import { albums, count, images, login } from "./routes/index.ts";

export const routes = () => {
  const app = Router();
  images(app);
  login(app);
  albums(app);
  count(app);

  return app;
};
