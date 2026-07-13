import type { NextFunction, Request, Response } from "express";

import { CustomError } from "../errors/customError";
import { verifyAccessToken } from "../libs/jwt";

export function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const accessToken = request.cookies?.access_token;

  if (!accessToken) {
    throw new CustomError("No autenticado", 401);
  }

  const payload = verifyAccessToken(accessToken);

  request.user = { userId: payload.userId };

  next();
}
