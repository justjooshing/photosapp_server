import ky from "ky";
import {
  Filters,
  HandleGetImages,
  Images,
  MediaItemResultsImages,
  MediaItemSearch,
} from "./types.ts";

const endpoint = "https://photoslibrary.googleapis.com/v1/mediaItems";

export const baseBodyParams = (options?: MediaItemSearch): MediaItemSearch => ({
  pageSize: 100,
  filters: {
    mediaTypeFilter: {
      mediaTypes: "PHOTO",
    },
    includeArchivedMedia: true,
  },
  ...options,
});

export const handleGetImages = async <
  ImageResponseType = MediaItemResultsImages | Images
>({
  access_token,
  options,
}: HandleGetImages): Promise<ImageResponseType> => {
  const client = ky.create({
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  let method: "get" | "post" = options.method === ":search" ? "post" : "get";

  const res = await client[method](`${endpoint}${options.method}`, {
    ...(options.method === ":search" && { json: options.bodyParams }),
    ...(options.method === ":batchGet" && {
      searchParams: options.searchParams,
    }),
  });
  return await res.json<ImageResponseType>();
};

export const initialImageLoad = async (access_token: string) => {
  let images: Images["mediaItems"] = [];
  try {
    const fetchAllImages = async (pageToken?: string) => {
      const bodyParams = baseBodyParams({
        ...(pageToken && {
          pageToken,
        }),
      });

      const data = await handleGetImages<Images>({
        access_token,
        options: {
          method: ":search",
          bodyParams,
        },
      });

      images.push(...data.mediaItems);

      if (data.nextPageToken) {
        console.count("fetching next page");
        await fetchAllImages(data.nextPageToken);
      } else {
        console.log("no more pages");
        return;
      }
    };
    await fetchAllImages();
    return images;
  } catch (err) {
    console.error("INITIAL LOAD", err);
    throw err;
  }
};

// need to loop this for each of the next pages too
export const getNewestImages = async (
  access_token: string,
  images_last_updated_at: Date
) => {
  const currentDate = new Date();
  try {
    const lastUpdated = new Date(images_last_updated_at);
    const filters: Filters = {
      dateFilter: {
        ranges: [
          {
            endDate: {
              day: currentDate.getDate(),
              month: currentDate.getMonth() + 1, // month starts from 0
              year: currentDate.getFullYear(),
            },
            startDate: {
              day: lastUpdated.getDate(),
              month: lastUpdated.getMonth() + 1,
              year: lastUpdated.getFullYear(),
            },
          },
        ],
      },
    };

    const bodyParams = baseBodyParams({ filters });
    const data = await handleGetImages<Images>({
      access_token,
      options: {
        method: ":search",
        bodyParams,
      },
    });
    return data.mediaItems;
  } catch (err) {
    console.error("NEWEST IMAGES", err);
    throw err;
  }
};
