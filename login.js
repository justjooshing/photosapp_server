// https://dev.to/aidanlovelace/how-to-setup-google-oauth2-login-with-express-2d30
import { google } from "googleapis";
// import jwt from "jsonwebtoken";

// Google's OAuth2 client
const OAuth2 = google.auth.OAuth2;
// Including our config file
import { CONFIG } from "./config.js";

export const getLoginLink = () => {
  const oauth2Client = new OAuth2({
    clientId: CONFIG.oauth2Credentials.client_id,
    redirectUri: CONFIG.oauth2Credentials.redirect_uris[0],
  });

  const loginLink = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CONFIG.oauth2Credentials.scopes,
    login_hint: "consent",
  });

  return loginLink;
};
