import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.code === "unrecognized_keys" ? "Unexpected fields are not allowed." : issue.message,
      }));
      throw new ApiError(400, "Please check the submitted data.", errors);
    }
    // Express 5's req.query is read-only; keep validated values separately.
    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };
}

export function validateId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    throw new ApiError(400, "Invalid resource ID.");
  }
  next();
}
