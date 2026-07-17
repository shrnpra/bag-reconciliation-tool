# Design Document: Bag Reconciliation Tool

## Overview

The Bag Reconciliation Tool is a full-stack web application that lets drivers record bag check-ins and check-outs at store locations, and lets fleet managers monitor bag inventory and resolve discrepancies. It is deployed on Railway as a single service exposing both a REST API and a server-rendered / SPA frontend.

### Goals

- Simple, mobile-friendly UI that drivers can use on a phone in the field
- Real-time inventory tracking with < 5-second consistency guarantee
- Permanent, append-only audit trail for all bag movements
- Discrepancy detection and resolution workflow for fleet managers

### Non-Goals

- Native mobile app (responsive web covers the driver use-case)
- Advanced analytics / BI dashboards (basic reports are sufficient)
- Multi-tenant / multi-company deployment

---

## Architecture

The application follows a **monolithic three-tier architecture** on Railway:

```
┌──────────────────────────────────────────────────────┐
│                   Railway Service                    │
│                                                      │
│  ┌─────────────┐      ┌───────────────────────────┐  │
│  │  React SPA  │◄────►│   Node.js / Express API   │  │
│  │  (served    │      │   (REST + auth middleware)│  │
│  │  from /     │      └───────────┬───────────────┘  │
│  │  via API)   │                  │                  │
│  └─────────────┘        ┌─────────▼──────────┐       │
│                         │  PostgreSQL (via   │       │
│                         │  Railway Postgres  │       │
│                         │  plugin)           │       │
│                         └────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

**Technology choices:**

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Fast iteration, mobile-friendly with Tailwind, easy Vite build |
| Backend API | Node.js + Express | Lightweight, Railway deploys easily, shared TypeScript types with frontend |
| Database | PostgreSQL (Railway plugin) | ACID transactions needed for atomic inventory updates; Railway plugin is zero-config |
| ORM | Prisma | Type-safe queries, migration tooling, works well on Railway |
| Auth | JWT (simple email/password) | Drivers and managers need role-based access; no SSO required |
| Build | Vite builds frontend static files, Express serves them | Single Railway service, no separate static host needed |

**Deployment on Railway:**
- One Railway service running `node dist/server.js`
- Vite build output (`dist/public`) is served by Express at `/`
- API routes live at `/api/*`
- Railway Postgres plugin provides `DATABASE_URL` environment variable
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `PORT`

---

## Components and Interfaces

### Frontend Pages

| Route | Component | User Role |
|---|---|---|
| `/login` | LoginPage | All |
| `/dashboard` | Dashboard | Driver / Manager |
| `/checkout` | CheckOutForm | Driver |
| `/checkin` | CheckInForm | Driver |
| `/inventory` | InventoryView | Manager |
| `/discrepancies` | DiscrepancyList | Manager |
| `/reports` | ReportView | Manager |
| `/admin/drivers` | DriversAdmin | Manager |
| `/admin/stores` | StoresAdmin | Manager |
| `/history/:type/:id` | VisitHistory | Driver / Manager |

### REST API Endpoints

**Auth**
```
POST /api/auth/login
POST /api/auth/logout
```

**Drivers**
```
GET    /api/drivers
POST   /api/drivers
GET    /api/drivers/:id
PATCH  /api/drivers/:id
GET    /api/drivers/:id/inventory
GET    /api/drivers/:id/visits
GET    /api/drivers/:id/report
```

**Stores**
```
GET    /api/stores
POST   /api/stores
GET    /api/stores/:id
PATCH  /api/stores/:id
GET    /api/stores/:id/inventory
GET    /api/stores/:id/visits
GET    /api/stores/:id/report
```

**Visits**
```
POST   /api/visits/checkout
POST   /api/visits/checkin
GET    /api/visits/:id
```

**Discrepancies**
```
GET    /api/discrepancies?status=open
PATCH  /api/discrepancies/:id/resolve
```

### Middleware

- `authMiddleware` — validates JWT, attaches `req.user` (id, role)
- `roleGuard('manager')` — 403 if user is not a fleet manager
- `requestLogger` — logs method, path, status, duration
- `errorHandler` — normalises errors to `{ error: string, fields?: string[] }` JSON responses

---

## Data Models

### Prisma Schema (PostgreSQL)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role
  createdAt    DateTime @default(now())

  driverProfile Driver?
  auditEntries  AuditLog[]
}

enum Role {
  DRIVER
  MANAGER
}

model Driver {
  id           String   @id  // user-supplied, 1-50 chars
  name         String           // 1-100 chars
  email        String?
  phone        String?
  status       RecordStatus @default(DRAFT)
  bagInventory Int          @default(0)
  userId       String       @unique
  user         User         @relation(fields: [userId], references: [id])
  visits       Visit[]
  discrepancies Discrepancy[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Store {
  id           String       @id  // user-supplied, 1-50 chars
  name         String            // 1-100 chars
  address      String            // 1-200 chars
  status       RecordStatus @default(DRAFT)
  bagInventory Int          @default(0)
  visits       Visit[]
  discrepancies Discrepancy[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

enum RecordStatus {
  DRAFT
  ACTIVE
}

model Visit {
  id           String      @id @default(cuid())
  type         VisitType
  driverId     String
  storeId      String
  bagCount     Int
  timestamp    DateTime    @default(now())   // UTC
  status       VisitStatus @default(PENDING)
  performedBy  String      // User.id of authenticated user

  driver       Driver      @relation(fields: [driverId], references: [id])
  store        Store       @relation(fields: [storeId], references: [id])
  discrepancy  Discrepancy?
  auditEntries AuditLog[]
}

enum VisitType {
  CHECK_IN
  CHECK_OUT
}

enum VisitStatus {
  PENDING
  REQUIRES_REVIEW
  COMPLETED
}

model Discrepancy {
  id              String             @id @default(cuid())
  visitId         String             @unique
  driverId        String
  storeId         String
  expectedCount   Int
  actualCount     Int
  difference      Int
  timestamp       DateTime           @default(now())
  status          DiscrepancyStatus  @default(OPEN)
  resolutionNote  String?
  resolvedBy      String?            // User.id
  resolvedAt      DateTime?

  visit           Visit              @relation(fields: [visitId], references: [id])
  driver          Driver             @relation(fields: [driverId], references: [id])
  store           Store              @relation(fields: [storeId], references: [id])
}

enum DiscrepancyStatus {
  OPEN
  RESOLVED
}

model AuditLog {
  id           String   @id @default(cuid())
  action       String   // e.g. "CHECK_IN", "CHECK_OUT", "RESOLVE_DISCREPANCY"
  performedBy  String   // User.id
  visitId      String?
  discrepancyId String?
  timestamp    DateTime @default(now())

  user         User     @relation(fields: [performedBy], references: [id])
  visit        Visit?   @relation(fields: [visitId], references: [id])
}
```

### Key Design Decisions

**Atomic inventory updates**: Check-in and check-out use a Prisma `$transaction` to update both the driver and store `bagInventory` fields in the same database transaction — satisfying requirement 2.7 (roll back both on failure).

**Append-only records**: No `DELETE` endpoints are exposed for Visit or Discrepancy records. Updates to Driver/Store status are additive (DRAFT → ACTIVE). AuditLog is insert-only.

**Discrepancy upsert on check-in**: When a check-in creates a discrepancy and the Visit already has one (requirement 6.6), the code does an upsert keyed on `visitId`.

**Opening inventory for reports**: The report query sums all movements before the report start date to derive the opening inventory, then replays movements within the date range. This avoids storing snapshots while still supporting accurate reports.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Inventory conservation on check-out

*For any* valid check-out transaction, the sum of (driver.bagInventory + store.bagInventory) before the operation shall equal the sum of (driver.bagInventory + store.bagInventory) after the operation — bags are transferred, not created or destroyed.

**Validates: Requirements 2.2, 2.3**

---

### Property 2: Inventory conservation on check-in

*For any* valid check-in transaction (including those that produce a discrepancy), the sum of (driver.bagInventory + store.bagInventory) before the operation shall equal the sum of (driver.bagInventory + store.bagInventory) after the operation.

**Validates: Requirements 3.2, 3.3**

---

### Property 3: Check-out rejected when driver inventory insufficient

*For any* check-out request where the requested bag count exceeds the driver's current bagInventory, the system SHALL reject the request and leave both the driver's and store's bagInventory unchanged.

**Validates: Requirements 2.5**

---

### Property 4: Discrepancy created iff actual exceeds store inventory

*For any* check-in where the requested bag count exceeds the store's current bagInventory, the system SHALL create exactly one Discrepancy record containing the expected count, actual count, numeric difference, driver id, store id, UTC timestamp, and status "open", and set the Visit status to "requires_review". *For any* check-in where the bag count does not exceed the store's inventory, no Discrepancy record is created.

**Validates: Requirements 3.4, 6.1, 6.2**

---

### Property 5: Report arithmetic invariant

*For any* reconciliation report over any valid date range for any driver or store, the closing bagInventory SHALL equal the opening bagInventory plus the sum of all check-in bag counts minus the sum of all check-out bag counts in that range. If the stored closing value does not match, the report SHALL be flagged as containing a calculation error with the expected versus actual closing count.

**Validates: Requirements 5.1, 5.2, 5.4, 5.5**

---

### Property 6: Duplicate discrepancy prevention (idempotence)

*For any* visit, there SHALL be at most one Discrepancy record regardless of how many check-ins are recorded for that visit. A subsequent check-in for the same visit SHALL update the existing Discrepancy record rather than inserting a new one.

**Validates: Requirements 6.6**

---

### Property 7: Validation rejects empty or out-of-range bag counts

*For any* check-in or check-out request where the bag count is ≤ 0, or where a check-in bag count is > 999, or where any required field (driver id, store id, bag count) is missing, the system SHALL return a validation error identifying the invalid fields and leave all inventories unchanged.

**Validates: Requirements 2.4, 3.5**

---

### Property 8: Driver and store field constraints enforced on all inputs

*For any* driver or store registration request, the system SHALL accept the record only if the identifier is 1–50 characters, the name is 1–100 characters, and the address (store) or at least one contact field (driver) is present and within length limits. Any record violating these constraints SHALL be rejected with a descriptive validation error.

**Validates: Requirements 1.1, 1.2**

---

### Property 9: Duplicate identifier rejection for drivers and stores

*For any* driver or store identifier that already exists in the registry, a subsequent registration attempt using the same identifier SHALL be rejected with a conflict error identifying the duplicate identifier, leaving the existing record unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 10: Visit history is always in reverse chronological order

*For any* driver or store with any number of visits, querying visit history SHALL return all visits in strictly reverse chronological order (most recent first), and when a date range filter is applied, SHALL return only visits whose timestamps fall within the inclusive start and end dates.

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 11: All records have unique identifiers and complete audit entries

*For any* set of check-in or check-out operations performed by any authenticated user, every resulting Visit record SHALL have a globally unique immutable identifier, every resulting Discrepancy record SHALL have a globally unique immutable identifier, and every resulting AuditLog entry SHALL record the performing user's identifier and the affected Visit or Discrepancy identifier.

**Validates: Requirements 8.3, 8.4, 8.5, 8.6**

---

### Property 12: Inventory list is always sorted by identifier ascending

*For any* query of all drivers' or all stores' bag inventories, the system SHALL return the results as a list of (identifier, bagInventory) pairs sorted by identifier in ascending lexicographic order.

**Validates: Requirements 4.5**

---

## Error Handling

All API errors are returned as JSON with a consistent shape:

```json
{
  "error": "Human-readable message",
  "fields": ["fieldName"]   // optional, for validation errors
}
```

| Scenario | HTTP Status |
|---|---|
| Missing/invalid JWT | 401 |
| Insufficient role | 403 |
| Resource not found | 404 |
| Validation error (missing/bad fields) | 422 |
| Duplicate identifier | 409 |
| Insufficient driver inventory | 409 |
| Transaction rollback | 500 |
| Unexpected server error | 500 |

**Transaction failure handling**: The check-in and check-out service functions use `prisma.$transaction`. If any operation inside fails, Prisma rolls back the entire transaction before the error is surfaced to the route handler, which then returns a 500 with a generic message. No partial inventory updates are committed.

**Frontend error display**: The React UI maps API error responses to inline field errors (for 422) or toast notifications (for 4xx/5xx), so drivers get clear feedback on the mobile form.

---

## Testing Strategy

### Unit Tests (Jest + ts-jest)

Focused on pure logic:
- Validation functions (bag count ranges, required fields, identifier length)
- Report arithmetic (opening inventory + movements = closing inventory)
- Discrepancy detection logic (expected vs actual count comparison)
- Error message formatting

### Property-Based Tests (fast-check, minimum 100 iterations each)

Each property test is tagged with a reference to its design property.

| Test file | Property tested | Design reference |
|---|---|---|
| `checkout.property.test.ts` | Inventory sum is conserved after check-out | Property 1 |
| `checkin.property.test.ts` | Inventory sum is conserved after check-in | Property 2 |
| `checkout.property.test.ts` | Reject check-out when driver inventory < count | Property 3 |
| `discrepancy.property.test.ts` | Discrepancy created iff actual > store inventory | Property 4 |
| `report.property.test.ts` | Report closing = opening + net movements | Property 5 |
| `discrepancy.property.test.ts` | At most one discrepancy per visit | Property 6 |
| `validation.property.test.ts` | Invalid bag counts always rejected | Property 7 |
| `registration.property.test.ts` | Field constraints enforced on driver/store registration | Property 8 |
| `registration.property.test.ts` | Duplicate identifier rejection | Property 9 |
| `history.property.test.ts` | Visit history reverse chronological order and date filter | Property 10 |
| `audit.property.test.ts` | Unique ids and complete audit entries for all events | Property 11 |
| `inventory.property.test.ts` | Inventory list sorted by id ascending | Property 12 |

Property tests use in-memory mocks (not the real database) so 100 iterations are fast and cost-free. A separate integration test suite runs against a test Postgres instance (via Docker in CI).

Tag format: `// Feature: bag-reconciliation-tool, Property N: <property_text>`

### Integration Tests (Supertest + test Postgres)

- Full request-response cycles for each API endpoint
- Happy-path and error-path for check-in, check-out, report generation
- Transaction rollback behavior (simulated DB failure)
- Auth and role enforcement

### End-to-End (Playwright)

- Driver login → check-out flow on mobile viewport
- Fleet manager login → view discrepancies → resolve
- Report generation with date range filter

### Testing Balance

Unit and property tests cover correctness; integration tests cover wiring; E2E tests cover critical user flows. Unit tests are kept minimal — property tests handle broad input coverage. The goal is a fast feedback loop with `jest --testPathPattern unit` and a slower but thorough `jest` run for full coverage.
