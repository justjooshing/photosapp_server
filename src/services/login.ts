import { google } from "googleapis";
import { CONFIG } from "../config/index.ts";

export const oauth2Client = new google.auth.OAuth2({
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
