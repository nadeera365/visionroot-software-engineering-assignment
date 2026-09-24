import { rateLimit } from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

export function checkOrigin(req, res, next) {
  const origin = req.get("Origin");
  if (origin && origin !== req.app.locals.config.clientOrigin) {
    throw new ApiError(403, "This origin is not allowed.");
  }
  next();
}

export function protectWrites(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    // A cross-origin HTML form cannot send this custom header.
    if (req.get("X-Requested-With") !== "XMLHttpRequest") {
      throw new ApiError(403, "Send the X-Requested-With: XMLHttpRequest header.");
    }
    if (!req.is("application/json")) {
      throw new ApiError(415, "Send the request body as application/json.");
    }
  }
  next();
}

export function createLimiter(limit, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { success: false, message: "Too many requests. Please try again later." },
  });
}
