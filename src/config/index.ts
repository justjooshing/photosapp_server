import * as dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();

const port = 8080;
const baseURL = process.env.SERVER_URI;

const whiteListUrls = [
  "com.justjooshing.photosapp://expo-development-client",
  "http://localhost:8081",
  "192.168.1.*",
  "https://www.picpurge.app",
];

export const CONFIG = {
  JWTsecret: process.env.JWT_SECRET as string,
  whiteListUrls,
  redirect_uri: process.env.REDIRECT_URI as string,
  api: {
    base: baseURL,
    prefix: "/api",
  },
  port,
  oauth2Credentials: {
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    project_id: "PicPurge",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
    redirect_uris: [`${baseURL}/api/auth/google/callback`],
    // https://developers.google.com/photos/library/reference/rest/v1/mediaItems
    scopes: [
      "https://www.googleapis.com/auth/photoslibrary.readonly",
      "https://www.googleapis.com/auth/photoslibrary.readonly.originals",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
};

export const oauth2Config = {
  clientId: CONFIG.oauth2Credentials.client_id,
  redirectUri: CONFIG.oauth2Credentials.redirect_uris[0],
  clientSecret: CONFIG.oauth2Credentials.client_secret,
  project_id: CONFIG.oauth2Credentials.project_id,
};

export const oauth2Client = new google.auth.OAuth2(oauth2Config);
