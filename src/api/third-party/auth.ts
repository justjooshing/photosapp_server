import { CONFIG, oauth2Client } from "../../config/index.ts";

export const generateAccessToken = async (code: string) => {
  const token = await oauth2Client.getToken({
    code,
    client_id: CONFIG.oauth2Credentials.client_id,
    redirect_uri: CONFIG.oauth2Credentials.redirect_uris[0],
  });
  return token.tokens.access_token;
};
