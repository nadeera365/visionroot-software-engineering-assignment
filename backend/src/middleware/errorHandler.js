import ApiError from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(new ApiError(404, "Route not found."));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500;
  let message = "Something went wrong. Please try again later.";
  let errors;

  if (error instanceof ApiError) {
    status = error.status;
    message = error.message;
    errors = error.errors;
  } else if (error.code === 11000) {
    status = 409;
    message = "An account with this email already exists.";
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    message = "Please check the submitted data.";
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body.";
  } else if (error.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large.";
  } else if (error.status === 415) {
    status = 415;
    message = "Unsupported request encoding.";
  } else {
    console.error("Unhandled API error:", error.name);
  }

  res.status(status).json({ success: false, message, ...(errors && { errors }) });
}
