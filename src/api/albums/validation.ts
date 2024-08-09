import { z } from "zod";
import { SortOptions } from "@/api/images/types.js";

export const zAlbumParams = z.object({
  sorted_status: z.nativeEnum(SortOptions, {
    invalid_type_error: "Invalid sorted_status",
    required_error: "Missing sorted_status",
  }),
  lastAlbumId: z.coerce
    .number({ invalid_type_error: "Invalid album id" })
    .optional(),
});

export const zSingleAlbumId = z.object({
  albumId: z.coerce.number({ invalid_type_error: "Album ID is not a number" }),
});
