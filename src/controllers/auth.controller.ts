import type { Request, Response } from "express";

import { CustomError } from "../errors/customError";
import {
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../libs/cookies";
import type {
  CredentialsBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "../schemas/auth.schemas";
import type { IAuthService } from "../services/auth.service";
import type { UserRecord } from "../types/auth.types";
import { ApiResponse } from "../utils/ApiResponse";

export interface IAuthController {
  register: (request: Request, response: Response) => Promise<Response>;
  login: (request: Request, response: Response) => Promise<Response>;
  refresh: (request: Request, response: Response) => Promise<Response>;
  logout: (request: Request, response: Response) => Promise<Response>;
  me: (request: Request, response: Response) => Promise<Response>;
  forgotPassword: (request: Request, response: Response) => Promise<Response>;
  resetPassword: (request: Request, response: Response) => Promise<Response>;
}

export class AuthController implements IAuthController {
  private readonly authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
  }

  register = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { email, password }: CredentialsBody = request.body;

    const { user, tokens } = await this.authService.register({
      email,
      password,
    });

    setAccessTokenCookie(response, tokens.accessToken);
    setRefreshTokenCookie(response, tokens.refreshToken);

    const responseBody: { user: UserRecord } = { user };

    return ApiResponse.withContent(
      response,
      201,
      responseBody,
      "Usuario registrado correctamente",
    );
  };

  login = async (request: Request, response: Response): Promise<Response> => {
    const { email, password }: CredentialsBody = request.body;

    const { user, tokens } = await this.authService.login({ email, password });

    setAccessTokenCookie(response, tokens.accessToken);
    setRefreshTokenCookie(response, tokens.refreshToken);

    const responseBody: { user: UserRecord } = { user };

    return ApiResponse.withContent(
      response,
      200,
      responseBody,
      "Sesión iniciada correctamente",
    );
  };

  refresh = async (request: Request, response: Response): Promise<Response> => {
    const refreshTokenValue = request.cookies?.refresh_token;

    if (!refreshTokenValue) {
      throw new CustomError("No hay refresh token", 401);
    }

    const tokens = await this.authService.refresh(refreshTokenValue);

    setAccessTokenCookie(response, tokens.accessToken);
    setRefreshTokenCookie(response, tokens.refreshToken);

    return ApiResponse.withContent(
      response,
      200,
      null,
      "Tokens renovados correctamente",
    );
  };

  logout = async (request: Request, response: Response): Promise<Response> => {
    const refreshTokenValue = request.cookies?.refresh_token;

    if (refreshTokenValue) {
      await this.authService.logout(refreshTokenValue);
    }

    clearAccessTokenCookie(response);
    clearRefreshTokenCookie(response);

    return ApiResponse.withoutContent(response, 204);
  };

  me = async (request: Request, response: Response): Promise<Response> => {
    const authenticatedUser = request.user;

    if (!authenticatedUser) {
      throw new CustomError("No autenticado", 401);
    }

    const user = await this.authService.getUserById(authenticatedUser.userId);

    const responseBody: { user: UserRecord } = { user };

    return ApiResponse.withContent(response, 200, responseBody);
  };

  forgotPassword = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { email }: ForgotPasswordBody = request.body;

    await this.authService.requestPasswordReset({ email });

    return ApiResponse.withContent(
      response,
      200,
      null,
      "Si el correo está registrado, te enviaremos un link para restablecer tu contraseña",
    );
  };

  resetPassword = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { token, password }: ResetPasswordBody = request.body;

    await this.authService.resetPassword({ token, password });

    return ApiResponse.withContent(
      response,
      200,
      null,
      "Contraseña restablecida correctamente",
    );
  };
}
