import { Router } from "express";
import { UserController } from "@/controllers/user.ts";

const route = Router();
export const user = (app: Router) => {
  app.use("/user", route);
  route.get("/", UserController.getUser);
};
