import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { ValidationError } from "../errors/validationError";

export function validateRequest(schema: ZodType) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const input = {
      body: request.body,
      params: request.params,
      query: request.query,
    };

    const result = schema.safeParse(input);

    if (!result.success) {
      throw new ValidationError(result.error.issues);
    }

    const validated = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };

    if (validated.body !== undefined) {
      request.body = validated.body;
    }
    if (validated.params !== undefined) {
      Object.assign(request.params, validated.params);
    }
    if (validated.query !== undefined) {
      Object.assign(request.query, validated.query);
    }

    next();
  };
}
