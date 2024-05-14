import { Router } from "express";
import { AuthController } from "@/controllers/auth.js";

const route = Router();

export const auth_unprotected = (app: Router) => {
  app.use("/auth", route);

  route.get("/google/callback", AuthController.handleGoogleLogin);
  route.get("/login-link", AuthController.appLogin);
};

export const auth_protected = (app: Router) => {
  app.use("/auth", route);

  route.delete("/login-link", AuthController.appLogout);
};
