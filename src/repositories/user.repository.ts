import prisma from "../libs/prisma";
import type {
  PasswordResetTokenRecord,
  PasswordResetTokenSaveInput,
  RefreshTokenRecord,
  RefreshTokenSaveInput,
  UserCreateInput,
  UserRecord,
  UserWithPassword,
} from "../types/auth.types";

export interface IUserRepository {
  createUser(input: UserCreateInput): Promise<UserRecord>;
  saveRefreshToken(input: RefreshTokenSaveInput): Promise<void>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<number>;
  revokeAllRefreshTokensForUser(userId: number): Promise<number>;
  savePasswordResetToken(input: PasswordResetTokenSaveInput): Promise<void>;
  invalidateUnusedPasswordResetTokens(userId: number): Promise<void>;
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  markPasswordResetTokenAsUsed(tokenHash: string): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  async createUser(input: UserCreateInput): Promise<UserRecord> {
    const createdUser = await prisma.user.create({
      data: {
        email: input.email,
        password: input.password,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return createdUser;
  }

  async saveRefreshToken(input: RefreshTokenSaveInput): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const foundUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return foundUser;
  }

  async findUserByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const foundUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        createdAt: true,
      },
    });

    return foundUser;
  }

  async findUserById(id: number): Promise<UserRecord | null> {
    const foundUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return foundUser;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const foundToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
    });

    return foundToken;
  }

  async revokeRefreshToken(tokenHash: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
    return result.count;
  }

  async revokeAllRefreshTokensForUser(userId: number): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return result.count;
  }

  async savePasswordResetToken(input: PasswordResetTokenSaveInput): Promise<void> {
    await prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async invalidateUnusedPasswordResetTokens(userId: number): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });
  }

  async findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const foundToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        used: true,
        createdAt: true,
      },
    });

    return foundToken;
  }

  async markPasswordResetTokenAsUsed(tokenHash: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { used: true },
    });
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
