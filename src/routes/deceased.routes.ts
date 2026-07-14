import { Router } from "express";

import type { IDeceasedController } from "../controllers/deceased.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import {
  createDeceasedSchema,
  deleteDeceasedSchema,
  updateDeceasedSchema,
} from "../schemas/deceased.schemas";

export function buildDeceasedRoutes(
  deceasedController: IDeceasedController,
): Router {
  const router = Router();

  router.post(
    "/",
    authenticate,
    validateRequest(createDeceasedSchema),
    deceasedController.create,
  );
  router.patch(
    "/:id",
    authenticate,
    validateRequest(updateDeceasedSchema),
    deceasedController.update,
  );
  router.delete(
    "/:id",
    authenticate,
    validateRequest(deleteDeceasedSchema),
    deceasedController.deleteById,
  );

  return router;
}