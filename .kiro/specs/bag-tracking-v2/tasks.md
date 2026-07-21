# Implementation Plan: Bag Tracking v2

## Overview

Evolve the existing count-based bag reconciliation system into individual bag-level tracking via barcode scans. This plan adds new Prisma models (`Bag`, `BagAssignment`), extends `Store` with a `country` field, implements bag lifecycle API endpoints (registration, pickup, return, status changes, history), driver accountability dashboards, end-of-day summary, and the corresponding React client pages — all layered alongside the existing v1 code with no breaking changes.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add Prisma schema changes for Bag, BagAssignment, BagStatus enum, Country enum, and Store.country field
    - Add `BagStatus` enum (AVAILABLE, ASSIGNED, LOST) and `Country` enum (UAE, SAUDI_ARABIA, EGYPT) to `schema.prisma`
    - Add `Bag` model with fields: id, barcode (unique), status, currentStoreId, createdAt, updatedAt; relation to Store
    - Add `BagAssignment` model with fields: id, bagId, driverId, pickupTime, returnTime, returnStoreId, orderReference, createdAt; relations to Bag, Driver, Store
    - Add `country` field to `Store` with default `UAE`
    - Add `bagAssignments` relation on `Driver`
    - Add `bags` and `returnedAssignments` relations on `Store`
    - _Requirements: 1.1, 2.1, 3.1, 7.1, 7.2, 8.1_

  - [x] 1.2 Generate and apply Prisma migration
    - Run `prisma migrate dev --name add_bag_tracking_v2` to generate the migration SQL
    - Verify the migration is additive and non-breaking
    - Run `prisma generate` to update the Prisma client
    - _Requirements: 1.1, 7.1_

- [x] 2. Server validation and utility layer
  - [x] 2.1 Create bag validation schemas (`packages/server/src/validation/bagSchemas.ts`)
    - Implement Zod schemas: `bagRegistrationSchema`, `bagPickupSchema`, `bagReturnSchema`, `bagStatusChangeSchema`, `countryFilterSchema`
    - Use `z.discriminatedUnion` for status change to distinguish LOST vs AVAILABLE+storeId
    - _Requirements: 1.1, 2.1, 2.4, 3.1, 7.3, 8.1, 8.3_

  - [x] 2.2 Create overdue utility (`packages/server/src/services/overdueUtil.ts`)
    - Implement `buildOverdueWhereClause(now?)` returning Prisma where clause for overdue assignments
    - Implement `isOverdue(pickupTime, now?)` returning boolean
    - Implement `elapsedHours(pickupTime, now?)` returning number
    - Use 4-hour threshold constant
    - _Requirements: 4.1, 4.2_

  - [ ]* 2.3 Write property test for overdue calculation (Property 5)
    - **Property 5: Overdue query returns exactly bags exceeding 4-hour threshold**
    - For any pickupTime and now, `isOverdue` returns true iff elapsed > 4 hours
    - `buildOverdueWhereClause` produces a threshold date exactly 4 hours before `now`
    - **Validates: Requirements 4.1, 4.3**

- [x] 3. Bag service implementation
  - [x] 3.1 Implement `bagService.ts` — registerBag function
    - Verify store exists (throw NOT_FOUND if not)
    - Check barcode uniqueness (throw CONFLICT if duplicate)
    - Create Bag record with status AVAILABLE and specified store
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Implement `bagService.ts` — pickupBag function
    - Look up bag by barcode (throw NOT_FOUND if not found)
    - Check bag status is AVAILABLE (throw CONFLICT if ASSIGNED)
    - Create BagAssignment with driver, pickupTime, optional orderReference
    - Update bag status to ASSIGNED
    - Wrap in Prisma transaction
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Implement `bagService.ts` — returnBag function
    - Look up bag by barcode (throw NOT_FOUND if not found)
    - Check bag status is ASSIGNED (throw CONFLICT if not)
    - Verify return store exists (throw NOT_FOUND if not)
    - Set returnTime and returnStoreId on active BagAssignment
    - Update bag status to AVAILABLE and currentStoreId to return store
    - Wrap in Prisma transaction
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Implement `bagService.ts` — markBagLost and reactivateBag functions
    - `markBagLost`: update bag status to LOST; if active assignment exists, set returnTime
    - `reactivateBag`: verify bag is LOST, update status to AVAILABLE, set currentStoreId
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 3.5 Implement `bagService.ts` — getBagHistory function
    - Query all BagAssignment records for the given barcode
    - Include driver name, pickupTime, returnTime, orderReference
    - Order by pickupTime descending
    - _Requirements: 9.1, 9.2_

  - [ ]* 3.6 Write property tests for bag lifecycle (Properties 1, 2, 3, 4)
    - **Property 1: Bag registration produces AVAILABLE status with correct store**
    - **Property 2: Barcode uniqueness enforcement**
    - **Property 3: Pickup creates complete BagAssignment**
    - **Property 4: Return completes assignment and restores availability to any store**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.4, 3.1, 3.4**

  - [ ]* 3.7 Write property tests for status management (Properties 9, 10)
    - **Property 9: Mark-as-LOST closes active assignment**
    - **Property 10: Reactivation restores AVAILABLE with store association**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Dashboard service implementation
  - [x] 5.1 Implement `dashboardService.ts` — getDriverAccountability function
    - Query all drivers with at least one active (returnTime null) BagAssignment
    - Calculate totalBagsOut and overdueBags per driver using `buildOverdueWhereClause`
    - Accept optional country filter scoping to stores within that country
    - _Requirements: 5.1, 5.2, 7.3, 7.4_

  - [x] 5.2 Implement `dashboardService.ts` — getDriverBagDetail function
    - Query active BagAssignments for a specific driver
    - Include bag barcode, pickupTime, isOverdue flag, elapsedHours
    - _Requirements: 5.4_

  - [x] 5.3 Implement `dashboardService.ts` — getEndOfDaySummary function
    - Query all overdue BagAssignments grouped by driver
    - Include barcode, driver name, pickupTime, elapsedHours, orderReference
    - Accept optional country filter
    - _Requirements: 6.1, 6.2, 7.3, 7.4_

  - [ ]* 5.4 Write property tests for dashboard aggregation (Properties 6, 7, 8)
    - **Property 6: Dashboard aggregation correctness**
    - **Property 7: End-of-day summary groups overdue bags by driver**
    - **Property 8: Country filter scoping**
    - **Validates: Requirements 5.1, 5.2, 6.1, 6.2, 7.3, 7.4**

- [x] 6. API routes — bags router
  - [x] 6.1 Create `bagsRouter.ts` with route wiring and auth middleware
    - Apply `authMiddleware` to all routes
    - `POST /` — MANAGER: validate with `bagRegistrationSchema`, call `registerBag`
    - `POST /pickup` — DRIVER: validate with `bagPickupSchema`, call `pickupBag`
    - `POST /return` — DRIVER: validate with `bagReturnSchema`, call `returnBag`
    - `PATCH /:barcode/status` — MANAGER: validate with `bagStatusChangeSchema`, call markBagLost or reactivateBag
    - `GET /:barcode/history` — MANAGER: call `getBagHistory`
    - _Requirements: 1.1, 2.1, 3.1, 8.1, 8.3, 9.1, 10.1, 10.2, 10.3_

  - [x] 6.2 Create `dashboardRouter.ts` with route wiring and auth middleware
    - Apply `authMiddleware` and `roleGuard('MANAGER')` to all routes
    - `GET /accountability` — validate optional country query param, call `getDriverAccountability`
    - `GET /accountability/:driverId` — call `getDriverBagDetail`
    - `GET /end-of-day` — validate optional country query param, call `getEndOfDaySummary`
    - _Requirements: 5.1, 5.4, 6.1, 7.3, 10.2_

  - [x] 6.3 Register new routers in `app.ts`
    - Import and mount `bagsRouter` at `/api/bags`
    - Import and mount `dashboardRouter` at `/api/dashboard`
    - _Requirements: 10.1_

  - [ ]* 6.4 Write property tests for auth/role enforcement (Properties 12, 13)
    - **Property 12: JWT requirement enforcement**
    - **Property 13: Role-based access enforcement**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Client shared components
  - [x] 8.1 Create `CountryFilter.tsx` shared component
    - Dropdown `<select>` with options: All Countries, UAE, Saudi Arabia, Egypt
    - Accepts `value` and `onChange(country?: string)` props
    - Style with Tailwind to match existing UI
    - _Requirements: 7.3_

  - [x] 8.2 Create `OverdueIndicator.tsx` shared component
    - Accepts `isOverdue: boolean` prop
    - Renders red badge text when overdue, neutral otherwise
    - _Requirements: 5.4, 6.2_

  - [x] 8.3 Create `BarcodeInput.tsx` shared component
    - Text input optimized for barcode scanner input
    - Auto-submit on Enter key or barcode scanner pattern detection
    - Accepts `onScan(barcode: string)` callback prop
    - _Requirements: 2.1, 3.1_

- [x] 9. Client pages — bag management
  - [x] 9.1 Create `BagRegistrationPage.tsx`
    - Form with barcode text input and store selector dropdown
    - Calls `POST /api/bags` on submit
    - Shows success/error feedback (conflict for duplicate barcode, not-found for invalid store)
    - Accessible to MANAGER role only (route guard)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 9.2 Create `BagScanPage.tsx`
    - Uses `BarcodeInput` component for barcode scanning
    - Toggle or buttons for Pickup vs Return mode
    - Pickup mode: calls `POST /api/bags/pickup` with optional order reference
    - Return mode: calls `POST /api/bags/return` with store selector
    - Shows success/error feedback
    - Accessible to DRIVER role only (route guard)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 9.3 Create `BagHistoryPage.tsx`
    - Fetches from `GET /api/bags/:barcode/history`
    - Displays table of assignment records: driver name, pickup time, return time, order reference
    - Sorted by pickup time descending
    - Accessible to MANAGER role only
    - _Requirements: 9.1, 9.2_

- [x] 10. Client pages — dashboards
  - [x] 10.1 Create `AccountabilityDashboard.tsx`
    - Includes `CountryFilter` component for filtering
    - Fetches from `GET /api/dashboard/accountability`
    - Table with columns: Driver name, Total bags out, Overdue bags count
    - Each row links to `DriverBagDetail` page
    - Accessible to MANAGER role only
    - _Requirements: 5.1, 5.2, 5.3, 7.3_

  - [x] 10.2 Create `DriverBagDetail.tsx`
    - Fetches from `GET /api/dashboard/accountability/:driverId`
    - Displays list of bags currently assigned to driver
    - Each bag shows: barcode, pickup time, `OverdueIndicator`
    - _Requirements: 5.4_

  - [x] 10.3 Create `EndOfDaySummary.tsx`
    - Includes `CountryFilter` component for filtering
    - Fetches from `GET /api/dashboard/end-of-day`
    - Consolidated list grouped by driver: barcode, pickup time, elapsed hours, order reference
    - No navigation to individual driver views needed (self-contained view)
    - Accessible to MANAGER role only
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Client routing and navigation
  - [x] 11.1 Update `App.tsx` with new routes and navigation
    - Add routes: `/bags/scan`, `/bags/register`, `/bags/:barcode/history`, `/dashboard/accountability`, `/dashboard/drivers/:id`, `/dashboard/end-of-day`
    - Protect routes with appropriate role guards (DRIVER for scan, MANAGER for all others)
    - Update `NavBar.tsx` to include links to new pages based on user role
    - _Requirements: 5.3, 5.4, 6.3, 10.2, 10.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The migration is fully additive — existing v1 functionality remains untouched
- All existing stores default to `country: UAE` after migration
- The project uses Jest + fast-check for testing on the server side

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["3.6", "3.7", "5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "10.1", "10.2", "10.3"] },
    { "id": 9, "tasks": ["11.1"] }
  ]
}
```
