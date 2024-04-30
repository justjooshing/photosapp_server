import { Router } from "express";
import { CountController } from "@/controllers/count.js";

const route = Router();
export const count = (app: Router) => {
  app.use("/count", route);
  route.get("/", CountController.getSortCounts);
};
