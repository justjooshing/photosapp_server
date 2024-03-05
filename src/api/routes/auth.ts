import { Router } from "express";
import { oauth2Client } from "../../services/login.ts";
import jwt from "jsonwebtoken";
import { CONFIG } from "../../config/index.ts";

// Move to config
const clientUrl = "http://localhost:8081/";

export const auth = (app: Router) => {
  // https://blog.bitsrc.io/step-by-step-guide-to-implementing-oauth2-in-a-node-js-application-89c7e8d202bd
  app.get("/auth/google/callback", async (req, res) => {
    if (req.query.error) {
      res.redirect(clientUrl);
    } else {
      if (typeof req.query.code === "string") {
        try {
          const token = await oauth2Client.getToken({
            code: req.query.code,
            client_id: CONFIG.oauth2Credentials.client_id,
            redirect_uri: CONFIG.oauth2Credentials.redirect_uris[0],
          });
          const { access_token } = token.tokens;
          if (access_token) {
            res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret));
            res.redirect(clientUrl);
          }
        } catch (err) {
          // Maybe redirect to error page
          return res.redirect(clientUrl);
        }
      }
    }
  });
};
