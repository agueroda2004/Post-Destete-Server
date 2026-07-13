import { AuthController } from "./controllers/auth.controller";
import type { IAuthController } from "./controllers/auth.controller";
import { UserRepository } from "./repositories/user.repository";
import { AuthService } from "./services/auth.service";

export type Container = {
  authController: IAuthController;
};

export function buildContainer(): Container {
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  return { authController };
}
