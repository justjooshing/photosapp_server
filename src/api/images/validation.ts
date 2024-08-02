import { z } from "zod";
import { SortOptions } from "@/api/images/types.js";

export const zImageId = z.object({
  id: z.coerce.number({
    invalid_type_error: "Image ID must be a valid number",
  }),
});

export const zImage = z.object({
  sorted_status: z
    .nativeEnum(SortOptions, { invalid_type_error: "Invalid sorted status" })
    .optional(),
  baseUrl: z.string().nullable().optional(),
});
