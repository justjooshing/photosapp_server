import { Router } from "express";
import { UserController } from "./contoller.js";

export const user = (app: Router) => {
  const route = Router();

  route.get("/", UserController.getUser);
  route.delete("/", UserController.deleteUser);

  app.use("/user", route);
};
