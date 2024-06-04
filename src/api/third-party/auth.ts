import { CONFIG, oauth2Client } from "../../config/index.js";

export const generateAccessToken = async (code: string) => {
  const { tokens } = await oauth2Client.getToken({
    code,
    client_id: CONFIG.oauth2Credentials.client_id,
    redirect_uri: CONFIG.oauth2Credentials.redirect_uris[0],
  });
  oauth2Client.setCredentials(tokens);
  return tokens.access_token;
};
