import ky from "ky";
import { Images, MediaItemSearch } from "./types.ts";

const currentDate = new Date();
const searchParams: MediaItemSearch = {
  pageSize: 50,
  filters: {
    mediaTypeFilter: {
      mediaTypes: "PHOTO",
    },
    includeArchivedMedia: true,
    dateFilter: {
      dates: [
        {
          year: 0,
          day: currentDate.getDate(),
          month: currentDate.getMonth() + 1, // month starts from 0
        },
      ],
    },
  },
};

export const fetchPhotos = async (access_token: string) => {
  try {
    const client = ky.create({
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      json: searchParams,
    });
    const endpoint =
      "https://photoslibrary.googleapis.com/v1/mediaItems:search";

    const res = await client.post(endpoint);

    const images: Images = await res.json();

    if (!images.mediaItems?.length) {
      return [];
    }

    const urls = images.mediaItems.map(
      ({ baseUrl, id, mediaMetadata: { height, width } }) => ({
        source: baseUrl,
        id,
        height,
        width,
      })
    );

    return urls;
  } catch (err) {
    console.error("ERROR", err);
  }
};
