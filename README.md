# Post-Destete · Auth Service

Backend authentication service for the **Post-Destete** application. Built with Node.js, Express 5 and Prisma, it exposes a stateless JWT-based auth layer persisted against a relational database, ready to be consumed by the front-end client.

## Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-10-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-HS256-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3068B7?style=for-the-badge&logo=zod&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-12rounds-3381FF?style=for-the-badge&logo=lock&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Supertest](https://img.shields.io/badge/Supertest-7-000000?style=for-the-badge&logo=testinglibrary&logoColor=white)

## What the Auth module does

The service implements a complete authentication flow using **short-lived access tokens** (signed JWT in an `httpOnly` cookie) plus **rotated, hashed refresh tokens** stored in the database. Passwords are hashed with **bcrypt (12 rounds)**, and every entry point is validated with **Zod** schemas and protected by an **in-memory IP rate limiter**.

### Available endpoints

| Method | Route                  | Auth | Rate-limit | Description                                                              |
| ------ | ---------------------- | :--: | :--------: | ------------------------------------------------------------------------ |
| POST   | `/auth/register`       |  ❌  |     ✅     | Creates a new user and issues both tokens as `httpOnly` cookies.        |
| POST   | `/auth/login`          |  ❌  |     ✅     | Validates credentials with bcrypt and issues a new token pair.           |
| POST   | `/auth/refresh`        |  ❌  |     ❌     | Rotates the refresh token (old one is revoked, a new pair is issued).    |
| POST   | `/auth/logout`         |  ❌  |     ❌     | Revokes the current refresh token and clears both cookies.               |
| GET    | `/auth/me`             |  ✅  |     ❌     | Returns the authenticated user profile from the access token.            |
| POST   | `/auth/forgot-password`|  ❌  |     ✅     | Generates a one-time reset token (logged via console for local dev).     |
| POST   | `/auth/reset-password` |  ❌  |     ❌     | Consumes the reset token, updates the password and revokes all sessions.|

### Middleware pipeline

- **`authenticate`** — verifies the `access_token` cookie against the JWT secret and attaches `request.user` for downstream handlers.
- **`validateRequest`** — runs the route's Zod schema against `body`, `params` or `query`, returning a `400` with detailed issues on failure.
- **`rateLimit`** — key-prefixed in-memory token bucket per IP (default: 5 requests / 30 min) applied to sensitive public routes.
- **`errorHandler`** — central error translator that maps `CustomError`, `ZodError` and `Prisma` known errors into a uniform JSON envelope.

### Architecture

The codebase follows a **layered + DI** pattern wired in `container.ts`:

```
routes → controllers → services → repositories → Prisma (MariaDB)
```

This keeps controllers thin and makes the service unit-testable with mocked repositories, while the integration suite boots the real Express app through `buildApp(container)` against a dedicated test database.

## Tests

The auth layer is covered by **44 integration tests** (`vitest` + `supertest`) that exercise the full HTTP surface — happy paths, validation errors, rate-limit enforcement, token rotation, password reset lifecycle and protected route access control — hitting a real Prisma client against an isolated test database.

```bash
pnpm test           # full run
pnpm test:watch     # watch mode
```
