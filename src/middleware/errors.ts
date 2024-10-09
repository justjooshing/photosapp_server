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
    res.status(400).end();
    return;
  }
  if (isHttpError(err)) {
    const { status, redirectUrl } = err;

    redirectUrl
      ? res.status(status).redirect(redirectUrl)
      : res.status(status).end();
    return;
  }
  // Gaxios error
  if (err.response?.status) {
    res.status(err.response.status).end();
    return;
  }
  res.status(500).end();
  return;
};
