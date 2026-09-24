export function errorHandler(error, req, res, _next) {
  
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map((e) => e.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This email is already registered.",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format.",
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
  });
}

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}