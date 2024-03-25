import { Router } from "express";
import { AuthController } from "../controllers/auth.ts";

export const auth = (app: Router) => {
  app.get("/auth/google/callback", AuthController.handleGoogleLogin);
};
