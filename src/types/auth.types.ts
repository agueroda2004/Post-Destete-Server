export type UserCreateInput = {
  email: string;
  password: string;
};

export type UserRecord = {
  id: number;
  email: string;
  createdAt: Date;
};

export type UserWithPassword = {
  id: number;
  email: string;
  password: string;
  createdAt: Date;
};

export type RefreshTokenSaveInput = {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type RegisterResult = {
  user: UserRecord;
  tokens: AuthTokens;
};

export type PasswordResetTokenSaveInput = {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
};

export type PasswordResetTokenRecord = {
  id: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};
