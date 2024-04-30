import { Router } from "express";
import { AuthController } from "@/controllers/auth.js";

export const login = (app: Router) => {
  app.get("/login-link", AuthController.appLogin);
};
