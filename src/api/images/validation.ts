import { z } from "zod";
import { ImageType, SortOptions } from "@/api/images/types.js";
import { validateNumber } from "../utils/validation.js";

export const zImageType = z.object({
  type: z.nativeEnum(ImageType, {
    required_error: "Missing type param",
    invalid_type_error: "Invalid type param",
  }),
});

export const zImageId = z.object({
  id: validateNumber("Image ID"),
});

export const zImage = z.object({
  sorted_status: z
    .nativeEnum(SortOptions, { invalid_type_error: "Invalid sorted status" })
    .optional(),
});
