import { AuthController } from "./controllers/auth.controller";
import type { IAuthController } from "./controllers/auth.controller";
import { DiseaseController } from "./controllers/disease.controller";
import type { IDiseaseController } from "./controllers/disease.controller";
import { DiseaseRepository } from "./repositories/disease.repository";
import { UserRepository } from "./repositories/user.repository";
import { AuthService } from "./services/auth.service";
import { DiseaseService } from "./services/disease.service";

export type Container = {
  authController: IAuthController;
  diseaseController: IDiseaseController;
};

export function buildContainer(): Container {
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const diseaseRepository = new DiseaseRepository();
  const diseaseService = new DiseaseService(diseaseRepository);
  const diseaseController = new DiseaseController(diseaseService);

  return { authController, diseaseController };
}