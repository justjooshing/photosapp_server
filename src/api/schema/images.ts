import { z } from "zod";

export const zImageId = z.object({
  id: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Image ID must be a valid number",
  }),
});

export const zImage = z.object({
  sorted_status: z
    .string()
    .refine((val) => val === "keep" || val === "delete", {
      message: "Invalid sorted status",
    })
    .optional(),
  baseUrl: z.string().nullable().optional(),
});
