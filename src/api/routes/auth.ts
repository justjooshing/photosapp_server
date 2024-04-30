import { Router } from "express";
import { AuthController } from "@/controllers/auth.js";

export const auth = (app: Router) => {
  app.get("/auth/google/callback", AuthController.handleGoogleLogin);
};
