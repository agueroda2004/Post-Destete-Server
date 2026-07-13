import type { NextFunction, Request, Response } from "express";

import { CustomError } from "../errors/customError";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(maxRequests: number, windowMs: number, keyPrefix = "") {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const identifier = keyPrefix ? `${keyPrefix}:${ip}` : ip;
    const now = Date.now();
    const existingBucket = buckets.get(identifier);

    if (!existingBucket || existingBucket.resetAt <= now) {
      buckets.set(identifier, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existingBucket.count >= maxRequests) {
      throw new CustomError(
        "Demasiadas solicitudes. Intenta nuevamente más tarde.",
        429,
      );
    }

    existingBucket.count += 1;
    next();
  };
}

export function clearRateLimits(): void {
  buckets.clear();
}
