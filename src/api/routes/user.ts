import { Router } from "express";
import { UserController } from "@/controllers/user.js";

const route = Router();
export const user = (app: Router) => {
  app.use("/user", route);
  route.get("/", UserController.getUser);
};
