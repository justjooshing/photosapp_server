import { z } from "zod";
import { SortOptions } from "@/api/images/types.js";
import { SkipOptions } from "./types.js";
import { validateNumber } from "../utils/validation.js";

export const zAlbumParams = z.object({
  sorted_status: z.nativeEnum(SortOptions, {
    invalid_type_error: "Invalid sorted_status",
    required_error: "Missing sorted_status",
  }),
  lastAlbumId: validateNumber("Album ID").optional(),
});

export const zSingleAlbumId = z.object({
  albumId: validateNumber("Album ID"),
});

export const zSkipAlbum = z.object({
  skip_reason: z.nativeEnum(SkipOptions, {
    invalid_type_error: "Invalid skip reason",
    required_error: "Missing skip reason",
  }),
  first_image_id: validateNumber("Image ID"),
});
