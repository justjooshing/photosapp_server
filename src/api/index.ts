import { Router } from "express";
import { images, auth, login } from "./routes/index.ts";

export const routes = () => {
  const app = Router();
  images(app);
  login(app);

  return app;
};
