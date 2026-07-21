# Design Document: Bag Tracking v2

## Overview

Bag Tracking v2 evolves the existing count-based bag reconciliation system into individual bag-level tracking via barcode scans. The system introduces two new data models (`Bag` and `BagAssignment`), extends `Store` with a country field, and adds new API endpoints for bag lifecycle management, driver accountability dashboards, and overdue bag reporting.

The design preserves the existing Express + Prisma + PostgreSQL server and React + Vite + Tailwind client architecture, layering new routes and services alongside the existing v1 code.

---

## Architecture

### System Context

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│  React Client   │◄───────►│  Express API Server                 │
│  (Vite+Tailwind)│  REST   │  ├── authMiddleware (JWT)           │
└─────────────────┘         │  ├── roleGuard (DRIVER | MANAGER)   │
                            │  ├── /api/bags/*                    │
                            │  ├── /api/bags/assignments/*        │
                            │  ├── /api/dashboard/*               │
                            │  └── Prisma ORM                     │
                            │         │                           │
                            └─────────┼───────────────────────────┘
                                      │
                            ┌─────────▼───────────────────────────┐
                            │  PostgreSQL (Railway)                │
                            │  ├── Bag                            │
                            │  ├── BagAssignment                  │
                            │  ├── Store (+ country)              │
                            │  └── existing tables unchanged      │
                            └─────────────────────────────────────┘
```

### Module Decomposition

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Routes | `bagsRouter.ts` | HTTP handlers for bag registration, pickup, return, status changes, history |
| Routes | `dashboardRouter.ts` | HTTP handlers for accountability dashboard and end-of-day summary |
| Services | `bagService.ts` | Core business logic for bag lifecycle (register, pickup, return, mark lost, reactivate) |
| Services | `dashboardService.ts` | Aggregation queries for dashboard and summary views |
| Validation | `bagSchemas.ts` | Zod schemas for all bag-tracking request bodies and query params |
| Middleware | existing `authMiddleware.ts` + `roleGuard.ts` | Authentication and authorization (unchanged) |
| Data | Prisma schema | New models `Bag`, `BagAssignment`; `Store` extended with `country` |

---

## Data Models

### Prisma Schema Additions

```prisma
// ─── New Enums ────────────────────────────────────────────────────────────────

enum BagStatus {
  AVAILABLE
  ASSIGNED
  LOST
}

enum Country {
  UAE
  SAUDI_ARABIA
  EGYPT
}

// ─── New Models ───────────────────────────────────────────────────────────────

model Bag {
  id             String        @id @default(cuid())
  barcode        String        @unique
  status         BagStatus     @default(AVAILABLE)
  currentStoreId String
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  currentStore   Store         @relation(fields: [currentStoreId], references: [id])
  assignments    BagAssignment[]
}

model BagAssignment {
  id             String    @id @default(cuid())
  bagId          String
  driverId       String
  pickupTime     DateTime  @default(now())
  returnTime     DateTime?
  returnStoreId  String?
  orderReference String?
  createdAt      DateTime  @default(now())

  bag            Bag       @relation(fields: [bagId], references: [id])
  driver         Driver    @relation(fields: [driverId], references: [id])
  returnStore    Store?    @relation("ReturnStore", fields: [returnStoreId], references: [id])
}

// ─── Store extension ──────────────────────────────────────────────────────────

model Store {
  // ... existing fields ...
  country        Country   @default(UAE)

  // new relations
  bags           Bag[]
  returnedAssignments BagAssignment[] @relation("ReturnStore")
}

// ─── Driver extension ─────────────────────────────────────────────────────────

model Driver {
  // ... existing fields ...
  bagAssignments BagAssignment[]
}
```

### Key Design Decisions

1. **Bag.currentStoreId** — Always points to the store where the bag physically resides (or last resided before being assigned). Updated on registration and return.
2. **BagAssignment.returnStoreId** — Nullable; set only on return. This allows bags to be returned to any store (Req 3.4).
3. **Country as enum** — Using a Prisma enum (mapped to PostgreSQL enum) for type safety. The initial three values match requirements. Future countries require a migration.
4. **Overdue calculated at query time** — No background jobs. The query uses `WHERE returnTime IS NULL AND pickupTime + interval '4 hours' < NOW()`.

---

## API Interfaces

### Bag Registration

```
POST /api/bags
Authorization: Bearer <token>  (MANAGER)
Content-Type: application/json

{
  "barcode": "BAG-001-UAE",
  "storeId": "store-dubai-1"
}

201 Created
{
  "id": "clxyz...",
  "barcode": "BAG-001-UAE",
  "status": "AVAILABLE",
  "currentStoreId": "store-dubai-1",
  "createdAt": "2024-01-15T10:00:00Z"
}

409 Conflict — barcode already exists
404 Not Found — store does not exist
```

### Bag Pickup

```
POST /api/bags/pickup
Authorization: Bearer <token>  (DRIVER)
Content-Type: application/json

{
  "barcode": "BAG-001-UAE",
  "orderReference": "ORD-12345"   // optional
}

201 Created
{
  "assignment": {
    "id": "clxyz...",
    "bagId": "...",
    "driverId": "...",
    "pickupTime": "2024-01-15T10:30:00Z",
    "orderReference": "ORD-12345"
  },
  "bag": { "barcode": "BAG-001-UAE", "status": "ASSIGNED" }
}

409 Conflict — bag already assigned
404 Not Found — barcode not found
```

### Bag Return

```
POST /api/bags/return
Authorization: Bearer <token>  (DRIVER)
Content-Type: application/json

{
  "barcode": "BAG-001-UAE",
  "storeId": "store-riyadh-2"
}

200 OK
{
  "assignment": {
    "id": "clxyz...",
    "returnTime": "2024-01-15T14:30:00Z",
    "returnStoreId": "store-riyadh-2"
  },
  "bag": { "barcode": "BAG-001-UAE", "status": "AVAILABLE", "currentStoreId": "store-riyadh-2" }
}

409 Conflict — bag not currently assigned
404 Not Found — barcode or store not found
```

### Mark Bag as Lost

```
PATCH /api/bags/:barcode/status
Authorization: Bearer <token>  (MANAGER)
Content-Type: application/json

{ "status": "LOST" }

200 OK
{ "bag": { "barcode": "BAG-001-UAE", "status": "LOST" } }
```

### Reactivate Bag

```
PATCH /api/bags/:barcode/status
Authorization: Bearer <token>  (MANAGER)
Content-Type: application/json

{ "status": "AVAILABLE", "storeId": "store-dubai-1" }

200 OK
{ "bag": { "barcode": "BAG-001-UAE", "status": "AVAILABLE", "currentStoreId": "store-dubai-1" } }
```

### Bag Assignment History

```
GET /api/bags/:barcode/history
Authorization: Bearer <token>  (MANAGER)

200 OK
{
  "barcode": "BAG-001-UAE",
  "assignments": [
    {
      "driverName": "Ahmed",
      "driverId": "driver-1",
      "pickupTime": "2024-01-15T10:30:00Z",
      "returnTime": "2024-01-15T14:30:00Z",
      "orderReference": "ORD-12345"
    }
  ]
}
```

### Driver Accountability Dashboard

```
GET /api/dashboard/accountability?country=UAE
Authorization: Bearer <token>  (MANAGER)

200 OK
{
  "drivers": [
    {
      "driverId": "driver-1",
      "driverName": "Ahmed",
      "totalBagsOut": 5,
      "overdueBags": 2
    }
  ]
}
```

### Driver Detail (Bags for a specific driver)

```
GET /api/dashboard/accountability/:driverId
Authorization: Bearer <token>  (MANAGER)

200 OK
{
  "driverId": "driver-1",
  "driverName": "Ahmed",
  "bags": [
    {
      "barcode": "BAG-001-UAE",
      "pickupTime": "2024-01-15T10:30:00Z",
      "isOverdue": true,
      "elapsedHours": 5.2
    }
  ]
}
```

### End-of-Day Summary

```
GET /api/dashboard/end-of-day?country=UAE
Authorization: Bearer <token>  (MANAGER)

200 OK
{
  "summary": [
    {
      "driverName": "Ahmed",
      "driverId": "driver-1",
      "overdueBags": [
        {
          "barcode": "BAG-001-UAE",
          "pickupTime": "2024-01-15T10:30:00Z",
          "elapsedHours": 5.2,
          "orderReference": "ORD-12345"
        }
      ]
    }
  ]
}
```

---

## Components and Interfaces

### Server Components

#### BagsRouter (`packages/server/src/routes/bagsRouter.ts`)

Handles all bag lifecycle HTTP endpoints. Applies `authMiddleware` and appropriate `roleGuard` to each route.

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// MANAGER endpoints
router.post('/', roleGuard('MANAGER'), registerBagHandler);
router.patch('/:barcode/status', roleGuard('MANAGER'), changeStatusHandler);
router.get('/:barcode/history', roleGuard('MANAGER'), getHistoryHandler);

// DRIVER endpoints
router.post('/pickup', roleGuard('DRIVER'), pickupHandler);
router.post('/return', roleGuard('DRIVER'), returnHandler);

export { router as bagsRouter };
```

#### DashboardRouter (`packages/server/src/routes/dashboardRouter.ts`)

All dashboard endpoints restricted to MANAGER role.

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(authMiddleware);
router.use(roleGuard('MANAGER'));

router.get('/accountability', getAccountabilityHandler);
router.get('/accountability/:driverId', getDriverDetailHandler);
router.get('/end-of-day', getEndOfDayHandler);

export { router as dashboardRouter };
```

#### BagService (`packages/server/src/services/bagService.ts`)

Pure business logic for bag lifecycle operations. Each function is wrapped in a Prisma transaction for atomicity.

```typescript
export interface RegisterBagResult {
  id: string;
  barcode: string;
  status: BagStatus;
  currentStoreId: string;
  createdAt: Date;
}

export interface PickupResult {
  assignment: BagAssignment;
  bag: { barcode: string; status: BagStatus };
}

export interface ReturnResult {
  assignment: { id: string; returnTime: Date; returnStoreId: string };
  bag: { barcode: string; status: BagStatus; currentStoreId: string };
}

export async function registerBag(barcode: string, storeId: string): Promise<RegisterBagResult>;
export async function pickupBag(barcode: string, driverId: string, orderReference?: string): Promise<PickupResult>;
export async function returnBag(barcode: string, storeId: string): Promise<ReturnResult>;
export async function markBagLost(barcode: string): Promise<Bag>;
export async function reactivateBag(barcode: string, storeId: string): Promise<Bag>;
export async function getBagHistory(barcode: string): Promise<BagAssignmentWithDriver[]>;
```

#### DashboardService (`packages/server/src/services/dashboardService.ts`)

Aggregation queries for manager views. Uses `buildOverdueWhereClause()` for consistent overdue logic.

```typescript
export interface DriverAccountabilityRow {
  driverId: string;
  driverName: string;
  totalBagsOut: number;
  overdueBags: number;
}

export interface DriverBagDetail {
  driverId: string;
  driverName: string;
  bags: Array<{
    barcode: string;
    pickupTime: Date;
    isOverdue: boolean;
    elapsedHours: number;
  }>;
}

export interface EndOfDaySummaryRow {
  driverName: string;
  driverId: string;
  overdueBags: Array<{
    barcode: string;
    pickupTime: Date;
    elapsedHours: number;
    orderReference: string | null;
  }>;
}

export async function getDriverAccountability(country?: Country): Promise<DriverAccountabilityRow[]>;
export async function getDriverBagDetail(driverId: string): Promise<DriverBagDetail>;
export async function getEndOfDaySummary(country?: Country): Promise<EndOfDaySummaryRow[]>;
```

#### Overdue Utility (`packages/server/src/services/overdueUtil.ts`)

Shared pure function for calculating overdue thresholds, injectable `now` for testing.

```typescript
const OVERDUE_THRESHOLD_HOURS = 4;

export function buildOverdueWhereClause(now: Date = new Date()) {
  const threshold = new Date(now.getTime() - OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);
  return {
    returnTime: null,
    pickupTime: { lt: threshold },
  };
}

export function isOverdue(pickupTime: Date, now: Date = new Date()): boolean {
  const elapsed = now.getTime() - pickupTime.getTime();
  return elapsed > OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000;
}

export function elapsedHours(pickupTime: Date, now: Date = new Date()): number {
  return (now.getTime() - pickupTime.getTime()) / (60 * 60 * 1000);
}
```

### Client Components

#### Pages

| Component | Path | Props / Data |
|-----------|------|--------------|
| `BagScanPage` | `/bags/scan` | Uses `AuthContext` for driver ID; calls pickup/return APIs |
| `BagRegistrationPage` | `/bags/register` | Form with barcode + store selector; calls `POST /api/bags` |
| `AccountabilityDashboard` | `/dashboard/accountability` | Fetches from `/api/dashboard/accountability`; includes `CountryFilter` |
| `DriverBagDetail` | `/dashboard/drivers/:id` | Fetches from `/api/dashboard/accountability/:driverId` |
| `EndOfDaySummary` | `/dashboard/end-of-day` | Fetches from `/api/dashboard/end-of-day`; includes `CountryFilter` |
| `BagHistoryPage` | `/bags/:barcode/history` | Fetches from `/api/bags/:barcode/history` |

#### Shared Components

| Component | Purpose |
|-----------|---------|
| `CountryFilter` | Dropdown `<select>` for UAE / Saudi Arabia / Egypt, emits `onChange(country?)` |
| `OverdueIndicator` | Renders red badge when `isOverdue=true`, neutral otherwise |
| `BarcodeInput` | Text input that auto-submits on barcode scanner pattern detection |

---

## Validation Schemas

```typescript
// packages/server/src/validation/bagSchemas.ts

import { z } from 'zod';

export const bagRegistrationSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(100, 'Barcode too long'),
  storeId: z.string().min(1, 'Store identifier is required'),
});

export const bagPickupSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  orderReference: z.string().max(200).optional(),
});

export const bagReturnSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  storeId: z.string().min(1, 'Store identifier is required'),
});

export const bagStatusChangeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('LOST') }),
  z.object({
    status: z.literal('AVAILABLE'),
    storeId: z.string().min(1, 'Store identifier is required for reactivation'),
  }),
]);

export const countryFilterSchema = z.object({
  country: z.enum(['UAE', 'SAUDI_ARABIA', 'EGYPT']).optional(),
});
```

---

## Service Layer

### bagService.ts

```typescript
// Core service functions (signatures)

export async function registerBag(barcode: string, storeId: string): Promise<Bag>;
export async function pickupBag(barcode: string, driverId: string, orderReference?: string): Promise<{ assignment: BagAssignment; bag: Bag }>;
export async function returnBag(barcode: string, storeId: string): Promise<{ assignment: BagAssignment; bag: Bag }>;
export async function markBagLost(barcode: string): Promise<Bag>;
export async function reactivateBag(barcode: string, storeId: string): Promise<Bag>;
export async function getBagHistory(barcode: string): Promise<BagAssignment[]>;
```

### dashboardService.ts

```typescript
export async function getDriverAccountability(country?: Country): Promise<DriverAccountabilityRow[]>;
export async function getDriverBagDetail(driverId: string): Promise<DriverBagDetail>;
export async function getEndOfDaySummary(country?: Country): Promise<EndOfDaySummaryRow[]>;
```

### Overdue Calculation Logic

```typescript
// Overdue threshold: 4 hours
const OVERDUE_THRESHOLD_HOURS = 4;

function buildOverdueWhereClause(now: Date = new Date()) {
  const threshold = new Date(now.getTime() - OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);
  return {
    returnTime: null,
    pickupTime: { lt: threshold },
  };
}
```

This is a pure function that takes an optional `now` parameter for testability. The threshold is computed at query time (Req 4.2) — no cron jobs or background processes.

---

## Error Handling

All service-layer errors use a consistent error code pattern matching the existing codebase:

| Error Code | HTTP Status | When |
|-----------|-------------|------|
| `NOT_FOUND` | 404 | Barcode or store ID not found |
| `CONFLICT` | 409 | Duplicate barcode or bag already assigned |
| `INVALID_STATUS` | 409 | Bag not in expected status for operation |
| `VALIDATION_ERROR` | 422 | Request body fails Zod validation |

The existing `errorHandler` middleware maps error codes to HTTP status codes. It will be extended to handle `CONFLICT` → 409 and `INVALID_STATUS` → 409.

---

## Authentication & Authorization

The existing `authMiddleware` and `roleGuard` are reused without modification:

| Endpoint | Required Role |
|----------|---------------|
| `POST /api/bags` | MANAGER |
| `POST /api/bags/pickup` | DRIVER |
| `POST /api/bags/return` | DRIVER |
| `PATCH /api/bags/:barcode/status` | MANAGER |
| `GET /api/bags/:barcode/history` | MANAGER |
| `GET /api/dashboard/accountability` | MANAGER |
| `GET /api/dashboard/accountability/:driverId` | MANAGER |
| `GET /api/dashboard/end-of-day` | MANAGER |

---

## Client Components

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| `BagScanPage.tsx` | `/bags/scan` | Barcode scan input for pickup/return (drivers) |
| `BagRegistrationPage.tsx` | `/bags/register` | Bag registration form (managers) |
| `AccountabilityDashboard.tsx` | `/dashboard/accountability` | Driver accountability view (managers) |
| `DriverBagDetail.tsx` | `/dashboard/drivers/:id` | Individual driver bag detail (managers) |
| `EndOfDaySummary.tsx` | `/dashboard/end-of-day` | EOD overdue summary (managers) |
| `BagHistoryPage.tsx` | `/bags/:barcode/history` | Bag assignment history (managers) |

### Shared Components

- `CountryFilter.tsx` — Dropdown to filter by country, used across dashboard pages
- `OverdueIndicator.tsx` — Visual badge (red/yellow) showing overdue status
- `BarcodeInput.tsx` — Text input optimized for barcode scanner input (auto-submit on pattern match)

---

## Migration Strategy

1. **Database migration** — Add `Bag`, `BagAssignment` models and `country` field to `Store`. Non-breaking: all new columns have defaults or are nullable.
2. **Backfill** — Existing stores default to `country: UAE`. No bags exist in v1 so no bag data migration needed.
3. **API versioning** — New endpoints live under `/api/bags` and `/api/dashboard`. Existing `/api/visits`, `/api/stores`, `/api/drivers` remain unchanged.
4. **Client routing** — New pages added to the React router alongside existing pages. No breaking changes to existing views.

---

## Testing Strategy

### Unit Tests (Example-Based)

- **Validation schemas**: Verify Zod schemas accept valid input and reject malformed input with correct error messages
- **Error handling**: Specific scenarios for not-found barcodes, conflict states, invalid status transitions
- **UI components**: Snapshot tests for `CountryFilter`, `OverdueIndicator`, `BarcodeInput`
- **Country enum values**: Verify the system supports exactly UAE, SAUDI_ARABIA, EGYPT (Req 7.1, 7.2)

### Property-Based Tests (fast-check)

Property tests validate universal correctness properties across randomized inputs. The project already has `fast-check@3.21.0` installed as a dev dependency.

Each property test will:
- Run a minimum of 100 iterations
- Generate random valid inputs (barcodes, store IDs, driver IDs, timestamps)
- Verify post-conditions hold for all generated inputs
- Reference the corresponding design property by number

Key property tests:
- Bag registration invariants (Properties 1, 2)
- Pickup/return lifecycle round-trip (Properties 3, 4)
- Overdue calculation correctness (Property 5)
- Dashboard aggregation accuracy (Properties 6, 7)
- Country filter completeness (Property 8)
- Status transition correctness (Properties 9, 10)
- History ordering invariant (Property 11)
- Auth/role enforcement (Properties 12, 13)

### Integration Tests

- **API endpoint tests**: Using supertest against the Express app with a test database
- **Database constraints**: Verify unique constraint on `Bag.barcode` at the database level
- **Transaction atomicity**: Verify that failed operations roll back completely

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Bag registration produces AVAILABLE status with correct store

*For any* valid barcode string and existing store identifier, registering a new bag SHALL produce a Bag record with status `AVAILABLE` and `currentStoreId` equal to the specified store.

**Validates: Requirements 1.1**

### Property 2: Barcode uniqueness enforcement

*For any* barcode that already exists in the system, attempting to register a second bag with the same barcode SHALL be rejected with a conflict error.

**Validates: Requirements 1.2, 1.3**

### Property 3: Pickup creates complete BagAssignment

*For any* AVAILABLE bag and authenticated driver, a pickup request SHALL create a BagAssignment with the driver as assignee, a non-null pickup timestamp, the provided order reference (if any), and SHALL transition the bag status to ASSIGNED.

**Validates: Requirements 2.1, 2.4**

### Property 4: Return completes assignment and restores availability to any store

*For any* ASSIGNED bag and any valid store identifier, a return request SHALL set a non-null return timestamp on the active BagAssignment, set `returnStoreId` to the specified store, transition the bag status to AVAILABLE, and update `currentStoreId` to the return store — regardless of the bag's original store.

**Validates: Requirements 3.1, 3.4**

### Property 5: Overdue query returns exactly bags exceeding 4-hour threshold

*For any* set of BagAssignment records, the overdue query SHALL return exactly those assignments where `returnTime` is null AND `pickupTime + 4 hours < currentTime`, and each result SHALL include the bag barcode, driver name, driver ID, pickup timestamp, and elapsed time.

**Validates: Requirements 4.1, 4.3**

### Property 6: Dashboard aggregation correctness

*For any* set of bag assignments across multiple drivers, the accountability dashboard SHALL return each driver who has at least one active assignment, with `totalBagsOut` equal to the count of their assignments where `returnTime` is null, and `overdueBags` equal to the count of those where `pickupTime + 4 hours < currentTime`.

**Validates: Requirements 5.1, 5.2**

### Property 7: End-of-day summary groups overdue bags by driver

*For any* set of overdue bag assignments, the end-of-day summary SHALL return results grouped by driver, where every returned assignment satisfies `returnTime IS NULL AND pickupTime + 4 hours < currentTime`, and each entry includes barcode, driver name, pickup timestamp, elapsed hours, and order reference.

**Validates: Requirements 6.1, 6.2**

### Property 8: Country filter scoping

*For any* country filter value, all results returned from dashboard and summary endpoints SHALL belong to stores within the specified country. When no country filter is provided, results SHALL span all countries.

**Validates: Requirements 7.3, 7.4**

### Property 9: Mark-as-LOST closes active assignment

*For any* bag in ASSIGNED or AVAILABLE status, marking as LOST SHALL set the bag status to LOST, and if an active BagAssignment exists (returnTime is null), SHALL set its return timestamp to the current time.

**Validates: Requirements 8.1, 8.2**

### Property 10: Reactivation restores AVAILABLE with store association

*For any* LOST bag and any valid store identifier, reactivation SHALL set the bag status to AVAILABLE and update `currentStoreId` to the specified store.

**Validates: Requirements 8.3**

### Property 11: Assignment history ordering

*For any* bag with multiple BagAssignment records, the history endpoint SHALL return all assignments ordered by pickup timestamp descending, and each entry SHALL include driver name, pickup timestamp, return timestamp (or null), and order reference.

**Validates: Requirements 9.1, 9.2**

### Property 12: JWT requirement enforcement

*For any* bag tracking API endpoint, a request without a valid JWT token SHALL receive a 401 unauthorized response.

**Validates: Requirements 10.1, 10.4**

### Property 13: Role-based access enforcement

*For any* endpoint restricted to a specific role, a request from an authenticated user with a different role SHALL receive a 403 forbidden response.

**Validates: Requirements 10.2, 10.3, 10.5**
