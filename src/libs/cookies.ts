import type { Response } from "express";

import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "./jwt";

const ACCESS_TOKEN_COOKIE_NAME = "access_token";
const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const ACCESS_TOKEN_COOKIE_PATH = "/";
const REFRESH_TOKEN_COOKIE_PATH = "/auth/refresh";
const SAME_SITE_POLICY: "lax" = "lax";

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: SAME_SITE_POLICY,
  };
}

export function setAccessTokenCookie(response: Response, token: string): void {
  response.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
    ...getBaseCookieOptions(),
    path: ACCESS_TOKEN_COOKIE_PATH,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
}

export function setRefreshTokenCookie(response: Response, token: string): void {
  response.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...getBaseCookieOptions(),
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

export function clearAccessTokenCookie(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    ...getBaseCookieOptions(),
    path: ACCESS_TOKEN_COOKIE_PATH,
  });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    ...getBaseCookieOptions(),
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}
