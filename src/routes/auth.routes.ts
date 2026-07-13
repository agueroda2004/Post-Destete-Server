import { Router } from "express";

import type { IAuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { rateLimit } from "../middleware/rateLimit";
import { validateRequest } from "../middleware/validateRequest";
import {
  credentialsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth.schemas";

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

export function buildAuthRoutes(authController: IAuthController): Router {
  const router = Router();

  router.post(
    "/register",
    rateLimit(5, THIRTY_MINUTES_IN_MS, "register"),
    validateRequest(credentialsSchema),
    authController.register,
  );
  router.post(
    "/login",
    rateLimit(5, THIRTY_MINUTES_IN_MS, "login"),
    validateRequest(credentialsSchema),
    authController.login,
  );
  router.post("/refresh", authController.refresh);
  router.post("/logout", authController.logout);
  router.get("/me", authenticate, authController.me);
  router.post(
    "/forgot-password",
    rateLimit(5, THIRTY_MINUTES_IN_MS, "forgot-password"),
    validateRequest(forgotPasswordSchema),
    authController.forgotPassword,
  );
  router.post(
    "/reset-password",
    validateRequest(resetPasswordSchema),
    authController.resetPassword,
  );

  return router;
}
