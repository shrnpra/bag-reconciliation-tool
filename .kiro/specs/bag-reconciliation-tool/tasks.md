# Implementation Plan: Bag Reconciliation Tool

## Overview

Full-stack React + Node.js/Express + PostgreSQL web application deployed on Railway. The implementation proceeds in layers: project scaffolding and database schema first, then the API service layer, then the React frontend, and finally Railway deployment configuration. Each task builds incrementally on the previous ones, ending with everything wired together and deployable.

---

## Tasks

- [x] 1. Project scaffold and monorepo structure
  - Initialize a single repository with a `packages/` monorepo layout: `packages/server` (Express API) and `packages/client` (React + Vite)
  - Create root `package.json` with workspaces, `tsconfig.base.json`, and shared `eslint` config
  - Add `.env.example` documenting `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `PORT`
  - _Requirements: 1.1, 1.2 (system foundation)_

  - [x] 1.1 Bootstrap server package
    - `packages/server`: init TypeScript project, install Express, Prisma, `jsonwebtoken`, `bcryptjs`, `zod`, `ts-jest`
    - Add `tsconfig.json`, `jest.config.ts`, and `nodemon.json` for local dev
    - _Requirements: all server-side requirements_

  - [x] 1.2 Bootstrap client package
    - `packages/client`: scaffold with `npm create vite@latest` (React + TypeScript template), install TailwindCSS, React Router v6, `axios`
    - Configure Vite proxy (`/api` → `localhost:PORT`) for local development
    - _Requirements: all frontend requirements_

- [x] 2. Database schema and migrations
  - [x] 2.1 Write Prisma schema
    - Create `packages/server/prisma/schema.prisma` with all models: `User`, `Driver`, `Store`, `Visit`, `Discrepancy`, `AuditLog` and all enums (`Role`, `RecordStatus`, `VisitType`, `VisitStatus`, `DiscrepancyStatus`) exactly matching the design data model
    - Run `prisma migrate dev --name init` to generate and apply the initial migration
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 6.1, 7.5, 8.1–8.4_

  - [ ]* 2.2 Write property test for field-constraint enforcement (Property 8)
    - **Property 8: Driver and store field constraints enforced on all inputs**
    - **Validates: Requirements 1.1, 1.2**
    - File: `packages/server/src/__tests__/registration.property.test.ts`

  - [ ]* 2.3 Write property test for duplicate identifier rejection (Property 9)
    - **Property 9: Duplicate identifier rejection for drivers and stores**
    - **Validates: Requirements 1.3, 1.4**
    - File: `packages/server/src/__tests__/registration.property.test.ts`

- [x] 3. Shared validation and type library
  - [x] 3.1 Define shared Zod schemas and TypeScript types
    - Create `packages/server/src/validation/schemas.ts` with Zod schemas for: driver registration, store registration, check-out request, check-in request, discrepancy resolution, date range query
    - Export inferred TypeScript types alongside schemas for use in route handlers and tests
    - _Requirements: 1.1, 1.2, 2.4, 3.5, 4.7, 5.6_

  - [ ]* 3.2 Write property test for validation — invalid bag counts always rejected (Property 7)
    - **Property 7: Validation rejects empty or out-of-range bag counts**
    - **Validates: Requirements 2.4, 3.5**
    - File: `packages/server/src/__tests__/validation.property.test.ts`

- [x] 4. Authentication service and middleware
  - [x] 4.1 Implement auth service
    - `packages/server/src/services/authService.ts`: `register(email, password, role)`, `login(email, password)` — hash passwords with `bcryptjs`, sign/verify JWTs with `jsonwebtoken`
    - _Requirements: 8.5 (authenticated user identifier recorded on every action)_

  - [x] 4.2 Implement auth and role middleware
    - `packages/server/src/middleware/authMiddleware.ts`: validate JWT, attach `req.user` (`id`, `role`)
    - `packages/server/src/middleware/roleGuard.ts`: return 403 if role does not match
    - `packages/server/src/middleware/errorHandler.ts`: normalise all errors to `{ error: string, fields?: string[] }` with correct HTTP status codes per the error-handling table in the design
    - `packages/server/src/middleware/requestLogger.ts`: log method, path, status, duration
    - _Requirements: 8.5_

  - [x] 4.3 Wire auth routes
    - `packages/server/src/routes/authRouter.ts`: `POST /api/auth/login`, `POST /api/auth/logout`
    - Register router in `packages/server/src/app.ts`; mount `errorHandler` last
    - _Requirements: 8.5_

- [x] 5. Driver and store management API
  - [x] 5.1 Implement driver service
    - `packages/server/src/services/driverService.ts`: `createDriver`, `activateDriver`, `getDriver`, `listDrivers` — enforce identifier uniqueness (409), field-length constraints, draft/active status transition validation per requirement 1.6
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [x] 5.2 Implement store service
    - `packages/server/src/services/storeService.ts`: `createStore`, `activateStore`, `getStore`, `listStores` — same uniqueness and validation rules as driver service
    - _Requirements: 1.2, 1.4, 1.5, 1.6_

  - [x] 5.3 Wire driver and store routes
    - `packages/server/src/routes/driversRouter.ts`: `GET /api/drivers`, `POST /api/drivers`, `GET /api/drivers/:id`, `PATCH /api/drivers/:id`
    - `packages/server/src/routes/storesRouter.ts`: mirror for stores
    - Apply `authMiddleware` to all routes; apply `roleGuard('manager')` to POST/PATCH
    - _Requirements: 1.1–1.6_

- [x] 6. Inventory tracking API
  - [x] 6.1 Implement inventory service
    - `packages/server/src/services/inventoryService.ts`: `getDriverInventory(id)`, `getStoreInventory(id)`, `listDriverInventories()`, `listStoreInventories()` — sort list results by identifier ascending
    - Return 404 for unknown identifiers; return 422 for missing/malformed identifiers
    - _Requirements: 4.1–4.7_

  - [x] 6.2 Wire inventory routes
    - `GET /api/drivers/:id/inventory`, `GET /api/stores/:id/inventory`
    - `GET /api/drivers` and `GET /api/stores` list endpoints already return inventory counts from step 5.3 — add query param `?summary=true` to return only `(id, bagInventory)` pairs for the all-inventories use case
    - _Requirements: 4.3–4.7_

  - [ ]* 6.3 Write property test for inventory list sort order (Property 12)
    - **Property 12: Inventory list is always sorted by identifier ascending**
    - **Validates: Requirements 4.5**
    - File: `packages/server/src/__tests__/inventory.property.test.ts`

- [x] 7. Check-out transaction
  - [x] 7.1 Implement check-out service
    - `packages/server/src/services/visitService.ts` — `recordCheckOut(driverId, storeId, bagCount, performedBy)`:
      - Validate required fields and bag count > 0 (422 on failure)
      - Inside `prisma.$transaction`: read driver inventory; reject with 409 if insufficient; decrement driver, increment store, create Visit, insert AuditLog
      - Return updated driver and store `bagInventory`
    - _Requirements: 2.1–2.7_

  - [ ]* 7.2 Write property test for check-out inventory conservation (Property 1)
    - **Property 1: Inventory conservation on check-out**
    - **Validates: Requirements 2.2, 2.3**
    - File: `packages/server/src/__tests__/checkout.property.test.ts`

  - [ ]* 7.3 Write property test for check-out rejected when driver inventory insufficient (Property 3)
    - **Property 3: Check-out rejected when driver inventory insufficient**
    - **Validates: Requirements 2.5**
    - File: `packages/server/src/__tests__/checkout.property.test.ts`

  - [x] 7.4 Wire check-out route
    - `POST /api/visits/checkout` in `packages/server/src/routes/visitsRouter.ts`
    - Apply `authMiddleware`; validate body with Zod schema from step 3.1
    - _Requirements: 2.1–2.7_

- [x] 8. Check-in transaction
  - [x] 8.1 Implement check-in service
    - Add `recordCheckIn(driverId, storeId, bagCount, performedBy)` to `visitService.ts`:
      - Validate required fields and bag count in range 1–999 (422 on failure)
      - Inside `prisma.$transaction`: read store inventory; if `bagCount > store.bagInventory`, set discrepancy flag and upsert Discrepancy record (keyed on `visitId`) with status "open", set Visit status to "requires_review"; decrement store, increment driver, create Visit, insert AuditLog regardless
      - Return updated inventories and discrepancy flag
    - _Requirements: 3.1–3.6, 6.1, 6.2, 6.6_

  - [ ]* 8.2 Write property test for check-in inventory conservation (Property 2)
    - **Property 2: Inventory conservation on check-in**
    - **Validates: Requirements 3.2, 3.3**
    - File: `packages/server/src/__tests__/checkin.property.test.ts`

  - [ ]* 8.3 Write property test for discrepancy created iff actual exceeds store inventory (Property 4)
    - **Property 4: Discrepancy created iff actual exceeds store inventory**
    - **Validates: Requirements 3.4, 6.1, 6.2**
    - File: `packages/server/src/__tests__/discrepancy.property.test.ts`

  - [ ]* 8.4 Write property test for duplicate discrepancy prevention (Property 6)
    - **Property 6: Duplicate discrepancy prevention (idempotence)**
    - **Validates: Requirements 6.6**
    - File: `packages/server/src/__tests__/discrepancy.property.test.ts`

  - [x] 8.5 Wire check-in route
    - `POST /api/visits/checkin` in `visitsRouter.ts`; `GET /api/visits/:id`
    - Apply `authMiddleware`; validate body with Zod schema from step 3.1
    - _Requirements: 3.1–3.6_

- [x] 9. Checkpoint — core transaction tests
  - Ensure all unit and property tests for check-in and check-out pass. Ask the user if questions arise.

- [x] 10. Discrepancy management API
  - [x] 10.1 Implement discrepancy service
    - `packages/server/src/services/discrepancyService.ts`: `listOpenDiscrepancies()` — return all records with status "open" sorted by timestamp descending; `resolveDiscrepancy(id, note, managerId)` — validate note present (422 if missing), update status to "resolved", record `resolvedBy` and `resolvedAt`
    - _Requirements: 6.3–6.5_

  - [x] 10.2 Wire discrepancy routes
    - `GET /api/discrepancies?status=open` and `PATCH /api/discrepancies/:id/resolve`
    - Apply `authMiddleware` + `roleGuard('manager')` to both
    - _Requirements: 6.3–6.5_

- [x] 11. Visit history API
  - [x] 11.1 Implement visit history service
    - `packages/server/src/services/visitHistoryService.ts`: `getVisitsForDriver(id, dateRange?)`, `getVisitsForStore(id, dateRange?)` — return results in reverse chronological order; apply inclusive date filter when provided; return 404 for unknown identifiers; return empty list for valid identifiers with no visits
    - _Requirements: 7.1–7.6_

  - [x] 11.2 Wire visit history routes
    - `GET /api/drivers/:id/visits` and `GET /api/stores/:id/visits` (with optional `?from=&to=` query params)
    - Apply `authMiddleware`
    - _Requirements: 7.1–7.4, 7.6_

  - [ ]* 11.3 Write property test for visit history reverse-chronological order (Property 10)
    - **Property 10: Visit history is always in reverse chronological order**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - File: `packages/server/src/__tests__/history.property.test.ts`

- [x] 12. Reconciliation report API
  - [x] 12.1 Implement report service
    - `packages/server/src/services/reportService.ts`: `generateReport(entityType, id, dateRange?)`:
      - Default date range to current calendar day when not provided
      - Compute opening inventory by summing all movements before the range start date
      - Collect all visits in range in chronological order
      - Compute closing inventory = opening + sum(check-ins) − sum(check-outs)
      - Compare against stored closing value; flag report if mismatch (include expected vs actual)
      - Include all flagged discrepancies within the date range
      - Return 404 for unknown identifiers; return empty-movement report for valid entities with no visits in range
    - _Requirements: 5.1–5.8_

  - [ ]* 12.2 Write property test for report arithmetic invariant (Property 5)
    - **Property 5: Report closing = opening + net movements**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
    - File: `packages/server/src/__tests__/report.property.test.ts`

  - [x] 12.3 Wire report routes
    - `GET /api/drivers/:id/report` and `GET /api/stores/:id/report` (with optional `?from=&to=` query params)
    - Apply `authMiddleware` + `roleGuard('manager')`
    - _Requirements: 5.1–5.8_

- [x] 13. Audit log service
  - [x] 13.1 Implement audit log helpers and write property test for audit completeness
    - Centralise AuditLog insertion into `packages/server/src/services/auditService.ts`: `logAction(action, performedBy, visitId?, discrepancyId?)` — called by check-in, check-out, and resolve-discrepancy services
    - Ensure every action records `performedBy` (User.id) and the affected `visitId` or `discrepancyId`
    - _Requirements: 8.1, 8.5, 8.6_

  - [ ]* 13.2 Write property test for unique identifiers and complete audit entries (Property 11)
    - **Property 11: All records have unique identifiers and complete audit entries**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6**
    - File: `packages/server/src/__tests__/audit.property.test.ts`

- [x] 14. Checkpoint — full API integration tests
  - Run Supertest integration tests against a test Postgres instance for all endpoints. Ensure transaction rollback, auth enforcement, and role guard tests pass. Ask the user if questions arise.

- [x] 15. React frontend — authentication and shell
  - [x] 15.1 Implement login page and auth context
    - `packages/client/src/pages/LoginPage.tsx`: email/password form with inline error display
    - `packages/client/src/context/AuthContext.tsx`: store JWT in `localStorage`, expose `user`, `login()`, `logout()`
    - Protect routes with a `RequireAuth` wrapper component; redirect unauthenticated users to `/login`
    - _Requirements: 8.5 (authenticated user on every action)_

  - [x] 15.2 Implement app shell and navigation
    - `packages/client/src/App.tsx`: set up React Router routes for all pages listed in the design (`/login`, `/dashboard`, `/checkout`, `/checkin`, `/inventory`, `/discrepancies`, `/reports`, `/admin/drivers`, `/admin/stores`, `/history/:type/:id`)
    - Responsive nav bar with role-based menu items (driver sees check-in/out; manager sees all)
    - _Requirements: all UI requirements_

- [ ] 16. React frontend — driver flows
  - [x] 16.1 Implement check-out form
    - `packages/client/src/pages/CheckOutForm.tsx`: store selector (dropdown from `/api/stores`), bag count input, submit button
    - Map 422 errors to inline field errors; map 409 (insufficient inventory) to a clear error toast
    - Show updated driver and store inventory counts in confirmation on success
    - _Requirements: 2.1–2.6_

  - [x] 16.2 Implement check-in form
    - `packages/client/src/pages/CheckInForm.tsx`: same pattern as check-out form; additionally show a discrepancy warning banner when the response includes a discrepancy flag
    - _Requirements: 3.1–3.6_

  - [x] 16.3 Implement visit history page
    - `packages/client/src/pages/VisitHistory.tsx`: date range filter, paginated table of visits in reverse chronological order, works for both driver and store context via `type` and `id` route params
    - _Requirements: 7.1–7.6_

- [x] 17. React frontend — fleet manager flows
  - [x] 17.1 Implement inventory view
    - `packages/client/src/pages/InventoryView.tsx`: two tables (all drivers, all stores) showing current bag inventory sorted by identifier; auto-refresh every 5 seconds via `setInterval`
    - _Requirements: 4.1–4.5_

  - [x] 17.2 Implement discrepancy list and resolve flow
    - `packages/client/src/pages/DiscrepancyList.tsx`: table of open discrepancies sorted by timestamp descending; inline resolve form (resolution note required, maps 422 to inline error)
    - _Requirements: 6.3–6.5_

  - [x] 17.3 Implement reconciliation report view
    - `packages/client/src/pages/ReportView.tsx`: entity type and identifier selector, date range picker (defaults to today), renders report sections: opening inventory, movements table, closing inventory, discrepancies, calculation-error banner when flagged
    - _Requirements: 5.1–5.8_

  - [x] 17.4 Implement driver and store admin pages
    - `packages/client/src/pages/DriversAdmin.tsx` and `StoresAdmin.tsx`: create/list drivers and stores; inline activation flow; display validation errors per field; show duplicate-identifier conflict errors
    - _Requirements: 1.1–1.6_

- [x] 18. Express static file serving and API routing integration
  - [x] 18.1 Wire Vite build output into Express
    - In `packages/server/src/app.ts`: serve `dist/public` (Vite output) at `/` using `express.static`
    - Add catch-all route `GET *` returning `index.html` for client-side routing
    - Ensure `/api/*` routes take precedence over the static catch-all
    - _Requirements: all (deployment prerequisite)_

- [x] 19. Railway deployment configuration
  - [x] 19.1 Add Railway configuration and build scripts
    - Create `railway.json` at repo root:
      ```json
      { "build": { "builder": "nixpacks" }, "deploy": { "startCommand": "node packages/server/dist/server.js" } }
      ```
    - Add `Procfile` as fallback: `web: node packages/server/dist/server.js`
    - Update root `package.json` `scripts`:
      - `"build": "npm run build:client && npm run build:server"`
      - `"build:client": "cd packages/client && npm run build && cp -r dist ../server/dist/public"`
      - `"build:server": "cd packages/server && tsc -p tsconfig.build.json"`
      - `"start": "node packages/server/dist/server.js"`
    - _Requirements: all (deployment)_

  - [x] 19.2 Add Prisma migration step to Railway build
    - In `packages/server/package.json`, add `"railway:build": "prisma migrate deploy && prisma generate"` script
    - Update `railway.json` build command to run `npm run railway:build` before starting the server
    - Ensure `DATABASE_URL` environment variable is consumed from Railway Postgres plugin
    - _Requirements: all (database deployment)_

  - [x] 19.3 Create Railway environment variable documentation
    - Create `RAILWAY_SETUP.md` at repo root documenting all required environment variables: `DATABASE_URL` (from Railway Postgres plugin — auto-injected), `JWT_SECRET` (generate with `openssl rand -hex 32`), `NODE_ENV=production`, `PORT` (Railway auto-injects)
    - Document the Railway Postgres plugin setup steps and the seed command for creating the first manager account
    - _Requirements: all (operational documentation)_

  - [x] 19.4 Add database seed script for initial manager account
    - `packages/server/prisma/seed.ts`: create a default manager `User` account if none exists; read credentials from `SEED_MANAGER_EMAIL` and `SEED_MANAGER_PASSWORD` env vars
    - Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `packages/server/package.json`
    - _Requirements: 8.5 (authenticated user on every action — requires at least one manager account)_

- [x] 20. Final checkpoint — end-to-end verification
  - Ensure all unit, property, and integration tests pass with `jest`. Verify the Vite production build completes without errors. Verify `prisma migrate deploy` succeeds against a local Postgres instance. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use in-memory mocks (fast-check, min 100 iterations) — no real DB required for PBT runs
- Integration tests require a local Postgres instance (run via Docker: `docker run -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16`)
- Railway auto-injects `DATABASE_URL` and `PORT` — never hard-code these values
- The Vite dev proxy (`/api` → Express) means local development needs both `npm run dev` (client) and `npm run dev` (server) running concurrently

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3", "5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 9, "tasks": ["7.4", "8.2", "8.3", "8.4"] },
    { "id": 10, "tasks": ["8.5", "10.1"] },
    { "id": 11, "tasks": ["10.2", "11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3", "12.1"] },
    { "id": 13, "tasks": ["12.2", "13.1"] },
    { "id": 14, "tasks": ["12.3", "13.2"] },
    { "id": 15, "tasks": ["15.1"] },
    { "id": 16, "tasks": ["15.2"] },
    { "id": 17, "tasks": ["16.1", "16.2", "16.3", "17.1", "17.2", "17.3", "17.4"] },
    { "id": 18, "tasks": ["18.1"] },
    { "id": 19, "tasks": ["19.1"] },
    { "id": 20, "tasks": ["19.2", "19.4"] },
    { "id": 21, "tasks": ["19.3"] }
  ]
}
```
