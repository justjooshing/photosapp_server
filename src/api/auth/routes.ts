import { Router } from "express";
import { AuthController } from "./controller.js";

export const auth_unprotected = (app: Router) => {
  const unprotectedRoute = Router();

  unprotectedRoute.get("/google/callback", AuthController.handleGoogleLogin);
  unprotectedRoute.get("/login-link", AuthController.appLogin);

  app.use("/auth", unprotectedRoute);
};

export const auth_protected = (app: Router) => {
  const protectedRoute = Router();

  protectedRoute.delete("/login-link", AuthController.appLogout);

  app.use("/auth", protectedRoute);
};
