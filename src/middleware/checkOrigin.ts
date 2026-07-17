import type { NextFunction, Request, Response } from "express";

import { CustomError } from "../errors/customError";

const STATE_CHANGING_METHODS = new Set<string>([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export function checkOrigin() {
  const allowedOrigin = process.env.FRONTEND_URL;

  if (!allowedOrigin) {
    throw new Error(
      "FRONTEND_URL no está definida. checkOrigin no puede operar.",
    );
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(allowedOrigin).origin;
  } catch {
    throw new Error(
      `FRONTEND_URL inválida: "${allowedOrigin}". Debe ser una URL absoluta (ej. https://app.tudominio.com).`,
    );
  }

  return function checkOriginMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    if (process.env.NODE_ENV !== "production") {
      return next();
    }

    if (!STATE_CHANGING_METHODS.has(request.method)) {
      return next();
    }

    const rawOrigin =
      (request.headers.origin as string | undefined) ??
      (request.headers.referer as string | undefined);

    if (!rawOrigin) {
      return next(new CustomError("Origen no permitido", 403));
    }

    let requestOrigin: string;
    try {
      requestOrigin = new URL(rawOrigin).origin;
    } catch {
      return next(new CustomError("Origen no permitido", 403));
    }

    if (requestOrigin !== expectedOrigin) {
      return next(new CustomError("Origen no permitido", 403));
    }

    return next();
  };
}
