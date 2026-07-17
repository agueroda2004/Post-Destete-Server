import { Router } from "express";

import type { IDeceasedController } from "../controllers/deceased.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import {
  createDeceasedSchema,
  deleteDeceasedSchema,
  getDeceasedsSchema,
  updateDeceasedSchema,
} from "../schemas/deceased.schemas";

export function buildDeceasedRoutes(
  deceasedController: IDeceasedController,
): Router {
  const router = Router();

  router.get(
    "/diseases",
    authenticate,
    deceasedController.getDiseasesForDropdown,
  );
  router.get(
    "/",
    authenticate,
    validateRequest(getDeceasedsSchema),
    deceasedController.getAll,
  );
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