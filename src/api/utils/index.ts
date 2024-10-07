export const bigIntToString = (val: bigint | null) => {
  return val?.toString() || "0";
};

export const splitDateString_DateOnly = (date: Date) =>
  date.toISOString().split("T")[0];

export const excludeMimeType = {
  AND: [
    { mime_type: { not: null } },
    {
      mime_type: {
        not: "video/mp4",
      },
    },
  ],
};
