import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as jwt from "jsonwebtoken";
import request from "supertest";
import type { Express } from "express";

import { buildApp } from "../../app";
import { buildContainer } from "../../container";
import prisma from "../../libs/prisma";
import { clearDatabase, disconnectDatabase, extractCookieValue } from "../helpers";
import { clearRateLimits } from "../../middleware/rateLimit";

describe("Auth integration", () => {
  let app: Express;

  beforeAll(() => {
    const container = buildContainer();
    app = buildApp(container);
  });

  beforeEach(async () => {
    await clearDatabase();
    clearRateLimits();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("POST /auth/register", () => {
    it("registra un usuario nuevo y setea cookies httpOnly", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "nuevo@example.com", password: "password123" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("nuevo@example.com");
      expect(response.body.data.user).not.toHaveProperty("password");

      const setCookie = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

      expect(cookies.some((cookie) => cookie?.startsWith("access_token="))).toBe(true);
      expect(cookies.some((cookie) => cookie?.startsWith("refresh_token="))).toBe(true);
      expect(cookies.every((cookie) => cookie?.includes("HttpOnly"))).toBe(true);
    });

    it("rechaza email duplicado con 409", async () => {
      const payload = { email: "duplicado@example.com", password: "password123" };

      await request(app).post("/auth/register").send(payload);

      const response = await request(app).post("/auth/register").send(payload);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it("rechaza email inválido con 400", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "no-es-un-email", password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("rechaza password corto con 400", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "user@example.com", password: "123" });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    it("loguea un usuario existente y setea cookies", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "user@example.com", password: "password123" });

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "user@example.com", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe("user@example.com");

      const setCookie = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      expect(cookies.some((cookie) => cookie?.startsWith("access_token="))).toBe(true);
    });

    it("rechaza password incorrecto con 401", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "user@example.com", password: "password123" });

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "user@example.com", password: "wrong-password" });

      expect(response.status).toBe(401);
    });

    it("rechaza usuario inexistente con 401", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "noexiste@example.com", password: "password123" });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("devuelve el usuario autenticado", async () => {
      const agent = request.agent(app);
      await agent
        .post("/auth/register")
        .send({ email: "auth@example.com", password: "password123" });

      const response = await agent.get("/auth/me");

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe("auth@example.com");
    });

    it("devuelve 401 sin cookie de acceso", async () => {
      const response = await request(app).get("/auth/me");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("renueva tokens con un refresh cookie válido", async () => {
      const agent = request.agent(app);
      await agent
        .post("/auth/register")
        .send({ email: "refresh@example.com", password: "password123" });

      const response = await agent.post("/auth/refresh");

      expect(response.status).toBe(200);

      const setCookie = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      expect(cookies.some((cookie) => cookie?.startsWith("access_token="))).toBe(true);
      expect(cookies.some((cookie) => cookie?.startsWith("refresh_token="))).toBe(true);
    });

    it("rota el refresh token (el viejo queda revocado)", async () => {
      const registerResponse = await request(app)
        .post("/auth/register")
        .send({ email: "rotacion@example.com", password: "password123" });

      const setCookie = registerResponse.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const oldRefreshCookie = cookies.find((cookie) =>
        cookie?.startsWith("refresh_token="),
      );

      const firstRefresh = await request(app)
        .post("/auth/refresh")
        .set("Cookie", oldRefreshCookie ?? "");
      expect(firstRefresh.status).toBe(200);

      const secondRefreshWithOldCookie = await request(app)
        .post("/auth/refresh")
        .set("Cookie", oldRefreshCookie ?? "");
      expect(secondRefreshWithOldCookie.status).toBe(401);
    });

    it("devuelve 401 sin refresh cookie", async () => {
      const response = await request(app).post("/auth/refresh");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("limpia cookies y revoca el refresh token", async () => {
      const agent = request.agent(app);
      await agent
        .post("/auth/register")
        .send({ email: "logout@example.com", password: "password123" });

      const logoutResponse = await agent.post("/auth/logout");

      expect(logoutResponse.status).toBe(204);

      const setCookie = logoutResponse.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const accessCleared = cookies.some((cookie) =>
        cookie?.startsWith("access_token=;"),
      );
      const refreshCleared = cookies.some((cookie) =>
        cookie?.startsWith("refresh_token=;"),
      );
      expect(accessCleared).toBe(true);
      expect(refreshCleared).toBe(true);

      const refreshAfterLogout = await agent.post("/auth/refresh");
      expect(refreshAfterLogout.status).toBe(401);
    });

    it("funciona aunque no haya sesión (no rompe)", async () => {
      const response = await request(app).post("/auth/logout");

      expect(response.status).toBe(204);
    });
  });

  describe("Access token security", () => {
    it("rechaza access token expirado con 401", async () => {
      const expiredToken = jwt.sign(
        { userId: 1 },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: "-1s" },
      );

      const response = await request(app)
        .get("/auth/me")
        .set("Cookie", `access_token=${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it("rechaza access token firmado con secret incorrecto", async () => {
      const tamperedToken = jwt.sign(
        { userId: 1 },
        "secret-totalmente-diferente-al-de-tests",
        { expiresIn: "15m" },
      );

      const response = await request(app)
        .get("/auth/me")
        .set("Cookie", `access_token=${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it("rechaza access token malformado (no es JWT válido)", async () => {
      const response = await request(app)
        .get("/auth/me")
        .set("Cookie", "access_token=esto-no-es-un-jwt-valido");

      expect(response.status).toBe(401);
    });
  });

  describe("Cookie security", () => {
    it("refresh cookie se emite con Path=/auth/refresh", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "cookie-path@example.com", password: "password123" });

      const setCookie = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const refreshCookie = cookies.find((cookie) =>
        cookie?.startsWith("refresh_token="),
      );

      expect(refreshCookie).toMatch(/Path=\/auth\/refresh/);
    });

    it("access cookie se emite con Path=/", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "cookie-path-2@example.com", password: "password123" });

      const setCookie = response.headers["set-cookie"];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const accessCookie = cookies.find((cookie) =>
        cookie?.startsWith("access_token="),
      );

      expect(accessCookie).toMatch(/Path=\/(;|$)/);
    });
  });

  describe("Data security (DB hashing)", () => {
    it("password se guarda hasheado con bcrypt, no en plain text", async () => {
      const plainPassword = "password123";
      await request(app)
        .post("/auth/register")
        .send({ email: "hash@example.com", password: plainPassword });

      const userInDb = await prisma.user.findUnique({
        where: { email: "hash@example.com" },
      });

      expect(userInDb?.password).not.toBe(plainPassword);
      expect(userInDb?.password).toMatch(/^\$2[aby]\$/);
      expect(userInDb?.password.length).toBeGreaterThan(50);
    });

    it("refresh token se guarda hasheado (SHA-256), no en plain text", async () => {
      const registerResponse = await request(app)
        .post("/auth/register")
        .send({ email: "token-hash@example.com", password: "password123" });

      const plainRefreshToken = extractCookieValue(
        registerResponse.headers["set-cookie"],
        "refresh_token",
      );

      expect(plainRefreshToken).toBeDefined();

      const userInDb = await prisma.user.findUnique({
        where: { email: "token-hash@example.com" },
        include: { refreshTokens: true },
      });

      expect(userInDb?.refreshTokens).toHaveLength(1);
      const storedToken = userInDb!.refreshTokens[0];
      expect(storedToken).toBeDefined();
      const storedTokenHash = storedToken!.tokenHash;
      expect(storedTokenHash).not.toBe(plainRefreshToken);
      expect(storedTokenHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("Multiple sessions", () => {
    it("login múltiple crea múltiples refresh tokens independientes", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "multi-session@example.com", password: "password123" });

      await request(app)
        .post("/auth/login")
        .send({ email: "multi-session@example.com", password: "password123" });
      await request(app)
        .post("/auth/login")
        .send({ email: "multi-session@example.com", password: "password123" });
      await request(app)
        .post("/auth/login")
        .send({ email: "multi-session@example.com", password: "password123" });

      const userInDb = await prisma.user.findUnique({
        where: { email: "multi-session@example.com" },
        include: { refreshTokens: true },
      });

      expect(userInDb?.refreshTokens).toHaveLength(4);
      expect(userInDb?.refreshTokens.every((token) => !token.revoked)).toBe(true);
    });
  });

  describe("Input validation extremes", () => {
    it("rechaza body vacío con 400", async () => {
      const response = await request(app).post("/auth/register").send({});

      expect(response.status).toBe(400);
    });

    it("rechaza body con tipos incorrectos con 400", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: 123, password: true });

      expect(response.status).toBe(400);
    });

    it("ignora campos extra (Zod strip por defecto)", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "extra@example.com",
        password: "password123",
        admin: true,
      });

      expect(response.status).toBe(201);
    });

    it("acepta email con mayúsculas (Zod no normaliza, documenta comportamiento)", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "UPPER@example.COM",
        password: "password123",
      });

      expect(response.status).toBe(201);
    });
  });

  describe("Refresh rotation atomicity", () => {
    it("solo uno de dos refresh concurrentes gana (rotación atómica)", async () => {
      const registerResponse = await request(app)
        .post("/auth/register")
        .send({ email: "concurrent@example.com", password: "password123" });

      const refreshCookie = extractCookieValue(
        registerResponse.headers["set-cookie"],
        "refresh_token",
      );

      const [response1, response2] = await Promise.all([
        request(app).post("/auth/refresh").set("Cookie", `refresh_token=${refreshCookie}`),
        request(app).post("/auth/refresh").set("Cookie", `refresh_token=${refreshCookie}`),
      ]);

      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([200, 401]);
    });
  });

  describe("POST /auth/forgot-password", () => {
    function captureResetTokenFromConsole(): string | undefined {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      return undefined;
    }

    function extractResetToken(
      consoleSpy: ReturnType<typeof vi.spyOn>,
    ): string | undefined {
      const callWithToken = consoleSpy.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].includes("/reset-password?token="),
      );
      if (!callWithToken || typeof callWithToken[0] !== "string") return undefined;
      const match = callWithToken[0].match(/token=([a-f0-9]+)/);
      return match?.[1];
    }

    it("devuelve 200 cuando el email existe", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "forgot@example.com", password: "password123" });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot@example.com" });
      consoleSpy.mockRestore();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("devuelve 200 incluso si el email NO existe (no leak)", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "noexiste-para-forgot@example.com" });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("guarda el PasswordResetToken hasheado en DB", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "forgot-hash@example.com", password: "password123" });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot-hash@example.com" });

      const rawToken = extractResetToken(consoleSpy);
      consoleSpy.mockRestore();

      expect(rawToken).toBeDefined();

      const userInDb = await prisma.user.findUnique({
        where: { email: "forgot-hash@example.com" },
        include: { passwordResetTokens: true },
      });

      expect(userInDb?.passwordResetTokens).toHaveLength(1);
      const storedToken = userInDb!.passwordResetTokens[0];
      expect(storedToken).toBeDefined();
      const storedTokenHash = storedToken!.tokenHash;
      expect(storedTokenHash).not.toBe(rawToken);
      expect(storedTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(storedToken!.used).toBe(false);
    });

    it("invalida los PasswordResetTokens anteriores sin usar del mismo user", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "forgot-invalidate@example.com", password: "password123" });

      const firstConsoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot-invalidate@example.com" });
      firstConsoleSpy.mockRestore();

      const secondConsoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot-invalidate@example.com" });
      secondConsoleSpy.mockRestore();

      const userInDb = await prisma.user.findUnique({
        where: { email: "forgot-invalidate@example.com" },
        include: { passwordResetTokens: true },
      });

      expect(userInDb?.passwordResetTokens).toHaveLength(2);
      const usedCount = userInDb!.passwordResetTokens.filter((token) => token.used).length;
      const unusedCount = userInDb!.passwordResetTokens.filter((token) => !token.used).length;
      expect(usedCount).toBe(1);
      expect(unusedCount).toBe(1);
    });

    it("loguea la URL de reset con el token raw en consola", async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "forgot-log@example.com", password: "password123" });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await request(app)
        .post("/auth/forgot-password")
        .send({ email: "forgot-log@example.com" });

      const rawToken = extractResetToken(consoleSpy);
      consoleSpy.mockRestore();

      expect(rawToken).toBeDefined();
      expect(rawToken).toMatch(/^[a-f0-9]+$/);
    });

    it("rechaza body sin email con 400", async () => {
      const response = await request(app).post("/auth/forgot-password").send({});
      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/reset-password", () => {
    async function registerAndRequestReset(email: string): Promise<string> {
      await request(app).post("/auth/register").send({ email, password: "oldPassword123" });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await request(app).post("/auth/forgot-password").send({ email });

      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("token="),
      );
      consoleSpy.mockRestore();

      if (!logCall || typeof logCall[0] !== "string") {
        throw new Error("No se encontró el token en el log");
      }
      const match = logCall[0].match(/token=([a-f0-9]+)/);
      if (!match || !match[1]) {
        throw new Error("No se pudo extraer el token");
      }
      return match[1];
    }

    it("con token válido cambia el password y permite login con el nuevo", async () => {
      const email = "reset-success@example.com";
      const rawToken = await registerAndRequestReset(email);

      const resetResponse = await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, password: "newPassword123" });

      expect(resetResponse.status).toBe(200);

      const oldPasswordLogin = await request(app)
        .post("/auth/login")
        .send({ email, password: "oldPassword123" });
      expect(oldPasswordLogin.status).toBe(401);

      const newPasswordLogin = await request(app)
        .post("/auth/login")
        .send({ email, password: "newPassword123" });
      expect(newPasswordLogin.status).toBe(200);
    });

    it("marca el token como usado después de un reset exitoso", async () => {
      const email = "reset-used@example.com";
      const rawToken = await registerAndRequestReset(email);

      await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, password: "newPassword123" });

      const userInDb = await prisma.user.findUnique({
        where: { email },
        include: { passwordResetTokens: true },
      });
      expect(userInDb?.passwordResetTokens).toHaveLength(1);
      const storedToken = userInDb!.passwordResetTokens[0];
      expect(storedToken).toBeDefined();
      expect(storedToken!.used).toBe(true);
    });

    it("invalida TODOS los refresh tokens del user al cambiar el password", async () => {
      const email = "reset-revoke-refresh@example.com";

      await request(app).post("/auth/register").send({ email, password: "oldPassword123" });
      await request(app).post("/auth/login").send({ email, password: "oldPassword123" });

      const userBeforeReset = await prisma.user.findUnique({
        where: { email },
        include: { refreshTokens: true },
      });
      expect(userBeforeReset?.refreshTokens.length).toBeGreaterThanOrEqual(2);
      const activeBeforeReset = userBeforeReset!.refreshTokens.filter(
        (token) => !token.revoked,
      ).length;
      expect(activeBeforeReset).toBeGreaterThanOrEqual(2);

      const rawToken = await registerAndRequestReset(email);

      await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, password: "newPassword123" });

      const userAfterReset = await prisma.user.findUnique({
        where: { email },
        include: { refreshTokens: true },
      });
      const activeAfterReset = userAfterReset!.refreshTokens.filter(
        (token) => !token.revoked,
      );
      expect(activeAfterReset).toHaveLength(0);
    });

    it("rechaza token inválido con 401", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token: "esto-no-es-un-token-valido", password: "newPassword123" });

      expect(response.status).toBe(401);
    });

    it("rechaza token ya usado con 401", async () => {
      const email = "reset-used-twice@example.com";
      const rawToken = await registerAndRequestReset(email);

      const firstReset = await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, password: "newPassword123" });
      expect(firstReset.status).toBe(200);

      const secondReset = await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, password: "anotherPassword123" });

      expect(secondReset.status).toBe(401);
    });

    it("rechaza body con password corto con 400", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token: "alguntoken", password: "123" });

      expect(response.status).toBe(400);
    });
  });

  describe("Rate limit (forgot-password)", () => {
    it("permite 5 requests y bloquea la 6ta con 429", async () => {
      const statuses: number[] = [];
      for (let index = 0; index < 6; index += 1) {
        const response = await request(app)
          .post("/auth/forgot-password")
          .send({ email: `ratelimit-${index}@example.com` });
        statuses.push(response.status);
      }

      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe("Rate limit (login)", () => {
    it("permite 5 requests y bloquea la 6ta con 429", async () => {
      const statuses: number[] = [];
      for (let index = 0; index < 6; index += 1) {
        const response = await request(app)
          .post("/auth/login")
          .send({ email: `ratelimit-login-${index}@example.com`, password: "password123" });
        statuses.push(response.status);
      }

      expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe("Rate limit (register)", () => {
    it("permite 5 requests y bloquea la 6ta con 429", async () => {
      const statuses: number[] = [];
      for (let index = 0; index < 6; index += 1) {
        const response = await request(app)
          .post("/auth/register")
          .send({ email: `ratelimit-register-${index}@example.com`, password: "password123" });
        statuses.push(response.status);
      }

      expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe("Rate limit buckets por endpoint", () => {
    it("exhaust el bucket de login no afecta a forgot-password", async () => {
      for (let index = 0; index < 5; index += 1) {
        await request(app)
          .post("/auth/login")
          .send({ email: "x@x.com", password: "password123" });
      }

      const blockedLogin = await request(app)
        .post("/auth/login")
        .send({ email: "x@x.com", password: "password123" });
      expect(blockedLogin.status).toBe(429);

      const forgotResponse = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "x@x.com" });
      expect(forgotResponse.status).toBe(200);
    });

    it("exhaust el bucket de register no afecta a login", async () => {
      for (let index = 0; index < 5; index += 1) {
        await request(app)
          .post("/auth/register")
          .send({ email: `isolated-${index}@example.com`, password: "password123" });
      }

      const blockedRegister = await request(app)
        .post("/auth/register")
        .send({ email: "isolated-5@example.com", password: "password123" });
      expect(blockedRegister.status).toBe(429);

      const loginResponse = await request(app)
        .post("/auth/login")
        .send({ email: "isolated-0@example.com", password: "password123" });
      expect(loginResponse.status).toBe(200);
    });
  });
});
