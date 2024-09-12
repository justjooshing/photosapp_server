import { ErrorRequestHandler } from "express";
import { isHttpError } from "http-errors";
import { ZodError } from "zod";

/**
 *  "next" param is unused but needed for express to know its handling errors
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error({ status: err.status }, err);
  if (err instanceof ZodError) {
    return res.status(400).end();
  }
  if (isHttpError(err)) {
    const { status, redirectUrl } = err;

    return redirectUrl
      ? res.status(status).redirect(redirectUrl)
      : res.status(status).end();
  }
  // Gaxios error
  if (err.response?.status) {
    return res.status(err.response.status).end();
  }
  return res.status(500).end();
};
