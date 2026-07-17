# Post-Destete · Backend Service

Backend service for the **Post-Destete** application. Built with Node.js, Express 5 and Prisma, it exposes a stateless JWT-based auth layer, a disease catalog module, a deceased-animals production-records module and a dashboard analytics module, all persisted against a relational database and ready to be consumed by the front-end client.

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

Implements a complete authentication flow using **short-lived access tokens** (signed JWT in an `httpOnly` cookie) plus **rotated, hashed refresh tokens** stored in the database. Passwords are hashed with **bcrypt (12 rounds)**, and every entry point is validated with **Zod** schemas and protected by an **in-memory IP rate limiter**.

### Available endpoints

| Method | Route                   | Auth | Rate-limit | Description                                                              |
| ------ | ----------------------- | :--: | :--------: | ------------------------------------------------------------------------ |
| POST   | `/auth/register`        |  ❌  |     ✅     | Creates a new user and issues both tokens as `httpOnly` cookies.        |
| POST   | `/auth/login`           |  ❌  |     ✅     | Validates credentials with bcrypt and issues a new token pair.           |
| POST   | `/auth/refresh`         |  ❌  |     ❌     | Rotates the refresh token (old one is revoked, a new pair is issued).    |
| POST   | `/auth/logout`          |  ❌  |     ❌     | Revokes the current refresh token and clears both cookies.               |
| GET    | `/auth/me`              |  ✅  |     ❌     | Returns the authenticated user profile from the access token.            |
| POST   | `/auth/forgot-password` |  ❌  |     ✅     | Generates a one-time reset token (logged via console for local dev).     |
| POST   | `/auth/reset-password`  |  ❌  |     ❌     | Consumes the reset token, updates the password and revokes all sessions. |

## What the Disease module does

Catalog management for the diseases tracked across the production cycles. The module exposes a **paginated, filterable list** plus standard CRUD mutations. Every mutation is **validated with Zod**, requires an authenticated session, enforces **uniqueness on `name`** (case-sensitive, both on create and on update), and is **blocked from deletion** while there are deceased animals linked to it (cascade would otherwise wipe out production records).

### Available endpoints

| Method | Route                | Auth | Description                                                                                              |
| ------ | -------------------- | :--: | -------------------------------------------------------------------------------------------------------- |
| GET    | `/diseases`          |  ✅  | Paginated list with optional filters: `name` (partial match, case-insensitive at the DB level), `active` (`true` / `false`), `page` (default `1`), `pageSize` (default `10`, max `100`). Returns `{ items, total, page, pageSize, totalPages }`. |
| POST   | `/diseases`          |  ✅  | Creates a disease (`name` required, `active` optional, defaults to `true`). Returns **409** if the name already exists. |
| PATCH  | `/diseases/:id`      |  ✅  | Partially updates `name` and/or `active` (at least one field required). Returns **404** if not found, **409** if the new `name` collides with another disease. |
| DELETE | `/diseases/:id`      |  ✅  | Deletes a disease. Returns **404** if not found. Returns **409** if any deceased record is linked to it.   |

## What the Deceased module does

Production-records module for the animals that died during a post-weaning cycle. Each record binds an animal to the **disease** that caused the death and to the **corral** and **food phase** it was in at the time, enabling per-cycle and per-disease mortality analytics. The module exposes a **paginated, filterable list**, a **disease dropdown** for the front-end forms, and standard CRUD mutations. Every mutation is **validated with Zod** (with `z.coerce` to translate the wire types — `id` and `dateOfDeath` — into the internal `number` and `Date`), requires an authenticated session, and enforces cross-module integrity at the service layer:

- The `diseaseId` foreign key is checked against the Disease catalog on **create** and on **update** if provided. A missing disease returns `404` before any record is written.
- The reverse side of this contract lives in the Disease module: a disease **cannot be deleted** while deceased records reference it (`409 Conflict`).
- `PATCH` requires at least one field via a Zod `.refine` — empty payloads are rejected at the validation boundary, not at the service.
- All successful mutations return `204 No Content` — the client treats the operation as idempotent on the affected record.

### Available endpoints

| Method | Route                  | Auth | Description                                                                                              |
| ------ | ---------------------- | :--: | -------------------------------------------------------------------------------------------------------- |
| GET    | `/deceaseds/diseases`  |  ✅  | Returns the active diseases as `{ id, name }[]`, ordered by `name` ascending. Used to populate the dropdown on the create / edit form. |
| GET    | `/deceaseds`           |  ✅  | Paginated list with optional filters: `dateFrom`, `dateTo` (inclusive end-of-day in UTC), `diseaseId`, `foodPhase` (one of the 8 production phases), `corralType` (`Corral` \| `Hospital` \| `Cuna`), `corralNumber` (partial match), `sale` (`true` / `false`). `page` defaults to `1`, `pageSize` to `20` (max `100`). Sorted by `dateOfDeath` desc, then `id` desc. Returns `{ items, total, page, pageSize, totalPages }`. Each item embeds `disease: { id, name }`. |
| POST   | `/deceaseds`           |  ✅  | Creates a mortality record. Required: `note` (optional, max 255 chars), `weight` (positive number), `corralNumber`, `dateOfDeath`, `diseaseId`, `corralType` (`Corral` \| `Hospital` \| `Cuna`), `food_phase` (one of the 8 production phases). Optional: `active` (defaults `true`), `sale` (defaults `false`). Returns **404** if `diseaseId` does not exist. |
| PATCH  | `/deceaseds/:id`       |  ✅  | Partially updates a record (at least one field required). Re-checks `diseaseId` if changed. Returns **404** if the record or the referenced disease does not exist. |
| DELETE | `/deceaseds/:id`       |  ✅  | Deletes a record. Returns **404** if not found. Does not cascade into the Disease catalog.              |

## What the Dashboard module does

Read-only analytics layer over the deceased-records table. Every endpoint accepts an **optional date range** (`dateFrom` / `dateTo`, inclusive end-of-day in UTC) and requires an authenticated session. All aggregations run through Prisma's `groupBy` / `aggregate` against the live MariaDB instance.

### Available endpoints

| Method | Route                       | Auth | Query                                                                                                  | Description                                                                                              |
| ------ | --------------------------- | :--: | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| GET    | `/dashboard/kpis`           |  ✅  | `dateFrom?`, `dateTo?`                                                                                 | Headline KPIs for the range: total deaths, average weight, sold percentage, top disease (id + name + count) and `deltaVsPrevious` (% change of `total` and `avgWeight` against the previous window of equal length). |
| GET    | `/dashboard/timeline`       |  ✅  | `dateFrom?`, `dateTo?`, `granularity?` (`day` \| `week` \| `month`)                                    | Deaths bucketed by time. Granularity defaults to `day` for ranges ≤ 31 days, `week` for ≤ 365 days, `month` otherwise. Items are returned sorted by bucket ascending. |
| GET    | `/dashboard/by-disease`     |  ✅  | `dateFrom?`, `dateTo?`                                                                                 | Top 10 diseases by death count in the range, with their disease id and name. Sorted by count descending. |
| GET    | `/dashboard/by-food-phase`  |  ✅  | `dateFrom?`, `dateTo?`                                                                                 | Deaths grouped by `food_phase`. All 8 production phases are always returned (zero-filled), in canonical order. |
| GET    | `/dashboard/by-corral-type` |  ✅  | `dateFrom?`, `dateTo?`                                                                                 | Deaths grouped by `corralType`. All 3 corral types (`Corral`, `Hospital`, `Cuna`) are always returned (zero-filled), in canonical order. |

## Middleware pipeline

Shared middleware applied across the modules (mounted per route or globally):

- **`authenticate`** — verifies the `access_token` cookie against the JWT secret and attaches `request.user` for downstream handlers.
- **`validateRequest`** — runs the route's Zod schema against `body`, `params` or `query`, returning a `400` with detailed issues on failure.
- **`rateLimit`** — key-prefixed in-memory token bucket per IP (default: 5 requests / 30 min) applied to sensitive public routes.
- **`checkOrigin`** — CSRF guard. Rejects `POST`, `PUT`, `PATCH` and `DELETE` requests whose `Origin` (or `Referer` fallback) does not match `FRONTEND_URL` with a `403`. Active only when `NODE_ENV === "production"` so it doesn't interfere with the `supertest` integration suite. See the [Security](#security) section for the full rationale.
- **`errorHandler`** — central error translator mounted globally on the Express app, mapping `CustomError`, `ZodError` and `Prisma` known errors into a uniform JSON envelope.

## Architecture

The codebase follows a **layered + DI** pattern wired in `container.ts`:

```
routes → controllers → services → repositories → Prisma (MariaDB)
```

This keeps controllers thin and makes the service unit-testable with mocked repositories, while the integration suite boots the real Express app through `buildApp(container)` against a dedicated test database.

## Security

The auth module is designed against an explicit threat model. Every flag, header and middleware below maps to a specific attack class.

### Cookie policy (`src/libs/cookies.ts`)

Authentication tokens are delivered as `httpOnly` cookies, never as `localStorage` or response bodies.

| Flag          | Value                                       | Threat mitigated                                                                  |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| `httpOnly`    | `true`                                      | **XSS-based cookie theft** — `document.cookie` cannot read the token, so an injected script cannot exfiltrate it. |
| `secure`      | `process.env.COOKIE_SECURE === "true"` (forced `true` in production) | **Network sniffing / MITM** — the cookie is only transmitted over HTTPS, so a passive attacker on the wire cannot capture it. |
| `sameSite`    | `"lax"` in dev, `"none"` in prod            | **CSRF (defense in depth)** — `Lax` blocks the cookie on cross-site sub-requests for the dev single-origin flow; `None` is only paired with the `checkOrigin` middleware in the cross-origin prod deployment. |
| `path`        | `/` for access, `/auth/refresh` for refresh | **Blast-radius reduction** — the refresh token only travels to the one endpoint that needs it. |
| (no `domain`) | host-only                                   | The cookie is not shared with subdomains, limiting exposure if one of them is ever compromised. |

`SameSite=None` requires `Secure=true`, which requires HTTPS. The dev flow uses `SameSite=Lax` over the Vite proxy (single origin, no CORS) and never needs `None`.

### CSRF — `checkOrigin` middleware

CORS only protects the *response* — it stops a malicious origin from *reading* the result of a cross-origin request, but it does not stop a malicious page from *triggering* a state-changing request via a plain HTML form (a "simple request" that does not trigger a preflight). `SameSite=None` is what enables the cookie to travel in that case, so it opens the door that `checkOrigin` then closes.

`src/middleware/checkOrigin.ts` validates the `Origin` (with `Referer` as fallback) on every `POST`, `PUT`, `PATCH` and `DELETE` request. Any mismatch against `FRONTEND_URL` returns `403 "Origen no permitido"` through the central `errorHandler`. GET, HEAD and OPTIONS pass through untouched.

The check is gated on `NODE_ENV === "production"` so the `supertest` integration suite (which does not send an `Origin` header) keeps passing without test changes.

### XSS

The server-side contract is deliberately narrow to keep the XSS surface minimal:

- Every response is `application/json`. The server never returns serialized HTML, fragments, or `text/html` payloads.
- Validation runs before any controller code via `validateRequest`, so a malformed payload never reaches a template or a string-concatenated error message.
- The session token never leaves the `httpOnly` cookie, so even if an attacker manages to run script in the front-end context, they cannot exfiltrate the token via `document.cookie` or `fetch` to their own server.
- Final defense — escape-on-render — is the responsibility of the front-end (React escapes by default; no `dangerouslySetInnerHTML` is used on auth-related data).

### Network theft

- **HTTPS everywhere in production** — required by the `Secure` cookie flag and by `SameSite=None`. A reverse proxy (Nginx/Caddy) terminates TLS in front of the Node server.
- **No JWT in `localStorage` or `sessionStorage`** — eliminates the entire class of "XSS exfiltrates the token" attacks. The token only lives in the `httpOnly` cookie and never crosses into JS-reachable storage.
- **Vite dev proxy** — in development, the front-end and the back-end share the same origin (`localhost:5173`), so the cookie never traverses a real cross-origin channel during local work.
- **Refresh-token rotation** — every `POST /auth/refresh` revokes the consumed token and issues a new pair. A captured refresh token is single-use.

### Rate limiting

`rateLimit` (5 requests / 30 min per IP, in-memory bucket) is applied to `/auth/register`, `/auth/login` and `/auth/forgot-password`. This caps the cost of credential stuffing and password-spray attempts, and bounds the email-enumeration surface on the forgot-password flow.

## Tests

All four modules are covered by **199 integration tests** (`vitest` + `supertest`) exercising the full HTTP surface: happy paths, validation errors, rate-limit enforcement, token rotation, password reset lifecycle, deletion safeguards, cross-module integrity (deceased ↔ disease), protected route access control, and dashboard aggregations / zero-fill / default granularity, hitting a real Prisma client against an isolated test database.

```bash
pnpm test           # full run
pnpm test:watch     # watch mode
```