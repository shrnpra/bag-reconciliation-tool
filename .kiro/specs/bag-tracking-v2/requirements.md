# Requirements Document

## Introduction

Bag Tracking v2 introduces individual bag-level tracking by barcode to the existing bag reconciliation tool. Instead of tracking aggregate bag counts per driver/store, the system tracks each physical bag through its lifecycle (available → assigned → returned) with full assignment history. This enables driver accountability dashboards showing bags currently out and overdue bags, and an end-of-day summary for managers to act on unreturned bags. The system supports multi-country operations (UAE, Saudi Arabia, Egypt) with a Country → Store hierarchy.

## Glossary

- **Bag_Tracking_System**: The server-side application responsible for managing bag lifecycle, assignments, and accountability queries
- **Client_Application**: The React front-end that drivers and managers interact with to scan barcodes, view dashboards, and manage bags
- **Bag**: A reusable, pooled physical delivery bag identified by a unique barcode, not permanently assigned to any driver
- **BagAssignment**: A record linking a specific Bag to a Driver for a time period, including pickup timestamp, optional return timestamp, and order reference
- **Barcode**: A unique string identifier printed on each physical bag, used for scanning during pickup and return events
- **Overdue_Threshold**: A fixed 4-hour window calculated at query time as pickup timestamp plus 4 hours compared to the current server time
- **Driver**: An authenticated user with the DRIVER role who picks up and returns bags
- **Manager**: An authenticated user with the MANAGER role who views dashboards and manages bags/stores
- **Store**: A physical location where bags are stored, belonging to a specific country
- **Country**: A top-level geographic grouping for stores; initial values are UAE, Saudi Arabia, and Egypt

## Requirements

### Requirement 1: Bag Registration

**User Story:** As a Manager, I want to register new bags with unique barcodes assigned to a store, so that bags enter the tracking system and are available for pickup.

#### Acceptance Criteria

1. WHEN a Manager submits a bag registration request with a barcode and store identifier, THE Bag_Tracking_System SHALL create a new Bag record with status AVAILABLE and associate the Bag with the specified Store.
2. THE Bag_Tracking_System SHALL enforce barcode uniqueness across all Bags in the system.
3. IF a bag registration request contains a barcode that already exists, THEN THE Bag_Tracking_System SHALL reject the request and return a conflict error indicating the barcode is already registered.
4. IF a bag registration request references a store identifier that does not exist, THEN THE Bag_Tracking_System SHALL reject the request and return a not-found error.

### Requirement 2: Bag Pickup (Assignment)

**User Story:** As a Driver, I want to scan a bag barcode to record that I am picking it up, so that the system knows which bags I have.

#### Acceptance Criteria

1. WHEN a Driver submits a pickup request with a bag barcode, THE Bag_Tracking_System SHALL create a new BagAssignment record with the current timestamp as the pickup time, the authenticated Driver as the assignee, and update the Bag status to ASSIGNED.
2. IF a pickup request references a Bag that is currently in ASSIGNED status, THEN THE Bag_Tracking_System SHALL reject the request and return an error indicating the Bag is already checked out.
3. IF a pickup request references a barcode that does not exist in the system, THEN THE Bag_Tracking_System SHALL reject the request and return a not-found error.
4. WHEN a pickup request is submitted, THE Bag_Tracking_System SHALL accept an optional order reference string and store the order reference on the BagAssignment record.

### Requirement 3: Bag Return (Scan-In)

**User Story:** As a Driver, I want to scan a bag barcode when returning it to a store, so that the system records the return and clears my accountability for that bag.

#### Acceptance Criteria

1. WHEN a Driver submits a return request with a bag barcode and a store identifier, THE Bag_Tracking_System SHALL set the return timestamp on the active BagAssignment record, update the Bag status to AVAILABLE, and associate the Bag with the specified return Store.
2. IF a return request references a Bag that is not currently in ASSIGNED status, THEN THE Bag_Tracking_System SHALL reject the request and return an error indicating the Bag is not currently checked out.
3. IF a return request references a barcode that does not exist in the system, THEN THE Bag_Tracking_System SHALL reject the request and return a not-found error.
4. THE Bag_Tracking_System SHALL allow a Bag to be returned to any Store, regardless of the Store from which the Bag was originally picked up.

### Requirement 4: Overdue Bag Calculation

**User Story:** As a Manager, I want to see which bags are overdue so that I can follow up with the responsible drivers.

#### Acceptance Criteria

1. WHEN a query for overdue bags is received, THE Bag_Tracking_System SHALL identify all BagAssignment records where the return timestamp is null and the pickup timestamp plus the Overdue_Threshold (4 hours) is earlier than the current server time.
2. THE Bag_Tracking_System SHALL calculate overdue status at query time without relying on scheduled jobs or background processes.
3. WHEN returning overdue bag data, THE Bag_Tracking_System SHALL include the Bag barcode, the assigned Driver name and identifier, the pickup timestamp, and the elapsed time since pickup.

### Requirement 5: Driver Accountability Dashboard

**User Story:** As a Manager, I want to view a dashboard showing bags currently out and overdue bags per driver, so that I can hold drivers accountable.

#### Acceptance Criteria

1. WHEN a Manager requests the driver accountability dashboard, THE Bag_Tracking_System SHALL return a list of all Drivers who currently have at least one Bag in ASSIGNED status, along with the count of assigned bags per Driver.
2. WHEN a Manager requests the driver accountability dashboard, THE Bag_Tracking_System SHALL include the count of overdue bags per Driver, calculated using the Overdue_Threshold.
3. THE Client_Application SHALL display the driver accountability dashboard with columns for Driver name, total bags out, and overdue bag count.
4. WHEN a Manager selects a specific Driver on the dashboard, THE Client_Application SHALL display the list of individual Bags currently assigned to that Driver, including barcode, pickup timestamp, and overdue indicator.

### Requirement 6: End-of-Day Summary

**User Story:** As a Manager, I want an end-of-day summary view of all overdue bags across all drivers, so that I can take action on unreturned bags before closing.

#### Acceptance Criteria

1. WHEN a Manager requests the end-of-day summary, THE Bag_Tracking_System SHALL return all BagAssignment records where the return timestamp is null and the pickup timestamp plus the Overdue_Threshold is earlier than the current server time, grouped by Driver.
2. WHEN returning end-of-day summary data, THE Bag_Tracking_System SHALL include for each overdue BagAssignment: the Bag barcode, the Driver name, the pickup timestamp, the elapsed hours, and the order reference if available.
3. THE Client_Application SHALL display the end-of-day summary as a consolidated list that a Manager can review and act upon without navigating to individual driver views.

### Requirement 7: Multi-Country Store Organization

**User Story:** As a Manager, I want stores to be organized by country, so that I can filter and manage bags across different geographic regions.

#### Acceptance Criteria

1. THE Bag_Tracking_System SHALL associate each Store with exactly one Country value.
2. THE Bag_Tracking_System SHALL support the following initial Country values: UAE, Saudi Arabia, and Egypt.
3. WHEN a Manager requests bag or dashboard data, THE Bag_Tracking_System SHALL accept an optional country filter parameter and return results scoped to Stores within the specified Country.
4. WHEN no country filter is provided, THE Bag_Tracking_System SHALL return results across all Countries.

### Requirement 8: Bag Status Management

**User Story:** As a Manager, I want to mark a bag as lost when it cannot be recovered, so that the system reflects the actual state of physical bags.

#### Acceptance Criteria

1. WHEN a Manager submits a status change request to mark a Bag as LOST, THE Bag_Tracking_System SHALL update the Bag status to LOST and set the return timestamp on any active BagAssignment for that Bag.
2. IF a Bag is in AVAILABLE status and a Manager marks the Bag as LOST, THEN THE Bag_Tracking_System SHALL update the Bag status to LOST without requiring an active BagAssignment.
3. WHEN a Manager submits a request to reactivate a LOST Bag, THE Bag_Tracking_System SHALL update the Bag status to AVAILABLE and associate the Bag with a specified Store.

### Requirement 9: Bag Assignment History

**User Story:** As a Manager, I want to view the full assignment history of a specific bag, so that I can audit its usage over time.

#### Acceptance Criteria

1. WHEN a Manager requests the assignment history for a specific Bag barcode, THE Bag_Tracking_System SHALL return all BagAssignment records for that Bag ordered by pickup timestamp descending.
2. WHEN returning assignment history data, THE Bag_Tracking_System SHALL include for each BagAssignment: the Driver name, pickup timestamp, return timestamp (or null if still assigned), and order reference.

### Requirement 10: Authorization Enforcement

**User Story:** As a system administrator, I want role-based access control enforced on all bag tracking endpoints, so that only authorized users can perform actions.

#### Acceptance Criteria

1. THE Bag_Tracking_System SHALL require a valid JWT token for all bag tracking API endpoints.
2. THE Bag_Tracking_System SHALL restrict bag registration, status changes (LOST/reactivate), and dashboard/summary queries to users with the MANAGER role.
3. THE Bag_Tracking_System SHALL restrict bag pickup and bag return operations to users with the DRIVER role.
4. IF a request is made without a valid JWT token, THEN THE Bag_Tracking_System SHALL return a 401 unauthorized error.
5. IF a request is made by a user whose role does not match the required role for the endpoint, THEN THE Bag_Tracking_System SHALL return a 403 forbidden error.
