import { Router } from "express";
import { getLoginLink } from "../../../login.ts";

export const login = (app: Router) => {
  app.get("/login-link", (_, res) => {
    const loginLink = getLoginLink();
    res.json({ loginLink });
  });
};
