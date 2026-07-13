import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";

import type { Container } from "./container";
import { errorHandler } from "./middleware/errorHandler";
import { buildAuthRoutes } from "./routes/auth.routes";

export function buildApp(container: Container): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );

  app.use("/auth", buildAuthRoutes(container.authController));

  app.use(errorHandler);

  return app;
}
