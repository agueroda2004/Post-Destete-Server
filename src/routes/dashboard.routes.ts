import { Router } from "express";

import type { IDashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import {
  dashboardByCorralTypeSchema,
  dashboardByDiseaseSchema,
  dashboardByFoodPhaseSchema,
  dashboardKpisSchema,
  dashboardTimelineSchema,
} from "../schemas/dashboard.schemas";

export function buildDashboardRoutes(
  dashboardController: IDashboardController,
): Router {
  const router = Router();

  router.get(
    "/kpis",
    authenticate,
    validateRequest(dashboardKpisSchema),
    dashboardController.getKpis,
  );
  router.get(
    "/timeline",
    authenticate,
    validateRequest(dashboardTimelineSchema),
    dashboardController.getTimeline,
  );
  router.get(
    "/by-disease",
    authenticate,
    validateRequest(dashboardByDiseaseSchema),
    dashboardController.getByDisease,
  );
  router.get(
    "/by-food-phase",
    authenticate,
    validateRequest(dashboardByFoodPhaseSchema),
    dashboardController.getByFoodPhase,
  );
  router.get(
    "/by-corral-type",
    authenticate,
    validateRequest(dashboardByCorralTypeSchema),
    dashboardController.getByCorralType,
  );

  return router;
}