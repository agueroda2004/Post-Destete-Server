import { createHash, randomBytes } from "node:crypto";

import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { CustomError } from "../errors/customError";

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;
const REFRESH_TOKEN_BYTES = 48;
const PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES = 15;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const BCRYPT_SALT_ROUNDS = 12;
const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_IN_A_MINUTE = 60 * 1000;

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * MILLISECONDS_IN_A_MINUTE;
export const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_EXPIRES_IN_DAYS * MILLISECONDS_IN_A_DAY;

type SignExpiresIn = NonNullable<jwt.SignOptions["expiresIn"]>;

export type AccessTokenPayload = {
  userId: number;
};

export type VerifiedAccessToken = {
  userId: number;
};

export type GeneratedRefreshToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export type GeneratedPasswordResetToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET no está definido en las variables de entorno");
  }

  return jwt.sign(
    { userId: payload.userId },
    secret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as SignExpiresIn,
    } satisfies jwt.SignOptions,
  );
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET no está definido en las variables de entorno");
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new CustomError("Token inválido o expirado", 401);
  }

  if (typeof decoded === "string") {
    throw new CustomError("Token inválido", 401);
  }

  const userId = (decoded as { userId?: unknown }).userId;
  if (typeof userId !== "number") {
    throw new CustomError("Token inválido", 401);
  }

  return { userId };
}

export async function generateRefreshToken(): Promise<GeneratedRefreshToken> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = hashRefreshToken(token);
  const expiresAt = calculateRefreshTokenExpiry();

  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function calculateRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * MILLISECONDS_IN_A_DAY);
}

export async function generatePasswordResetToken(): Promise<GeneratedPasswordResetToken> {
  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = calculatePasswordResetTokenExpiry();

  return { token, tokenHash, expiresAt };
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function calculatePasswordResetTokenExpiry(): Date {
  return new Date(
    Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES * MILLISECONDS_IN_A_MINUTE,
  );
}
