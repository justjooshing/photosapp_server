import { z } from "zod";

export const validateNumber = (numberTarget: string) => {
  const errMessage = `${numberTarget} is not a number`;
  return z.coerce
    .number({ invalid_type_error: errMessage })
    .positive(errMessage);
};
