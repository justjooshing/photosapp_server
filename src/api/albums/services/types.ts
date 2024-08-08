import { SchemaAlbum, SchemaImages } from "@/api/images/services/types.js";

export interface ApiAlbum extends SchemaAlbum {
  _count: { images: number };
  images: SchemaImages[];
}
