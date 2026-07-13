import type { Response } from "express";

type ApiPayload<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
};

export const ApiResponse = {
  withContent<T>(
    res: Response,
    statusCode: number,
    data: T,
    message?: string,
  ): Response {
    const payload: ApiPayload<T> = {
      success: statusCode >= 200 && statusCode < 400,
      statusCode,
      data,
    };
    if (message) payload.message = message;
    return res.status(statusCode).json(payload);
  },

  withoutContent(res: Response, statusCode: number): Response {
    return res.status(statusCode).send();
  },
};
