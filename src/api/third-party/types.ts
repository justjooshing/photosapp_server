// https://developers.google.com/photos/library/reference/rest/v1/mediaItems
interface CameraDetails {
  cameraMake: string;
  cameraModel: string;
}

interface Video extends CameraDetails {
  fps: number;
  status: "UNSPECIFIED" | "PROCESSING" | "READY" | "FAILED";
}

export interface Photo extends CameraDetails {
  focalLength: number;
  apertureFNumber: number;
  isoEquivalent: number;
  exposureTime: string; //time ending in s
}

interface MediaItems<T> {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: "video/mp4" | "image/jpeg" | string;
  mediaMetadata: T & {
    creationTime: string; // Timestamp
    width: string;
    height: string;
  };
}

export type Images = { mediaItems: MediaItems<Photo>[]; nextPageToken: string };
export type Videos = { mediaItems: MediaItems<Video>[]; nextPageToken: string };

export interface MediaItem<T> extends MediaItems<T> {
  contributorInfo: {
    profilePictureBaseUrl: string;
    displayName: string;
  };
  filename: string;
}
interface Status {
  code: number;
  message: string;
  details: {
    "@type": string;
    [key: string]: string;
  }[];
}
export type MediaItemResultsImages = {
  mediaItemResults: ({ mediaItem: MediaItem<Photo> } | Status)[];
};

export type MediaItemResultsVideo = {
  mediaItemResults: (MediaItem<Video> | Status)[];
};

/************************
 SEARCH OPTIONS
 ************************/
// https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search
interface Date {
  // include all but set unimportant props to 0
  year: number;
  month: number;
  day: number;
}
type DateFilter = Partial<{
  // Max 5 Dates and/or Ranges
  dates: Date[];
  ranges: {
    startDate: Date;
    endDate: Date;
  }[];
}>;

type ContentCategories =
  | "NONE"
  | "LANDSCAPE"
  | "RECEIPTS"
  | "CITYSCAPES"
  | "LANDMARKS"
  | "SELFIES"
  | "PEOPLE"
  | "PETS"
  | "WEDDINGS"
  | "BIRTHDAYS"
  | "DOCUMENTS"
  | "TRAVEL"
  | "ANIMALS"
  | "FOOD"
  | "SPORT"
  | "NIGHT"
  | "PERFORMANCES"
  | "WHITEBOARDS"
  | "SCREENSHOTS"
  | "UTILITY"
  | "ARTS"
  | "CRAFTS"
  | "FASHION"
  | "HOUSES"
  | "GARDENS"
  | "FLOWERS"
  | "HOLIDAYS";

type ContentFilter = Partial<{
  includedContentCategories: ContentCategories[];
  excludedContentCategories: ContentCategories[];
}>;

type MediaTypes = "ALL_MEDIA" | "PHOTO" | "VIDEO";
interface MediaTypeFilter {
  mediaTypes: MediaTypes;
}
interface FeatureFilter {
  includedFeatures: "NONE" | "FAVORITES";
}
export type Filters = Partial<{
  dateFilter: DateFilter;
  contentFilter: ContentFilter;
  mediaTypeFilter: MediaTypeFilter;
  featureFilter: FeatureFilter;
  includeArchivedMedia: boolean;
  excludeNonAppCreatedData: boolean;
}>;

export type MediaItemSearch = Partial<{
  albumId: string;
  pageSize: number;
  pageToken: string;
  filters: Filters;
  orderBy: string;
}>;
