import * as bcrypt from "bcrypt";

import { CustomError } from "../errors/customError";
import {
  generatePasswordResetToken,
  generateRefreshToken,
  hashPasswordResetToken,
  hashRefreshToken,
  signAccessToken,
} from "../libs/jwt";
import type { IUserRepository } from "../repositories/user.repository";
import type {
  AuthTokens,
  RegisterResult,
  UserCreateInput,
  UserRecord,
  UserWithPassword,
} from "../types/auth.types";
import type {
  CredentialsBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "../schemas/auth.schemas";

const BCRYPT_SALT_ROUNDS = 12;

export interface IAuthService {
  register(input: UserCreateInput): Promise<RegisterResult>;
  login(input: CredentialsBody): Promise<RegisterResult>;
  refresh(refreshTokenValue: string): Promise<AuthTokens>;
  logout(refreshTokenValue: string): Promise<void>;
  getUserById(id: number): Promise<UserRecord>;
  requestPasswordReset(input: ForgotPasswordBody): Promise<void>;
  resetPassword(input: ResetPasswordBody): Promise<void>;
}

export class AuthService implements IAuthService {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async register(input: UserCreateInput): Promise<RegisterResult> {
    const existingUser = await this.userRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new CustomError("El correo ya está registrado", 409);
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const createdUser = await this.userRepository.createUser({
      email: input.email,
      password: hashedPassword,
    });

    const tokens = await this.generateAndStoreTokens(createdUser.id);

    return {
      user: createdUser,
      tokens,
    };
  }

  async login(input: CredentialsBody): Promise<RegisterResult> {
    const userWithPassword = await this.userRepository.findUserByEmailWithPassword(
      input.email,
    );

    if (!userWithPassword) {
      throw new CustomError("Credenciales inválidas", 401);
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      userWithPassword.password,
    );

    if (!isPasswordValid) {
      throw new CustomError("Credenciales inválidas", 401);
    }

    const user = toUserRecord(userWithPassword);
    const tokens = await this.generateAndStoreTokens(user.id);

    return { user, tokens };
  }

  async refresh(refreshTokenValue: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshTokenValue);
    const storedToken = await this.userRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new CustomError("Refresh token inválido", 401);
    }

    if (storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new CustomError("Refresh token expirado o revocado", 401);
    }

    const revokeCount = await this.userRepository.revokeRefreshToken(tokenHash);
    if (revokeCount === 0) {
      throw new CustomError("Refresh token ya utilizado", 401);
    }

    return await this.generateAndStoreTokens(storedToken.userId);
  }

  async logout(refreshTokenValue: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshTokenValue);
    await this.userRepository.revokeRefreshToken(tokenHash);
  }

  async getUserById(id: number): Promise<UserRecord> {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new CustomError("Usuario no encontrado", 404);
    }
    return user;
  }

  async requestPasswordReset(input: ForgotPasswordBody): Promise<void> {
    const user = await this.userRepository.findUserByEmail(input.email);
    if (!user) return;

    await this.userRepository.invalidateUnusedPasswordResetTokens(user.id);

    const resetToken = await generatePasswordResetToken();
    await this.userRepository.savePasswordResetToken({
      userId: user.id,
      tokenHash: resetToken.tokenHash,
      expiresAt: resetToken.expiresAt,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken.token}`;
    console.log(`[Password Reset] URL para ${input.email}: ${resetUrl}`);
  }

  async resetPassword(input: ResetPasswordBody): Promise<void> {
    const tokenHash = hashPasswordResetToken(input.token);
    const storedToken = await this.userRepository.findPasswordResetTokenByHash(tokenHash);

    if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
      throw new CustomError("Token inválido o expirado", 401);
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    await this.userRepository.updateUserPassword(storedToken.userId, hashedPassword);
    await this.userRepository.markPasswordResetTokenAsUsed(tokenHash);
    await this.userRepository.revokeAllRefreshTokensForUser(storedToken.userId);
  }

  private async generateAndStoreTokens(userId: number): Promise<AuthTokens> {
    const accessToken = signAccessToken({ userId });
    const refreshToken = await generateRefreshToken();

    await this.userRepository.saveRefreshToken({
      userId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }
}

function toUserRecord(userWithPassword: UserWithPassword): UserRecord {
  return {
    id: userWithPassword.id,
    email: userWithPassword.email,
    createdAt: userWithPassword.createdAt,
  };
}
