import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error("❌ Global Server Error:", err);
  } else {
    console.warn("⚠️ Client Request Warning:", err.message || err);
  }

  // Custom Validation Error structure
  if (err.validationErrors) {
    return res.status(400).json({
      success: false,
      errors: err.validationErrors
    });
  }

  // Duplicate mobile number or closed batch error or status < 500
  if (status < 500) {
    return res.status(status).json({
      success: false,
      error: {
        message: err.message || "Invalid request.",
        status: status
      }
    });
  }

  res.status(status).json({
    success: false,
    error: err.message || "An unexpected server error occurred."
  });
}
