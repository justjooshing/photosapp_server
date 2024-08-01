import { z } from "zod";

export const zAlbumParams = z.object({
  sorted_status: z
    .string()
    .refine((val) => val === "keep" || val === "delete", {
      message: "Invalid sorted_status",
    }),
  lastAlbumId: z
    .string()
    .refine((val) => Number(val), {
      message: "Invalid album id",
    })
    .optional(),
});
