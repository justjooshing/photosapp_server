import { ApiImages, SchemaAlbum } from "../../images/services/types.js";

export interface ApiAlbum extends SchemaAlbum {
  keepCount: number;
  deleteCount: number;
}

export interface ApiAlbumWithFirstImage extends ApiAlbum {
  firstImage: ApiImages | undefined;
}
