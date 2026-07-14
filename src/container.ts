import { AuthController } from "./controllers/auth.controller";
import type { IAuthController } from "./controllers/auth.controller";
import { DeceasedController } from "./controllers/deceased.controller";
import type { IDeceasedController } from "./controllers/deceased.controller";
import { DiseaseController } from "./controllers/disease.controller";
import type { IDiseaseController } from "./controllers/disease.controller";
import { DeceasedRepository } from "./repositories/deceased.repository";
import { DiseaseRepository } from "./repositories/disease.repository";
import { UserRepository } from "./repositories/user.repository";
import { AuthService } from "./services/auth.service";
import { DeceasedService } from "./services/deceased.service";
import { DiseaseService } from "./services/disease.service";

export type Container = {
  authController: IAuthController;
  diseaseController: IDiseaseController;
  deceasedController: IDeceasedController;
};

export function buildContainer(): Container {
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const diseaseRepository = new DiseaseRepository();
  const diseaseService = new DiseaseService(diseaseRepository);
  const diseaseController = new DiseaseController(diseaseService);

  const deceasedRepository = new DeceasedRepository();
  const deceasedService = new DeceasedService(
    deceasedRepository,
    diseaseRepository,
  );
  const deceasedController = new DeceasedController(deceasedService);

  return { authController, diseaseController, deceasedController };
}