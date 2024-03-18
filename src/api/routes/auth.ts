import { Router } from "express";
import {
  handleGoogleAuthError,
  handleGoogleAuthCode,
} from "../middlewares/auth/auth.ts";

export const auth = (app: Router) => {
  app.get("/auth/google/callback", handleGoogleAuthError, handleGoogleAuthCode);
};
