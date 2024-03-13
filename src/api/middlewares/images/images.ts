import { Images } from "@prisma/client";
import { handleGetImages } from "../../../services/images/images.ts";
import { MediaItemResultsImages } from "../../../services/images/types.ts";

// Super annoying having to refetch the image urls again
type WithPhotoUrl = Images & { photoUrl: string };
export const addFreshBaseUrls = async (
  access_token: string,
  images: Images[]
): Promise<WithPhotoUrl[]> => {
  const mediaItemIds = new URLSearchParams();
  for (const image of images) {
    mediaItemIds.append("mediaItemIds", image.googleId);
  }

  // The image might not exist anymore, so potentially delete DB entry on specific error?
  const data = await handleGetImages<MediaItemResultsImages>({
    access_token,
    options: {
      method: ":batchGet",
      searchParams: mediaItemIds,
    },
  });

  const updatedImages = images.reduce(
    // Find existing image and add photoUrl id onto it
    (accImages: WithPhotoUrl[], currImage) => {
      const matchingImage = data.mediaItemResults.find((i) => {
        if ("mediaItem" in i) return i.mediaItem.id === currImage.googleId;
      });
      if (matchingImage && "mediaItem" in matchingImage) {
        accImages.push({
          ...currImage,
          photoUrl: matchingImage.mediaItem.baseUrl,
        });
      }
      return accImages;
    },
    []
  );

  return updatedImages;
};
