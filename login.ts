// https://dev.to/aidanlovelace/how-to-setup-google-oauth2-login-with-express-2d30
import { google } from "googleapis";
import { CONFIG } from "./src/config/index.ts";

// Google's OAuth2 client
const OAuth2 = google.auth.OAuth2;

export const oauth2Client = new OAuth2({
  clientId: CONFIG.oauth2Credentials.client_id,
  redirectUri: CONFIG.oauth2Credentials.redirect_uris[0],
  clientSecret: CONFIG.oauth2Credentials.client_secret,
});

export const getLoginLink = () => {
  const loginLink = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CONFIG.oauth2Credentials.scopes,
    login_hint: "consent",
  });

  return loginLink;
};
