import { Router } from "express";

import type { IDiseaseController } from "../controllers/disease.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import {
  createDiseaseSchema,
  deleteDiseaseSchema,
  updateDiseaseSchema,
} from "../schemas/disease.schemas";

export function buildDiseaseRoutes(diseaseController: IDiseaseController): Router {
  const router = Router();

  router.post(
    "/",
    authenticate,
    validateRequest(createDiseaseSchema),
    diseaseController.create,
  );
  router.patch(
    "/:id",
    authenticate,
    validateRequest(updateDiseaseSchema),
    diseaseController.update,
  );
  router.delete(
    "/:id",
    authenticate,
    validateRequest(deleteDiseaseSchema),
    diseaseController.deleteById,
  );

  return router;
}