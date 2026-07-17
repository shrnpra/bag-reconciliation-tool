# Requirements Document

## Introduction

The Bag Reconciliation Tool is a system that enables drivers to track, manage, and reconcile ice cream bags at store locations. Drivers are responsible for delivering insulated bags to stores and collecting them on return visits. This tool provides a structured way to record bag check-ins and check-outs at each store, identify discrepancies between expected and actual bag counts, and maintain an accurate running inventory of bags per driver and per store.

## Glossary

- **Driver**: A delivery person responsible for transporting ice cream products and managing bags at store locations.
- **Store**: A retail location where ice cream products are delivered and bags are dropped off or collected.
- **Bag**: An insulated carrier used to transport ice cream products between the warehouse and store locations.
- **Reconciliation**: The process of comparing expected bag counts against actual bag counts to identify discrepancies.
- **Check-Out**: The act of a driver recording bags left at a store during a delivery visit.
- **Check-In**: The act of a driver recording bags collected from a store during a pickup visit.
- **Discrepancy**: A difference between the expected number of bags at a location and the actual count recorded by a driver.
- **Bag_Inventory**: The real-time count of bags attributed to a specific driver or store at any given time.
- **Reconciliation_Report**: A summary document showing bag movements, current counts, and any discrepancies for a given driver, store, or time period.
- **Visit**: A single trip by a driver to a store, during which bags may be checked in or checked out.
- **System**: The Bag Reconciliation Tool software application.

---

## Requirements

### Requirement 1: Driver and Store Management

**User Story:** As a fleet manager, I want to register drivers and stores in the system, so that bag movements can be accurately attributed to the correct people and locations.

#### Acceptance Criteria

1. THE System SHALL maintain a registry of drivers with unique identifiers (1–50 characters), names (1–100 characters), and at least one contact field (email address or phone number).
2. THE System SHALL maintain a registry of stores with unique identifiers (1–50 characters), names (1–100 characters), and a street address (1–200 characters).
3. WHEN a duplicate driver identifier is submitted, THE System SHALL reject the entry and return a descriptive error message identifying the conflicting identifier.
4. WHEN a duplicate store identifier is submitted, THE System SHALL reject the entry and return a descriptive error message identifying the conflicting identifier.
5. THE System SHALL allow driver and store records to be saved as drafts, provided a unique identifier is present; missing required fields are permitted in draft state.
6. WHEN a draft driver or store record is activated, THE System SHALL validate that all required fields (identifier, name, and contact/address information) are present, and IF any required field is missing, THE System SHALL return a validation error identifying each missing field and the record SHALL remain in draft state.

---

### Requirement 2: Bag Check-Out at Store

**User Story:** As a driver, I want to record the number of bags I leave at a store during a delivery, so that there is an accurate record of bags dropped off at each location.

#### Acceptance Criteria

1. WHEN a driver records a check-out at a store, THE System SHALL create a Visit record containing the driver identifier, store identifier, bag count, and a system-generated UTC timestamp.
2. WHEN a check-out is recorded, THE System SHALL increment the store's Bag_Inventory by the checked-out bag count.
3. WHEN a check-out is recorded, THE System SHALL decrement the driver's available Bag_Inventory by the checked-out bag count.
4. IF required fields (driver identifier, store identifier, or bag count) are missing from a check-out request, OR IF the bag count is less than or equal to zero, THEN THE System SHALL return a validation error identifying the invalid or missing fields without processing the request further.
5. IF all required fields are present AND the bag count is a positive integer AND the driver's available Bag_Inventory is less than the requested check-out count, THEN THE System SHALL reject the request and return an insufficient inventory error.
6. WHEN a check-out is successfully recorded, THE System SHALL return a confirmation with the updated Bag_Inventory for both the driver and the store.
7. WHEN a check-out is recorded, IF either the store Bag_Inventory increment or the driver Bag_Inventory decrement fails, THEN THE System SHALL roll back both inventory updates and return an error, leaving both inventories unchanged.

---

### Requirement 3: Bag Check-In at Store

**User Story:** As a driver, I want to record the number of bags I collect from a store during a pickup, so that bags retrieved from stores are accurately tracked.

#### Acceptance Criteria

1. WHEN a driver records a check-in at a store, THE System SHALL create a Visit record containing the driver identifier, store identifier, a bag count in the range 1–999, and a system-generated UTC timestamp.
2. WHEN a check-in is recorded, THE System SHALL decrement the store's Bag_Inventory by the checked-in bag count.
3. WHEN a check-in is recorded, THE System SHALL increment the driver's available Bag_Inventory by the checked-in bag count.
4. WHEN a check-in is recorded AND the requested bag count exceeds the store's current Bag_Inventory, THE System SHALL still record the check-in Visit, set a discrepancy flag on the Visit record, create a Discrepancy record capturing the requested count and the store's Bag_Inventory at the time of the check-in, and proceed with updating both inventories using the requested bag count.
5. IF required fields (driver identifier, store identifier, or bag count) are missing from a check-in request, OR IF the bag count is outside the valid range (1–999), THEN THE System SHALL return a validation error identifying the invalid or missing fields without processing the request further.
6. WHEN a check-in is successfully recorded, THE System SHALL return a confirmation with the updated Bag_Inventory for both the driver and the store.

---

### Requirement 4: Bag Inventory Tracking

**User Story:** As a fleet manager, I want to view the current bag inventory for any driver or store at any time, so that I can monitor bag distribution across the fleet.

#### Acceptance Criteria

1. THE System SHALL maintain a Bag_Inventory count for each registered driver that reflects all completed bag transactions within 5 seconds of each transaction.
2. THE System SHALL maintain a Bag_Inventory count for each registered store that reflects all completed bag transactions within 5 seconds of each transaction.
3. WHEN a bag inventory query is submitted for a driver, THE System SHALL return the driver's identifier and current Bag_Inventory count.
4. WHEN a bag inventory query is submitted for a store, THE System SHALL return the store's identifier and current Bag_Inventory count.
5. WHEN a bag inventory query is submitted for all drivers or all stores, THE System SHALL return a list of identifier and current Bag_Inventory count pairs sorted by identifier in ascending order.
6. IF a query references a driver or store identifier that does not exist, THEN THE System SHALL return a not-found error.
7. IF a bag inventory query is submitted with a missing or malformed identifier, THEN THE System SHALL return a validation error identifying the problem without performing any lookup.

---

### Requirement 5: Reconciliation Report Generation

**User Story:** As a fleet manager, I want to generate reconciliation reports for drivers and stores, so that I can identify bag discrepancies and take corrective action.

#### Acceptance Criteria

1. WHEN a Reconciliation_Report is requested for a driver, THE System SHALL include all Visits for that driver within the specified date range, the opening Bag_Inventory (the Bag_Inventory count at the start of the first day of the date range), all check-in and check-out movements in chronological order, and the closing Bag_Inventory (the Bag_Inventory count at the end of the last day of the date range).
2. WHEN a Reconciliation_Report is requested for a store, THE System SHALL include all Visits to that store within the specified date range, the opening Bag_Inventory, all check-in and check-out movements in chronological order, and the closing Bag_Inventory.
3. WHEN a Reconciliation_Report is generated, THE System SHALL include a list of all flagged Discrepancies within the requested date range.
4. WHEN a Reconciliation_Report is generated, THE System SHALL verify that the closing Bag_Inventory equals the opening Bag_Inventory plus the sum of all check-in bag counts minus the sum of all check-out bag counts within the date range.
5. IF the closing Bag_Inventory does not equal the opening Bag_Inventory plus net movements, THEN THE System SHALL flag the report as containing a calculation error and include the expected versus actual closing count.
6. IF a date range is not provided for a Reconciliation_Report request, THEN THE System SHALL default to the current calendar day.
7. IF no Visits exist for the requested entity within the date range, THE System SHALL return the report with zero movements and equal opening and closing Bag_Inventory counts.
8. WHEN a Reconciliation_Report is requested for a driver or store identifier that does not exist, THE System SHALL return a not-found error.

---

### Requirement 6: Discrepancy Detection and Flagging

**User Story:** As a fleet manager, I want the system to automatically detect and flag bag count discrepancies, so that I can investigate and resolve missing or excess bags promptly.

#### Acceptance Criteria

1. WHEN the actual bag count recorded during a check-in is greater than zero AND differs from the store's recorded Bag_Inventory, THE System SHALL create a Discrepancy record with the expected count, actual count, numeric difference, driver identifier, store identifier, and UTC timestamp. The initial status of the Discrepancy record SHALL be "open".
2. WHEN a Discrepancy is created, THE System SHALL set the associated Visit's status to "requires_review".
3. WHEN a fleet manager queries open discrepancies, THE System SHALL return all Discrepancy records with status "open" sorted by timestamp in descending order.
4. WHEN a fleet manager marks a Discrepancy as resolved with a resolution note, THE System SHALL update the Discrepancy status to "resolved" and record the resolution note and the fleet manager's identifier.
5. IF a resolution note is not provided when resolving a Discrepancy, THEN THE System SHALL reject the resolution request and return a validation error.
6. WHEN a check-in is recorded for a Visit that already has an associated Discrepancy record, THE System SHALL update the existing Discrepancy record rather than creating a duplicate.

---

### Requirement 7: Visit History

**User Story:** As a driver or fleet manager, I want to view the history of visits for a driver or store, so that I can audit bag movements over time.

#### Acceptance Criteria

1. WHEN a visit history query is submitted for a driver, THE System SHALL return all Visit records for that driver in reverse chronological order.
2. WHEN a visit history query is submitted for a store, THE System SHALL return all Visit records for that store in reverse chronological order.
3. WHEN a visit history query includes a date range filter, THE System SHALL return only Visit records whose date falls on or between the inclusive start and end dates of the specified range.
4. IF a visit history query references a driver or store identifier that does not exist in the system, THEN THE System SHALL return a not-found error.
5. THE System SHALL retain Visit records for a minimum of 365 days from the date of the Visit.
6. WHEN a visit history query is submitted for a valid driver or store identifier that has no Visit records, THE System SHALL return an empty list.

---

### Requirement 8: Data Integrity and Auditability

**User Story:** As a fleet manager, I want all bag movements to be permanently recorded with timestamps, so that I have a reliable audit trail for resolving disputes.

#### Acceptance Criteria

1. THE System SHALL record a UTC timestamp for every check-in, check-out, and Discrepancy event.
2. THE System SHALL preserve all Visit and Discrepancy records and SHALL NOT allow deletion or modification of historical records.
3. WHEN a Visit record is created, THE System SHALL assign it a unique immutable identifier.
4. WHEN a Discrepancy record is created, THE System SHALL assign it a unique immutable identifier.
5. THE System SHALL record the authenticated user's identifier for every check-in, check-out, and Discrepancy resolution action.
6. THE System SHALL record the identifier of the affected Visit or Discrepancy record in the audit entry for every check-in, check-out, and Discrepancy resolution action.
