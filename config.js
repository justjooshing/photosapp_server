import * as dotenv from "dotenv";
dotenv.config();

const port = 8080;
const baseURL = `http://localhost:${port}`;
export const CONFIG = {
  // The secret for the encryption of the jsonwebtoken
  JWTsecret: process.env.JWT_SECRET,
  baseURL: baseURL,
  port: port,
  // The credentials and information for OAuth2
  oauth2Credentials: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    project_id: "PhotosApp", // The name of your project
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: [`${baseURL}/auth/google/callback`],
    // https://developers.google.com/photos/library/reference/rest/v1/albums/create
    // albums.create
    // albums.batchAddMediaItems
    scopes: ["https://www.googleapis.com/auth/photoslibrary"],
  },
};
