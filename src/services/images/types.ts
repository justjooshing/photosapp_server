interface CameraDetails {
  cameraMake: string;
  cameraModel: string;
}

interface Video extends CameraDetails {
  fps: number;
  status: string;
}

interface Photo extends CameraDetails {
  focalLength: number;
  apertureFNumber: number;
  isoEquivalent: number;
  exposureTime: string;
}

interface MediaItems {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: "video/mp4" | "image/jpeg" | string;
  mediaMetadata: (
    | { video: Video; photo: never }
    | { photo: Photo; video: never }
  ) & {
    creationTime: Date;
    width: string;
    height: string;
  };
}

export type Images = { mediaItems: MediaItems[] };
