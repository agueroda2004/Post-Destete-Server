import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";

import type { Container } from "./container";
import { checkOrigin } from "./middleware/checkOrigin";
import { errorHandler } from "./middleware/errorHandler";
import { buildAuthRoutes } from "./routes/auth.routes";
import { buildDashboardRoutes } from "./routes/dashboard.routes";
import { buildDeceasedRoutes } from "./routes/deceased.routes";
import { buildDiseaseRoutes } from "./routes/disease.routes";

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
  app.use(checkOrigin());

  app.use("/auth", buildAuthRoutes(container.authController));
  app.use("/diseases", buildDiseaseRoutes(container.diseaseController));
  app.use("/deceaseds", buildDeceasedRoutes(container.deceasedController));
  app.use("/dashboard", buildDashboardRoutes(container.dashboardController));

  app.use(errorHandler);

  return app;
}
