import type { NextFunction, Request, Response } from "express";

import { CustomError } from "../errors/customError";
import { ValidationError } from "../errors/validationError";
import { ApiResponse } from "../utils/ApiResponse";

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): Response {
  if (error instanceof ValidationError) {
    return ApiResponse.withContent(
      response,
      error.statusCode,
      { issues: error.issues },
      error.message,
    );
  }

  if (error instanceof CustomError) {
    return ApiResponse.withContent(response, error.statusCode, null, error.message);
  }

  console.error("Error no controlado:", error);
  return ApiResponse.withContent(response, 500, null, "Error interno del servidor");
}
