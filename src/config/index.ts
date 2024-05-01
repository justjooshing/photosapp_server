import * as dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();

const baseURL = "https://photosappserver.fly.dev";
const clientUrl = "http://localhost:8081/";

export const CONFIG = {
  JWTsecret: process.env.JWT_SECRET as string,
  clientUrl,
  api: {
    base: baseURL,
    prefix: "/api",
  },
  oauth2Credentials: {
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    project_id: "PhotosApp",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
    redirect_uris: [`${baseURL}/auth/google/callback`],
    // https://developers.google.com/photos/library/reference/rest/v1/albums/create
    // https://developers.google.com/photos/library/reference/rest/v1/mediaItems
    // albums.create
    // albums.batchAddMediaItems
    scopes: [
      "https://www.googleapis.com/auth/photoslibrary",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
};

export const oauth2Client = new google.auth.OAuth2({
  clientId: CONFIG.oauth2Credentials.client_id,
  redirectUri: CONFIG.oauth2Credentials.redirect_uris[0],
  clientSecret: CONFIG.oauth2Credentials.client_secret,
});
