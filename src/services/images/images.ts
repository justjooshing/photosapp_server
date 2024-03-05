import { Images } from "./types.ts";

export const fetchPhotos = async (access_token: string) => {
  try {
    const params = new URLSearchParams();
    params.append("pageSize", "3");
    const res = await fetch(
      "https://photoslibrary.googleapis.com/v1/mediaItems",
      {
        method: "get",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const images: Images = await res.json();
    const urls = images.mediaItems.map(({ baseUrl, id }) => ({
      source: baseUrl,
      id,
    }));
    return urls;
  } catch (err) {
    console.log("ERROR");
    console.error(err);
  }
};
